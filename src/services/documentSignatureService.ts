import { supabase } from '../config/supabase';
import { createClient } from '@supabase/supabase-js';

// Create a fallback Supabase client if the main one isn't working
let supabaseClient = supabase;
try {
  // Test if supabase is properly initialized
  if (!supabaseClient || typeof supabaseClient.functions === 'undefined') {
    console.warn('Supabase client not properly initialized, creating fallback client');
    supabaseClient = createClient(
      'https://ydnygntfkrleiseuciwq.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkbnlnbnRma3JsZWlzZXVjaXdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk5OTI0MDYsImV4cCI6MjA1NTU2ODQwNn0.B-dH2Kptzz1oyM4ynno_GjlvjpxL-HbNKC_st4bgf0A'
    );
  }
} catch (error) {
  console.error('Error initializing supabase client, falling back to direct initialization', error);
  supabaseClient = createClient(
    'https://ydnygntfkrleiseuciwq.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkbnlnbnRma3JsZWlzZXVjaXdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk5OTI0MDYsImV4cCI6MjA1NTU2ODQwNn0.B-dH2Kptzz1oyM4ynno_GjlvjpxL-HbNKC_st4bgf0A'
  );
}

/**
 * Interface para la respuesta de la Edge Function
 */
interface CreateDocumentResponse {
  success: boolean;
  document: {
    id: string;
    application_id: string;
    client_id: string;
    document_type: string;
    status: string;
    cincel_document_id: string;
    [key: string]: any;
  };
  cincel_id: string;
  cincel_status: string;
  error?: string;
}

/**
 * Parámetros para la creación de un documento para firma
 */
export interface CreateSignatureDocumentParams {
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

/**
 * Clase para gestionar la firma de documentos mediante la integración con CINCEL
 */
export class DocumentSignatureService {
  // Flag for development testing without edge functions
  private static testMode = true;

  /**
   * Solicita la firma de un documento enviándolo a CINCEL
   * @param params Información del documento y destinatario
   */
  static async requestSignature(params: CreateSignatureDocumentParams): Promise<CreateDocumentResponse> {
    try {
      console.log('DocumentSignatureService.requestSignature - Starting', params.documentType);
      
      // Use test mode to bypass the Edge Function call
      if (this.testMode) {
        console.log('DocumentSignatureService - Using TEST MODE');
        
        // Create a test document in the database directly
        const { data, error } = await supabaseClient
          .from('signed_documents')
          .insert({
            application_id: params.applicationId,
            client_id: params.clientId,
            document_type: params.documentType,
            cincel_document_id: `test-${Date.now()}`,
            status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select('*')
          .single();
          
        if (error) {
          console.error('Error in test mode insertion:', error);
          
          // If table doesn't exist, create a mock response
          const mockDocument = {
            id: `temp-${Date.now()}`,
            application_id: params.applicationId,
            client_id: params.clientId,
            document_type: params.documentType,
            status: 'pending',
            cincel_document_id: `test-${Date.now()}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          return {
            success: true,
            document: mockDocument,
            cincel_id: mockDocument.cincel_document_id,
            cincel_status: 'pending'
          };
        }
        
        return {
          success: true,
          document: data,
          cincel_id: data.cincel_document_id,
          cincel_status: 'pending'
        };
      }
      
      // Normal flow using Edge Function
      console.log('DocumentSignatureService - Calling Edge Function');
      const { data, error } = await supabaseClient.functions.invoke('create-cincel-document', {
        body: params
      });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }
      
      console.log('DocumentSignatureService - Edge Function response:', data);
      return data as CreateDocumentResponse;
    } catch (error) {
      console.error('Error al solicitar firma de documento:', error);
      throw error;
    }
  }

  /**
   * Obtiene todos los documentos de firma asociados a una solicitud
   * @param applicationId ID de la solicitud
   */
  static async getDocumentsByApplication(applicationId: string) {
    try {
      console.log('getDocumentsByApplication - Starting for', applicationId);
      
      // Test mode - create mock data if needed
      if (this.testMode) {
        // First try to get real data
        const { data, error } = await supabaseClient
          .from('signed_documents')
          .select('*')
          .eq('application_id', applicationId)
          .order('created_at', { ascending: false });
        
        if (error) {
          console.warn('Error fetching documents, returning mock data:', error);
          return []; // Return empty array for first load
        }
        
        if (data && data.length > 0) {
          return data;
        }
        
        // If no data found, just return empty array
        return [];
      }

      // Normal flow
      const { data, error } = await supabaseClient
        .from('signed_documents')
        .select('*')
        .eq('application_id', applicationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error al obtener documentos de firma:', error);
      throw error;
    }
  }

  /**
   * Obtiene todos los documentos de firma asociados a un cliente
   * @param clientId ID del cliente
   */
  static async getDocumentsByClient(clientId: string) {
    try {
      // Test mode
      if (this.testMode) {
        const { data, error } = await supabaseClient
          .from('signed_documents')
          .select('*, applications(id, application_type, status)')
          .eq('client_id', clientId)
          .order('created_at', { ascending: false });
        
        if (error) {
          console.warn('Error fetching client documents, returning mock data:', error);
          return [];
        }
        
        return data;
      }

      // Normal flow
      const { data, error } = await supabaseClient
        .from('signed_documents')
        .select('*, applications(id, application_type, status)')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error al obtener documentos de firma del cliente:', error);
      throw error;
    }
  }

  /**
   * Obtiene un enlace para descargar el documento firmado
   * @param filePath Ruta del documento en Storage
   */
  static async getSignedDocumentUrl(filePath: string) {
    try {
      if (!filePath) throw new Error('Ruta de archivo no proporcionada');

      // Test mode - return a placeholder PDF URL
      if (this.testMode) {
        return 'https://www.africau.edu/images/default/sample.pdf';
      }

      const { data, error } = await supabaseClient.storage
        .from('signed-documents')
        .createSignedUrl(filePath, 60 * 5); // URL válida por 5 minutos

      if (error) throw error;
      return data.signedUrl;
    } catch (error) {
      console.error('Error al obtener URL del documento firmado:', error);
      throw error;
    }
  }

  /**
   * Verifica el estado de un documento enviado a firma
   * @param documentId ID del documento en la tabla signed_documents
   */
  static async checkDocumentStatus(documentId: string) {
    try {
      const { data, error } = await supabaseClient
        .from('signed_documents')
        .select('*')
        .eq('id', documentId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error al verificar estado del documento:', error);
      throw error;
    }
  }
} 