# Historias de Usuario para el Tablero Kanban

## Checklist de Implementación y QA Testing

- [x] **Historia 1:** Visualización del Tablero Kanban - *Completado*
  - [x] Columnas para todos los estados configuradas correctamente
  - [x] Tarjetas muestran la información requerida
  - [x] Colores según el estado aplicados correctamente
  - [x] Actualización automática/manual funcionando
  - [x] Contador de solicitudes por columna visible
  - [x] Búsqueda y filtros operando correctamente

- [x] **Historia 2:** Arrastrar y Soltar en el Tablero Kanban - *Completado*
  - [x] Funcionalidad drag & drop implementada
  - [x] Actualización de estado en BD al mover tarjetas
  - [x] Restricciones de transiciones de estado implementadas
  - [x] Validación de permisos para mover tarjetas
  - [x] Vista previa durante el arrastre
  - [x] Confirmación visual de cambio completado
  - [x] Manejo de errores funcionando

- [x] **Historia 3:** Aprobación de Solicitudes por Asesor - *Completado*
  - [x] Validación de permisos de aprobación
  - [x] Actualización correcta de `approved_by_advisor`
  - [x] Registro de fecha/hora de aprobación
  - [x] Indicador visual de aprobación
  - [x] Lógica de movimiento a "Por Dispersar" si ambos aprobaron
  - [x] Registro en historial funcionando

- [x] **Historia 4:** Marcar Solicitudes como "Por Dispersar" - *Completado*
  - [x] Validación de aprobaciones dual antes de permitir estado
  - [x] Restricción a usuarios con rol de asesor
  - [x] Actualización de estado en BD
  - [x] Indicador visual claro del estado
  - [x] Manejo de errores implementado

- [x] **Historia 5:** Marcar Solicitudes como Completadas - *Completado*
  - [x] Validación de estado previo "Por Dispersar"
  - [x] Actualización de estado en BD
  - [x] Registro de fecha/hora de finalización
  - [x] Indicador visual de completado
  - [x] Manejo de errores funcionando

- [x] **Historia 6:** Rechazar Solicitudes - *Completado*
  - [x] Funcionalidad de rechazo implementada
  - [x] Captura de motivo de rechazo
  - [x] Indicador visual de rechazo
  - [x] Validación de permisos
  - [x] Registro en historial de solicitud

- [x] **Historia 7:** Indicadores de Aprobación Dual - *Completado*
  - [x] Indicadores visuales para asesor y empresa
  - [x] Coloración intuitiva implementada
  - [x] Tooltips con información adicional
  - [x] Indicación especial cuando ambos aprueban
  - [x] Indicador claro de rechazo

- [x] **Historia 8:** Restricciones de Permisos en el Tablero Kanban - *Completado*
  - [x] Restricción de asesores a sus solicitudes asignadas
  - [x] Restricción de administradores a su propia empresa
  - [x] Restricción de "Por Dispersar" solo a asesores
  - [x] Desactivación visual de acciones no permitidas
  - [x] Mensajes claros para acciones no autorizadas
  - [x] Validación de permisos en frontend y backend

- [x] **Historia 9:** Historial de Cambios de Estado - *Completado*
  - [x] Registro de cada cambio de estado
  - [x] Visualización accesible del historial
  - [x] Información completa de cada cambio
  - [x] Ordenamiento cronológico
  - [x] Filtros de búsqueda en historial

- [ ] **Historia 10:** Notificaciones de Cambios de Estado - *En progreso*
  - [x] Notificaciones para asesores implementadas
  - [x] Notificaciones para administradores implementadas
  - [ ] Notificaciones en tiempo real
  - [x] Información completa en notificaciones
  - [ ] Sistema para marcar como leídas
  - [ ] Centro de notificaciones

- [x] **Historia 11:** Optimización de Rendimiento del Tablero Kanban - *Completado*
  - [x] Tiempo de carga < 3 segundos
  - [x] Operaciones drag & drop fluidas
  - [x] Actualizaciones de estado rápidas
  - [x] Implementación de paginación/carga diferida
  - [x] Optimización de filtrado y búsqueda
  - [x] Sistema de caché implementado
  - [x] Manejo de desconexiones

- [x] **Historia 12:** Manejo de Errores en el Tablero Kanban - *Completado*
  - [x] Mensajes de error claros y descriptivos
  - [x] Manejo de errores de conexión
  - [x] Comportamiento adecuado en fallos de drag & drop
  - [x] Mensajes específicos para errores de permisos
  - [x] Registro de errores para análisis técnico
  - [x] Mecanismos de recuperación automática

- [ ] **Historia 13:** Exportación de Datos del Tablero Kanban - *En progreso*
  - [x] Exportación a formatos comunes
  - [x] Inclusión de datos relevantes
  - [x] Selección de columnas a exportar
  - [ ] Respeto de filtros actuales
  - [ ] Formato claro en archivos exportados
  - [ ] Indicador de progreso para exportaciones grandes

- [x] **Historia 14:** Vista Móvil del Tablero Kanban - *Completado*
  - [x] Funcionalidad completa en dispositivos móviles
  - [x] Diseño responsivo implementado
  - [x] Deslizamiento horizontal para ver columnas
  - [x] Gestos táctiles para drag & drop
  - [x] Elementos de tamaño adecuado para uso táctil
  - [x] Optimización para conexiones móviles

## 1. Visualización del Tablero Kanban
**Como** asesor financiero  
**Quiero** visualizar todas las solicitudes en un tablero Kanban con columnas que representen los diferentes estados  
**Para** poder tener una visión general del estado de todas las solicitudes y gestionar su flujo de trabajo de manera eficiente

### Criterios de Aceptación
1. El tablero debe mostrar columnas para los siguientes estados:
   - Nuevo
   - En Revisión
   - Aprobado por mí (Asesor)
   - Por Dispersar (solo para asesores)
   - Completado
   - Expirado
2. Cada tarjeta de solicitud debe mostrar:
   - Nombre del cliente
   - Empresa asociada
   - Tipo de producto
   - Monto
   - Fecha de creación
   - Indicadores visuales de aprobación (asesor/empresa)
3. Las tarjetas deben colorearse según su estado actual:
   - Amarillo para pendiente/nuevo
   - Púrpura/rosa para en revisión
   - Verde para aprobado
   - Rojo para rechazado
   - Azul para completado
4. El tablero debe actualizarse automáticamente cada 30 segundos o permitir una actualización manual
5. Debe haber un contador que muestre el número de solicitudes en cada columna
6. El sistema debe permitir buscar y filtrar solicitudes en el tablero

## 2. Arrastrar y Soltar en el Tablero Kanban
**Como** asesor financiero  
**Quiero** poder arrastrar y soltar tarjetas entre las diferentes columnas del tablero Kanban  
**Para** cambiar fácilmente el estado de las solicitudes y gestionar su progreso

### Criterios de Aceptación
1. Las tarjetas deben ser arrastrables entre columnas cuando el usuario tiene permisos para realizar el cambio de estado
2. Al arrastrar una tarjeta a una nueva columna, se debe actualizar automáticamente el estado de la solicitud en la base de datos
3. Solo se deben permitir transiciones de estado válidas según el flujo de trabajo definido:
   - Nuevo → En Revisión
   - En Revisión → Aprobado por asesor o Rechazado
   - Aprobado por asesor → Por Dispersar (solo si empresa ya aprobó)
   - Por Dispersar → Completado
4. Si el usuario no tiene permisos para mover una tarjeta a una columna específica, la interfaz debe mostrar una indicación visual (cursor no permitido)
5. Durante el arrastre, debe mostrarse una visualización de vista previa de la tarjeta en la columna destino
6. Se debe mostrar una confirmación visual cuando el cambio de estado se ha completado exitosamente
7. En caso de error al actualizar el estado, se debe mostrar un mensaje de error claro y la tarjeta debe volver a su columna original

## 3. Aprobación de Solicitudes por Asesor
**Como** asesor financiero  
**Quiero** poder aprobar solicitudes moviendo las tarjetas a la columna "Aprobado por mí"  
**Para** indicar que he revisado y aprobado la solicitud, avanzando en el flujo de aprobación

### Criterios de Aceptación
1. Solo los asesores asignados a una solicitud específica pueden aprobarla
2. Al aprobar una solicitud, se debe actualizar el campo `approved_by_advisor` a `true` en la base de datos
3. También se debe registrar la fecha y hora de aprobación en el campo `approval_date_advisor`
4. La interfaz debe mostrar un indicador visual claro de que la solicitud ha sido aprobada por el asesor
5. Si la empresa ya ha aprobado la solicitud, ésta debe poder moverse a "Por Dispersar"
6. El sistema debe validar que el asesor tiene permisos para aprobar la solicitud específica
7. En caso de error al aprobar, se debe mostrar un mensaje descriptivo y la solicitud debe permanecer en su estado original
8. Se debe registrar la acción de aprobación en el historial de la solicitud

## 4. Marcar Solicitudes como "Por Dispersar"
**Como** asesor financiero  
**Quiero** poder marcar las solicitudes aprobadas como "Por Dispersar"  
**Para** indicar que están listas para el siguiente paso en el proceso de desembolso

### Criterios de Aceptación
1. Solo las solicitudes aprobadas tanto por el asesor como por la empresa pueden marcarse como "Por Dispersar"
2. Solo los asesores (no los administradores de empresa) pueden mover solicitudes a "Por Dispersar"
3. Al marcar una solicitud como "Por Dispersar", se debe actualizar su estado en la base de datos
4. El sistema debe validar que ambas aprobaciones (asesor y empresa) estén registradas antes de permitir este cambio
5. La interfaz debe mostrar un indicador visual claro del nuevo estado "Por Dispersar"
6. Las solicitudes en estado "Por Dispersar" deben diferenciarse visualmente de las otras (color diferente, icono, etc.)
7. En caso de error al actualizar el estado, se debe mostrar un mensaje claro explicando el problema

## 5. Marcar Solicitudes como Completadas
**Como** asesor financiero  
**Quiero** poder marcar solicitudes como "Completadas"  
**Para** indicar que el proceso de desembolso ha finalizado y la solicitud ha sido procesada totalmente

### Criterios de Aceptación
1. Solo las solicitudes en estado "Por Dispersar" pueden marcarse como "Completadas"
2. Al marcar una solicitud como "Completada", se debe actualizar su estado en la base de datos
3. Se debe registrar la fecha y hora de finalización del proceso
4. La interfaz debe mostrar un indicador visual claro de que la solicitud ha sido completada
5. Las solicitudes completadas deben permanecer visibles en el tablero pero claramente diferenciadas
6. El sistema debe validar que todos los pasos previos se hayan completado antes de permitir este cambio
7. En caso de error al completar, se debe mostrar un mensaje descriptivo y la solicitud debe permanecer en su estado anterior

## 6. Rechazar Solicitudes
**Como** asesor financiero  
**Quiero** poder rechazar solicitudes desde el tablero Kanban  
**Para** indicar que una solicitud no cumple con los requisitos necesarios para su aprobación

### Criterios de Aceptación
1. Los asesores deben poder rechazar solicitudes desde cualquier estado previo a "Completado"
2. Al rechazar una solicitud, se debe actualizar su estado a "Rechazado" en la base de datos
3. Se debe solicitar y registrar un motivo de rechazo
4. La interfaz debe mostrar un indicador visual claro de que la solicitud ha sido rechazada (color rojo)
5. Las solicitudes rechazadas deben permanecer visibles en el tablero pero claramente diferenciadas
6. El sistema debe validar que el usuario tiene permisos para rechazar la solicitud específica
7. El rechazo debe registrarse en el historial de la solicitud con fecha, hora y usuario que realizó la acción

## 7. Indicadores de Aprobación Dual
**Como** usuario del sistema  
**Quiero** ver claramente qué solicitudes han sido aprobadas por el asesor, por la empresa, o por ambos  
**Para** entender rápidamente el estado de aprobación de cada solicitud y qué acción se requiere a continuación

### Criterios de Aceptación
1. Cada tarjeta debe mostrar indicadores visuales para:
   - Aprobación del asesor (✓ o ✗)
   - Aprobación de la empresa (✓ o ✗)
2. Los indicadores deben ser claramente visibles y utilizar colores intuitivos (verde para aprobado, rojo para no aprobado/pendiente)
3. Al pasar el cursor sobre los indicadores, debe mostrarse información adicional (tooltip) con la fecha y hora de aprobación
4. El estado visual de la tarjeta debe reflejar la combinación de ambas aprobaciones
5. Si ambas entidades han aprobado, debe haber una indicación especial mostrando que está lista para avanzar al siguiente paso
6. Si una aprobación es rechazada, debe mostrarse un indicador claro de rechazo

## 8. Restricciones de Permisos en el Tablero Kanban
**Como** administrador del sistema  
**Quiero** que los usuarios solo puedan realizar acciones en el tablero Kanban según sus permisos y roles  
**Para** mantener la integridad del flujo de trabajo y asegurar que las acciones son realizadas por personal autorizado

### Criterios de Aceptación
1. Los asesores solo deben poder aprobar solicitudes que les han sido asignadas
2. Los administradores de empresa solo deben poder aprobar solicitudes de su propia empresa
3. Solo los asesores pueden mover solicitudes al estado "Por Dispersar"
4. Los usuarios sin permisos adecuados no deben poder arrastrar tarjetas a estados no permitidos
5. La interfaz debe desactivar visualmente las acciones no permitidas según el rol del usuario
6. Al intentar realizar una acción no autorizada, se debe mostrar un mensaje claro explicando por qué no está permitida
7. Los superadministradores deben tener permisos completos en todo el tablero
8. El sistema debe validar los permisos tanto en el frontend como en el backend para cada acción

## 9. Historial de Cambios de Estado
**Como** usuario del sistema  
**Quiero** poder ver un historial de los cambios de estado de cada solicitud  
**Para** tener trazabilidad completa del proceso y entender cómo ha avanzado cada solicitud

### Criterios de Aceptación
1. Debe existir un registro de cada cambio de estado con fecha, hora y usuario que realizó el cambio
2. El historial debe ser accesible desde la vista detallada de cada solicitud
3. Se debe mostrar información específica sobre cada cambio de estado:
   - Estado anterior
   - Nuevo estado
   - Usuario que realizó el cambio
   - Fecha y hora
   - Comentarios o motivos (si aplica)
4. El historial debe presentarse en orden cronológico inverso (cambios más recientes primero)
5. La interfaz debe permitir filtrar o buscar en el historial para solicitudes con muchos cambios
6. El sistema debe garantizar que los registros de historial no puedan ser modificados una vez creados

## 10. Notificaciones de Cambios de Estado
**Como** usuario del sistema  
**Quiero** recibir notificaciones cuando cambie el estado de las solicitudes relevantes para mí  
**Para** poder actuar oportunamente y estar informado sobre el progreso de las solicitudes

### Criterios de Aceptación
1. Los asesores deben recibir notificaciones cuando:
   - Se les asigna una nueva solicitud
   - Una de sus solicitudes es aprobada por la empresa
   - Una de sus solicitudes es rechazada
2. Los administradores de empresa deben recibir notificaciones cuando:
   - Hay una nueva solicitud que requiere su aprobación
   - Un asesor aprueba una solicitud de su empresa
3. Las notificaciones deben aparecer en tiempo real dentro de la aplicación
4. Cada notificación debe incluir:
   - Tipo de cambio realizado
   - Identificación de la solicitud afectada
   - Nombre del cliente
   - Hora del cambio
   - Enlace directo a la solicitud
5. Las notificaciones deben marcarse como leídas una vez que el usuario interactúa con ellas
6. Debe existir un centro de notificaciones donde se puedan ver todas las notificaciones anteriores

## 11. Optimización de Rendimiento del Tablero Kanban
**Como** usuario del sistema  
**Quiero** que el tablero Kanban funcione de manera fluida incluso con gran cantidad de solicitudes  
**Para** poder trabajar eficientemente sin demoras ni problemas técnicos

### Criterios de Aceptación
1. El tablero debe cargar en menos de 3 segundos, incluso con 100+ solicitudes
2. Las acciones de arrastrar y soltar deben ser fluidas, sin retrasos perceptibles
3. Los cambios de estado deben actualizarse en la base de datos en menos de 2 segundos
4. La interfaz debe seguir siendo responsiva durante las operaciones de carga o actualización
5. Se debe implementar paginación o carga diferida para manejar grandes volúmenes de datos
6. Las operaciones de filtrado y búsqueda deben ejecutarse en menos de 1 segundo
7. Se debe implementar un sistema de caché para reducir las consultas repetitivas a la base de datos
8. En caso de desconexión, el sistema debe guardar el estado actual y sincronizarse cuando se restablezca la conexión

## 12. Manejo de Errores en el Tablero Kanban
**Como** usuario del sistema  
**Quiero** recibir mensajes de error claros y útiles cuando ocurra algún problema en el tablero Kanban  
**Para** entender qué ha ocurrido y cómo puedo solucionarlo

### Criterios de Aceptación
1. Los mensajes de error deben ser descriptivos y en lenguaje comprensible para el usuario
2. En caso de error de conexión, el sistema debe mostrar un mensaje claro y opciones para reintentar
3. Si una operación de arrastrar y soltar falla, la tarjeta debe volver a su posición original
4. Los errores de permisos deben explicar claramente por qué el usuario no puede realizar cierta acción
5. El sistema debe registrar todos los errores para su posterior análisis por el equipo técnico
6. En caso de errores críticos, se debe mantener la integridad de los datos y no perder el progreso del usuario
7. Se deben implementar mecanismos de recuperación automática cuando sea posible
8. Los errores del servidor deben comunicarse de manera amigable sin exponer detalles técnicos al usuario final

## 13. Exportación de Datos del Tablero Kanban
**Como** asesor o administrador  
**Quiero** poder exportar datos del tablero Kanban  
**Para** realizar análisis externos o generar informes personalizados

### Criterios de Aceptación
1. El sistema debe permitir exportar la vista actual del tablero en formatos comunes (CSV, Excel)
2. La exportación debe incluir todos los datos relevantes de las solicitudes y su estado actual
3. Se debe permitir seleccionar qué columnas/datos se desean incluir en la exportación
4. La exportación debe respetar los filtros y búsquedas actuales en el tablero
5. El archivo exportado debe tener un formato claro y bien estructurado
6. El proceso de exportación no debe afectar al rendimiento general del tablero
7. Se debe incluir metadata como fecha y hora de exportación, usuario que la realizó, y filtros aplicados
8. Para exportaciones grandes, se debe mostrar un indicador de progreso

## 14. Vista Móvil del Tablero Kanban
**Como** usuario del sistema  
**Quiero** poder acceder al tablero Kanban desde dispositivos móviles  
**Para** gestionar solicitudes cuando no tengo acceso a un ordenador

### Criterios de Aceptación
1. El tablero debe ser completamente funcional en dispositivos móviles (tablets y smartphones)
2. La interfaz debe adaptarse responsivamente al tamaño de pantalla del dispositivo
3. En dispositivos móviles, se debe permitir deslizar horizontalmente para ver todas las columnas
4. Las acciones de arrastrar y soltar deben funcionar mediante gestos táctiles intuitivos
5. Los elementos interactivos deben tener tamaño adecuado para su uso táctil (botones, tarjetas, etc.)
6. La navegación debe ser fácil e intuitiva en pantallas pequeñas
7. Los filtros y búsquedas deben ser accesibles y utilizables en modo móvil
8. El rendimiento debe ser optimizado para conexiones móviles más lentas 