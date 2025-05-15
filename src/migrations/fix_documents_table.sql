-- Comprehensive fix for documents table and related functionality

-- 1. Create the documents table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    application_id UUID,
    client_id UUID,
    file_name TEXT NOT NULL,
    file_path TEXT,
    file_type TEXT,
    file_size INTEGER DEFAULT 0,
    category TEXT,
    uploaded_by_user_id UUID,
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by UUID,
    verified_at TIMESTAMP WITH TIME ZONE
);

-- 2. Add missing columns if they don't exist
DO $$
BEGIN
    -- Check and add is_verified column
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                  WHERE table_name = 'documents' 
                  AND column_name = 'is_verified' 
                  AND table_schema = 'public') THEN
        ALTER TABLE public.documents 
        ADD COLUMN is_verified BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added is_verified column to documents table';
    END IF;
    
    -- Check and add verified_by column
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                  WHERE table_name = 'documents' 
                  AND column_name = 'verified_by' 
                  AND table_schema = 'public') THEN
        ALTER TABLE public.documents 
        ADD COLUMN verified_by UUID DEFAULT NULL;
        RAISE NOTICE 'Added verified_by column to documents table';
    END IF;
    
    -- Check and add verified_at column
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                  WHERE table_name = 'documents' 
                  AND column_name = 'verified_at' 
                  AND table_schema = 'public') THEN
        ALTER TABLE public.documents 
        ADD COLUMN verified_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
        RAISE NOTICE 'Added verified_at column to documents table';
    END IF;
    
    -- Check and add user_id column to users table if needed
    IF EXISTS (SELECT FROM information_schema.tables 
               WHERE table_name = 'users' 
               AND table_schema = 'public') THEN
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_name = 'users' 
                      AND column_name = 'user_id' 
                      AND table_schema = 'public') THEN
            ALTER TABLE public.users 
            ADD COLUMN user_id UUID DEFAULT gen_random_uuid();
            RAISE NOTICE 'Added user_id column to users table';
        END IF;
    END IF;
END $$;

-- 3. Create the check_column_exists function
CREATE OR REPLACE FUNCTION public.check_column_exists(_table_name text, _column_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = _table_name
        AND column_name = _column_name
        AND table_schema = 'public'
    );
END;
$$;

-- Grant permissions for the function
GRANT EXECUTE ON FUNCTION public.check_column_exists(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_column_exists(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.check_column_exists(text, text) TO service_role;

-- 4. Create the storage bucket if it doesn't exist
DO $$
BEGIN
    BEGIN
        PERFORM storage.create_bucket('client-documents', '{"public": true}');
        RAISE NOTICE 'Created client-documents storage bucket';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'client-documents bucket may already exist: %', SQLERRM;
    END;
END $$;

-- 5. Ensure proper RLS policies for documents table
DO $$
BEGIN
    -- Delete existing RLS policies if any (to avoid conflicts)
    DROP POLICY IF EXISTS "Enable all users to use documents" ON public.documents;
    
    -- Create new policies
    CREATE POLICY "Enable all users to use documents" 
    ON public.documents FOR ALL 
    USING (true)
    WITH CHECK (true);
    
    -- Enable RLS on the documents table
    ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
    
    RAISE NOTICE 'RLS policies configured for documents table';
END $$;

-- Verify setup was successful
DO $$
DECLARE
    table_exists boolean;
    bucket_exists boolean;
    function_exists boolean;
BEGIN
    -- Check if documents table exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'documents' 
        AND table_schema = 'public'
    ) INTO table_exists;
    
    -- Check if function exists
    SELECT EXISTS (
        SELECT FROM pg_proc 
        WHERE proname = 'check_column_exists'
    ) INTO function_exists;
    
    -- Output results
    RAISE NOTICE 'Setup verification:';
    RAISE NOTICE '- documents table exists: %', table_exists;
    RAISE NOTICE '- check_column_exists function exists: %', function_exists;
    
    -- Verify columns
    IF table_exists THEN
        RAISE NOTICE '- Column is_verified exists: %', 
            EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'is_verified');
        RAISE NOTICE '- Column verified_by exists: %', 
            EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'verified_by');
        RAISE NOTICE '- Column verified_at exists: %', 
            EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'verified_at');
    END IF;
END $$; 