# Solución para Corregir financing_type en Nuevas Aplicaciones

## Problema Identificado
Las nuevas solicitudes que llegan desde tu plataforma web externa a Supabase no tienen el `financing_type` correcto. Necesitamos asegurar que:
- `simulation_type = 'cash'` → `financing_type = 'personal'`
- `simulation_type = 'product'` → `financing_type = 'producto'`

## Estado Actual
✅ **Las aplicaciones existentes ya fueron corregidas** (100% exitoso)
✅ **El script de corrección funciona perfectamente**

## 3 Soluciones para Nuevas Aplicaciones

### OPCIÓN 1: Corrección Automática en tu Plataforma Web (RECOMENDADA)

Modifica tu plataforma web externa para que cuando cree una nueva aplicación, también corrija automáticamente el `financing_type`.

**Código para agregar a tu plataforma web:**

```javascript
// Después de crear una aplicación en tu plataforma web
async function createApplicationWithCorrectFinancingType(applicationData) {
  try {
    // 1. Crear la aplicación normalmente
    const { data: newApp, error: createError } = await supabase
      .from('applications')
      .insert(applicationData)
      .select()
      .single();

    if (createError) throw createError;

    // 2. Si es una aplicación de selected_plans, corregir financing_type
    if (newApp.application_type === 'selected_plans' && newApp.source_id) {
      // Obtener el simulation_type del selected_plan
      const { data: planData, error: planError } = await supabase
        .from('selected_plans')
        .select('simulation_type')
        .eq('id', newApp.source_id)
        .single();

      if (!planError && planData) {
        const correctFinancingType = planData.simulation_type === 'cash' ? 'personal' : 'producto';
        
        // Actualizar si es necesario
        if (newApp.financing_type !== correctFinancingType) {
          const { error: updateError } = await supabase
            .from('applications')
            .update({ financing_type: correctFinancingType })
            .eq('id', newApp.id);

          if (!updateError) {
            console.log(`✅ Financing type corregido: ${newApp.financing_type} → ${correctFinancingType}`);
          }
        }
      }
    }

    return newApp;
  } catch (error) {
    console.error('Error creando aplicación:', error);
    throw error;
  }
}
```

### OPCIÓN 2: Script de Corrección Periódica (AUTOMÁTICA)

Ejecuta el script de corrección cada cierto tiempo para procesar aplicaciones recientes.

**Crear un cron job o tarea programada:**

```bash
# Ejecutar cada 30 minutos
*/30 * * * * cd /ruta/a/tu/proyecto && node run_financing_type_fix.js

# O ejecutar cada hora
0 * * * * cd /ruta/a/tu/proyecto && node run_financing_type_fix.js
```

**O crear un script específico para aplicaciones recientes:**

```javascript
// fix_recent_applications.js
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ydnygntfkrleiseuciwq.supabase.co';
const supabaseKey = 'tu-service-role-key';
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixRecentApplications() {
  console.log('🔧 Corrigiendo aplicaciones de las últimas 2 horas...');
  
  // Obtener aplicaciones creadas en las últimas 2 horas
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  
  const { data: recentApps, error } = await supabase
    .from('applications')
    .select('id, financing_type, source_id')
    .eq('application_type', 'selected_plans')
    .not('source_id', 'is', null)
    .gte('created_at', twoHoursAgo);

  if (error) {
    console.error('Error obteniendo aplicaciones recientes:', error);
    return;
  }

  console.log(`📋 Encontradas ${recentApps.length} aplicaciones recientes`);
  
  let corrected = 0;
  
  for (const app of recentApps) {
    // Obtener simulation_type
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
          console.log(`✅ Corregido ${app.id.substring(0, 8)}...: ${app.financing_type} → ${correctFinancingType}`);
          corrected++;
        }
      }
    }
  }
  
  console.log(`🎉 Corrección completada: ${corrected} aplicaciones actualizadas`);
}

// Ejecutar
fixRecentApplications();
```

### OPCIÓN 3: Webhook o Función Edge (AVANZADA)

Crear una función Edge de Supabase que se ejecute automáticamente cuando se inserte una nueva aplicación.

**Crear función Edge:**

```sql
-- En el dashboard de Supabase, crear una función Edge
CREATE OR REPLACE FUNCTION handle_new_application()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo procesar aplicaciones de selected_plans
  IF NEW.application_type = 'selected_plans' AND NEW.source_id IS NOT NULL THEN
    -- Actualizar financing_type basado en simulation_type
    UPDATE applications
    SET financing_type = CASE 
      WHEN sp.simulation_type = 'cash' THEN 'personal'
      WHEN sp.simulation_type = 'product' THEN 'producto'
      ELSE NEW.financing_type
    END
    FROM selected_plans sp
    WHERE applications.id = NEW.id AND sp.id = NEW.source_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger
CREATE TRIGGER auto_fix_financing_type_trigger
AFTER INSERT ON applications
FOR EACH ROW
EXECUTE FUNCTION handle_new_application();
```

## Recomendación Final

**Te recomiendo la OPCIÓN 1** porque:
1. ✅ Es la más confiable
2. ✅ Se ejecuta inmediatamente cuando creas la aplicación
3. ✅ No depende de triggers de base de datos
4. ✅ Tienes control total desde tu código
5. ✅ Es fácil de debuggear y mantener

## Código Listo para Implementar

Aquí tienes el código exacto que puedes agregar a tu plataforma web:

```javascript
// Función helper para corregir financing_type
async function ensureCorrectFinancingType(applicationId, sourceId) {
  if (!sourceId) return;
  
  try {
    // Obtener simulation_type del selected_plan
    const { data: planData, error: planError } = await supabase
      .from('selected_plans')
      .select('simulation_type')
      .eq('id', sourceId)
      .single();

    if (planError || !planData) return;

    // Determinar financing_type correcto
    const correctFinancingType = planData.simulation_type === 'cash' ? 'personal' : 'producto';
    
    // Actualizar la aplicación
    const { error: updateError } = await supabase
      .from('applications')
      .update({ financing_type: correctFinancingType })
      .eq('id', applicationId);

    if (!updateError) {
      console.log(`✅ Financing type corregido para ${applicationId}: ${correctFinancingType}`);
    }
  } catch (error) {
    console.error('Error corrigiendo financing_type:', error);
  }
}

// Usar después de crear cualquier aplicación
async function createApplication(applicationData) {
  const { data: newApp, error } = await supabase
    .from('applications')
    .insert(applicationData)
    .select()
    .single();

  if (!error && newApp) {
    // Corregir financing_type automáticamente
    await ensureCorrectFinancingType(newApp.id, newApp.source_id);
  }

  return { data: newApp, error };
}
```

## Verificación

Para verificar que todo funciona, puedes ejecutar:

```bash
node run_financing_type_fix.js
```

Este script te mostrará si hay aplicaciones con financing_type incorrecto.

---

**¡Con cualquiera de estas opciones, las nuevas solicitudes tendrán el financing_type correcto automáticamente!** 
 
 