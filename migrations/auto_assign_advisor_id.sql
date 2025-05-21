-- Script to assign advisor_id to clients/users based on their company_id
-- This ensures clients created by company admins also have advisor_id set

-- 1. Create the function to automatically set advisor_id for new users/clients
CREATE OR REPLACE FUNCTION auto_assign_advisor_id_on_insert()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process when advisor_id is NULL but company_id is set
    IF NEW.advisor_id IS NULL AND NEW.company_id IS NOT NULL THEN
        -- Get the advisor_id from the company and assign it to the new user
        SELECT advisor_id INTO NEW.advisor_id 
        FROM companies 
        WHERE id = NEW.company_id 
        AND advisor_id IS NOT NULL;
        
        -- Log the assignment for debugging
        IF NEW.advisor_id IS NOT NULL THEN
            RAISE NOTICE 'Auto-assigned advisor_id % to user % based on company_id %', 
                NEW.advisor_id, NEW.id, NEW.company_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Create the trigger on the users table
DROP TRIGGER IF EXISTS auto_assign_advisor_id_trigger ON users;
CREATE TRIGGER auto_assign_advisor_id_trigger
BEFORE INSERT OR UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION auto_assign_advisor_id_on_insert();

-- 3. Run a one-time update to assign advisor_id to existing clients where it's NULL
UPDATE users
SET advisor_id = c.advisor_id
FROM companies c
WHERE users.company_id = c.id
  AND users.advisor_id IS NULL
  AND c.advisor_id IS NOT NULL;

-- 4. Create an RPC function to manually populate advisor_id on users/clients
CREATE OR REPLACE FUNCTION sync_client_advisor_ids()
RETURNS TABLE(updated_count INTEGER) AS $$
DECLARE
    v_count INTEGER := 0;
BEGIN
    -- Update clients/users with missing advisor_id from their companies
    UPDATE users
    SET advisor_id = c.advisor_id
    FROM companies c
    WHERE users.company_id = c.id
      AND users.advisor_id IS NULL
      AND c.advisor_id IS NOT NULL;
      
    GET DIAGNOSTICS v_count = ROW_COUNT;
    
    RETURN QUERY SELECT v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Modify the create_client RPC function to set advisor_id
-- First check if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_client') THEN
        -- Drop the existing function
        DROP FUNCTION IF EXISTS create_client;
    END IF;
END $$;

-- Create or replace the create_client function with advisor_id handling
CREATE OR REPLACE FUNCTION create_client(
    p_first_name TEXT,
    p_paternal_surname TEXT,
    p_maternal_surname TEXT,
    p_email TEXT,
    p_phone TEXT,
    p_company_id UUID,
    p_birth_date DATE DEFAULT NULL,
    p_rfc TEXT DEFAULT NULL,
    p_curp TEXT DEFAULT NULL,
    p_advisor_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_client_id UUID;
    v_advisor_id UUID := p_advisor_id;
BEGIN
    -- If advisor_id not provided, try to get it from the company
    IF v_advisor_id IS NULL AND p_company_id IS NOT NULL THEN
        SELECT advisor_id INTO v_advisor_id
        FROM companies
        WHERE id = p_company_id;
    END IF;
    
    -- Insert the new client
    INSERT INTO users (
        first_name, paternal_surname, maternal_surname, email, phone, 
        company_id, birth_date, rfc, curp, advisor_id, 
        is_sso_user, is_anonymous
    ) VALUES (
        p_first_name, p_paternal_surname, p_maternal_surname, p_email, p_phone,
        p_company_id, p_birth_date, p_rfc, p_curp, v_advisor_id,
        false, false
    )
    RETURNING id INTO v_client_id;
    
    RETURN v_client_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add a comment to confirm completion
COMMENT ON FUNCTION auto_assign_advisor_id_on_insert() IS 'Trigger function to automatically assign advisor_id from company to new users/clients'; 