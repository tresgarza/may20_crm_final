const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://ydnygntfkrleiseuciwq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkbnlnbnRma3JsZWlzZXVjaXdxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTk5MjQwNiwiZXhwIjoyMDU1NTY4NDA2fQ.TwhEGW9DK4DTQQRquT6Z9UW8T8UjLX-hp9uKdRjWAhs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixRecentApplications(hoursBack = 2) {
  console.log(`🔧 Corrigiendo aplicaciones de las últimas ${hoursBack} horas...\n`);
  
  try {
    // Calcular fecha límite
    const timeAgo = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();
    
    // Obtener aplicaciones recientes
    const { data: recentApps, error } = await supabase
      .from('applications')
      .select('id, financing_type, source_id, created_at')
      .eq('application_type', 'selected_plans')
      .not('source_id', 'is', null)
      .gte('created_at', timeAgo)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error obteniendo aplicaciones recientes:', error);
      return;
    }

    console.log(`📋 Encontradas ${recentApps.length} aplicaciones recientes`);
    
    if (recentApps.length === 0) {
      console.log('✅ No hay aplicaciones recientes para procesar');
      return;
    }
    
    let corrected = 0;
    let alreadyCorrect = 0;
    let errors = 0;
    
    for (const app of recentApps) {
      try {
        // Obtener simulation_type del selected_plan
        const { data: planData, error: planError } = await supabase
          .from('selected_plans')
          .select('simulation_type')
          .eq('id', app.source_id)
          .single();

        if (planError || !planData) {
          console.log(`⚠️  No se pudo obtener simulation_type para ${app.id.substring(0, 8)}...`);
          errors++;
          continue;
        }

        // Determinar financing_type correcto
        const correctFinancingType = planData.simulation_type === 'cash' ? 'personal' : 'producto';
        
        if (app.financing_type !== correctFinancingType) {
          // Actualizar la aplicación
          const { error: updateError } = await supabase
            .from('applications')
            .update({ financing_type: correctFinancingType })
            .eq('id', app.id);

          if (!updateError) {
            console.log(`✅ Corregido ${app.id.substring(0, 8)}...: ${app.financing_type} → ${correctFinancingType} (${planData.simulation_type})`);
            corrected++;
          } else {
            console.log(`❌ Error actualizando ${app.id.substring(0, 8)}...:`, updateError.message);
            errors++;
          }
        } else {
          console.log(`✓ ${app.id.substring(0, 8)}... ya tiene financing_type correcto: ${app.financing_type}`);
          alreadyCorrect++;
        }
      } catch (appError) {
        console.log(`❌ Error procesando ${app.id.substring(0, 8)}...:`, appError.message);
        errors++;
      }
    }
    
    console.log('\n🎉 Corrección completada:');
    console.log(`   📊 Total procesadas: ${recentApps.length}`);
    console.log(`   ✅ Corregidas: ${corrected}`);
    console.log(`   ✓ Ya correctas: ${alreadyCorrect}`);
    console.log(`   ❌ Errores: ${errors}`);
    
    if (corrected > 0) {
      console.log('\n🚀 Se corrigieron aplicaciones recientes exitosamente');
    } else if (alreadyCorrect === recentApps.length) {
      console.log('\n✅ Todas las aplicaciones recientes ya tenían financing_type correcto');
    }

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Obtener parámetro de horas desde línea de comandos
const hoursBack = process.argv[2] ? parseInt(process.argv[2]) : 2;

if (isNaN(hoursBack) || hoursBack < 1) {
  console.log('❌ Número de horas inválido. Usando 2 horas por defecto.');
  fixRecentApplications(2);
} else {
  fixRecentApplications(hoursBack);
} 
 
 