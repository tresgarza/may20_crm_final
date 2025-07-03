-- Función para corregir financing_type basado en simulation_type de selected_plans
CREATE OR REPLACE FUNCTION fix_financing_type_based_on_simulation_type()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER := 0;
BEGIN
  -- Corregir applications donde financing_type no coincide con simulation_type
  UPDATE applications a
  SET financing_type = CASE 
    WHEN sp.simulation_type = 'cash' THEN 'personal'
    WHEN sp.simulation_type = 'product' THEN 'producto'
    ELSE a.financing_type -- Mantener el valor actual si no es cash o product
  END
  FROM selected_plans sp
  WHERE 
    a.source_id = sp.id 
    AND a.application_type = 'selected_plans'
    AND (
      (sp.simulation_type = 'cash' AND a.financing_type = 'producto') OR
      (sp.simulation_type = 'product' AND a.financing_type = 'personal')
    );

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Ejecutar la función para corregir las aplicaciones existentes
SELECT fix_financing_type_based_on_simulation_type() as corrected_applications;

-- Crear un trigger para futuras aplicaciones que corrija automáticamente el financing_type
CREATE OR REPLACE FUNCTION auto_fix_financing_type()
RETURNS TRIGGER AS $$
BEGIN
  -- Si es una aplicación de selected_plans, verificar que financing_type coincida con simulation_type
  IF NEW.application_type = 'selected_plans' AND NEW.source_id IS NOT NULL THEN
    -- Obtener el simulation_type del selected_plan relacionado
    UPDATE applications
    SET financing_type = CASE 
      WHEN sp.simulation_type = 'cash' THEN 'personal'
      WHEN sp.simulation_type = 'product' THEN 'producto'
      ELSE NEW.financing_type
    END
    FROM selected_plans sp
    WHERE 
      applications.id = NEW.id AND
      sp.id = NEW.source_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear el trigger en la tabla de aplicaciones
DROP TRIGGER IF EXISTS auto_fix_financing_type_trigger ON applications;
CREATE TRIGGER auto_fix_financing_type_trigger
AFTER INSERT ON applications
FOR EACH ROW
EXECUTE FUNCTION auto_fix_financing_type();

-- Mostrar un resumen de las correcciones realizadas
SELECT 
  sp.simulation_type,
  a.financing_type,
  COUNT(*) as count
FROM applications a
JOIN selected_plans sp ON a.source_id = sp.id
WHERE a.application_type = 'selected_plans'
GROUP BY sp.simulation_type, a.financing_type
ORDER BY sp.simulation_type, a.financing_type; 
 
 