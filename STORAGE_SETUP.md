# Configuración del almacenamiento Supabase

## Problema

Se ha detectado un error al intentar crear automáticamente el bucket de almacenamiento `documents` en Supabase:

```
StorageApiError: new row violates row-level security policy
```

Este error ocurre porque los usuarios regulares no tienen permisos para crear buckets de almacenamiento en Supabase, incluso si tienen permisos para insertar/leer/actualizar archivos.

## Solución

Este problema requiere acción por parte de un administrador con acceso al panel de Supabase:

### Opción 1: Crear el bucket desde la interfaz de Supabase

1. Acceder al panel de administración de Supabase
2. Ir a la sección "Storage"
3. Hacer clic en "Create new bucket"
4. Nombrar el bucket `documents`
5. Desmarcar la opción "Public" para hacerlo privado
6. Establecer un límite de tamaño de archivo de 10MB
7. Guardar

### Opción 2: Crear el bucket mediante SQL

1. Acceder al panel de administración de Supabase
2. Ir a la sección "SQL Editor"
3. Crear una nueva consulta
4. Copiar y pegar el contenido del archivo `supabase_bucket_setup.sql`
5. Ejecutar la consulta

## Políticas de seguridad

El script SQL también crea las siguientes políticas de seguridad para el bucket:

- Los usuarios autenticados pueden ver archivos si:
  - Son asesores del cliente al que pertenece el documento
  - Son los que subieron el archivo
  - Son administradores de la empresa
- Los usuarios autenticados pueden subir archivos al bucket
- Los usuarios solo pueden actualizar o eliminar archivos que hayan subido ellos mismos (o si son administradores)

## Después de la configuración

Una vez que el bucket ha sido creado por un administrador, la aplicación funcionará correctamente y no intentará crear el bucket nuevamente.

Si los usuarios continúan viendo errores, asegúrese de que las políticas de seguridad están configuradas correctamente en la sección "Storage" > "Policies" del panel de Supabase. 