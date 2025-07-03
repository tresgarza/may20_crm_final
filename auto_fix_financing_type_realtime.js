const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://ydnygntfkrleiseuciwq.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkbnlnbnRma3JsZWlzZXVjaXdxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTk5MjQwNiwiZXhwIjoyMDU1NTY4NDA2fQ.TwhEGW9DK4DTQQRquT6Z9UW8T8UjLX-hp9uKdRjWAhs';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Función principal que corrige automáticamente las aplicaciones recientes
 * con financing_type incorrecto
 */
async function autoFixFinancingTypeRealtime() {
  console.log('🔄 Iniciando corrección automática de financing_type...');
  
  try {
    // 1. Buscar aplicaciones de los últimos 30 minutos que necesiten corrección
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    
    console.log(`🔍 Buscando aplicaciones creadas después de: ${thirtyMinutesAgo}`);
    
    // Primero obtener aplicaciones recientes de tipo selected_plans
    const { data: recentApps, error: searchError } = await supabase
      .from('applications')
      .select('id, financing_type, created_at, client_name, source_id')
      .eq('application_type', 'selected_plans')
      .gte('created_at', thirtyMinutesAgo)
      .not('source_id', 'is', null);
    
    if (searchError) {
      throw new Error(`Error buscando aplicaciones: ${searchError.message}`);
    }
    
    if (!recentApps || recentApps.length === 0) {
      console.log('✅ No se encontraron aplicaciones recientes de tipo selected_plans');
      return;
    }
    
    console.log(`📋 Encontradas ${recentApps.length} aplicaciones recientes de selected_plans`);
    
    let correctedCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    
    // 2. Para cada aplicación, verificar si necesita corrección
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
          skippedCount++;
          continue;
        }
        
        // Determinar el financing_type correcto
        const correctFinancingType = planData.simulation_type === 'cash' ? 'personal' : 'produto';
        
        // Verificar si necesita corrección
        if (app.financing_type === correctFinancingType) {
          console.log(`✅ Aplicación ${app.id.substring(0, 8)}... ya tiene financing_type correcto: ${app.financing_type}`);
          continue;
        }
        
        console.log(`🔧 Corrigiendo aplicación ${app.id.substring(0, 8)}...:`);
        console.log(`   Cliente: ${app.client_name || 'N/A'}`);
        console.log(`   Simulation Type: ${planData.simulation_type}`);
        console.log(`   Financing Type: ${app.financing_type} → ${correctFinancingType}`);
        console.log(`   Creada: ${app.created_at}`);
        
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
          console.log(`✅ Aplicación ${app.id.substring(0, 8)}... corregida exitosamente`);
          correctedCount++;
        }
        
      } catch (error) {
        console.error(`❌ Error procesando aplicación ${app.id.substring(0, 8)}...:`, error.message);
        errorCount++;
      }
    }
    
    // 3. Resumen final
    console.log('\n📊 RESUMEN DE CORRECCIÓN AUTOMÁTICA:');
    console.log(`   Aplicaciones encontradas: ${recentApps.length}`);
    console.log(`   Aplicaciones corregidas: ${correctedCount}`);
    console.log(`   Aplicaciones saltadas: ${skippedCount}`);
    console.log(`   Errores: ${errorCount}`);
    
    if (correctedCount > 0) {
      console.log(`🎉 Se corrigieron ${correctedCount} aplicaciones automáticamente`);
    }
    
  } catch (error) {
    console.error('❌ Error en la corrección automática:', error.message);
  }
}

/**
 * Función para ejecutar el auto-fix en bucle continuo
 */
async function startAutoFixLoop() {
  console.log('🚀 Iniciando bucle de corrección automática de financing_type');
  console.log('⏰ Se ejecutará cada 60 segundos...');
  console.log('🛑 Presiona Ctrl+C para detener\n');
  
  // Ejecutar inmediatamente
  await autoFixFinancingTypeRealtime();
  
  // Luego ejecutar cada 60 segundos
  setInterval(async () => {
    console.log(`\n⏰ ${new Date().toLocaleString()} - Ejecutando corrección automática...`);
    await autoFixFinancingTypeRealtime();
  }, 60000); // 60 segundos
}

/**
 * Función para ejecutar una sola vez (útil para testing)
 */
async function runOnce() {
  console.log('🔧 Ejecutando corrección automática una sola vez...\n');
  await autoFixFinancingTypeRealtime();
  process.exit(0);
}

// Verificar argumentos de línea de comandos
const args = process.argv.slice(2);

if (args.includes('--once')) {
  runOnce();
} else {
  startAutoFixLoop();
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
 
 