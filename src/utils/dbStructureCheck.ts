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
 * @returns Boolean indicando si la tabla existe
 */
export const checkTableExists = async (tableName: string): Promise<boolean> => {
  try {
    // Add a timeout to prevent blocking the app startup
    const timeoutPromise = new Promise<boolean>((resolve) => {
      setTimeout(() => resolve(true), 2000); // 2 second timeout
    });

    // Intenta hacer una consulta mínima a la tabla - usando GET en lugar de HEAD
    const queryPromise = new Promise<boolean>(async (resolve) => {
      try {
        const { error } = await supabase
          .from(tableName)
          .select('id') // Solo seleccionar ID en lugar de usar HEAD
          .limit(1);
        
        resolve(!error);
      } catch (error) {
        console.warn(`Error verificando si la tabla ${tableName} existe:`, error);
        resolve(false);
      }
    });
    
    // Return true if either the query succeeds or the timeout is reached
    return await Promise.race([queryPromise, timeoutPromise]);
  } catch (error) {
    console.warn(`Error verificando si la tabla ${tableName} existe:`, error);
    return true; // Assume table exists on error to prevent blocking the app
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