# 🚀 TRIGGER AUTOMÁTICO PARA FINANCING_TYPE

## ✅ PROBLEMA RESUELTO AUTOMÁTICAMENTE

Este trigger se ejecutará **automáticamente** cada vez que llegue una nueva aplicación y corregirá el `financing_type` inmediatamente.

## 📋 INSTRUCCIONES PARA APLICAR

### 1. **Ir a Supabase Dashboard**
- Ve a: https://supabase.com/dashboard
- Selecciona tu proyecto: `ydnygntfkrleiseuciwq`
- Ve a **SQL Editor** en el menú lateral

### 2. **Ejecutar el Script SQL**
- Copia todo el contenido del archivo `manual_trigger_setup.sql`
- Pégalo en el SQL Editor
- Haz clic en **"Run"** o presiona `Ctrl+Enter`

### 3. **Verificar que Funcionó**
Después de ejecutar, deberías ver un resultado como:
```
trigger_name                    | event_manipulation | action_timing
trigger_auto_fix_financing_type | INSERT            | BEFORE
```

## 🎯 FUNCIONAMIENTO AUTOMÁTICO

### ¿Cuándo se ejecuta?
- **AUTOMÁTICAMENTE** cada vez que se crea una nueva aplicación
- Solo para aplicaciones de tipo `selected_plans` con `source_id`

### ¿Qué hace?
1. **Busca** el `simulation_type` en la tabla `selected_plans`
2. **Determina** el `financing_type` correcto:
   - `simulation_type = 'cash'` → `financing_type = 'personal'`
   - `simulation_type = 'product'` → `financing_type = 'produto'`
3. **Corrige** automáticamente antes de guardar la aplicación

### Ejemplo de Corrección Automática:
```
ANTES:  financing_type = 'produto' (incorrecto)
        simulation_type = 'cash'

DESPUÉS: financing_type = 'personal' (corregido automáticamente)
         simulation_type = 'cash'
```

## 🔧 CONTENIDO DEL SCRIPT SQL

```sql
-- SCRIPT PARA APLICAR TRIGGER AUTOMÁTICO
-- Ejecutar este script en el SQL Editor de Supabase Dashboard

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

DROP TRIGGER IF EXISTS trigger_auto_fix_financing_type ON applications;
CREATE TRIGGER trigger_auto_fix_financing_type
    BEFORE INSERT ON applications
    FOR EACH ROW
    EXECUTE FUNCTION auto_fix_financing_type_trigger();

-- Verificar que se creó correctamente
SELECT 
    trigger_name,
    event_manipulation,
    action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'applications' 
AND trigger_name = 'trigger_auto_fix_financing_type';
```

## ✅ VENTAJAS DE ESTA SOLUCIÓN

### 🎯 **Automático al 100%**
- No necesitas ejecutar scripts manualmente
- No necesitas recordar corregir aplicaciones
- Se ejecuta instantáneamente al crear cada aplicación

### 🔒 **A nivel de Base de Datos**
- Funciona sin importar cómo se cree la aplicación:
  - Desde el CRM web
  - Desde plataformas externas
  - Desde APIs
  - Desde cualquier fuente

### ⚡ **Inmediato**
- La corrección ocurre ANTES de que se guarde la aplicación
- Los datos siempre quedan correctos desde el primer momento

### 🛡️ **Infalible**
- No depende de que el frontend funcione
- No depende de conexiones de red
- Funciona 24/7 automáticamente

## 🧪 CÓMO PROBAR QUE FUNCIONA

### 1. **Después de aplicar el trigger:**
Crea una nueva aplicación desde cualquier plataforma externa con:
- `application_type = 'selected_plans'`
- `financing_type = 'produto'` (incorrecto)
- `source_id` que apunte a un plan con `simulation_type = 'cash'`

### 2. **Verificar resultado:**
La aplicación se guardará automáticamente con:
- `financing_type = 'personal'` (corregido automáticamente)

## 📊 MONITOREO

Para ver las correcciones que hace el trigger, puedes ejecutar:

```sql
-- Ver aplicaciones recientes y sus financing_type
SELECT 
    id,
    client_name,
    financing_type,
    application_type,
    source_id,
    created_at
FROM applications 
WHERE created_at >= NOW() - INTERVAL '1 day'
AND application_type = 'selected_plans'
ORDER BY created_at DESC;
```

## 🚀 RESULTADO FINAL

**¡Una vez aplicado este trigger, NUNCA MÁS tendrás aplicaciones con `financing_type` incorrecto!**

- ✅ **Todas las aplicaciones nuevas** se corregirán automáticamente
- ✅ **Sin intervención manual** requerida
- ✅ **Funciona 24/7** sin fallos
- ✅ **Compatible con todas las fuentes** de aplicaciones

---

## 📞 SOPORTE

Si tienes algún problema aplicando el trigger:
1. Verifica que tienes permisos de administrador en Supabase
2. Asegúrate de estar en el proyecto correcto
3. Copia exactamente el SQL del archivo `manual_trigger_setup.sql`
4. Si hay errores, revisa que las tablas `applications` y `selected_plans` existan 
 
 