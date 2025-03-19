const { createClient } = require('@supabase/supabase-js');

// Supabase connection configuration from environment variables
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://ydnygntfkrleiseuciwq.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkbnlnbnRma3JsZWlzZXVjaXdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTAyODQ3OTcsImV4cCI6MjAyNTg2MDc5N30.yVRVbNrRMSrKZUkRLmMKOEY3n9tAf3nCi4FjXIkLV50';

// Direct PostgreSQL connection config with URL-encoded special characters
const pgConfig = {
  connectionString: process.env.REACT_APP_PG_CONNECTION_STRING || 'postgresql://postgres:4AJMF92LU%23s98@db.ydnygntfkrleiseuciwq.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
};

// Initialize the Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = {
  supabase,
  pgConfig
}; 