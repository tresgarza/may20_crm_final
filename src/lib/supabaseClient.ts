import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Constantes para almacenamiento
const STORAGE_KEY_TOKEN = 'crm_token';

// Valores de autenticación de Supabase
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || 'https://ydnygntfkrleiseuciwq.supabase.co';
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkbnlnbnRma3JsZWlzZXVjaXdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk5OTI0MDYsImV4cCI6MjA1NTU2ODQwNn0.B-dH2Kptzz1oyM4ynno_GjlvjpxL-HbNKC_st4bgf0A';

// Initialize the Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Service role key (más permisos que el anon key)
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkbnlnbnRma3JsZWlzZXVjaXdxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTk5MjQwNiwiZXhwIjoyMDU1NTY4NDA2fQ.TwhEGW9DK4DTQQRquT6Z9UW8T8UjLX-hp9uKdRjWAhs';

// Get a Supabase client with auth using JWT token or service role if needed
export const getAuthenticatedClient = (): SupabaseClient => {
  const token = localStorage.getItem(STORAGE_KEY_TOKEN);
  const userStr = localStorage.getItem('crm_user');
  const user = userStr ? JSON.parse(userStr) : null;
  
  // Si tenemos un token y un usuario, intentamos usar el token
  if (token && user) {
    console.log('Using authenticated client with JWT token');
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });
  }
  
  // Si hay un usuario pero no tenemos token, usamos service role (más permisos)
  if (user) {
    console.log('Using service role client for authenticated operations');
    return createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  }
  
  // Fallback to the default client if no authentication
  console.log('Using default anonymous client (not authenticated)');
  return supabase;
};

// Get a Supabase client with service role key (for admin operations)
export const getServiceClient = (): SupabaseClient => {
  console.log('Using service role client');
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
};

// Export a method to get access to Supabase Storage
export const getStorage = () => {
  // Usamos el cliente con rol de servicio para acceder al storage
  // Esto permite crear buckets y gestionar el almacenamiento sin restricciones RLS
  console.log('Using service role client for storage operations');
  return getServiceClient().storage;
}; 