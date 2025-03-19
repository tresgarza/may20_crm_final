const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');

// Supabase credentials
const supabaseUrl = 'https://ydnygntfkrleiseuciwq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkbnlnbnRma3JsZWlzZXVjaXdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk5OTI0MDYsImV4cCI6MjA1NTU2ODQwNn0.B-dH2Kptzz1oyM4ynno_GjlvjpxL-HbNKC_st4bgf0A';

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Ignorar errores de certificado
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Configuración de la conexión
const pool = new Pool({
  user: 'postgres.ydnygntfkrleiseuciwq',
  password: '4AJMF92LUp98',
  host: 'aws-0-us-west-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  ssl: {
    rejectUnauthorized: false
  }
});

async function testSupabase() {
  try {
    console.log('Testing Supabase connection...');
    
    // Query public schema tables
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .limit(5);
    
    if (tablesError) {
      console.error('Error fetching tables:', tablesError);
    } else {
      console.log('Tables in public schema:', tables);
    }
    
    // Try a direct RPC call
    console.log('Trying to fetch advisors table data...');
    const { data, error } = await supabase
      .from('advisors')
      .select('*')
      .limit(3);
    
    if (error) {
      console.error('Error fetching advisors:', error);
    } else {
      console.log('Advisors data:', data);
      console.log('✅ Successfully connected to Supabase!');
    }
  } catch (error) {
    console.error('General error:', error);
  }
}

async function testConnection() {
  let client;
  try {
    console.log('Conectando a Supabase...');
    client = await pool.connect();

    console.log('Ejecutando consulta...');
    const result = await client.query('SELECT current_database(), current_user');
    
    console.log('Resultado:', result.rows[0]);
    return result.rows[0];
  } catch (err) {
    console.error('Error al conectar a Supabase:', err);
  } finally {
    if (client) {
      client.release();
    }
    // Cerrar el pool
    await pool.end();
  }
}

// Ejecutar la prueba
testSupabase();
testConnection(); 