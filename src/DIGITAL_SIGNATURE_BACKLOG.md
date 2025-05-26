# Backlog - Integración de Firma Digital con CINCEL

## Objetivos
Implementar la firma electrónica de documentos por parte de clientes utilizando la API de CINCEL, permitiendo que:
1. Los clientes firmen documentos clave (pagaré, contrato, etc.) antes de la revisión de su solicitud
2. Los documentos firmados queden vinculados a la solicitud y al cliente en el sistema
3. Los asesores puedan verificar el estado de firma de cada documento

## Tareas

### Base de datos e infraestructura
- [x] Crear migración SQL para tabla `signed_documents` con índices, trigger y políticas RLS
- [x] Configurar bucket privado `signed-documents` en Supabase Storage con políticas RLS
- [x] Añadir variables de entorno `CINCEL_BASE_URL`, `CINCEL_API_KEY` y `CINCEL_WEBHOOK_SECRET`

### Servicios backend
- [x] Implementar servicio TypeScript `cincel.ts` con métodos para comunicación con API
- [x] Crear Edge Function `create-cincel-document` para creación segura de documentos
- [x] Crear Edge Function `cincel-webhook` para recibir notificaciones de firma completada
- [x] Implementar Edge Function `check-document-status` como respaldo al webhook para documentos en proceso

### Frontend
- [x] Crear servicio `documentSignatureService.ts` para gestionar solicitudes de firma desde la UI
- [x] Implementar componente `DocumentSignatureStatus` para mostrar estado de documentos
- [x] Implementar componente `RequestSignatureButton` para solicitar firma con selector de PDF
- [x] Integrar componentes en la vista de detalle de solicitud (ApplicationDetail.tsx)
- [ ] Actualizar vista de detalle de cliente para listar todos sus documentos firmados

### Pruebas y documentación
- [x] Crear archivo .env.example con variables requeridas
- [x] Documentar configuración necesaria en README.md
- [ ] Desarrollar tests unitarios para servicio `cincel.ts`
- [ ] Crear tests para Edge Functions con mocks de CINCEL API
- [ ] Realizar pruebas end-to-end en entorno sandbox
- [ ] Preparar guía de usuario para asesores sobre el flujo de firma digital

## Prioridades
1. Infraestructura y seguridad (mantener API key en backend)
2. Flujo de firma básico (crear documento → solicitar firma → verificar → descargar)
3. Componentes UI para facilitar el uso por asesores
4. Pruebas y documentación

## Progreso actual
- Implementada la infraestructura completa (tablas, buckets, endpoints y Edge Functions)
- Desarrollados servicios backend y frontend para comunicación segura con CINCEL 
- Creados componentes UI y su integración en el detalle de solicitud
- Configuradas variables de entorno para desarrollo
- **Siguiente paso:** Integrar componentes en detalle de cliente y desarrollar pruebas 