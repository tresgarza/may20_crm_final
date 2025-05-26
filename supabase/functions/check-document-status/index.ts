import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.24.0'
import { corsHeaders } from '../_shared/cors.ts'

// Constantes
const CINCEL_BASE_URL = Deno.env.get('CINCEL_BASE_URL') || 'https://sandbox.api.cincel.digital'
const CINCEL_API_KEY = Deno.env.get('CINCEL_API_KEY') || ''

/**
 * Función para verificar el estado de documentos pendientes
 * Esta función puede ser llamada periódicamente o mediante un cron job
 */
Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Crear cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Obtener documentos pendientes
    // Seleccionamos docs creados hace más de 10 minutos para dar tiempo a que el webhook funcione primero
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    
    const { data: pendingDocuments, error: queryError } = await supabase
      .from('signed_documents')
      .select('*')
      .eq('status', 'pending')
      .lt('created_at', tenMinutesAgo)
      .limit(10) // Procesar un lote razonable a la vez
    
    if (queryError) {
      throw new Error(`Error consultando documentos pendientes: ${queryError.message}`)
    }

    if (!pendingDocuments?.length) {
      return new Response(
        JSON.stringify({ message: 'No hay documentos pendientes para verificar' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Array para almacenar resultados del procesamiento
    const results = []

    // Procesar cada documento pendiente
    for (const doc of pendingDocuments) {
      try {
        // Consultar estado en CINCEL
        const cincelResponse = await fetch(`${CINCEL_BASE_URL}/v1/documents/${doc.cincel_document_id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': CINCEL_API_KEY
          }
        })

        if (!cincelResponse.ok) {
          results.push({
            document_id: doc.id,
            status: 'error',
            message: `Error API CINCEL: ${cincelResponse.status}`
          })
          continue
        }

        const cincelData = await cincelResponse.json()
        
        // Si no está firmado, continuar con el siguiente
        if (cincelData.status !== 'signed') {
          results.push({
            document_id: doc.id,
            status: 'pending',
            cincel_status: cincelData.status
          })
          continue
        }

        // El documento está firmado, procesarlo como lo haría el webhook
        const signedFileUrl = cincelData.signed_file_url || 
                             (cincelData.files && cincelData.files[0]?.signed_file_url)
        const sha256Hash = cincelData.sha256_signed_file || 
                           (cincelData.files && cincelData.files[0]?.sha256_signed_file)

        if (!signedFileUrl) {
          results.push({
            document_id: doc.id,
            status: 'error',
            message: 'URL de archivo firmado no disponible'
          })
          continue
        }

        // Descargar el PDF firmado
        const fileResponse = await fetch(signedFileUrl)
        if (!fileResponse.ok) {
          results.push({
            document_id: doc.id,
            status: 'error',
            message: `Error descargando archivo: ${fileResponse.status}`
          })
          continue
        }

        const pdfBlob = await fileResponse.blob()
        
        // Generar nombre de archivo y ruta para Supabase Storage
        const storageFilePath = `solicitudes/${doc.application_id}/${doc.document_type}_${new Date().getTime()}.pdf`
        
        // Subir el archivo al bucket de Storage
        const { error: storageError } = await supabase.storage
          .from('signed-documents')
          .upload(storageFilePath, pdfBlob, {
            contentType: 'application/pdf',
            upsert: true
          })

        if (storageError) {
          results.push({
            document_id: doc.id,
            status: 'error',
            message: `Error Storage: ${storageError.message}`
          })
          continue
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
          .eq('id', doc.id)

        if (updateError) {
          results.push({
            document_id: doc.id,
            status: 'error',
            message: `Error actualizando BD: ${updateError.message}`
          })
          continue
        }

        // Si llegamos aquí, todo fue exitoso
        results.push({
          document_id: doc.id,
          status: 'success',
          message: 'Documento actualizado correctamente',
          storage_path: storageFilePath
        })

      } catch (docError) {
        results.push({
          document_id: doc.id,
          status: 'error',
          message: docError.message || 'Error procesando documento'
        })
      }
    }

    // Devolver resumen de resultados
    return new Response(
      JSON.stringify({
        success: true,
        processed: pendingDocuments.length,
        results
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error en check-document-status:', error)

    return new Response(
      JSON.stringify({ error: error.message || 'Error interno del servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}) 