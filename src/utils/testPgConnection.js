const { Pool } = require('pg');

// PostgreSQL connection configuration with URL-encoded special characters
const pgConfig = {
  connectionString: 'postgresql://postgres:4AJMF92LU%23s98@db.ydnygntfkrleiseuciwq.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
};

// Create a connection pool
const pool = new Pool(pgConfig);

/**
 * Test the PostgreSQL connection
 */
async function testPgConnection() {
  let client;
  try {
    console.log('Attempting to connect to PostgreSQL...');
    client = await pool.connect();
    console.log('✅ PostgreSQL connection successful');
    
    // Test a simple query
    const result = await client.query('SELECT table_name FROM information_schema.tables WHERE table_schema = $1', ['public']);
    console.log(`Found ${result.rowCount} tables in the public schema:`);
    result.rows.forEach(row => {
      console.log(`- ${row.table_name}`);
    });
    
    return true;
  } catch (error) {
    console.error('❌ PostgreSQL connection failed:', error);
    return false;
  } finally {
    if (client) {
      client.release();
    }
    
    // Close the connection pool
    await pool.end();
    process.exit(0);
  }
}

// Run the test
testPgConnection(); 