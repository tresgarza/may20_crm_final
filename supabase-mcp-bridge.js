// This is a custom bridge between MCP and Supabase
// Install dependencies: npm install @supabase/supabase-js pg

const { createClient } = require('@supabase/supabase-js');
const { MCPServer } = require('@modelcontextprotocol/server');

// Supabase credentials
const supabaseUrl = process.env.SUPABASE_URL || 'https://ydnygntfkrleiseuciwq.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkbnlnbnRma3JsZWlzZXVjaXdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk5OTI0MDYsImV4cCI6MjA1NTU2ODQwNn0.B-dH2Kptzz1oyM4ynno_GjlvjpxL-HbNKC_st4bgf0A';

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Create MCP server
const server = new MCPServer({
  name: 'supabase',
  methods: {
    // SQL query method
    query: async ({ sql }) => {
      try {
        console.log('Executing SQL:', sql);
        const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
        
        if (error) {
          console.error('SQL execution error:', error);
          throw error;
        }
        
        return data;
      } catch (error) {
        console.error('Error executing query:', error);
        throw error;
      }
    }
  }
});

// Start the server
server.start().then(() => {
  console.log('Supabase MCP bridge is running');
}).catch(error => {
  console.error('Failed to start MCP server:', error);
}); 