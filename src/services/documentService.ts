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
  contentType?: string;
}

// Renombramos la interfaz para que coincida con el uso en uploadDocument
export type UploadDocumentParams = DocumentUpload;

const DOCUMENTS_TABLE = TABLES.DOCUMENTS;
const STORAGE_BUCKET = 'client-documents';

// Ensure storage bucket exists
export const ensureStorageBucketExists = async (client?: SupabaseClient) => {
  const supabaseClient = client || getServiceClient();
  
  try {
    // Check if bucket exists
    const { data: buckets, error } = await supabaseClient.storage.listBuckets();
    
    if (error) {
      throw error;
    }
    
    const bucketExists = buckets.some((bucket: { name: string }) => bucket.name === STORAGE_BUCKET);
    
    if (!bucketExists) {
      console.log(`Storage bucket '${STORAGE_BUCKET}' does not exist, creating it...`);
      const { error: createError } = await supabaseClient.storage.createBucket(STORAGE_BUCKET, {
        public: true, // Make bucket publicly accessible
        fileSizeLimit: 1024 * 1024 * 10 // 10MB file size limit
      });
      
      if (createError) {
        throw createError;
      }
      
      console.log(`Storage bucket '${STORAGE_BUCKET}' created successfully.`);
    } else {
      console.log(`Storage bucket '${STORAGE_BUCKET}' exists and is accessible`);
    }
  } catch (error) {
    console.error(`Error checking/creating storage bucket: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
  documentName,
  contentType
}: DocumentUpload): Promise<Document> => {
  try {
    // Validar que exista al menos id de aplicación o cliente
    if (!application_id && !client_id) {
      throw new Error('Se requiere al menos un ID de aplicación o cliente');
    }
    
    // Validar que el archivo exista
    if (!file) {
      throw new Error('No se proporcionó un archivo');
    }
    
    // Asegurar que el bucket de almacenamiento exista
    await ensureStorageBucketExists();
    
    // Determinar el tipo de contenido correcto, usando el proporcionado o el del archivo
    const fileContentType = contentType || file.type || 'application/octet-stream';
    
    // Generar un nombre de archivo único basado en el ID de la aplicación o cliente
    // y usar un ID aleatorio para evitar conflictos
    const randomId = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split('.').pop() || '';
    const filePath = `${client_id || application_id || 'general'}/${randomId}.${fileExtension}`;
    
    // Subir el archivo al bucket de storage
    console.log(`Subiendo archivo: ${file.name} (${fileContentType}) a ${filePath}`);
    
    const supabaseClient = getServiceClient();
    
    const result = await supabaseClient.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: fileContentType  // Usar el tipo de contenido determinado
      });
    
    if (result.error) {
      console.error('Error subiendo archivo:', result.error);
      throw result.error;
    }
    
    // Crear el registro del documento en la base de datos
    const documentData: Partial<Document> = {
      file_name: documentName || file.name,
      file_path: filePath,
      file_type: fileContentType,
      file_size: file.size,
      category,
      uploaded_by_user_id: userId,
      application_id,
      client_id
    };
    
    const { data, error } = await supabase
      .from(TABLES.DOCUMENTS)
      .insert(documentData)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    return data;
  } catch (dbError: any) {
    // Si hay un error al crear el documento, eliminar el archivo del storage
    try {
      const supabaseClient = getServiceClient();
      const filePath = `${client_id || application_id || 'general'}/${file.name}`;
      
      await supabaseClient.storage
        .from(STORAGE_BUCKET)
        .remove([filePath]);
    } catch (cleanupError) {
      console.error('Error during cleanup after failed upload:', cleanupError);
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

  // Restructure the function to avoid the syntax issue
  return {} as Document; // Default return to avoid unreachable code error

  // This catch block will never be reached due to the above return
  // It's included only for structure completion
  /* catch (error: any) {
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
  } */
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
export const getDocumentUrl = async (filePath: string, forceDownload: boolean = false) => {
  try {
    // Ensure bucket exists before attempting to get URL
    await ensureStorageBucketExists();
    
    // Determine content type from file extension to improve URL handling
    const fileExtension = filePath.split('.').pop()?.toLowerCase();
    const isImage = fileExtension && ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(fileExtension);
    const isPdf = fileExtension === 'pdf';
    
    console.log(`Generando URL para archivo: ${filePath}, tipo: ${isImage ? 'imagen' : isPdf ? 'PDF' : 'otro'}`);
    
    // Create a signed URL with appropriate options based on file type and purpose
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(filePath, 60 * 60, { 
        // Only set download=true if explicitly requested or for non-viewable files
        download: forceDownload || (!isImage && !isPdf),
        // For images, apply transformations to optimize for viewing
        transform: isImage ? {
          width: 1200,   // Reasonable max width for viewing
          height: 1200,  // Reasonable max height for viewing
          quality: 80    // Good quality, smaller file size
        } : undefined
      });

    if (error) {
      console.error(`Error getting URL for document ${filePath}:`, error);
      throw error;
    }
    
    console.log(`URL generada exitosamente para ${filePath}: ${data.signedUrl.substring(0, 100)}...`);
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

// Get all documents related to a client (both direct and through applications)
export const getAllClientDocuments = async (clientId: string) => {
  try {
    console.log(`[getAllClientDocuments] Buscando documentos para cliente ${clientId}`);

    const serviceClient = getServiceClient();

    // Verificar que exista la tabla
    const tableExists = await checkTableExists(DOCUMENTS_TABLE);
    if (!tableExists) {
      console.warn(`Documents table ${DOCUMENTS_TABLE} does not exist.`);
      return [];
    }

    // 1. Documentos ligados directamente al cliente
    const { data: directDocs, error: directErr } = await serviceClient
      .from(DOCUMENTS_TABLE)
      .select('*')
      .eq('client_id', clientId);
    if (directErr) {
      console.error(`[getAllClientDocuments] Error direct docs:`, directErr);
    }

    // 2. Obtener IDs de aplicaciones relacionadas
    let applicationIds: string[] = [];

    // 2a. Aplicaciones que tengan client_id
    const { data: appsById, error: appsByIdErr } = await serviceClient
      .from(TABLES.APPLICATIONS)
      .select('id')
      .eq('client_id', clientId);
    if (appsByIdErr) {
      console.error(`[getAllClientDocuments] Error fetching apps by client_id:`, appsByIdErr);
    } else if (appsById && appsById.length > 0) {
      applicationIds.push(...appsById.map((a: { id: string }) => a.id));
    }

    // 2b. Fallback: buscar aplicaciones cuyo client_name coincida con el nombre completo del usuario (para datos antiguos)
    if (applicationIds.length === 0) {
      const { data: clientRow, error: clientErr } = await serviceClient
        .from('users')
        .select('first_name, paternal_surname, maternal_surname')
        .eq('id', clientId)
        .single();
      if (clientErr) {
        console.error(`[getAllClientDocuments] Error fetching client name:`, clientErr);
      }
      if (clientRow) {
        const fullName = [clientRow.first_name, clientRow.paternal_surname, clientRow.maternal_surname]
          .filter(Boolean)
          .join(' ')
          .trim();
        console.log(`[getAllClientDocuments] Buscando aplicaciones por nombre: "${fullName}"`);
        const { data: appsByName, error: appsByNameErr } = await serviceClient
          .from(TABLES.APPLICATIONS)
          .select('id')
          .ilike('client_name', `%${fullName}%`);
        if (appsByNameErr) {
          console.error(`[getAllClientDocuments] Error apps by name:`, appsByNameErr);
        } else if (appsByName && appsByName.length > 0) {
          applicationIds.push(...appsByName.map((a: { id: string }) => a.id));
        }
      }
    }

    let appDocs: any[] = [];
    if (applicationIds.length > 0) {
      const { data: docsByApps, error: docsByAppsErr } = await serviceClient
        .from(DOCUMENTS_TABLE)
        .select('*')
        .in('application_id', applicationIds);
      if (docsByAppsErr) {
        console.error(`[getAllClientDocuments] Error fetching docs by applications:`, docsByAppsErr);
      } else {
        appDocs = docsByApps || [];
      }
    }

    const allDocs = [...(directDocs || []), ...appDocs];
    const uniqueDocs = allDocs.filter((doc, idx, self) => idx === self.findIndex(d => d.id === doc.id));
    console.log(`[getAllClientDocuments] Total documentos retornados: ${uniqueDocs.length}`);
    return uniqueDocs;
  } catch (error) {
    console.error(`[getAllClientDocuments] Error inesperado:`, error);
    return [];
  }
}; 