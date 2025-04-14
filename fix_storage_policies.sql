-- ESTE SCRIPT DEBE SER EJECUTADO DIRECTAMENTE EN EL EDITOR SQL DE SUPABASE
-- Este script soluciona de manera definitiva todos los problemas de permisos del bucket "documents"

-- 1. Verificamos que el bucket exista
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents', 
  'documents', 
  false, -- no public
  10485760, -- 10MB
  '{image/png,image/jpeg,image/jpg,application/pdf,image/webp,image/gif,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document}'
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 10485760,
  allowed_mime_types = '{image/png,image/jpeg,image/jpg,application/pdf,image/webp,image/gif,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document}';

-- 2. Eliminar todas las políticas existentes para evitar conflictos
DROP POLICY IF EXISTS "Allow authenticated users to view their documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update their documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete their documents" ON storage.objects;
DROP POLICY IF EXISTS "allow_public_select" ON storage.objects;
DROP POLICY IF EXISTS "allow_public_insert" ON storage.objects;
DROP POLICY IF EXISTS "allow_public_update" ON storage.objects;
DROP POLICY IF EXISTS "allow_public_delete" ON storage.objects;

-- 3. Crear políticas simples y liberales que permitan a todos los usuarios autenticados trabajar con el bucket
-- Política para permitir a todos los usuarios autenticados ver TODOS los archivos
CREATE POLICY "Allow all users to select" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'documents');

-- Política para permitir a todos los usuarios autenticados subir archivos
CREATE POLICY "Allow all users to insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documents');

-- Política para permitir a todos los usuarios autenticados actualizar cualquier archivo
CREATE POLICY "Allow all users to update" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'documents');

-- Política para permitir a todos los usuarios autenticados eliminar cualquier archivo
CREATE POLICY "Allow all users to delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'documents');

-- 4. Verificar que las políticas se han creado correctamente
SELECT name, table_name, definition
FROM pg_policies
WHERE schema_name = 'storage' AND table_name = 'objects'; 