import { getServiceClient } from '../lib/supabaseClient';

/**
 * Runs the auto_assign_advisor_id migration to fix the issue with clients 
 * appearing for companies but not for advisors
 */
export const runAdvisorIdMigration = async (): Promise<boolean> => {
  try {
    const serviceClient = getServiceClient();
    console.log('Running auto_assign_advisor_id migration...');
    
    // Instead of reading from a file, we include the SQL directly
    const migrationSQL = `
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
      END IF;
      
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    
    -- 2. Create the trigger if it doesn't exist
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'users_auto_assign_advisor_id_trigger'
      ) THEN
        CREATE TRIGGER users_auto_assign_advisor_id_trigger
        BEFORE INSERT ON users
        FOR EACH ROW
        EXECUTE FUNCTION auto_assign_advisor_id_on_insert();
      END IF;
    END;
    $$;
    
    -- 3. Create a function to sync existing users/clients
    CREATE OR REPLACE FUNCTION sync_client_advisor_ids()
    RETURNS INTEGER AS $$
    DECLARE
      updated_count INTEGER := 0;
    BEGIN
      -- Update existing users/clients where advisor_id is NULL but company_id is set
      UPDATE users
      SET advisor_id = c.advisor_id
      FROM companies c
      WHERE 
        users.company_id = c.id AND
        users.advisor_id IS NULL AND
        c.advisor_id IS NOT NULL;
        
      GET DIAGNOSTICS updated_count = ROW_COUNT;
      RETURN updated_count;
    END;
    $$ LANGUAGE plpgsql;
    
    -- 4. Run the sync function to update existing records
    SELECT sync_client_advisor_ids();
    `;
    
    // Execute the migration SQL
    const { error } = await serviceClient.rpc('execute_sql', { 
      sql: migrationSQL
    });
    
    if (error) {
      console.error('Failed to execute migration:', error);
      return false;
    }
    
    console.log('Auto assign advisor_id migration completed successfully');
    return true;
  } catch (error) {
    console.error('Failed to run migration:', error);
    return false;
  }
};

/**
 * Run all database migrations in sequence
 */
export const runAllMigrations = async (): Promise<boolean> => {
  try {
    console.log('Running all migrations...');
    
    // Add the advisor ID migration
    const advisorIdResult = await runAdvisorIdMigration();
    if (!advisorIdResult) {
      console.warn('Advisor ID migration failed or was skipped');
    }
    
    // Add additional migrations here as needed
    
    console.log('All migrations completed');
    return true;
  } catch (error) {
    console.error('Error running migrations:', error);
    return false;
  }
};

export default runAllMigrations; 