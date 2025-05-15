import { supabase, getServiceClient } from '../lib/supabaseClient';
import { TABLES } from '../utils/constants/tables';
import { SupabaseClient } from '@supabase/supabase-js';
import { checkTableExists } from '../utils/dbStructureCheck';
import { 
  ErrorType, 
  createAppError, 
  logError 
} from '../utils/errorHandling';

export interface Document {
  id: string;
  created_at: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  category?: string;
  application_id?: string;
  client_id?: string;
  uploaded_by_user_id?: string;
  is_verified?: boolean;
  verified_by?: string;
  verified_at?: string;
}

export interface DocumentUpload {
  file: File;
  application_id?: string;
  client_id?: string;
  userId: string;
  documentName: string;
  description?: string;
  category?: string;
  authClient?: SupabaseClient;
}

// Renombramos la interfaz para que coincida con el uso en uploadDocument
export type UploadDocumentParams = DocumentUpload;

const DOCUMENTS_TABLE = TABLES.DOCUMENTS;
const STORAGE_BUCKET = 'client-documents';

// Ensure storage bucket exists
export const ensureStorageBucketExists = async (client?: SupabaseClient) => {
  const supabaseClient = client || supabase;
  
  try {
    // Attempt to list files in the bucket instead of checking if bucket exists
    // This is more reliable as it tests both existence and permissions
    const { error } = await supabaseClient.storage
      .from(STORAGE_BUCKET)
      .list();
    
    if (error) {
      // If there's an error, it could be because the bucket doesn't exist
      // or because of permissions issues
      const errorMessage = error.message || 'Error desconocido';
      if (errorMessage.includes('not found') || 
          errorMessage.includes('does not exist') || 
          errorMessage.includes('404')) {
        console.log(`Storage bucket '${STORAGE_BUCKET}' does not exist`);
        throw new Error(`El bucket de almacenamiento '${STORAGE_BUCKET}' no existe. Contacte al administrador.`);
      } else {
        console.error(`Error accessing storage bucket '${STORAGE_BUCKET}':`, error);
        throw new Error(`Error al acceder al bucket de almacenamiento: ${errorMessage}`);
      }
    }
    
    console.log(`Storage bucket '${STORAGE_BUCKET}' exists and is accessible`);
    return true;
  } catch (error) {
    console.error('Error in ensureStorageBucketExists:', error);
    throw error;
  }
};

// Get all documents for an application
export const getApplicationDocuments = async (applicationId: string) => {
  const { data, error } = await supabase
    .from(DOCUMENTS_TABLE)
    .select('*')
    .eq('application_id', applicationId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error(`Error fetching documents for application ${applicationId}:`, error);
    throw error;
  }

  return data;
};

// Get all documents for a client
export const getClientDocuments = async (clientId: string) => {
  try {
    // First check if the documents table exists
    const tableExists = await checkTableExists(DOCUMENTS_TABLE);
    if (!tableExists) {
      console.warn(`Documents table ${DOCUMENTS_TABLE} does not exist.`);
      return [];
    }

    const { data, error } = await supabase
      .from(DOCUMENTS_TABLE)
      .select('id, created_at, file_name, file_path, file_type, file_size, category, application_id, client_id, uploaded_by_user_id')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`Error fetching documents for client ${clientId}:`, error);
      throw error;
    }

    console.log(`Retrieved ${data?.length || 0} documents for client ${clientId}`);
    return data || [];
  } catch (error) {
    console.error(`Error in getClientDocuments for client ${clientId}:`, error);
    // Return empty array instead of throwing to prevent UI crashes
    return [];
  }
};

// Get a single document by ID
export const getDocumentById = async (id: string) => {
  const { data, error } = await supabase
    .from(DOCUMENTS_TABLE)
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error(`Error fetching document with ID ${id}:`, error);
    throw error;
  }

  return data as Document;
};

// Upload a document
export const uploadDocument = async ({
  application_id,
  client_id,
  file,
  category,
  userId,
  documentName
}: DocumentUpload): Promise<Document> => {
  const supabaseClient = getServiceClient();
  
  try {
    // Verificar si la tabla existe antes de intentar operaciones
    const tableExists = await checkTableExists(DOCUMENTS_TABLE);
    if (!tableExists) {
      logError(
        `La tabla ${DOCUMENTS_TABLE} no existe. Por favor, ejecute el script de creación de tablas.`,
        'documentService.uploadDocument',
        { table: DOCUMENTS_TABLE }
      );
      throw createAppError(
        ErrorType.DATABASE,
        `Error de configuración: La tabla de documentos no está correctamente configurada.`,
        { table: DOCUMENTS_TABLE }
      );
    }
    
    // Verificar si el bucket de storage existe
    try {
      await ensureStorageBucketExists(supabaseClient);
    } catch (error) {
      // Intentar crear el bucket si no existe
      try {
        const { data, error: createError } = await supabaseClient.storage.createBucket(STORAGE_BUCKET, {
          public: true
        });
        
        if (createError) {
          throw createError;
        }
        
        console.log('Bucket creado exitosamente:', data);
      } catch (bucketError) {
        logError(
          `Error al crear el bucket ${STORAGE_BUCKET}: ${bucketError instanceof Error ? bucketError.message : 'Error desconocido'}`,
          'documentService.uploadDocument',
          { bucket: STORAGE_BUCKET, error: bucketError }
        );
        throw createAppError(
          ErrorType.UPLOAD,
          `Error al configurar el almacenamiento de documentos.`,
          { bucket: STORAGE_BUCKET }
        );
      }
    }
    
    // Generar información del archivo
    const fileName = file.name;
    const fileType = file.type;
    const fileSize = file.size;
    
    // Construir nombre único para el archivo
    const uniqueId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const fileExtension = fileName.split('.').pop();
    const uniqueFileName = `${uniqueId}.${fileExtension}`;
    const filePath = `${client_id || application_id || 'general'}/${uniqueFileName}`;
    
    // Subir el archivo al storage primero
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });
      
    if (uploadError) {
      logError(
        `Error al subir archivo al storage: ${uploadError.message}`,
        'documentService.uploadDocument',
        { error: uploadError }
      );
      throw createAppError(
        ErrorType.UPLOAD,
        'Error al subir el archivo',
        { error: uploadError.message }
      );
    }
    
    // Crear el documento en la base de datos con gestión de errores específica para columnas faltantes
    try {
      // Intentar insertar con todas las columnas
      const { data, error } = await supabaseClient
        .from(DOCUMENTS_TABLE)
        .insert({
          file_name: documentName || fileName,
          file_path: filePath,
          file_type: fileType,
          file_size: fileSize,
          category,
          application_id,
          client_id,
          uploaded_by_user_id: userId,
          is_verified: false
        })
        .select('*')
        .single();

      if (error) {
        // Si hay un error relacionado con la columna is_verified, intentar sin ella
        if (error.message && error.message.includes('is_verified')) {
          console.warn('Columna is_verified no encontrada, intentando sin ella');
          
          const { data: dataWithoutVerified, error: errorWithoutVerified } = await supabaseClient
            .from(DOCUMENTS_TABLE)
            .insert({
              file_name: documentName || fileName,
              file_path: filePath,
              file_type: fileType,
              file_size: fileSize,
              category,
              application_id,
              client_id,
              uploaded_by_user_id: userId
            })
            .select('*')
            .single();
            
          if (errorWithoutVerified) {
            throw errorWithoutVerified;
          }
          
          return {
            ...dataWithoutVerified,
            is_verified: false // Añadir manualmente para la interfaz
          } as Document;
        } else {
          throw error;
        }
      }
      
      return data as Document;
    } catch (dbError: any) {
      // Si hay un error al crear el documento, eliminar el archivo del storage
      if (uploadData && uploadData.path) {
        await supabaseClient.storage
          .from(STORAGE_BUCKET)
          .remove([filePath]);
      }
      
      // Verificar si es un error de RLS
      if (dbError.message && dbError.message.includes('policy')) {
        logError(
          `Violación de política RLS al crear documento: ${dbError.message}`,
          'documentService.uploadDocument',
          { error: dbError }
        );
        throw createAppError(
          ErrorType.AUTHORIZATION,
          'No tienes permisos para crear documentos para este cliente o aplicación',
          { error: dbError.message }
        );
      }
      
      logError(
        `Error al crear documento en la base de datos: ${dbError.message}`,
        'documentService.uploadDocument',
        { error: dbError }
      );
      throw createAppError(
        ErrorType.DATABASE,
        'Error al crear documento en la base de datos',
        { error: dbError.message }
      );
    }
  } catch (error: any) {
    logError(
      `Error inesperado en uploadDocument: ${error.message || 'Error desconocido'}`,
      'documentService.uploadDocument',
      { error }
    );
    throw createAppError(
      ErrorType.UNKNOWN,
      error.message || 'Error inesperado al subir el documento',
      { originalError: error }
    );
  }
};

// Delete a document
export const deleteDocument = async (documentId: string) => {
  try {
    // Ensure bucket exists before attempting to delete
    await ensureStorageBucketExists();
    
    // Get document to get file path
    const { data: document, error: fetchError } = await supabase
      .from(DOCUMENTS_TABLE)
      .select('file_path')
      .eq('id', documentId)
      .single();

    if (fetchError) {
      console.error(`Error fetching document ${documentId} for deletion:`, fetchError);
      throw fetchError;
    }

    // Delete file from storage
    const { error: storageError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([document.file_path]);

    if (storageError) {
      console.error(`Error deleting file for document ${documentId}:`, storageError);
      // Use type-safe error handling
      const errorMessage = storageError instanceof Error 
        ? storageError.message 
        : (typeof storageError === 'object' && storageError !== null && 'message' in storageError)
          ? String((storageError as {message: string}).message)
          : 'Error desconocido';
      
      throw new Error(`Error al eliminar el archivo del documento: ${errorMessage}`);
    }

    // Delete document record
    const { error: deleteError } = await supabase
      .from(DOCUMENTS_TABLE)
      .delete()
      .eq('id', documentId);

    if (deleteError) {
      console.error(`Error deleting document record ${documentId}:`, deleteError);
      throw deleteError;
    }

    return true;
  } catch (error) {
    console.error(`Error in deleteDocument for ${documentId}:`, error);
    throw error;
  }
};

// Get document download URL
export const getDocumentUrl = async (filePath: string) => {
  try {
    // Ensure bucket exists before attempting to get URL
    await ensureStorageBucketExists();
    
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(filePath, 60 * 60); // 1 hour expiry

    if (error) {
      console.error(`Error getting URL for document ${filePath}:`, error);
      throw error;
    }

    return data.signedUrl;
  } catch (error) {
    console.error(`Error in getDocumentUrl for ${filePath}:`, error);
    throw error;
  }
};

// Verify a document
export const verifyDocument = async (documentId: string, userId: string, isVerified: boolean = true) => {
  const { data, error } = await supabase
    .from(DOCUMENTS_TABLE)
    .update({
      is_verified: isVerified,
      verified_by: userId,
      verified_at: new Date().toISOString()
    })
    .eq('id', documentId)
    .select();

  if (error) {
    console.error(`Error verifying document ${documentId}:`, error);
    throw error;
  }

  return data[0] as Document;
};

// Get required documents (based on application type)
export const getRequiredDocuments = async (applicationType: string) => {
  const { data, error } = await supabase
    .from('required_documents')
    .select('*')
    .eq('application_type', applicationType);

  if (error) {
    console.error(`Error fetching required documents for ${applicationType}:`, error);
    throw error;
  }

  return data;
}; 