import { supabase } from '../config/supabase';

interface Invitation {
  invite_email: string;
  invite_name: string;
  message?: string;
  allowed_signature_types?: 'autograph' | 'advanced' | 'all';
  stage?: number;
}

interface CreateDocumentPayload {
  name: string;
  description?: string;
  invitations_attributes: Invitation[];
  base64_file: string;
}

interface CincelDocumentResponse {
  id: string;
  status: string;
  signed_file_url?: string;
  files?: Array<{ signed_file_url?: string; sha256_signed_file?: string }>;
  [key: string]: any;
}

const CINCEL_BASE_URL = process.env.NEXT_PUBLIC_CINCEL_BASE_URL || 'https://sandbox.api.cincel.digital';
const CINCEL_API_KEY = process.env.NEXT_PUBLIC_CINCEL_API_KEY || '';

// Internal helper to make authenticated requests
const request = async <T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> => {
  const res = await fetch(`${CINCEL_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CINCEL_API_KEY,
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`CINCEL API error: ${res.status} ${errorText}`);
  }

  return res.json() as Promise<T>;
};

/**
 * createDocument
 * Sube un PDF a CINCEL y crea la solicitud de firma.
 */
export const createDocument = async (
  payload: CreateDocumentPayload
): Promise<CincelDocumentResponse> => {
  return request<CincelDocumentResponse>('/v1/documents', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

/**
 * getDocument
 * Obtiene el detalle de un documento dado su ID.
 */
export const getDocument = async (
  documentId: string
): Promise<CincelDocumentResponse> => {
  return request<CincelDocumentResponse>(`/v1/documents/${documentId}`, {
    method: 'GET',
  });
};

/**
 * downloadSignedFile
 * Descarga el PDF firmado y devuelve un Blob.
 */
export const downloadSignedFile = async (
  signedFileUrl: string
): Promise<Blob> => {
  const res = await fetch(signedFileUrl);
  if (!res.ok) {
    throw new Error('Error descargando PDF firmado');
  }
  return res.blob();
};

/**
 * uploadToSupabase
 * Sube el Blob del PDF al bucket de storage y devuelve la ruta.
 */
export const uploadToSupabase = async (
  path: string,
  file: Blob
): Promise<string> => {
  const { error } = await supabase.storage.from('signed-documents').upload(path, file, {
    contentType: 'application/pdf',
    upsert: true,
  });

  if (error) throw error;
  return path;
}; 