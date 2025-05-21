const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role key (for admin access)
const supabaseUrl = 'https://ydnygntfkrleiseuciwq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkbnlnbnRma3JsZWlzZXVjaXdxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTk5MjQwNiwiZXhwIjoyMDU1NTY4NDA2fQ.TwhEGW9DK4DTQQRquT6Z9UW8T8UjLX-hp9uKdRjWAhs';
const supabase = createClient(supabaseUrl, supabaseKey);

async function updateDatabase() {
  try {
    console.log('Starting database update...');
    
    // 1. Add rejected_by_advisor and rejected_by_company columns to applications table
    console.log('Adding rejection tracking columns to applications table...');
    
    const { error: rejectionColumnsError } = await supabase.rpc('execute_sql', {
      query: `
        ALTER TABLE applications 
        ADD COLUMN IF NOT EXISTS rejected_by_advisor BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS rejected_by_company BOOLEAN DEFAULT FALSE;
      `
    });
    
    if (rejectionColumnsError) {
      console.error('Error adding rejection columns:', rejectionColumnsError);
    } else {
      console.log('Rejection tracking columns added successfully');
    }
    
    // 2. Set rejections based on current status
    console.log('Setting rejection flags for existing rejected applications...');
    
    const { data: rejectedApps, error: fetchError } = await supabase
      .from('applications')
      .select('id, advisor_status, company_status, status, approved_by_advisor, approved_by_company')
      .eq('status', 'rejected');
    
    if (fetchError) {
      console.error('Error fetching rejected applications:', fetchError);
    } else {
      console.log(`Found ${rejectedApps ? rejectedApps.length : 0} rejected applications`);
      
      // For each rejected application, infer who rejected it
      if (rejectedApps && rejectedApps.length > 0) {
        for (const app of rejectedApps) {
          let rejected_by_advisor = false;
          let rejected_by_company = false;
          
          // Try to infer who rejected based on approval status
          if (app.approved_by_advisor && !app.approved_by_company) {
            // If advisor approved but company didn't, company rejected
            rejected_by_company = true;
          } else if (app.approved_by_company && !app.approved_by_advisor) {
            // If company approved but advisor didn't, advisor rejected
            rejected_by_advisor = true;
          } else if (app.advisor_status === 'rejected' && app.company_status !== 'rejected') {
            // If advisor status is rejected, advisor rejected
            rejected_by_advisor = true;
          } else if (app.company_status === 'rejected' && app.advisor_status !== 'rejected') {
            // If company status is rejected, company rejected
            rejected_by_company = true;
          } else {
            // Default to company rejection if we can't tell
            rejected_by_company = true;
          }
          
          // Update the application with the inferred rejection flags
          const { error: updateError } = await supabase
            .from('applications')
            .update({
              rejected_by_advisor,
              rejected_by_company
            })
            .eq('id', app.id);
          
          if (updateError) {
            console.error(`Error updating rejection flags for application ${app.id}:`, updateError);
          } else {
            console.log(`Set rejection flags for application ${app.id}: advisor=${rejected_by_advisor}, company=${rejected_by_company}`);
          }
        }
      }
    }
    
    // 3. Final verification
    console.log('Database update completed successfully');
    
  } catch (error) {
    console.error('Error updating database:', error);
  }
}

// Run the update
updateDatabase(); 