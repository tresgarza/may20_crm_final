-- Migration: Add DocuSign tracking columns to applications table
-- Date: 2025-01-24
-- Description: Adds necessary columns for DocuSign integration in the Digital Signature Documents section

-- Add DocuSign tracking columns to applications table
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS docusign_envelope_id text,
  ADD COLUMN IF NOT EXISTS docusign_sent_to text,
  ADD COLUMN IF NOT EXISTS docusign_manual_status text CHECK (docusign_manual_status IN ('Sent', 'Delivered', 'Completed', 'Voided', 'Declined')),
  ADD COLUMN IF NOT EXISTS docusign_sandbox boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS docusign_created_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS docusign_updated_at timestamp with time zone;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_applications_docusign_envelope_id ON public.applications(docusign_envelope_id);
CREATE INDEX IF NOT EXISTS idx_applications_docusign_status ON public.applications(docusign_manual_status);

-- Ensure signed_documents table has all required columns
ALTER TABLE public.signed_documents
  ADD COLUMN IF NOT EXISTS document_name text,
  ADD COLUMN IF NOT EXISTS document_description text,
  ADD COLUMN IF NOT EXISTS client_email text,
  ADD COLUMN IF NOT EXISTS client_name text,
  ADD COLUMN IF NOT EXISTS invitation_message text,
  ADD COLUMN IF NOT EXISTS cincel_status text,
  ADD COLUMN IF NOT EXISTS cincel_invitation_id text,
  ADD COLUMN IF NOT EXISTS signed_file_url text,
  ADD COLUMN IF NOT EXISTS download_url text,
  ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS webhook_received_at timestamp with time zone;

-- Add indexes for signed_documents table
CREATE INDEX IF NOT EXISTS idx_signed_documents_application_id ON public.signed_documents(application_id);
CREATE INDEX IF NOT EXISTS idx_signed_documents_client_id ON public.signed_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_signed_documents_cincel_id ON public.signed_documents(cincel_document_id);
CREATE INDEX IF NOT EXISTS idx_signed_documents_status ON public.signed_documents(status);
CREATE INDEX IF NOT EXISTS idx_signed_documents_document_type ON public.signed_documents(document_type);

-- Add comments to document the purpose of each column
COMMENT ON COLUMN public.applications.docusign_envelope_id IS 'DocuSign envelope ID for manual tracking';
COMMENT ON COLUMN public.applications.docusign_sent_to IS 'Email address where DocuSign envelope was sent';
COMMENT ON COLUMN public.applications.docusign_manual_status IS 'Manual status tracking for DocuSign envelope';
COMMENT ON COLUMN public.applications.docusign_sandbox IS 'Whether this envelope was created in DocuSign sandbox environment';
COMMENT ON COLUMN public.applications.docusign_created_at IS 'When DocuSign envelope was created';
COMMENT ON COLUMN public.applications.docusign_updated_at IS 'When DocuSign data was last updated';

COMMENT ON COLUMN public.signed_documents.document_name IS 'Human-readable name of the document';
COMMENT ON COLUMN public.signed_documents.document_description IS 'Description of the document';
COMMENT ON COLUMN public.signed_documents.client_email IS 'Email address of the signer';
COMMENT ON COLUMN public.signed_documents.client_name IS 'Name of the signer';
COMMENT ON COLUMN public.signed_documents.invitation_message IS 'Custom message sent with signature request';
COMMENT ON COLUMN public.signed_documents.cincel_status IS 'Status returned by CINCEL API';
COMMENT ON COLUMN public.signed_documents.cincel_invitation_id IS 'CINCEL invitation ID';
COMMENT ON COLUMN public.signed_documents.signed_file_url IS 'URL to download signed document from CINCEL';
COMMENT ON COLUMN public.signed_documents.download_url IS 'Temporary download URL for signed document';
COMMENT ON COLUMN public.signed_documents.expires_at IS 'When the signature request expires';
COMMENT ON COLUMN public.signed_documents.webhook_received_at IS 'When webhook notification was received from CINCEL';

-- Update RLS policies to ensure proper access control
DROP POLICY IF EXISTS "DocuSign data access" ON public.applications;
CREATE POLICY "DocuSign data access" ON public.applications
  FOR ALL
  USING (
    -- Advisors can access applications for their assigned clients
    EXISTS (
      SELECT 1 FROM public.clients c
      JOIN public.advisors adv ON c.assigned_advisor_id = adv.id
      WHERE c.id = client_id AND adv.user_id = auth.uid()
    )
    OR
    -- Company admins can access applications for clients in their company
    EXISTS (
      SELECT 1 FROM public.clients c
      JOIN public.company_admins ca ON c.company_id = ca.company_id
      WHERE c.id = client_id AND ca.user_id = auth.uid()
    )
    OR
    -- Superadmins can access all applications
    EXISTS (
      SELECT 1 FROM public.superadmins sa
      WHERE sa.user_id = auth.uid()
    )
  );

-- Create a function to automatically update docusign_updated_at
CREATE OR REPLACE FUNCTION update_docusign_timestamp()
RETURNS trigger AS $$
BEGIN
  IF (OLD.docusign_envelope_id IS DISTINCT FROM NEW.docusign_envelope_id) OR
     (OLD.docusign_sent_to IS DISTINCT FROM NEW.docusign_sent_to) OR
     (OLD.docusign_manual_status IS DISTINCT FROM NEW.docusign_manual_status) THEN
    NEW.docusign_updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp update
DROP TRIGGER IF EXISTS trigger_update_docusign_timestamp ON public.applications;
CREATE TRIGGER trigger_update_docusign_timestamp
  BEFORE UPDATE ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION update_docusign_timestamp();

-- Create a view for easier querying of signature documents with application info
CREATE OR REPLACE VIEW public.signature_documents_view AS
SELECT 
  sd.*,
  a.client_name as app_client_name,
  a.client_email as app_client_email,
  a.product_name,
  a.status as application_status,
  a.docusign_envelope_id,
  a.docusign_sent_to,
  a.docusign_manual_status,
  a.docusign_sandbox
FROM public.signed_documents sd
JOIN public.applications a ON sd.application_id = a.id;

-- Grant proper permissions on the view
GRANT SELECT ON public.signature_documents_view TO authenticated;

-- Add RLS to the view
ALTER VIEW public.signature_documents_view SET (security_barrier = true);
CREATE POLICY "View signature documents" ON public.signature_documents_view
  FOR SELECT
  USING (
    -- Same policy as signed_documents table
    EXISTS (
      SELECT 1 FROM public.applications a
      JOIN public.clients c ON a.client_id = c.id
      JOIN public.advisors adv ON c.assigned_advisor_id = adv.id
      WHERE a.id = application_id AND adv.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.applications a
      JOIN public.clients c ON a.client_id = c.id
      JOIN public.company_admins ca ON c.company_id = ca.company_id
      WHERE a.id = application_id AND ca.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.superadmins sa
      WHERE sa.user_id = auth.uid()
    )
  );

-- Create enum for document types if it doesn't exist
DO $$ BEGIN
  CREATE TYPE document_type_enum AS ENUM ('pagare', 'contrato', 'autorizacion_buro', 'identificacion', 'comprobante_ingresos', 'otro');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create enum for signature status if it doesn't exist  
DO $$ BEGIN
  CREATE TYPE signature_status_enum AS ENUM ('pending', 'sent', 'delivered', 'signed', 'completed', 'expired', 'voided', 'declined', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Update signed_documents table to use enums for better data integrity
ALTER TABLE public.signed_documents
  ALTER COLUMN document_type TYPE document_type_enum USING document_type::document_type_enum,
  ALTER COLUMN status TYPE signature_status_enum USING status::signature_status_enum;

-- Final success message
DO $$ 
BEGIN 
  RAISE NOTICE 'DocuSign migration completed successfully!';
  RAISE NOTICE 'Added columns: docusign_envelope_id, docusign_sent_to, docusign_manual_status, docusign_sandbox, docusign_created_at, docusign_updated_at to applications table';
  RAISE NOTICE 'Enhanced signed_documents table with additional tracking columns';
  RAISE NOTICE 'Created signature_documents_view for easier querying';
  RAISE NOTICE 'Added proper indexes and RLS policies';
END $$; 