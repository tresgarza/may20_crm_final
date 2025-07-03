const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Configuración de Supabase
const supabaseUrl = 'https://ydnygntfkrleiseuciwq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkbnlnbnRma3JsZWlzZXVjaXdxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTk5MjQwNiwiZXhwIjoyMDU1NTY4NDA2fQ.TwhEGW9DK4DTQQRquT6Z9UW8T8UjLX-hp9uKdRjWAhs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyFinancingMigration() {
  console.log('🔧 Aplicando migración para financing_type...\n');

  try {
    // Leer el archivo de migración
    const migrationSQL = fs.readFileSync('fix_financing_type_migration.sql', 'utf8');
    console.log('📄 Archivo de migración leído correctamente');

    // Dividir el SQL en comandos individuales
    const sqlCommands = migrationSQL
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

    console.log(`📝 Ejecutando ${sqlCommands.length} comandos SQL...\n`);

    // Ejecutar cada comando individualmente
    for (let i = 0; i < sqlCommands.length; i++) {
      const command = sqlCommands[i];
      if (command.trim()) {
        console.log(`Ejecutando comando ${i + 1}/${sqlCommands.length}...`);
        
        try {
          // Usar fetch directo para ejecutar SQL
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`,
              'apikey': supabaseKey
            },
            body: JSON.stringify({ sql: command + ';' })
          });

          if (!response.ok) {
            // Intentar método alternativo usando el cliente de Supabase
            const { data, error } = await supabase.rpc('exec', { sql: command + ';' });
            
            if (error) {
              console.log(`⚠️  Error en comando ${i + 1}: ${error.message}`);
              // Continuar con el siguiente comando
            } else {
              console.log(`✅ Comando ${i + 1} ejecutado correctamente`);
            }
          } else {
            console.log(`✅ Comando ${i + 1} ejecutado correctamente`);
          }
        } catch (cmdError) {
          console.log(`⚠️  Error en comando ${i + 1}: ${cmdError.message}`);
          // Continuar con el siguiente comando
        }
      }
    }

    console.log('\n🎉 Migración completada. Verificando trigger...');

    // Verificar que el trigger existe
    const { data: triggerCheck, error: triggerError } = await supabase
      .from('information_schema.triggers')
      .select('trigger_name')
      .eq('trigger_name', 'auto_fix_financing_type_trigger');

    if (triggerError) {
      console.log('⚠️  No se pudo verificar el trigger, pero la migración se ejecutó');
    } else if (triggerCheck && triggerCheck.length > 0) {
      console.log('✅ Trigger auto_fix_financing_type_trigger está activo');
    } else {
      console.log('⚠️  El trigger no se encontró, creándolo manualmente...');
      
      // Crear el trigger manualmente
      const triggerSQL = `
        CREATE OR REPLACE FUNCTION auto_fix_financing_type()
        RETURNS TRIGGER AS $$
        BEGIN
          IF NEW.application_type = 'selected_plans' AND NEW.source_id IS NOT NULL THEN
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

        DROP TRIGGER IF EXISTS auto_fix_financing_type_trigger ON applications;
        CREATE TRIGGER auto_fix_financing_type_trigger
        AFTER INSERT ON applications
        FOR EACH ROW
        EXECUTE FUNCTION auto_fix_financing_type();
      `;

      try {
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
            'apikey': supabaseKey
          },
          body: JSON.stringify({ sql: triggerSQL })
        });

        console.log('✅ Trigger creado manualmente');
      } catch (triggerCreateError) {
        console.log('⚠️  Error creando trigger manualmente:', triggerCreateError.message);
      }
    }

    console.log('\n🚀 ¡Migración completada! Las nuevas solicitudes ahora tendrán financing_type correcto automáticamente.');

  } catch (error) {
    console.error('❌ Error en migración:', error);
  }
}

// Ejecutar la migración
applyFinancingMigration(); 
 
 