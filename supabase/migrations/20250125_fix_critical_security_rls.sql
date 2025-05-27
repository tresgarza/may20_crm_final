-- CRITICAL SECURITY FIX: Remove dangerous temporary RLS policy and establish proper security
-- This migration fixes the critical security vulnerability where all authenticated users
-- could see all applications from all companies.

-- ========================================
-- 1. REMOVE DANGEROUS TEMPORARY POLICIES
-- ========================================

-- Remove the dangerous temporary policy that allows all authenticated users to see everything
DROP POLICY IF EXISTS "TEMP - Allow all authenticated to view applications" ON public.applications;
DROP POLICY IF EXISTS "TEMP - Allow all roles to view applications" ON public.applications;

-- ========================================
-- 2. ESTABLISH PROPER RLS POLICIES FOR APPLICATIONS
-- ========================================

-- Create secure policy for applications table
CREATE POLICY "Secure applications access by role and company"
  ON public.applications FOR SELECT
  USING (
    -- Superadmins can see everything
    EXISTS (
      SELECT 1 FROM public.superadmins sa
      WHERE sa.user_id = auth.uid()
    )
    OR
    -- Advisors can see applications from their assigned companies
    EXISTS (
      SELECT 1 FROM public.advisors adv
      JOIN public.companies c ON c.advisor_id = adv.id
      WHERE adv.user_id = auth.uid() 
      AND applications.company_id = c.id
    )
    OR
    -- Company admins can see applications from their own company only
    EXISTS (
      SELECT 1 FROM public.company_admins ca
      WHERE ca.id = auth.uid()
      AND applications.company_id = ca.company_id
    )
  );

-- ========================================
-- 3. ESTABLISH PROPER RLS POLICIES FOR USERS TABLE
-- ========================================

-- Enable RLS on users table if not already enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies on users table
DROP POLICY IF EXISTS "Users can view based on role" ON public.users;
DROP POLICY IF EXISTS "Enable all users to use users" ON public.users;

-- Create secure policy for users table (employees/clients)
CREATE POLICY "Secure users access by role and company"
  ON public.users FOR SELECT
  USING (
    -- Superadmins can see all users
    EXISTS (
      SELECT 1 FROM public.superadmins sa
      WHERE sa.user_id = auth.uid()
    )
    OR
    -- Advisors can see users from their assigned companies
    EXISTS (
      SELECT 1 FROM public.advisors adv
      JOIN public.companies c ON c.advisor_id = adv.id
      WHERE adv.user_id = auth.uid() 
      AND users.company_id = c.id
    )
    OR
    -- Company admins can see users from their own company only
    EXISTS (
      SELECT 1 FROM public.company_admins ca
      WHERE ca.id = auth.uid()
      AND users.company_id = ca.company_id
    )
    OR
    -- Users can see their own record
    users.id = auth.uid()
  );

-- ========================================
-- 4. ESTABLISH PROPER RLS POLICIES FOR OTHER CRITICAL TABLES
-- ========================================

-- Enable RLS on clients table (if it exists separately from users)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'clients' AND table_schema = 'public') THEN
    ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Secure clients access" ON public.clients;
    
    CREATE POLICY "Secure clients access by role and company"
      ON public.clients FOR SELECT
      USING (
        -- Superadmins can see all clients
        EXISTS (
          SELECT 1 FROM public.superadmins sa
          WHERE sa.user_id = auth.uid()
        )
        OR
        -- Advisors can see clients from their assigned companies
        EXISTS (
          SELECT 1 FROM public.advisors adv
          JOIN public.companies c ON c.advisor_id = adv.id
          WHERE adv.user_id = auth.uid() 
          AND clients.company_id = c.id
        )
        OR
        -- Company admins can see clients from their own company only
        EXISTS (
          SELECT 1 FROM public.company_admins ca
          WHERE ca.id = auth.uid()
          AND clients.company_id = ca.company_id
        )
      );
  END IF;
END $$;

-- Enable RLS on companies table
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Secure companies access" ON public.companies;

CREATE POLICY "Secure companies access by role"
  ON public.companies FOR SELECT
  USING (
    -- Superadmins can see all companies
    EXISTS (
      SELECT 1 FROM public.superadmins sa
      WHERE sa.user_id = auth.uid()
    )
    OR
    -- Advisors can see their assigned companies
    EXISTS (
      SELECT 1 FROM public.advisors adv
      WHERE adv.user_id = auth.uid() 
      AND companies.advisor_id = adv.id
    )
    OR
    -- Company admins can see their own company
    EXISTS (
      SELECT 1 FROM public.company_admins ca
      WHERE ca.id = auth.uid()
      AND companies.id = ca.company_id
    )
  );

-- ========================================
-- 5. ESTABLISH UPDATE/INSERT/DELETE POLICIES
-- ========================================

-- Applications UPDATE policy
CREATE POLICY "Secure applications update by role"
  ON public.applications FOR UPDATE
  USING (
    -- Superadmins can update everything
    EXISTS (
      SELECT 1 FROM public.superadmins sa
      WHERE sa.user_id = auth.uid()
    )
    OR
    -- Advisors can update applications from their assigned companies
    EXISTS (
      SELECT 1 FROM public.advisors adv
      JOIN public.companies c ON c.advisor_id = adv.id
      WHERE adv.user_id = auth.uid() 
      AND applications.company_id = c.id
    )
    OR
    -- Company admins can update applications from their own company
    EXISTS (
      SELECT 1 FROM public.company_admins ca
      WHERE ca.id = auth.uid()
      AND applications.company_id = ca.company_id
    )
  );

-- Applications INSERT policy
CREATE POLICY "Secure applications insert by role"
  ON public.applications FOR INSERT
  WITH CHECK (
    -- Superadmins can insert everything
    EXISTS (
      SELECT 1 FROM public.superadmins sa
      WHERE sa.user_id = auth.uid()
    )
    OR
    -- Advisors can insert applications for their assigned companies
    EXISTS (
      SELECT 1 FROM public.advisors adv
      JOIN public.companies c ON c.advisor_id = adv.id
      WHERE adv.user_id = auth.uid() 
      AND applications.company_id = c.id
    )
    OR
    -- Company admins can insert applications for their own company
    EXISTS (
      SELECT 1 FROM public.company_admins ca
      WHERE ca.id = auth.uid()
      AND applications.company_id = ca.company_id
    )
  );

-- ========================================
-- 6. VERIFY SECURITY SETUP
-- ========================================

-- Create a function to verify RLS is working correctly
CREATE OR REPLACE FUNCTION verify_rls_security()
RETURNS TABLE(
  table_name text,
  rls_enabled boolean,
  policy_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.tablename::text,
    t.rowsecurity,
    COUNT(p.policyname)
  FROM pg_tables t
  LEFT JOIN pg_policies p ON p.tablename = t.tablename
  WHERE t.schemaname = 'public' 
  AND t.tablename IN ('applications', 'users', 'clients', 'companies')
  GROUP BY t.tablename, t.rowsecurity
  ORDER BY t.tablename;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION verify_rls_security() TO authenticated;

-- Log this critical security fix
INSERT INTO public.status_history (
  source_type,
  source_id,
  previous_status,
  new_status,
  changed_by,
  comments,
  changed_at
) VALUES (
  'security_fix',
  gen_random_uuid(),
  'VULNERABLE',
  'SECURED',
  auth.uid(),
  'CRITICAL: Removed dangerous temporary RLS policy that allowed all authenticated users to see all data. Established proper company-based data isolation.',
  now()
); 