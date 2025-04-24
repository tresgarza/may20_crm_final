const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://ydnygntfkrleiseuciwq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkbnlnbnRma3JsZWlzZXVjaXdxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTk5MjQwNiwiZXhwIjoyMDU1NTY4NDA2fQ.TwhEGW9DK4DTQQRquT6Z9UW8T8UjLX-hp9uKdRjWAhs';

// Crear cliente Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

async function listCommonTables() {
  try {
    console.log('Intentando listar tablas comunes en aplicaciones...');
    
    // Lista de tablas comunes en aplicaciones
    const commonTables = [
      'applications',
      'users',
      'clients',
      'companies',
      'advisors',
      'application_history',
      'documents',
      'notifications',
      'profiles',
      'auth.users',
      'auth.identities',
      'storage.buckets',
      'storage.objects',
      'client',
      'company',
      'application'
    ];
    
    // Verificar qué tablas existen
    const existingTables = [];
    const errors = [];
    
    console.log('Verificando tablas...');
    
    for (const tableName of commonTables) {
      try {
        console.log(`Probando tabla: ${tableName}`);
        const { error } = await supabase
          .from(tableName)
          .select('count')
          .limit(1);
        
        if (!error) {
          console.log(`✅ Tabla encontrada: ${tableName}`);
          existingTables.push(tableName);
        } else {
          console.log(`❌ Error en tabla ${tableName}: ${error.message}`);
          errors.push({ table: tableName, error: error.message });
        }
      } catch (err) {
        console.log(`❌ Excepción en tabla ${tableName}: ${err.message}`);
        errors.push({ table: tableName, error: err.message });
      }
    }
    
    console.log('\nResultados:');
    console.log('Tablas encontradas:');
    if (existingTables.length > 0) {
      existingTables.forEach(table => {
        console.log(`- ${table}`);
      });
    } else {
      console.log('No se detectaron tablas de la lista común');
    }
    
    console.log('\nDetalles de errores:');
    errors.forEach(({ table, error }) => {
      console.log(`- ${table}: ${error}`);
    });
  } catch (err) {
    console.error('Error general:', err);
  }
}

// Función para consultar una tabla específica (si se proporciona como argumento)
async function queryTable(tableName) {
  try {
    console.log(`Consultando datos de la tabla "${tableName}"...`);
    
    // Consultar hasta 10 filas de la tabla
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(10);
    
    if (error) {
      console.error(`Error al consultar la tabla ${tableName}:`, error);
      return;
    }
    
    // Mostrar resultados
    console.log(`Resultados de la tabla "${tableName}":`);
    if (data && data.length > 0) {
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log('No se encontraron registros');
    }
  } catch (err) {
    console.error('Error en la consulta:', err);
  }
}

// Verificar conexión
async function checkConnection() {
  try {
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error de conexión:', error);
      return false;
    }
    
    console.log('Conexión a Supabase establecida correctamente');
    return true;
  } catch (err) {
    console.error('Error al verificar conexión:', err);
    return false;
  }
}

// Proceso principal
async function main() {
  const isConnected = await checkConnection();
  
  if (!isConnected) {
    console.error('No se pudo establecer conexión con Supabase');
    return;
  }
  
  // Verificar si se proporcionó un nombre de tabla como argumento
  const tableName = process.argv[2];
  
  if (tableName) {
    await queryTable(tableName);
  } else {
    await listCommonTables();
  }
}

// Ejecutar
main()
  .catch(err => {
    console.error('Error inesperado:', err);
  })
  .finally(() => {
    console.log('Consulta finalizada');
  }); 