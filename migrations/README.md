# Cliente-Asesor Sincronización Automática

Este directorio contiene migraciones SQL para mantener sincronizada la base de datos.

## auto_assign_advisor_id.sql

Este script resuelve el problema donde los clientes creados por administradores de empresa no aparecen para sus asesores. Implementa:

1. Un trigger en la tabla `users` que asigna automáticamente el `advisor_id` basado en el `company_id`
2. Una actualización única para asignar asesores a clientes existentes
3. Una función RPC `sync_client_advisor_ids()` para sincronizar manualmente
4. Una versión mejorada de la función `create_client` que maneja correctamente el `advisor_id`

## Aplicación de la migración

La migración se ejecuta automáticamente de tres formas:

1. Al iniciar la aplicación (en segundo plano)
2. A través del panel de administración en `/admin` (solo superadmins)
3. Manualmente, ejecutando la función RPC `sync_client_advisor_ids()`

## Verificación

Para verificar si la migración se ha aplicado correctamente:

1. Iniciar sesión como superadmin y navegar a `/admin`
2. Ejecutar la sincronización de asesores
3. Comprobar en la base de datos que los clientes ahora tengan `advisor_id` asociado a su empresa

## Solución de problemas

Si persisten los problemas:

1. Ejecutar manualmente el script SQL en Supabase
2. Verificar que la empresa tiene un `advisor_id` asignado
3. Ejecutar consulta SQL directa:
   ```sql
   UPDATE users
   SET advisor_id = c.advisor_id
   FROM companies c
   WHERE users.company_id = c.id
     AND users.advisor_id IS NULL
     AND c.advisor_id IS NOT NULL;
   ``` 