const { Client } = require('pg');

const client = new Client({
  host: 'aws-0-us-west-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  user: 'postgres.ydnygntfkrleiseuciwq',
  password: '4AJMF92LU#s98',
  ssl: {
    rejectUnauthorized: false
  }
});

async function testConnection() {
  try {
    await client.connect();
    console.log('Connected to PostgreSQL successfully!');
    
    const res = await client.query('SELECT current_database() as db');
    console.log('Database:', res.rows[0].db);
    
    return true;
  } catch (err) {
    console.error('Connection error:', err);
    return false;
  } finally {
    await client.end();
  }
}

testConnection(); 