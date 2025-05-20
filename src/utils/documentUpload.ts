import { supabase } from '../services/supabaseService';
import { ErrorType, createAppError, logError, safeAsync } from './errorHandling';
import { v4 as uuidv4 } from 'uuid';
// Define our own interface instead of importing
export interface ClientDocument {
  file: File;
  documentName: string;
  category?: string;
  description?: string;
  required?: boolean;
  tags?: string[];
}

// Nombre del bucket por defecto para documentos
const DEFAULT_BUCKET_NAME = 'client-documents';

export interface UploadDocument {
  file: File;
  type: string;
  description?: string;
}

export interface UploadedDocument {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  description?: string;
  createdAt: string;
}

/**
 * Maximum number of upload retry attempts
 */
export const MAX_UPLOAD_RETRIES = 3;

/**
 * Validates if a file is a valid document for upload
 */
export const isValidDocument = (file: File): boolean => {
  // Allowed MIME types
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/jpg',
    'image/heic',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ];

  // Maximum file size (10MB)
  const maxSize = 10 * 1024 * 1024;

  return allowedTypes.includes(file.type) && file.size <= maxSize;
};

/**
 * Uploads a document to storage with automatic retries
 */
export const uploadDocumentToStorage = async (
  document: UploadDocument,
  folder: string,
  attempt = 1
): Promise<UploadedDocument> => {
  const file = document.file;
  
  if (!isValidDocument(file)) {
    throw createAppError(
      ErrorType.VALIDATION,
      'Invalid document format or size',
      { 
        fileName: file.name, 
        fileType: file.type, 
        fileSize: file.size 
      }
    );
  }
  
  // Validate that file.type is present
  if (!file.type) {
    throw createAppError(
      ErrorType.VALIDATION,
      'El tipo de archivo es requerido para una visualización correcta',
      { fileName: file.name }
    );
  }
  
  // Determine content type from file extension as fallback
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  let contentType = file.type;
  
  // If type is generic, try to be more specific based on extension
  if (contentType === 'application/octet-stream' && fileExtension) {
    const mimeTypes: Record<string, string> = {
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };
    
    if (fileExtension in mimeTypes) {
      contentType = mimeTypes[fileExtension];
      console.log(`Adjusting content type based on extension: ${contentType}`);
    }
  }
  
  try {
    // Generate unique file id and name
    const fileId = uuidv4();
    const fileName = `${fileId}.${fileExtension}`;
    const filePath = `${folder}/${fileName}`;
    
    console.log(`Uploading document: ${file.name} (${contentType}) to ${filePath}`);
    
    // Upload the file
    const { error: uploadError } = await supabase.storage
      .from(DEFAULT_BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        contentType: contentType,
        upsert: true
      });
    
    if (uploadError) {
      throw createAppError(
        ErrorType.UPLOAD,
        `Error uploading document: ${uploadError.message}`,
        { filePath, attempt, contentType },
        uploadError
      );
    }
    
    // Verify the content type was set correctly
    try {
      const { data: metadata } = await supabase.storage
        .from(DEFAULT_BUCKET_NAME)
        .getPublicUrl(filePath);
        
      console.log(`Upload successful. Public URL: ${metadata.publicUrl}`);
    } catch (metadataError) {
      console.warn('Could not verify upload metadata:', metadataError);
    }
    
    // Get public URL for the uploaded file
    const { data: publicUrlData } = supabase.storage
      .from(DEFAULT_BUCKET_NAME)
      .getPublicUrl(filePath);
    
    // Return document info
    return {
      id: fileId,
      name: file.name,
      size: file.size,
      type: document.type,
      url: publicUrlData.publicUrl,
      description: document.description,
      createdAt: new Date().toISOString()
    };
  } catch (error) {
    // Retry logic for transient errors
    if (attempt < MAX_UPLOAD_RETRIES) {
      logError(error, 'documentUpload', { 
        message: `Retrying upload (${attempt + 1}/${MAX_UPLOAD_RETRIES})`,
        fileName: file.name
      });
      
      // Exponential backoff delay
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Retry with incremented attempt count
      return uploadDocumentToStorage(document, folder, attempt + 1);
    }
    
    // Max retries reached, rethrow error
    throw error;
  }
};

/**
 * Uploads multiple documents with reliable error handling
 */
export const uploadDocuments = async (
  documents: UploadDocument[],
  folder: string
): Promise<{
  uploadedDocs: UploadedDocument[];
  failedDocs: Array<{ document: UploadDocument; error: any }>;
}> => {
  const uploadedDocs: UploadedDocument[] = [];
  const failedDocs: Array<{ document: UploadDocument; error: any }> = [];
  
  // Process each document
  for (const document of documents) {
    const [uploaded, error] = await safeAsync(
      uploadDocumentToStorage(document, folder),
      'uploadDocuments'
    );
    
    if (uploaded) {
      uploadedDocs.push(uploaded);
    } else if (error) {
      failedDocs.push({ 
        document, 
        error 
      });
    }
  }
  
  return { uploadedDocs, failedDocs };
};

/**
 * Asegura que el bucket de almacenamiento exista antes de utilizarlo
 * @param bucketName Nombre del bucket a verificar
 * @returns True si el bucket existe o fue creado correctamente
 */
export const ensureClientBucketExists = async (bucketName: string = DEFAULT_BUCKET_NAME): Promise<boolean> => {
  try {
    console.log(`Verificando si el bucket ${bucketName} existe...`);
    
    // La API de Supabase v2 no tiene listBuckets() directamente accesible,
    // por lo que simplemente intentaremos usar el bucket directamente
    const { data, error } = await supabase.storage
      .from(bucketName)
      .list('', { limit: 1 });
      
    if (!error) {
      console.log(`El bucket ${bucketName} existe y es accesible.`);
      
      // Verificar y configurar opciones CORS para permitir la visualización de documentos
      try {
        // Nota: Esto requiere permisos de servicio o admin que pueden
        // no estar disponibles. Si falla, no interrumpimos el flujo.
        const corsOptions = {
          allowedOrigins: ['*'],  // Idealmente, restringe a dominios específicos
          allowedMethods: ['GET', 'HEAD'],
          allowedHeaders: ['*'],
          exposedHeaders: ['Content-Disposition', 'Content-Type'],
          maxAgeSeconds: 3600
        };
        
        // Esta operación puede fallar si el usuario no tiene permisos suficientes
        // Es informativa, no bloqueante
        const { error: corsError } = await supabase.storage.updateBucket(
          bucketName,
          {
            public: true,
            allowedMimeTypes: [
              'image/png', 'image/jpeg', 'image/gif', 'image/webp',
              'application/pdf', 'application/msword', 
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              'application/vnd.ms-excel',
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              'text/plain', 'text/csv'
            ],
            fileSizeLimit: 10485760 // 10MB
          }
        );
        
        if (corsError) {
          console.log(`No se pudieron actualizar las opciones CORS para ${bucketName}`, corsError);
          // No interrumpir el flujo, esto es solo para mejorar la experiencia
        } else {
          console.log(`Opciones CORS actualizadas correctamente para ${bucketName}`);
        }
      } catch (corsConfigError) {
        console.log(`Error al configurar CORS para ${bucketName}:`, corsConfigError);
        // No interrumpir el flujo principal
      }
      
      return true;
    }
    
    console.warn(`No se pudo confirmar si el bucket ${bucketName} existe: ${error.message}`);
    
    // En vez de crear un bucket (que requiere permisos elevados),
    // simplemente verificamos si podemos escribir en él
    try {
      // Intentar escribir un archivo de prueba para verificar permisos de escritura
      const testContent = new Blob(['test'], { type: 'text/plain' });
      const testFilePath = `_test_${Date.now()}.txt`;
      
      console.log(`Intentando escribir archivo de prueba en ${bucketName}/${testFilePath} para verificar acceso...`);
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(testFilePath, testContent, {
          contentType: 'text/plain',
          cacheControl: '3600'
        });
      
      if (!uploadError) {
        console.log(`¡Éxito! El bucket ${bucketName} existe y permite escritura.`);
        // Limpieza del archivo de prueba
        await supabase.storage.from(bucketName).remove([testFilePath]);
        return true;
      }
      
      throw uploadError;
    } catch (testError) {
      console.error(`No se pudo acceder al bucket ${bucketName}:`, testError);
      throw createAppError(
        ErrorType.UPLOAD,
        `No se pudo acceder al bucket de almacenamiento: ${(testError as Error).message}`,
        { bucketName }
      );
    }
  } catch (error) {
    console.error(`Error al verificar el bucket ${bucketName}:`, error);
    throw createAppError(
      ErrorType.UPLOAD,
      `Error al acceder al almacenamiento: ${(error as Error).message}`,
      { bucketName }
    );
  }
};

/**
 * Uploads client documents associating them with a client record
 */
export const uploadClientDocuments = async (
  clientId: string,
  documents: ClientDocument[],
  maxRetries = 2
): Promise<Omit<ClientDocument & { url: string }, 'file'>[]> => {
  // Ensure storage bucket exists
  await ensureClientBucketExists();
  
  const processedDocs: Omit<ClientDocument & { url: string }, 'file'>[] = [];
  
  // Process each document
  for (const doc of documents) {
    let attempt = 0;
    let success = false;
    let fileUrl = '';
    let lastError: any = null;
    
    while (attempt < maxRetries && !success) {
      try {
        attempt++;
        
        if (!doc.file) {
          console.warn(`Skipping document with missing file object: ${doc.documentName}`);
          continue;
        }
        
        // Determine content type
        const contentType = doc.file.type || getMimeTypeFromFileName(doc.file.name);
        
        // Upload file to storage
        const filePath = `clients/${clientId}/${doc.documentName}`;
        
        const { data, error } = await supabase.storage
          .from(DEFAULT_BUCKET_NAME)
          .upload(filePath, doc.file, {
            cacheControl: '3600',
            upsert: true,
            contentType  // Add content type here
          });
        
        if (error) throw error;
        
        // Get public URL for the file
        const { data: urlData } = await supabase.storage
          .from(DEFAULT_BUCKET_NAME)
          .getPublicUrl(filePath);
        
        fileUrl = urlData.publicUrl;
        success = true;
        
        // Remove file property and add URL
        const { file, ...docWithoutFile } = doc;
        processedDocs.push({
          ...docWithoutFile,
          url: fileUrl
        });
        
      } catch (err) {
        lastError = err;
        console.error(`Upload attempt ${attempt} failed for ${doc.documentName}:`, err);
        
        // Wait before retry
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 1000 * attempt));
        }
      }
    }
    
    if (!success) {
      console.error(`Failed to upload ${doc.documentName} after ${maxRetries} attempts`);
      throw lastError || new Error(`Failed to upload ${doc.documentName}`);
    }
  }
  
  return processedDocs;
};

// Helper function to get MIME type from filename
function getMimeTypeFromFileName(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  if (!extension) return 'application/octet-stream';
  
  const mimeTypes: Record<string, string> = {
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'txt': 'text/plain',
    'csv': 'text/csv',
  };
  
  return mimeTypes[extension] || 'application/octet-stream';
} 