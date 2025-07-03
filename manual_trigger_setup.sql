
-- SCRIPT PARA APLICAR TRIGGER AUTOMÁTICO
-- Ejecutar este script en el SQL Editor de Supabase Dashboard


      CREATE OR REPLACE FUNCTION auto_fix_financing_type_trigger()
      RETURNS TRIGGER AS $$
      DECLARE
          plan_simulation_type TEXT;
          correct_financing_type TEXT;
      BEGIN
          IF NEW.application_type = 'selected_plans' AND NEW.source_id IS NOT NULL THEN
              SELECT simulation_type INTO plan_simulation_type
              FROM selected_plans 
              WHERE id = NEW.source_id;
              
              IF plan_simulation_type IS NOT NULL THEN
                  IF plan_simulation_type = 'cash' THEN
                      correct_financing_type := 'personal';
                  ELSE
                      correct_financing_type := 'produto';
                  END IF;
                  
                  IF NEW.financing_type != correct_financing_type THEN
                      NEW.financing_type := correct_financing_type;
                  END IF;
              END IF;
          END IF;
          
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    


      DROP TRIGGER IF EXISTS trigger_auto_fix_financing_type ON applications;
      CREATE TRIGGER trigger_auto_fix_financing_type
          BEFORE INSERT ON applications
          FOR EACH ROW
          EXECUTE FUNCTION auto_fix_financing_type_trigger();
    

-- Verificar que se creó correctamente
SELECT 
    trigger_name,
    event_manipulation,
    action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'applications' 
AND trigger_name = 'trigger_auto_fix_financing_type';
