-- ATENCIÓN: Este script debe ser ejecutado por un usuario con permisos de administrador en Supabase
-- Para ejecutar este script:
-- 1. Ve al panel de Supabase (https://app.supabase.com)
-- 2. Selecciona tu proyecto
-- 3. Ve a la sección "SQL Editor"
-- 4. Crea una nueva consulta, pega este script y ejecútalo

-- Paso 1: Crear el bucket 'documents' si no existe
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents', 
  'documents', 
  false, -- no public
  10485760, -- 10MB
  '{image/png,image/jpeg,image/jpg,application/pdf,image/webp,image/gif,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document}'
)
ON CONFLICT (id) DO UPDATE SET
  -- Actualizamos los valores por si han cambiado
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = '{image/png,image/jpeg,image/jpg,application/pdf,image/webp,image/gif,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document}';

-- Paso 2: Configurar políticas de RLS para los objetos (archivos)

-- Eliminar políticas existentes para evitar conflictos
DROP POLICY IF EXISTS "Allow authenticated users to view their documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update their documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete their documents" ON storage.objects;

-- Política para permitir a usuarios autenticados ver archivos en el bucket 'documents'
CREATE POLICY "Allow authenticated users to view their documents" ON storage.objects
FOR SELECT
USING (
  auth.role() = 'authenticated' AND
  bucket_id = 'documents'
);

-- Política para permitir a usuarios autenticados subir archivos al bucket 'documents'
CREATE POLICY "Allow authenticated users to upload documents" ON storage.objects
FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated' AND
  bucket_id = 'documents'
);

-- Política para permitir a usuarios autenticados actualizar sus propios archivos
CREATE POLICY "Allow authenticated users to update their documents" ON storage.objects
FOR UPDATE
USING (
  auth.role() = 'authenticated' AND
  bucket_id = 'documents' AND
  (owner = auth.uid() OR EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'COMPANY_ADMIN'
  ))
);

-- Política para permitir a usuarios autenticados eliminar sus propios archivos
CREATE POLICY "Allow authenticated users to delete their documents" ON storage.objects
FOR DELETE
USING (
  auth.role() = 'authenticated' AND
  bucket_id = 'documents' AND
  (owner = auth.uid() OR EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'COMPANY_ADMIN'
  ))
);

-- Confirmar que el bucket ha sido creado
SELECT * FROM storage.buckets WHERE id = 'documents';

-- NOTA: Después de ejecutar este script, necesitarás refrescar la página o cerrar y abrir sesión 
-- en la aplicación para que los cambios surtan efecto. 