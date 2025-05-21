const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = 'https://ydnygntfkrleiseuciwq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkbnlnbnRma3JsZWlzZXVjaXdxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTk5MjQwNiwiZXhwIjoyMDU1NTY4NDA2fQ.TwhEGW9DK4DTQQRquT6Z9UW8T8UjLX-hp9uKdRjWAhs';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  try {
    console.log('Checking application_history table schema...');
    
    // Query to check table structure
    const { data: columns, error: columnsError } = await supabase.rpc('check_table_structure', {
      table_name: 'application_history'
    });
    
    if (columnsError) {
      console.error('Error checking table structure via RPC:', columnsError);
      
      // Fallback: Use raw SQL query to check the table structure
      const { data: tableInfo, error: tableError } = await supabase.from('_postgrest_temp_schema_checks').select('*').execute(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'application_history'
      `);
      
      if (tableError) {
        console.error('Error with fallback check:', tableError);
        
        // Try direct SQL
        const { data, error } = await supabase.rpc('exec_sql', {
          query: `
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'application_history'
          `
        });
        
        if (error) {
          console.error('Final attempt failed:', error);
        } else {
          console.log('Table columns:', data);
        }
      } else {
        console.log('Table columns:', tableInfo);
      }
    } else {
      console.log('Table columns:', columns);
    }
    
    // Also check if the table exists
    const { data, error } = await supabase
      .from('application_history')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('Error checking application_history table:', error);
    } else {
      console.log('The application_history table exists and is accessible');
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkSchema(); 