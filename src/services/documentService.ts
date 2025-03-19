import { supabase } from '../utils/supabase';
import { TABLES } from '../utils/constants/tables';

export interface Document {
  id: string;
  created_at: string;
  name: string;
  description?: string;
  file_path: string;
  file_type: string;
  file_size: number;
  application_id: string;
  uploaded_by: string;
  is_verified?: boolean;
  verified_by?: string;
  verified_at?: string;
}

const DOCUMENTS_TABLE = TABLES.DOCUMENTS;
const STORAGE_BUCKET = 'application-documents';

// Get all documents for an application
export const getApplicationDocuments = async (applicationId: string) => {
  const { data, error } = await supabase
    .from(DOCUMENTS_TABLE)
    .select(`
      *,
      uploaded_by_user:uploaded_by (id, name, email),
      verified_by_user:verified_by (id, name, email)
    `)
    .eq('application_id', applicationId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error(`Error fetching documents for application ${applicationId}:`, error);
    throw error;
  }

  return data;
};

// Get a single document by ID
export const getDocumentById = async (id: string) => {
  const { data, error } = await supabase
    .from(DOCUMENTS_TABLE)
    .select(`
      *,
      uploaded_by_user:uploaded_by (id, name, email),
      verified_by_user:verified_by (id, name, email)
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error(`Error fetching document with ID ${id}:`, error);
    throw error;
  }

  return data as Document;
};

// Upload a document
export const uploadDocument = async (
  file: File,
  applicationId: string,
  userId: string,
  documentName: string,
  description?: string
) => {
  // Generate a unique file path
  const timestamp = new Date().getTime();
  const fileExtension = file.name.split('.').pop();
  const filePath = `${applicationId}/${timestamp}-${file.name}`;

  // Upload file to storage
  const { data: storageData, error: storageError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (storageError) {
    console.error('Error uploading file:', storageError);
    throw storageError;
  }

  // Create document record in database
  const { data: documentData, error: documentError } = await supabase
    .from(DOCUMENTS_TABLE)
    .insert([
      {
        name: documentName,
        description,
        file_path: filePath,
        file_type: file.type,
        file_size: file.size,
        application_id: applicationId,
        uploaded_by: userId
      }
    ])
    .select();

  if (documentError) {
    console.error('Error creating document record:', documentError);
    
    // Delete the uploaded file if document record creation failed
    await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([filePath]);
      
    throw documentError;
  }

  return documentData[0] as Document;
};

// Delete a document
export const deleteDocument = async (documentId: string) => {
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
    throw storageError;
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
};

// Get document download URL
export const getDocumentUrl = async (filePath: string) => {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(filePath, 60 * 60); // 1 hour expiry

  if (error) {
    console.error(`Error getting URL for document ${filePath}:`, error);
    throw error;
  }

  return data.signedUrl;
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