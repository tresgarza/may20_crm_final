# Integración con CINCEL para Firma Digital

## Descripción General

CINCEL es una plataforma que permite la firma electrónica de documentos con validez legal en México. En esta aplicación, utilizamos CINCEL para:

1. Permitir a los asesores solicitar la firma de documentos importantes a los clientes
2. Los clientes firman los documentos de manera electrónica a través de la plataforma de CINCEL
3. Los documentos firmados se almacenan en Supabase Storage y se asocian a la solicitud correspondiente

## Flujo del Proceso

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Asesor    │     │    CRM      │     │   CINCEL    │     │   Cliente   │
│             │     │             │     │             │     │             │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │                   │
       │  Solicita firma   │                   │                   │
       │──────────────────>│                   │                   │
       │                   │                   │                   │
       │                   │   Crea documento  │                   │
       │                   │───────────────────>                   │
       │                   │                   │                   │
       │                   │                   │   Envía correo    │
       │                   │                   │───────────────────>
       │                   │                   │                   │
       │                   │                   │      Firma        │
       │                   │                   │<───────────────────
       │                   │                   │                   │
       │                   │   Notificación    │                   │
       │                   │<───────────────────                   │
       │                   │                   │                   │
       │                   │ Descarga firmado  │                   │
       │                   │───────────────────>                   │
       │                   │                   │                   │
       │  Status actualizado                   │                   │
       │<──────────────────│                   │                   │
       │                   │                   │                   │
```

## Implementación Técnica

### 1. Componentes del Frontend

- **RequestSignatureButton**: Permite a los asesores seleccionar un PDF y enviarlo para firma
- **DocumentSignatureStatus**: Muestra el estado de los documentos enviados a firma asociados a una solicitud

### 2. Servicios Backend

- **documentSignatureService.ts**: Maneja la comunicación con las Edge Functions
- **Edge Functions en Supabase**:
  - `create-cincel-document`: Crea documentos en CINCEL para firma
  - `cincel-webhook`: Recibe notificaciones cuando se firman documentos
  - `check-document-status`: Consulta periódicamente el estado de los documentos

### 3. Almacenamiento

- **Tabla signed_documents**: Almacena la información de los documentos enviados a firma
- **Bucket signed-documents**: Almacena los PDFs firmados

## Configuración

Para que la integración funcione, necesitas configurar:

1. **Variables de entorno** (en el archivo `.env`):
```
CINCEL_BASE_URL=https://sandbox.api.cincel.digital
CINCEL_API_KEY=tu_api_key_de_cincel
CINCEL_WEBHOOK_SECRET=tu_secreto_de_webhook
```

2. **Database y Storage en Supabase**:
Ver `docs/FIRMA_DIGITAL_SETUP.md` para los scripts de creación

3. **Edge Functions**:
Desplegar las funciones en Supabase con los comandos adecuados

## Modo de Prueba

Durante el desarrollo, puedes usar el modo de prueba configurando `testMode = true` en `DocumentSignatureService`. Esto permite probar la funcionalidad sin necesidad de tener una cuenta real de CINCEL.

## Tipos de Documentos

Los tipos de documentos soportados actualmente son:
- Pagaré (`pagare`)
- Contrato (`contrato`)
- Autorización de Buró (`autorizacion_buro`)

## Solución de Problemas

Si encuentras problemas con la integración:

1. **Verifica la consola del navegador** para mensajes de error
2. **Confirma que la tabla signed_documents existe** en Supabase
3. **Revisa los logs de las Edge Functions** en la consola de Supabase
4. **Asegúrate de que las variables de entorno están configuradas** correctamente
5. **Prueba con el modo test habilitado** para aislar problemas 