import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.24.0'
import { verify } from 'https://deno.land/x/djwt@v2.8/mod.ts'
import { corsHeaders } from '../_shared/cors.ts'

// Constantes
const CINCEL_BASE_URL = Deno.env.get('CINCEL_BASE_URL') || 'https://sandbox.api.cincel.digital'
const CINCEL_API_KEY = Deno.env.get('CINCEL_API_KEY') || ''
const CINCEL_WEBHOOK_SECRET = Deno.env.get('CINCEL_WEBHOOK_SECRET') || 'your-webhook-secret'

// Función principal
Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Solo permitir POST
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Método no permitido' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validar autenticidad del webhook (depende de cómo CINCEL implementa la seguridad de webhooks)
    // Aquí se puede verificar firmas, tokens o secretos compartidos según CINCEL lo requiera
    
    // Como ejemplo, verificamos un header hipotético con un secreto compartido
    const authorization = req.headers.get('x-cincel-signature') || ''
    if (authorization !== CINCEL_WEBHOOK_SECRET) {
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Obtener los datos del webhook
    const webhookPayload = await req.json()
    
    // Validar que sea un evento de firma completada
    if (webhookPayload.event !== 'document.signed') {
      // Solo procesamos eventos de firma completada
      return new Response(
        JSON.stringify({ message: 'Evento ignorado (no es una firma completada)' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const cincelDocumentId = webhookPayload.document_id
    if (!cincelDocumentId) {
      throw new Error('ID de documento no proporcionado en el webhook')
    }

    // Crear cliente Supabase para interactuar con la BD
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Buscar el registro correspondiente en signed_documents
    const { data: signedDocument, error: queryError } = await supabase
      .from('signed_documents')
      .select('*')
      .eq('cincel_document_id', cincelDocumentId)
      .single()

    if (queryError || !signedDocument) {
      throw new Error(`Documento no encontrado en base de datos: ${cincelDocumentId}`)
    }

    // Obtener detalles del documento desde CINCEL
    const cincelResponse = await fetch(`${CINCEL_BASE_URL}/v1/documents/${cincelDocumentId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CINCEL_API_KEY
      }
    })

    if (!cincelResponse.ok) {
      throw new Error(`Error obteniendo documento de CINCEL: ${cincelResponse.status}`)
    }

    const cincelData = await cincelResponse.json()
    
    // Verificar si el documento está firmado
    if (cincelData.status !== 'signed') {
      return new Response(
        JSON.stringify({ message: 'Documento aún no firmado' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Obtener URL del archivo firmado y hash
    const signedFileUrl = cincelData.signed_file_url || 
                         (cincelData.files && cincelData.files[0]?.signed_file_url)
    const sha256Hash = cincelData.sha256_signed_file || 
                       (cincelData.files && cincelData.files[0]?.sha256_signed_file)

    if (!signedFileUrl) {
      throw new Error('URL de archivo firmado no disponible')
    }

    // Descargar el PDF firmado
    const fileResponse = await fetch(signedFileUrl)
    if (!fileResponse.ok) {
      throw new Error(`Error descargando archivo firmado: ${fileResponse.status}`)
    }

    const pdfBlob = await fileResponse.blob()
    
    // Generar nombre de archivo y ruta para Supabase Storage
    const storageFilePath = `solicitudes/${signedDocument.application_id}/${signedDocument.document_type}_${new Date().getTime()}.pdf`
    
    // Subir el archivo al bucket de Storage
    const { error: storageError } = await supabase.storage
      .from('signed-documents')
      .upload(storageFilePath, pdfBlob, {
        contentType: 'application/pdf',
        upsert: true
      })

    if (storageError) {
      throw new Error(`Error subiendo a Storage: ${storageError.message}`)
    }

    // Actualizar registro en la base de datos
    const { error: updateError } = await supabase
      .from('signed_documents')
      .update({
        status: 'signed',
        signed_at: new Date().toISOString(),
        file_path: storageFilePath,
        sha256_hash: sha256Hash,
        updated_at: new Date().toISOString()
      })
      .eq('id', signedDocument.id)

    if (updateError) {
      throw new Error(`Error actualizando registro: ${updateError.message}`)
    }

    // Respuesta exitosa
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Documento procesado correctamente',
        document_id: signedDocument.id,
        storage_path: storageFilePath
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error en webhook de CINCEL:', error)

    return new Response(
      JSON.stringify({ error: error.message || 'Error interno del servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}) 