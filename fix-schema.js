const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role key (for admin access)
const supabaseUrl = 'https://ydnygntfkrleiseuciwq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkbnlnbnRma3JsZWlzZXVjaXdxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTk5MjQwNiwiZXhwIjoyMDU1NTY4NDA2fQ.TwhEGW9DK4DTQQRquT6Z9UW8T8UjLX-hp9uKdRjWAhs';
const supabase = createClient(supabaseUrl, supabaseKey);

async function executeQuery(query) {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey
      },
      body: JSON.stringify({ query })
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`SQL Error: ${errorData}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error executing query:', error);
    throw error;
  }
}

async function fixSchema() {
  try {
    console.log('Checking and fixing application_history table schema...');
    
    // 1. Check if application_history table exists
    const { data: tableExists, error: tableError } = await supabase
      .from('application_history')
      .select('id')
      .limit(1)
      .maybeSingle();
    
    if (tableError && tableError.code === 'PGRST204') {
      console.log('application_history table does not exist, creating it...');
      
      // Create the table if it doesn't exist
      await supabase.rpc('exec_sql', {
        query: `
          CREATE TABLE IF NOT EXISTS public.application_history (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            application_id UUID NOT NULL,
            status VARCHAR(50),
            changed_by UUID,
            changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            notes TEXT,
            action VARCHAR(50),
            previous_status VARCHAR(50),
            rejected_by_entity VARCHAR(50),
            CONSTRAINT fk_application
              FOREIGN KEY (application_id)
              REFERENCES public.applications(id)
              ON DELETE CASCADE
          );
        `
      });
      
      console.log('application_history table created successfully');
    } else {
      console.log('application_history table exists, checking columns...');
      
      // 2. Check if changed_at column exists
      const { data: columnExists, error: columnError } = await supabase.rpc('exec_sql', {
        query: `
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'application_history' 
          AND column_name = 'changed_at'
        `
      });
      
      if (columnError || !columnExists || columnExists.length === 0) {
        console.log('changed_at column does not exist, adding it...');
        
        // Add the missing column
        await supabase.rpc('exec_sql', {
          query: `
            ALTER TABLE public.application_history 
            ADD COLUMN IF NOT EXISTS changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
          `
        });
        
        console.log('changed_at column added successfully');
      } else {
        console.log('changed_at column already exists');
      }
      
      // 3. Check if rejected_by_entity column exists
      const { data: rejectedColumnExists, error: rejectedColumnError } = await supabase.rpc('exec_sql', {
        query: `
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'application_history' 
          AND column_name = 'rejected_by_entity'
        `
      });
      
      if (rejectedColumnError || !rejectedColumnExists || rejectedColumnExists.length === 0) {
        console.log('rejected_by_entity column does not exist, adding it...');
        
        // Add the rejection tracking column
        await supabase.rpc('exec_sql', {
          query: `
            ALTER TABLE public.application_history 
            ADD COLUMN IF NOT EXISTS rejected_by_entity VARCHAR(50);
          `
        });
        
        console.log('rejected_by_entity column added successfully');
      } else {
        console.log('rejected_by_entity column already exists');
      }
    }
    
    // 4. Verify the changes
    const { data: finalColumns, error: finalError } = await supabase.rpc('exec_sql', {
      query: `
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'application_history'
        ORDER BY column_name
      `
    });
    
    if (finalError) {
      console.error('Error verifying changes:', finalError);
    } else {
      console.log('Final table structure:', finalColumns);
      console.log('Schema fix completed successfully');
    }
    
  } catch (error) {
    console.error('Error fixing schema:', error);
  }
}

// Run the schema fix
fixSchema(); 