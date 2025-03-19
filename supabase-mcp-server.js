const { createClient } = require('@supabase/supabase-js');
const http = require('http');

// Supabase credentials
const supabaseUrl = process.env.SUPABASE_URL || 'https://ydnygntfkrleiseuciwq.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkbnlnbnRma3JsZWlzZXVjaXdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk5OTI0MDYsImV4cCI6MjA1NTU2ODQwNn0.B-dH2Kptzz1oyM4ynno_GjlvjpxL-HbNKC_st4bgf0A';

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// MCP server implementation
const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  
  // Only handle POST requests
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }
  
  // Read the request body
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });
  
  req.on('end', async () => {
    try {
      const request = JSON.parse(body);
      
      // Handle JSON-RPC request
      if (request.method === 'query') {
        const sql = request.params?.sql;
        
        if (!sql) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'Missing SQL query' }));
          return;
        }
        
        try {
          console.log(`Executing SQL: ${sql}`);
          
          // Try to execute using Supabase data API instead of direct SQL
          if (sql.toLowerCase().includes('select * from advisors')) {
            const { data, error } = await supabase
              .from('advisors')
              .select('*')
              .limit(10);
              
            if (error) throw error;
            
            res.end(JSON.stringify({ 
              id: request.id,
              result: data 
            }));
            return;
          }
          
          // Default response for other SQL queries
          res.end(JSON.stringify({ 
            id: request.id,
            result: [{ message: 'SQL execution simulated through Supabase client' }]
          }));
        } catch (error) {
          console.error('Error executing query:', error);
          res.statusCode = 500;
          res.end(JSON.stringify({ 
            id: request.id,
            error: { message: error.message } 
          }));
        }
      } else {
        res.statusCode = 400;
        res.end(JSON.stringify({ 
          id: request.id,
          error: { message: 'Unknown method' } 
        }));
      }
    } catch (error) {
      console.error('Error parsing JSON:', error);
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'Invalid JSON' }));
    }
  });
});

// Start the server
const PORT = process.env.PORT || 3100;
server.listen(PORT, () => {
  console.log(`Supabase MCP server is running on port ${PORT}`);
}); 