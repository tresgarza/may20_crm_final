import { createClient } from '@supabase/supabase-js';

// Import environment variables
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://ydnygntfkrleiseuciwq.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkbnlnbnRma3JsZWlzZXVjaXdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk5OTI0MDYsImV4cCI6MjA1NTU2ODQwNn0.B-dH2Kptzz1oyM4ynno_GjlvjpxL-HbNKC_st4bgf0A';

// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database tables
export const TABLES = {
  APPLICATIONS: 'applications',
  CLIENTS: 'clients',
  ADVISORS: 'advisors',
  COMPANY_ADMINS: 'company_admins',
  COMPANIES: 'companies',
  DOCUMENTS: 'documents',
  APPLICATION_HISTORY: 'application_history',
  COMMENTS: 'comments',
}; 