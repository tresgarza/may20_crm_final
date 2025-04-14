-- Este script debe ser ejecutado por un administrador de la base de datos Supabase
-- Permite crear el bucket 'documents' y establecer las políticas de seguridad adecuadas

-- Crear el bucket de almacenamiento 'documents'
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit)
VALUES ('documents', 'documents', false, false, 10485760) -- 10MB limit
ON CONFLICT (id) DO NOTHING;

-- Configurar políticas de seguridad para el bucket 'documents'

-- Política para permitir a los usuarios autenticados leer archivos
CREATE POLICY "Usuarios autenticados pueden leer sus documentos" ON storage.objects
FOR SELECT
USING (
  auth.role() = 'authenticated' AND
  (bucket_id = 'documents') AND
  (
    -- Usuarios pueden ver documentos de sus clientes si son asesores
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = storage.objects.metadata->>'client_id' 
      AND advisor_id = auth.uid()
    )
    OR
    -- Usuarios pueden ver documentos que subieron ellos mismos
    (storage.objects.owner = auth.uid())
    OR
    -- Administradores pueden ver todos los documentos
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'COMPANY_ADMIN'
    )
  )
);

-- Política para permitir a los usuarios autenticados subir archivos
CREATE POLICY "Usuarios autenticados pueden subir documentos" ON storage.objects
FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated' AND
  (bucket_id = 'documents')
);

-- Política para permitir a los usuarios autenticados actualizar sus archivos
CREATE POLICY "Usuarios pueden actualizar sus propios documentos" ON storage.objects
FOR UPDATE
USING (
  auth.role() = 'authenticated' AND
  (bucket_id = 'documents') AND
  (storage.objects.owner = auth.uid() OR
   EXISTS (
     SELECT 1 FROM public.users 
     WHERE id = auth.uid() AND role = 'COMPANY_ADMIN'
   ))
);

-- Política para permitir a los usuarios autenticados eliminar sus archivos
CREATE POLICY "Usuarios pueden eliminar sus propios documentos" ON storage.objects
FOR DELETE
USING (
  auth.role() = 'authenticated' AND
  (bucket_id = 'documents') AND
  (storage.objects.owner = auth.uid() OR
   EXISTS (
     SELECT 1 FROM public.users 
     WHERE id = auth.uid() AND role = 'COMPANY_ADMIN'
   ))
);

-- NOTA: Este script debe ejecutarse en el editor SQL de Supabase
-- Los usuarios normales no pueden crear buckets, solo los administradores 