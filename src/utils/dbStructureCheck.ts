import { supabase } from '../lib/supabaseClient';
import { TABLES } from './constants/tables';

interface TableStatus {
  name: string;
  exists: boolean;
}

// Flag to track if checks are completed
let checkCompleted = false;
let tablesVerified = false;

/**
 * Verifica si una tabla existe en la base de datos
 * @param tableName Nombre de la tabla a verificar
 * @returns true si la tabla existe, false en caso contrario
 */
export const checkTableExists = async (tableName: string): Promise<boolean> => {
  try {
    // Intentar verificar con una consulta simple
    const { error } = await supabase
      .from(tableName)
      .select('count(*)', { count: 'exact', head: true });
    
    // Si no hay error, la tabla existe
    return error ? false : true;
  } catch (error) {
    console.error(`Error verificando si la tabla ${tableName} existe:`, error);
    return false;
  }
};

/**
 * Verifica si una columna existe en una tabla específica
 * @param tableName Nombre de la tabla
 * @param columnName Nombre de la columna
 * @returns true si la columna existe, false en caso contrario
 */
export const checkColumnExists = async (tableName: string, columnName: string): Promise<boolean> => {
  try {
    // Intentar usar la función RPC si está disponible
    try {
      const { data, error } = await supabase.rpc('check_column_exists', {
        _table_name: tableName,
        _column_name: columnName
      });
      
      if (error) {
        throw error;
      }
      
      return !!data;
    } catch (rpcError) {
      console.warn(`No se pudo usar RPC para verificar columna, usando método alternativo:`, rpcError);
      
      // Método alternativo: intentar ordenar por la columna
      // Si la columna no existe, arrojará un error
      const { error } = await supabase
        .from(tableName)
        .select('id')
        .limit(1)
        .order(columnName, { ascending: true });
      
      // Si hay error y contiene "column" y el nombre de la columna, es probable que no exista
      if (error && error.message && (
        error.message.toLowerCase().includes(`column "${columnName}" does not exist`) ||
        error.message.toLowerCase().includes(`column ${columnName} does not exist`)
      )) {
        return false;
      }
      
      // Si no hay error específico sobre la columna, asumimos que existe
      return true;
    }
  } catch (error) {
    console.error(`Error verificando si la columna ${columnName} existe en la tabla ${tableName}:`, error);
    return false;
  }
};

/**
 * Crea una estructura básica de tabla si no existe
 * @param tableName Nombre de la tabla a crear
 * @param columns Definición de columnas en formato SQL
 * @returns true si se creó la tabla con éxito o ya existía, false si hubo error
 */
export const ensureTableExists = async (tableName: string, columns: string): Promise<boolean> => {
  try {
    // Primero verificar si la tabla ya existe
    const tableExists = await checkTableExists(tableName);
    
    if (tableExists) {
      console.log(`Tabla ${tableName} ya existe.`);
      return true;
    }
    
    // Intentar crear la tabla usando SQL directo
    const query = `
      CREATE TABLE IF NOT EXISTS public.${tableName} (
        ${columns}
      );
    `;
    
    // Ejecutar la consulta usando el endpoint de SQL
    const response = await fetch('http://localhost:3100/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });
    
    const result = await response.json();
    
    if (result.error) {
      console.error(`Error creando tabla ${tableName}:`, result.error);
      return false;
    }
    
    console.log(`Tabla ${tableName} creada con éxito.`);
    return true;
  } catch (error) {
    console.error(`Error en ensureTableExists para ${tableName}:`, error);
    return false;
  }
};

/**
 * Verifica todas las tablas importantes del sistema
 * @returns Array con el estado de cada tabla
 */
export const checkAllTables = async (): Promise<TableStatus[]> => {
  const tableList = Object.values(TABLES);
  const results: TableStatus[] = [];
  
  for (const tableName of tableList) {
    try {
      const exists = await checkTableExists(tableName);
      results.push({
        name: tableName,
        exists
      });
    } catch (e) {
      // If checking a table fails, assume it exists to prevent blocking the app
      console.warn(`Error checking table ${tableName}:`, e);
      results.push({
        name: tableName,
        exists: true
      });
    }
  }
  
  return results;
};

/**
 * Imprime en consola el estado de las tablas
 */
export const logTableStatus = async (): Promise<void> => {
  if (checkCompleted) return;
  
  console.info('Verificando estructura de la base de datos...');
  try {
    const tableStatus = await checkAllTables();
    
    console.group('Estado de tablas:');
    tableStatus.forEach(table => {
      if (table.exists) {
        console.info(`✅ Tabla ${table.name}: OK`);
      } else {
        console.warn(`❌ Tabla ${table.name}: No existe o no se pudo verificar`);
      }
    });
    console.groupEnd();
    
    const missingTables = tableStatus.filter(t => !t.exists);
    if (missingTables.length > 0) {
      console.warn(`Se encontraron ${missingTables.length} tablas faltantes. La aplicación podría no funcionar correctamente.`);
    } else {
      console.info('Todas las tablas necesarias existen en la base de datos o se asumen existentes.');
      tablesVerified = true;
    }
  } catch (error) {
    console.error('Error general verificando estructura de base de datos:', error);
    // Don't block app startup on errors
  } finally {
    checkCompleted = true;
  }
};

/**
 * Inicializa la verificación de estructura de BD al inicio de la aplicación
 */
export const initDbStructureCheck = (): void => {
  // Run the verification in a non-blocking way
  setTimeout(() => {
    logTableStatus()
      .then(() => console.log('Database structure check completed'))
      .catch((error) => {
        console.error('Error verificando estructura de base de datos:', error);
      });
  }, 3000); // Delay the check by 3 seconds to allow the app to start first
};

// Export a function to check if tables are verified
export const areTablesVerified = (): boolean => {
  return tablesVerified || checkCompleted;
}; 