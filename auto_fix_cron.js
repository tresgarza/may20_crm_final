#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://ydnygntfkrleiseuciwq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkbnlnbnRma3JsZWlzZXVjaXdxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTk5MjQwNiwiZXhwIjoyMDU1NTY4NDA2fQ.TwhEGW9DK4DTQQRquT6Z9UW8T8UjLX-hp9uKdRjWAhs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function autoFixFinancingType() {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 🔧 Auto-corrección de financing_type iniciada`);
  
  try {
    // Procesar aplicaciones de la última hora (para cron que se ejecuta cada hora)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const { data: recentApps, error } = await supabase
      .from('applications')
      .select('id, financing_type, source_id, created_at')
      .eq('application_type', 'selected_plans')
      .not('source_id', 'is', null)
      .gte('created_at', oneHourAgo);

    if (error) {
      console.error(`[${timestamp}] ❌ Error:`, error.message);
      process.exit(1);
    }

    if (recentApps.length === 0) {
      console.log(`[${timestamp}] ✅ No hay aplicaciones recientes para procesar`);
      process.exit(0);
    }
    
    let corrected = 0;
    
    for (const app of recentApps) {
      const { data: planData, error: planError } = await supabase
        .from('selected_plans')
        .select('simulation_type')
        .eq('id', app.source_id)
        .single();

      if (!planError && planData) {
        const correctFinancingType = planData.simulation_type === 'cash' ? 'personal' : 'producto';
        
        if (app.financing_type !== correctFinancingType) {
          const { error: updateError } = await supabase
            .from('applications')
            .update({ financing_type: correctFinancingType })
            .eq('id', app.id);

          if (!updateError) {
            console.log(`[${timestamp}] ✅ Corregido ${app.id}: ${app.financing_type} → ${correctFinancingType}`);
            corrected++;
          }
        }
      }
    }
    
    console.log(`[${timestamp}] 🎉 Completado: ${corrected} aplicaciones corregidas de ${recentApps.length} procesadas`);
    process.exit(0);

  } catch (error) {
    console.error(`[${timestamp}] ❌ Error general:`, error.message);
    process.exit(1);
  }
}

// Ejecutar
autoFixFinancingType(); 
 
 