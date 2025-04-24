const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ydnygntfkrleiseuciwq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkbnlnbnRma3JsZWlzZXVjaXdxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTk5MjQwNiwiZXhwIjoyMDU1NTY4NDA2fQ.TwhEGW9DK4DTQQRquT6Z9UW8T8UjLX-hp9uKdRjWAhs';
const supabase = createClient(supabaseUrl, supabaseKey);

// Function to check advisors table
async function checkAdvisorsTable() {
  console.log('Checking all advisors in the database...');
  const { data, error } = await supabase.from('advisors').select('id, name, email, access_code');
  
  if (error) {
    console.error('Error querying advisors:', error);
  } else {
    console.log('Total advisors found:', data.length);
    console.log('\nAll advisors access codes:');
    
    data.forEach(advisor => {
      console.log(`- ${advisor.name} (${advisor.email}): Access Code = "${advisor.access_code}"`);
    });
  }

  // Check company admins as well
  console.log('\n\nChecking all company admins in the database...');
  const { data: companyAdmins, error: companyAdminsError } = await supabase
    .from('company_admins')
    .select('id, name, email, access_code, company_id');
  
  if (companyAdminsError) {
    console.error('Error querying company admins:', companyAdminsError);
  } else {
    console.log('Total company admins found:', companyAdmins.length);
    console.log('\nAll company admin access codes:');
    
    companyAdmins.forEach(admin => {
      console.log(`- ${admin.name} (${admin.email}): Access Code = "${admin.access_code}", Company ID = ${admin.company_id}`);
    });
  }

  // Try the test login codes mentioned in Login.tsx
  console.log('\n\nTesting access codes mentioned in Login.tsx:');
  const testCodes = [
    { code: 'code123', type: 'advisor' },
    { code: 'admin123', type: 'company_admin' }
  ];

  for (const test of testCodes) {
    const table = test.type === 'advisor' ? 'advisors' : 'company_admins';
    console.log(`\nChecking for ${test.type} with access_code: ${test.code}...`);
    
    const { data: testData, error: testError } = await supabase
      .from(table)
      .select('*')
      .eq('access_code', test.code)
      .limit(1);
    
    if (testError) {
      console.error(`Error querying ${test.type} by access code:`, testError);
    } else {
      console.log(`${test.type} found with code:`, testData.length > 0);
      if (testData.length > 0) {
        console.log(`${test.type} details:`, { 
          id: testData[0].id, 
          email: testData[0].email,
          name: testData[0].name
        });
      }
    }
  }
}

// Run the check
checkAdvisorsTable(); 