-- Comprobar si existe la tabla documents
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'documents' AND table_schema = 'public') THEN
        -- Comprobar si existe la columna is_verified
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'is_verified' AND table_schema = 'public') THEN
            ALTER TABLE public.documents ADD COLUMN is_verified BOOLEAN DEFAULT FALSE;
            RAISE NOTICE 'Columna is_verified añadida a la tabla documents';
        ELSE
            RAISE NOTICE 'La columna is_verified ya existe en la tabla documents';
        END IF;
        
        -- Comprobar si existe la columna verified_by
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'verified_by' AND table_schema = 'public') THEN
            ALTER TABLE public.documents ADD COLUMN verified_by UUID DEFAULT NULL;
            RAISE NOTICE 'Columna verified_by añadida a la tabla documents';
        ELSE
            RAISE NOTICE 'La columna verified_by ya existe en la tabla documents';
        END IF;
        
        -- Comprobar si existe la columna verified_at
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'verified_at' AND table_schema = 'public') THEN
            ALTER TABLE public.documents ADD COLUMN verified_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
            RAISE NOTICE 'Columna verified_at añadida a la tabla documents';
        ELSE
            RAISE NOTICE 'La columna verified_at ya existe en la tabla documents';
        END IF;
    ELSE
        -- Crear la tabla documents si no existe
        CREATE TABLE public.documents (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE,
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
    END IF;
    
    -- Comprobar si existe la tabla users
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') THEN
        -- Comprobar si existe la columna user_id
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'user_id' AND table_schema = 'public') THEN
            ALTER TABLE public.users ADD COLUMN user_id UUID DEFAULT NULL;
            RAISE NOTICE 'Columna user_id añadida a la tabla users';
        ELSE
            RAISE NOTICE 'La columna user_id ya existe en la tabla users';
        END IF;
    ELSE
        RAISE NOTICE 'La tabla users no existe. No se realiza ninguna acción.';
    END IF;

    -- Comprobar si existe el bucket de storage
    BEGIN
        -- Intentar crear el bucket si no existe
        PERFORM storage.create_bucket('client-documents', { 'public': true });
        RAISE NOTICE 'Bucket client-documents creado o ya existía';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error al crear el bucket: %', SQLERRM;
    END;
END $$; 