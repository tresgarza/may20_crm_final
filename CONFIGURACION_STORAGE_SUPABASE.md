# Configuración del Storage en Supabase

## Problema

La aplicación está mostrando el siguiente error al intentar subir documentos:

```
Storage bucket 'documents' does not exist
```

Este error ocurre porque el bucket `documents` no existe en Supabase Storage o no está configurado correctamente.

## Solución

### Opción 1: Configuración mediante la Interfaz de Usuario de Supabase

1. Accede al panel de administración de Supabase: https://app.supabase.com
2. Selecciona tu proyecto
3. Ve a la sección "Storage" en el menú lateral
4. Haz clic en "New Bucket"
5. Configura el bucket con los siguientes parámetros:
   - **Name**: `documents`
   - **Public bucket**: Desmarcado (el bucket no debe ser público)
   - **File size limit**: 10MB
   - **Allowed MIME Types**: 
     ```
     image/png,image/jpeg,image/jpg,application/pdf,image/webp,image/gif,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document
     ```

6. Haz clic en "Create bucket"

### Opción 2: Configuración mediante SQL (Recomendado)

1. Accede al panel de administración de Supabase: https://app.supabase.com
2. Selecciona tu proyecto
3. Ve a la sección "SQL Editor" en el menú lateral
4. Haz clic en "New Query"
5. Copia y pega el contenido del archivo `supabase_storage_setup.sql` incluido en este proyecto
6. Haz clic en "Run" para ejecutar el script

## Configuración de Políticas de Seguridad (RLS)

Después de crear el bucket, es necesario configurar las políticas de Row Level Security (RLS) para permitir a los usuarios acceder a los archivos:

1. Ve a la sección "Storage" en el menú lateral
2. Selecciona el bucket `documents`
3. Ve a la pestaña "Policies"
4. Verifica que existan las siguientes políticas:
   - **SELECT**: Permitir a usuarios autenticados ver documentos
   - **INSERT**: Permitir a usuarios autenticados subir documentos
   - **UPDATE**: Permitir a usuarios autenticados actualizar sus propios documentos
   - **DELETE**: Permitir a usuarios autenticados eliminar sus propios documentos

Si ejecutaste el script SQL, estas políticas ya deberían estar configuradas.

## Verificación

Para verificar que la configuración se ha realizado correctamente:

1. Vuelve a iniciar sesión en la aplicación
2. Intenta crear un nuevo cliente o editar uno existente
3. En la sección "Documentos", sube un archivo
4. Si la carga se completa sin errores, la configuración es correcta

## Solución de Problemas

Si después de configurar el bucket sigues viendo errores:

1. Verifica que el nombre del bucket sea exactamente `documents` (respetando mayúsculas y minúsculas)
2. Comprueba que las políticas de RLS permitan las operaciones necesarias
3. Revisa la consola del navegador para ver mensajes de error más detallados
4. Si el problema persiste, contacta al equipo de desarrollo

## Más Información

Si necesitas más información sobre cómo configurar Supabase Storage, consulta la documentación oficial:
https://supabase.com/docs/guides/storage 