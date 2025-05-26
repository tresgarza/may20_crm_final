-- Migration: Crear tabla signed_documents para integrar documentos firmados con CINCEL
-- Fecha: 2025-05-21

-- 1. Crear tabla signed_documents si no existe
CREATE TABLE IF NOT EXISTS public.signed_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    application_id UUID NOT NULL,
    client_id UUID NOT NULL,
    document_type TEXT NOT NULL,
    cincel_document_id TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    signed_at TIMESTAMP WITH TIME ZONE,
    file_path TEXT,
    sha256_hash TEXT,
    CONSTRAINT fk_signed_documents_application FOREIGN KEY (application_id) REFERENCES public.applications(id) ON DELETE CASCADE,
    CONSTRAINT fk_signed_documents_client FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE
);

-- 2. Crear índices para mejorar consultas
CREATE INDEX IF NOT EXISTS idx_signed_documents_application ON public.signed_documents (application_id);
CREATE INDEX IF NOT EXISTS idx_signed_documents_client ON public.signed_documents (client_id);
CREATE INDEX IF NOT EXISTS idx_signed_documents_status ON public.signed_documents (status);

-- 3. Enable Row Level Security y política temporal (restringir más adelante)
ALTER TABLE public.signed_documents ENABLE ROW LEVEL SECURITY;

-- Política básica: permitir a roles autenticados leer/escribir sus propios registros (ajustar según modelo de roles)
DROP POLICY IF EXISTS "Allow all authenticated access" ON public.signed_documents;
CREATE POLICY "Allow all authenticated access" ON public.signed_documents
FOR ALL USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- 4. Trigger para updated_at
CREATE OR REPLACE FUNCTION update_signed_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_signed_documents ON public.signed_documents;
CREATE TRIGGER trg_update_signed_documents
BEFORE UPDATE ON public.signed_documents
FOR EACH ROW EXECUTE FUNCTION update_signed_documents_updated_at();

-- 5. Crear bucket storage 'signed-documents' si no existe
DO $$
BEGIN
    BEGIN
        PERFORM storage.create_bucket('signed-documents', '{"public": false}');
        RAISE NOTICE 'Bucket signed-documents creado';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Bucket signed-documents ya existe o no se pudo crear: %', SQLERRM;
    END;
END $$;

-- 6. Políticas RLS para objetos del bucket signed-documents (visibilidad restringida)
DROP POLICY IF EXISTS "Allow signed-documents read" ON storage.objects;
DROP POLICY IF EXISTS "Allow signed-documents write" ON storage.objects;

CREATE POLICY "Allow signed-documents read" ON storage.objects
FOR SELECT USING (
  bucket_id = 'signed-documents' AND auth.role() = 'authenticated'
);

CREATE POLICY "Allow signed-documents write" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'signed-documents' AND auth.role() = 'authenticated'
); 