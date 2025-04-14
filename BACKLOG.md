# Backlog del Proyecto CRM Fincentiva

## Implementado (✅)

### Configuración y Estructura del Proyecto
- ✅ Configuración inicial del proyecto con React y TypeScript
- ✅ Configuración de Tailwind CSS y DaisyUI
- ✅ Estructura de directorios y organización del código
- ✅ Conexión a Supabase
- ✅ Configuración del Model Context Protocol (MCP)

### Autenticación y Autorización
- ✅ Sistema de inicio de sesión
- ✅ Sistema de inicio de sesión con código de acceso para asesores y admins de empresas
- ✅ Manejo de sesiones de usuario
- ✅ Sistema de roles y permisos
- ✅ Protección de rutas según permisos
- ✅ Persistencia de sesión tras refrescar la página

### Componentes UI
- ✅ Componente Navbar
- ✅ Componente Sidebar
- ✅ Componente MainLayout
- ✅ Componente ActionButton 
- ✅ Componente Login
- ✅ Componente Alert
- ✅ Componente NotificationPanel
- ✅ Componente NotificationPopup con soporte para animaciones y sonidos
- ✅ Componentes de gráficos para dashboard (barras, circular, líneas)

### Páginas Básicas
- ✅ Página de Login
- ✅ Página Dashboard con estadísticas personalizadas
- ✅ Página de Aplicaciones con listado de datos reales
- ✅ Página detallada de Aplicaciones con datos reales
- ✅ Formulario de creación/edición de aplicaciones
- ✅ Sistema de filtrado avanzado para aplicaciones
- ✅ Vista Kanban para gestión visual de estados de aplicaciones
- ✅ Páginas stub para las demás secciones (Clientes, Reportes, etc.)
- ✅ Sistema de mensajería interna entre usuarios

### Conexión a Datos Reales
- ✅ Servicios para CRUD de aplicaciones
- ✅ Servicios para CRUD de clientes
- ✅ Servicios para CRUD de empresas
- ✅ Servicios para CRUD de asesores
- ✅ Servicios para gestión de documentos
- ✅ Servicios de estadísticas para el dashboard
- ✅ Servicios para el sistema de mensajería

## Orden Cronológico del Desarrollo (🔢)

### Fase 1: Corrección y Estabilización ✅
1. ✅ Corregir errores en el servicio de aplicaciones (problema con nombres de columnas)
2. ✅ Implementar manejo de errores y feedback al usuario
3. ✅ Ajustar interfaces TypeScript para alinearlas con la estructura real de la base de datos

### Fase 2: Integración Frontend-Backend ✅
4. ✅ Conectar la página de listado de aplicaciones con el servicio real
5. ✅ Implementar vista detallada de aplicaciones
6. ✅ Desarrollar formulario de creación/edición de aplicaciones
7. ✅ Implementar sistema de filtrado avanzado para aplicaciones
8. ✅ Desarrollar vista Kanban para gestión visual de estados de aplicaciones

### Fase 3: Sistema de Aprobaciones y Comunicación ✅
9. ✅ Implementar sistema de doble aprobación (asesor y admin de empresa)
10. ✅ Añadir indicadores visuales del estado de aprobación
11. ✅ Implementar estado "Por Dispersar" entre "Aprobado" y "Completado"
12. ✅ Optimizar la experiencia de arrastre y fluidez en Kanban
13. ✅ Implementar notificaciones para aprobadores cuando una solicitud está lista
14. ✅ Desarrollar sistema de mensajería interna entre asesores y admins

### Fase 4: Dashboard y Reportes (✅)
15. ✅ Implementar dashboard interactivo con datos reales para cada tipo de usuario
16. ✅ Desarrollar gráficos de estadísticas personalizados según rol
17. ✅ Implementar filtros de fechas para estadísticas
18. ✅ Mejorar sistema de notificaciones con alertas visuales y sonoras
19. ✅ Implementar notificaciones emergentes (pop-up) en tiempo real
20. 🔄 Desarrollar sistema de reportes exportables

### Fase 5: Gestión de Clientes ✅
21. ✅ Implementar vista de listado de clientes conectada a API
22. ✅ Implementar vista detallada de clientes con sus aplicaciones
23. ✅ Desarrollar formulario de creación/edición de clientes
24. ✅ Implementar gestión de documentos de clientes
25. ✅ Incorporar visualización de progreso de completado de datos

### Fase 6: Gestión de Empresas y Asesores
24. 🔄 Implementar vista de listado de empresas
25. 🔄 Desarrollar formulario de creación/edición de empresas
26. 🔄 Implementar vista de listado de asesores
27. 🔄 Desarrollar formulario de creación/edición de asesores

### Fase 7: Funcionalidades Avanzadas
28. 📝 Implementar gestión de documentos (subida, almacenamiento, visualización)
29. 📝 Desarrollar calculadora de préstamos y simulaciones

### Fase 8: Optimización y Testing
30. 📝 Optimizar para dispositivos móviles
31. 📝 Implementar tests unitarios
32. 📝 Desarrollar tests de integración
33. 📝 Mejorar el rendimiento general

## Pendiente Detallado

### Reportes Exportables (Prioridad 1)
- 🔄 Implementar exportación de listado de aplicaciones a Excel
- 🔄 Añadir reportes resumidos por estado, empresa y asesor
- 🔄 Permitir exportación de reportes personalizados según filtros

### Gestión de Clientes (Prioridad 2)
- ✅ Vista de listado de clientes con filtros
- ✅ Vista detallada de clientes con historial de solicitudes
- ✅ Formulario de creación/edición de clientes con validaciones avanzadas
- ✅ Implementar verificación de duplicados al crear clientes
- ✅ Añadir sugerencias de autocompletado en campos como Ciudad y Estado
- ✅ Añadir indicador de progreso de completado de datos
- ✅ Implementar gestión de documentos de clientes (carga, visualización, categorización)
- ✅ Interfaz de arrastrar y soltar para la carga de documentos

### Sistema de Mensajería (Prioridad 3)
- ✅ Componente de chat para mensajería interna
- 🔄 Mejorar la interfaz de usuario del sistema de mensajería
- 🔄 Añadir soporte para envío de archivos adjuntos en mensajes
- 📝 Integración con API de WhatsApp para mensajes predefinidos

### Gestión de Empresas y Asesores (Prioridad 4)
- 🔄 Completar formularios de empresas
- 🔄 Mejorar asignación de asesores a empresas

## Estructura de Tablas en Supabase

### Tablas Actuales
- `advisors`: Asesores financieros
- `company_admins`: Administradores de empresas
- `companies`: Empresas asociadas
- `applications`: Solicitudes de crédito
- `application_history`: Historial de cambios en solicitudes
- `documents`: Documentos asociados a solicitudes y clientes
- `comments`: Comentarios en solicitudes
- `messages`: Sistema de mensajería interna
- `clients`: Clientes (personas que solicitan préstamos)

## Historias de Usuario - Gestión de Clientes

### 1. Registro y Datos Completos de Clientes

**Historia de Usuario**: Como asesor financiero, quiero registrar toda la información relevante de los clientes para evaluar correctamente sus solicitudes financieras y mantener un registro completo de sus datos.

**Criterios de Aceptación**:
1. ✅ El formulario debe incluir campos para datos personales básicos (nombre, email, teléfono, RFC, CURP, etc.).
2. ✅ Debe capturar información financiera como ingresos, gastos, otros créditos, etc.
3. ✅ Debe permitir registrar información bancaria como nombre del banco, CLABE, tipo de cuenta, etc.
4. ✅ Los campos deben tener validaciones adecuadas (formato de RFC, CURP, email, etc.).
5. ✅ Debe mostrar un indicador de progreso que señale qué porcentaje de datos ha sido completado.
6. ✅ Debe permitir editar la información del cliente en cualquier momento.
7. ✅ Debe relacionar automáticamente el cliente con el asesor o la empresa según el usuario que lo cree.

### 2. Visualización y Listado de Clientes

**Historia de Usuario**: Como usuario del CRM, quiero visualizar un listado de clientes con opciones de filtrado y búsqueda para acceder rápidamente a la información que necesito.

**Criterios de Aceptación**:
1. ✅ Debe mostrar una tabla con los datos más relevantes de cada cliente.
2. ✅ Debe incluir un buscador que filtre por nombre, email, teléfono, RFC o CURP.
3. ✅ Debe permitir filtrar por fechas de registro.
4. ✅ Debe respetar las restricciones de acceso según el rol del usuario.
5. ✅ Un asesor solo debe ver sus propios clientes.
6. ✅ Un administrador de empresa solo debe ver los clientes asociados a su empresa.
7. ✅ Debe incluir paginación para manejar grandes volúmenes de datos.

### 3. Gestión de Documentos de Clientes

**Historia de Usuario**: Como asesor financiero, quiero gestionar los documentos de los clientes (identificación, comprobantes, estados de cuenta, etc.) para mantener un expediente digital completo y organizado de cada uno.

**Criterios de Aceptación**:
1. ✅ Debe permitir la carga de documentos en diferentes formatos (PDF, JPG, etc.).
2. ✅ Los documentos deben categorizarse según su tipo (identificación, comprobante de domicilio, etc.).
3. ✅ Debe incluir una interfaz de arrastrar y soltar para facilitar la carga.
4. ✅ Debe mostrar una lista organizada de todos los documentos cargados.
5. ✅ Debe permitir eliminar documentos incorrectos o desactualizados.
6. ✅ Los documentos deben almacenarse de manera segura y asociarse al cliente correspondiente.
7. ✅ Debe integrarse dentro del flujo de creación y edición de clientes.

### 4. Visualización de Historial de Solicitudes por Cliente

**Historia de Usuario**: Como usuario del CRM, quiero ver todas las solicitudes asociadas a un cliente específico para analizar su historial crediticio y proceso de aprobaciones.

**Criterios de Aceptación**:
1. ✅ En la vista detallada del cliente, debe mostrar una tabla con todas sus solicitudes.
2. ✅ Debe mostrar información relevante como fecha, tipo, monto y estado de cada solicitud.
3. ✅ Debe permitir acceder directamente a la vista detallada de cualquier solicitud.
4. ✅ Debe mostrar visualmente los diferentes estados de cada solicitud mediante colores o etiquetas.
5. ✅ Debe permitir crear una nueva solicitud directamente desde la vista del cliente.
6. ✅ Si el cliente no tiene solicitudes, debe mostrar un mensaje adecuado y ofrecer la opción de crear una.

## Próximos pasos inmediatos

1. **Completar sistema de reportes exportables**:
   - Implementar botón de exportación a Excel en la página de Aplicaciones
   - Crear interfaz de selección de filtros para reportes personalizados
   - Desarrollar generador de PDF para detalles de aplicaciones individuales

2. **Mejorar la experiencia de usuario**:
   - Corregir advertencias de linter para mejorar el rendimiento y calidad del código
   - Optimizar componentes para reducir la cantidad de re-renderizados
   - Mejorar el manejo de errores y feedback visual al usuario

3. **Implementar módulo de Empresas completo**:
   - Diseñar e implementar formulario de creación/edición de empresas
   - Mejorar la visualización y filtrado de empresas
   - Implementar asignación de administradores a empresas 