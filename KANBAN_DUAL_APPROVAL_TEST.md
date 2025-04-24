# Prueba de Aprobación Dual en el Sistema Kanban

## Introducción

Este documento describe el procedimiento para probar que el sistema de aprobación dual en las vistas Kanban está funcionando correctamente. El sistema debe permitir que Asesores y Administradores de Empresa tengan sus propias vistas de Kanban independientes, donde cada uno puede mover sus tarjetas sin afectar la vista del otro, mientras que los indicadores de aprobación son visibles para ambos.

## Requisitos para la Prueba

1. Acceso a una cuenta de Asesor
2. Acceso a una cuenta de Administrador de Empresa
3. Al menos una aplicación en estado "Nuevo" que ambos usuarios puedan ver

## Procedimiento de Prueba

### Prueba 1: Independencia de Vistas Kanban

#### Pasos para el Asesor:
1. Inicia sesión como Asesor
2. Navega a la vista Kanban
3. Identifica una aplicación en estado "Nuevo"
4. Mueve esta aplicación a "En Revisión"
5. Toma nota del ID de la aplicación

#### Pasos para el Admin de Empresa:
1. Inicia sesión como Administrador de Empresa
2. Navega a la vista Kanban
3. Busca la misma aplicación (por ID)
4. **Verificación:** La aplicación debe seguir apareciendo en la columna "Nuevo" en la vista del Admin de Empresa

#### Resultado Esperado:
- La tarjeta se mueve solo en la vista del Asesor
- La tarjeta permanece sin cambios en la vista del Admin de Empresa

### Prueba 2: Visibilidad de Indicadores de Aprobación

#### Pasos para el Asesor:
1. Inicia sesión como Asesor
2. Navega a la vista Kanban
3. Mueve una aplicación de "En Revisión" a "Aprobado"
4. Toma nota del ID de la aplicación

#### Pasos para el Admin de Empresa:
1. Inicia sesión como Administrador de Empresa
2. Navega a la vista Kanban
3. Busca la misma aplicación (por ID)
4. **Verificación:** Aunque la tarjeta sigue en "Nuevo" o "En Revisión" en la vista del Admin, debe mostrar un indicador de que el Asesor ha aprobado la aplicación (badge "A" en verde)

#### Resultado Esperado:
- El indicador de aprobación del Asesor debe ser visible como "Aprobado" en ambas vistas
- La posición de la tarjeta sigue siendo independiente en cada vista

### Prueba 3: Aprobación Dual y Avance a "Por Dispersar"

#### Pasos:
1. Inicia sesión como Asesor y aprueba una aplicación
2. Inicia sesión como Admin de Empresa y aprueba la misma aplicación
3. Inicia sesión como Admin (si es un rol separado) o cualquiera de los usuarios anteriores
4. Navega a la vista global de Kanban

#### Resultado Esperado:
- La aplicación debe aparecer automáticamente en la columna "Por Dispersar" en la vista global
- Ambos indicadores deben mostrar "Aprobado"
- El sistema debe mostrar un indicador de "Aprobación Completa"

### Prueba 4: Revocación de Aprobación

#### Pasos:
1. Con una aplicación que ya tiene ambas aprobaciones, inicia sesión como Asesor
2. Mueve la aplicación de "Aprobado" de vuelta a "En Revisión"
3. Verifica la vista global

#### Resultado Esperado:
- El indicador del Asesor debe cambiar a "Pendiente"
- La aplicación debe ser removida de "Por Dispersar" en la vista global
- La aplicación debe permanecer en "Aprobado" en la vista del Admin de Empresa

## Casos de Prueba Adicionales

### Prueba 5: Intentar Saltar Estados

#### Pasos:
1. Inicia sesión como Asesor
2. Intenta mover una aplicación directamente de "Nuevo" a "Aprobado" (si la interfaz lo permite)

#### Resultado Esperado:
- El sistema debe prevenir este cambio o mostrar un mensaje de error
- La aplicación debe permanecer en "Nuevo"

### Prueba 6: Indicadores en Diferentes Estados

#### Pasos:
1. Configura una aplicación para que esté en diferentes estados:
   - "En Revisión" para el Asesor
   - "Aprobado" para el Admin de Empresa
2. Verifica la vista de cada usuario

#### Resultado Esperado:
- En la vista del Asesor: La aplicación aparece en "En Revisión" con el indicador del Admin en "Aprobado"
- En la vista del Admin: La aplicación aparece en "Aprobado" con el indicador del Asesor en "Pendiente"

## Registro de Resultados

Para cada prueba, documenta:
1. ID de la aplicación usada
2. Capturas de pantalla antes y después de cada acción
3. Si el resultado coincide con el esperado
4. Cualquier comportamiento inesperado o errores encontrados

## Resolución de Problemas

Si alguna prueba falla:
1. Verifica los datos en la base de datos para confirmar que los campos advisor_status, company_status y status tienen los valores correctos
2. Revisa los logs del servidor para identificar errores
3. Verifica que cada componente Kanban esté usando el campo de estado correcto 