const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://ydnygntfkrleiseuciwq.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkbnlnbnRma3JsZWlzZXVjaXdxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTk5MjQwNiwiZXhwIjoyMDU1NTY4NDA2fQ.TwhEGW9DK4DTQQRquT6Z9UW8T8UjLX-hp9uKdRjWAhs';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Función principal para corregir financing_type en aplicaciones recientes
 */
async function fixFinancingTypeRecent(hoursBack = 2) {
  console.log(`🔧 Corrigiendo financing_type en aplicaciones de las últimas ${hoursBack} horas...\n`);
  
  try {
    // Calcular fecha límite
    const timeAgo = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();
    console.log(`🔍 Buscando aplicaciones creadas después de: ${timeAgo}`);
    
    // Obtener aplicaciones recientes de tipo selected_plans
    const { data: recentApps, error: searchError } = await supabase
      .from('applications')
      .select('id, financing_type, created_at, client_name, source_id')
      .eq('application_type', 'selected_plans')
      .gte('created_at', timeAgo)
      .not('source_id', 'is', null)
      .order('created_at', { ascending: false });

    if (searchError) {
      throw new Error(`Error buscando aplicaciones: ${searchError.message}`);
    }

    if (!recentApps || recentApps.length === 0) {
      console.log('✅ No se encontraron aplicaciones recientes de tipo selected_plans');
      return { processed: 0, corrected: 0, alreadyCorrect: 0, errors: 0 };
    }

    console.log(`📋 Encontradas ${recentApps.length} aplicaciones recientes de selected_plans\n`);

    let correctedCount = 0;
    let alreadyCorrectCount = 0;
    let errorCount = 0;

    // Procesar cada aplicación
    for (const app of recentApps) {
      try {
        // Obtener simulation_type del selected_plan
        const { data: planData, error: planError } = await supabase
          .from('selected_plans')
          .select('simulation_type')
          .eq('id', app.source_id)
          .single();

        if (planError || !planData) {
          console.log(`⚠️  No se pudo obtener simulation_type para aplicación ${app.id.substring(0, 8)}...`);
          errorCount++;
          continue;
        }

        // Determinar el financing_type correcto
        const correctFinancingType = planData.simulation_type === 'cash' ? 'personal' : 'produto';

        // Verificar si necesita corrección
        if (app.financing_type === correctFinancingType) {
          console.log(`✅ ${app.id.substring(0, 8)}... ya tiene financing_type correcto: ${app.financing_type} (${planData.simulation_type})`);
          alreadyCorrectCount++;
          continue;
        }

        console.log(`🔧 Corrigiendo aplicación ${app.id.substring(0, 8)}...:`);
        console.log(`   Cliente: ${app.client_name || 'N/A'}`);
        console.log(`   Simulation Type: ${planData.simulation_type}`);
        console.log(`   Financing Type: ${app.financing_type} → ${correctFinancingType}`);
        console.log(`   Creada: ${new Date(app.created_at).toLocaleString()}`);

        // Actualizar la aplicación
        const { error: updateError } = await supabase
          .from('applications')
          .update({ 
            financing_type: correctFinancingType,
            updated_at: new Date().toISOString()
          })
          .eq('id', app.id);

        if (updateError) {
          console.error(`❌ Error actualizando aplicación ${app.id.substring(0, 8)}...:`, updateError.message);
          errorCount++;
        } else {
          console.log(`✅ Aplicación ${app.id.substring(0, 8)}... corregida exitosamente\n`);
          correctedCount++;
        }

      } catch (error) {
        console.error(`❌ Error procesando aplicación ${app.id.substring(0, 8)}...:`, error.message);
        errorCount++;
      }
    }

    // Resumen final
    console.log('📊 RESUMEN DE CORRECCIÓN:');
    console.log(`   Aplicaciones encontradas: ${recentApps.length}`);
    console.log(`   Aplicaciones corregidas: ${correctedCount}`);
    console.log(`   Ya correctas: ${alreadyCorrectCount}`);
    console.log(`   Errores: ${errorCount}`);

    if (correctedCount > 0) {
      console.log(`\n🎉 Se corrigieron ${correctedCount} aplicaciones exitosamente`);
    } else if (alreadyCorrectCount === recentApps.length) {
      console.log('\n✅ Todas las aplicaciones ya tenían financing_type correcto');
    }

    return {
      processed: recentApps.length,
      corrected: correctedCount,
      alreadyCorrect: alreadyCorrectCount,
      errors: errorCount
    };

  } catch (error) {
    console.error('❌ Error general:', error.message);
    return { processed: 0, corrected: 0, alreadyCorrect: 0, errors: 1 };
  }
}

/**
 * Función para ejecutar en modo continuo (cada 5 minutos)
 */
async function runContinuous() {
  console.log('🚀 Iniciando corrección automática continua de financing_type');
  console.log('⏰ Se ejecutará cada 5 minutos...');
  console.log('🛑 Presiona Ctrl+C para detener\n');

  // Ejecutar inmediatamente
  await fixFinancingTypeRecent(1); // Solo última hora en modo continuo

  // Luego ejecutar cada 5 minutos
  setInterval(async () => {
    console.log(`\n⏰ ${new Date().toLocaleString()} - Ejecutando corrección automática...`);
    await fixFinancingTypeRecent(1); // Solo última hora
  }, 5 * 60 * 1000); // 5 minutos
}

// Procesar argumentos de línea de comandos
const args = process.argv.slice(2);

if (args.includes('--continuous')) {
  runContinuous();
} else {
  // Modo de ejecución única
  const hoursBack = args[0] ? parseInt(args[0]) : 2;
  
  if (isNaN(hoursBack) || hoursBack < 1) {
    console.log('❌ Número de horas inválido. Usando 2 horas por defecto.');
    fixFinancingTypeRecent(2);
  } else {
    fixFinancingTypeRecent(hoursBack);
  }
}

// Manejar cierre graceful
process.on('SIGINT', () => {
  console.log('\n🛑 Deteniendo corrección automática...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Deteniendo corrección automática...');
  process.exit(0);
}); 
 
 