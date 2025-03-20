import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Application, getApprovalStatus, approveByAdvisor, approveByCompany } from '../../services/applicationService';
import { STATUS_COLORS, APPLICATION_STATUS, STATUS_LABELS } from '../../utils/constants/statuses';
import { usePermissions } from '../../contexts/PermissionsContext';
import { useAuth } from '../../contexts/AuthContext';

// Función para escapar cadenas de texto para SQL
function escapeSQLString(str: string) {
  if (!str) return '';
  return str.replace(/'/g, "''");
}

interface KanbanBoardProps {
  applications: Application[];
  onStatusChange?: (application: Application, newStatus: string) => Promise<void>;
}

// Interfaz para el estado de aprobación
interface ApprovalStatus {
  approvedByAdvisor: boolean;
  approvedByCompany: boolean;
}

// Crear un tipo para aplicaciones con su estado de aprobación
type ApplicationWithApproval = Application & {
  approvalStatus?: ApprovalStatus;
  isMoving?: boolean;
  targetStatus?: string;
};

const KanbanBoard: React.FC<KanbanBoardProps> = ({ applications, onStatusChange }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [appsWithApproval, setAppsWithApproval] = useState<ApplicationWithApproval[]>([]);
  const [processingAppId, setProcessingAppId] = useState<string | null>(null);
  const { shouldFilterByEntity, getEntityFilter, isAdvisor, isCompanyAdmin } = usePermissions();
  const { user } = useAuth();
  const dragItemRef = useRef<HTMLDivElement | null>(null);
  const dragImageRef = useRef<HTMLDivElement | null>(null);
  const draggedItemIndexRef = useRef<number>(-1);
  const draggedItemNewStatusRef = useRef<string>('');
  
  // Cargar los estados de aprobación para cada aplicación
  useEffect(() => {
    const loadApprovalStatuses = async () => {
      if (!applications || applications.length === 0) {
        setAppsWithApproval([]);
        return;
      }
      
      const entityFilter = shouldFilterByEntity() ? getEntityFilter() : null;
      
      try {
        const updatedApps = await Promise.all(
          applications.map(async (app) => {
            try {
              const approvalStatus = await getApprovalStatus(app.id, entityFilter);
              return { ...app, approvalStatus };
            } catch (error) {
              console.error(`Error loading approval status for app ${app.id}:`, error);
              return app;
            }
          })
        );
        
        setAppsWithApproval(updatedApps);
      } catch (error) {
        console.error("Error cargando estados de aprobación:", error);
        setAppsWithApproval(applications.map(app => ({ ...app })));
      }
    };
    
    loadApprovalStatuses();
  }, [applications, shouldFilterByEntity, getEntityFilter]);
  
  // Optimizar el rendimiento de la función que agrupa aplicaciones por estado
  const groupedApplications = React.useMemo(() => {
    // Crear un objeto con todos los estados posibles como claves y arrays vacíos como valores
    const initialGroups = Object.values(APPLICATION_STATUS).reduce((acc, status) => {
      acc[status] = [];
      return acc;
    }, {} as Record<string, ApplicationWithApproval[]>);
    
    // Luego añadir las aplicaciones a sus grupos correspondientes
    return appsWithApproval.reduce((acc, app) => {
      if (app.isMoving && app.targetStatus) {
        // Si está en movimiento, colocarla en la columna de destino
        acc[app.targetStatus].push(app);
      } else {
        // Si no, usar el estado normal
        const status = app.status || 'pending';
        acc[status].push(app);
      }
      return acc;
    }, initialGroups);
  }, [appsWithApproval]);
  
  // Optimizar la creación de columnas para eliminar validaciones innecesarias
  const columns = React.useMemo(() => {
    return Object.values(APPLICATION_STATUS).map(status => ({
      id: status,
      title: STATUS_LABELS[status as keyof typeof STATUS_LABELS] || status,
      color: STATUS_COLORS[status as keyof typeof STATUS_COLORS] || 'neutral',
      applications: groupedApplications[status] || []
    }));
  }, [groupedApplications]);
  
  // Función para actualizar localmente el estado de aprobación de una aplicación
  const updateLocalApprovalStatus = (applicationId: string, updates: Partial<{ approvedByAdvisor: boolean, approvedByCompany: boolean }>) => {
    setAppsWithApproval(prev => 
      prev.map(app => 
        app.id === applicationId
          ? {
              ...app,
              approvalStatus: {
                ...(app.approvalStatus || { approvedByAdvisor: false, approvedByCompany: false }),
                ...updates
              }
            }
          : app
      )
    );
  };
  
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, application: ApplicationWithApproval, idx: number) => {
    // Guardar la aplicación que estamos arrastrando
    draggedItemIndexRef.current = idx;
    
    // Almacenar el elemento que estamos arrastrando para gestionar mejor el evento
    dragItemRef.current = e.currentTarget;
    
    // Establecer los datos que queremos transferir
    e.dataTransfer.setData('text/plain', application.id);
    e.dataTransfer.effectAllowed = 'move';
    
    // Crear una copia visual para el arrastre
    if (!dragImageRef.current) {
      dragImageRef.current = e.currentTarget.cloneNode(true) as HTMLDivElement;
      dragImageRef.current.style.position = 'absolute';
      dragImageRef.current.style.top = '-1000px';
      dragImageRef.current.style.opacity = '0.8';
      dragImageRef.current.style.transform = 'scale(0.9)';
      dragImageRef.current.style.width = `${e.currentTarget.offsetWidth}px`;
      document.body.appendChild(dragImageRef.current);
    }
    
    // Establecer la imagen de arrastre
    if (dragImageRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      e.dataTransfer.setDragImage(dragImageRef.current, rect.width / 2, 20);
    }
    
    // Añadir clase CSS para mostrar visualmente que el elemento está siendo arrastrado
    if (e.currentTarget) {
      e.currentTarget.classList.add('dragging');
    }
  };
  
  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    // Eliminar clase CSS de arrastre
    if (dragItemRef.current) {
      dragItemRef.current.classList.remove('dragging');
      dragItemRef.current = null;
    }
    
    if (e.currentTarget) {
      e.currentTarget.classList.remove('dragging');
    }
    
    // Eliminar el elemento clonado para el arrastre
    if (dragImageRef.current) {
      document.body.removeChild(dragImageRef.current);
      dragImageRef.current = null;
    }
    
    draggedItemIndexRef.current = -1;
    draggedItemNewStatusRef.current = '';
  };
  
  const handleDragOver = (e: React.DragEvent, columnStatus: string) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    
    // Guardar el nuevo estado para la actualización optimista
    if (draggedItemNewStatusRef.current !== columnStatus) {
      draggedItemNewStatusRef.current = columnStatus;
    }
    
    // Añadir clase visual para indicar la columna destino
    if (e.currentTarget.classList.contains('kanban-column')) {
      document.querySelectorAll('.kanban-column').forEach(col => {
        col.classList.remove('drag-over');
      });
      e.currentTarget.classList.add('drag-over');
    }
  };
  
  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Eliminar todas las clases de arrastre
    document.querySelectorAll('.kanban-column').forEach(col => {
      col.classList.remove('drag-over');
    });
    
    // Recuperar el ID de la aplicación y validaciones básicas
    const applicationId = e.dataTransfer.getData('text/plain');
    if (!applicationId || !onStatusChange || !user?.id) return;
    
    const application = appsWithApproval.find(app => app.id === applicationId);
    if (!application) return;
    
    const oldStatus = application.status;
    
    // No hacer nada si el estatus es el mismo
    if (oldStatus === newStatus) return;
    
    try {
      // Establecer el ID de la aplicación que se está procesando
      setProcessingAppId(applicationId);
      
      // Actualización optimista en UI para mejor fluidez - moviendo visualmente la tarjeta
      const updatedApps = [...appsWithApproval];
      const appIndex = updatedApps.findIndex(app => app.id === applicationId);
      
      if (appIndex !== -1) {
        // Crear copia profunda de la aplicación para evitar referencias
        const updatedApp = { 
          ...updatedApps[appIndex], 
          isMoving: true,
          targetStatus: newStatus 
        };
        
        // Lógica para manejar aprobaciones de manera optimista
        const isMovingToApproved = newStatus === 'approved';
        const isMovingFromApproved = oldStatus === 'approved' && newStatus !== 'approved';
        
        // Si se mueve a aprobado y el usuario es asesor, marcar como aprobado por asesor
        if (isMovingToApproved && isAdvisor() && user?.entityId) {
          updatedApp.approvalStatus = {
            ...(updatedApp.approvalStatus || { approvedByAdvisor: false, approvedByCompany: false }),
            approvedByAdvisor: true
          };
        }
        
        // Si se mueve a aprobado y el usuario es admin de empresa, marcar como aprobado por empresa
        if (isMovingToApproved && isCompanyAdmin() && user?.entityId) {
          updatedApp.approvalStatus = {
            ...(updatedApp.approvalStatus || { approvedByAdvisor: false, approvedByCompany: false }),
            approvedByCompany: true
          };
        }
        
        // Si se mueve desde aprobado, resetear los estados de aprobación según el rol
        if (isMovingFromApproved) {
          if (isAdvisor()) {
            updatedApp.approvalStatus = {
              ...(updatedApp.approvalStatus || { approvedByAdvisor: false, approvedByCompany: false }),
              approvedByAdvisor: false
            };
          } else if (isCompanyAdmin()) {
            updatedApp.approvalStatus = {
              ...(updatedApp.approvalStatus || { approvedByAdvisor: false, approvedByCompany: false }),
              approvedByCompany: false
            };
          }
        }
        
        updatedApps[appIndex] = updatedApp;
        setAppsWithApproval(updatedApps);
      }
      
      // Procesar en el servidor en paralelo
      const entityFilter = shouldFilterByEntity() ? getEntityFilter() : null;
      const isMovingToApproved = newStatus === 'approved';
      
      // Crear un array de promesas para manejar todas las operaciones del servidor
      const serverOperations: Promise<any>[] = [];
      
      // Si se mueve a aprobado y el usuario es asesor, marcar como aprobado por asesor
      if (isMovingToApproved && isAdvisor() && user?.entityId) {
        serverOperations.push(
          approveByAdvisor(applicationId, "Aprobado vía Kanban", user.entityId, entityFilter)
            .catch(error => {
              console.error("Error al aprobar por asesor:", error);
            })
        );
      }
      
      // Si se mueve a aprobado y el usuario es admin de empresa, marcar como aprobado por empresa
      if (isMovingToApproved && isCompanyAdmin() && user?.entityId && application.company_id) {
        serverOperations.push(
          approveByCompany(
            applicationId, 
            "Aprobado vía Kanban", 
            user.entityId, 
            application.company_id, 
            entityFilter
          ).catch(error => {
            console.error("Error al aprobar por empresa:", error);
          })
        );
      }
      
      // Añadir la operación de cambio de estado
      serverOperations.push(onStatusChange(application, newStatus));
      
      // Ejecutar todas las operaciones en paralelo después de un pequeño retraso para permitir la animación
      setTimeout(async () => {
        try {
          await Promise.all(serverOperations);
          
          // Actualizar el estado final en la UI
          setAppsWithApproval(prev => 
            prev.map(app => 
              app.id === applicationId
                ? {
                    ...app,
                    status: newStatus as Application['status'],
                    isMoving: false,
                    targetStatus: undefined
                  }
                : app
            )
          );
        } catch (error: any) {
          setErrorMessage(`Error al actualizar el estatus: ${error.message}`);
          console.error("Error updating status:", error);
          
          // Revertir el cambio optimista si falla
          setAppsWithApproval(prev => 
            prev.map(app => 
              app.id === applicationId
                ? {
                    ...app,
                    status: oldStatus,
                    isMoving: false,
                    targetStatus: undefined
                  }
                : app
            )
          );
        } finally {
          setProcessingAppId(null);
        }
      }, 300); // Retraso para permitir que la animación se muestre
      
    } catch (error: any) {
      setErrorMessage(`Error al actualizar el estatus: ${error.message}`);
      console.error("Error updating status:", error);
      
      // Revertir el cambio optimista si falla
      setAppsWithApproval(prev => 
        prev.map(app => 
          app.id === applicationId
            ? {
                ...app,
                status: oldStatus,
                isMoving: false,
                targetStatus: undefined
              }
            : app
        )
      );
      setProcessingAppId(null);
    }
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };
  
  // Renderizar los indicadores de aprobación
  const renderApprovalIndicators = (app: ApplicationWithApproval) => {
    if (!app.approvalStatus) return null;
    
    return (
      <div className="flex items-center mt-1 space-x-2">
        <div className="tooltip tooltip-top flex items-center" data-tip={app.approvalStatus.approvedByAdvisor ? "Aprobado por asesor" : "Pendiente de aprobación por asesor"}>
          <span className="text-xs mr-1">Asesor:</span>
          <div className={`w-3 h-3 rounded-full ${app.approvalStatus.approvedByAdvisor ? 'bg-success animate-pulse' : 'bg-warning'}`}></div>
        </div>
        <div className="tooltip tooltip-top flex items-center" data-tip={app.approvalStatus.approvedByCompany ? "Aprobado por empresa" : "Pendiente de aprobación por empresa"}>
          <span className="text-xs mr-1">Empresa:</span>
          <div className={`w-3 h-3 rounded-full ${app.approvalStatus.approvedByCompany ? 'bg-success animate-pulse' : 'bg-warning'}`}></div>
        </div>
      </div>
    );
  };
  
  const getProductLabel = (type: string) => {
    const labels: Record<string, string> = {
      'selected_plans': 'Crédito a Plazos',
      'product_simulations': 'Simulación',
      'auto_loan': 'Crédito Auto',
      'car_backed_loan': 'Crédito con Garantía',
      'personal_loan': 'Préstamo Personal',
      'cash_advance': 'Adelanto de Efectivo'
    };
    
    return labels[type] || type;
  };
  
  // Función para obtener el color apropiado para la tarjeta según estado y aprobaciones
  const getCardColor = (app: ApplicationWithApproval) => {
    const status = app.status || '';
    
    // Colores específicos según el estado
    switch (status.toLowerCase()) {
      case 'rejected':
        return 'border-error bg-red-50';
      case 'approved':
        // Si está aprobado, verificar el estado de las aprobaciones
        if (app.approvalStatus) {
          const { approvedByAdvisor, approvedByCompany } = app.approvalStatus;
          if (approvedByAdvisor && approvedByCompany) {
            return 'border-success bg-green-50'; // Aprobado por ambos
          } else if (approvedByAdvisor) {
            return 'border-success bg-green-100'; // Aprobado solo por asesor
          } else if (approvedByCompany) {
            return 'border-success bg-green-100'; // Aprobado solo por empresa
          }
        }
        return 'border-success bg-green-50';
      case 'in_review':
        return 'border-info bg-blue-50';
      case 'pending':
        return 'border-warning bg-amber-50';
      case 'por_dispersar':
        return 'border-accent bg-cyan-50';
      case 'completed':
        return 'border-primary bg-indigo-50';
      case 'cancelled':
        return 'border-neutral bg-gray-100';
      default:
        // Si el estado no coincide con ninguno de los anteriores, usar el color de la columna
        return `border-${app.status || 'neutral'}`;
    }
  };
  
  if (applications.length === 0) {
    return (
      <div className="bg-base-200 p-6 rounded-lg">
        <h3 className="text-xl font-medium text-center">No hay solicitudes para mostrar</h3>
        <p className="text-center text-gray-500 mt-2">No se encontraron solicitudes en el sistema</p>
      </div>
    );
  }
  
  // Añadir estilos CSS para el scrollbar personalizado y mejoras visuales
  const customStyles = `
    .custom-scrollbar::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    
    .custom-scrollbar::-webkit-scrollbar-track {
      background: #f1f1f1;
      border-radius: 10px;
    }
    
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: #888;
      border-radius: 10px;
    }
    
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: #555;
    }
    
    .kanban-card {
      transition: transform 0.2s ease-in-out, opacity 0.2s ease-in-out, box-shadow 0.3s ease-in-out, border-color 0.3s ease;
      touch-action: none;
      user-select: none;
      cursor: grab;
      will-change: transform, opacity; /* Optimización para hardware rendering */
    }
    
    .kanban-card:active {
      cursor: grabbing;
    }
    
    .kanban-card.dragging {
      opacity: 0.8;
      transform: scale(1.03);
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      z-index: 50;
    }
    
    .kanban-card.processing {
      border-color: #7c3aed;
      box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.3);
      transform: scale(1.02);
    }
    
    .kanban-column {
      transition: all 0.2s ease;
      border-radius: 0.75rem;
      will-change: transform, background-color; /* Optimización para hardware rendering */
    }
    
    .kanban-column.drag-over {
      background-color: rgba(var(--b2, 217 217 217) / 0.5);
      transform: scale(1.01);
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
    }

    .kanban-container {
      scroll-behavior: smooth;
    }

    @media (min-width: 768px) {
      .kanban-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
      }
    }
    
    /* Animaciones para cambios de estado */
    @keyframes fadeIn {
      0% { opacity: 0; }
      100% { opacity: 1; }
    }
    
    @keyframes slideIn {
      0% { transform: translateY(10px); opacity: 0; }
      100% { transform: translateY(0); opacity: 1; }
    }
    
    @keyframes processingPulse {
      0% { box-shadow: 0 0 0 0 rgba(124, 58, 237, 0.4); }
      70% { box-shadow: 0 0 0 6px rgba(124, 58, 237, 0); }
      100% { box-shadow: 0 0 0 0 rgba(124, 58, 237, 0); }
    }
    
    .kanban-card {
      animation: fadeIn 0.3s ease-out;
    }
    
    .processing-toast {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      padding: 10px 20px;
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 1000;
      display: flex;
      align-items: center;
      gap: 8px;
      animation: slideIn 0.3s ease-out;
    }
    
    /* Mejoras para vista mobile */
    @media (max-width: 640px) {
      .kanban-column {
        min-height: 300px;
      }
    }
  `;
  
  return (
    <div className="w-full overflow-x-auto custom-scrollbar relative">
      <style>{customStyles}</style>
      
      {/* Reemplazar el overlay de carga con una notificación flotante más sutil */}
      {processingAppId && (
        <div className="processing-toast">
          <span className="loading loading-spinner loading-sm text-primary"></span>
          <p className="font-medium">Actualizando estado...</p>
        </div>
      )}
      
      {errorMessage && (
        <div className="mb-4 alert alert-error shadow-lg">
          <div>
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{errorMessage}</span>
          </div>
          <div className="flex-none">
            <button className="btn btn-sm" onClick={() => setErrorMessage(null)}>Cerrar</button>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6 gap-4 pb-4 kanban-container p-4" style={{ minWidth: '1000px' }}>
        {columns.map(column => (
          <div 
            key={column.id}
            className={`bg-base-100 rounded-xl shadow-md border-t-4 border-${column.color} border-l border-r border-b flex flex-col h-full kanban-column`}
            onDragOver={(e) => {
              handleDragOver(e, column.id);
            }}
            onDragLeave={(e) => {
              e.currentTarget.classList.remove('drag-over');
            }}
            onDrop={(e) => {
              handleDrop(e, column.id);
            }}
          >
            {/* Cabecera de columna con indicador de color */}
            <div className={`text-center py-3 px-4 font-bold rounded-t-lg flex items-center justify-between bg-${column.color} bg-opacity-10`}>
              <span className={`text-${column.color} font-bold text-lg`}>{column.title}</span>
              <span className={`badge badge-${column.color} badge-lg`}>{column.applications.length}</span>
            </div>
            
            <div className="p-3 space-y-3 min-h-[500px] max-h-[calc(100vh-220px)] overflow-y-auto custom-scrollbar flex-grow">
              {column.applications.length === 0 ? (
                <div className="flex items-center justify-center h-full opacity-50 border-2 border-dashed border-base-300 rounded-lg p-6">
                  <div className="text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-sm mt-2">No hay solicitudes</p>
                  </div>
                </div>
              ) : (
                column.applications.map((app, index) => (
                  <div
                    key={app.id}
                    className={`card shadow hover:shadow-lg transition-all ${getCardColor(app)} border-l-4 border-t border-r border-b hover:border-primary kanban-card relative ${app.id === processingAppId ? 'processing' : ''} ${app.isMoving ? 'opacity-90' : ''}`}
                    draggable={!!onStatusChange && !isLoading && app.id !== processingAppId}
                    onDragStart={(e) => handleDragStart(e, app, index)}
                    onDragEnd={handleDragEnd}
                    style={{
                      animation: app.id === processingAppId ? 'processingPulse 1.5s infinite' : ''
                    }}
                  >
                    <div className="card-body p-4">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 font-semibold">{app.client_name}</div>
                          <span className={`badge badge-${column.color} badge-md`}>{getProductLabel(app.application_type)}</span>
                        </div>
                      </div>
                      
                      <div className="mt-2">
                        {/* Info de la empresa */}
                        <div className="text-sm text-gray-600 mb-1 flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          <span className="truncate max-w-[180px] font-medium">
                            {app.company_name || "Sin empresa"}
                          </span>
                        </div>
                        
                        {/* Monto */}
                        <div className="flex items-center mb-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-base font-bold text-primary">
                            {formatCurrency(app.requested_amount)}
                          </span>
                        </div>
                        
                        {/* Indicadores de estado de aprobación */}
                        {renderApprovalIndicators(app)}
                        
                        <div className="card-actions justify-end mt-3">
                          <Link to={`/applications/${app.id}`} className="btn btn-sm btn-primary w-full">
                            Ver Detalle
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default KanbanBoard; 