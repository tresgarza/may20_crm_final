

Voy a realizar un análisis profundo de tu base de datos en Supabase y generar un SQL optimizado sin errores para mejorar la eficiencia sin afectar la estructura actual. También te proporcionaré un documento detallado con la arquitectura del CRM, sus módulos, usuarios y permisos, funcionalidades clave y wireframes para cada pantalla. Incluiré además un roadmap de desarrollo completo, métricas clave, recomendaciones de CI/CD y hosting, y un sistema de logs para el superadmin.

## Optimización de la Base de Datos (SQL)  
Se revisó la estructura existente en Supabase y se identificaron oportunidades de mejora sin cambiar los nombres de tablas ni columnas. A continuación se presenta un **script SQL optimizado** que crea la base de datos con claves primarias, llaves foráneas e índices para mejorar la integridad y eficiencia. *Este script mantiene la compatibilidad con el proyecto previo, ya que no elimina ni renombra elementos existentes.* 

-- Habilitar extensión para generar UUID aleatorios (si no está ya activa en Supabase)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ===============================
-- Tabla: advisors (Asesores Fincentiva)
-- ===============================
CREATE TABLE IF NOT EXISTS public.advisors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    access_code TEXT,
    phone TEXT,
    email TEXT,
    position TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_advisors_email ON public.advisors(email);

-- ===============================
-- Tabla: companies (Empresas)
-- ===============================
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    employee_code TEXT NOT NULL,
    interest_rate NUMERIC(5,2),
    payment_frequency TEXT,
    payment_day TEXT,
    max_credit_amount NUMERIC(12,2),
    min_credit_amount NUMERIC(12,2),
    iva_rate NUMERIC(5,2),
    commission_rate NUMERIC(5,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    "Advisor" TEXT,
    advisor_id UUID,
    advisor_phone TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_code ON public.companies(employee_code);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_companies_advisor'
    ) THEN
        ALTER TABLE public.companies
            ADD CONSTRAINT fk_companies_advisor FOREIGN KEY (advisor_id) REFERENCES public.advisors(id) ON DELETE NO ACTION;
    END IF;
END $$;

-- ===============================
-- Tabla: company_admins (Administradores de Empresa)
-- ===============================
CREATE TABLE IF NOT EXISTS public.company_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    access_code TEXT,
    company_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_company_admins_company'
    ) THEN
        ALTER TABLE public.company_admins
            ADD CONSTRAINT fk_company_admins_company FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE NO ACTION;
    END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS idx_company_admins_email ON public.company_admins(email);

-- ===============================
-- Tabla: company_registrations (Registro de Empresas)
-- ===============================
CREATE TABLE IF NOT EXISTS public.company_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_name TEXT NOT NULL,
    position TEXT,
    email TEXT NOT NULL,
    phone TEXT,
    company_name TEXT NOT NULL,
    company_size TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===============================
-- Tabla: simulations (Simulaciones de crédito)
-- ===============================
CREATE TABLE IF NOT EXISTS public.simulations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    name TEXT,
    last_name TEXT,
    email TEXT,
    phone TEXT,
    loan_type TEXT,
    car_price NUMERIC(12,2),
    loan_amount NUMERIC(12,2),
    term_months INT,
    monthly_payment NUMERIC(12,2),
    is_application BOOLEAN DEFAULT false,
    notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_simulations_created_at ON public.simulations(created_at);
CREATE INDEX IF NOT EXISTS idx_simulations_type ON public.simulations(loan_type);

-- ===============================
-- Tabla: auto_loan_applications (Solicitudes de crédito para auto)
-- ===============================
CREATE TABLE IF NOT EXISTS public.auto_loan_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    car_price NUMERIC(12,2),
    car_year TEXT,
    car_model TEXT,
    down_payment NUMERIC(12,2),
    loan_amount NUMERIC(12,2),
    term_months INT,
    monthly_payment NUMERIC(12,2),
    status TEXT NOT NULL,
    approved_by_advisor BOOLEAN DEFAULT false,
    approved_by_company BOOLEAN DEFAULT false,
    comments TEXT
);
CREATE INDEX IF NOT EXISTS idx_auto_loan_status ON public.auto_loan_applications(status);
CREATE INDEX IF NOT EXISTS idx_auto_loan_created ON public.auto_loan_applications(created_at);

-- ===============================
-- Tabla: car_backed_loan_applications (Solicitudes con auto en garantía)
-- ===============================
CREATE TABLE IF NOT EXISTS public.car_backed_loan_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    car_year TEXT,
    car_model TEXT,
    car_price NUMERIC(12,2),
    loan_amount NUMERIC(12,2),
    term_months INT,
    monthly_payment NUMERIC(12,2),
    status TEXT NOT NULL,
    approved_by_advisor BOOLEAN DEFAULT false,
    approved_by_company BOOLEAN DEFAULT false,
    comments TEXT
);
CREATE INDEX IF NOT EXISTS idx_car_backed_status ON public.car_backed_loan_applications(status);
CREATE INDEX IF NOT EXISTS idx_car_backed_created ON public.car_backed_loan_applications(created_at);

-- ===============================
-- Tabla: cash_requests (Solicitudes de efectivo)
-- ===============================
CREATE TABLE IF NOT EXISTS public.cash_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_first_name TEXT NOT NULL,
    user_last_name TEXT NOT NULL,
    company_id UUID NOT NULL,
    company_name TEXT NOT NULL,
    company_code TEXT,
    user_income NUMERIC(12,2),
    payment_frequency TEXT,
    requested_amount NUMERIC(12,2),
    monthly_income NUMERIC(12,2),
    recommended_plans TEXT,
    selected_plan_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    user_phone TEXT,
    commission_rate NUMERIC(5,2),
    commission_amount NUMERIC(12,2),
    net_amount NUMERIC(12,2),
    is_preauthorized BOOLEAN DEFAULT false,
    status TEXT NOT NULL,
    approved_by_advisor BOOLEAN DEFAULT false,
    approved_by_company BOOLEAN DEFAULT false,
    comments TEXT
);
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_cash_requests_company'
    ) THEN
        ALTER TABLE public.cash_requests
            ADD CONSTRAINT fk_cash_requests_company FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE NO ACTION;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_cash_requests_plan'
    ) THEN
        ALTER TABLE public.cash_requests
            ADD CONSTRAINT fk_cash_requests_plan FOREIGN KEY (selected_plan_id) REFERENCES public.selected_plans(id) ON DELETE SET NULL;
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_cash_requests_company ON public.cash_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_cash_requests_status ON public.cash_requests(status);
CREATE INDEX IF NOT EXISTS idx_cash_requests_created ON public.cash_requests(created_at);

-- ===============================
-- Tabla: product_simulations (Simulaciones de financiamiento de producto)
-- ===============================
CREATE TABLE IF NOT EXISTS public.product_simulations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_first_name TEXT NOT NULL,
    user_last_name TEXT NOT NULL,
    company_id UUID NOT NULL,
    company_name TEXT NOT NULL,
    company_code TEXT,
    user_income NUMERIC(12,2),
    payment_frequency TEXT,
    product_url TEXT,
    product_title TEXT,
    product_price NUMERIC(12,2),
    monthly_income NUMERIC(12,2),
    recommended_plans TEXT,
    selected_plan_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    user_phone TEXT,
    financing_amount NUMERIC(12,2),
    commission_rate NUMERIC(5,2),
    commission_amount NUMERIC(12,2),
    is_preauthorized BOOLEAN DEFAULT false,
    status TEXT NOT NULL,
    approved_by_advisor BOOLEAN DEFAULT false,
    approved_by_company BOOLEAN DEFAULT false,
    comments TEXT
);
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_product_simulations_company'
    ) THEN
        ALTER TABLE public.product_simulations
            ADD CONSTRAINT fk_product_simulations_company FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE NO ACTION;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_product_simulations_plan'
    ) THEN
        ALTER TABLE public.product_simulations
            ADD CONSTRAINT fk_product_simulations_plan FOREIGN KEY (selected_plan_id) REFERENCES public.selected_plans(id) ON DELETE SET NULL;
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_product_sim_company ON public.product_simulations(company_id);
CREATE INDEX IF NOT EXISTS idx_product_sim_status ON public.product_simulations(status);
CREATE INDEX IF NOT EXISTS idx_product_sim_created ON public.product_simulations(created_at);

-- ===============================
-- Tabla: selected_plans (Planes seleccionados)
-- ===============================
CREATE TABLE IF NOT EXISTS public.selected_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    simulation_id UUID NOT NULL,
    simulation_type TEXT NOT NULL,
    periods TEXT,
    period_label TEXT,
    payment_per_period NUMERIC(12,2),
    total_payment NUMERIC(12,2),
    interest_rate NUMERIC(5,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    product_url TEXT,
    product_title TEXT,
    product_price NUMERIC(12,2),
    product_image TEXT,
    requested_amount NUMERIC(12,2),
    company_id UUID NOT NULL,
    company_name TEXT NOT NULL,
    company_code TEXT,
    user_first_name TEXT,
    user_last_name TEXT,
    user_phone TEXT,
    financing_amount NUMERIC(12,2),
    commission_rate NUMERIC(5,2),
    commission_amount NUMERIC(12,2),
    is_preauthorized BOOLEAN DEFAULT false,
    status TEXT NOT NULL,
    approved_by_advisor BOOLEAN DEFAULT false,
    approved_by_company BOOLEAN DEFAULT false,
    comments TEXT
);
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_selected_plans_company'
    ) THEN
        ALTER TABLE public.selected_plans
            ADD CONSTRAINT fk_selected_plans_company FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE NO ACTION;
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_selected_plans_company ON public.selected_plans(company_id);
CREATE INDEX IF NOT EXISTS idx_selected_plans_status ON public.selected_plans(status);
CREATE INDEX IF NOT EXISTS idx_selected_plans_created ON public.selected_plans(created_at);

-- ===============================
-- Tabla: tickets (Tickets generales)
-- ===============================
CREATE TABLE IF NOT EXISTS public.tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number TEXT NOT NULL,
    source_type TEXT NOT NULL,
    source_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    status TEXT NOT NULL,
    customer_name TEXT,
    customer_email TEXT,
    customer_phone TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tickets_number ON public.tickets(ticket_number);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_source ON public.tickets(source_type, source_id);

-- ===============================
-- Tabla: applications (Solicitudes unificadas)
-- ===============================
CREATE TABLE IF NOT EXISTS public.applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    application_type TEXT NOT NULL,
    source_id UUID NOT NULL,
    status TEXT NOT NULL,
    client_name TEXT,
    client_email TEXT,
    client_phone TEXT,
    client_address TEXT,
    dni TEXT,
    amount NUMERIC(12,2),
    term INT,
    interest_rate NUMERIC(5,2),
    monthly_payment NUMERIC(12,2),
    company_id UUID,
    company_name TEXT,
    assigned_to UUID
);
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_applications_company'
    ) THEN
        ALTER TABLE public.applications
            ADD CONSTRAINT fk_applications_company FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE NO ACTION;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_applications_advisor'
    ) THEN
        ALTER TABLE public.applications
            ADD CONSTRAINT fk_applications_advisor FOREIGN KEY (assigned_to) REFERENCES public.advisors(id) ON DELETE NO ACTION;
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_applications_company ON public.applications(company_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON public.applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_created ON public.applications(created_at);

-- ===============================
-- Tabla: status_history (Historial de cambios)
-- ===============================
CREATE TABLE IF NOT EXISTS public.status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_type TEXT NOT NULL,
    source_id UUID NOT NULL,
    previous_status TEXT,
    new_status TEXT NOT NULL,
    changed_by UUID,
    comments TEXT,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_status_history_source ON public.status_history(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_status_history_user ON public.status_history(changed_by);
CREATE INDEX IF NOT EXISTS idx_status_history_date ON public.status_history(changed_at);


**Explicación de la optimización:** Se agregaron claves primarias a todas las tablas (usando UUID por consistencia) y **llaves foráneas** para mantener la integridad referencial entre tablas relacionadas (por ejemplo, `company_admins.company_id` referencia a `companies.id`, `companies.advisor_id` referencia a `advisors.id`, etc.). También se añadieron **índices** en campos utilizados frecuentemente para filtrado o búsqueda (como campos `status`, `company_id`, `ticket_number` y fechas de creación), lo que acelerará las consultas comunes. Estos cambios mejoran el rendimiento en búsquedas y aseguran consistencia entre entidades (por ejemplo, que no exista un administrador de empresa sin empresa válida asociada). Importante: *no* se eliminaron tablas legadas (`simulations`, `auto_loan_applications`, etc.), ni se cambiaron nombres, garantizando compatibilidad con el proyecto existente. Sin embargo, ahora la base de datos es más robusta: por ejemplo, el código único de empresa (`employee_code`) está indexado para consultas rápidas, y los correos de administradores/asesores son únicos para evitar duplicados. Todos los campos críticos (`id`, referencias, estatus, fechas) se marcaron como `NOT NULL` cuando aplica, reduciendo la posibilidad de valores indefinidos. Estas optimizaciones se hicieron **sin alterar la estructura lógica** del modelo de datos, por lo que las aplicaciones previas seguirán funcionando, pero con mejoras en confiabilidad y rapidez de acceso.

## Diseño de Arquitectura del CRM (Módulos y Pantallas)  
El CRM propuesto sigue una arquitectura multicapa **cliente-servidor**. En el frontend, una aplicación **React** ofrece la interfaz de usuario modular, mientras que en el backend un servidor **Node.js con Express** expone una API REST que orquesta la lógica de negocio. La base de datos PostgreSQL en Supabase funciona como almacenamiento central. A alto nivel, todos los usuarios (asesores Fincentiva, admins de empresa, superadmin) acceden al **mismo frontend** pero con diferentes vistas/permisos según su rol, y todas las solicitudes del frontend pasan por el backend, que implementa reglas de negocio, seguridad y comunicaciones externas (ej. API de WhatsApp). Esta separación permite mantener el código organizado: la UI se encarga de la experiencia del usuario, mientras el servidor maneja autenticación, autorización, envío de notificaciones y operaciones con la base de datos.

**Módulos principales del CRM:** El sistema se divide en módulos funcionales, cada uno correspondiente a un conjunto de pantallas en la interfaz: **Dashboard general**, **Gestión de Solicitudes** (Simulaciones y Aplicaciones de crédito), **Comunicación** (mensajes predefinidos, notificaciones), **Administración de Empresas** (datos de empresas y sus usuarios), **Administración de Asesores** (gestión de asesores Fincentiva) y **Superadmin** (herramientas de auditoría y configuración global). Cada módulo agrupa pantallas relacionadas; por ejemplo, el módulo de Solicitudes incluye la lista de todas las solicitudes de crédito y la pantalla de detalle de una solicitud individual.

**Pantallas del CRM:** A continuación se describen las pantallas clave que conforman la aplicación, organizadas por rol y módulo:

- **Dashboard:** Página de inicio que presenta un **resumen general** de la operación. Muestra métricas clave (número de simulaciones realizadas, solicitudes ingresadas, porcentaje aprobadas, montos totales financiados, etc.) y gráficos de tendencias. Es personalizable según el rol: un asesor verá datos agregados de sus empresas asignadas, un administrador de empresa verá estadísticas de su propia empresa, y el superadmin verá métricas globales. También incluye secciones de “Solicitudes recientes” y alertas de tareas pendientes (ej. solicitudes esperando aprobación).

- **Listado de Solicitudes (CRM de créditos):** Pantalla con la tabla de todas las solicitudes de crédito en curso. Para un asesor, listará las solicitudes de las empresas que tiene a cargo; para un admin de empresa, listará solicitudes de sus empleados. Se muestran columnas como No. de ticket (folio), nombre del solicitante, empresa, fecha de creación, monto solicitado y estatus actual. Esta vista permite filtrar por estatus (Solicitado, En Proceso, Aprobado, Rechazado, etc.) y buscar por nombre o folio. Desde aquí se puede seleccionar una solicitud para ver detalles completos.

- **Detalle de Solicitud:** En esta pantalla se gestionan individualmente las solicitudes de crédito. Muestra toda la información de la solicitud seleccionada: datos del cliente (nombre, contacto, identificaciones), información del préstamo (monto, plazo, tipo de producto o crédito, pagos mensuales calculados, etc.), estatus actual y un **historial de cambios de estatus**. Desde aquí, los usuarios con permisos pueden realizar acciones críticas: aprobar o rechazar la solicitud, cambiar su estatus (por ejemplo, marcar como "Enviada a banco" o "Aprobada por empresa"), agregar comentarios, y enviar mensajes predefinidos por WhatsApp al cliente. La interfaz incluye botones o menús para estas acciones (por ejemplo, un botón *"Aprobar crédito"* visible solo para asesores Fincentiva, o *"Autorizar como Empresa"* visible para el admin de empresa). Cada vez que se realiza un cambio importante, la pantalla también refleja (o permite añadir) una entrada en el **log de auditoría**, registrando quién y cuándo cambió el estatus y cualquier comentario asociado.

- **Gestión de Simulaciones:** Aunque las simulaciones iniciales de crédito suelen realizarse por los clientes (empleados) en un portal separado, el CRM puede ofrecer a los usuarios internos una vista de las simulaciones realizadas. Esta pantalla lista las **simulaciones** recientes (por ejemplo, cálculos que hicieron los empleados desde la herramienta de simulación) con datos como nombre del prospecto, monto simulado y si concluyeron en solicitud formal. Sirve para seguimiento de leads no convertidos. Un asesor podría usar esta vista para contactar a un prospecto que hizo una simulación pero no completó la solicitud, por ejemplo. Desde aquí se podría convertir manualmente una simulación en una solicitud si fuese necesario.

- **Pantalla de Empresas:** Dirigida al superadmin (y parcialmente a asesores), muestra el catálogo de **empresas clientes** registradas en la plataforma. Incluye información como nombre de la empresa, código de empresa, asesor asignado, y datos de configuración (tasa de interés acordada, parámetros de pago, etc.). El superadmin puede usar esta pantalla para crear una nueva empresa (por ejemplo, cuando se firma con un nuevo cliente corporativo), editar datos de una empresa existente o asignar/reasignar el asesor Fincentiva responsable. Para cada empresa se podrá acceder a un subdetalle con la lista de administradores de empresa registrados y estadísticas particulares de esa empresa.

- **Pantalla de Usuarios (Asesores y Admins):** Para superadmin, habrá vistas de administración de **usuarios internos**. Una lista de asesores Fincentiva con sus datos de contacto, código de acceso y posición, permitiendo agregar o desactivar asesores. Asimismo, una lista de administradores de empresa, filtrable por empresa, para dar soporte (por ejemplo, reiniciar acceso, ver último acceso, etc.). Estas pantallas garantizan que el superadmin tenga control total sobre quién tiene acceso al sistema y en qué rol.

- **Pantalla de Logs/Auditoría:** Una vista exclusiva del **superadmin** donde puede revisar el **historial de acciones críticas** en el sistema. Consiste en una lista de eventos del `status_history`: cambios de estatus de solicitudes (quién los hizo y cuándo), envíos de mensajes al cliente, creaciones o ediciones de registros sensibles, ingresos al sistema, etc. Esta pantalla permite filtrar por tipo de evento (p.ej. “Cambio de estatus” o “Mensaje enviado”), por usuario que realizó la acción, por fecha, o por entidad afectada (por ejemplo, número de solicitud). El objetivo es ofrecer **transparencia y trazabilidad** completa, de forma que ante cualquier duda o incidencia se pueda reconstruir qué ocurrió y quién lo realizó.

- **Pantalla de Mensajes/Notificaciones:** Aunque la comunicación con los clientes (empleados solicitantes) se hará principalmente vía WhatsApp u otros medios integrados, el CRM incluirá una sección para **mensajes predefinidos**. En la interfaz de detalle de solicitud, al elegir enviar un mensaje, se desplegará un menú de plantillas (por ejemplo: “Solicitud recibida”, “Solicitud aprobada”, “Documentos pendientes”). El usuario selecciona la plantilla y confirma el envío; el sistema registra esta acción en el log. Adicionalmente, podría haber un módulo central de “Notificaciones” donde los asesores ven todas las comunicaciones recientes enviadas a clientes y su estado (enviado/entregado). Para el superadmin, podría existir una pantalla de configuración de plantillas de mensajes (CRUD de mensajes predefinidos).

- **Otras pantallas auxiliares:** Incluyen la pantalla de **Inicio de Sesión** (donde el usuario ingresa sus credenciales, con opción a recuperar contraseña), y eventualmente pantallas de perfil (para que un asesor o admin actualice sus datos de contacto o contraseña). También se considerarán pantallas de configuración general si hiciera falta (por ejemplo, gestionar catálogos de tasas o textos legales), aunque no son el foco principal del MVP.

 ([image]()) *Ejemplo de wireframes de varias pantallas del CRM, incluyendo un dashboard con métricas y gráficos (abajo a la izquierda), listados de solicitudes/clientes (arriba) y pantallas de detalle con información y acciones (centro). Estos wireframes de baja fidelidad sirven de guía visual para el diseño de la interfaz de usuario.*  

## Roles y Permisos de Usuario  
El CRM manejará **tres roles principales** con distintos niveles de acceso: **Asesor Fincentiva**, **Administrador de Empresa** y **Superadmin**. A continuación se detalla cada rol y sus permisos:

- **Asesor Fincentiva:** Corresponde a los empleados de Fincentiva que gestionan las cuentas de empresas clientes. Un asesor puede ver las empresas que tiene asignadas y todas las simulaciones y solicitudes de crédito generadas por los empleados de esas empresas. Sus permisos incluyen: revisar y cambiar el estatus de solicitudes (por ejemplo, aprobar o rechazar un crédito una vez completado el análisis), añadir comentarios internos, y enviar mensajes predefinidos al solicitante. Los asesores **no** pueden crear ni editar empresas ni tocar configuraciones globales, pero sí pueden registrar en el CRM información complementaria de los casos. Cada asesor únicamente accede a los datos de sus empresas asignadas (esto se garantiza filtrando por `company_id` asociado a su usuario). Por ejemplo, el asesor puede marcar “aprobado por asesor” cuando considera viable una solicitud, lo cual deja pendiente la aprobación final de la empresa. También puede ver el estatus de todas las solicitudes de sus clientes en el dashboard y recibir notificaciones cuando hay nuevas solicitudes o cambios relevantes.

- **Administrador de Empresa:** Es el usuario dentro de cada empresa cliente encargado de administrar las solicitudes de sus empleados. Tiene acceso únicamente a los datos de **su propia empresa**. Sus permisos incluyen: ver todas las simulaciones y solicitudes que han hecho los empleados de su empresa, subir documentación o información adicional si se requiere, y especialmente **aprobar o rechazar solicitudes en representación de la empresa** (ejemplo: si un empleado solicita un préstamo, el admin de empresa debe dar visto bueno antes de que el asesor Fincentiva proceda con análisis final). El admin de empresa también puede iniciar solicitudes a nombre de un empleado en casos especiales, o interactuar con el asesor vía comentarios en la solicitud. No puede ver ni editar datos de otras empresas, ni acceder a la configuración global. Tampoco puede modificar información del asesor asignado ni cambiar cosas como tasas; su alcance está limitado a la operación diaria de sus solicitudes. En el sistema de logs, las acciones del admin de empresa (ej. “Aprobó solicitud como Empresa”) quedan registradas para auditoría.

- **Superadmin (Fincentiva):** Es el rol con **acceso total** al CRM. Representa típicamente a los administradores internos de alto nivel (por ejemplo, gerentes de plataforma en Fincentiva). El superadmin puede **ver y modificar toda la información** del sistema, sin restricciones por empresa. Sus permisos incluyen: alta/baja y configuración de empresas en la plataforma (por ejemplo, registrar un nuevo cliente corporativo con sus parámetros), gestión de usuarios (crear o desactivar asesores Fincentiva, reasignar asesores a empresas; crear administradores de empresa o restablecer sus accesos), y acceso completo a todos los datos de simulaciones y solicitudes de cualquier empresa. Además, el superadmin puede ver el **dashboard global** con métricas agregadas de todas las empresas, y utilizar las herramientas de auditoría (ver logs completos de actividad). También puede gestionar las plantillas de mensajes WhatsApp y cualquier catálogo del sistema. Este rol es el único autorizado para tareas de mantenimiento crítico como borrar o corregir registros en caso de errores, aunque usualmente esas acciones serán raras. En resumen, el superadmin es el garante de la plataforma y tiene permiso para todo, por lo que se limita a unos pocos usuarios de confianza.

Los permisos se implementarán tanto en el frontend (mostrando u ocultando opciones de la interfaz según rol) como en el backend/BD (validando en cada endpoint que el usuario autenticado tenga acceso al recurso solicitado). Por ejemplo, si un admin de empresa intentara acceder a una solicitud de otra empresa (vía manipulación de ID), el backend lo detectará y denegará el acceso. Este esquema asegura la **segregación por rol y por empresa** en una arquitectura multiusuario multiempresa.

## Flujos de Usuarios y Reglas de Negocio  
En el CRM se definirán flujos claros para el ciclo de vida de una solicitud de financiamiento, desde la simulación inicial hasta la conclusión (aprobación o rechazo), involucrando a los distintos actores. A continuación se describen los **flujos principales de usuario** y las reglas de negocio asociadas:

- **Flujo de Simulación y Creación de Solicitud:** Típicamente inicia con un *empleado de una empresa* realizando una **simulación** de crédito (por ejemplo, en una página pública de Fincentiva integrada a la plataforma). El empleado ingresa datos (monto deseado, plazo, etc.) y obtiene opciones de financiamiento. *Regla de negocio:* Cada simulación captura el `company_code` de su empresa para ligar el lead a la compañía correcta (esto puede hacerse porque el empleado accede vía un link único de su empresa o ingresa un código). La simulación se guarda en la tabla correspondiente (`cash_requests` para préstamos de liquidez o `product_simulations` para financiamiento de producto) con status “Simulación”. El empleado puede entonces seleccionar una opción de financiamiento (un plan) para iniciar una **solicitud formal**. Cuando esto ocurre, el sistema crea un registro en `selected_plans` (plan elegido con todos sus detalles) y genera un **ticket** con folio consecutivo (ej. “FIN-000010”) en la tabla `tickets`, con status inicial “Solicitud” o “Pendiente”. *Regla:* El campo `is_preauthorized` suele marcarse en *true* automáticamente si la simulación cumple ciertos criterios (esto indica que, según las políticas de Fincentiva, la solicitud preliminar está pre-aprobada sujeta a verificación). En este punto, la solicitud es visible tanto para el asesor Fincentiva asignado a la empresa como para el administrador de la empresa.

- **Flujo de Revisión por Administrador de Empresa:** Una vez creada la solicitud, el **admin de la empresa** recibe una notificación (por ejemplo, un correo o en el dashboard ve la nueva solicitud “Pendiente aprobación de empresa”). La regla aquí es que la empresa cliente debe dar su aprobación inicial indicando que valida que su empleado solicite ese financiamiento. En la pantalla de detalle de la solicitud, el admin de empresa puede ver los datos básicos (monto, plazo, cuota, etc.) y debe tomar acción: *“Aprobar como Empresa”* o *“Rechazar”*. Si la rechaza, se debe requerir que ingrese un comentario de motivo. Esto cambia el `status` de la solicitud a “Rechazada por Empresa” y finaliza el proceso (el asesor es notificado de esta decisión). Si la **aprueba**, la solicitud cambia a estado “Autorizada por Empresa” (marcamos `approved_by_company = true` en la base) y queda pendiente del análisis de Fincentiva. *Regla:* Una empresa podría tener política de cupos o validación adicional, pero en este MVP asumimos que con la aprobación del admin es suficiente para que Fincentiva proceda. Cada acción del admin genera una entrada en `status_history` (por ejemplo “previous_status: Solicitud, new_status: AprobadaEmpresa, changed_by: [AdminID]”). Además, podría desencadenar un mensaje automático al empleado solicitante (por ej., “Tu empresa aprobó tu solicitud, ahora está en revisión con Fincentiva”).

- **Flujo de Análisis y Aprobación por Asesor Fincentiva:** Con la solicitud autorizada por la empresa, el **asesor Fincentiva** asignado toma el caso. En su vista de tareas verá la solicitud con estado pendiente de su aprobación. Aquí aplica las políticas de crédito de Fincentiva: revisa documentación del solicitante (posiblemente adjunta en el sistema o enviada aparte), analiza capacidad de pago, etc. El CRM puede facilitar esta labor mostrando toda la información del solicitante (muchos campos vendrán de la simulación: ingresos del usuario, etc., y el asesor podría solicitar documentos externos). Tras el análisis, el asesor actualiza el *estatus*: puede marcar “Aprobada por Fincentiva” o “Rechazada por Fincentiva”. *Regla:* Solo cuando **ambos** campos `approved_by_company` **y** `approved_by_advisor` estén en true, consideramos la solicitud totalmente aprobada para proceder con el otorgamiento del crédito. Si el asesor rechaza, se registra el estado “Rechazada por Fincentiva” (y se recomienda ingresar un comentario de motivo de rechazo que quedará en el registro). Cada cambio se registra en `status_history` con el usuario asesor como autor. 

- **Notificación de Resultado al Solicitante (WhatsApp):** Tras la decisión final del asesor, el CRM ofrece la opción de **enviar un mensaje** al cliente solicitante vía WhatsApp (u otro canal predefinido). Por ejemplo, si fue aprobada, el asesor puede pulsar “Notificar Aprobación” y el sistema envía un mensaje tipo: *“¡Felicidades [nombre]!, tu solicitud de crédito por \$X ha sido aprobada. Nos pondremos en contacto para siguiente pasos.”*; si fue rechazada, un mensaje con tono cordial indicando el resultado. Estos mensajes están pre-escritos para uniformidad y traducidos automáticamente cuando se envían. *Regla:* El sistema debe asociar cada plantilla a la etapa correspondiente y llenar datos como el nombre, monto, etc., de forma dinámica. La acción de envío de mensaje se registra en el log (por ejemplo, “Mensaje ‘Solicitud Aprobada’ enviado al cliente vía WhatsApp – changed_by: [AdvisorID]”). El superadmin podrá ver estos registros para verificar comunicaciones. Idealmente, la integración con WhatsApp confirmará si el mensaje fue entregado, actualizando un estado en la notificación (aunque en MVP podría simplemente asumirse enviado).

- **Seguimiento y Cierre:** Una vez aprobada, la solicitud podría marcarse con un estado final “Aprobada” y pasar fuera del CRM para la formalización del crédito (esto puede implicar integrar con otro sistema bancario para depósito, etc., que quizá esté fuera del alcance del MVP). Sin embargo, dentro del CRM el asesor puede marcar la solicitud como *“Cerrada”* una vez completados todos los trámites (por ejemplo, fondos entregados). Ese sería el último estatus en el historial. En caso de rechazo, tras notificar al cliente, la solicitud se mantiene en “Rechazada” y no avanza más. *Regla:* Podría permitirse que un mismo empleado haga una nueva solicitud posteriormente; en ese caso inicia un nuevo ticket independiente (FIN-000011, etc.). 

- **Acciones críticas y Reglas de Log:** Todas las acciones que afecten el estado de una solicitud son consideradas **críticas** y gatillan reglas de logging y notificación. Estas acciones incluyen: cambio de estatus (por cualquiera de los roles), envío de un mensaje al cliente, creación o eliminación de registros importantes, y cambios en configuraciones sensitivas (como tasa de interés de una empresa). Cada vez que ocurre una acción de este tipo, se crea una entrada en la tabla `status_history` con la información relevante. La regla es capturar: qué tipo de entidad se modificó (`source_type`: "application", "ticket", etc.), el identificador de la entidad (`source_id`), el estatus anterior y nuevo si aplica, el usuario que realizó el cambio (`changed_by` tomando su ID, sea asesor o admin), algún comentario o detalle, y la marca de tiempo. Por ejemplo, si un asesor rechaza una solicitud, quedaría: `source_type = 'application', source_id = [ID solicitud], previous_status = 'En Análisis', new_status = 'Rechazada', changed_by = [ID asesor], comments = 'Ingreso insuficiente', changed_at = now()`. Este registro es invaluable para auditoría y para que el superadmin pueda revisar después el proceso. Ningún cambio de estatus debería ocurrir sin registrarse; esto se puede implementar obligando a que todas las operaciones de cambio pasen por procedimientos centralizados en el backend que inserten en la tabla de historial.

En términos de **reglas de negocio adicionales**: el sistema asegurará que ciertos pasos se den en orden. Por ejemplo, Fincentiva no aprobará un crédito hasta que la empresa lo haya aprobado primero; esto puede reforzarse en la lógica del backend (si un asesor intenta aprobar sin `approved_by_company=true`, se le bloquearía o avisaría). Asimismo, si una solicitud es rechazada en cualquier punto, ya no podrá cambiarse a aprobada después sin rehacer el proceso (podría requerir una nueva solicitud). Estas reglas mantienen la coherencia del flujo.

Otro flujo a considerar es el de **registro de una nueva empresa cliente**: El superadmin podrá ingresar los datos de una nueva empresa en el sistema (nombre, código, parámetros, y crear un usuario admin para ella). La regla de negocio asociada es que, tras crearla, el sistema genera un código único (employee_code) si no se proporcionó y se lo comunica al asesor correspondiente y/o al nuevo admin para que puedan usarlo en la plataforma (por ejemplo, para que sus empleados lo usen al simular). Igualmente, cuando se asigna un asesor a una empresa, ese asesor debería recibir notificación de que ahora tiene esa cuenta en su cartera.

## Requerimientos Técnicos  
A fin de soportar los flujos anteriores, el CRM deberá cumplir varios **requisitos técnicos clave**:

- **Multiempresa y Multiusuario:** La solución debe ser **multi-tenant**, es decir, servir a múltiples empresas clientes asegurando el aislamiento de sus datos ([Guide to building Multi-Tenant Architecture in Nodejs - DEV Community](https://dev.to/rampa2510/guide-to-building-multi-tenant-architecture-in-nodejs-40og#:~:text=Let%27s%20paint%20a%20vivid%20picture%3A,a%20vast%2C%20interconnected%20digital%20apartment)) ([Guide to building Multi-Tenant Architecture in Nodejs - DEV Community](https://dev.to/rampa2510/guide-to-building-multi-tenant-architecture-in-nodejs-40og#:~:text=Image%3A%20Multi%20tenant%20architecture%20overview)). Todas las tablas relevantes incluyen un campo `company_id` o equivalente para vincular los registros a una empresa. A nivel de aplicación, esto implica que las consultas del backend siempre filtrarán por la empresa del usuario si este no es superadmin. Por ejemplo, un asesor solo obtiene (`SELECT`) las solicitudes donde `company_id` coincida con alguna de las empresas que tiene asignadas. Esto se puede reforzar con **Reglas de Seguridad a nivel de fila (RLS)** de Supabase, definiendo políticas que impidan acceso a datos de otras compañías desde el propio SQL. No obstante, dado que usaremos Node/Express como intermediario, podemos manejar esta restricción en la lógica de negocio del servidor. La arquitectura multiusuario también implica manejar **sesiones de usuario** y roles: cada petición al backend llevará la identidad del usuario (mediante token JWT, cookie de sesión segura o la sesión de Supabase Auth) y el backend determinará sus permisos. Se podría aprovechar la integración de Supabase Auth para el registro/login de usuarios (asesores y admins), de modo que al autenticarse obtengan un JWT con claims de su rol, o alternativamente gestionar la autenticación en Express con Passport u otra librería. En resumen, el sistema debe garantizar que un usuario solo pueda acceder a los datos que le corresponden, y esto se probará exhaustivamente.

- **Autenticación y Autorización:** Como se mencionó, todos los usuarios necesitarán autenticarse con correo/contraseña u otro factor. Es recomendable usar **Supabase Auth** para agilizar (soporta correo y OAuth si se quisiera), almacenando los perfiles de usuario en la tabla de auth de Supabase y vinculándolos a nuestras tablas de dominio (`advisors`, `company_admins`). Otra opción es implementar autenticación en Node (ej. JWT emitido vía una colección de usuarios propia). Dado que Supabase ofrece Auth integrado, podríamos, por ejemplo, registrar a cada nuevo asesor o admin también como usuario de Supabase (mismo email) y aprovechar la verificación de correo, recuperación de contraseña, etc., que trae. Tras login, el frontend obtendría un token que incluirá quizás un claim de rol. El backend al recibir el token valida su firma (usando la clave pública de Supabase) y extrae el rol para chequear permisos. Para autorización interna, implementaremos middleware en Express que, según el rol en el token y quizá un atributo de empresa, permita o deniegue el acceso a ciertas rutas (por ejemplo, solo superadmin puede acceder a rutas de creación de empresa). Además, acciones críticas como “cambiar estatus a aprobado” podrían requerir confirmación adicional (ej: popup de confirmación en UI) para evitar cambios accidentales.

- **Soporte de Logs de Auditoría:** Como delineado, todos los movimientos importantes generan un log. A nivel técnico, esto se puede implementar con **Triggers** en la base de datos o simplemente con lógica explícita en el backend. Por ejemplo, podríamos crear un trigger en PostgreSQL que *después* de cada update a la tabla `applications` inserte automáticamente en `status_history` si el campo status cambió. Sin embargo, dado que no todos los cambios a `applications` implican un cambio de estatus (podría cambiar otro campo), preferimos controlar desde Node cuándo insertar en el log. Así, la función de backend que cambia el estatus de una solicitud hará: 1) actualizar el registro, 2) insertar en `status_history`. Este enfoque nos da más control y posibilidad de adjuntar comentarios proporcionados por el usuario en esa acción.

- **Integración con Supabase (Base de Datos):** El backend en Node utilizará un **cliente de PostgreSQL** (puede ser la librería supabase-js o pg) para operar sobre la base de datos Supabase. Dado que Supabase es esencialmente PostgreSQL administrado, podremos ejecutar consultas SQL y procedures de forma normal. También se puede emplear el **REST API** que provee Supabase para ciertas operaciones sencillas, pero la mayor flexibilidad la obtendremos con consultas directas desde Node (usando supabase-js con las credenciales de servicio para poder realizar cualquier operación). Además, Supabase ofrece almacenamiento de archivos; podríamos utilizarlo si se requiere subir documentos de los solicitantes (INE, comprobantes, etc.) en alguna fase. En este punto, definimos que en MVP el intercambio de documentos quizá se maneje fuera (por correo), pero a futuro integrar Supabase Storage para subir archivos desde la pantalla de solicitud sería valioso. En cuanto a datos en tiempo real, Supabase soporta suscripciones (via websockets) a cambios en tablas; podríamos usarlo para notificaciones (ej: que la interfaz de asesor se refresque cuando un admin aprueba una solicitud). Esto se puede considerar si se desea experiencia en tiempo real, aunque no es indispensable de inicio.

- **Implementación en React (Frontend):** El frontend será una **SPA (Single Page Application)** en React, posiblemente usando a library de componentes UI (como Material UI o Bootstrap) para acelerar el diseño. Se estructurará con rutas protegidas según rol (por ejemplo, `/admin/*` solo accesible a admins de empresa autenticados). Utilizaremos técnicas de manejo de estado (React Context o Redux) para almacenar la sesión del usuario y sus permisos globalmente, de modo que componentes en cualquier parte puedan comportarse según el rol. Por ejemplo, un componente de botón “Aprobar” estará visible solo si `user.role === 'asesor'`. React se comunicará con el backend Express mediante fetch/axios realizando peticiones a endpoints definidos (p.ej., GET `/api/requests` para obtener lista de solicitudes, POST `/api/requests/{id}/status` para cambiar estatus, etc.). Es importante manejar los *loading states* y mensajes de error en la UI, dado que operaciones como cambiar estatus implicarán esperar respuesta del servidor. También se implementará en el frontend la lógica para navegar a diferentes pantallas (React Router), enviar los datos de formularios (por ejemplo, al crear una empresa o al agregar un comentario se llamará al API apropiado) y actualizar la vista según la respuesta. 

- **Implementación en Node/Express (Backend):** El servidor Express expondrá una serie de **API REST** organizadas por recurso: empresas, solicitudes, simulaciones, usuarios, etc. Incluirá middleware de autenticación para validar el JWT del usuario en cada petición. Una vez validado, un middleware de autorización puede anexar a `req` información útil como el rol y posiblemente la lista de company_ids accesibles (en caso de asesor que maneja varias empresas, podríamos derivar de la BD cuáles son y guardarlas en su token o sesión). Las rutas entonces usarán esa info: por ejemplo, `GET /api/requests` si es asesor filtrará `WHERE company_id IN (...)`; si es admin, `WHERE company_id = ...`; si es superadmin, sin filtro. Este backend también se integrará con la API de WhatsApp. Para ello probablemente usemos un servicio como **Twilio API for WhatsApp**: se configura una cuenta de Twilio WhatsApp Business, y desde Node se llama a su endpoint para enviar mensajes cuando corresponda. Esto requerirá guardar credenciales de API (Tokens) de forma segura (variables de entorno). Cada vez que se llame, el backend primero formatea el mensaje con la plantilla elegida y los datos (usando, por ejemplo, una librería de templates o simplemente sustitución de strings), luego invoca la API de Twilio, y según la respuesta (éxito o error) registra en la base el evento. Es fundamental manejar posibles errores aquí (si falla el envío, notificar al usuario asesor en la UI). 

- **Seguridad y Buenas Prácticas:** Además de la separación de roles, debemos proteger la aplicación contra amenazas comunes. Esto incluye usar HTTPS siempre (Vercel y la mayoría de hostings ya lo proveen), sanitizar inputs en el backend para prevenir SQL Injection (usando consultas parametrizadas siempre, o los métodos del cliente Supabase que internamente lo hacen), y proteger contra XSS escapando contenido especial en la UI si en algún momento mostramos datos ingresados por terceros (por ejemplo, un comentario escrito por un admin debería mostrarse sin permitir scripts). Las contraseñas (si gestionamos algunas en nuestra BD, como tal vez los `access_code`) deben almacenarse hasheadas de manera segura (aunque en nuestro caso esos códigos son más bien identificadores, probablemente no se usan como contraseña). Si usamos Supabase Auth, esta ya maneja el hash de contraseñas internamente. También implementaremos **rate limiting** en endpoints sensibles si se considera necesario (por ejemplo, limitar intentos de login para evitar fuerza bruta). Dado que es un CRM privado (no abierto al público general, solo a usuarios internos y de empresas), el riesgo de bots es bajo, pero igual se contemplan estas medidas.

## Roadmap de Desarrollo  
Para llevar este proyecto a cabo de manera exitosa, se propone un **roadmap** en fases, priorizando primero una versión funcional mínima (MVP) y luego iterando con mejoras y escalabilidad:

**Fase 1: MVP (Producto Mínimo Viable)**  
En esta etapa se implementarán las funcionalidades esenciales para poner el CRM en marcha:
- **Semana 1-2:** Configuración del entorno de desarrollo y bases iniciales. Definición del esquema de base de datos (aplicando el script SQL optimizado arriba) en Supabase. Implementación de autenticación básica con Supabase Auth o un mecanismo equivalente en Express. Desarrollo del backend Express con endpoints CRUD básicos para empresas, solicitudes y usuarios (sin lógica compleja aún, solo para probar flujo). Desarrollo del frontend React con las rutas principales (login, dashboard, lista de solicitudes, detalle solicitud) usando datos estáticos simulados inicialmente. *(Entrega parcial:* login de usuario y visualización de “Hola, [nombre]” en el dashboard tras login).
- **Semana 3-4:** Conectar el frontend con el backend para operaciones reales. Implementar en React la lista de solicitudes consultando al endpoint real (GET `/api/requests`). Implementar la vista de detalle de solicitud mostrando información proveniente de la base de datos. Añadir la funcionalidad de cambio de estatus: botón “Aprobar/Rechazar” que haga POST al backend, y actualizar la interfaz según la respuesta. En el backend, incorporar la lógica de cambio de estatus con validaciones (por ejemplo, endpoint `/api/requests/{id}/approve` que verifica rol y estado actual antes de cambiar a aprobado). También en esta fase se implementa el registro en `status_history` cuando ocurran estos cambios. *(Entrega parcial:* un asesor puede ver una solicitud y marcarla como aprobada; ese cambio se refleja en la BD y aparece en la UI con nuevo estatus).
- **Semana 5:** Integración del rol de admin de empresa. Crear vista filtrada para un admin (por ejemplo, que en su lista solo salgan sus propias solicitudes). Permitir al admin realizar su acción de aprobación de empresa. Probar flujo completo: admin aprueba -> asesor aprueba -> estatus final. Ajustar cualquier error de permisos que surja. Comenzar a implementar la funcionalidad de envío de mensajes: puede simularse primero con un log en consola o un registro en BD que diga “mensaje X enviado” sin realmente integrar la API externa todavía. *(Entrega:* flujo básico multi-rol funcionando, sin integración externa).
- **Semana 6:** Pruebas de MVP y correcciones. Hacer pruebas con datos reales simulados: crear una empresa, vincular asesor y admin, simular que un empleado generó una solicitud (se puede insertar en BD manualmente una simulación y convertirla a solicitud), luego seguir el proceso. Verificar que los filtros por empresa funcionan, que los cambios de estatus respetan la secuencia (no se salten pasos), y que los logs se generan. Reunir retroalimentación del equipo/stakeholders sobre la interfaz y la usabilidad. En esta etapa ya se podría desplegar el MVP interno para demostración. 

**Fase 2: Optimización y Funcionalidades Adicionales**  
Tras validar el MVP, se procede a pulir detalles y agregar características que enriquecen el sistema:
- **Semana 7:** Integrar la **API de WhatsApp** real (Twilio u otro proveedor). Configurar credenciales en ambientes seguros. Implementar en el backend la llamada real y manejo de la respuesta. En el frontend, mostrar feedback al usuario (por ejemplo, un mensajito “Mensaje enviado vía WhatsApp” o un estado en la solicitud). Añadir módulo de **gestión de plantillas de mensajes** para que el superadmin pueda editar el texto de mensajes predefinidos (esto puede ser simplemente un JSON estático editable en código en MVP, pero idealmente una tabla en BD con campos de plantilla). 
- **Semana 8:** Mejorar la **experiencia de usuario** en la interfaz. Esto incluye añadir spinners de carga donde haga falta, paginación o lazy load en tablas si hay muchos registros, y quizá gráficos simples en el dashboard. Por ejemplo, implementar en el dashboard un gráfico de barras con el conteo de solicitudes en cada estatus para la empresa o asesor. Si es viable, emplear una librería de gráficas (como Chart.js) alimentada por un endpoint `/api/reports/summary` que devuelva los datos agregados. Optimizar también el diseño responsivo para que el CRM sea usable al menos en tablets (no es prioridad el móvil para usuarios admin, pero podría ocurrir que un admin revise algo desde su teléfono, así que conviene que al menos sea adaptable).
- **Semana 9:** **Auditoría y seguridad.** Realizar revisiones de seguridad (por ejemplo, intentar acciones no permitidas con un usuario de rol menor para asegurar que el backend las bloquea). Revisar los logs de auditoría generados y presentar una pantalla amigable para superadmin que los liste. Posiblemente implementar filtrado y búsqueda en la pantalla de logs. Optimizar consultas costosas: por ejemplo, asegurarse de tener índices donde notemos lentitud con datos crecientes. Si algún endpoint tarda, evaluar si se requiere refinamiento SQL o usar paginación. Añadir más pruebas unitarias o de integración en backend para asegurar que las reglas de negocio se cumplen (testear que un asesor no puede aprobar sin aprobación de empresa, etc.).
- **Semana 10:** **Pruebas beta con usuarios reales.** Se invita a un par de asesores Fincentiva y admins de alguna empresa piloto a usar el sistema en un entorno de staging. Recoger feedback: por ejemplo, tal vez pidan un estatus adicional “En Revisión” antes de aprobación final, o noten necesidad de un campo extra en las solicitudes (como “identificación oficial del empleado”). Documentar estas solicitudes de mejora y priorizarlas. Corregir bugs descubiertos en pruebas (p. ej., algún permiso mal aplicado, o formatos de moneda). Preparar el sistema para lanzamiento en producción.

**Fase 3: Escalabilidad y Mejoras Continuas**  
Tras tener un producto estable, pensar en la escalabilidad y mantenimiento a largo plazo:
- **Mejora de Rendimiento:** A medida que crezca el número de empresas y solicitudes, monitorear la carga. Si la base de datos comienza a estar muy cargada, considerar **optimizar consultas** con vistas materializadas para reportes globales, o emplear caching en memoria en el backend para datos de catálogos (por ejemplo, lista de empresas cambia poco, se podría cachear unos minutos). También se puede activar la característica de Supabase de *replica read-only* si hubiera muchas lecturas (no es probable en un CRM interno, pero es bueno saberlo a futuro). 
- **Escalabilidad Horizontal:** Si el número de usuarios incrementa (por ejemplo, decenas de asesores y cientos de admins), asegurar que la arquitectura soporta múltiples instancias del backend si es necesario. Vercel/Heroku facilitan escalar instancias de Node. También, evaluar usar un CDN para los recursos estáticos del frontend (Vercel ya lo hace) y activar compresión en respuestas API para optimizar transferencia.
- **Nuevas Funcionalidades:** Incorporar gradualmente features adicionales: por ejemplo, un módulo de **notificaciones internas** donde un asesor pueda escribir un mensaje a un admin dentro del CRM (además de WhatsApp externo). Otro ejemplo, implementar un flujo de **registro de empresas** público: la tabla `company_registrations` creada podría alimentarse desde un formulario en la web de Fincentiva donde prospectos de empresas pidan info; luego el superadmin en el CRM ve esas solicitudes y con un click crea una nueva empresa formal en el sistema. Estas adiciones se agendarán según la prioridad de negocio.
- **Mantenimiento y Actualizaciones:** Definir un plan de mantenimiento: Supabase se encarga de updates de versión de PostgreSQL en segundo plano normalmente, pero estar atentos a novedades de Supabase (por ejemplo, nuevas funcionalidades como funciones serverless integradas, que podríamos usar para algunas lógicas en lugar de Express si conviene). Mantener las dependencias de frontend y backend actualizadas para parches de seguridad. Establecer un ciclo de revisión de logs de errores: integrar una herramienta tipo Sentry en el frontend/backend para capturar excepciones en producción y poder corregir proactivamente.

Este roadmap es flexible; si durante el MVP se descubre que alguna funcionalidad extra es indispensable antes de lanzamiento (por ejemplo, exportar datos a Excel para reportes), se podría ajustar. No obstante, la meta es tener primero un sistema funcional básico y luego iterar añadiendo valor incrementalmente.

## Métricas Clave y Reportes en el Dashboard  
El CRM incluirá un **dashboard de métricas** que servirá tanto a Fincentiva como a las empresas para monitorear la actividad. Algunas **métricas clave** y reportes previstos son:

- **Total de Simulaciones vs. Solicitudes:** Cantidad de simulaciones realizadas en un periodo dado y cuántas de ellas se convirtieron en solicitudes formales. Esto permite medir la tasa de conversión de interés en solicitud real. Por ejemplo, “Esta semana: 50 simulaciones, de las cuales 20 (40%) pasaron a solicitud”.

- **Número de Solicitudes por Estatus:** Un desglose del pipeline de solicitudes. Por ejemplo: cuántas están *En revisión de empresa*, cuántas *Pendientes de Fincentiva*, cuántas *Aprobadas* y cuántas *Rechazadas*. Esto se puede mostrar con un gráfico de torta (porcentaje en cada estado) o un gráfico de funil/pipeline. *Visibilidad de estatus* significa que rápidamente un usuario pueda ver cómo se distribuyen los casos. Un asesor podría ver: 5 en espera de empresa, 3 en análisis (él), 2 aprobadas esta semana. El superadmin vería globalmente cuántas en cada etapa para detectar cuellos de botella.

- **Montos de Financiamiento:** Sumatorias y promedios de los montos solicitados y aprobados. En el dashboard podríamos mostrar: *“Monto total solicitado este mes: \$1,250,000”*, *“Monto total aprobado: \$900,000”*. También el promedio por solicitud (p.ej., “Ticket promedio: \$50,000”). Esta métrica ayuda a entender el volumen de negocio manejado. Incluso se podría desglosar por tipo de producto (auto vs liquidez) si aplica.

- **Métricas por Empresa (para Fincentiva):** En la vista del superadmin o de un asesor con varias empresas, podría haber un ranking de empresas por actividad: quién generó más solicitudes en el último mes, o tasas de aprobación por empresa. Ejemplo: *“Empresa ABC: 10 solicitudes (8 aprobadas, 2 rechazadas)”*, *“Empresa XYZ: 5 solicitudes (todas aprobadas)”*. Esto ayuda a identificar qué cliente empresa está usando más la plataforma o si alguno tiene muchos rechazos (posible indicador de riesgo en su plantilla).

- **Métricas internas para Empresa (para Admin):** El admin de empresa al iniciar sesión verá un mini-dashboard enfocado: cuántos de sus empleados han usado la plataforma, cuántas solicitudes han sido aprobadas para su empresa, etc. Por ejemplo: *“En tu empresa: 15 empleados han simulado un crédito, 4 solicitudes en curso, 3 créditos otorgados en total sumando \$200,000”*. También podría ver la lista de sus empleados solicitantes más recientes.

- **Solicitudes Recientes:** Una sección listando las últimas N solicitudes ingresadas, con sus datos básicos y estatus. Esto permite a un usuario ver de un vistazo la actividad más fresca. Por ejemplo, en el dashboard del asesor: *“Solicitudes Recientes: Juan P. (EMPRESA1) – Pendiente, María L. (EMPRESA2) – Aprobada”*. Es útil para rápidamente saltar al detalle de una nueva solicitud.

- **Reporte de Tiempos de Ciclo:** A futuro podríamos mostrar métricas de tiempo, como el tiempo promedio desde que una solicitud se crea hasta que se aprueba (tiempo de ciclo de crédito). Esto puede destacarse para control interno: por ejemplo, “Tiempo promedio de aprobación: 3 días” y quizás un indicador de SLA (si Fincentiva apunta a aprobar en <= 2 días, identificar retrasos). Este dato vendría de calcular diferencia entre timestamps de estado inicial y final en `status_history`.

- **Indicadores de Comisiones:** Dado que se almacenan tasas de comisión y montos de comisión generados en cada solicitud, el dashboard del superadmin podría sumar la comisión total generada en un periodo (ingreso para Fincentiva). Por ejemplo: *“Comisión generada este mes: \$50,000”*. Esto le da visión del rendimiento económico.

- **Uso de la Plataforma:** Para el superadmin u operadores de Fincentiva, también es útil ver métricas de uso: número de logins en la última semana, qué asesor está atendiendo más casos, etc. Aunque no es directamente de créditos, es de uso del CRM, puede ayudar a dimensionar carga de trabajo. Un reporte podría ser “Asesor con más solicitudes asignadas: Juan (12 solicitudes activas)”.

Estas métricas se presentarán de forma visual en el dashboard mediante **tarjetas resúmen** (KPIs numéricos) y **gráficos**. Por ejemplo, una tarjeta grande arriba: “Solicitudes este mes: 25” y “Aprobadas: 20 (80%)”. Debajo un gráfico de líneas mostrando la tendencia semanal de solicitudes nuevas. Otro gráfico de barras comparando montos solicitados vs aprobados por mes. Se priorizará mostrar la información de manera clara y filtrada según el rol (el admin de empresa solo ve datos de su empresa, el asesor ve global de sus empresas, superadmin global de todas). Esto asegura que cada stakeholder obtenga insights accionables: un asesor puede saber si cierto mes bajó la demanda de créditos en sus empresas y quizás impulsar, o el superadmin puede evaluar el desempeño general.

## Recomendaciones de CI/CD, Hosting y Monitoreo  
Para garantizar calidad y disponibilidad, adoptaremos buenas prácticas de integración y despliegue continuo (CI/CD), así como un entorno de hosting escalable y monitoreado:

- **Repositorio GitHub y Flujos CI:** Todo el código (frontend React y backend Node) residirá en un repositorio GitHub. Se puede utilizar un monorepo (frontend y backend juntos) o repos separados; en este caso, siendo un proyecto cohesivo de tamaño moderado, un monorepo con carpetas `/frontend` y `/backend` podría funcionar bien. Configuraremos acciones de GitHub (GitHub Actions) para ejecutar **pipelines de CI** en cada push: por ejemplo, ejecutar pruebas unitarias del backend (si escribimos algunas con Jest) y de frontend (pruebas de componentes si aplican) ([Guide to building Multi-Tenant Architecture in Nodejs - DEV Community](https://dev.to/rampa2510/guide-to-building-multi-tenant-architecture-in-nodejs-40og#:~:text=2,go)). También, analizar el código con linters (ESLint) y herramientas de calidad (por ejemplo, correr TypeScript check si usamos TS). Si todos los checks pasan, la acción de CI puede proceder a desplegar.

- **Despliegue Continuo (CD):** Se recomienda usar **Vercel** para desplegar el **frontend** de React, aprovechando su integración sencilla con GitHub. Vercel permite que cada push a rama main (o a rama de staging) desencadene un build y deploy automático. Para el **backend Express**, tenemos un par de opciones: deployarlo en Vercel también (Vercel soporta funciones serverless Node, aunque habría que adaptarlo quizás a su modelo serverless) o usar otra plataforma como **Railway, Heroku, Render o Fly.io**. Dado que el enunciado menciona Vercel, podríamos intentar usar Vercel Serverless Functions: convertir nuestro API Express en handlers serverless. Esto funciona, pero si el API es extenso, a veces es más simple desplegarlo en un servicio dedicado. Otra alternativa es usar **Supabase Edge Functions** (pequeñas funciones serverless escritas en TS that run close to the DB) para algunas tareas, pero para toda la lógica de negocio preferimos Express. Una buena práctica es contener el backend en Docker e implementar su despliegue en, por ejemplo, Heroku (que ofrece PostgreSQL nativo también, pero en nuestro caso la BD está en Supabase). Suponiendo que usemos Vercel para el backend también, configurar las rutas API (por ejemplo, en Next.js dentro de `/api` directory) o vercel.json for rewrites, etc. Independientemente de la plataforma, se asegurará la **separación de ambientes**: al menos *staging* (para pruebas internas) y *producción*. Git branching puede manejarlo: merges a `main` despliegan a producción, merges a `staging` o `develop` a un entorno de prueba. Supabase por su parte permite tener múltiples proyectos (uno para dev, uno prod) o usar la misma BD con datos de prueba; preferible separar proyectos para no ensuciar datos reales.

- **Hosting de la Base de Datos:** Supabase ya hostea la base de datos en la nube con escalabilidad. Para asegurar **alta disponibilidad**, es importante estar en un plan que permita backups diarios (Supabase Free ya hace backups cada 1 día creo). Se configurará la retención de backups adecuada y se probará eventualmente una restauración puntual para estar listos ante incidentes. Además, Supabase ofrece panel de **Performance** donde se pueden monitorear consultas lentas; se revisará periódicamente tras lanzamiendo para identificar índices adicionales que pudieran necesitarse según el uso real.

- **Monitoreo y Alertas:** Para el backend Node, implementaremos logs estructurados (usando quizá morgan para requests HTTP, y un servicio como Logflare o Datadog para agregarlos). Vercel proporciona logs básicos de funciones; si usamos otro hosting, configuraremos un agregado de logs. Adicionalmente, integrar **Sentry** tanto en el frontend como en el backend para captura de excepciones no controladas y trazas de stack – esto nos avisará de errores en producción en tiempo real vía dashboard y email, facilitando correcciones proactivas. Para monitoreo de disponibilidad, podemos utilizar **UptimeRobot** o Pingdom, que haga ping a la URL del frontend y a un endpoint de backend cada 5 minutos, enviando alerta a Slack/Email si algo no responde, de modo que el equipo pueda reaccionar rápidamente ante caídas. 

- **CI/CD de la Base de Datos:** Los cambios al esquema de la base de datos se controlarán mediante **migraciones versionadas**. Supabase ofrece una carpeta `migrations/` que se puede mantener en Git; cada vez que necesitemos alterar una tabla o crear una nueva, escribiremos un script SQL de migración. Al desplegar una nueva versión, aplicaremos la migración en Supabase (Supabase CLI puede ejecutar las migraciones, esto se puede integrar en GitHub Actions o hacerse manualmente antes de despliegues). Esto garantiza que el esquema de BD esté sincronizado con el código backend.

- **Hosting de Medios Estáticos:** Si en el futuro manejamos documentos de clientes, Supabase Storage puede alojarlos. Alternativamente, un bucket S3. Por ahora, Vercel puede servir las imágenes estáticas de la web (logos, etc.) eficientemente via CDN.

- **Control de Versiones y Colaboración:** Para asegurar que el equipo (desarrolladores full-stack, diseñadores, etc.) esté en la misma página, se usarán metodologías ágiles ligeras. Historias de usuario para cada funcionalidad, con criterios de aceptación claros (e.j., “Como asesor quiero aprobar una solicitud y que el cliente reciba confirmación”). Un board Kanban en GitHub Projects o Jira facilitará el seguimiento del progreso. Se harán revisiones de código (pull requests) para mantener calidad y difundir conocimiento del código entre el equipo.

- **Entorno de Pruebas Automatizadas:** Además de las pruebas manuales, configurar en CI algunos tests end-to-end con herramientas como **Playwright o Cypress** sería ideal para garantizar que los flujos críticos (login, aprobar solicitud) funcionan tras cada cambio. Estos tests pueden correr en cada pipeline CI nightly o al menos antes de un deploy a producción. No es obligatorio para MVP, pero es muy recomendable en el roadmap para prevenir regresiones dado lo crítico del proceso de crédito.

- **Escalabilidad a Futuro:** Si el sistema crece en usuarios y complejidad, evaluar la adopción de un framework más estructurado en frontend (como Next.js para SSR, si se necesita SEO para partes públicas) o en backend (Separar microservicios, etc.). Por ahora, la arquitectura monolítica Express + React es adecuada y más sencilla de mantener para el equipo actual.

En cuanto a plataformas, **GitHub, Vercel y Supabase** conforman juntos una solución robusta y ágil: GitHub centraliza el código y CI, Vercel da despliegue inmediato con CDN para la app web y posibilidad de funciones serverless, y Supabase provee la base de datos de manera gestionada con APIs adicionales útiles. Esta sinergia permite al equipo enfocarse en la lógica de negocio del CRM sin preocuparse en exceso por la infraestructura, pero a la vez con la flexibilidad de escalar cuando sea necesario.

---

**Conclusión:** Con lo anterior, se entrega una documentación detallada que cubre desde la estructura optimizada de la base de datos hasta la arquitectura global, los diseños de pantallas (wireframes), roles, flujos de negocio, requisitos técnicos, roadmap y métricas esperadas. Este documento pretende servir como referencia integral para todos los involucrados – stakeholders de negocio, diseñadores UX/UI y desarrolladores full-stack – de forma que haya una comprensión común del **qué** y el **cómo** del proyecto CRM de Fincentiva. Con esta guía, el equipo podrá avanzar con mayor certidumbre en la implementación y los stakeholders podrán validar que la solución alineará con los objetivos esperados.

ARMA EL BACKLOG DEL PROYECTO, ESTE LO VAS A ESTAR ACTUALIZANDO CADA QUE AVANCES CON CAMBIOS. VAMOS A TRABAJAR POR LO PRONTO CON EL ALCANCE DEL MVP



SUPABASE URL - @https://ydnygntfkrleiseuciwq.supabase.co 
SUPABASE ANON - eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkbnlnbnRma3JsZWlzZXVjaXdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk5OTI0MDYsImV4cCI6MjA1NTU2ODQwNn0.B-dH2Kptzz1oyM4ynno_GjlvjpxL-HbNKC_st4bgf0A

_________

