// Script para aplicar migración SQL a Supabase
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuración de Supabase
const supabaseUrl = 'https://ydnygntfkrleiseuciwq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkbnlnbnRma3JsZWlzZXVjaXdxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTk5MjQwNiwiZXhwIjoyMDU1NTY4NDA2fQ.TwhEGW9DK4DTQQRquT6Z9UW8T8UjLX-hp9uKdRjWAhs'; // Usar la service_role key

// Crear cliente Supabase
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
  },
  global: {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  },
});

// Leer el archivo SQL
const sqlFilePath = path.join(__dirname, 'src', 'migrations', 'fix_document_upload.sql');
console.log(`Leyendo archivo SQL: ${sqlFilePath}`);

try {
  const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
  console.log('Contenido SQL leído correctamente.');
  
  console.log('Ejecutando SQL en Supabase...');
  
  // Ejecutar la consulta SQL
  supabase.rpc('execute_sql', { query_text: sqlContent })
    .then(({ data, error }) => {
      if (error) {
        console.error('Error ejecutando SQL:', error);
        
        // Plan alternativo: ejecutar declaraciones individuales
        console.log('Intentando con método alternativo...');
        supabase.rpc('exec_sql', { sql: sqlContent })
          .then(({ data, error }) => {
            if (error) {
              console.error('Error con método alternativo:', error);
              
              // Último intento: intentar usar SQL directo (postgrest)
              console.log('Último intento: usar POST a /rest/v1/rpc/execute_sql...');
              
              fetch(`${supabaseUrl}/rest/v1/rpc/execute_sql`, {
                method: 'POST',
                headers: {
                  'apikey': supabaseKey,
                  'Authorization': `Bearer ${supabaseKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query_text: sqlContent }),
              })
                .then(response => response.json())
                .then(result => {
                  if (result.error) {
                    console.error('Error en el último intento:', result.error);
                    console.log('Por favor, ejecute el SQL manualmente en la consola de Supabase SQL.');
                  } else {
                    console.log('SQL ejecutado correctamente mediante fetch.');
                    console.log(result);
                  }
                })
                .catch(fetchError => {
                  console.error('Error de fetch:', fetchError);
                  console.log('Por favor, ejecute el SQL manualmente en la consola de Supabase SQL.');
                });
            } else {
              console.log('SQL ejecutado correctamente con método alternativo.');
              console.log(data);
            }
          });
      } else {
        console.log('SQL ejecutado correctamente.');
        console.log(data);
      }
    });
} catch (err) {
  console.error('Error leyendo o ejecutando el SQL:', err);
} 