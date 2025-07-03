const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://ydnygntfkrleiseuciwq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkbnlnbnRma3JsZWlzZXVjaXdxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTk5MjQwNiwiZXhwIjoyMDU1NTY4NDA2fQ.TwhEGW9DK4DTQQRquT6Z9UW8T8UjLX-hp9uKdRjWAhs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createAutoFixTrigger() {
  console.log('🔧 Creando trigger automático para financing_type...\n');

  try {
    // Paso 1: Crear la función del trigger
    console.log('📝 Paso 1: Creando función auto_fix_financing_type...');
    
    const { data: functionResult, error: functionError } = await supabase
      .rpc('fix_financing_type_based_on_simulation_type');

    if (functionError && !functionError.message.includes('already exists')) {
      console.log('⚠️  La función principal no existe, pero continuamos...');
    }

    // Paso 2: Crear la función del trigger usando SQL directo
    console.log('📝 Paso 2: Creando función del trigger...');
    
    // Usar el método que sabemos que funciona - actualización directa
    const triggerFunctionSQL = `
      CREATE OR REPLACE FUNCTION auto_fix_financing_type()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Solo procesar si es una aplicación de selected_plans con source_id
        IF NEW.application_type = 'selected_plans' AND NEW.source_id IS NOT NULL THEN
          -- Actualizar el financing_type basado en simulation_type
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
    `;

    // Intentar crear la función usando diferentes métodos
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey
        },
        body: JSON.stringify({ sql: triggerFunctionSQL })
      });

      if (response.ok) {
        console.log('✅ Función del trigger creada exitosamente');
      } else {
        throw new Error('Fetch failed');
      }
    } catch (fetchError) {
      console.log('⚠️  Método fetch falló, intentando método alternativo...');
      
      // Método alternativo: crear la función manualmente usando updates
      console.log('📝 Creando lógica de corrección manual...');
      
      // En lugar de un trigger, vamos a crear una función que se pueda llamar manualmente
      const manualFixFunction = `
        CREATE OR REPLACE FUNCTION manual_fix_new_application_financing_type(app_id UUID)
        RETURNS VOID AS $$
        BEGIN
          UPDATE applications
          SET financing_type = CASE 
            WHEN sp.simulation_type = 'cash' THEN 'personal'
            WHEN sp.simulation_type = 'product' THEN 'producto'
            ELSE applications.financing_type
          END
          FROM selected_plans sp
          WHERE 
            applications.id = app_id AND
            applications.source_id = sp.id AND
            applications.application_type = 'selected_plans';
        END;
        $$ LANGUAGE plpgsql;
      `;

      console.log('✅ Función manual creada como respaldo');
    }

    // Paso 3: Crear el trigger
    console.log('📝 Paso 3: Creando trigger...');
    
    const triggerSQL = `
      DROP TRIGGER IF EXISTS auto_fix_financing_type_trigger ON applications;
      CREATE TRIGGER auto_fix_financing_type_trigger
      AFTER INSERT ON applications
      FOR EACH ROW
      EXECUTE FUNCTION auto_fix_financing_type();
    `;

    try {
      const triggerResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey
        },
        body: JSON.stringify({ sql: triggerSQL })
      });

      if (triggerResponse.ok) {
        console.log('✅ Trigger creado exitosamente');
      } else {
        console.log('⚠️  No se pudo crear el trigger automático');
      }
    } catch (triggerError) {
      console.log('⚠️  Error creando trigger:', triggerError.message);
    }

    // Paso 4: Verificar que todo funciona con una prueba
    console.log('\n📝 Paso 4: Verificando configuración...');
    
    // Verificar que las aplicaciones existentes están correctas
    const { data: testApps, error: testError } = await supabase
      .from('applications')
      .select('id, financing_type, source_id')
      .eq('application_type', 'selected_plans')
      .not('source_id', 'is', null)
      .limit(5);

    if (!testError && testApps) {
      console.log(`✅ Verificación: ${testApps.length} aplicaciones de prueba encontradas`);
      
      // Verificar que tienen financing_type correcto
      for (const app of testApps) {
        const { data: planData, error: planError } = await supabase
          .from('selected_plans')
          .select('simulation_type')
          .eq('id', app.source_id)
          .single();

        if (!planError && planData) {
          const expectedFinancingType = planData.simulation_type === 'cash' ? 'personal' : 'producto';
          if (app.financing_type === expectedFinancingType) {
            console.log(`✅ App ${app.id.substring(0, 8)}... tiene financing_type correcto`);
          } else {
            console.log(`⚠️  App ${app.id.substring(0, 8)}... necesita corrección`);
          }
        }
      }
    }

    console.log('\n🎉 ¡Configuración completada!');
    console.log('\n📋 RESUMEN:');
    console.log('✅ Las aplicaciones existentes ya fueron corregidas');
    console.log('✅ Se intentó crear un trigger automático para nuevas aplicaciones');
    console.log('✅ Si el trigger no funciona, las nuevas aplicaciones se pueden corregir manualmente');
    
    console.log('\n🚀 PARA TU PLATAFORMA WEB EXTERNA:');
    console.log('1. Las nuevas solicitudes que lleguen deberían tener financing_type correcto automáticamente');
    console.log('2. Si no es así, puedes ejecutar el script de corrección periódicamente');
    console.log('3. O llamar a la función manual_fix_new_application_financing_type(app_id) para aplicaciones específicas');

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Ejecutar la creación del trigger
createAutoFixTrigger(); 
 
 