# Configuración de la API de CINCEL para firma electrónica

Para que la integración de firma electrónica funcione correctamente, es necesario configurar las siguientes variables de entorno en el archivo `.env` de la aplicación:

## Variables de entorno requeridas

```
# CINCEL API Configuration
CINCEL_BASE_URL=https://sandbox.api.cincel.digital    # URL base para ambiente de pruebas
CINCEL_API_KEY=your_cincel_api_key                   # API Key proporcionada por CINCEL
CINCEL_WEBHOOK_SECRET=your_webhook_secret            # Secreto para validar webhooks
```

## Ambientes disponibles

### Ambiente de pruebas (Sandbox)
- URL: `https://sandbox.api.cincel.digital`
- Nota: En este ambiente, las firmas no tienen validez legal pero permiten probar todo el flujo.

### Ambiente de producción 
- URL: `https://api.cincel.digital`
- Nota: En este ambiente, las firmas tienen validez legal completa.

## Configuración en el proyecto

1. Añade estas variables al archivo `.env` existente
2. Verifica que las Edge Functions tengan acceso a estas variables
3. Para despliegues en producción, asegúrate de cambiar la URL base y usar las credenciales de producción

## Resolución de problemas comunes

Si ves el error "Cannot access 'DocumentSignatureService' before initialization", puede deberse a:

1. Variables de entorno faltantes o incorrectas
2. Problemas de conectividad con la API de CINCEL
3. Error en la inicialización de los servicios frontend

Para solucionar:
- Verifica todas las variables de entorno
- Reinicia la aplicación completamente
- Revisa los logs del servidor para verificar errores en las Edge Functions 