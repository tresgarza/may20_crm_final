import { supabase } from '../lib/supabaseClient';
import { TABLES } from './constants/tables';

interface TableStatus {
  name: string;
  exists: boolean;
}

/**
 * Verifica si una tabla existe en la base de datos
 * @param tableName Nombre de la tabla a verificar
 * @returns Boolean indicando si la tabla existe
 */
export const checkTableExists = async (tableName: string): Promise<boolean> => {
  try {
    // Intenta hacer una consulta mínima a la tabla
    const { error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })
      .limit(1);
    
    // Si no hay error, la tabla existe
    return !error;
  } catch (error) {
    console.warn(`Error verificando si la tabla ${tableName} existe:`, error);
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
    const exists = await checkTableExists(tableName);
    results.push({
      name: tableName,
      exists
    });
  }
  
  return results;
};

/**
 * Imprime en consola el estado de las tablas
 */
export const logTableStatus = async (): Promise<void> => {
  console.info('Verificando estructura de la base de datos...');
  const tableStatus = await checkAllTables();
  
  console.group('Estado de tablas:');
  tableStatus.forEach(table => {
    if (table.exists) {
      console.info(`✅ Tabla ${table.name}: OK`);
    } else {
      console.warn(`❌ Tabla ${table.name}: No existe`);
    }
  });
  console.groupEnd();
  
  const missingTables = tableStatus.filter(t => !t.exists);
  if (missingTables.length > 0) {
    console.warn(`Se encontraron ${missingTables.length} tablas faltantes. La aplicación podría no funcionar correctamente.`);
  } else {
    console.info('Todas las tablas necesarias existen en la base de datos.');
  }
};

/**
 * Inicializa la verificación de estructura de BD al inicio de la aplicación
 */
export const initDbStructureCheck = (): void => {
  // Ejecutar verificación al inicio
  logTableStatus().catch(error => {
    console.error('Error verificando estructura de base de datos:', error);
  });
}; 