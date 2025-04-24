import { supabase } from '../services/supabaseService';
import { ErrorType, createAppError, logError, safeAsync } from './errorHandling';
import { v4 as uuidv4 } from 'uuid';
import { ClientDocument } from '../types/client';

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
  
  try {
    // Generate unique file id and name
    const fileId = uuidv4();
    const fileExtension = file.name.split('.').pop();
    const fileName = `${fileId}.${fileExtension}`;
    const filePath = `${folder}/${fileName}`;
    
    // Upload the file
    const { error: uploadError } = await supabase.storage
      .from(DEFAULT_BUCKET_NAME)
      .upload(filePath, file);
    
    if (uploadError) {
      throw createAppError(
        ErrorType.UPLOAD,
        `Error uploading document: ${uploadError.message}`,
        { filePath, attempt },
        uploadError
      );
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
        .upload(testFilePath, testContent);
      
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
  // Ensure the storage bucket exists
  await ensureClientBucketExists();
  
  const folder = `clients/${clientId}`;
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
          console.warn(`Skipping document without file: ${doc.category || 'unknown category'}`);
          continue;
        }
        
        // Generate unique filename
        const fileId = uuidv4();
        const fileExtension = doc.file.name.split('.').pop() || '';
        const fileName = `${fileId}.${fileExtension}`;
        const filePath = `${folder}/${fileName}`;
        
        console.log(`Uploading ${doc.category || 'document'}: ${filePath} (attempt ${attempt}/${maxRetries})`);
        
        // Upload the file
        const { error } = await supabase.storage
          .from(DEFAULT_BUCKET_NAME)
          .upload(filePath, doc.file, {
            cacheControl: '3600',
            upsert: true // Cambiar a true para sobrescribir si existe
          });
        
        if (error) throw error;
        
        // Get the public URL
        const { data: urlData } = supabase.storage
          .from(DEFAULT_BUCKET_NAME)
          .getPublicUrl(filePath);

        fileUrl = urlData.publicUrl;
        success = true;
      } catch (error) {
        lastError = error;
        console.error(`Error uploading document (attempt ${attempt}/${maxRetries}):`, error);
        
        // Wait before retrying (exponential backoff)
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 500;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    if (success) {
      // Add successfully uploaded doc to the processed list without file property
      const { file, ...docWithoutFile } = doc;
      processedDocs.push({
        ...docWithoutFile,
        url: fileUrl
      });
    } else {
      // Log failure for this document
      logError(lastError, 'uploadClientDocuments', {
        clientId,
        category: doc.category || 'unknown',
        attempts: maxRetries
      });
    }
  }
  
  return processedDocs;
}; 