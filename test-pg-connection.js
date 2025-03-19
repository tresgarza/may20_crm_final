const { Client } = require('pg');

// Try with the base supabase domain
const connectionString = 'postgresql://postgres:4AJMF92LU%23s98@ydnygntfkrleiseuciwq.supabase.co:5432/postgres';

const client = new Client({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

async function testConnection() {
  try {
    await client.connect();
    console.log('Successfully connected to Supabase PostgreSQL!');
    
    const res = await client.query('SELECT current_database() as db_name');
    console.log('Current database:', res.rows[0].db_name);
    
    return true;
  } catch (err) {
    console.error('Connection error:', err);
    return false;
  } finally {
    await client.end();
  }
}

testConnection(); 