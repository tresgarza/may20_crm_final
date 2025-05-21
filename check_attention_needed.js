const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ydnygntfkrleiseuciwq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkbnlnbnRma3JsZWlzZXVjaXdxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTk5MjQwNiwiZXhwIjoyMDU1NTY4NDA2fQ.TwhEGW9DK4DTQQRquT6Z9UW8T8UjLX-hp9uKdRjWAhs';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log('Checking database schema for applications table...');
  
  // Query to get column information for the applications table
  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('Error querying applications:', error);
    return null;
  }
  
  if (!data || data.length === 0) {
    console.log('No application records found');
    return null;
  }
  
  const columns = Object.keys(data[0]);
  console.log('Available columns:', columns);
  
  // Look for columns that might track status changes
  const statusChangeColumns = columns.filter(col => 
    col.includes('status') && (col.includes('change') || col.includes('update') || col.includes('time') || col.includes('date'))
  );
  
  console.log('Potential status change columns:', statusChangeColumns);
  return columns;
}

async function checkAttentionNeeded() {
  const columns = await checkSchema();
  
  if (!columns) return;
  
  // First, let's get the most recent applications
  console.log('\nMost recent applications:');
  const { data: recentData, error: recentError } = await supabase
    .from('applications')
    .select('*')
    .limit(5)
    .order('created_at', { ascending: false });
  
  if (recentError) {
    console.error('Error querying recent applications:', recentError);
    return;
  }
  
  if (recentData && recentData.length > 0) {
    recentData.forEach(app => {
      console.log(`- ID: ${app.id}, Client: ${app.client_name || 'N/A'}, Status: ${app.status || 'N/A'}, Created: ${app.created_at}`);
      console.log('  All timestamps:', Object.entries(app)
        .filter(([key, value]) => key.includes('time') || key.includes('date') || key.includes('_at'))
        .map(([key, value]) => `${key}: ${value}`)
        .join(', '));
    });
  } else {
    console.log('No recent applications found.');
  }
  
  // Now let's attempt to find applications without status changes in the last 2 minutes
  // Assuming 'updated_at' might be tracking the last change
  const twoMinutesAgo = new Date(Date.now() - 120 * 1000).toISOString();
  
  console.log(`\nLooking for applications not updated since: ${twoMinutesAgo}`);
  
  if (columns.includes('updated_at')) {
    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .not('status', 'in', '("rejected","completed")')
      .lt('updated_at', twoMinutesAgo)
      .limit(10);
      
    if (error) {
      console.error('Error querying old applications:', error);
      return;
    }
    
    console.log(`Found ${data.length} applications potentially needing attention:`);
    
    if (data.length > 0) {
      data.forEach(app => {
        const updateTime = new Date(app.updated_at);
        const timeAgo = Math.round((Date.now() - updateTime.getTime()) / 1000);
        console.log(`- ID: ${app.id}, Client: ${app.client_name || 'N/A'}, Status: ${app.status || 'N/A'}, Last updated: ${timeAgo} seconds ago`);
      });
    } else {
      console.log('No applications found that need attention.');
    }
  } else {
    console.log('Could not find a suitable column to track status changes.');
  }
}

checkAttentionNeeded(); 