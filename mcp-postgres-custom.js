// Servidor MCP personalizado para Supabase
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');

// Ignorar errores de certificado SSL
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Configuración de conexión
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

// Verificar conexión inicial
pool.connect()
  .then(client => {
    console.log('✅ PostgreSQL connection successful');
    client.release();
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

// Endpoint para consultas
app.post('/query', async (req, res) => {
  const query = req.body.query;
  
  console.log(`📝 Query received: ${query}`);
  
  if (!query) {
    return res.status(400).json({
      error: 'Missing query parameter'
    });
  }

  let client;
  try {
    client = await pool.connect();
    const result = await client.query(query);
    
    console.log(`✅ Query executed successfully. Rows: ${result.rowCount}`);
    
    return res.json({
      data: result.rows,
      metadata: {
        rowCount: result.rowCount,
        columns: result.fields.map(f => ({
          name: f.name,
          type: f.dataTypeID
        }))
      }
    });
  } catch (error) {
    console.error(`❌ Query error: ${error.message}`);
    
    return res.status(500).json({
      error: error.message,
      code: error.code,
      position: error.position
    });
  } finally {
    if (client) client.release();
  }
});

// Endpoint para verificar estado
app.get('/ping', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 MCP Server running on port ${PORT}`);
  console.log(`🔗 Database connection: postgres.ydnygntfkrleiseuciwq@aws-0-us-west-1.pooler.supabase.com:6543/postgres`);
  console.log(`ℹ️ Endpoints:`);
  console.log(`   - POST /query: Execute SQL queries`);
  console.log(`   - GET /ping: Check server status`);
}); 