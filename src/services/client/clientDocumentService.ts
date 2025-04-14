import { ClientDocument } from '../../types/client';
import * as documentService from '../documentService';
import { formatApiError, logError } from '../../utils/errorHandling';

/**
 * Result of a document upload operation
 */
export interface DocumentUploadResult {
  successful: any[];
  failed: {
    name: string;
    category: string;
    error: string;
  }[];
  allSuccessful: boolean;
  warningMessage?: string | null;
}

/**
 * Creates an empty document upload result
 */
const createEmptyUploadResult = (): DocumentUploadResult => ({
  successful: [],
  failed: [],
  allSuccessful: true
});

/**
 * Validates a document array ensuring all documents have required fields
 * @param documents The array of documents to validate
 * @returns An array of valid documents
 */
export const validateDocuments = (documents: ClientDocument[]): ClientDocument[] => {
  if (!documents || documents.length === 0) {
    return [];
  }

  return documents.filter(doc => {
    if (!doc.file || !doc.category || !doc.name) {
      console.error('Invalid document detected:', JSON.stringify({
        name: doc.name || 'undefined',
        category: doc.category || 'undefined',
        hasFile: !!doc.file
      }));
      return false;
    }
    return true;
  });
};

/**
 * Uploads documents for a client with proper error handling and retries
 * @param clientId The ID of the client
 * @param userId The ID of the user uploading the documents
 * @param documents Array of documents to upload
 * @returns Document upload result with success and failure information
 */
export const uploadClientDocuments = async (
  clientId: string, 
  userId: string, 
  documents: ClientDocument[]
): Promise<DocumentUploadResult> => {
  if (!documents || documents.length === 0) {
    console.log('No documents to upload');
    return createEmptyUploadResult();
  }

  console.log(`Attempting to upload ${documents.length} documents for client ${clientId}`);
  
  // Filter out invalid documents
  const validDocuments = validateDocuments(documents);

  if (validDocuments.length === 0) {
    console.warn('No valid documents to upload after filtering');
    return {
      successful: [],
      failed: documents.map(doc => ({
        name: doc.name || 'Sin nombre',
        category: doc.category || 'Sin categoría',
        error: 'Documento inválido: falta el archivo, nombre o categoría'
      })),
      allSuccessful: false,
      warningMessage: 'No se pudo subir ningún documento porque todos estaban incompletos (faltan archivos, nombres o categorías).'
    };
  }

  // Process documents sequentially to avoid race conditions
  const results = [];
  const failedDocuments = [];
  
  try {
    // Check if storage bucket exists before attempting uploads
    try {
      console.log(`Checking if storage bucket "documents" exists...`);
      await documentService.ensureStorageBucketExists();
      console.log(`Storage bucket "documents" exists and is accessible.`);
    } catch (bucketError) {
      console.warn('Bucket availability check failed, documents will not be uploaded:', bucketError);
      
      // Add all documents to failed list but allow client update to proceed
      return handleBucketCheckFailure(validDocuments, bucketError);
    }
    
    // Upload documents one by one
    for (const doc of validDocuments) {
      try {
        const result = await uploadSingleDocument(doc, clientId, userId);
        if (result.success) {
          results.push(result.data);
          console.log(`Successfully uploaded document ${doc.name} (${result.data.id})`);
        } else {
          failedDocuments.push({
            name: doc.name,
            category: doc.category,
            error: result.error || 'Error desconocido'
          });
        }
      } catch (docError) {
        console.error(`Failed to upload document ${doc.name}:`, docError);
        failedDocuments.push({
          name: doc.name,
          category: doc.category,
          error: docError instanceof Error ? docError.message : 'Error desconocido'
        });
      }
    }
    
    // Log summary of upload results
    if (failedDocuments.length > 0) {
      console.warn(`${failedDocuments.length} documents failed to upload:`, failedDocuments);
      console.log(`Successful uploads: ${results.length}/${validDocuments.length}`);
    }
    
    // Format results with appropriate warning message
    return formatUploadResults(results, failedDocuments, validDocuments.length);
    
  } catch (error) {
    logError(error, 'uploadClientDocuments');
    
    const formattedError = formatApiError(error, 'document-upload');
    throw new Error(formattedError.message);
  }
};

/**
 * Handles the case where bucket check fails
 */
const handleBucketCheckFailure = (
  validDocuments: ClientDocument[], 
  bucketError: any
): DocumentUploadResult => {
  const failedDocuments = validDocuments.map(doc => ({
    name: doc.name,
    category: doc.category,
    error: 'El almacenamiento de documentos no está disponible temporalmente'
  }));
  
  // Provide better error message
  let errorDetail = '';
  if (bucketError instanceof Error) {
    errorDetail = bucketError.message;
    
    // Specific messages based on error type
    if (errorDetail.includes('404') || errorDetail.includes('not found') || errorDetail.includes('no existe')) {
      errorDetail = 'El bucket "documents" no existe en Supabase Storage.';
    } else if (errorDetail.includes('violates row-level security policy') || 
              errorDetail.includes('Permission denied') || 
              errorDetail.includes('Unauthorized')) {
      errorDetail = 'No tienes permisos para acceder al bucket "documents".';
    }
  }
  
  return {
    successful: [],
    failed: failedDocuments,
    allSuccessful: false,
    warningMessage: `Se actualizó la información del cliente, pero no se pudieron subir los documentos: ${errorDetail} El administrador debe verificar las políticas del bucket "documents" en Supabase Storage.`
  };
};

/**
 * Uploads a single document with retries
 */
const uploadSingleDocument = async (
  doc: ClientDocument, 
  clientId: string, 
  userId: string
): Promise<{success: boolean, data?: any, error?: string}> => {
  console.log(`Attempting to upload document ${doc.name} for client ${clientId}`);
  
  // Try up to 3 times with exponential backoff
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await documentService.uploadDocument({
        file: doc.file,
        client_id: clientId,
        application_id: undefined,
        userId,
        documentName: doc.name,
        category: doc.category,
        description: doc.description || undefined
      });
      
      return { 
        success: true, 
        data: result 
      };
    } catch (uploadError) {
      console.error(`Error uploading document ${doc.name} (attempt ${attempt}/3):`, uploadError);
      
      // Check for security policy errors which won't be fixed by retrying
      if (uploadError instanceof Error && 
          (uploadError.message.includes("violates row-level security policy") || 
           uploadError.message.includes("permission denied") || 
           uploadError.message.includes("Unauthorized") ||
           uploadError.message.includes("403"))) {
        
        return {
          success: false,
          error: 'Error de permisos: No se pueden subir documentos debido a restricciones de seguridad. Contacte al administrador para configurar las políticas RLS en Supabase.'
        };
      }
      
      // If this was the last attempt, return the error
      if (attempt === 3) {
        let errorMessage = 'Error desconocido';
        if (uploadError instanceof Error) {
          errorMessage = uploadError.message;
        }
        
        return {
          success: false,
          error: errorMessage
        };
      }
      
      // Wait before retry with exponential backoff
      const waitTime = 1000 * Math.pow(2, attempt - 1);
      console.log(`Waiting ${waitTime}ms before retrying upload for document ${doc.name}`);
      await new Promise(r => setTimeout(r, waitTime));
      console.log(`Retrying upload for document ${doc.name} (attempt ${attempt + 1}/3)`);
    }
  }
  
  // Should never reach here, but TypeScript needs this
  return {
    success: false,
    error: 'Error inesperado durante la carga del documento'
  };
};

/**
 * Creates a formatted upload result with appropriate warning message
 */
const formatUploadResults = (
  successful: any[], 
  failed: {name: string, category: string, error: string}[],
  totalCount: number
): DocumentUploadResult => {
  let warningMessage = null;
  
  if (failed.length > 0) {
    if (failed.length === totalCount) {
      // All uploads failed - check for permission issues
      if (failed.some(doc => doc.error && (
        doc.error.includes('permisos') || 
        doc.error.includes('seguridad') || 
        doc.error.includes('policy') || 
        doc.error.includes('RLS')))) {
        warningMessage = 'Se guardó la información del cliente, pero no se pudo subir ningún documento debido a permisos insuficientes. Contacta al administrador para resolver el problema de políticas RLS en Supabase.';
      } else {
        warningMessage = 'Se guardó la información del cliente, pero no se pudo subir ningún documento. Por favor, intenta nuevamente más tarde.';
      }
    } else {
      warningMessage = `Se guardó la información del cliente y se subieron ${successful.length} documentos, pero ${failed.length} ${failed.length === 1 ? 'documento falló' : 'documentos fallaron'} al subirse. Puedes intentar subir los documentos fallidos más tarde.`;
    }
  }
  
  return {
    successful,
    failed,
    allSuccessful: failed.length === 0,
    warningMessage
  };
}; 