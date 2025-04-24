// Servidor MCP personalizado para Supabase
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');

// Ignorar errores de certificado SSL
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Configuración de conexión
const config = {
  user: 'postgres.ydnygntfkrleiseuciwq',
  password: '4AJMF92LUp98',
  host: 'aws-0-us-west-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  ssl: {
    rejectUnauthorized: false
  }
};

console.log('PostgreSQL connection config:', {
  user: config.user,
  host: config.host,
  port: config.port,
  database: config.database,
  ssl: !!config.ssl
});

const pool = new Pool(config);

// Verificar conexión inicial
pool.connect()
  .then(client => {
    console.log('✅ PostgreSQL connection successful');
    // Test query to verify connectivity
    return client.query('SELECT current_database() as db, current_user as user')
      .then(result => {
        console.log('Connection test result:', result.rows[0]);
        client.release();
      })
      .catch(err => {
        console.error('Error in test query:', err);
        client.release();
        process.exit(1);
      });
  })
  .catch(err => {
    console.error('❌ Error connecting to PostgreSQL:', err);
    process.exit(1);
  });

// Crear aplicación Express
const app = express();
const PORT = 3100;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Función para loguear y sanitizar queries
const logAndSanitizeQuery = (query) => {
  // Simple logging for debugging
  console.log(`📝 Query received: ${query}`);
  
  // Extremely basic sanitization - just to avoid obvious SQL injection
  // In a production app, you'd use parametrized queries
  const sanitized = query
    .replace(/--/g, '')
    .replace(/;/g, '');
    
  return sanitized;
};

// Endpoint para consultas
app.post('/query', async (req, res) => {
  const query = req.body.query;
  
  if (!query) {
    return res.status(400).json({
      error: 'Missing query parameter'
    });
  }
  
  const sanitizedQuery = logAndSanitizeQuery(query);
  console.log(`🔍 Executing query: ${sanitizedQuery}`);

  let client;
  try {
    client = await pool.connect();
    console.log('✅ Connected to database, executing query...');
    
    const startTime = Date.now();
    const result = await client.query(sanitizedQuery);
    const duration = Date.now() - startTime;
    
    console.log(`✅ Query executed successfully in ${duration}ms. Rows: ${result.rowCount}`);
    
    if (query.toLowerCase().includes('where access_code')) {
      console.log('Login query result rows:', result.rows.length);
      if (result.rows.length > 0) {
        console.log('Found user with access code:', { 
          id: result.rows[0].id,
          email: result.rows[0].email,
          name: result.rows[0].name 
        });
      } else {
        console.log('⚠️ No user found with the provided access code');
      }
    }
    
    return res.json({
      data: result.rows,
      metadata: {
        rowCount: result.rowCount,
        columns: result.fields.map(f => ({
          name: f.name,
          type: f.dataTypeID
        })),
        duration
      }
    });
  } catch (error) {
    console.error(`❌ Query error: ${error.message}`);
    console.error('Error details:', error);
    
    return res.status(500).json({
      error: error.message,
      code: error.code,
      position: error.position,
      detail: error.detail
    });
  } finally {
    if (client) client.release();
  }
});

// Endpoint para verificar estado
app.get('/ping', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    database: config.database,
    host: config.host
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 MCP Server running on port ${PORT}`);
  console.log(`🔗 Database connection: ${config.user}@${config.host}:${config.port}/${config.database}`);
  console.log(`ℹ️ Endpoints:`);
  console.log(`   - POST /query: Execute SQL queries`);
  console.log(`   - GET /ping: Check server status`);
}); 