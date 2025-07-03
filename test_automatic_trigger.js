const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://ydnygntfkrleiseuciwq.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkbnlnbnRma3JsZWlzZXVjaXdxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTk5MjQwNiwiZXhwIjoyMDU1NTY4NDA2fQ.TwhEGW9DK4DTQQRquT6Z9UW8T8UjLX-hp9uKdRjWAhs';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testAutomaticTrigger() {
  console.log('🧪 PROBANDO TRIGGER AUTOMÁTICO DE FINANCING_TYPE');
  console.log('='.repeat(55));
  
  try {
    // 1. Verificar que el trigger existe
    console.log('1. 🔍 Verificando que el trigger existe...');
    
    const { data: triggers, error: triggerError } = await supabase
      .rpc('check_trigger_exists', {
        trigger_name: 'trigger_auto_fix_financing_type'
      });
    
    if (triggerError) {
      console.log('   ⚠️  No se puede verificar trigger automáticamente');
      console.log('   📝 Verifica manualmente en Supabase Dashboard con:');
      console.log(`
SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'applications' 
AND trigger_name = 'trigger_auto_fix_financing_type';
      `);
    }
    
    // 2. Buscar un selected_plan con simulation_type = 'cash' para la prueba
    console.log('\n2. 🔍 Buscando un plan con simulation_type = "cash"...');
    
    const { data: cashPlans, error: planError } = await supabase
      .from('selected_plans')
      .select('id, simulation_type')
      .eq('simulation_type', 'cash')
      .limit(1);
    
    if (planError || !cashPlans || cashPlans.length === 0) {
      console.log('   ❌ No se encontraron planes con simulation_type = "cash"');
      console.log('   📝 Creando un plan de prueba...');
      
      // Crear un plan de prueba
      const { data: newPlan, error: createError } = await supabase
        .from('selected_plans')
        .insert({
          simulation_type: 'cash',
          amount: 10000,
          term: 12,
          interest_rate: 45,
          monthly_payment: 1000,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (createError) {
        console.log('   ❌ Error creando plan de prueba:', createError.message);
        return;
      }
      
      console.log(`   ✅ Plan de prueba creado: ${newPlan.id}`);
      cashPlans.push(newPlan);
    } else {
      console.log(`   ✅ Plan encontrado: ${cashPlans[0].id} (simulation_type: ${cashPlans[0].simulation_type})`);
    }
    
    const testPlan = cashPlans[0];
    
    // 3. Crear una aplicación de prueba con financing_type INCORRECTO
    console.log('\n3. 🧪 Creando aplicación de prueba...');
    console.log(`   📋 Plan ID: ${testPlan.id}`);
    console.log(`   📋 simulation_type: ${testPlan.simulation_type}`);
    console.log(`   📋 financing_type inicial: "produto" (INCORRECTO)`);
    console.log(`   📋 financing_type esperado: "personal" (CORRECTO)`);
    
    const testApplication = {
      application_type: 'selected_plans',
      source_id: testPlan.id,
      financing_type: 'produto', // INCORRECTO a propósito
      amount: 10000,
      term: 12,
      client_name: 'Cliente Prueba Trigger',
      client_email: 'prueba.trigger@test.com',
      client_phone: '5555555555',
      status: 'new',
      created_at: new Date().toISOString()
    };
    
    console.log('\n   🚀 Insertando aplicación (el trigger debería corregir automáticamente)...');
    
    const { data: createdApp, error: appError } = await supabase
      .from('applications')
      .insert(testApplication)
      .select()
      .single();
    
    if (appError) {
      console.log('   ❌ Error creando aplicación:', appError.message);
      return;
    }
    
    console.log(`   ✅ Aplicación creada: ${createdApp.id}`);
    
    // 4. Verificar el resultado
    console.log('\n4. 🔍 Verificando resultado del trigger...');
    
    const finalFinancingType = createdApp.financing_type;
    
    console.log(`   📊 financing_type final: "${finalFinancingType}"`);
    
    if (finalFinancingType === 'personal') {
      console.log('   ✅ ¡TRIGGER FUNCIONÓ CORRECTAMENTE!');
      console.log('   🎯 financing_type corregido automáticamente: "produto" → "personal"');
    } else if (finalFinancingType === 'produto') {
      console.log('   ❌ TRIGGER NO FUNCIONÓ');
      console.log('   ⚠️  financing_type no fue corregido (sigue siendo "produto")');
      console.log('   📝 Verifica que el trigger se aplicó correctamente en Supabase Dashboard');
    } else {
      console.log(`   ⚠️  Resultado inesperado: financing_type = "${finalFinancingType}"`);
    }
    
    // 5. Limpiar datos de prueba
    console.log('\n5. 🧹 Limpiando datos de prueba...');
    
    const { error: deleteError } = await supabase
      .from('applications')
      .delete()
      .eq('id', createdApp.id);
    
    if (deleteError) {
      console.log(`   ⚠️  No se pudo eliminar aplicación de prueba: ${createdApp.id}`);
    } else {
      console.log('   ✅ Aplicación de prueba eliminada');
    }
    
    // 6. Resumen final
    console.log('\n📋 RESUMEN DE LA PRUEBA:');
    console.log('='.repeat(30));
    
    if (finalFinancingType === 'personal') {
      console.log('✅ TRIGGER AUTOMÁTICO FUNCIONANDO CORRECTAMENTE');
      console.log('🎯 Las nuevas aplicaciones se corregirán automáticamente');
      console.log('🚀 ¡El problema está resuelto!');
    } else {
      console.log('❌ TRIGGER NO ESTÁ FUNCIONANDO');
      console.log('📝 Necesitas aplicar el script manual_trigger_setup.sql');
      console.log('🌐 Ve a Supabase Dashboard > SQL Editor');
    }
    
  } catch (error) {
    console.error('❌ Error durante la prueba:', error);
  }
}

async function checkRecentApplications() {
  console.log('\n📊 VERIFICANDO APLICACIONES RECIENTES...');
  
  try {
    const { data: recentApps, error } = await supabase
      .from('applications')
      .select('id, client_name, financing_type, application_type, source_id, created_at')
      .eq('application_type', 'selected_plans')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) {
      console.log('❌ Error obteniendo aplicaciones recientes:', error.message);
      return;
    }
    
    if (!recentApps || recentApps.length === 0) {
      console.log('📝 No hay aplicaciones recientes en las últimas 24 horas');
      return;
    }
    
    console.log(`📋 ${recentApps.length} aplicaciones recientes encontradas:`);
    console.log('');
    
    recentApps.forEach((app, index) => {
      const time = new Date(app.created_at).toLocaleString();
      console.log(`${index + 1}. ${app.client_name || 'Sin nombre'}`);
      console.log(`   ID: ${app.id.substring(0, 8)}...`);
      console.log(`   financing_type: ${app.financing_type}`);
      console.log(`   Creada: ${time}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error verificando aplicaciones recientes:', error);
  }
}

async function main() {
  await testAutomaticTrigger();
  await checkRecentApplications();
  
  console.log('\n💡 PRÓXIMOS PASOS:');
  console.log('1. Si el trigger no funciona, aplica manual_trigger_setup.sql');
  console.log('2. Una vez funcionando, todas las nuevas aplicaciones se corregirán automáticamente');
  console.log('3. No necesitarás ejecutar más scripts manuales');
  console.log('4. El problema estará resuelto permanentemente');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testAutomaticTrigger, checkRecentApplications }; 
 
 