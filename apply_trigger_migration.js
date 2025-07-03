const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Configuración de Supabase
const supabaseUrl = 'https://ydnygntfkrleiseuciwq.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkbnlnbnRma3JsZWlzZXVjaXdxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTk5MjQwNiwiZXhwIjoyMDU1NTY4NDA2fQ.TwhEGW9DK4DTQQRquT6Z9UW8T8UjLX-hp9uKdRjWAhs';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyTriggerMigration() {
  console.log('🚀 Aplicando migración del trigger automático...\n');
  
  try {
    // Leer el contenido SQL del trigger
    const sqlContent = fs.readFileSync('create_automatic_trigger.sql', 'utf8');
    
    // Dividir en statements individuales y ejecutar uno por uno
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.startsWith('SELECT'));
    
    console.log(`📋 Ejecutando ${statements.length} statements SQL...\n`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`${i + 1}/${statements.length}: ${statement.substring(0, 80)}...`);
        
        try {
          // Usar el método de aplicación de migración de Supabase
          const { data, error } = await supabase
            .from('_migrations_placeholder')
            .select('*')
            .limit(0);
          
          // Como no podemos ejecutar SQL directamente, vamos a usar una aproximación diferente
          // Vamos a aplicar la migración usando el método de Supabase para migraciones
          
          console.log('   ⚠️  Ejecución directa no disponible, usando método alternativo...');
          break;
          
        } catch (error) {
          console.log(`   ❌ Error: ${error.message}`);
        }
      }
    }
    
    // Método alternativo: usar la API de migraciones de Supabase
    console.log('\n🔄 Aplicando migración usando método alternativo...');
    
    // Crear el trigger usando múltiples llamadas
    await createTriggerFunctions();
    
  } catch (error) {
    console.error('❌ Error aplicando migración:', error);
  }
}

async function createTriggerFunctions() {
  console.log('🔧 Creando funciones y triggers...');
  
  try {
    // 1. Crear la función del trigger para INSERT
    console.log('1. Creando función para trigger de INSERT...');
    
    const insertTriggerFunction = `
      CREATE OR REPLACE FUNCTION auto_fix_financing_type_trigger()
      RETURNS TRIGGER AS $$
      DECLARE
          plan_simulation_type TEXT;
          correct_financing_type TEXT;
      BEGIN
          IF NEW.application_type = 'selected_plans' AND NEW.source_id IS NOT NULL THEN
              SELECT simulation_type INTO plan_simulation_type
              FROM selected_plans 
              WHERE id = NEW.source_id;
              
              IF plan_simulation_type IS NOT NULL THEN
                  IF plan_simulation_type = 'cash' THEN
                      correct_financing_type := 'personal';
                  ELSE
                      correct_financing_type := 'produto';
                  END IF;
                  
                  IF NEW.financing_type != correct_financing_type THEN
                      NEW.financing_type := correct_financing_type;
                  END IF;
              END IF;
          END IF;
          
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    // Intentar ejecutar usando una función RPC personalizada
    try {
      const { data, error } = await supabase.rpc('execute_sql', {
        query: insertTriggerFunction
      });
      
      if (error) {
        console.log('   ⚠️  RPC execute_sql no disponible');
      } else {
        console.log('   ✅ Función de trigger creada');
      }
    } catch (e) {
      console.log('   ⚠️  Método RPC no disponible');
    }
    
    // 2. Crear el trigger
    console.log('2. Creando trigger de INSERT...');
    
    const createTrigger = `
      DROP TRIGGER IF EXISTS trigger_auto_fix_financing_type ON applications;
      CREATE TRIGGER trigger_auto_fix_financing_type
          BEFORE INSERT ON applications
          FOR EACH ROW
          EXECUTE FUNCTION auto_fix_financing_type_trigger();
    `;
    
    // Como no podemos ejecutar SQL directamente, vamos a crear una solución alternativa
    console.log('⚠️  No se puede ejecutar SQL directamente desde la API de Supabase');
    console.log('📝 Creando script SQL para ejecutar manualmente...');
    
    // Crear un script SQL completo para ejecutar manualmente
    const completeSql = `
-- SCRIPT PARA APLICAR TRIGGER AUTOMÁTICO
-- Ejecutar este script en el SQL Editor de Supabase Dashboard

${insertTriggerFunction}

${createTrigger}

-- Verificar que se creó correctamente
SELECT 
    trigger_name,
    event_manipulation,
    action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'applications' 
AND trigger_name = 'trigger_auto_fix_financing_type';
`;
    
    fs.writeFileSync('manual_trigger_setup.sql', completeSql);
    console.log('✅ Script creado: manual_trigger_setup.sql');
    
    return true;
    
  } catch (error) {
    console.error('❌ Error creando funciones:', error);
    return false;
  }
}

async function testTriggerExists() {
  console.log('\n🧪 Verificando si el trigger existe...');
  
  try {
    // Intentar verificar triggers usando una consulta a information_schema
    const { data, error } = await supabase
      .from('information_schema.triggers')
      .select('trigger_name, event_manipulation, action_timing')
      .eq('event_object_table', 'applications')
      .eq('trigger_name', 'trigger_auto_fix_financing_type');
    
    if (error) {
      console.log('⚠️  No se puede verificar triggers desde la API (esto es normal)');
      console.log('📝 Para verificar manualmente, ejecuta en Supabase Dashboard:');
      console.log(`
SELECT 
    trigger_name,
    event_manipulation,
    action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'applications' 
AND trigger_name = 'trigger_auto_fix_financing_type';
      `);
    } else if (data && data.length > 0) {
      console.log('✅ Trigger encontrado:');
      data.forEach(trigger => {
        console.log(`   - ${trigger.trigger_name} (${trigger.action_timing} ${trigger.event_manipulation})`);
      });
    } else {
      console.log('⚠️  Trigger no encontrado. Ejecuta el script manual_trigger_setup.sql');
    }
    
  } catch (error) {
    console.log('⚠️  Error verificando trigger:', error.message);
  }
}

async function main() {
  console.log('🔧 APLICACIÓN DE TRIGGER AUTOMÁTICO PARA FINANCING_TYPE');
  console.log('='.repeat(60));
  
  await applyTriggerMigration();
  await testTriggerExists();
  
  console.log('\n📋 INSTRUCCIONES FINALES:');
  console.log('1. ✅ Script SQL creado: manual_trigger_setup.sql');
  console.log('2. 🌐 Ve a Supabase Dashboard > SQL Editor');
  console.log('3. 📄 Copia y pega el contenido de manual_trigger_setup.sql');
  console.log('4. ▶️  Ejecuta el script');
  console.log('5. ✅ El trigger se aplicará automáticamente');
  
  console.log('\n💡 FUNCIONAMIENTO:');
  console.log('🎯 Cada vez que se cree una nueva aplicación:');
  console.log('   - Si es tipo "selected_plans" con source_id');
  console.log('   - Busca el simulation_type en selected_plans');
  console.log('   - Corrige financing_type automáticamente:');
  console.log('     • cash → personal');
  console.log('     • product → produto');
  
  console.log('\n🚀 ¡Una vez aplicado, todas las nuevas aplicaciones se corregirán automáticamente!');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { applyTriggerMigration, testTriggerExists }; 
 
 