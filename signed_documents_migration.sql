-- Add the UUID extension if it's not already added
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the signed_documents table
CREATE TABLE IF NOT EXISTS public.signed_documents (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  application_id uuid NOT NULL,
  client_id uuid NOT NULL,
  document_type text NOT NULL,
  cincel_document_id text NOT NULL,
  status text NOT NULL,
  signed_at timestamp with time zone,
  file_path text,
  sha256_hash text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.signed_documents ENABLE ROW LEVEL SECURITY;

-- Create public access policy (for development only - replace with proper policies later)
CREATE POLICY "Allow public access to signed_documents" ON public.signed_documents
  USING (true)
  WITH CHECK (true);

-- Create storage bucket for signed documents if it doesn't exist
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('signed-documents', 'signed-documents', true)
  ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error creating bucket: %', SQLERRM;
END $$; 