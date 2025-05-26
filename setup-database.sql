-- Create the signed_documents table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.signed_documents (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  application_id uuid REFERENCES public.applications(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE, 
  document_type text NOT NULL,
  cincel_document_id text NOT NULL,
  status text NOT NULL,
  signed_at timestamp with time zone,
  file_path text,
  sha256_hash text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create RLS policies for the signed_documents table
ALTER TABLE public.signed_documents ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to view documents
CREATE POLICY "Authenticated users can view their documents" 
ON public.signed_documents FOR SELECT
USING (
  -- Advisors can view all documents associated with their clients
  EXISTS (
    SELECT 1 FROM public.applications a
    JOIN public.clients c ON a.client_id = c.id
    JOIN public.advisors adv ON c.assigned_advisor_id = adv.id
    WHERE a.id = application_id AND adv.user_id = auth.uid()
  )
  OR
  -- Company admins can view all documents for clients of their company
  EXISTS (
    SELECT 1 FROM public.applications a
    JOIN public.clients c ON a.client_id = c.id
    JOIN public.company_admins ca ON c.company_id = ca.company_id
    WHERE a.id = application_id AND ca.user_id = auth.uid()
  )
  OR
  -- Superadmins can view all documents
  EXISTS (
    SELECT 1 FROM public.superadmins sa
    WHERE sa.user_id = auth.uid()
  )
);

-- Policy for advisors to insert their documents
CREATE POLICY "Advisors can create documents for their clients" 
ON public.signed_documents FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.applications a
    JOIN public.clients c ON a.client_id = c.id
    JOIN public.advisors adv ON c.assigned_advisor_id = adv.id
    WHERE a.id = application_id AND adv.user_id = auth.uid()
  )
  OR
  -- Superadmins can create documents
  EXISTS (
    SELECT 1 FROM public.superadmins sa
    WHERE sa.user_id = auth.uid()
  )
);

-- Policy for updating documents
CREATE POLICY "Authorized users can update documents"
ON public.signed_documents FOR UPDATE
USING (
  -- Advisors can update documents associated with their clients
  EXISTS (
    SELECT 1 FROM public.applications a
    JOIN public.clients c ON a.client_id = c.id
    JOIN public.advisors adv ON c.assigned_advisor_id = adv.id
    WHERE a.id = application_id AND adv.user_id = auth.uid()
  )
  OR
  -- Superadmins can update documents
  EXISTS (
    SELECT 1 FROM public.superadmins sa
    WHERE sa.user_id = auth.uid()
  )
)
WITH CHECK (
  status IN ('pending', 'signed', 'expired', 'canceled')
);

-- Create storage bucket for signed documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('signed-documents', 'signed-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy for the signed-documents bucket
CREATE POLICY "Authenticated users can view their signed documents" 
ON storage.objects FOR SELECT
USING (
  bucket_id = 'signed-documents' AND (
    -- Extract application_id from file path and check user permissions
    EXISTS (
      SELECT 1 FROM public.applications a
      JOIN public.clients c ON a.client_id = c.id
      JOIN public.advisors adv ON c.assigned_advisor_id = adv.id
      WHERE a.id::text = (storage.foldername(name))[1] AND adv.user_id = auth.uid()
    )
    OR
    -- Company admins can view signed documents for clients of their company
    EXISTS (
      SELECT 1 FROM public.applications a
      JOIN public.clients c ON a.client_id = c.id
      JOIN public.company_admins ca ON c.company_id = ca.company_id
      WHERE a.id::text = (storage.foldername(name))[1] AND ca.user_id = auth.uid()
    )
    OR
    -- Superadmins can view all signed documents
    EXISTS (
      SELECT 1 FROM public.superadmins sa
      WHERE sa.user_id = auth.uid()
    )
  )
);

-- Create storage policy for inserting signed documents
CREATE POLICY "Upload policy for signed documents" 
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'signed-documents' AND (
    -- Extract application_id from file path and check user permissions
    EXISTS (
      SELECT 1 FROM public.applications a
      JOIN public.clients c ON a.client_id = c.id
      JOIN public.advisors adv ON c.assigned_advisor_id = adv.id
      WHERE a.id::text = (storage.foldername(name))[1] AND adv.user_id = auth.uid()
    )
    OR
    -- Superadmins can upload signed documents
    EXISTS (
      SELECT 1 FROM public.superadmins sa
      WHERE sa.user_id = auth.uid()
    )
  )
); 