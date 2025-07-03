const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://ydnygntfkrleiseuciwq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkbnlnbnRma3JsZWlzZXVjaXdxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTk5MjQwNiwiZXhwIjoyMDU1NTY4NDA2fQ.TwhEGW9DK4DTQQRquT6Z9UW8T8UjLX-hp9uKdRjWAhs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeAndFixFinancingType() {
  console.log('🔧 Ejecutando migración para corregir financing_type...\n');

  try {
    // 1. Analizar estado actual usando SQL directo
    console.log('📊 Estado actual antes de la corrección:');
    
    // Consulta SQL directa para obtener aplicaciones con simulation_type
    let { data: allApps, error: allError } = await supabase
      .rpc('execute_sql', {
        query: `
          SELECT 
            a.id,
            a.financing_type,
            a.application_type,
            a.created_at,
            a.source_id,
            sp.simulation_type
          FROM applications a
          LEFT JOIN selected_plans sp ON a.source_id = sp.id
          WHERE a.application_type = 'selected_plans'
          AND a.source_id IS NOT NULL
          ORDER BY a.created_at DESC
        `
      });

    if (allError) {
      console.error('Error obteniendo datos:', allError);
      console.log('Intentando consulta más simple...');
      
      // Consulta alternativa más simple
      const { data: appsData, error: appsError } = await supabase
        .from('applications')
        .select('id, financing_type, application_type, created_at, source_id')
        .eq('application_type', 'selected_plans')
        .not('source_id', 'is', null);

      if (appsError) {
        console.error('Error en consulta de aplicaciones:', appsError);
        return;
      }

      console.log(`Encontradas ${appsData.length} aplicaciones de tipo 'selected_plans'`);
      
      // Obtener simulation_type para cada aplicación
      const appsWithSimType = [];
      console.log('Obteniendo simulation_type para cada aplicación...');
      
      for (const app of appsData) { // Analizar todas las aplicaciones
        const { data: planData, error: planError } = await supabase
          .from('selected_plans')
          .select('simulation_type')
          .eq('id', app.source_id)
          .single();

        if (!planError && planData) {
          appsWithSimType.push({
            ...app,
            simulation_type: planData.simulation_type
          });
        } else if (planError) {
          console.log(`⚠️  No se pudo obtener simulation_type para aplicación ${app.id.substring(0, 8)}...`);
        }
      }
      
      allApps = appsWithSimType;
    }

    if (!allApps || allApps.length === 0) {
      console.error('No se pudieron obtener los datos');
      return;
    }

    console.log(`Total de aplicaciones analizadas: ${allApps.length}`);

    // Analizar inconsistencias
    const cashWithProducto = allApps.filter(app => 
      app.simulation_type === 'cash' && app.financing_type === 'producto'
    );
    
    const productWithPersonal = allApps.filter(app => 
      app.simulation_type === 'product' && app.financing_type === 'personal'
    );

    const correctCash = allApps.filter(app => 
      app.simulation_type === 'cash' && app.financing_type === 'personal'
    );
    
    const correctProduct = allApps.filter(app => 
      app.simulation_type === 'product' && app.financing_type === 'producto'
    );

    console.log(`✅ Aplicaciones cash con financing_type 'personal' (correctas): ${correctCash.length}`);
    console.log(`✅ Aplicaciones product con financing_type 'producto' (correctas): ${correctProduct.length}`);
    console.log(`❌ Aplicaciones cash con financing_type 'producto' (incorrectas): ${cashWithProducto.length}`);
    console.log(`❌ Aplicaciones product con financing_type 'personal' (incorrectas): ${productWithPersonal.length}`);

    if (cashWithProducto.length > 0) {
      console.log('\n🔍 Ejemplos de aplicaciones cash con financing_type incorrecto:');
      cashWithProducto.slice(0, 5).forEach(app => {
        console.log(`  - ID: ${app.id.substring(0, 8)}... | simulation_type: ${app.simulation_type} | financing_type: ${app.financing_type} | fecha: ${app.created_at}`);
      });
    }

    if (productWithPersonal.length > 0) {
      console.log('\n🔍 Ejemplos de aplicaciones product con financing_type incorrecto:');
      productWithPersonal.slice(0, 5).forEach(app => {
        console.log(`  - ID: ${app.id.substring(0, 8)}... | simulation_type: ${app.simulation_type} | financing_type: ${app.financing_type} | fecha: ${app.created_at}`);
      });
    }

    // 2. Ejecutar la migración si hay problemas
    const totalProblems = cashWithProducto.length + productWithPersonal.length;
    
    if (totalProblems === 0) {
      console.log('\n✅ No se encontraron inconsistencias en la muestra analizada. Los financing_type parecen estar correctos.');
      return;
    }

    console.log(`\n🚀 Procediendo a corregir ${totalProblems} aplicaciones...`);

    // Aplicar la migración usando la función que creamos
    const { data: migrationResult, error: migrationError } = await supabase
      .rpc('fix_financing_type_based_on_simulation_type');

    if (migrationError) {
      console.error('❌ Error ejecutando la migración:', migrationError);
      console.log('Intentando aplicar correcciones manualmente...');
      
      // Corrección manual para aplicaciones cash con financing_type 'producto'
      if (cashWithProducto.length > 0) {
        const cashIds = cashWithProducto.map(app => app.id);
        const { data: updateResult, error: updateError } = await supabase
          .from('applications')
          .update({ financing_type: 'personal' })
          .in('id', cashIds);

        if (updateError) {
          console.error('Error en actualización manual:', updateError);
        } else {
          console.log(`✅ Corregidas ${cashIds.length} aplicaciones cash manualmente`);
        }
      }

      // Corrección manual para aplicaciones product con financing_type 'personal'
      if (productWithPersonal.length > 0) {
        const productIds = productWithPersonal.map(app => app.id);
        const { data: updateResult, error: updateError } = await supabase
          .from('applications')
          .update({ financing_type: 'producto' })
          .in('id', productIds);

        if (updateError) {
          console.error('Error en actualización manual de product:', updateError);
        } else {
          console.log(`✅ Corregidas ${productIds.length} aplicaciones product manualmente`);
        }
      }
    } else {
      console.log('✅ Migración ejecutada exitosamente');
      console.log(`Aplicaciones corregidas: ${migrationResult}`);
    }

    console.log('\n🎉 ¡Corrección completada! Se han actualizado los financing_type incorrectos.');

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Ejecutar el script
analyzeAndFixFinancingType(); 
 
 