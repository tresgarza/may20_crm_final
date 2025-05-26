import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.24.0'
import { corsHeaders } from '../_shared/cors.ts'

// Constantes de CINCEL
const CINCEL_BASE_URL = Deno.env.get('CINCEL_BASE_URL') || 'https://sandbox.api.cincel.digital'
const CINCEL_API_KEY = Deno.env.get('CINCEL_API_KEY') || ''

// Estructura de solicitud JSON esperada del cliente
interface RequestPayload {
  applicationId: string;
  clientId: string;
  documentType: string;
  documentName: string;
  documentDescription?: string;
  clientEmail: string;
  clientName: string;
  message?: string;
  base64File: string; // PDF en base64
}

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

    // Obtener los datos de la solicitud
    const payload: RequestPayload = await req.json()
    const { 
      applicationId, 
      clientId, 
      documentType, 
      documentName, 
      documentDescription, 
      clientEmail, 
      clientName, 
      message,
      base64File 
    } = payload

    // Validación básica
    if (!applicationId || !clientId || !documentType || !documentName || !clientEmail || !clientName || !base64File) {
      return new Response(
        JSON.stringify({ error: 'Faltan campos requeridos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Crear cliente Supabase para interactuar con la BD
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Validación adicional: verificar que la solicitud y cliente existan
    const { data: applicationExists } = await supabase
      .from('applications')
      .select('id')
      .eq('id', applicationId)
      .single()

    if (!applicationExists) {
      return new Response(
        JSON.stringify({ error: 'Solicitud no encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Preparar payload para CINCEL
    const cincelPayload = {
      name: documentName,
      description: documentDescription || `Documento ${documentType} para solicitud ${applicationId}`,
      invitations_attributes: [
        {
          invite_email: clientEmail,
          invite_name: clientName,
          message: message || "Por favor firme este documento para continuar con su solicitud.",
          allowed_signature_types: "autograph",
          stage: 1
        }
      ],
      base64_file: base64File
    }

    // Llamada a la API de CINCEL
    const cincelResponse = await fetch(`${CINCEL_BASE_URL}/v1/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CINCEL_API_KEY
      },
      body: JSON.stringify(cincelPayload)
    })

    if (!cincelResponse.ok) {
      const errorText = await cincelResponse.text()
      throw new Error(`Error de CINCEL: ${cincelResponse.status} ${errorText}`)
    }

    const cincelData = await cincelResponse.json()

    // Registrar el documento en la tabla signed_documents
    const { data: signedDocument, error: insertError } = await supabase
      .from('signed_documents')
      .insert({
        application_id: applicationId,
        client_id: clientId,
        document_type: documentType,
        cincel_document_id: cincelData.id,
        status: 'pending' // Pendiente de firma
      })
      .select()
      .single()

    if (insertError) {
      throw new Error(`Error al registrar documento: ${insertError.message}`)
    }

    // Devolver respuesta exitosa
    return new Response(
      JSON.stringify({
        success: true,
        document: signedDocument,
        cincel_id: cincelData.id,
        cincel_status: cincelData.status
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error en create-cincel-document:', error)

    return new Response(
      JSON.stringify({ error: error.message || 'Error interno del servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}) 