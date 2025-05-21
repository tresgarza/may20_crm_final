-- Primera migración para crear la función de actualización
CREATE OR REPLACE FUNCTION update_product_information() RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER := 0;
BEGIN
  -- Update existing applications with product information from selected_plans
  UPDATE applications a
  SET 
    product_url = sp.product_url,
    product_title = sp.product_title,
    product_image = sp.product_image
  FROM selected_plans sp
  WHERE 
    a.source_id = sp.id 
    AND a.application_type = 'selected_plans'
    AND a.financing_type = 'producto'
    AND (a.product_url IS NULL OR a.product_title IS NULL OR a.product_image IS NULL)
    AND (sp.product_url IS NOT NULL OR sp.product_title IS NOT NULL OR sp.product_image IS NOT NULL);

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Ejecutar la función para actualizar las aplicaciones existentes
SELECT update_product_information();

-- Crear un trigger para futuras aplicaciones
CREATE OR REPLACE FUNCTION sync_product_data_to_applications()
RETURNS TRIGGER AS $$
BEGIN
  -- Si es una inserción de una aplicación tipo producto, obtener datos del producto
  IF NEW.application_type = 'selected_plans' AND NEW.financing_type = 'producto' THEN
    UPDATE applications
    SET 
      product_url = sp.product_url,
      product_title = sp.product_title,
      product_image = sp.product_image
    FROM selected_plans sp
    WHERE 
      applications.id = NEW.id AND
      applications.source_id = sp.id AND
      (sp.product_url IS NOT NULL OR sp.product_title IS NOT NULL OR sp.product_image IS NOT NULL);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear el trigger en la tabla de aplicaciones
DROP TRIGGER IF EXISTS applications_product_data_sync ON applications;
CREATE TRIGGER applications_product_data_sync
AFTER INSERT ON applications
FOR EACH ROW
EXECUTE FUNCTION sync_product_data_to_applications(); 