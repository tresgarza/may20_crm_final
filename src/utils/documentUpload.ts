import { supabase } from '../lib/supabaseClient';
import { ErrorType, createAppError, logError, safeAsync } from './errorHandling';
import { v4 as uuidv4 } from 'uuid';
import { getStorage } from '../lib/supabaseClient';
import { ClientDocument } from '../types/client';

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
      .from('documents')
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
      .from('documents')
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
export const ensureClientBucketExists = async (bucketName: string = 'client-documents'): Promise<boolean> => {
  try {
    console.log(`Verificando si el bucket ${bucketName} existe...`);
    const storage = getStorage();
    
    // Intentar listar buckets para verificar si existe
    const { data: buckets, error: listError } = await storage.listBuckets();
    
    if (listError) {
      console.error(`Error al listar buckets:`, listError);
      // Si hay un error al listar buckets, podría ser un problema de permisos
      // Intentaremos verificar directamente intentando listar archivos del bucket
      const { error: listFilesError } = await storage.from(bucketName).list();
      
      if (!listFilesError) {
        // Si no hay error al listar archivos, significa que el bucket existe
        console.log(`El bucket ${bucketName} existe y es accesible.`);
        return true;
      }
      
      throw createAppError(
        ErrorType.UPLOAD,
        `Error al acceder al almacenamiento: ${listError.message}`,
        { error: listError }
      );
    }
    
    // Verificar si el bucket ya existe
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
    
    if (bucketExists) {
      console.log(`El bucket ${bucketName} ya existe.`);
      return true;
    }
    
    console.log(`El bucket ${bucketName} no existe. Intentando crearlo...`);
    
    // Crear el bucket si no existe
    const MAX_RETRIES = 2;
    let attempt = 0;
    let lastError = null;
    
    while (attempt < MAX_RETRIES) {
      try {
        const { data, error: createError } = await storage.createBucket(bucketName, {
          public: false
        });
        
        if (createError) {
          console.error(`Error al crear el bucket ${bucketName} (intento ${attempt + 1}/${MAX_RETRIES}):`, createError);
          lastError = createError;
          
          // Si el error indica que el bucket ya existe, consideremos eso un éxito
          if (createError.message?.includes('already exists')) {
            console.log(`El bucket ${bucketName} ya existe (según el mensaje de error).`);
            return true;
          }
          
          throw createError;
        }
        
        console.log(`Bucket ${bucketName} creado correctamente.`);
        
        // Intentar establecer políticas públicas para el bucket
        try {
          // Verificar que podemos acceder al bucket recién creado
          const { error: testError } = await storage.from(bucketName).list('', {
            limit: 1
          });
          
          if (testError) {
            console.warn(`Advertencia: El bucket ${bucketName} fue creado pero hay problemas para acceder a él: ${testError.message}`);
          } else {
            console.log(`Bucket ${bucketName} creado y accesible correctamente.`);
          }
        } catch (policyError) {
          // No bloquear el proceso si falla la verificación
          console.warn(`No se pudo verificar acceso al bucket ${bucketName}:`, policyError);
        }
        
        return true;
      } catch (error) {
        lastError = error;
        attempt++;
        
        // Si no es el último intento, esperar antes de reintentar
        if (attempt < MAX_RETRIES) {
          const waitTime = 1000 * Math.pow(2, attempt - 1); // Backoff exponencial
          console.log(`Esperando ${waitTime}ms antes de reintentar crear el bucket...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    
    // Si llegamos aquí, todos los intentos fallaron
    throw lastError || new Error(`No se pudo crear el bucket ${bucketName} después de ${MAX_RETRIES} intentos.`);
  } catch (error) {
    // Como último recurso, verificamos si podemos escribir en el bucket aunque no podamos crearlo
    try {
      const storage = getStorage();
      const testFilePath = `test-${Date.now()}.txt`;
      const testContent = new Blob(['test'], { type: 'text/plain' });
      
      console.log(`Intentando escribir archivo de prueba en ${bucketName}/${testFilePath} como último recurso...`);
      const { error: uploadError } = await storage.from(bucketName).upload(testFilePath, testContent);
      
      if (!uploadError) {
        console.log(`¡Éxito! El bucket ${bucketName} existe y permite escritura.`);
        // Limpieza del archivo de prueba
        await storage.from(bucketName).remove([testFilePath]);
        return true;
      }
    } catch (testError) {
      console.error(`Error en la prueba final de escritura en bucket:`, testError);
    }
    
    console.error(`Error al verificar/crear bucket ${bucketName}:`, error);
    throw createAppError(
      ErrorType.UPLOAD,
      error instanceof Error 
        ? `Error al crear el bucket de almacenamiento: ${error.message}` 
        : 'Error desconocido al crear el bucket de almacenamiento',
      { bucketName, error }
    );
  }
};

/**
 * Uploads client documents to storage
 * @param clientId The client ID
 * @param documents Array of documents to upload
 * @param maxRetries Maximum number of retry attempts (default: 2)
 * @returns Array of successfully uploaded documents (without the original file object)
 */
export const uploadClientDocuments = async (
  clientId: string,
  documents: ClientDocument[],
  maxRetries = 2
): Promise<Omit<ClientDocument & { url: string }, 'file'>[]> => {
  // Verify parameters
  if (!clientId) {
    throw new Error('Client ID is required for uploading documents');
  }

  if (!documents || !Array.isArray(documents) || documents.length === 0) {
    return [];
  }

  try {
    // Asegurar que el bucket existe antes de continuar
    let bucketName = 'client-documents';
    
    console.log(`Iniciando proceso de subida de documentos para cliente ${clientId}`);
    console.log(`Total de documentos: ${documents.length}`);
    
    let bucketReady = false;
    try {
      bucketReady = await ensureClientBucketExists(bucketName);
      if (bucketReady) {
        console.log(`Bucket ${bucketName} verificado y listo para su uso.`);
      }
    } catch (bucketError) {
      console.error(`Error preparando el bucket ${bucketName}:`, bucketError);
      // Intentar continuar usando el bucket predeterminado 'documents' como fallback
      bucketName = 'documents';
      console.log(`Intentando usar el bucket predeterminado '${bucketName}' como alternativa...`);
      try {
        bucketReady = await ensureClientBucketExists(bucketName);
        if (bucketReady) {
          console.log(`Usando bucket alternativo '${bucketName}' para la subida.`);
        }
      } catch (fallbackError) {
        console.error(`No se pudo usar ningún bucket para la subida:`, fallbackError);
        throw createAppError(
          ErrorType.UPLOAD,
          `No se pudo preparar un bucket para subir documentos. Contacte al administrador.`,
          { originalError: bucketError }
        );
      }
    }
    
    const storage = getStorage();
    const uploadedDocs: Array<Omit<ClientDocument & { url: string }, 'file'>> = [];
    const failedDocs: Array<{name: string, error: any}> = [];

    // Filter out docs with invalid or missing files
    const validDocs = documents.filter(doc => 
      doc && doc.file && doc.file instanceof File && doc.category && doc.name
    );
    console.log(`Documentos válidos para subida: ${validDocs.length} de ${documents.length}`);

    if (validDocs.length === 0) {
      console.warn(`No hay documentos válidos para subir. Se requiere archivo, categoría y nombre.`);
      return [];
    }

    for (let docIndex = 0; docIndex < validDocs.length; docIndex++) {
      const doc = validDocs[docIndex];
      let fileUrl = '';
      let success = false;
      let retries = 0;
      let lastError = null;

      console.log(`Procesando documento ${docIndex + 1}/${validDocs.length}: "${doc.name}" (${doc.file.size} bytes)`);

      while (!success && retries <= maxRetries) {
        retries++;
        try {
          // Construct a unique file name to avoid collisions
          const timestamp = new Date().getTime();
          const fileNameSafe = doc.file.name.replace(/[^a-zA-Z0-9.-]/g, '_'); // Sanitizar nombre de archivo
          const fileName = `${timestamp}_${fileNameSafe}`;
          const filePath = `${clientId}/${doc.category}/${fileName}`;

          console.log(`Intento ${retries}/${maxRetries+1}: Subiendo "${doc.name}" a ${bucketName}/${filePath}`);

          // Upload the file
          const { data, error } = await storage
            .from(bucketName)
            .upload(filePath, doc.file, {
              cacheControl: '3600',
              upsert: true, // Cambiar a true para sobrescribir si existe
            });

          if (error) {
            console.error(`Error al subir archivo "${doc.name}" (intento ${retries}/${maxRetries+1}):`, error);
            lastError = error;
            throw error;
          }

          // Get the public URL
          const { data: urlData } = storage
            .from(bucketName)
            .getPublicUrl(filePath);

          fileUrl = urlData.publicUrl;
          success = true;
          console.log(`✅ Documento "${doc.name}" subido exitosamente a ${bucketName}/${filePath}`);
        } catch (error) {
          lastError = error;
          
          // Imprimir detalles adicionales del error para diagnóstico
          if (error instanceof Error) {
            console.error(`Detalles del error: ${error.message}`);
            if ((error as any).stack) {
              console.error(`Stack: ${(error as any).stack}`);
            }
          }
          
          // Si no es el último intento, esperar antes de reintentar
          if (retries <= maxRetries) {
            const waitTime = Math.pow(2, retries-1) * 1000; // Backoff exponencial
            console.log(`Esperando ${waitTime}ms antes de reintentar la subida...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          } else {
            console.error(`❌ Falló la subida de "${doc.name}" después de ${retries} intentos.`);
            failedDocs.push({
              name: doc.name || doc.file.name,
              error: error
            });
            
            // Create a proper AppError and log it
            const uploadError = createAppError(
              ErrorType.UPLOAD,
              `Error al subir documento "${doc.name || doc.file.name}" después de ${maxRetries+1} intentos`,
              {
                documentName: doc.name,
                clientId,
                category: doc.category,
                attempts: retries
              },
              error
            );
            
            logError(uploadError, 'uploadClientDocuments');
          }
        }
      }

      if (success) {
        // Create document without the file property
        const { file, ...docWithoutFile } = doc;
        uploadedDocs.push({
          ...docWithoutFile,
          url: fileUrl
        });
      }
    }

    if (failedDocs.length > 0) {
      console.warn(`⚠️ ${failedDocs.length} documentos fallaron al subirse de un total de ${validDocs.length}:`, failedDocs);
    }
    
    console.log(`📊 Resumen: ${uploadedDocs.length} documentos subidos exitosamente, ${failedDocs.length} fallidos.`);
    return uploadedDocs;
  } catch (error) {
    console.error('❌ Error general en uploadClientDocuments:', error);
    
    // Proporcionar un mensaje de error más descriptivo basado en el tipo de error
    let errorMessage = 'Error al subir documentos';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'object' && error !== null && 'message' in error) {
      errorMessage = (error as any).message || errorMessage;
    }
    
    throw createAppError(
      ErrorType.UPLOAD,
      errorMessage,
      { clientId, error }
    );
  }
}; 