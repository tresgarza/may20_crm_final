import { supabase } from './supabaseClient';
import { TABLES } from '../utils/constants/tables';
import { ensureTableExists, checkColumnExists } from '../utils/dbStructureCheck';

/**
 * Verifica y configura la estructura básica de la base de datos necesaria para la aplicación
 */
export const setupDatabase = async (): Promise<void> => {
  console.log('Iniciando configuración de base de datos...');
  
  try {
    // 1. Asegurar que existe la tabla 'documents'
    await ensureTableExists(TABLES.DOCUMENTS, `
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      application_id UUID,
      client_id UUID,
      file_name TEXT NOT NULL,
      file_path TEXT,
      file_type TEXT,
      file_size INTEGER DEFAULT 0,
      category TEXT,
      uploaded_by_user_id UUID,
      is_verified BOOLEAN DEFAULT FALSE,
      verified_by UUID,
      verified_at TIMESTAMP WITH TIME ZONE
    `);
    
    // 2. Asegurar que existe la columna 'user_id' en la tabla 'users'
    if (!(await checkColumnExists('users', 'user_id'))) {
      console.log('La columna user_id no existe en la tabla users, intentando crearla...');
      
      try {
        const query = `
          ALTER TABLE public.users 
          ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT gen_random_uuid();
        `;
        
        const response = await fetch('http://localhost:3100/query', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query }),
        });
        
        const result = await response.json();
        
        if (result.error) {
          console.error('Error al crear columna user_id en users:', result.error);
        } else {
          console.log('Columna user_id creada con éxito en tabla users');
        }
      } catch (error) {
        console.error('Error al intentar crear columna user_id:', error);
      }
    }
    
    // 3. Crear función RPC para verificar existencia de columnas
    try {
      const query = `
        CREATE OR REPLACE FUNCTION public.check_column_exists(_table_name text, _column_name text)
        RETURNS boolean
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        BEGIN
          RETURN EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = _table_name
            AND column_name = _column_name
            AND table_schema = 'public'
          );
        END;
        $$;

        -- Aseguramos que todos los usuarios puedan ejecutar esta función
        GRANT EXECUTE ON FUNCTION public.check_column_exists(text, text) TO authenticated;
        GRANT EXECUTE ON FUNCTION public.check_column_exists(text, text) TO anon;
        GRANT EXECUTE ON FUNCTION public.check_column_exists(text, text) TO service_role;
      `;
      
      const response = await fetch('http://localhost:3100/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });
      
      const result = await response.json();
      
      if (result.error) {
        console.error('Error al crear función RPC check_column_exists:', result.error);
      } else {
        console.log('Función RPC check_column_exists creada con éxito');
      }
    } catch (error) {
      console.error('Error al intentar crear función RPC:', error);
    }
    
    // 4. Verificar existencia de bucket de storage
    try {
      // Listar buckets actuales
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();
      
      if (listError) {
        console.error('Error al listar buckets:', listError);
      } else {
        const clientDocumentsBucketExists = buckets?.some(bucket => bucket.name === 'client-documents');
        
        if (!clientDocumentsBucketExists) {
          console.log('El bucket client-documents no existe, intentando crearlo...');
          
          const { data, error } = await supabase.storage.createBucket('client-documents', {
            public: true
          });
          
          if (error) {
            console.error('Error al crear bucket client-documents:', error);
          } else {
            console.log('Bucket client-documents creado con éxito');
          }
        } else {
          console.log('El bucket client-documents ya existe');
        }
      }
    } catch (error) {
      console.error('Error al intentar verificar/crear bucket de storage:', error);
    }
    
    console.log('Configuración de base de datos completada.');
  } catch (error) {
    console.error('Error durante la configuración de la base de datos:', error);
  }
}; 