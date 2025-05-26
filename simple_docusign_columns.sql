-- SIMPLE DocuSign Columns Migration
-- Date: 2025-01-24
-- ONLY adds necessary columns - NO RLS changes

-- Add ONLY the DocuSign columns to applications table
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS docusign_envelope_id text,
  ADD COLUMN IF NOT EXISTS docusign_sent_to text,
  ADD COLUMN IF NOT EXISTS docusign_manual_status text CHECK (docusign_manual_status IN ('PENDIENTE DE ENVIO', 'ENVIADO', 'FIRMADO', 'CANCELADO'));

-- Add basic index for performance (safe to add)
CREATE INDEX IF NOT EXISTS idx_applications_docusign_envelope 
ON public.applications(docusign_envelope_id) 
WHERE docusign_envelope_id IS NOT NULL;

-- Success message
SELECT 'DocuSign columns added successfully to applications table!' as result; 