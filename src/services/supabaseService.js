import { createClient } from '@supabase/supabase-js';

// Import environment variables
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://ydnygntfkrleiseuciwq.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkbnlnbnRma3JsZWlzZXVjaXdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk5OTI0MDYsImV4cCI6MjA1NTU2ODQwNn0.B-dH2Kptzz1oyM4ynno_GjlvjpxL-HbNKC_st4bgf0A';
const serviceRoleKey = process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY || '';

// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Get an authenticated client for the current user
export const getAuthenticatedClient = () => {
  return supabase;
};

// Get a client with service role permissions for admin operations
export const getServiceClient = () => {
  if (!serviceRoleKey) {
    console.warn('Service role key not available, falling back to anon client');
    return supabase;
  }
  return createClient(supabaseUrl, serviceRoleKey);
};

// Function to reinitialize the Supabase client (useful after authentication changes)
export const reinitializeSupabaseClient = () => {
  return createClient(supabaseUrl, supabaseAnonKey);
};

// Helper function to create a real-time subscription to a table
export const createTableSubscription = (table, events, callback) => {
  console.log(`Setting up real-time subscription for ${table}...`);
  
  try {
    const subscription = supabase
      .channel(`public:${table}`)
      .on('postgres_changes', { 
        event: events, 
        schema: 'public', 
        table 
      }, (payload) => {
        // Process the payload
        console.log('Received real-time update:', payload);
        callback(payload);
      })
      .subscribe();
    
    // Return cleanup function
    return () => {
      console.log(`Unsubscribing from ${table}...`);
      subscription.unsubscribe();
    };
  } catch (error) {
    console.error('Error setting up subscription:', error);
    return () => {}; // Empty cleanup function
  }
};

// Get storage bucket reference
export const getStorage = (bucket = 'documents') => {
  return supabase.storage.from(bucket);
};

// Export default supabase client
export default supabase; 