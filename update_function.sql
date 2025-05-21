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
