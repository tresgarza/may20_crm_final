const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');

// Initialize Supabase client with service role key
const supabaseUrl = 'https://ydnygntfkrleiseuciwq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkbnlnbnRma3JsZWlzZXVjaXdxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTk5MjQwNiwiZXhwIjoyMDU1NTY4NDA2fQ.TwhEGW9DK4DTQQRquT6Z9UW8T8UjLX-hp9uKdRjWAhs';
const supabase = createClient(supabaseUrl, supabaseKey);

// PostgreSQL connection
const pool = new Pool({
  host: 'db.ydnygntfkrleiseuciwq.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: '4AJMF92LUp98',
  ssl: {
    rejectUnauthorized: false
  }
});

async function updateDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('Starting database update...');
    
    // Start a transaction
    await client.query('BEGIN');
    
    // 1. Add rejection columns to applications table
    console.log('Adding rejection tracking columns to applications table...');
    
    try {
      await client.query(`
        ALTER TABLE applications 
        ADD COLUMN IF NOT EXISTS rejected_by_advisor BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS rejected_by_company BOOLEAN DEFAULT FALSE;
      `);
      console.log('Rejection tracking columns added successfully');
    } catch (error) {
      console.error('Error adding rejection columns:', error.message);
      throw error;
    }
    
    // 2. Set rejections based on current status
    console.log('Setting rejection flags for existing rejected applications...');
    
    try {
      // Get all rejected applications
      const rejectedResult = await client.query(`
        SELECT id, advisor_status, company_status, status, 
               approved_by_advisor, approved_by_company
        FROM applications
        WHERE status = 'rejected';
      `);
      
      const rejectedApps = rejectedResult.rows;
      console.log(`Found ${rejectedApps.length} rejected applications`);
      
      // Update each rejected application
      for (const app of rejectedApps) {
        let rejected_by_advisor = false;
        let rejected_by_company = false;
        
        // Infer who rejected based on approval status
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
        
        // Update the application
        await client.query(`
          UPDATE applications
          SET rejected_by_advisor = $1, rejected_by_company = $2
          WHERE id = $3;
        `, [rejected_by_advisor, rejected_by_company, app.id]);
        
        console.log(`Set rejection flags for application ${app.id}: advisor=${rejected_by_advisor}, company=${rejected_by_company}`);
      }
    } catch (error) {
      console.error('Error updating rejected applications:', error.message);
      throw error;
    }
    
    // Add changed_at column to application_history if it doesn't exist
    console.log('Ensuring application_history table has the required fields...');
    
    try {
      await client.query(`
        ALTER TABLE IF EXISTS application_history 
        ADD COLUMN IF NOT EXISTS changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS rejected_by_entity VARCHAR(50);
      `);
      console.log('application_history columns added successfully');
    } catch (error) {
      console.error('Error adding application_history columns:', error.message);
      throw error;
    }
    
    // Commit the transaction
    await client.query('COMMIT');
    console.log('Database update completed successfully');
    
  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    console.error('Database update failed, changes rolled back:', error.message);
  } finally {
    // Release the client
    client.release();
    
    // Close the pool to end the script
    await pool.end();
  }
}

// Install pg if needed
try {
  require('pg');
  updateDatabase();
} catch (error) {
  console.log('Installing pg package...');
  const { execSync } = require('child_process');
  execSync('npm install pg', { stdio: 'inherit' });
  
  // Now run the update
  updateDatabase();
} 