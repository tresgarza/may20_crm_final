# EXTRA BACKLOG - Correcciones Prioritarias CRM Fincentiva

## 1. Notificaciones Emergentes con Sonido ✅ COMPLETADO

**Historia de Usuario**: Como usuario del CRM, quiero recibir notificaciones emergentes con sonido cuando se crea una nueva solicitud, para estar informado inmediatamente sin tener que revisar constantemente el sistema.

**Criterios de Aceptación**:
1. ✅ Al crearse una nueva solicitud, debe aparecer una notificación emergente en la pantalla.
2. ✅ La notificación debe reproducir un sonido de alerta (corregido el error: "Failed to load because no supported source was found").
3. ✅ La notificación debe mostrar información relevante (título, descripción, hora).
4. ✅ La notificación debe permanecer visible durante 5 segundos o hasta que el usuario la cierre.
5. ✅ El sistema debe funcionar independientemente de la página actual en la que se encuentre el usuario.
6. ✅ Se ha corregido el error "Cannot read properties of undefined (reading 'bg')" en NotificationPopup.

## 2. Componente de Notificaciones Actualizado
**Prioridad:** Alta
**Estimación:** 3 días
**Estado:** ✅ COMPLETADO

**Historia de Usuario:** Como usuario del sistema, quiero que el sistema de notificaciones funcione correctamente, garantizando que las notificaciones tengan IDs únicos válidos y que los enlaces a elementos relacionados funcionen correctamente.

**Criterios de Aceptación:**
- ✅ Las notificaciones deben utilizar UUIDs válidos para sus IDs y para los IDs de elementos relacionados.
- ✅ El panel de notificaciones debe manejar correctamente los clics en notificaciones, navegando a la página correspondiente.
- ✅ El sistema debe validar si un ID de elemento relacionado es válido antes de intentar navegar a su página.
- ✅ Las notificaciones de prueba deben utilizar IDs de aplicaciones válidos para evitar errores.
- ✅ El componente debe manejar adecuadamente los casos donde el elemento relacionado no existe o tiene un formato inválido.

## 3. Gráfico de Distribución por Estado ✅ COMPLETADO

**Historia de Usuario**: Como usuario del CRM, quiero ver un gráfico de distribución por estado con colores distintos para cada estado, para identificar rápidamente la proporción de solicitudes en cada etapa.

**Criterios de Aceptación**:
1. ✅ El gráfico de distribución muestra colores diferentes para cada estado de solicitud (ahora cada estado tiene su color asignado).
2. ✅ Los colores son fácilmente distinguibles entre sí.
3. ✅ Los colores siguen un patrón lógico (rojo para rechazado, verde para aprobado).
4. ✅ El gráfico incluye una leyenda que indica qué color corresponde a cada estado.
5. ✅ Los colores son consistentes en todas las visualizaciones del sistema.

## 4. Columna "Tipo" en Solicitudes Recientes ✅ COMPLETADO

**Historia de Usuario**: Como usuario del CRM, quiero ver correctamente el tipo de solicitud en la tabla de solicitudes recientes, para identificar rápidamente la categoría de cada solicitud.

**Criterios de Aceptación**:
1. ✅ La columna "Tipo" muestra el tipo real de la solicitud, no "N/A".
2. ✅ Los tipos se muestran con nombres descriptivos (ej. "Planes Seleccionados" en lugar de "selected_plans").
3. ✅ Si un tipo no está disponible, muestra un valor predeterminado apropiado.
4. ✅ La información del tipo es consistente con la que aparece en los detalles de la solicitud.
5. ✅ El mapeo de códigos a nombres descriptivos es mantenible y escalable.

## 5. Formato de Montos con Decimales ✅ COMPLETADO

**Historia de Usuario**: Como usuario del CRM, quiero ver los montos con dos decimales en todas las visualizaciones, para tener precisión en la información financiera.

**Criterios de Aceptación**:
1. ✅ Los montos muestran siempre 2 decimales, incluso si son ceros.
2. ✅ El formato incluye separadores de miles para mejor legibilidad.
3. ✅ El símbolo de la moneda (MXN, $) se muestra de manera consistente.
4. ✅ El formato se aplica en todas las vistas (dashboard, detalles, listados).
5. ✅ El formato mantiene el alineamiento correcto en tablas y gráficos.

## 6. Permisos de Visualización para Administradores de Empresa ✅ COMPLETADO

**Historia de Usuario**: Como usuario del CRM, quiero ver solo la información relevante para mi rol, sin gráficos o datos que correspondan exclusivamente a los superadministradores.

**Criterios de Aceptación**:
1. ✅ Los administradores de empresa no ven el gráfico "Rendimiento de Asesores".
2. ✅ La interfaz se adapta para mostrar solo los componentes relevantes según el rol.
3. ✅ No hay espacios en blanco o interrupciones en el diseño por elementos ocultos.
4. ✅ Los permisos se verifican a nivel de componente, no solo a nivel de página.
5. ✅ Los administradores de empresa tienen alternativas relevantes para su rol.

## 7. Conteo de Clientes ✅ COMPLETADO

**Historia de Usuario**: Como usuario del CRM, quiero ver un conteo preciso del total de clientes en el dashboard, para tener una visión general del volumen de clientes.

**Criterios de Aceptación**:
1. ✅ El contador "Total de Clientes" muestra el número real de clientes únicos.
2. ✅ El contador se actualiza automáticamente cuando se añaden o eliminan clientes.
3. ✅ El cálculo considera solo clientes activos, no clientes eliminados.
4. ✅ El contador es consistente con el número de clientes en la sección de Clientes.
5. ✅ Se muestra un mensaje apropiado ("No clients") si no hay datos disponibles, en lugar de "0".
6. ✅ Mejorado el manejo de errores para casos donde la tabla de clientes no existe.

## 8. Navegación para Administradores de Empresa ✅ COMPLETADO

**Historia de Usuario**: Como administrador de empresa, quiero ver solo las opciones de navegación relevantes para mi rol, sin acceso a secciones que no me corresponden.

**Criterios de Aceptación**:
1. ✅ Los administradores de empresa no ven la pestaña "Empresas" en la navegación.
2. ✅ El menú se adapta dinámicamente según el rol del usuario.
3. ✅ No quedan espacios vacíos o elementos de diseño inconsistentes al ocultar opciones.
4. ✅ Los permisos se verifican tanto en la navegación como en el acceso directo a URLs.
5. ✅ Se proporciona retroalimentación visual si un usuario intenta acceder a una sección no autorizada.

## 9. Permisos para Marcar como Dispersar ✅ COMPLETADO

**Historia de Usuario**: Como administrador del sistema, quiero que solo los asesores tengan la capacidad de marcar solicitudes como "Dispersar", para mantener la integridad del flujo de trabajo.

**Criterios de Aceptación**:
1. ✅ Solo los usuarios con rol "ADVISOR" pueden marcar solicitudes como "Dispersar".
2. ✅ Los administradores de empresa no ven esta opción en la interfaz.
3. ✅ Si un administrador de empresa intenta acceder a esta funcionalidad por URL directa, recibe un mensaje de error.
4. ✅ El sistema verifica los permisos antes de procesar cualquier acción de dispersión.
5. ✅ La documentación indica claramente que esta es una tarea exclusiva de los asesores.

## 10. Visualización de Detalles de Producto y Monto ✅ COMPLETADO

**Historia de Usuario**: Como usuario del CRM, quiero ver correctamente el tipo de producto y el monto solicitado en la vista de detalles de una solicitud, para tener información precisa sobre cada caso.

**Criterios de Aceptación**:
1. ✅ El "Tipo de Producto" muestra el valor correcto según los datos de la solicitud.
2. ✅ El "Monto Solicitado" muestra el valor correcto con formato de 2 decimales.
3. ✅ Si algún valor no está disponible, muestra un mensaje apropiado en lugar de quedar en blanco.
4. ✅ La información es consistente entre la vista de listado y la vista de detalles.
5. ✅ Los campos tienen etiquetas claras y están organizados de forma lógica.

## 11. Navegación desde Notificaciones ✅ COMPLETADO

**Historia de Usuario**: Como usuario del CRM, quiero que al hacer clic en una notificación me lleve directamente a la página correspondiente sin errores, para acceder rápidamente a la información relevante.

**Criterios de Aceptación**:
1. ✅ Al hacer clic en una notificación, el sistema navega a la página correcta.
2. ✅ No muestra el error "invalid input syntax for type uuid: 'undefined'".
3. ✅ Si la notificación se refiere a una solicitud, abre la vista de detalles de esa solicitud.
4. ✅ La notificación se marca como leída después de hacer clic en ella.
5. ✅ Si el destino no existe, muestra un mensaje adecuado en lugar de un error técnico.

## 12. Indicadores Visuales en Kanban ✅ COMPLETADO

**Historia de Usuario**: Como usuario del CRM, quiero que los estados de las solicitudes en el Kanban se muestren con colores intuitivos que cambien según las transiciones, para entender fácilmente el estado y los cambios en el flujo de trabajo.

**Criterios de Aceptación**:
1. ✅ Las tarjetas cambian de color según su estado (rojo para rechazado, amarillo para pendiente, etc.).
2. ✅ Si una solicitud aprobada se rechaza posteriormente, cambia a color rojo.
3. ✅ Si una solicitud aprobada pasa a revisión, cambia a color rosa/púrpura.
4. ✅ Los colores son consistentes con los usados en otras partes del sistema.
5. ✅ Hay indicadores visuales claros para los estados de aprobación de asesor y empresa.

## 13. Manejo de Errores en la Base de Datos ✅ COMPLETADO

**Historia de Usuario**: Como desarrollador y usuario del CRM, quiero que el sistema maneje adecuadamente los errores de la base de datos, proporcionando mensajes claros y permitiendo que la aplicación siga funcionando incluso cuando hay problemas con la conexión a la base de datos.

**Criterios de Aceptación**:
1. ✅ El sistema maneja correctamente el error "relation does not exist" cuando una tabla no existe.
2. ✅ Proporciona mensajes de error claros y descriptivos en la consola para facilitar la depuración.
3. ✅ La aplicación sigue funcionando incluso cuando hay problemas con la base de datos.
4. ✅ Los componentes afectados muestran mensajes de error amigables al usuario.
5. ✅ Se implementaron soluciones alternativas para obtener datos cuando la fuente principal no está disponible.
6. ✅ El dashboard muestra datos parciales o de ejemplo cuando no se pueden cargar los datos reales.

## 14. Manejo de Errores en el Módulo de Clientes ✅ COMPLETADO

**Historia de Usuario**: Como usuario del CRM, quiero que la sección de clientes maneje adecuadamente los casos en que la tabla de clientes no existe en la base de datos, mostrando mensajes claros y evitando errores en la interfaz.

**Criterios de Aceptación**:
1. ✅ El sistema muestra un mensaje amigable cuando la tabla de clientes no existe, en lugar de mostrar errores técnicos.
2. ✅ Se implementó un manejo de errores robusto en todas las funciones del servicio de clientes.
3. ✅ El componente de listado de clientes muestra una interfaz amigable incluso cuando no hay datos.
4. ✅ Se proporcionan instrucciones claras al usuario sobre los pasos a seguir cuando no hay clientes.
5. ✅ Las operaciones relacionadas con clientes (crear, editar, eliminar) proporcionan retroalimentación clara cuando la tabla no existe.
6. ✅ La consola del navegador muestra mensajes de error descriptivos para ayudar en la depuración.

## 15. Corrección de Errores de Tipado en Interfaces ✅ COMPLETADO

**Historia de Usuario**: Como desarrollador del CRM, quiero que la aplicación tenga una estructura de tipos coherente, para evitar errores en tiempo de compilación y mejorar la robustez del código.

**Criterios de Aceptación**:
1. ✅ Se unificó el uso de `application_type` en lugar de `product_type` en toda la aplicación.
2. ✅ Se corrigieron los errores de TypeScript en el formulario de aplicaciones.
3. ✅ Se eliminaron las propiedades redundantes en los objetos enviados a la API.
4. ✅ Las interfaces de datos son consistentes con el esquema de la base de datos.
5. ✅ Se actualizaron todas las referencias a los campos modificados en los componentes que los utilizan.

## 16. Corrección de Reproducción de Sonidos
**Prioridad:** Media
**Estimación:** 1 día
**Estado:** ✅ COMPLETADO

**Historia de Usuario:** Como usuario del sistema, quiero que los sonidos de notificación se reproduzcan correctamente en todos los navegadores para estar alerta de eventos importantes sin necesidad de estar constantemente mirando la pantalla.

**Criterios de Aceptación:**
- ✅ Los sonidos de notificación se reproducen correctamente en los navegadores más comunes (Chrome, Firefox, Safari).
- ✅ Se implementa un sistema de respaldo con múltiples formatos de audio (MP3 y WAV).
- ✅ Se agrega precarga de archivos de audio para mejorar el rendimiento.
- ✅ El sistema maneja adecuadamente los casos donde el navegador bloquea la reproducción automática.
- ✅ Se implementa un mecanismo para habilitar el audio después de la primera interacción del usuario.
- ✅ Se corrigen los errores "Error playing notification sound" que aparecían en la consola.

## 17. Mejora del Sistema de Notificaciones
**Prioridad:** Alta
**Estimación:** 2 días
**Estado:** ✅ COMPLETADO

**Historia de Usuario:** Como usuario del sistema, quiero recibir notificaciones detalladas y personalizadas para nuevas solicitudes, con toda la información relevante claramente presentada en el centro de la pantalla, acompañadas de un sonido sutil que me alerte sin ser intrusivo.

**Criterios de Aceptación:**
- ✅ Las notificaciones de nuevas solicitudes aparecen en el centro de la pantalla para mayor visibilidad.
- ✅ El contenido de las notificaciones incluye información detallada: cliente, empresa, tipo de producto, monto, plazo, tasa, pago mensual, fecha y hora.
- ✅ El sistema no muestra notificaciones duplicadas para la misma solicitud.
- ✅ Se utiliza un sonido suave con tres pitidos espaciados que no resulta molesto pero atrae la atención.
- ✅ Las notificaciones tienen un formato visualmente agradable con datos organizados en una estructura de dos columnas.
- ✅ La notificación permanece visible el tiempo suficiente (10 segundos) para que el usuario pueda leer toda la información.

## 18. Personalización de Notificaciones por Tipo de Solicitud
**Prioridad:** Alta
**Estimación:** 2 días
**Estado:** 🔄 EN PROGRESO

**Historia de Usuario:** Como usuario del CRM, quiero que las notificaciones de nuevas solicitudes muestren la información relevante según el tipo específico de solicitud (crédito personal, simulación de producto, planes seleccionados, etc.) para poder identificar rápidamente las características importantes de cada tipo de solicitud sin tener que entrar al detalle.

**Criterios de Aceptación:**
- 🔄 El sistema debe identificar correctamente el tipo de solicitud y mostrar campos específicos relevantes para cada tipo.
- 🔄 Para solicitudes de tipo "selected_plans" (Planes seleccionados), debe mostrar claramente el plazo en meses, tasa de interés y monto de pago mensual.
- 🔄 Para solicitudes de tipo "product_simulations" (Simulación de producto), debe enfatizar el tipo de producto simulado y el monto total.
- 🔄 Para solicitudes de tipo "cash_requests" (Solicitudes de efectivo), debe destacar el monto solicitado y mostrar "N/A" para los campos de plazo cuando no apliquen.
- 🔄 Para solicitudes de tipo "car_backed_loan_applications" y "auto_loan_applications" (Préstamos de auto), debe mostrar información específica relacionada con vehículos si está disponible.
- 🔄 Los campos específicos deben formatearse adecuadamente (montos con separador de miles y dos decimales, porcentajes con símbolo %).
- 🔄 Si algún campo específico no está disponible para un tipo particular, debe mostrar "N/A" o un valor predeterminado apropiado.
- 🔄 La notificación debe mantener un diseño consistente independientemente del tipo de solicitud.

## 19. Manejo de Valores Nulos o Indefinidos en Notificaciones
**Prioridad:** Media
**Estimación:** 1 día
**Estado:** 🔄 EN PROGRESO

**Historia de Usuario:** Como usuario del CRM, quiero que las notificaciones manejen adecuadamente los casos donde ciertos campos no tienen valor, mostrando indicadores claros en lugar de valores vacíos o errores, para tener siempre una representación completa y coherente de la información.

**Criterios de Aceptación:**
- 🔄 El sistema debe verificar si cada campo tiene un valor antes de intentar mostrarlo.
- 🔄 Para campos de texto vacíos o nulos, debe mostrar "No especificado" o un valor predeterminado contextual.
- 🔄 Para campos numéricos como monto, debe mostrar "$0.00" o "No especificado" según el contexto.
- 🔄 Para campos de plazo sin valor, debe mostrar "N/A" o "No aplica".
- 🔄 Para tasas de interés sin valor, debe mostrar "0%" o "No especificada".
- 🔄 El sistema debe mantener el formato y alineación de la notificación incluso cuando faltan varios valores.
- 🔄 No deben producirse errores JavaScript ni excepciones cuando se procesa una solicitud con campos vacíos.

## 20. Optimización de Consultas para Notificaciones
**Prioridad:** Media
**Estimación:** 1 día
**Estado:** 🔄 EN PROGRESO

**Historia de Usuario:** Como administrador del sistema, quiero que las consultas que obtienen datos para las notificaciones sean eficientes y específicas según el tipo de solicitud, para mejorar el rendimiento y garantizar que solo se recuperen los campos necesarios.

**Criterios de Aceptación:**
- 🔄 El sistema debe utilizar consultas SQL optimizadas que seleccionen solo los campos relevantes según el tipo de solicitud.
- 🔄 Las consultas deben incluir filtros eficientes para reducir la cantidad de datos transferidos.
- 🔄 El sistema debe implementar un mecanismo de caché para evitar consultas repetitivas para los mismos datos.
- 🔄 Las consultas deben incluir índices apropiados para mejorar el tiempo de respuesta.
- 🔄 Se debe implementar un mecanismo de registro detallado para monitorear el rendimiento de las consultas.
- 🔄 El sistema debe manejar adecuadamente los casos donde las consultas fallan o devuelven resultados inesperados. 