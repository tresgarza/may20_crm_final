-- Migration: Auto-fix financing_type trigger
-- Created: 2025-05-27T21:31:44.081Z

-- =====================================================
-- TRIGGER AUTOMÁTICO PARA CORREGIR FINANCING_TYPE
-- Se ejecuta cada vez que se inserta una nueva aplicación
-- =====================================================

-- 1. Crear la función que se ejecutará en el trigger
CREATE OR REPLACE FUNCTION auto_fix_financing_type_trigger()
RETURNS TRIGGER AS $$
DECLARE
    plan_simulation_type TEXT;
    correct_financing_type TEXT;
BEGIN
    -- Solo procesar aplicaciones de tipo 'selected_plans' con source_id
    IF NEW.application_type = 'selected_plans' AND NEW.source_id IS NOT NULL THEN
        
        -- Obtener simulation_type del selected_plan
        SELECT simulation_type INTO plan_simulation_type
        FROM selected_plans 
        WHERE id = NEW.source_id;
        
        -- Si encontramos el plan, determinar el financing_type correcto
        IF plan_simulation_type IS NOT NULL THEN
            -- Lógica de corrección:
            -- simulation_type = 'cash' → financing_type = 'personal'
            -- simulation_type = 'product' → financing_type = 'produto'
            IF plan_simulation_type = 'cash' THEN
                correct_financing_type := 'personal';
            ELSE
                correct_financing_type := 'produto';
            END IF;
            
            -- Solo actualizar si el financing_type es incorrecto
            IF NEW.financing_type != correct_financing_type THEN
                -- Actualizar el financing_type en el registro que se está insertando
                NEW.financing_type := correct_financing_type;
                
                -- Log para debugging
                RAISE NOTICE 'AUTO-FIX: Application % financing_type corrected from % to % (simulation_type: %)', 
                    NEW.id, OLD.financing_type, correct_financing_type, plan_simulation_type;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Crear el trigger que se ejecuta ANTES de insertar
DROP TRIGGER IF EXISTS trigger_auto_fix_financing_type ON applications;

CREATE TRIGGER trigger_auto_fix_financing_type
    BEFORE INSERT ON applications
    FOR EACH ROW
    EXECUTE FUNCTION auto_fix_financing_type_trigger();

-- 3. También crear un trigger para actualizaciones (por si acaso)
CREATE OR REPLACE FUNCTION auto_fix_financing_type_update_trigger()
RETURNS TRIGGER AS $$
DECLARE
    plan_simulation_type TEXT;
    correct_financing_type TEXT;
BEGIN
    -- Solo procesar si cambió el source_id o si es una aplicación selected_plans
    IF NEW.application_type = 'selected_plans' AND NEW.source_id IS NOT NULL AND 
       (OLD.source_id IS NULL OR OLD.source_id != NEW.source_id OR OLD.financing_type != NEW.financing_type) THEN
        
        -- Obtener simulation_type del selected_plan
        SELECT simulation_type INTO plan_simulation_type
        FROM selected_plans 
        WHERE id = NEW.source_id;
        
        -- Si encontramos el plan, determinar el financing_type correcto
        IF plan_simulation_type IS NOT NULL THEN
            IF plan_simulation_type = 'cash' THEN
                correct_financing_type := 'personal';
            ELSE
                correct_financing_type := 'produto';
            END IF;
            
            -- Solo actualizar si el financing_type es incorrecto
            IF NEW.financing_type != correct_financing_type THEN
                NEW.financing_type := correct_financing_type;
                
                RAISE NOTICE 'AUTO-FIX UPDATE: Application % financing_type corrected from % to % (simulation_type: %)', 
                    NEW.id, OLD.financing_type, correct_financing_type, plan_simulation_type;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_fix_financing_type_update ON applications;

CREATE TRIGGER trigger_auto_fix_financing_type_update
    BEFORE UPDATE ON applications
    FOR EACH ROW
    EXECUTE FUNCTION auto_fix_financing_type_update_trigger();

-- 4. Verificar que los triggers se crearon correctamente
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'applications' 
AND trigger_name LIKE '%auto_fix_financing_type%';

-- Mensaje de confirmación
SELECT 'Triggers automáticos para financing_type creados exitosamente!' as status; 