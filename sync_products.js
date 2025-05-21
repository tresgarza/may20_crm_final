// Script para sincronizar datos de producto entre selected_plans y applications
const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const SUPABASE_URL = 'https://ydnygntfkrleiseuciwq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkbnlnbnRma3JsZWlzZXVjaXdxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTk5MjQwNiwiZXhwIjoyMDU1NTY4NDA2fQ.TwhEGW9DK4DTQQRquT6Z9UW8T8UjLX-hp9uKdRjWAhs';

// Inicializar cliente de Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runMigrations() {
  console.log('Ejecutando migración para sincronizar datos de producto...');

  try {
    // 1. Crear función para actualizar aplicaciones existentes
    const createFunctionResult = await supabase.rpc('', {
      query: `
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
      `
    });

    console.log('Función para actualizar aplicaciones existentes creada');

    // 2. Ejecutar la función para actualizar aplicaciones existentes
    const updateResult = await supabase.rpc('', {
      query: `SELECT update_product_information();`
    });

    console.log('Actualización completada para aplicaciones existentes');

    // 3. Crear función de trigger para nuevas aplicaciones
    const createTriggerFunctionResult = await supabase.rpc('', {
      query: `
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
      `
    });

    console.log('Función de trigger creada');

    // 4. Crear el trigger
    const createTriggerResult = await supabase.rpc('', {
      query: `
        DROP TRIGGER IF EXISTS applications_product_data_sync ON applications;
        CREATE TRIGGER applications_product_data_sync
        AFTER INSERT ON applications
        FOR EACH ROW
        EXECUTE FUNCTION sync_product_data_to_applications();
      `
    });

    console.log('Trigger creado correctamente');
    console.log('Migración completada con éxito');

    // 5. Contar cuántas aplicaciones se actualizarían
    const countResult = await supabase
      .from('applications')
      .select('id', { count: 'exact' })
      .eq('financing_type', 'producto')
      .is('product_url', null);

    console.log(`Hay ${countResult.count} aplicaciones pendientes de actualizar`);

  } catch (error) {
    console.error('Error al ejecutar la migración:', error);
  }
}

// Ejecutar las migraciones
runMigrations(); 