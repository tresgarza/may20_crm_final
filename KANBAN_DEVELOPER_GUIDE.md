# Guía para Desarrolladores: Implementación de Vistas Kanban Independientes

Esta guía técnica proporciona instrucciones detalladas sobre cómo implementar y mantener la independencia entre las vistas Kanban para diferentes roles (Asesores y Administradores de Empresa) en el sistema CRM.

## Fundamentos de la Arquitectura

El sistema está diseñado con un principio clave: **las vistas Kanban para diferentes roles deben ser completamente independientes**, mientras que los indicadores de aprobación deben estar visibles para todos.

### Modelo de Datos

Cada aplicación tiene tres campos de estado relacionados:

```typescript
interface Application {
  // Estado visible para el Asesor
  advisor_status: 'NEW' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED';
  
  // Estado visible para el Admin de Empresa
  company_status: 'NEW' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED';
  
  // Estado global (derivado)
  status: 'NEW' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED';
}
```

## Implementación del Componente Kanban

### 1. Estructura de Componentes

```
KanbanBoard.tsx               # Componente base general
├── KanbanBoardAdvisor.tsx    # Vista específica para Asesores
└── KanbanBoardCompany.tsx    # Vista específica para Admins de Empresa
```

### 2. Inicialización Correcta

Para inicializar cada tablero, asegúrate de:

```tsx
// Para la vista de Asesor
<KanbanBoard 
  statusField="advisor_status"
  role="advisor"
  // otros props
/>

// Para la vista de Admin de Empresa
<KanbanBoard 
  statusField="company_status"
  role="company"
  // otros props
/>
```

### 3. Filtrado de Aplicaciones por Campo de Estado

La función `getApplicationsByStatus` debe filtrar las aplicaciones por el campo de estado específico del rol:

```tsx
const getApplicationsByStatus = (applications: Application[], status: string): Application[] => {
  return applications.filter(app => app[statusField] === status);
};
```

### 4. Actualización de Estados Independientes

Al mover una tarjeta, es crítico actualizar ÚNICAMENTE el campo de estado correspondiente al rol actual:

```tsx
const updateApplicationStatusField = async (
  applicationId: string, 
  newStatus: string,
  statusField: string
) => {
  try {
    // Actualizar SOLO el campo específico del rol
    const response = await fetch(`/api/applications/${applicationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [statusField]: newStatus })
    });
    
    // No actualizar el campo 'status' global aquí
    // ¡Este es un error común!
    
    // Resto del código...
  } catch (error) {
    // Manejo de errores
  }
};
```

### 5. Manejo Correcto del Drag & Drop

```tsx
const handleDragEnd = (result: DropResult) => {
  // ... validaciones

  // Obtener la aplicación y el nuevo estado
  const applicationId = result.draggableId;
  const newStatus = result.destination.droppableId;
  
  // Actualizar SOLO el estado específico del rol actual
  updateApplicationStatusField(applicationId, newStatus, statusField);
  
  // Actualizar localmente el estado en el front-end para el rol específico
  setApplications(prev => 
    prev.map(app => 
      app.id === applicationId 
        ? { ...app, [statusField]: newStatus }
        : app
    )
  );
};
```

## Errores Comunes a Evitar

1. **Actualización del estado global (`status`)**: Nunca actualices el campo `status` directamente cuando muevas una tarjeta. Este campo debe actualizarse a través de un mecanismo independiente basado en lógica de negocio.

   ```tsx
   // ❌ INCORRECTO
   updateApplication(id, { status: newStatus, [statusField]: newStatus });
   
   // ✅ CORRECTO
   updateApplication(id, { [statusField]: newStatus });
   ```

2. **Filtrado incorrecto**: No filtres por el estado global.

   ```tsx
   // ❌ INCORRECTO
   applications.filter(app => app.status === columnStatus);
   
   // ✅ CORRECTO
   applications.filter(app => app[statusField] === columnStatus);
   ```

3. **Actualización de estado en memoria**: Cuando actualices el estado local, asegúrate de actualizar solo el campo correspondiente.

   ```tsx
   // ❌ INCORRECTO
   setApplications(prev => 
     prev.map(app => 
       app.id === id 
       ? { ...app, status: newStatus, [statusField]: newStatus }
       : app
     )
   );
   
   // ✅ CORRECTO
   setApplications(prev => 
     prev.map(app => 
       app.id === id 
       ? { ...app, [statusField]: newStatus }
       : app
     )
   );
   ```

## Implementación de Indicadores de Aprobación

Los indicadores de aprobación deben ser visibles en todas las vistas, independientemente del estado de las tarjetas:

```tsx
const ApprovalIndicators = ({ application }) => {
  return (
    <div className="approval-indicators">
      <Badge 
        data-testid="advisor-approval-badge"
        data-approved={application.advisor_status === 'APPROVED' ? 'true' : 'false'}
        variant={application.advisor_status === 'APPROVED' ? 'success' : 'neutral'}
      >
        Asesor: {application.advisor_status === 'APPROVED' ? 'Aprobado' : 'Pendiente'}
      </Badge>
      
      <Badge 
        data-testid="company-approval-badge"
        data-approved={application.company_status === 'APPROVED' ? 'true' : 'false'}
        variant={application.company_status === 'APPROVED' ? 'success' : 'neutral'}
      >
        Empresa: {application.company_status === 'APPROVED' ? 'Aprobado' : 'Pendiente'}
      </Badge>
    </div>
  );
};
```

## Pruebas para Verificar la Independencia

Utiliza el script de prueba `KANBAN_INDEPENDENCE_TEST_PROGRAM.md` para verificar que:

1. Las tarjetas se mueven independientemente en cada vista
2. Los indicadores de aprobación son visibles en todas las vistas
3. Los estados de aprobación se actualizan correctamente

## Lista de Verificación de Implementación

- [ ] Cada vista Kanban utiliza su propio campo de estado (`advisor_status` o `company_status`)
- [ ] En la API, solo se actualiza el campo de estado del rol específico
- [ ] El filtrado de tarjetas se realiza por el campo de estado específico
- [ ] Los indicadores de aprobación son visibles para todos los roles
- [ ] Las pruebas automatizadas pasan correctamente
- [ ] Se han agregado los atributos `data-testid` necesarios para pruebas

## Mejores Prácticas Adicionales

1. **Estado global derivado**: Considera implementar una lógica de derivación para el campo `status` basada en ambos estados específicos:

   ```tsx
   // Ejemplo de regla para derivar el estado global
   function deriveGlobalStatus(advisorStatus, companyStatus) {
     if (advisorStatus === 'APPROVED' && companyStatus === 'APPROVED') {
       return 'APPROVED';
     } else if (advisorStatus === 'REJECTED' || companyStatus === 'REJECTED') {
       return 'REJECTED';
     } else if (advisorStatus === 'IN_REVIEW' || companyStatus === 'IN_REVIEW') {
       return 'IN_REVIEW';
     }
     return 'NEW';
   }
   ```

2. **Rendimiento**: Para aplicaciones con muchas tarjetas, considera implementar virtualización:

   ```tsx
   import { Virtuoso } from 'react-virtuoso';
   
   // En cada columna Kanban
   <Virtuoso
     totalCount={columnApplications.length}
     itemContent={(index) => (
       <ApplicationCard application={columnApplications[index]} />
     )}
   />
   ```

3. **Auditoría de cambios**: Mantén un registro de los cambios de estado para cada aplicación:

   ```tsx
   interface StatusChangeLog {
     applicationId: string;
     previousStatus: string;
     newStatus: string;
     statusField: string;
     changedBy: string;
     timestamp: Date;
   }
   ```

4. **Notificaciones**: Implementa notificaciones para mantener a los usuarios informados sobre cambios relevantes.

---

Al seguir esta guía, asegurarás que las vistas Kanban permanezcan completamente independientes, mientras que los indicadores de aprobación proporcionan la visibilidad necesaria del progreso en el proceso de aprobación dual. 