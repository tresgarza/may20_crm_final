const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://ydnygntfkrleiseuciwq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkbnlnbnRma3JsZWlzZXVjaXdxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTk5MjQwNiwiZXhwIjoyMDU1NTY4NDA2fQ.TwhEGW9DK4DTQQRquT6Z9UW8T8UjLX-hp9uKdRjWAhs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createFixFunction() {
  console.log('🔧 Creando función para corregir financing_type...\n');

  try {
    // Crear una función que se puede llamar desde tu plataforma web externa
    console.log('📝 Creando función fix_application_financing_type...');
    
    const { data, error } = await supabase.rpc('exec', {
      sql: `
        CREATE OR REPLACE FUNCTION fix_application_financing_type(app_id UUID)
        RETURNS JSON AS $$
        DECLARE
          result JSON;
          old_financing_type TEXT;
          new_financing_type TEXT;
          simulation_type_found TEXT;
        BEGIN
          -- Obtener el financing_type actual
          SELECT financing_type INTO old_financing_type
          FROM applications 
          WHERE id = app_id;
          
          -- Si no existe la aplicación, retornar error
          IF old_financing_type IS NULL THEN
            RETURN json_build_object(
              'success', false,
              'error', 'Application not found',
              'app_id', app_id
            );
          END IF;
          
          -- Obtener el simulation_type del selected_plan correspondiente
          SELECT sp.simulation_type INTO simulation_type_found
          FROM applications a
          JOIN selected_plans sp ON a.source_id = sp.id
          WHERE a.id = app_id 
            AND a.application_type = 'selected_plans'
            AND a.source_id IS NOT NULL;
          
          -- Si no hay selected_plan asociado, no hacer nada
          IF simulation_type_found IS NULL THEN
            RETURN json_build_object(
              'success', true,
              'message', 'No selected_plan found or not a selected_plans application',
              'app_id', app_id,
              'old_financing_type', old_financing_type,
              'new_financing_type', old_financing_type
            );
          END IF;
          
          -- Determinar el nuevo financing_type
          new_financing_type := CASE 
            WHEN simulation_type_found = 'cash' THEN 'personal'
            WHEN simulation_type_found = 'product' THEN 'producto'
            ELSE old_financing_type
          END;
          
          -- Actualizar si es necesario
          IF old_financing_type != new_financing_type THEN
            UPDATE applications 
            SET financing_type = new_financing_type
            WHERE id = app_id;
            
            RETURN json_build_object(
              'success', true,
              'message', 'Financing type updated successfully',
              'app_id', app_id,
              'old_financing_type', old_financing_type,
              'new_financing_type', new_financing_type,
              'simulation_type', simulation_type_found,
              'updated', true
            );
          ELSE
            RETURN json_build_object(
              'success', true,
              'message', 'Financing type already correct',
              'app_id', app_id,
              'old_financing_type', old_financing_type,
              'new_financing_type', new_financing_type,
              'simulation_type', simulation_type_found,
              'updated', false
            );
          END IF;
          
        EXCEPTION WHEN OTHERS THEN
          RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'app_id', app_id
          );
        END;
        $$ LANGUAGE plpgsql;
      `
    });

    if (error) {
      console.log('⚠️  Error creando función:', error.message);
    } else {
      console.log('✅ Función fix_application_financing_type creada exitosamente');
    }

    // Crear también una función para procesar múltiples aplicaciones
    console.log('📝 Creando función para procesar múltiples aplicaciones...');
    
    const { data: batchData, error: batchError } = await supabase.rpc('exec', {
      sql: `
        CREATE OR REPLACE FUNCTION fix_recent_applications_financing_type(hours_back INTEGER DEFAULT 24)
        RETURNS JSON AS $$
        DECLARE
          app_record RECORD;
          fix_result JSON;
          results JSON[] := '{}';
          total_processed INTEGER := 0;
          total_updated INTEGER := 0;
        BEGIN
          -- Procesar aplicaciones recientes
          FOR app_record IN 
            SELECT id 
            FROM applications 
            WHERE application_type = 'selected_plans' 
              AND source_id IS NOT NULL
              AND created_at >= NOW() - INTERVAL '1 hour' * hours_back
            ORDER BY created_at DESC
          LOOP
            -- Llamar a la función de corrección individual
            SELECT fix_application_financing_type(app_record.id) INTO fix_result;
            
            -- Agregar resultado al array
            results := array_append(results, fix_result);
            total_processed := total_processed + 1;
            
            -- Contar actualizaciones
            IF (fix_result->>'updated')::boolean THEN
              total_updated := total_updated + 1;
            END IF;
          END LOOP;
          
          RETURN json_build_object(
            'success', true,
            'total_processed', total_processed,
            'total_updated', total_updated,
            'hours_back', hours_back,
            'results', results
          );
          
        EXCEPTION WHEN OTHERS THEN
          RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'total_processed', total_processed,
            'total_updated', total_updated
          );
        END;
        $$ LANGUAGE plpgsql;
      `
    });

    if (batchError) {
      console.log('⚠️  Error creando función batch:', batchError.message);
    } else {
      console.log('✅ Función fix_recent_applications_financing_type creada exitosamente');
    }

    // Probar las funciones
    console.log('\n📝 Probando las funciones...');
    
    // Obtener una aplicación de prueba
    const { data: testApp, error: testError } = await supabase
      .from('applications')
      .select('id')
      .eq('application_type', 'selected_plans')
      .not('source_id', 'is', null)
      .limit(1)
      .single();

    if (!testError && testApp) {
      console.log(`🧪 Probando con aplicación ${testApp.id.substring(0, 8)}...`);
      
      const { data: testResult, error: testFuncError } = await supabase
        .rpc('fix_application_financing_type', { app_id: testApp.id });

      if (!testFuncError && testResult) {
        console.log('✅ Función de prueba exitosa:', testResult);
      } else {
        console.log('⚠️  Error en prueba:', testFuncError?.message);
      }
    }

    console.log('\n🎉 ¡Funciones creadas exitosamente!');
    console.log('\n📋 INSTRUCCIONES PARA TU PLATAFORMA WEB EXTERNA:');
    console.log('\n1. OPCIÓN AUTOMÁTICA - Después de crear cada aplicación:');
    console.log('   Llama a: supabase.rpc("fix_application_financing_type", { app_id: "uuid-de-la-aplicacion" })');
    console.log('\n2. OPCIÓN BATCH - Para procesar aplicaciones recientes:');
    console.log('   Llama a: supabase.rpc("fix_recent_applications_financing_type", { hours_back: 24 })');
    console.log('\n3. EJEMPLO DE CÓDIGO PARA TU PLATAFORMA:');
    console.log(`
// Después de crear una aplicación
const { data: newApp, error } = await supabase
  .from('applications')
  .insert({ /* datos de la aplicación */ })
  .select()
  .single();

if (!error && newApp) {
  // Corregir financing_type automáticamente
  const { data: fixResult } = await supabase
    .rpc('fix_application_financing_type', { app_id: newApp.id });
  
  console.log('Financing type fix result:', fixResult);
}
    `);

    console.log('\n🚀 ¡Listo! Ahora las nuevas aplicaciones se pueden corregir automáticamente.');

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Ejecutar la creación de funciones
createFixFunction(); 
 
 