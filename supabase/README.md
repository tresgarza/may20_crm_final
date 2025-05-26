# Edge Functions para Firma Digital (CINCEL)

Este directorio contiene Edge Functions de Supabase para la integración con CINCEL, servicio de firma electrónica.

## Estructura

- `create-cincel-document/`: Función para crear documentos para firma en CINCEL
- `cincel-webhook/`: Endpoint webhook que recibe notificaciones cuando se firma un documento
- `check-document-status/`: Servicio de polling para verificar documentos pendientes
- `_shared/`: Código compartido entre funciones (CORS, etc.)

## Variables de entorno

Las siguientes variables de entorno deben ser configuradas en el proyecto de Supabase:

- `CINCEL_BASE_URL`: URL base de la API de CINCEL (sandbox o producción)
- `CINCEL_API_KEY`: Clave API para autenticación con CINCEL
- `CINCEL_WEBHOOK_SECRET`: Secreto compartido para validar webhooks entrantes

## Despliegue

Para desplegar estas funciones:

```bash
# Instalar Supabase CLI
npm install -g supabase

# Iniciar sesión
supabase login

# Vincular proyecto
supabase link --project-ref <ref>

# Configurar secretos
supabase secrets set CINCEL_API_KEY=<tu_api_key>
supabase secrets set CINCEL_BASE_URL=<url_api>
supabase secrets set CINCEL_WEBHOOK_SECRET=<secreto_webhook>

# Desplegar funciones
supabase functions deploy create-cincel-document
supabase functions deploy cincel-webhook 
supabase functions deploy check-document-status
```

## Webhooks

Para configurar el webhook en CINCEL:

1. Obtener la URL de la función `cincel-webhook` desde la consola de Supabase
2. Configurar en el panel de CINCEL esta URL como endpoint para eventos de firma
3. Configurar el mismo valor de `CINCEL_WEBHOOK_SECRET` que se usó en Supabase

## Polling

La función `check-document-status` puede ser ejecutada periódicamente para sincronizar documentos:

```bash
# Configurar un cron job de Supabase
supabase functions schedule set --name check-cincel-documents --schedule "0 */2 * * *" --function check-document-status
```

Esto ejecutará la revisión cada 2 horas. Ajustar según requerimientos.

## Pruebas

Para probar en ambiente local:

```bash
# Inicia las funciones Edge
supabase functions serve 