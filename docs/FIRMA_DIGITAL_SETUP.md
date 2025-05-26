# Configuración de Firma Digital

Este documento describe los pasos necesarios para configurar la funcionalidad de firma digital con CINCEL en el CRM.

## 1. Creación de la tabla en la base de datos

Ejecuta el siguiente script SQL en el SQL Editor de Supabase para crear la tabla `signed_documents`:

```sql
-- Add the UUID extension if it's not already added
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the signed_documents table
CREATE TABLE IF NOT EXISTS public.signed_documents (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  application_id uuid NOT NULL,
  client_id uuid NOT NULL,
  document_type text NOT NULL,
  cincel_document_id text NOT NULL,
  status text NOT NULL,
  signed_at timestamp with time zone,
  file_path text,
  sha256_hash text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.signed_documents ENABLE ROW LEVEL SECURITY;

-- Create public access policy (for development only - replace with proper policies later)
CREATE POLICY "Allow public access to signed_documents" ON public.signed_documents
  USING (true)
  WITH CHECK (true);
```

## 2. Creación del bucket de Storage

Ejecuta el siguiente script SQL para crear el bucket de almacenamiento para documentos firmados:

```sql
-- Create storage bucket for signed documents if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('signed-documents', 'signed-documents', true)
ON CONFLICT (id) DO NOTHING;
```

También puedes crear el bucket manualmente desde la interfaz de Supabase:
1. Ve a Storage en la barra lateral
2. Haz clic en "New Bucket"
3. Nombra el bucket como "signed-documents"
4. Desactiva "Public bucket" si deseas que los documentos sean privados

## 3. Configuración de las Edge Functions

Implementa las siguientes Edge Functions en Supabase:

### create-cincel-document

Esta función se encarga de crear un documento en CINCEL para firma.

### cincel-webhook

Esta función recibe notificaciones de CINCEL cuando un documento ha sido firmado.

### check-document-status

Esta función consulta periódicamente el estado de los documentos enviados a firma.

## 4. Configuración de variables de entorno

Asegúrate de configurar las siguientes variables de entorno en tu aplicación y en las Edge Functions:

```
CINCEL_BASE_URL=https://sandbox.api.cincel.digital
CINCEL_API_KEY=tu_api_key_de_cincel
CINCEL_WEBHOOK_SECRET=tu_secreto_de_webhook
```

## 5. Prueba de la funcionalidad

Para probar la funcionalidad:

1. Abre la vista de detalle de una solicitud
2. Haz clic en el botón "Solicitar Firma"
3. Selecciona uno de los tipos de documentos (Pagaré, Contrato, Autorización de Buró)
4. Sube un documento PDF
5. Verifica que el documento aparezca en la sección de "Documentos para Firma Digital"

## Modo de prueba

Durante el desarrollo, puedes activar el modo de prueba en `DocumentSignatureService` cambiando:

```typescript
private static testMode = true;
```

Esto permitirá probar la funcionalidad sin necesidad de tener configuradas las Edge Functions ni las claves de API de CINCEL, utilizando datos simulados. 