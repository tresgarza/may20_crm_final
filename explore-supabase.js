const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ydnygntfkrleiseuciwq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkbnlnbnRma3JsZWlzZXVjaXdxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTk5MjQwNiwiZXhwIjoyMDU1NTY4NDA2fQ.TwhEGW9DK4DTQQRquT6Z9UW8T8UjLX-hp9uKdRjWAhs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function exploreDatabase() {
  console.log("=== SUPABASE DATABASE EXPLORATION ===");
  
  try {
    // 1. Get list of tables
    console.log("\n1. LISTING DATABASE TABLES");
    const { data: tables, error: tablesError } = await supabase.rpc('get_tables');
    
    if (tablesError) {
      console.error("Error getting tables:", tablesError);
      console.log("Trying alternative method to discover tables...");
      
      // Alternative: try to access known tables from our code exploration
      const knownTables = [
        'applications', 
        'users', 
        'advisors', 
        'companies', 
        'company_admins',
        'documents', 
        'application_history',
        'comments'
      ];
      
      for (const table of knownTables) {
        console.log(`\nChecking if table '${table}' exists:`);
        const { data, error, count } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          console.log(`- Table '${table}' error:`, error.message);
        } else {
          console.log(`- Table '${table}' exists with ${count} records`);
          
          // Get column info by fetching a sample row
          const { data: sampleRow, error: sampleError } = await supabase
            .from(table)
            .select('*')
            .limit(1);
            
          if (!sampleError && sampleRow && sampleRow.length > 0) {
            console.log(`  Columns: ${Object.keys(sampleRow[0]).join(', ')}`);
          }
        }
      }
    } else {
      console.log("Tables found:", tables);
    }
    
    // 2. Examine applications table in detail
    console.log("\n2. EXAMINING APPLICATIONS TABLE");
    const { data: applications, error: applicationsError } = await supabase
      .from('applications')
      .select('*')
      .limit(5);
    
    if (applicationsError) {
      console.error("Error accessing applications table:", applicationsError);
    } else {
      console.log(`Retrieved ${applications.length} applications`);
      if (applications.length > 0) {
        console.log("Application fields:", Object.keys(applications[0]).join(', '));
        console.log("Sample application:", JSON.stringify(applications[0], null, 2));
      }
    }
    
    // 3. Check relationships (application -> client)
    console.log("\n3. CHECKING RELATIONSHIPS");
    if (applications && applications.length > 0) {
      const sampleApp = applications[0];
      console.log(`Getting related client for application: ${sampleApp.id}`);
      
      if (sampleApp.client_id) {
        const { data: client, error: clientError } = await supabase
          .from('users')
          .select('*')
          .eq('id', sampleApp.client_id)
          .single();
        
        if (clientError) {
          console.error("Error getting related client:", clientError);
        } else {
          console.log("Related client found:", client ? "Yes" : "No");
          if (client) {
            console.log("Client fields:", Object.keys(client).join(', '));
          }
        }
      }
    }
    
    // 4. Look at other key tables
    console.log("\n4. EXAMINING OTHER KEY TABLES");
    const otherTables = ['advisors', 'companies', 'application_history'];
    
    for (const table of otherTables) {
      console.log(`\nTable: ${table}`);
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(2);
      
      if (error) {
        console.error(`Error accessing ${table}:`, error);
      } else {
        console.log(`Found ${data.length} records`);
        if (data.length > 0) {
          console.log(`Fields: ${Object.keys(data[0]).join(', ')}`);
        }
      }
    }
    
  } catch (error) {
    console.error("Exploration failed with error:", error);
  }
}

// Run the exploration
exploreDatabase()
  .then(() => console.log("\nExploration complete"))
  .catch(err => console.error("Unexpected error:", err)); 