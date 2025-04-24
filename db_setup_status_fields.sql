-- Script para añadir campos de estado independientes para cada rol
-- Ejecutar en la base de datos para garantizar que las vistas Kanban sean independientes

-- Verificar si la columna advisor_status existe y añadirla si no
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'applications' 
        AND column_name = 'advisor_status'
    ) THEN
        ALTER TABLE applications ADD COLUMN advisor_status text DEFAULT NULL;
    END IF;
END $$;

-- Verificar si la columna company_status existe y añadirla si no
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'applications' 
        AND column_name = 'company_status'
    ) THEN
        ALTER TABLE applications ADD COLUMN company_status text DEFAULT NULL;
    END IF;
END $$;

-- Verificar si la columna global_status existe y añadirla si no
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'applications' 
        AND column_name = 'global_status'
    ) THEN
        ALTER TABLE applications ADD COLUMN global_status text DEFAULT NULL;
    END IF;
END $$;

-- Inicializar los campos de estado con el valor del status principal para aplicaciones existentes
UPDATE applications 
SET 
    advisor_status = status, 
    company_status = status, 
    global_status = status 
WHERE 
    advisor_status IS NULL 
    OR company_status IS NULL 
    OR global_status IS NULL;

-- Añadir un trigger para mantener sincronizados los estados por defecto para nuevas aplicaciones
CREATE OR REPLACE FUNCTION sync_status_fields()
RETURNS TRIGGER AS $$
BEGIN
    -- Si se está creando una nueva aplicación e insertando directamente el status principal
    IF TG_OP = 'INSERT' THEN
        -- Inicializar los campos de estado específicos si no se proporcionaron
        IF NEW.advisor_status IS NULL THEN
            NEW.advisor_status := NEW.status;
        END IF;
        IF NEW.company_status IS NULL THEN
            NEW.company_status := NEW.status;
        END IF;
        IF NEW.global_status IS NULL THEN
            NEW.global_status := NEW.status;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear el trigger si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'sync_status_fields_trigger'
    ) THEN
        CREATE TRIGGER sync_status_fields_trigger
        BEFORE INSERT ON applications
        FOR EACH ROW
        EXECUTE FUNCTION sync_status_fields();
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error creating trigger: %', SQLERRM;
END $$;

-- Comentario final para confirmar ejecución
COMMENT ON TABLE applications IS 'Updated to support independent Kanban views for different roles with advisor_status, company_status and global_status fields'; 