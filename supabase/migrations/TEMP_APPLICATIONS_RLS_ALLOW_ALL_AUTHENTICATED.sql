-- TEMPORARY RLS POLICY - ALLOWS ALL AUTHENTICATED USERS TO VIEW ALL APPLICATIONS
-- This is for diagnostic purposes ONLY and is NOT secure for production.

-- Step 1: Drop any existing SELECT policy named "Allow users to view applications based on role"
-- This is to ensure we don't have conflicting policies. Adjust name if your main policy is different.
DROP POLICY IF EXISTS "Allow users to view applications based on role" ON public.applications;

-- Step 2: Drop any previous temporary policy to avoid errors if re-running
DROP POLICY IF EXISTS "TEMP - Allow all authenticated to view applications" ON public.applications;

-- Step 3: Create a temporary policy to allow all authenticated users to view all applications
CREATE POLICY "TEMP - Allow all authenticated to view applications"
  ON public.applications FOR SELECT
  TO authenticated -- Grants SELECT to any logged-in user
  USING (true);    -- Makes all rows visible to this policy

-- Step 4: Ensure RLS is enabled on the table.
-- If RLS was accidentally disabled, this re-enables it.
-- If it's already enabled, this command does nothing harmful.
-- You MUST have RLS enabled for policies to take effect.
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Step 5: Ensure all potential roles have SELECT privilege on the table (anon and authenticated)
GRANT SELECT ON public.applications TO anon, authenticated;

-- Step 6: (Optional) Create an even broader policy that applies to ALL roles (including anon)
-- If the above authenticated policy is not enough because your sessions are using the 'anon' role, uncomment the following:
-- DROP POLICY IF EXISTS "TEMP - Allow all roles to view applications" ON public.applications;
-- CREATE POLICY "TEMP - Allow all roles to view applications"
--   ON public.applications FOR SELECT
--   USING (true);

-- AFTER TESTING, YOU MUST REVERT THIS BY:
-- 1. Dropping this temporary policy: DROP POLICY "TEMP - Allow all authenticated to view applications" ON public.applications;
-- 2. Re-applying your secure RLS policy (e.g., the v6 script). 