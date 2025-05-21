// Script simplificado para sincronizar datos de producto
const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const SUPABASE_URL = 'https://ydnygntfkrleiseuciwq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkbnlnbnRma3JsZWlzZXVjaXdxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTk5MjQwNiwiZXhwIjoyMDU1NTY4NDA2fQ.TwhEGW9DK4DTQQRquT6Z9UW8T8UjLX-hp9uKdRjWAhs';

// Inicializar cliente de Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function syncProductData() {
  console.log('Iniciando sincronización manual de datos de producto...');

  try {
    // 1. Obtener todas las aplicaciones tipo producto sin información de producto
    const { data: applications, error: appError } = await supabase
      .from('applications')
      .select('id, source_id')
      .eq('application_type', 'selected_plans')
      .eq('financing_type', 'producto')
      .is('product_url', null);

    if (appError) {
      throw appError;
    }

    console.log(`Encontradas ${applications.length} aplicaciones para actualizar`);

    // 2. Para cada aplicación, buscar su producto correspondiente en selected_plans
    let updatedCount = 0;
    for (const app of applications) {
      const { data: productData, error: productError } = await supabase
        .from('selected_plans')
        .select('product_url, product_title, product_image, product_price')
        .eq('id', app.source_id)
        .single();

      if (productError) {
        console.error(`Error al buscar producto para app ${app.id}:`, productError);
        continue;
      }

      if (!productData || (!productData.product_url && !productData.product_title && !productData.product_image)) {
        console.log(`No se encontraron datos de producto para app ${app.id}`);
        continue;
      }

      // 3. Actualizar la aplicación con los datos del producto
      const { data: updateData, error: updateError } = await supabase
        .from('applications')
        .update({
          product_url: productData.product_url,
          product_title: productData.product_title,
          product_image: productData.product_image
        })
        .eq('id', app.id);

      if (updateError) {
        console.error(`Error al actualizar aplicación ${app.id}:`, updateError);
      } else {
        updatedCount++;
        console.log(`Aplicación ${app.id} actualizada con éxito`);
      }
    }

    console.log(`Sincronización completa. ${updatedCount} aplicaciones actualizadas.`);

  } catch (error) {
    console.error('Error durante la sincronización:', error);
  }
}

// Ejecutar la sincronización
syncProductData(); 