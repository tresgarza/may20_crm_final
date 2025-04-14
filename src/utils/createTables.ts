import { getServiceClient } from '../lib/supabaseClient';
import { TABLES } from './constants/tables';

/**
 * Verifica si una tabla existe en Supabase
 * @param tableName Nombre de la tabla a verificar
 * @returns Booleano indicando si la tabla existe
 */
const checkTableExists = async (tableName: string): Promise<boolean> => {
  try {
    const serviceClient = getServiceClient();
    
    // Intentamos obtener 1 registro de la tabla
    const { error } = await serviceClient
      .from(tableName)
      .select('*')
      .limit(1);
    
    // Si no hay error, la tabla existe
    return !error;
  } catch (error) {
    console.error(`Error verificando si la tabla ${tableName} existe:`, error);
    return false;
  }
};

/**
 * Crea la tabla de documentos en Supabase
 * 
 * NOTA: Esta función solo funciona si el usuario tiene permisos para crear tablas.
 * En la mayoría de los casos, será necesario crear la tabla manualmente desde la
 * interfaz de Supabase o mediante SQL directo.
 */
const createDocumentsTable = async () => {
  try {
    console.log(`Intentando crear la tabla ${TABLES.DOCUMENTS}...`);
    
    const serviceClient = getServiceClient();
    
    // Verificar si la tabla ya existe
    const tableExists = await checkTableExists(TABLES.DOCUMENTS);
    
    if (tableExists) {
      console.log(`La tabla ${TABLES.DOCUMENTS} ya existe. No es necesario crearla.`);
      return true;
    }
    
    // Crear la tabla usando SQL directo
    // Esto solo funcionará si el usuario tiene permisos para ejecutar SQL
    const { error } = await serviceClient.rpc('execute_sql', {
      query: `
        CREATE TABLE IF NOT EXISTS ${TABLES.DOCUMENTS} (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          file_name TEXT NOT NULL,
          file_path TEXT,
          file_type TEXT,
          file_size BIGINT,
          category TEXT,
          application_id UUID REFERENCES ${TABLES.APPLICATIONS}(id) ON DELETE CASCADE,
          client_id UUID REFERENCES ${TABLES.CLIENTS}(id) ON DELETE CASCADE,
          uploaded_by_user_id UUID,
          is_verified BOOLEAN DEFAULT FALSE,
          verified_by UUID,
          verified_at TIMESTAMP WITH TIME ZONE
        );
        
        -- Añadir políticas RLS
        ALTER TABLE ${TABLES.DOCUMENTS} ENABLE ROW LEVEL SECURITY;
        
        -- Política para permitir lectura a usuarios autenticados
        CREATE POLICY "Users can view documents" ON ${TABLES.DOCUMENTS}
          FOR SELECT
          TO authenticated
          USING (true);
          
        -- Política para permitir inserción a usuarios autenticados
        CREATE POLICY "Users can insert documents" ON ${TABLES.DOCUMENTS}
          FOR INSERT
          TO authenticated
          WITH CHECK (true);
          
        -- Política para permitir actualización a usuarios autenticados
        CREATE POLICY "Users can update their own documents" ON ${TABLES.DOCUMENTS}
          FOR UPDATE
          TO authenticated
          USING (uploaded_by_user_id = auth.uid() OR 
                (client_id IN (SELECT id FROM ${TABLES.CLIENTS} WHERE advisor_id = auth.uid())) OR
                (application_id IN (SELECT id FROM ${TABLES.APPLICATIONS} WHERE advisor_id = auth.uid())));
      `
    });
    
    if (error) {
      console.error(`Error al crear la tabla ${TABLES.DOCUMENTS}:`, error);
      return false;
    }
    
    console.log(`Tabla ${TABLES.DOCUMENTS} creada correctamente.`);
    return true;
  } catch (error) {
    console.error(`Error al crear la tabla ${TABLES.DOCUMENTS}:`, error);
    return false;
  }
};

/**
 * Función principal que verifica y crea las tablas necesarias
 */
export const ensureTablesExist = async () => {
  console.log('Verificando tablas necesarias...');
  
  // Verificar y crear tabla de documentos
  const documentsExists = await checkTableExists(TABLES.DOCUMENTS);
  
  if (!documentsExists) {
    console.warn(`La tabla ${TABLES.DOCUMENTS} no existe. Intentando crearla...`);
    await createDocumentsTable();
  } else {
    console.log(`La tabla ${TABLES.DOCUMENTS} existe correctamente.`);
  }
  
  // Aquí puedes agregar verificaciones para otras tablas según sea necesario
  
  console.log('Verificación de tablas completada.');
};

// Si este archivo se ejecuta directamente, verificar tablas
if (require.main === module) {
  ensureTablesExist()
    .then(() => console.log('Proceso finalizado.'))
    .catch(error => console.error('Error en el proceso:', error));
}

export default {
  checkTableExists,
  createDocumentsTable,
  ensureTablesExist
}; 