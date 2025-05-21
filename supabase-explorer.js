const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://jzxzltxzpabdvdbwfpfl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6eHpsdHh6cGFiZHZkYndmcGZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTExMDY3MDcsImV4cCI6MjAyNjY4MjcwN30.HG-MsaM8CuYH83mSNvTwVVKLSjegvIRZPE2K3Oqn-0w';
const supabase = createClient(supabaseUrl, supabaseKey);

async function exploreDatabase() {
  console.log("\n--- Explorando tablas de la base de datos ---");
  
  try {
    // 1. Listar tablas
    console.log("\n1. Listando tablas:");
    const { data: tables, error: tablesError } = await supabase
      .from('pg_catalog.pg_tables')
      .select('schemaname, tablename')
      .eq('schemaname', 'public');
    
    if (tablesError) {
      console.log("Error al listar tablas:", tablesError);
      
      // Plan B: Intentar obtener tablas conocidas directamente
      console.log("\nProbando tablas conocidas...");
      await checkTableExists('applications');
      await checkTableExists('users');
      await checkTableExists('application_history');
      await checkTableExists('comments');
      await checkTableExists('documents');
      await checkTableExists('companies');
    } else {
      console.log("Tablas encontradas:", tables);
      
      // Explorar estructura de cada tabla encontrada
      for (const table of tables) {
        await exploreTableStructure(table.tablename);
      }
    }
    
    // 2. Explorar aplicaciones
    console.log("\n2. Explorando aplicaciones:");
    const { data: applications, error: applicationsError } = await supabase
      .from('applications')
      .select('*')
      .limit(5);
    
    if (applicationsError) {
      console.log("Error al obtener aplicaciones:", applicationsError);
    } else {
      console.log(`Encontradas ${applications.length} aplicaciones`);
      if (applications.length > 0) {
        console.log("Campos de una aplicación:", Object.keys(applications[0]));
        console.log("Ejemplo de aplicación:", applications[0]);
      }
    }
    
    // 3. Explorar usuarios
    console.log("\n3. Explorando usuarios:");
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(5);
    
    if (usersError) {
      console.log("Error al obtener usuarios:", usersError);
    } else {
      console.log(`Encontrados ${users.length} usuarios`);
      if (users.length > 0) {
        console.log("Campos de un usuario:", Object.keys(users[0]));
      }
    }
    
    // 4. Intentar obtener relaciones entre tablas (ejemplo con aplicaciones y usuarios)
    console.log("\n4. Explorando relaciones:");
    if (applications && applications.length > 0) {
      const appId = applications[0].id;
      console.log(`Buscando relaciones para la aplicación con ID: ${appId}`);
      
      // Buscar datos relacionados (ejemplo con aplicaciones y usuarios)
      if (applications[0].client_id) {
        const { data: relatedUser, error: relatedUserError } = await supabase
          .from('users')
          .select('*')
          .eq('id', applications[0].client_id)
          .single();
        
        if (relatedUserError) {
          console.log("Error al obtener usuario relacionado:", relatedUserError);
        } else {
          console.log("Usuario relacionado encontrado:", relatedUser ? "Sí" : "No");
        }
      }
      
      // Buscar historial de la aplicación
      const { data: history, error: historyError } = await supabase
        .from('application_history')
        .select('*')
        .eq('application_id', appId);
      
      if (historyError) {
        console.log("Error al obtener historial:", historyError);
      } else {
        console.log(`Encontrados ${history ? history.length : 0} registros de historial`);
      }
      
      // Buscar documentos de la aplicación
      const { data: docs, error: docsError } = await supabase
        .from('documents')
        .select('*')
        .eq('application_id', appId);
      
      if (docsError) {
        console.log("Error al obtener documentos:", docsError);
      } else {
        console.log(`Encontrados ${docs ? docs.length : 0} documentos`);
      }
    }
    
  } catch (error) {
    console.error("Error general:", error);
  }
  
  console.log("\nExploración completada");
}

async function checkTableExists(tableName) {
  try {
    const { data, error, count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.log(`Tabla '${tableName}' - Error:`, error.message);
      return false;
    } else {
      console.log(`Tabla '${tableName}' existe (${count} registros)`);
      return true;
    }
  } catch (error) {
    console.log(`Error al verificar tabla '${tableName}':`, error.message);
    return false;
  }
}

async function exploreTableStructure(tableName) {
  console.log(`\nExplorando estructura de tabla: ${tableName}`);
  try {
    // Obtener un registro para ver la estructura
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (error) {
      console.log(`Error al explorar '${tableName}':`, error);
    } else if (data && data.length > 0) {
      console.log(`Campos de '${tableName}':`, Object.keys(data[0]));
    } else {
      console.log(`La tabla '${tableName}' existe pero está vacía`);
    }
  } catch (error) {
    console.log(`Error general explorando '${tableName}':`, error);
  }
}

// Ejecutar la exploración
exploreDatabase(); 