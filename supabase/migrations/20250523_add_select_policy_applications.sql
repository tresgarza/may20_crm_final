-- 2025-05-23: Add SELECT RLS policy to applications table (v6 - comprehensive based on schema)

-- Drop existing SELECT policy if it exists (for idempotency)
DROP POLICY IF EXISTS "Allow users to view applications based on role" ON public.applications;

-- Create SELECT policy for applications
CREATE POLICY "Allow users to view applications based on role"
  ON public.applications FOR SELECT
  USING (
    -- Condition 1: User is an Advisor
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid() AND u.advisor_id IS NOT NULL -- Ensure the user is an advisor by checking users.advisor_id
        AND (
          -- Case 1.1: Application is directly assigned to this advisor
          applications.assigned_to = u.advisor_id
          OR
          -- Case 1.2: Application's client is assigned to this advisor
          EXISTS (
            SELECT 1
            FROM public.clients c
            WHERE c.id = applications.client_id AND c.advisor_id = u.advisor_id
          )
        )
    )
    OR
    -- Condition 2: User is a Company Admin
    EXISTS (
      SELECT 1
      FROM public.company_admins ca
      WHERE ca.id = auth.uid() -- Assumes company_admins.id is the user's auth.uid()
        AND applications.company_id = ca.company_id
    )
    -- Condition 3 (Optional): User is a Superadmin (e.g., identified by a role in the users table)
    /* OR
    EXISTS (
      SELECT 1
      FROM public.users u_super
      WHERE u_super.id = auth.uid() AND u_super.role = 'SUPERADMIN' -- Adjust role name if needed
    )
    */
  );

-- Note: The existing UPDATE policy 'advisors_update_docusign' might also need review
-- based on these structures, but we are focusing on the SELECT policy for now. 