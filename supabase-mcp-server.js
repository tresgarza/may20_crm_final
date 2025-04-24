const http = require('http');
const url = require('url');

console.log('Iniciando servidor MCP para Supabase...');

// Puerto en el que escuchará el servidor
const PORT = process.env.PORT || 3100;

// Middleware para CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '3600'
};

// Manejador para las solicitudes OPTIONS (preflight CORS)
const handleOptions = (res) => {
  res.writeHead(204, corsHeaders);
  res.end();
};

// Manejador para el endpoint de estado del servidor
const handleHealth = (res) => {
  res.writeHead(200, {
    ...corsHeaders,
    'Content-Type': 'application/json'
  });
  res.end(JSON.stringify({ status: 'ok', time: new Date().toISOString() }));
};

// Manejador para consultas SQL
const handleQuery = async (req, res) => {
  let body = '';
  
  req.on('data', (chunk) => {
    body += chunk.toString();
  });
  
  req.on('end', async () => {
    try {
      const { query } = JSON.parse(body);
      
      console.log('Ejecutando consulta:', query);
      
      // Simulamos una respuesta exitosa con datos de prueba
      const response = {
        data: [
          { id: 1, name: 'Cliente de prueba 1', status: 'active' },
          { id: 2, name: 'Cliente de prueba 2', status: 'inactive' }
        ],
        error: null
      };
      
      res.writeHead(200, {
        ...corsHeaders,
        'Content-Type': 'application/json'
      });
      res.end(JSON.stringify(response));
      
    } catch (error) {
      console.error('Error al procesar la consulta:', error);
      
      res.writeHead(500, {
        ...corsHeaders,
        'Content-Type': 'application/json'
      });
      res.end(JSON.stringify({
        error: error.message
      }));
    }
  });
};

// Manejador para consultas SQL específicas
const handleSqlQuery = async (req, res) => {
  let body = '';
  
  req.on('data', (chunk) => {
    body += chunk.toString();
  });
  
  req.on('end', async () => {
    try {
      const { query } = JSON.parse(body);
      
      console.log('Ejecutando consulta SQL:', query);
      
      // Respuesta por defecto
      let response = {
        data: [{ result: 'success' }],
        error: null
      };
      
      // Personalizar respuesta según el tipo de consulta
      if (query.toLowerCase().includes('count')) {
        response = {
          data: [{ count: 5 }],
          error: null
        };
      } else if (query.toLowerCase().includes('applications')) {
        response = {
          data: [
            { id: 'app1', client_name: 'Juan Pérez', status: 'pending', amount: 10000 },
            { id: 'app2', client_name: 'María García', status: 'approved', amount: 25000 },
            { id: 'app3', client_name: 'Carlos López', status: 'rejected', amount: 5000 }
          ],
          error: null
        };
      }
      
      res.writeHead(200, {
        ...corsHeaders,
        'Content-Type': 'application/json'
      });
      res.end(JSON.stringify(response));
      
    } catch (error) {
      console.error('Error al procesar la consulta SQL:', error);
      
      res.writeHead(500, {
        ...corsHeaders,
        'Content-Type': 'application/json'
      });
      res.end(JSON.stringify({
        error: error.message
      }));
    }
  });
};

// Manejador para listar proyectos
const handleListProjects = (res) => {
  const projects = [
    {
      id: 'ydnygntfkrleiseuciwq',
      name: 'Fincentiva CRM',
      organization_id: 'org_123456',
      region: 'us-east-1',
      status: 'active',
      database_url: 'https://ydnygntfkrleiseuciwq.supabase.co',
      created_at: '2023-01-01T00:00:00Z'
    }
  ];
  
  res.writeHead(200, {
    ...corsHeaders,
    'Content-Type': 'application/json'
  });
  res.end(JSON.stringify(projects));
};

// Manejador para obtener detalles de un proyecto
const handleGetProject = (res, projectId) => {
  const project = {
    id: projectId,
    name: 'Fincentiva CRM',
    organization_id: 'org_123456',
    region: 'us-east-1',
    status: 'active',
    database_url: 'https://ydnygntfkrleiseuciwq.supabase.co',
    created_at: '2023-01-01T00:00:00Z',
    api_key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkbnlnbnRma3JsZWlzZXVjaXdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk5OTI0MDYsImV4cCI6MjA1NTU2ODQwNn0.B-dH2Kptzz1oyM4ynno_GjlvjpxL-HbNKC_st4bgf0A'
  };
  
  res.writeHead(200, {
    ...corsHeaders,
    'Content-Type': 'application/json'
  });
  res.end(JSON.stringify(project));
};

// Manejador principal para las solicitudes
const handleRequest = async (req, res) => {
  console.log(`${req.method} ${req.url}`);
  
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  
  // Agregar encabezados CORS para todas las respuestas
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  
  // Manejar solicitudes OPTIONS (preflight CORS)
  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }
  
  // Rutas de la API
  try {
    if (path === '/health') {
      return handleHealth(res);
    } else if (path === '/query' && req.method === 'POST') {
      return handleQuery(req, res);
    } else if (path === '/sql' && req.method === 'POST') {
      return handleSqlQuery(req, res);
    } else if (path === '/api/projects' && req.method === 'GET') {
      return handleListProjects(res);
    } else if (path.startsWith('/api/projects/') && req.method === 'GET') {
      const projectId = path.split('/')[3];
      return handleGetProject(res, projectId);
    }
    
    // Ruta no encontrada
    res.writeHead(404, {
      ...corsHeaders,
      'Content-Type': 'application/json'
    });
    res.end(JSON.stringify({
      error: 'Ruta no encontrada'
    }));
  } catch (error) {
    console.error('Error al procesar la solicitud:', error);
    
    res.writeHead(500, {
      ...corsHeaders,
      'Content-Type': 'application/json'
    });
    res.end(JSON.stringify({
      error: error.message
    }));
  }
};

// Crear servidor HTTP
const server = http.createServer(handleRequest);

// Iniciar el servidor
server.listen(PORT, () => {
  console.log(`Escuchando en http://localhost:${PORT}`);
});

// Manejar señales de terminación
const handleShutdown = () => {
  console.log('Recibida señal SIGTERM, cerrando servidores...');
  server.close(() => {
    console.log('Servidor HTTP cerrado');
    process.exit(0);
  });
};

process.on('SIGTERM', handleShutdown);
process.on('SIGINT', handleShutdown); 