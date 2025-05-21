# Matriz de Pruebas para Estados de Solicitudes

Este documento define una matriz completa de pruebas para verificar el comportamiento del sistema de Kanban y los indicadores de aprobación para solicitudes de crédito. Se cubren todos los posibles movimientos de estado y cómo estos afectan las visualizaciones según el rol del usuario.

## Leyenda de Indicadores

- 🟢 A: Asesor aprobado (verde)
- 🟡 A: Asesor pendiente (amarillo)
- 🔴 A: Asesor rechazado (rojo)
- 🟢 E: Empresa aprobada (verde)
- 🟡 E: Empresa pendiente (amarillo)
- 🔴 E: Empresa rechazada (rojo)

## 1. Movimientos desde estado NUEVO

### 1.1 Movimiento de NUEVO a EN REVISIÓN

#### 1.1.1 Como Asesor [x]
- **Acción:** Mover una solicitud desde NUEVO a EN REVISIÓN
- **Resultado esperado en Kanban Asesor:**
  - La tarjeta se mueve a la columna EN REVISIÓN
  - Indicadores: 🟡 A | 🟡 E
- **Resultado esperado en Kanban Empresa:**
  - La tarjeta se queda en la columna NUEVO
  - Indicadores: 🟡 A | 🟡 E
- **Vista Detalle:**
  - Estado: "En Revisión"
  - Sin indicadores de aprobación

#### 1.1.2 Como Empresa [x]
- **Acción:** Mover una solicitud desde NUEVO a EN REVISIÓN
- **Resultado esperado en Kanban Asesor:**
  - La tarjeta se mueve a la columna EN REVISIÓN
  - Indicadores: 🟡 A | 🟡 E
- **Resultado esperado en Kanban Empresa:**
  - La tarjeta se mueve a la columna EN REVISIÓN
  - Indicadores: 🟡 A | 🟡 E
- **Vista Detalle:**
  - Estado: "En Revisión"
  - Sin indicadores de aprobación

### 1.2 Movimiento de NUEVO a APROBADO

#### 1.2.1 Como Asesor [x]
- **Acción:** Mover una solicitud desde NUEVO a APROBADO
- **Resultado esperado en Kanban Asesor:**
  - La tarjeta se mueve a la columna APROBADO
  - Indicadores: 🟢 A | 🟡 E
- **Resultado esperado en Kanban Empresa:**
  - La tarjeta aparece en APROBADO
  - Indicadores: 🟢 A | 🟡 E
- **Vista Detalle:**
  - Estado: "Aprobado"
  - Aprobado por Asesor: Sí
  - Aprobado por Empresa: No

#### 1.2.2 Como Empresa [x]
- **Acción:** Mover una solicitud desde NUEVO a APROBADO
- **Resultado esperado en Kanban Asesor:**
  - La tarjeta aparece en APROBADO
  - Indicadores: 🟡 A | 🟢 E
- **Resultado esperado en Kanban Empresa:**
  - La tarjeta se mueve a la columna APROBADO
  - Indicadores: 🟡 A | 🟢 E
- **Vista Detalle:**
  - Estado: "Aprobado"
  - Aprobado por Asesor: No
  - Aprobado por Empresa: Sí

### 1.3 Movimiento de NUEVO a RECHAZADO

#### 1.3.1 Como Asesor [ ] FALLÓ
- **Acción:** Mover una solicitud desde NUEVO a RECHAZADO
- **Resultado esperado en Kanban Asesor:**
  - La tarjeta se mueve a la columna RECHAZADO
  - Indicadores: 🔴 A | 🟡 E
  - Mensaje: "Solicitud rechazada por Asesor"
- **Resultado esperado en Kanban Empresa:**
  - La tarjeta aparece en RECHAZADO
  - Indicadores: 🔴 A | 🟡 E
  - Mensaje: "Solicitud rechazada por Asesor"
- **Vista Detalle:**
  - Estado: "Rechazado"
  - Rechazado por: Asesor

#### 1.3.2 Como Empresa [ ]
- **Acción:** Mover una solicitud desde NUEVO a RECHAZADO
- **Resultado esperado en Kanban Asesor:**
  - La tarjeta aparece en RECHAZADO
  - Indicadores: 🟡 A | 🔴 E
  - Mensaje: "Solicitud rechazada por Empresa"
- **Resultado esperado en Kanban Empresa:**
  - La tarjeta se mueve a la columna RECHAZADO
  - Indicadores: 🟡 A | 🔴 E
  - Mensaje: "Solicitud rechazada por Empresa"
- **Vista Detalle:**
  - Estado: "Rechazado"
  - Rechazado por: Empresa

## 2. Movimientos desde estado EN REVISIÓN

### 2.1 Movimiento de EN REVISIÓN a NUEVO

#### 2.1.1 Como Asesor [ ]
- **Acción:** Mover una solicitud desde EN REVISIÓN a NUEVO
- **Resultado esperado en Kanban Asesor:**
  - La tarjeta se mueve a la columna NUEVO
  - Indicadores: 🟡 A | 🟡 E
- **Resultado esperado en Kanban Empresa:**
  - La tarjeta aparece en NUEVO
  - Indicadores: 🟡 A | 🟡 E
- **Vista Detalle:**
  - Estado: "Nuevo"
  - Sin indicadores de aprobación

#### 2.1.2 Como Empresa [ ]
- **Acción:** Mover una solicitud desde EN REVISIÓN a NUEVO
- **Resultado esperado en Kanban Asesor:**
  - La tarjeta aparece en NUEVO
  - Indicadores: 🟡 A | 🟡 E
- **Resultado esperado en Kanban Empresa:**
  - La tarjeta se mueve a la columna NUEVO
  - Indicadores: 🟡 A | 🟡 E
- **Vista Detalle:**
  - Estado: "Nuevo"
  - Sin indicadores de aprobación

### 2.2 Movimiento de EN REVISIÓN a APROBADO

#### 2.2.1 Como Asesor [ ]
- **Acción:** Mover una solicitud desde EN REVISIÓN a APROBADO
- **Resultado esperado en Kanban Asesor:**
  - La tarjeta se mueve a la columna APROBADO
  - Indicadores: 🟢 A | 🟡 E
- **Resultado esperado en Kanban Empresa:**
  - La tarjeta aparece en APROBADO
  - Indicadores: 🟢 A | 🟡 E
- **Vista Detalle:**
  - Estado: "Aprobado"
  - Aprobado por Asesor: Sí
  - Aprobado por Empresa: No

#### 2.2.2 Como Empresa [ ]
- **Acción:** Mover una solicitud desde EN REVISIÓN a APROBADO
- **Resultado esperado en Kanban Asesor:**
  - La tarjeta aparece en APROBADO
  - Indicadores: 🟡 A | 🟢 E
- **Resultado esperado en Kanban Empresa:**
  - La tarjeta se mueve a la columna APROBADO
  - Indicadores: 🟡 A | 🟢 E
- **Vista Detalle:**
  - Estado: "Aprobado"
  - Aprobado por Asesor: No
  - Aprobado por Empresa: Sí

### 2.3 Movimiento de EN REVISIÓN a RECHAZADO

#### 2.3.1 Como Asesor [ ]
- **Acción:** Mover una solicitud desde EN REVISIÓN a RECHAZADO
- **Resultado esperado en Kanban Asesor:**
  - La tarjeta se mueve a la columna RECHAZADO
  - Indicadores: 🔴 A | 🟡 E
  - Mensaje: "Solicitud rechazada por Asesor"
- **Resultado esperado en Kanban Empresa:**
  - La tarjeta aparece en RECHAZADO
  - Indicadores: 🔴 A | 🟡 E
  - Mensaje: "Solicitud rechazada por Asesor"
- **Vista Detalle:**
  - Estado: "Rechazado"
  - Rechazado por: Asesor

#### 2.3.2 Como Empresa [ ]
- **Acción:** Mover una solicitud desde EN REVISIÓN a RECHAZADO
- **Resultado esperado en Kanban Asesor:**
  - La tarjeta aparece en RECHAZADO
  - Indicadores: 🟡 A | 🔴 E
  - Mensaje: "Solicitud rechazada por Empresa"
- **Resultado esperado en Kanban Empresa:**
  - La tarjeta se mueve a la columna RECHAZADO
  - Indicadores: 🟡 A | 🔴 E
  - Mensaje: "Solicitud rechazada por Empresa"
- **Vista Detalle:**
  - Estado: "Rechazado"
  - Rechazado por: Empresa

## 3. Movimientos desde estado APROBADO

### 3.1 Aprobaciones y Estado POR DISPERSAR

#### 3.1.1 Aprobación Asesor seguida de Aprobación Empresa [ ]
- **Acción:** Asesor aprueba la solicitud, luego Empresa la aprueba
- **Resultado esperado en ambos Kanbans:**
  - La tarjeta se mueve a la columna POR DISPERSAR
  - Indicadores: 🟢 A | 🟢 E
  - Mensaje: "Aprobación completa"
- **Vista Detalle:**
  - Estado: "Por Dispersar"
  - Aprobado por Asesor: Sí
  - Aprobado por Empresa: Sí
  - Fecha Aprobación Asesor: (fecha)
  - Fecha Aprobación Empresa: (fecha)

#### 3.1.2 Aprobación Empresa seguida de Aprobación Asesor [ ]
- **Acción:** Empresa aprueba la solicitud, luego Asesor la aprueba
- **Resultado esperado en ambos Kanbans:**
  - La tarjeta se mueve a la columna POR DISPERSAR
  - Indicadores: 🟢 A | 🟢 E
  - Mensaje: "Aprobación completa"
- **Vista Detalle:**
  - Estado: "Por Dispersar"
  - Aprobado por Asesor: Sí
  - Aprobado por Empresa: Sí
  - Fecha Aprobación Asesor: (fecha)
  - Fecha Aprobación Empresa: (fecha)

### 3.2 Movimiento de APROBADO a EN REVISIÓN

#### 3.2.1 Como Asesor (cuando solo él ha aprobado) [ ]
- **Acción:** Mover una solicitud desde APROBADO a EN REVISIÓN
- **Resultado esperado en Kanban Asesor:**
  - La tarjeta se mueve a la columna EN REVISIÓN
  - Indicadores: 🟡 A | 🟡 E
- **Resultado esperado en Kanban Empresa:**
  - La tarjeta aparece en EN REVISIÓN
  - Indicadores: 🟡 A | 🟡 E
- **Vista Detalle:**
  - Estado: "En Revisión"
  - Sin indicadores de aprobación

#### 3.2.2 Como Empresa (cuando solo ella ha aprobado) [ ]
- **Acción:** Mover una solicitud desde APROBADO a EN REVISIÓN
- **Resultado esperado en Kanban Asesor:**
  - La tarjeta aparece en EN REVISIÓN
  - Indicadores: 🟡 A | 🟡 E
- **Resultado esperado en Kanban Empresa:**
  - La tarjeta se mueve a la columna EN REVISIÓN
  - Indicadores: 🟡 A | 🟡 E
- **Vista Detalle:**
  - Estado: "En Revisión"
  - Sin indicadores de aprobación

### 3.3 Movimiento de APROBADO a RECHAZADO

#### 3.3.1 Como Asesor (cuando solo él o ambos han aprobado) [ ]
- **Acción:** Mover una solicitud desde APROBADO a RECHAZADO
- **Resultado esperado en Kanban Asesor:**
  - La tarjeta se mueve a la columna RECHAZADO
  - Indicadores: 🔴 A | 🟢 E o 🟡 E (dependiendo si empresa aprobó)
  - Mensaje: "Solicitud rechazada por Asesor"
- **Resultado esperado en Kanban Empresa:**
  - La tarjeta aparece en RECHAZADO
  - Indicadores: 🔴 A | 🟢 E o 🟡 E
  - Mensaje: "Solicitud rechazada por Asesor"
- **Vista Detalle:**
  - Estado: "Rechazado"
  - Rechazado por: Asesor

#### 3.3.2 Como Empresa (cuando solo ella o ambos han aprobado) [ ]
- **Acción:** Mover una solicitud desde APROBADO a RECHAZADO
- **Resultado esperado en Kanban Asesor:**
  - La tarjeta aparece en RECHAZADO
  - Indicadores: 🟢 A o 🟡 A | 🔴 E (dependiendo si asesor aprobó)
  - Mensaje: "Solicitud rechazada por Empresa"
- **Resultado esperado en Kanban Empresa:**
  - La tarjeta se mueve a la columna RECHAZADO
  - Indicadores: 🟢 A o 🟡 A | 🔴 E
  - Mensaje: "Solicitud rechazada por Empresa"
- **Vista Detalle:**
  - Estado: "Rechazado"
  - Rechazado por: Empresa

## 4. Movimientos desde estado RECHAZADO

### 4.1 Movimiento de RECHAZADO a NUEVO

#### 4.1.1 Como Asesor (cuando él rechazó) [ ]
- **Acción:** Mover una solicitud desde RECHAZADO a NUEVO
- **Resultado esperado en Kanban Asesor:**
  - La tarjeta se mueve a la columna NUEVO
  - Indicadores: 🟡 A | 🟡 E
- **Resultado esperado en Kanban Empresa:**
  - La tarjeta aparece en NUEVO
  - Indicadores: 🟡 A | 🟡 E
- **Vista Detalle:**
  - Estado: "Nuevo"
  - Sin indicadores de rechazo

#### 4.1.2 Como Empresa (cuando ella rechazó) [ ]
- **Acción:** Mover una solicitud desde RECHAZADO a NUEVO
- **Resultado esperado en Kanban Asesor:**
  - La tarjeta aparece en NUEVO
  - Indicadores: 🟡 A | 🟡 E
- **Resultado esperado en Kanban Empresa:**
  - La tarjeta se mueve a la columna NUEVO
  - Indicadores: 🟡 A | 🟡 E
- **Vista Detalle:**
  - Estado: "Nuevo"
  - Sin indicadores de rechazo

### 4.2 Movimiento de RECHAZADO a EN REVISIÓN

#### 4.2.1 Como Asesor (cuando él rechazó) [ ]
- **Acción:** Mover una solicitud desde RECHAZADO a EN REVISIÓN
- **Resultado esperado en Kanban Asesor:**
  - La tarjeta se mueve a la columna EN REVISIÓN
  - Indicadores: 🟡 A | 🟡 E
- **Resultado esperado en Kanban Empresa:**
  - La tarjeta aparece en EN REVISIÓN
  - Indicadores: 🟡 A | 🟡 E
- **Vista Detalle:**
  - Estado: "En Revisión"
  - Sin indicadores de rechazo

#### 4.2.2 Como Empresa (cuando ella rechazó) [ ]
- **Acción:** Mover una solicitud desde RECHAZADO a EN REVISIÓN
- **Resultado esperado en Kanban Asesor:**
  - La tarjeta aparece en EN REVISIÓN
  - Indicadores: 🟡 A | 🟡 E
- **Resultado esperado en Kanban Empresa:**
  - La tarjeta se mueve a la columna EN REVISIÓN
  - Indicadores: 🟡 A | 🟡 E
- **Vista Detalle:**
  - Estado: "En Revisión"
  - Sin indicadores de rechazo

### 4.3 Movimiento de RECHAZADO a APROBADO

#### 4.3.1 Como Asesor (cuando él rechazó) [ ]
- **Acción:** Mover una solicitud desde RECHAZADO a APROBADO
- **Resultado esperado en Kanban Asesor:**
  - La tarjeta se mueve a la columna APROBADO
  - Indicadores: 🟢 A | 🟡 E
- **Resultado esperado en Kanban Empresa:**
  - La tarjeta aparece en APROBADO
  - Indicadores: 🟢 A | 🟡 E
- **Vista Detalle:**
  - Estado: "Aprobado"
  - Aprobado por Asesor: Sí
  - Aprobado por Empresa: No

#### 4.3.2 Como Empresa (cuando ella rechazó) [ ]
- **Acción:** Mover una solicitud desde RECHAZADO a APROBADO
- **Resultado esperado en Kanban Asesor:**
  - La tarjeta aparece en APROBADO
  - Indicadores: 🟡 A | 🟢 E
- **Resultado esperado en Kanban Empresa:**
  - La tarjeta se mueve a la columna APROBADO
  - Indicadores: 🟡 A | 🟢 E
- **Vista Detalle:**
  - Estado: "Aprobado"
  - Aprobado por Asesor: No
  - Aprobado por Empresa: Sí

#### 4.3.3 Caso especial: Aplicación rechazada con una aprobación previa [ ]
- **Acción:** Mover una solicitud RECHAZADA con una aprobación previa (por ejemplo, asesor aprobó pero empresa rechazó) a APROBADO
- **Resultado esperado en Kanban:** 
  - Si el que mueve es el que rechazó, la tarjeta se mueve a APROBADO con su indicador en verde
  - Si ambas partes aprueban, pasa a POR DISPERSAR
- **Vista Detalle:**
  - Estado: "Aprobado" o "Por Dispersar" según el caso

## 5. Movimientos desde estado POR DISPERSAR

### 5.1 Movimiento de POR DISPERSAR a COMPLETADO (solo Asesor o Admin) [ ]
- **Acción:** Asesor marca una solicitud por dispersar como COMPLETADO
- **Resultado esperado en ambos Kanbans:**
  - La tarjeta se mueve a la columna COMPLETADO
  - Indicadores: 🟢 A | 🟢 E
  - Mensaje: "Aprobación completa"
- **Vista Detalle:**
  - Estado: "Completado"
  - Fecha de Dispersión: (fecha)
  - Aprobado por Asesor: Sí
  - Aprobado por Empresa: Sí

### 5.2 Movimiento de POR DISPERSAR a EN REVISIÓN

#### 5.2.1 Como Asesor [ ]
- **Acción:** Mover una solicitud desde POR DISPERSAR a EN REVISIÓN
- **Resultado esperado en Kanban Asesor:**
  - La tarjeta se mueve a la columna EN REVISIÓN
  - Indicadores: 🟡 A | 🟢 E
- **Resultado esperado en Kanban Empresa:**
  - La tarjeta aparece en EN REVISIÓN
  - Indicadores: 🟡 A | 🟢 E
- **Vista Detalle:**
  - Estado: "En Revisión"
  - Se quita aprobación del Asesor

#### 5.2.2 Como Empresa [ ]
- **Acción:** Mover una solicitud desde POR DISPERSAR a EN REVISIÓN
- **Resultado esperado en Kanban Asesor:**
  - La tarjeta aparece en EN REVISIÓN
  - Indicadores: 🟢 A | 🟡 E
- **Resultado esperado en Kanban Empresa:**
  - La tarjeta se mueve a la columna EN REVISIÓN
  - Indicadores: 🟢 A | 🟡 E
- **Vista Detalle:**
  - Estado: "En Revisión"
  - Se quita aprobación de la Empresa

### 5.3 Movimiento de POR DISPERSAR a RECHAZADO

#### 5.3.1 Como Asesor [ ]
- **Acción:** Mover una solicitud desde POR DISPERSAR a RECHAZADO
- **Resultado esperado en Kanban Asesor:**
  - La tarjeta se mueve a la columna RECHAZADO
  - Indicadores: 🔴 A | 🟢 E
  - Mensaje: "Solicitud rechazada por Asesor"
- **Resultado esperado en Kanban Empresa:**
  - La tarjeta aparece en RECHAZADO
  - Indicadores: 🔴 A | 🟢 E
  - Mensaje: "Solicitud rechazada por Asesor"
- **Vista Detalle:**
  - Estado: "Rechazado"
  - Rechazado por: Asesor

#### 5.3.2 Como Empresa [ ]
- **Acción:** Mover una solicitud desde POR DISPERSAR a RECHAZADO
- **Resultado esperado en Kanban Asesor:**
  - La tarjeta aparece en RECHAZADO
  - Indicadores: 🟢 A | 🔴 E
  - Mensaje: "Solicitud rechazada por Empresa"
- **Resultado esperado en Kanban Empresa:**
  - La tarjeta se mueve a la columna RECHAZADO
  - Indicadores: 🟢 A | 🔴 E
  - Mensaje: "Solicitud rechazada por Empresa"
- **Vista Detalle:**
  - Estado: "Rechazado"
  - Rechazado por: Empresa

## 6. Casos especiales y escenarios de borde

### 6.1 Solicitud con Asesor aprobado y Empresa rechazado [ ]
- **Condición inicial:** Asesor ha aprobado la solicitud, pero luego Empresa la rechaza
- **Resultado esperado:**
  - Indicadores: 🟢 A | 🔴 E
  - Estado global: RECHAZADO
  - Mensaje: "Solicitud rechazada por Empresa"

### 6.2 Solicitud con Empresa aprobada y Asesor rechazado [ ]
- **Condición inicial:** Empresa ha aprobado la solicitud, pero luego Asesor la rechaza
- **Resultado esperado:**
  - Indicadores: 🔴 A | 🟢 E
  - Estado global: RECHAZADO
  - Mensaje: "Solicitud rechazada por Asesor"

### 6.3 Cambio de aprobación a rechazo por el mismo rol [ ]
- **Acción:** Un rol aprueba una solicitud y luego la rechaza
- **Resultado esperado:**
  - Se quita el indicador de aprobación
  - Se agrega el indicador de rechazo
  - El estado global cambia según corresponda

### 6.4 Ver el historial de cambios de estado [ ]
- **Acción:** Revisar el historial de una solicitud que ha pasado por varios estados
- **Resultado esperado:**
  - El historial muestra todos los cambios con fechas y usuarios que los realizaron

## 7. Verificación de conservación del estado al navegar

### 7.1 Conservación del estado tras refrescar la página [ ]
- **Acción:** Hacer cambios de estado y refrescar la página
- **Resultado esperado:**
  - Los cambios de estado y aprobaciones permanecen después de refrescar

### 7.2 Conservación del estado entre diferentes vistas [ ]
- **Acción:** Cambiar entre vista Kanban y vista Lista
- **Resultado esperado:**
  - Los estados e indicadores se muestran correctamente en ambas vistas

## 8. Verificación por roles de usuario

### 8.1 Como Superadmin [ ]
- **Acción:** Realizar todas las acciones anteriores como Superadmin
- **Resultado esperado:**
  - Poder realizar todos los movimientos posibles sin restricciones

### 8.2 Restricciones para Asesor [ ]
- **Acción:** Intentar mover solicitudes a estados no permitidos para Asesor
- **Resultado esperado:**
  - Las tarjetas solo se pueden arrastrar a columnas permitidas

### 8.3 Restricciones para Empresa [ ]
- **Acción:** Intentar mover solicitudes a estados no permitidos para Empresa
- **Resultado esperado:**
  - Las tarjetas solo se pueden arrastrar a columnas permitidas 