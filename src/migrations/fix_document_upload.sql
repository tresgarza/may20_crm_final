-- Solución integral para problemas de subida de documentos

-- 1. Verificar y crear las funciones auxiliares
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

-- Función para verificar existencia de tablas
CREATE OR REPLACE FUNCTION public.check_table_exists(_table_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = _table_name
    AND table_schema = 'public'
  );
END;
$$;

-- Aseguramos que todos los usuarios puedan ejecutar estas funciones
GRANT EXECUTE ON FUNCTION public.check_column_exists(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_column_exists(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.check_column_exists(text, text) TO service_role;

GRANT EXECUTE ON FUNCTION public.check_table_exists(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_table_exists(text) TO anon;
GRANT EXECUTE ON FUNCTION public.check_table_exists(text) TO service_role;

-- 2. Verificar y crear la tabla documents
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'documents'
    AND table_schema = 'public'
  ) THEN
    CREATE TABLE public.documents (
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
    );
    
    RAISE NOTICE 'Tabla documents creada';
  ELSE
    RAISE NOTICE 'La tabla documents ya existe';
  END IF;
END $$;

-- 3. Verificar y crear las columnas necesarias en documents
DO $$
BEGIN
  -- Check and add is_verified column
  IF NOT EXISTS (SELECT FROM information_schema.columns 
                WHERE table_name = 'documents' 
                AND column_name = 'is_verified' 
                AND table_schema = 'public') THEN
      ALTER TABLE public.documents 
      ADD COLUMN is_verified BOOLEAN DEFAULT FALSE;
      RAISE NOTICE 'Added is_verified column to documents table';
  ELSE
      RAISE NOTICE 'is_verified column already exists';
  END IF;
  
  -- Check and add verified_by column
  IF NOT EXISTS (SELECT FROM information_schema.columns 
                WHERE table_name = 'documents' 
                AND column_name = 'verified_by' 
                AND table_schema = 'public') THEN
      ALTER TABLE public.documents 
      ADD COLUMN verified_by UUID DEFAULT NULL;
      RAISE NOTICE 'Added verified_by column to documents table';
  ELSE
      RAISE NOTICE 'verified_by column already exists';
  END IF;
  
  -- Check and add verified_at column
  IF NOT EXISTS (SELECT FROM information_schema.columns 
                WHERE table_name = 'documents' 
                AND column_name = 'verified_at' 
                AND table_schema = 'public') THEN
      ALTER TABLE public.documents 
      ADD COLUMN verified_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
      RAISE NOTICE 'Added verified_at column to documents table';
  ELSE
      RAISE NOTICE 'verified_at column already exists';
  END IF;
END $$;

-- 4. Configurar permisos RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes para evitar conflictos
DROP POLICY IF EXISTS "Enable full access for authenticated users" ON documents;
DROP POLICY IF EXISTS "Enable read access for anonymous users" ON documents;

-- Crear políticas de acceso
CREATE POLICY "Enable full access for authenticated users"
ON public.documents
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Enable read access for anonymous users"
ON public.documents
FOR SELECT
TO anon
USING (true);

-- 5. Verificar y crear el bucket de almacenamiento
DO $$
BEGIN
  BEGIN
    PERFORM storage.create_bucket('client-documents', '{"public": true}');
    RAISE NOTICE 'Bucket client-documents creado exitosamente';
  EXCEPTION 
    WHEN others THEN
      RAISE NOTICE 'El bucket client-documents ya existe o hubo un error al crearlo: %', SQLERRM;
  END;
END $$;

-- 6. Log de verificación
DO $$
DECLARE
  table_exists boolean;
  is_verified_exists boolean;
  verified_by_exists boolean;
  verified_at_exists boolean;
  bucket_exists boolean;
BEGIN
  -- Verificar tabla
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'documents' 
    AND table_schema = 'public'
  ) INTO table_exists;
  
  -- Verificar columnas
  IF table_exists THEN
    SELECT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'documents' 
      AND column_name = 'is_verified' 
      AND table_schema = 'public'
    ) INTO is_verified_exists;
    
    SELECT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'documents' 
      AND column_name = 'verified_by' 
      AND table_schema = 'public'
    ) INTO verified_by_exists;
    
    SELECT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'documents' 
      AND column_name = 'verified_at' 
      AND table_schema = 'public'
    ) INTO verified_at_exists;
  END IF;
  
  -- Ver si bucket existe
  BEGIN
    SELECT EXISTS (
      SELECT 1 FROM storage.buckets WHERE name = 'client-documents'
    ) INTO bucket_exists;
  EXCEPTION 
    WHEN others THEN
      bucket_exists := false;
  END;
  
  -- Mostrar resultados
  RAISE NOTICE 'Verificación de estructura para documentos:';
  RAISE NOTICE '- Tabla documents: %', CASE WHEN table_exists THEN 'OK' ELSE 'FALTA' END;
  
  IF table_exists THEN
    RAISE NOTICE '- Columna is_verified: %', CASE WHEN is_verified_exists THEN 'OK' ELSE 'FALTA' END;
    RAISE NOTICE '- Columna verified_by: %', CASE WHEN verified_by_exists THEN 'OK' ELSE 'FALTA' END;
    RAISE NOTICE '- Columna verified_at: %', CASE WHEN verified_at_exists THEN 'OK' ELSE 'FALTA' END;
  END IF;
  
  RAISE NOTICE '- Bucket client-documents: %', CASE WHEN bucket_exists THEN 'OK' ELSE 'FALTA' END;
END $$; 