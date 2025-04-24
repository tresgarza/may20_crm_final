# Prueba de Independencia de Kanban

## Objetivo

Verificar que los tableros Kanban del Asesor y del Administrador de Empresa funcionan de manera totalmente independiente, sin que el movimiento de tarjetas en un tablero afecte al otro.

## Prueba Principal: Movimiento Independiente de Tarjetas

### Paso 1: Verificar Estado Inicial
1. Abrir dos navegadores diferentes o ventanas de incógnito
2. En una, iniciar sesión como Asesor
3. En la otra, iniciar sesión como Admin de Empresa
4. En ambas, navegar a la vista Kanban
5. Identificar una tarjeta que ambos puedan ver (anotar su ID)
6. Verificar la posición inicial de la tarjeta en ambos tableros

### Paso 2: Mover la Tarjeta como Asesor
1. En la vista del Asesor, mover la tarjeta de "Nuevo" a "En Revisión"
2. Tomar captura de pantalla del resultado
3. **Sin refrescar la página**, verificar inmediatamente en la vista del Admin de Empresa
4. Confirmar que la tarjeta NO se ha movido en la vista del Admin de Empresa
5. Tomar captura de pantalla como evidencia

### Paso 3: Mover la Tarjeta como Admin de Empresa
1. En la vista del Admin de Empresa, mover la misma tarjeta de "Nuevo" a "En Revisión"
2. Tomar captura de pantalla del resultado
3. Verificar la vista del Asesor
4. Confirmar que la tarjeta sigue en "En Revisión" en la vista del Asesor (donde la colocó el Asesor)
5. Tomar captura de pantalla como evidencia

### Paso 4: Aprobar la Tarjeta en Ambas Vistas
1. En la vista del Asesor, mover la tarjeta de "En Revisión" a "Aprobado"
2. En la vista del Admin de Empresa, mover la misma tarjeta de "En Revisión" a "Aprobado"
3. Tomar capturas de pantalla de ambas vistas
4. Verificar que los indicadores de aprobación muestran correctamente ambas aprobaciones

### Paso 5: Verificar Estado Global
1. Iniciar sesión como un usuario Admin (o usar la vista global)
2. Navegar a la vista Kanban
3. Verificar que la tarjeta aparece en "Por Dispersar"
4. Tomar captura de pantalla como evidencia

## Resultados Esperados

1. **Independencia Total**: Cada tablero debe mostrar sus propias tarjetas en las columnas según su propio estado (advisor_status o company_status)
2. **Sin Interferencia**: El movimiento de tarjetas en una vista no debe afectar la posición de las mismas en la otra vista
3. **Indicadores Correctos**: Los indicadores de aprobación deben mostrarse correctamente en ambas vistas
4. **Coordinación Global**: Cuando ambos aprueban, la vista global debe mostrar la tarjeta en "Por Dispersar"

## Registro de Resultados

| Paso | Descripción | Resultado | Evidencia |
|------|-------------|-----------|-----------|
| 1    | Estado inicial | [Éxito/Falla] | [Links a capturas] |
| 2    | Movimiento Asesor | [Éxito/Falla] | [Links a capturas] |
| 3    | Movimiento Admin Empresa | [Éxito/Falla] | [Links a capturas] |
| 4    | Aprobación dual | [Éxito/Falla] | [Links a capturas] |
| 5    | Estado global | [Éxito/Falla] | [Links a capturas] |

## Problemas Conocidos

Si se encuentra algún problema, documente:
1. Descripción exacta del problema
2. Pasos para reproducirlo
3. Impacto en la funcionalidad
4. Posible solución 