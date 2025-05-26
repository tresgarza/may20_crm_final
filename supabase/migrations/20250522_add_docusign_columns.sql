-- 2025-05-22: Add DocuSign tracking columns to applications table
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS docusign_envelope_id text,
  ADD COLUMN IF NOT EXISTS docusign_sent_to text,
  ADD COLUMN IF NOT EXISTS docusign_manual_status text;

-- Enable RLS if not already
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Allow advisors and superadmins to update DocuSign fields, others read-only
DROP POLICY IF EXISTS app_docusign_update ON public.applications;
CREATE POLICY app_docusign_update
  ON public.applications FOR UPDATE
  WITH CHECK (
    -- Advisors can update rows where they are assigned or owner (client's advisor)
    (
      EXISTS (
        SELECT 1 FROM public.advisors adv
        WHERE adv.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.superadmins sa
        WHERE sa.user_id = auth.uid()
      )
    )
  ); 