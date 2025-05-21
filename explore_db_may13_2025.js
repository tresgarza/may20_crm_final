const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Supabase connection details
const supabaseUrl = 'https://ydnygntfkrleiseuciwq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkbnlnbnRma3JsZWlzZXVjaXdxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTk5MjQwNiwiZXhwIjoyMDU1NTY4NDA2fQ.TwhEGW9DK4DTQQRquT6Z9UW8T8UjLX-hp9uKdRjWAhs';
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize results object
const dbInfo = {
  timestamp: new Date().toISOString(),
  tables: {}
};

async function exploreDatabase() {
  try {
    console.log('Connecting to Supabase...');

    // Direct check of dashboard-relevant tables
    const tablesToCheck = ['applications', 'clients', 'companies', 'advisors'];
    
    for (const table of tablesToCheck) {
      console.log(`\nChecking ${table} table...`);
      try {
        // Test if table exists with simple query
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
          
        if (error) {
          console.log(`Error accessing ${table} table:`, error.message);
          dbInfo.tables[table] = { exists: false, error: error.message };
        } else {
          console.log(`${table} table exists`);
          dbInfo.tables[table] = { exists: true };
          
          // For applications table, do deeper inspection
          if (table === 'applications') {
            await inspectApplicationsTable();
          }
          
          // For clients table
          if (table === 'clients') {
            await inspectClientsTable();
          }
          
          // For companies table
          if (table === 'companies') {
            await inspectCompaniesTable();
          }
          
          // For advisors table
          if (table === 'advisors') {
            await inspectAdvisorsTable();
          }
        }
      } catch (err) {
        console.error(`Error inspecting ${table} table:`, err);
        dbInfo.tables[table] = { exists: false, error: err.message };
      }
    }
    
    // Write results to file
    fs.writeFileSync(
      'db_schema_may13_2025.json', 
      JSON.stringify(dbInfo, null, 2)
    );
    console.log('\nDatabase exploration complete. Results saved to db_schema_may13_2025.json');
    
  } catch (error) {
    console.error('Error exploring database:', error);
  }
}

async function inspectApplicationsTable() {
  console.log('Inspecting applications table in detail...');
  
  // Check for sample records
  const { data: sampleApps, error: sampleError } = await supabase
    .from('applications')
    .select('*')
    .limit(5);
  
  if (!sampleError && sampleApps) {
    dbInfo.tables.applications.sampleData = sampleApps;
    console.log(`Retrieved ${sampleApps.length} sample applications`);
    
    // List all columns from the first record
    if (sampleApps.length > 0) {
      const columns = Object.keys(sampleApps[0]);
      dbInfo.tables.applications.columns = columns;
      console.log(`Columns: ${columns.join(', ')}`);
    }
  }
  
  // Check application_type values
  const { data: appTypes, error: typesError } = await supabase
    .from('applications')
    .select('application_type')
    .limit(100);
  
  if (!typesError && appTypes) {
    const uniqueTypes = [...new Set(appTypes.map(a => a.application_type).filter(Boolean))];
    dbInfo.tables.applications.applicationTypes = uniqueTypes;
    console.log(`Application types: ${uniqueTypes.join(', ')}`);
  }
  
  // Check status values
  const { data: statuses, error: statusesError } = await supabase
    .from('applications')
    .select('status')
    .limit(100);
  
  if (!statusesError && statuses) {
    const uniqueStatuses = [...new Set(statuses.map(a => a.status).filter(Boolean))];
    dbInfo.tables.applications.statusValues = uniqueStatuses;
    console.log(`Status values: ${uniqueStatuses.join(', ')}`);
  }
  
  // Check for deleted_at usage
  let deletedAtPresent = false;
  let deletedAtColumn = '';
  
  // First, check if we already know the column name from sample data
  if (dbInfo.tables.applications.columns) {
    const possibleNames = ['deleted_at', 'deletedAt', 'deleted'];
    deletedAtColumn = possibleNames.find(name => 
      dbInfo.tables.applications.columns.includes(name)
    );
    
    if (deletedAtColumn) {
      deletedAtPresent = true;
      console.log(`Found soft delete column: ${deletedAtColumn}`);
    }
  }
  
  // Test 'deleted_at' with query
  if (!deletedAtPresent) {
    const { data: deletedTest, error: deletedError } = await supabase
      .from('applications')
      .select('id')
      .is('deleted_at', null)
      .limit(1);
    
    if (!deletedError) {
      deletedAtPresent = true;
      deletedAtColumn = 'deleted_at';
      console.log('Confirmed deleted_at column exists');
    } else {
      // Try 'deletedAt'
      const { data: deletedAtTest, error: deletedAtError } = await supabase
        .from('applications')
        .select('id')
        .is('deletedAt', null)
        .limit(1);
      
      if (!deletedAtError) {
        deletedAtPresent = true;
        deletedAtColumn = 'deletedAt';
        console.log('Confirmed deletedAt column exists');
      }
    }
  }
  
  dbInfo.tables.applications.softDeleteColumn = deletedAtColumn;
  
  // Get 'selected_plans' applications count
  const { count: selectedPlansCount, error: countError } = await supabase
    .from('applications')
    .select('id', { count: 'exact', head: true })
    .eq('application_type', 'selected_plans')
    .is(deletedAtColumn || 'deleted_at', null);
  
  if (!countError) {
    dbInfo.tables.applications.selectedPlansCount = selectedPlansCount;
    console.log(`Count of 'selected_plans' applications: ${selectedPlansCount}`);
  }
  
  // Get status distribution for selected_plans
  if (selectedPlansCount > 0) {
    const { data: selectedApps, error: selectedError } = await supabase
      .from('applications')
      .select('status')
      .eq('application_type', 'selected_plans')
      .is(deletedAtColumn || 'deleted_at', null);
    
    if (!selectedError && selectedApps) {
      const statusCounts = {};
      selectedApps.forEach(app => {
        const status = app.status || 'unknown';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      
      dbInfo.tables.applications.statusDistribution = Object.entries(statusCounts).map(([status, count]) => ({
        status,
        count
      }));
      
      console.log('Status distribution:', dbInfo.tables.applications.statusDistribution);
      
      // Calculate amount distribution
      const { data: amountData, error: amountError } = await supabase
        .from('applications')
        .select('amount')
        .eq('application_type', 'selected_plans')
        .is(deletedAtColumn || 'deleted_at', null);
      
      if (!amountError && amountData) {
        const amounts = amountData.map(a => a.amount).filter(a => a !== null && !isNaN(a));
        
        if (amounts.length > 0) {
          const ranges = [
            { range: '0-10000', count: 0 },
            { range: '10001-25000', count: 0 },
            { range: '25001-50000', count: 0 },
            { range: '50001-75000', count: 0 },
            { range: '75001-100000', count: 0 }
          ];
          
          amounts.forEach(amount => {
            if (amount <= 10000) ranges[0].count++;
            else if (amount <= 25000) ranges[1].count++;
            else if (amount <= 50000) ranges[2].count++;
            else if (amount <= 75000) ranges[3].count++;
            else if (amount <= 100000) ranges[4].count++;
          });
          
          dbInfo.tables.applications.amountDistribution = ranges;
          dbInfo.tables.applications.amountStats = {
            min: Math.min(...amounts),
            max: Math.max(...amounts),
            avg: amounts.reduce((a, b) => a + b, 0) / amounts.length,
            count: amounts.length
          };
          
          console.log('Amount distribution:', ranges);
        } else {
          console.log('No valid amount values found');
        }
      }
    }
    
    // Get recent applications with client and company info
    const { data: recentApps, error: recentError } = await supabase
      .from('applications')
      .select(`
        id,
        created_at,
        status,
        amount,
        client_id,
        company_id
      `)
      .eq('application_type', 'selected_plans')
      .is(deletedAtColumn || 'deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (!recentError && recentApps && recentApps.length > 0) {
      dbInfo.tables.applications.recentApplications = recentApps;
      console.log(`Found ${recentApps.length} recent applications`);
      
      // Get client and company details for these applications
      const clientIds = recentApps.map(a => a.client_id).filter(Boolean);
      const companyIds = recentApps.map(a => a.company_id).filter(Boolean);
      
      if (clientIds.length > 0) {
        const { data: clients, error: clientsError } = await supabase
          .from('clients')
          .select('id, first_name, last_name, email')
          .in('id', clientIds);
        
        if (!clientsError && clients) {
          dbInfo.tables.applications.recentClientsData = clients;
        }
      }
      
      if (companyIds.length > 0) {
        const { data: companies, error: companiesError } = await supabase
          .from('companies')
          .select('id, name')
          .in('id', companyIds);
        
        if (!companiesError && companies) {
          dbInfo.tables.applications.recentCompaniesData = companies;
        }
      }
    }
  }
}

async function inspectClientsTable() {
  console.log('Inspecting clients table...');
  
  // Get sample clients
  const { data: sampleClients, error: sampleError } = await supabase
    .from('clients')
    .select('*')
    .limit(5);
  
  if (!sampleError && sampleClients) {
    dbInfo.tables.clients.sampleData = sampleClients;
    
    if (sampleClients.length > 0) {
      const columns = Object.keys(sampleClients[0]);
      dbInfo.tables.clients.columns = columns;
      console.log(`Client columns: ${columns.join(', ')}`);
    }
  }
  
  // Count total clients
  const { count: totalClients, error: countError } = await supabase
    .from('clients')
    .select('id', { count: 'exact', head: true });
  
  if (!countError) {
    dbInfo.tables.clients.totalCount = totalClients;
    console.log(`Total clients: ${totalClients}`);
  }
}

async function inspectCompaniesTable() {
  console.log('Inspecting companies table...');
  
  // Get sample companies
  const { data: sampleCompanies, error: sampleError } = await supabase
    .from('companies')
    .select('*')
    .limit(5);
  
  if (!sampleError && sampleCompanies) {
    dbInfo.tables.companies.sampleData = sampleCompanies;
    
    if (sampleCompanies.length > 0) {
      const columns = Object.keys(sampleCompanies[0]);
      dbInfo.tables.companies.columns = columns;
      console.log(`Company columns: ${columns.join(', ')}`);
    }
  }
}

async function inspectAdvisorsTable() {
  console.log('Inspecting advisors table...');
  
  // Get sample advisors
  const { data: sampleAdvisors, error: sampleError } = await supabase
    .from('advisors')
    .select('*')
    .limit(5);
  
  if (!sampleError && sampleAdvisors) {
    dbInfo.tables.advisors.sampleData = sampleAdvisors;
    
    if (sampleAdvisors.length > 0) {
      const columns = Object.keys(sampleAdvisors[0]);
      dbInfo.tables.advisors.columns = columns;
      console.log(`Advisor columns: ${columns.join(', ')}`);
    }
    
    // Total advisors
    const { count: totalAdvisors, error: countError } = await supabase
      .from('advisors')
      .select('id', { count: 'exact', head: true });
    
    if (!countError) {
      dbInfo.tables.advisors.totalCount = totalAdvisors;
      console.log(`Total advisors: ${totalAdvisors}`);
    }
  }
}

// Run the exploration
exploreDatabase(); 