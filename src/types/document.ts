/**
 * Parámetros para subir un documento
 */
export interface DocumentUpload {
  file: File;
  application_id?: string;
  client_id?: string;
  userId: string;
  documentName: string;
  description?: string;
  category: string;
}

/**
 * Documento almacenado en la base de datos
 */
export interface Document {
  id: string;
  created_at: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  category: string;
  description?: string;
  application_id?: string;
  client_id?: string;
  uploaded_by_user_id: string;
} 