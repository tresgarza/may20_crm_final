# CRM Fincentiva

CRM personalizado para la gestión de solicitudes de préstamos, empresas asociadas y asesores financieros.

## Descripción

CRM Fincentiva es una aplicación web desarrollada para gestionar el proceso de solicitudes de crédito, empresas y asesores. La plataforma permite visualizar estadísticas en tiempo real, administrar solicitudes, empresas y usuarios según los roles asignados.

## Tecnologías Utilizadas

- **Frontend**: React, Tailwind CSS, DaisyUI
- **Backend**: Supabase (PostgreSQL, Autenticación, Almacenamiento)
- **Herramientas**: ESLint, Prettier, React Router, React Icons

## Estado del Proyecto

### Completado:

- Estructura inicial del proyecto y configuración
-    Sistema de autenticación con Supabase
-  Sistema de roles y permisos
-  Componentes UI reutilizables
-  Dashboard básico
-  Gestión de solicitudes:
  -  Listado de solicitudes con filtros
  -  Vista detallada de solicitudes
  -  Creación de nuevas solicitudes
  -  Cambio de estado y seguimiento de historial



- Gestión de empresas:
  -  Listado de empresas
  -  Vista detallada de empresas
  -  Asignación de administradores
  
-  Gestión de asesores:
  -  Listado de asesores
  -  Vista detallada de asesores


- 📌 Gestión de documentos (subida, visualización)
- 📌 Sistema de comentarios en solicitudes
- 📌 Reportes y estadísticas
- 📌 Integración con WhatsApp para notificaciones
- 📌 Cálculo avanzado de préstamos y amortizaciones
- 📌 Optimización para dispositivos móviles
- 📌 Pruebas unitarias e integración

## Próximos pasos



## Instrucciones para desarrollo

### Iniciar el proyecto

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm start
```

### Variables de entorno

Crear un archivo `.env` en la raíz del proyecto con las siguientes variables:

```
REACT_APP_SUPABASE_URL=tu_url_de_supabase
REACT_APP_SUPABASE_ANON_KEY=tu_clave_anonima_de_supabase
```

### Acceso al CRM

Para acceder al CRM, se debe conectar a la tabla de supabase.



## Estructura de Directorios

```
/src
  /components       # Componentes reutilizables
  /contexts         # Contextos de React (Auth, Permisos)
  /layouts          # Layouts de la aplicación
  /pages            # Páginas/vistas principales
  /utils            # Utilidades y helpers
    /constants      # Constantes de la aplicación
  /hooks            # Custom hooks
```

## Licencia

Este proyecto es propiedad de Fincentiva. Todos los derechos reservados.

## Mapeo de Funcionalidades

### Arquitectura del Sistema

El sistema utiliza una arquitectura modular basada en componentes React con las siguientes capas:

1. **Interfaz de Usuario**: Componentes reutilizables en `src/components/ui/`
2. **Layout y Navegación**: Componentes de estructura en `src/components/layout/`
3. **Páginas y Vistas**: Implementaciones específicas en `src/pages/`
4. **Gestión de Estado**: Contextos React en `src/contexts/`
5. **Lógica de Negocio**: Hooks personalizados en `src/hooks/`
6. **Servicios y Utilidades**: Funciones auxiliares en `src/utils/`
7. **Constantes y Configuración**: Valores predefinidos en `src/utils/constants/`

### Autenticación y Autorización

**Sistema de Autenticación** (`AuthContext.jsx`)
- Gestión completa del ciclo de vida de la sesión del usuario
- Funciones: login, logout, registro, recuperación de contraseña
- Almacenamiento de sesión y token JWT
- Integración con Supabase Auth

**Sistema de Permisos** (`PermissionsContext.jsx`)
- Control de acceso basado en roles (RBAC)
- Tres roles principales: SUPERADMIN, ADVISOR, COMPANY_ADMIN
- Permisos granulares para cada operación
- Funciones para verificación de permisos: `userCan`, `userCanAll`, `userCanAny`

**Protección de Rutas** (`ProtectedRoute.jsx`)
- Componente envolvente para proteger rutas basado en autenticación y permisos
- Redirección a login si no hay sesión activa
- Redirección a dashboard si no tiene permisos necesarios

### Módulos Principales

#### 1. Autenticación (`/pages/auth/`)

**Login** (`Login.jsx`)
- Formulario de inicio de sesión
- Validación de campos
- Gestión de errores
- Redirección según rol

**Registro** (`RegisterUser.jsx`)
- Formulario de registro de nuevos usuarios
- Validación de campos
- Selección de rol
- Asignación a empresa (si aplica)

#### 2. Dashboard (`/pages/dashboard/`)

**Panel Principal** (`Dashboard.jsx`)
- Resumen estadístico con tarjetas (StatCard)
- Métricas clave: total solicitudes, aprobadas, rechazadas, monto promedio
- Segmentación según rol del usuario

**Componentes de Datos**
- `RecentApplicationsTable.jsx`: Tabla de solicitudes recientes
- `StatusDistributionChart.jsx`: Gráfico de distribución por estado
- `ApplicationsByMonthChart.jsx`: Gráfico de evolución mensual
- `AmountDistributionChart.jsx`: Gráfico de distribución por monto

#### 3. Gestión de Solicitudes (`/pages/applications/`)

**Listado de Solicitudes** (`Applications.jsx`)
- Tabla con paginación
- Filtros múltiples: estado, tipo, término de búsqueda
- Acceso a detalle de cada solicitud

**Detalle de Solicitud** (`ApplicationDetail.jsx`)
- Vista completa de información 
- Panel de cambio de estado (según permisos)
- Historial de estados y comentarios
- Información del cliente, empresa y asesor

**Componentes Auxiliares**
- `StatusBadge.jsx`: Badge visual para estados
- `ApplicationFilters.jsx`: Panel de filtros

#### 4. Gestión de Empresas (`/pages/companies/`)

**Listado de Empresas** (`Companies.jsx`)
- Tabla con filtros
- Búsqueda por nombre, código o asesor
- Acciones según permisos

**Detalle de Empresa** (`CompanyDetail.jsx`)
- Información general
- Configuración de crédito (tasas, plazos, etc.)
- Lista de administradores
- Asignación de asesor
- Modo edición (condicional según permisos)

#### 5. Gestión de Asesores (`/pages/advisors/`)

**Listado de Asesores** (`Advisors.jsx`)
- Tabla de asesores con filtros
- Información de contacto
- Empresas asociadas
- Estadísticas básicas

#### 6. Componentes UI Reutilizables (`/components/ui/`)

**Botones** (`ActionButton.jsx`)
- Variantes: primary, secondary, success, danger, warning, info
- Estados: normal, disabled, loading, outline
- Tamaños: sm, md, lg

**Tarjetas** (`Card.jsx`)
- Estructura flexible
- Header, body y footer configurables
- Acciones en header
- Estilos predefinidos

**Otros Componentes**
- Tablas, formularios, modales, campos de entrada, selectores, etc.

#### 7. Layout (`/components/layout/`)

**Layout Principal** (`MainLayout.jsx`)
- Estructura base para todas las páginas autenticadas
- Integración de Navbar y Sidebar

**Barra de Navegación** (`Navbar.jsx`)
- Logo
- Búsqueda global
- Notificaciones
- Menú de usuario
- Responsive

**Menú Lateral** (`Sidebar.jsx`)
- Enlaces de navegación basados en permisos
- Soporte para móviles (colapsable)
- Destacado de ruta activa

### Constantes y Configuración

**Roles de Usuario** (`roles.js`)
- SUPERADMIN: Acceso total
- ADVISOR: Gestión de solicitudes y clientes
- COMPANY_ADMIN: Administrador de empresa

**Estados de Solicitudes** (`statuses.js`)
- PENDING: Pendiente de revisión
- REVIEW: En proceso de revisión
- APPROVED: Aprobada
- REJECTED: Rechazada
- COMPLETED: Completada
- CANCELLED: Cancelada

**Tablas en Base de Datos** (`tables.js`)
- Mapeo de todas las tablas usadas en Supabase
- Nombres constantes para prevenir errores

**Permisos** (`permissions.js`)
- Definición de todos los permisos disponibles
- Asignación de permisos por rol
- Función para verificar permisos

**Tipos de Aplicaciones** (`applications.js`)
- AUTO_LOAN: Crédito Automotriz
- CAR_BACKED_LOAN: Crédito con Garantía Automotriz
- PERSONAL_LOAN: Préstamo Personal
- CASH_ADVANCE: Adelanto de Efectivo

### Flujo de Datos

1. **Autenticación**
   - Usuario ingresa credenciales
   - AuthContext verifica con Supabase
   - Se almacena sesión y token
   - Se determina rol y permisos
   - Redirección a Dashboard

2. **Navegación**
   - ProtectedRoute verifica permisos
   - MainLayout renderiza estructura base
   - Componentes de página se cargan según ruta

3. **Gestión de Solicitudes**
   - Carga de lista filtrada desde Supabase
   - Acciones según permisos del usuario
   - Cambios de estado registrados en historial
   - Notificaciones a interesados (pendiente)

4. **Gestión de Empresas**
   - SuperAdmin y Asesores pueden ver listado
   - Solo SuperAdmin puede crear/editar empresas
   - Asignación de administradores
   - Configuración de parámetros de crédito

5. **Dashboard y Reportes**
   - Datos agregados de solicitudes
   - Filtrados según rol y permisos
   - Gráficos generados con Chart.js

## Backlog Detallado

### Completado

- **Configuración del proyecto**
  - Estructura de directorios y arquitectura
  - Instalación y configuración de Tailwind CSS y DaisyUI
  - Configuración de ESLint y Prettier
  - Configuración de React Router
  - Sistema de constantes y utilidades

- **Autenticación**
  - Sistema de inicio de sesión con Supabase
  - Manejo de sesiones de usuario
  - Roles y permisos basados en roles
  - Registro de usuarios
  - Protección de rutas

- **Componentes UI**
  - Layout principal con sidebar responsive
  - ActionButton con variantes y estados
  - Card con estructura flexible
  - Tarjetas de estadísticas StatCard
  - StatusBadge para estados visuales
  - Navbar y Sidebar responsivos

- **Gestión de solicitudes**
  - Listado de solicitudes con filtros múltiples
  - Vista detallada de solicitudes
  - Cambio de estado de solicitudes con comentarios
  - Historial de cambios de estado
  - Validaciones de permisos

- **Gestión de empresas**
  - Listado de empresas con búsqueda
  - Vista detallada de empresa
  - Información de administradores

- **Gestión de asesores**
  - Listado de asesores con filtros
  - Información de contacto

- **Dashboard**
  - Estructura básica
  - Tarjetas de métricas clave
  - Area para gráficos y estadísticas

- **Sistema de permisos**
  - Constantes de permisos
  - Asignación de permisos por rol
  - Verificación de permisos en rutas
  - Contexto de permisos

### En progreso

- **Dashboard Interactivo**
  - Integración con datos reales de Supabase
  - Filtrado por fecha en gráficos y tablas
  - Gráfico de distribución de estados
  - Gráfico de evolución mensual
  - Gráfico de distribución por monto

- **Gestión avanzada de usuarios**
  - Edición de perfil de usuario
  - Gestión de contraseñas
  - Panel de administración de usuarios
  - Asignación y cambio de roles

- **Gestión de solicitudes avanzada**
  - Formulario de creación manual de solicitudes
  - Asignación de asesor a solicitudes
  - Sistema de comentarios internos
  - Flujo de trabajo configurable

### Pendiente

- **Gestión de empresas avanzada**
  - Formulario de creación/edición de empresas
  - Asignación de asesores a empresas
  - Configuración de parámetros de crédito por empresa
  - Reporte de actividad por empresa

- **Gestión de asesores avanzada**
  - Formulario de creación/edición de asesores
  - Dashboard específico para asesores
  - Métricas de rendimiento

- **Comunicación**
  - Integración con WhatsApp
  - Plantillas de mensajes configurables
  - Historial de comunicaciones
  - Programación de recordatorios

- **Documentos**
  - Carga y gestión de documentos
  - Visualizador de documentos integrado
  - Firma digital
  - Validación automática de documentos

- **Reportes**
  - Generación de reportes personalizados
  - Exportación a Excel y PDF
  - Programación de reportes periódicos
  - Gráficos avanzados

- **Notificaciones**
  - Sistema de notificaciones en tiempo real
  - Notificaciones por correo electrónico
  - Configuración de preferencias

- **Testing y optimización**
  - Pruebas unitarias e integración
  - Optimización de rendimiento
  - Manejo mejorado de errores
  - Monitoreo de rendimiento

- **Documentación**
  - Documentación técnica
  - Manual de usuario
  - Guía de desarrollo
  - Guía de API
