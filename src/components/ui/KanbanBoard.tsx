import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Application, getApprovalStatus, approveByAdvisor, approveByCompany } from '../../services/applicationService';
import { STATUS_COLORS, APPLICATION_STATUS, STATUS_LABELS } from '../../utils/constants/statuses';
import { usePermissions } from '../../contexts/PermissionsContext';
import { useAuth } from '../../contexts/AuthContext';
import { TABLES } from '../../utils/constants/tables';
import { useNotifications } from '../../contexts/NotificationContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { APPLICATION_TYPE_LABELS } from '../../utils/constants/applications';

// Verificar si APPLICATION_HISTORY tabla está definida
const APPLICATION_HISTORY_TABLE = TABLES.APPLICATION_HISTORY || 'application_history';

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
  company_review_status?: boolean;
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
  const [autoTransitionMessage, setAutoTransitionMessage] = useState<string | null>(null);
  
  // Añadir estados para filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateFromFilter, setDateFromFilter] = useState<string>('');
  const [dateToFilter, setDateToFilter] = useState<string>('');
  const [amountMinFilter, setAmountMinFilter] = useState<string>('');
  const [amountMaxFilter, setAmountMaxFilter] = useState<string>('');
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  
  // Primero, modificar useEffect para cargar aplicaciones con datos de aprobación
  useEffect(() => {
    const loadApprovalStatuses = async () => {
      if (!applications || applications.length === 0) return;
      
      setIsLoading(true);
      try {
        const appsWithStatus: ApplicationWithApproval[] = await Promise.all(
          applications.map(async (app) => {
            // Obtener el estado de aprobación real de la API
            const status = await getApprovalStatus(app.id);
            
            // Devolver la aplicación con su estado de aprobación
            return {
              ...app,
              approvalStatus: status || { approvedByAdvisor: false, approvedByCompany: false },
              // Para administradores de empresa, agregar un campo que maneja su "estado virtual"
              company_review_status: isCompanyAdmin() ? 
                // Si la aplicación está en revisión o aprobada por empresa, marcarla
                (app.status === APPLICATION_STATUS.IN_REVIEW || 
                 (status && status.approvedByCompany)) : false
            };
          })
        );
        
        setAppsWithApproval(appsWithStatus);
      } catch (error) {
        console.error("Error loading approval statuses:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadApprovalStatuses();
  }, [applications]);
  
  // Modificar cómo se transforman las aplicaciones para ordenarlas de más viejas a más recientes
  // en el useEffect donde se establece appsWithApproval alrededor de la línea 100-150
  useEffect(() => {
    const setupApplications = async () => {
      const appsWithApprovalStatuses = await Promise.all(
        applications.map(async (app) => {
          // Cargar estado de aprobación si aún no está cargado
          const approvalStatus = await getApprovalStatus(app.id);
          
          return {
            ...app,
            approvalStatus,
            isMoving: false
          };
        })
      );
      
      // Ordenar de más viejas a más recientes por fecha de creación
      const sortedApps = [...appsWithApprovalStatuses].sort((a, b) => {
        const dateA = new Date(a.created_at);
        const dateB = new Date(b.created_at);
        return dateA.getTime() - dateB.getTime(); // Orden ascendente (más viejas primero)
      });
      
      setAppsWithApproval(sortedApps);
    };
    
    setupApplications();
  }, [applications]);
  
  // Actualizar la lógica para nuevas aplicaciones para incluir todas las nuevas notificaciones
  useEffect(() => {
    // Verificar si hay aplicaciones que deberían estar en "nuevo" (recién creadas)
    const newApplications = applications.filter(app => {
      // Identificar aplicaciones recién creadas (menos de 24 horas)
      const isNew = !app.status || app.status === 'pending' || app.status === 'solicitud';
      const createdAt = new Date(app.created_at);
      const now = new Date();
      const hoursElapsed = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
      const isRecent = hoursElapsed < 72;
      
      return isRecent && (isNew || app.status === 'new');
    });
    
    // Si hay aplicaciones nuevas sin status o con status pendiente/solicitud, asignarles "nuevo"
    if (newApplications.length > 0) {
      console.log('Aplicaciones nuevas detectadas:', newApplications);
      const updatedApps = [...appsWithApproval];
      newApplications.forEach(newApp => {
        const index = updatedApps.findIndex(app => app.id === newApp.id);
        if (index !== -1 && (!updatedApps[index].status || updatedApps[index].status === 'pending' || updatedApps[index].status === 'solicitud')) {
          updatedApps[index] = {
            ...updatedApps[index],
            status: APPLICATION_STATUS.NEW
          };
          console.log(`Aplicación ${newApp.id} movida a estado NUEVO`);
        }
      });
      
      setAppsWithApproval(updatedApps);
    }
  }, [applications]); // Usar applications como dependencia en lugar de appsWithApproval

  // Asegurar que nuevas aplicaciones se muestren inmediatamente
  // añadiendo una función de comprobación en el useEffect principal
  useEffect(() => {
    const checkForNewApplications = async () => {
      // Verificar que tenemos usuario y permisos
      if (!user?.id) return;
      
      try {
        // Ejecutar esta comprobación solo si somos admin de empresa
        if (isCompanyAdmin() && applications.length > 0) {
          // Obtener la fecha de hace 24 horas
          const oneDayAgo = new Date();
          oneDayAgo.setHours(oneDayAgo.getHours() - 24);
          
          // Buscar aplicaciones creadas en las últimas 24 horas
          const recentApps = applications.filter(app => {
            const createdAt = new Date(app.created_at);
            return createdAt >= oneDayAgo;
          });
          
          // Si hay aplicaciones recientes, asegurarnos de que aparezcan en el tablero
          if (recentApps.length > 0) {
            console.log(`Encontradas ${recentApps.length} aplicaciones recientes`);
            
            // Asegurar que todas estas aplicaciones están en nuestro estado local
            // y que tienen el estado correcto (NEW si no tienen un estado específico)
            const updatedApps = [...appsWithApproval];
            let hasChanges = false;
            
            recentApps.forEach(recentApp => {
              const index = updatedApps.findIndex(app => app.id === recentApp.id);
              
              // Si la aplicación no está en nuestro estado, agregarla
              if (index === -1) {
                console.log(`Agregando aplicación nueva ${recentApp.id} al estado`);
                updatedApps.push({
                  ...recentApp,
                  status: recentApp.status || APPLICATION_STATUS.NEW,
                  approvalStatus: {
                    approvedByAdvisor: recentApp.approved_by_advisor || false,
                    approvedByCompany: recentApp.approved_by_company || false
                  }
                });
                hasChanges = true;
              } 
              // Si no tiene estado o está en estado pendiente/solicitud, asignarle NEW
              else if (!updatedApps[index].status || updatedApps[index].status === 'pending' || updatedApps[index].status === 'solicitud') {
                console.log(`Actualizando estado de ${recentApp.id} a NUEVO`);
                updatedApps[index] = {
                  ...updatedApps[index],
                  status: APPLICATION_STATUS.NEW
                };
                hasChanges = true;
              }
            });
            
            // Actualizar el estado solo si hubo cambios
            if (hasChanges) {
              setAppsWithApproval(updatedApps);
            }
          }
        }
      } catch (error) {
        console.error('Error verificando nuevas aplicaciones:', error);
      }
    };
    
    // Ejecutar la función de comprobación
    checkForNewApplications();
  }, [applications, user?.id, isCompanyAdmin]);
  
  // Modificar la lógica para actualizar todas las aplicaciones con estado "pending" o "solicitud" a "new"
  useEffect(() => {
    // Si no hay aplicaciones, no hacer nada
    if (!applications || applications.length === 0) return;
    
    console.log('Verificando estado de aplicaciones:', applications.map(a => ({ id: a.id, status: a.status })));
    
    // Actualizar solo las aplicaciones con estado específico a "new" sin afectar las demás
    const updatedApps = [...appsWithApproval];
    let hasChanges = false;
    
    applications.forEach(app => {
      const index = updatedApps.findIndex(a => a.id === app.id);
      const needsUpdate = 
        !app.status || 
        app.status === 'pending' || 
        app.status === 'solicitud';
      
      // Solo actualizar si el estado necesita cambiar a "new"
      if (index !== -1 && needsUpdate) {
        console.log(`Actualizando estado de aplicación ${app.id} de "${app.status}" a "new"`);
        updatedApps[index] = {
          ...updatedApps[index],
          status: APPLICATION_STATUS.NEW
        };
        hasChanges = true;
      } else if (index === -1) {
        // Si la aplicación no está en el array, agregarla con su estado original
        // o "new" si no tiene estado o es pending/solicitud
        const newStatus = needsUpdate ? APPLICATION_STATUS.NEW : (app.status as Application['status']);
        console.log(`Agregando aplicación ${app.id} con estado "${newStatus}"`);
        updatedApps.push({
          ...app,
          status: newStatus,
          approvalStatus: {
            approvedByAdvisor: app.approved_by_advisor || false,
            approvedByCompany: app.approved_by_company || false
          }
        });
        hasChanges = true;
      }
      // Si existe y no necesita actualización, la dejamos como está
    });
    
    if (hasChanges) {
      console.log('Actualizando aplicaciones:');
      updatedApps.forEach(app => console.log(`- ${app.id}: ${app.status}`));
      setAppsWithApproval(updatedApps);
    }
  }, [applications]);
  
  // Modificar la forma en que agrupamos las aplicaciones por estado para los administradores de empresa
  // para crear un flujo de trabajo independiente
  const groupedApplications = React.useMemo(() => {
    // Crear un objeto con todos los estados posibles como claves y arrays vacíos como valores
    const initialGroups = Object.values(APPLICATION_STATUS).reduce((acc, status) => {
      acc[status] = [];
      return acc as Record<string, ApplicationWithApproval[]>;
    }, {} as Record<string, ApplicationWithApproval[]>);
    
    // Para los administradores de empresa, usaremos un agrupamiento virtual basado en las aprobaciones
    if (isCompanyAdmin()) {
    return appsWithApproval.reduce((acc, app) => {
        // Si está en movimiento, respetar el estado de destino
      if (app.isMoving && app.targetStatus) {
          // Verificar que el estado existe antes de intentar agregar la aplicación
          if (acc[app.targetStatus]) {
        acc[app.targetStatus].push(app);
      } else {
            // Si el estado no existe, usar NEW como fallback
            console.warn(`Estado inválido detectado: ${app.targetStatus}, usando NEW como fallback`);
            acc[APPLICATION_STATUS.NEW].push(app);
          }
          return acc;
        }
        
        // Normalizar estados "pending" y "solicitud" a "new"
        if (!app.status || app.status === 'pending' || app.status === 'solicitud') {
          acc[APPLICATION_STATUS.NEW].push(app);
          return acc;
        }
        
        // Estados compartidos que siempre se muestran igual para todos los usuarios
        const sharedStatuses = [
          APPLICATION_STATUS.POR_DISPERSAR,
          APPLICATION_STATUS.COMPLETED,
          APPLICATION_STATUS.EXPIRED,
          APPLICATION_STATUS.CANCELLED,
          APPLICATION_STATUS.REJECTED
        ];
        
        if (sharedStatuses.includes(app.status as APPLICATION_STATUS)) {
          // Verificar que el estado existe
          if (acc[app.status]) {
            acc[app.status].push(app);
          } else {
            console.warn(`Estado compartido inválido detectado: ${app.status}, usando NEW como fallback`);
            acc[APPLICATION_STATUS.NEW].push(app);
          }
          return acc;
        }
        
        // Para los estados independientes, usar la lógica personalizada para admin de empresa
        if (app.status === APPLICATION_STATUS.APPROVED) {
          // Si está aprobada por la empresa pero no por el asesor, mostrarla en "aprobado por mi" 
          if (app.approvalStatus?.approvedByCompany && !app.approvalStatus.approvedByAdvisor) {
            acc[APPLICATION_STATUS.APPROVED].push(app);
            return acc;
          }
          
          // Si está aprobada por ambos, y el estado real es aprobado, mostrarla en aprobado
          if (app.approvalStatus?.approvedByCompany && app.approvalStatus?.approvedByAdvisor) {
            acc[APPLICATION_STATUS.APPROVED].push(app);
            return acc;
          }
          
          // En otros casos, mostrarla en el estado que tenga según otras reglas
        }
        
        // Si está en revisión según la empresa
        if (app.status === APPLICATION_STATUS.IN_REVIEW) {
          // Si no está aprobada por la empresa, mostrarla en "en revisión"
          if (!app.approvalStatus?.approvedByCompany) {
            acc[APPLICATION_STATUS.IN_REVIEW].push(app);
            return acc;
          }
          
          // Si está aprobada por la empresa, mostrarla en "aprobado por mi"
          acc[APPLICATION_STATUS.APPROVED].push(app);
          return acc;
        }
        
        // Para nuevas aplicaciones sin aprobación
        if (app.status === APPLICATION_STATUS.NEW) {
          // Si está aprobada por la empresa, mostrarla en "aprobado por mi"
          if (app.approvalStatus?.approvedByCompany) {
            acc[APPLICATION_STATUS.APPROVED].push(app);
            return acc;
          }
          
          // Si está en revisión por la empresa
          if (app.company_review_status === true) {
            acc[APPLICATION_STATUS.IN_REVIEW].push(app);
            return acc;
          }
          
          // Si no tiene marca especial, mostrarla como nueva
          acc[APPLICATION_STATUS.NEW].push(app);
          return acc;
        }
        
        // Para cualquier otro caso, usar el estado real si existe, o NEW como fallback
        if (acc[app.status]) {
          acc[app.status].push(app);
        } else {
          console.warn(`Estado desconocido detectado: ${app.status}, usando NEW como fallback`);
          acc[APPLICATION_STATUS.NEW].push(app);
        }
        return acc;
      }, initialGroups);
    }
    
    // Para asesores y otros roles, usamos el agrupamiento normal basado en estado
    return appsWithApproval.reduce((acc, app) => {
      if (app.isMoving && app.targetStatus) {
        // Si está en movimiento, verificar que el estado de destino existe
        if (acc[app.targetStatus]) {
          acc[app.targetStatus].push(app);
        } else {
          console.warn(`Estado de destino inválido: ${app.targetStatus}, usando NEW como fallback`);
          acc[APPLICATION_STATUS.NEW].push(app);
        }
      } else {
        // Si no, usar el estado normal, normalizando "pending" y "solicitud" a "new"
        let status = app.status || 'new';
        
        // Normalizar estados "pending" y "solicitud" a "new"
        if (status === 'pending' || status === 'solicitud') {
          status = APPLICATION_STATUS.NEW;
        }
        
        // Verificar que el estado existe antes de agregar
        if (acc[status]) {
        acc[status].push(app);
        } else {
          console.warn(`Estado inválido detectado: ${status}, usando NEW como fallback`);
          acc[APPLICATION_STATUS.NEW].push(app);
        }
      }
      return acc;
    }, initialGroups);
  }, [appsWithApproval, isCompanyAdmin, isAdvisor]);
  
  // Modificar la lógica de agrupamiento de aplicaciones para separar flujos
  // Esta es la parte clave que separa completamente los flujos
  const columns = useMemo(() => {
    // Estados estándar del Kanban
    const statusGroups: Record<string, ApplicationWithApproval[]> = {
      [APPLICATION_STATUS.NEW]: [],
      [APPLICATION_STATUS.IN_REVIEW]: [],
      [APPLICATION_STATUS.APPROVED]: [],
      [APPLICATION_STATUS.POR_DISPERSAR]: [],
      [APPLICATION_STATUS.COMPLETED]: [],
      [APPLICATION_STATUS.EXPIRED]: [],
      [APPLICATION_STATUS.REJECTED]: [],
      [APPLICATION_STATUS.CANCELLED]: []
    };
    
    // Agrupar aplicaciones por estado
    appsWithApproval.forEach(app => {
      // Asegurarnos de que el app.status no es undefined antes de usarlo
      const currentStatus = app.status || APPLICATION_STATUS.NEW;
      
      // Lógica específica para administradores de empresa - flujo sincronizado
      if (isCompanyAdmin()) {
        // Los estados avanzados siempre deben mostrarse en su columna correspondiente
        // independientemente del flujo (esto garantiza que se sincronicen con la vista del asesor)
        const advancedStatuses = [
          APPLICATION_STATUS.POR_DISPERSAR,
          APPLICATION_STATUS.COMPLETED,
          APPLICATION_STATUS.EXPIRED,
          APPLICATION_STATUS.CANCELLED,
          APPLICATION_STATUS.REJECTED
        ];
        
        if (advancedStatuses.includes(currentStatus as APPLICATION_STATUS)) {
          console.log(`Mostrando tarjeta ${app.id} en estado avanzado: ${currentStatus}`);
          statusGroups[currentStatus].push(app);
          return;
        }
        
        // Para los estados básicos, aplicar la lógica personalizada del admin de empresa
        
        // 1. Si está aprobada por empresa -> va a "Aprobado por mi"
        if (app.approvalStatus?.approvedByCompany) {
          statusGroups[APPLICATION_STATUS.APPROVED].push(app);
        }
        // 2. Si está en revisión por empresa -> va a "En Revisión"
        else if (app.company_review_status) {
          statusGroups[APPLICATION_STATUS.IN_REVIEW].push(app);
        }
        // 3. Si no está ni en revisión ni aprobada por empresa -> va a "Nuevo"
        else if (currentStatus === APPLICATION_STATUS.NEW || 
                currentStatus === APPLICATION_STATUS.PENDING || 
                (!app.company_review_status && !app.approvalStatus?.approvedByCompany)) {
          statusGroups[APPLICATION_STATUS.NEW].push(app);
        }
      }
      // Lógica para asesores - flujo normal basado en estado real
      else if (isAdvisor()) {
        if (currentStatus) {
          // Verificar que el estado existe en nuestros grupos antes de agregar
          if (statusGroups[currentStatus]) {
            statusGroups[currentStatus].push(app);
          } else {
            // Si no existe, log warning y usar NEW como fallback
            console.warn(`Estado desconocido en columns para asesor: ${currentStatus}, usando NEW como fallback`);
            statusGroups[APPLICATION_STATUS.NEW].push(app);
          }
        } else {
          // Si no tiene estado, ponerla en "Nuevo"
          statusGroups[APPLICATION_STATUS.NEW].push(app);
        }
      }
      // Lógica para otros roles
      else {
        if (currentStatus) {
          // Verificar que el estado existe en nuestros grupos
          if (statusGroups[currentStatus]) {
            statusGroups[currentStatus].push(app);
          } else {
            // Si no existe, usar NEW como fallback
            console.warn(`Estado desconocido en columns para otros roles: ${currentStatus}, usando NEW como fallback`);
            statusGroups[APPLICATION_STATUS.NEW].push(app);
          }
        } else {
          // Si no tiene estado, ponerla en "Nuevo"
          statusGroups[APPLICATION_STATUS.NEW].push(app);
        }
      }
    });
    
    // Definición de colores para cada columna
    const columnDefinitions = [
      { id: APPLICATION_STATUS.NEW, title: 'Nuevo', color: 'warning', applications: statusGroups[APPLICATION_STATUS.NEW] },
      { id: APPLICATION_STATUS.IN_REVIEW, title: 'En Revisión', color: 'info', applications: statusGroups[APPLICATION_STATUS.IN_REVIEW] },
      { id: APPLICATION_STATUS.APPROVED, title: 'Aprobado por mi', color: 'success', applications: statusGroups[APPLICATION_STATUS.APPROVED] },
      { id: APPLICATION_STATUS.POR_DISPERSAR, title: 'Por Dispersar', color: 'accent', applications: statusGroups[APPLICATION_STATUS.POR_DISPERSAR] },
      { id: APPLICATION_STATUS.COMPLETED, title: 'Completado', color: 'primary', applications: statusGroups[APPLICATION_STATUS.COMPLETED] },
      { id: APPLICATION_STATUS.EXPIRED, title: 'Expirado', color: 'error', applications: statusGroups[APPLICATION_STATUS.EXPIRED] },
      { id: APPLICATION_STATUS.REJECTED, title: 'Rechazado', color: 'error', applications: statusGroups[APPLICATION_STATUS.REJECTED] },
      { id: APPLICATION_STATUS.CANCELLED, title: 'Cancelado', color: 'neutral', applications: statusGroups[APPLICATION_STATUS.CANCELLED] }
    ];
    
    return columnDefinitions;
  }, [appsWithApproval, isAdvisor, isCompanyAdmin]);
  
  // Función para actualizar localmente el estado de aprobación de una aplicación
  const updateLocalApprovalStatus = (applicationId: string, updates: Partial<{ approvedByAdvisor: boolean, approvedByCompany: boolean }>, newStatus?: string) => {
    console.log(`Actualizando estado de aprobación para ${applicationId}:`, updates);
    
    // Crear una copia del estado actual
    const currentApps = [...appsWithApproval];
    const appIndex = currentApps.findIndex(app => app.id === applicationId);
    
    if (appIndex === -1) {
      console.warn(`No se encontró la aplicación ${applicationId} para actualizar approval status`);
      return;
    }
    
    // Crear copia profunda de la aplicación para evitar mutaciones directas
    const updatedApp = { ...currentApps[appIndex] };
    
    // Asegurar que el objeto approvalStatus exista
    const currentApprovalStatus = updatedApp.approvalStatus || { approvedByAdvisor: false, approvedByCompany: false };
    
    // Crear el nuevo objeto de aprobación, asegurando que mantenemos los valores existentes
    // a menos que se especifiquen explícitamente en el parámetro updates
    const newApprovalStatus = {
      approvedByAdvisor: updates.approvedByAdvisor !== undefined ? updates.approvedByAdvisor : currentApprovalStatus.approvedByAdvisor,
      approvedByCompany: updates.approvedByCompany !== undefined ? updates.approvedByCompany : currentApprovalStatus.approvedByCompany
    };
    
    console.log(`Approval Status anterior: ${JSON.stringify(currentApprovalStatus)}`);
    console.log(`Nuevo Approval Status: ${JSON.stringify(newApprovalStatus)}`);
    
    // Actualizar la aplicación con el nuevo estado de aprobación
    updatedApp.approvalStatus = newApprovalStatus;
    
    // Para mantener sincronizados los estados, cuando quitamos la aprobación de empresa,
    // también actualizamos el company_review_status
    if (updates.approvedByCompany === false && isCompanyAdmin()) {
      console.log(`Actualizando company_review_status a true porque estamos quitando aprobación`);
      updatedApp.company_review_status = true;
    }

    // Si ambos están aprobados, asegurarnos de moverla a por_dispersar
    if (newApprovalStatus.approvedByAdvisor && newApprovalStatus.approvedByCompany) {
      console.log(`Ambas aprobaciones están presentes, verificando si necesita moverse a Por Dispersar`);
      if (updatedApp.status !== APPLICATION_STATUS.POR_DISPERSAR && 
          updatedApp.status !== APPLICATION_STATUS.COMPLETED) {
        console.log(`Actualizando estado a Por Dispersar debido a doble aprobación`);
        updatedApp.status = APPLICATION_STATUS.POR_DISPERSAR;
      }
    }
    
    // Actualizar el array de aplicaciones
    currentApps[appIndex] = updatedApp;
    
    // Establecer el nuevo estado
    setAppsWithApproval(currentApps);
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
  
  // Verificar si el usuario puede arrastrar una tarjeta
  const canDragCard = (app: ApplicationWithApproval): boolean => {
    // No permitir arrastrar si la aplicación no tiene status o id
    if (!app.status || !app.id) {
      return false;
    }
    
    // No permitir arrastrar tarjetas que están en proceso de cambio de estado
    if (app.isMoving) {
      return false;
    }
    
    // No permitir arrastrar tarjetas que están siendo procesadas
    if (processingAppId === app.id) {
      return false;
    }
    
    // Restricciones específicas basadas en el rol del usuario
    
    // Para asesores
    if (isAdvisor()) {
      // Estados que nunca pueden ser movidos por ningún usuario
      const restrictedStatuses = [
        APPLICATION_STATUS.EXPIRED,
        APPLICATION_STATUS.CANCELLED,
        APPLICATION_STATUS.POR_DISPERSAR
      ];
      
      // No permitir arrastrar si está en un estado restringido
      if (restrictedStatuses.includes(app.status as APPLICATION_STATUS)) {
        return false;
      }
      
      // Si tiene aprobaciones de ambos (asesor y empresa), no permitir mover
      if (app.approvalStatus?.approvedByAdvisor && app.approvalStatus?.approvedByCompany) {
        return false;
      }
      
      return true;
    }
    
    // Para administradores de empresa
    if (isCompanyAdmin()) {
      // Estados que nunca pueden ser movidos por un admin de empresa
      const restrictedStatuses = [
        APPLICATION_STATUS.POR_DISPERSAR,
        APPLICATION_STATUS.COMPLETED,
        APPLICATION_STATUS.EXPIRED,
        APPLICATION_STATUS.CANCELLED,
        APPLICATION_STATUS.REJECTED
      ];
      
      // No permitir arrastrar si está en un estado restringido
      if (restrictedStatuses.includes(app.status as APPLICATION_STATUS)) {
        return false;
      }
      
      // Si tiene aprobaciones de ambos (asesor y empresa), no permitir mover
      if (app.approvalStatus?.approvedByAdvisor && app.approvalStatus?.approvedByCompany) {
        return false;
      }
      
      // MODIFICACIÓN: Aunque el asesor haya aprobado, el admin de empresa debe poder aprobar también
      // Aquí no se impide mover la tarjeta si solo está aprobada por el asesor
      
      return true;
    }
    
    // Para otros roles, no permitir arrastrar
    return false;
  };
  
  // Modificar handleDrop para manejar correctamente el flujo independiente
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, newStatus: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Eliminar todas las clases de arrastre
    document.querySelectorAll('.kanban-column').forEach(col => {
      col.classList.remove('drag-over');
    });
    
    // Verificar que el newStatus es válido
    const validStatuses = Object.values(APPLICATION_STATUS);
    if (!validStatuses.includes(newStatus as APPLICATION_STATUS)) {
      console.error(`Estado inválido para drop: ${newStatus}`);
      setErrorMessage(`Error: estado "${newStatus}" no es válido.`);
      return;
    }
    
    // Recuperar el ID de la aplicación
    const applicationId = e.dataTransfer.getData('text/plain');
    if (!applicationId || !user?.id) return;
    
    const application = appsWithApproval.find(app => app.id === applicationId);
    if (!application) return;
    
    const oldStatus = application.status || APPLICATION_STATUS.NEW;
    
    // No hacer nada si el estatus es el mismo
    if (oldStatus === newStatus) return;
    
    console.log(`Intentando mover tarjeta ${applicationId} de ${oldStatus} a ${newStatus}`);
    
      // Establecer el ID de la aplicación que se está procesando
      setProcessingAppId(applicationId);
      
    try {
      // Para administradores de empresa (FLUJO INDEPENDIENTE)
      if (isCompanyAdmin()) {
        // El admin de empresa solo puede mover tarjetas entre estos estados
        const allowedTargetStates = [
          APPLICATION_STATUS.NEW,
          APPLICATION_STATUS.IN_REVIEW,
          APPLICATION_STATUS.APPROVED
        ];
        
        // Si intenta mover a un estado que no está permitido
        if (!allowedTargetStates.includes(newStatus as APPLICATION_STATUS)) {
          setErrorMessage(`No puedes mover solicitudes al estado "${STATUS_LABELS[newStatus as keyof typeof STATUS_LABELS] || newStatus}". Solo puedes mover entre Nuevo, En Revisión y Aprobado por mí.`);
          setProcessingAppId(null);
          return;
        }
        
        // Estados que nunca pueden ser movidos por un admin de empresa
        const restrictedStatuses = [
          APPLICATION_STATUS.POR_DISPERSAR,
          APPLICATION_STATUS.COMPLETED,
          APPLICATION_STATUS.EXPIRED,
          APPLICATION_STATUS.CANCELLED,
          APPLICATION_STATUS.REJECTED
        ];
        
        // Si la tarjeta está en un estado restringido, no permitir moverla
        if (restrictedStatuses.includes(oldStatus as APPLICATION_STATUS)) {
          setErrorMessage(`No puedes mover solicitudes que están en estado "${STATUS_LABELS[oldStatus as keyof typeof STATUS_LABELS] || oldStatus}".`);
          setProcessingAppId(null);
          return;
        }
        
        // Actualización optimista en UI para mejor fluidez
      const updatedApps = [...appsWithApproval];
      const appIndex = updatedApps.findIndex(app => app.id === applicationId);
      
      if (appIndex !== -1) {
          // Crear copia profunda para evitar referencias
        const updatedApp = { 
          ...updatedApps[appIndex], 
          isMoving: true,
          targetStatus: newStatus 
        };
        
          if (newStatus === APPLICATION_STATUS.NEW) {
            // Mover a Nuevo
            updatedApp.company_review_status = false;
          updatedApp.approvalStatus = {
            ...(updatedApp.approvalStatus || { approvedByAdvisor: false, approvedByCompany: false }),
              approvedByCompany: false
            };
            
            // Si estaba aprobado y se mueve a Nuevo, hay que quitar la aprobación de la empresa
            if (updatedApp.approvalStatus?.approvedByCompany && user?.entityId && application.company_id) {
              try {
                console.log("Quitando aprobación de empresa en la base de datos");
                // Ejecutamos una consulta SQL para quitar la aprobación
                const query = `
                  UPDATE ${TABLES.APPLICATIONS}
                  SET approved_by_company = false, 
                      approval_date_company = NULL
                  WHERE id = '${applicationId}' AND company_id = '${application.company_id}'
                  RETURNING *
                `;
                
                const response = await fetch('http://localhost:3100/query', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ query }),
                });
                
                const result = await response.json();
                if (result.error) {
                  throw new Error(result.error);
                }
                
                console.log("✅ Aprobación de empresa removida correctamente:", result.data);
                
                // Registrar en historial
                const historyQuery = `
                  INSERT INTO ${APPLICATION_HISTORY_TABLE} (application_id, status, comment, created_by)
                  VALUES ('${applicationId}', 'new', 'Regresado a Nuevo por administrador de empresa', '${user.entityId}')
                  RETURNING *
                `;
                
                await fetch('http://localhost:3100/query', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ query: historyQuery }),
                });
                
                // Actualizar UI explícitamente
                updateLocalApprovalStatus(applicationId, { approvedByCompany: false }, APPLICATION_STATUS.NEW);
              } catch (error) {
                console.error("❌ Error al quitar aprobación de empresa:", error);
                setErrorMessage(`Error al quitar aprobación: ${(error as Error).message}`);
              }
            }
          } 
          else if (newStatus === APPLICATION_STATUS.IN_REVIEW) {
            // Mover a En Revisión
            updatedApp.company_review_status = true;
          updatedApp.approvalStatus = {
            ...(updatedApp.approvalStatus || { approvedByAdvisor: false, approvedByCompany: false }),
              approvedByCompany: false
            };
            
            // Si estaba aprobado y se mueve a En Revisión, hay que quitar la aprobación de la empresa
            if (oldStatus === APPLICATION_STATUS.APPROVED && 
                updatedApp.approvalStatus?.approvedByCompany && 
                user?.entityId && 
                application.company_id) {
              try {
                console.log("Quitando aprobación de empresa en la base de datos");
                // Ejecutamos una consulta SQL para quitar la aprobación
                const query = `
                  UPDATE ${TABLES.APPLICATIONS}
                  SET approved_by_company = false, 
                      approval_date_company = NULL,
                      status = '${APPLICATION_STATUS.IN_REVIEW}'
                  WHERE id = '${applicationId}' AND company_id = '${application.company_id}'
                  RETURNING *
                `;
                
                const response = await fetch('http://localhost:3100/query', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ query }),
                });
                
                const result = await response.json();
                if (result.error) {
                  throw new Error(result.error);
                }
                
                console.log("✅ Aprobación de empresa removida correctamente:", result.data);
                
                // Registrar en historial
                const historyQuery = `
                  INSERT INTO ${APPLICATION_HISTORY_TABLE} (application_id, status, comment, created_by)
                  VALUES ('${applicationId}', 'in_review', 'Revisión adicional requerida por empresa', '${user.entityId}')
                  RETURNING *
                `;
                
                await fetch('http://localhost:3100/query', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ query: historyQuery }),
                });
                
                // Actualizar UI explícitamente con ambas propiedades
                updateLocalApprovalStatus(applicationId, { 
                  approvedByCompany: false 
                }, APPLICATION_STATUS.IN_REVIEW);
                
                // Forzar actualización global de la aplicación para todos los usuarios
                // llamando a la API de cambio de estado
                if (onStatusChange) {
                  try {
                    await onStatusChange(application, APPLICATION_STATUS.IN_REVIEW);
                    console.log("✅ Estado actualizado correctamente a EN REVISIÓN");
                  } catch (error) {
                    console.error("❌ Error al actualizar estado:", error);
                  }
                }
              } catch (error) {
                console.error("❌ Error al quitar aprobación de empresa:", error);
                setErrorMessage(`Error al quitar aprobación: ${(error as Error).message}`);
              }
            } else {
              // Incluso si no estaba aprobada, forzar actualización de estado
              if (onStatusChange) {
                try {
                  await onStatusChange(application, APPLICATION_STATUS.IN_REVIEW);
                  console.log("✅ Estado actualizado correctamente a EN REVISIÓN");
                } catch (error) {
                  console.error("❌ Error al actualizar estado:", error);
                }
              }
            }
          } 
          else if (newStatus === APPLICATION_STATUS.APPROVED) {
            // Mover a Aprobado por mí
            updatedApp.company_review_status = true; // Se considera revisado si está aprobado
            updatedApp.approvalStatus = {
              ...(updatedApp.approvalStatus || { approvedByAdvisor: false, approvedByCompany: false }),
              approvedByCompany: true
            };
            
            // Llamar a la API para aprobar por empresa
            if (user?.entityId && application.company_id) {
              try {
                console.log(`Empresa ${user.entityId} está aprobando la solicitud ${applicationId}`);
                
                // Aplicar cambio optimista a la UI primero
                updatedApps[appIndex] = updatedApp;
                setAppsWithApproval([...updatedApps]);
                
                // Llamar a la API y esperar a que termine
                const result = await approveByCompany(
                  applicationId, 
                  "Aprobado vía Kanban", 
                  user.entityId, 
                  application.company_id, 
                  { company_id: application.company_id } // Pasar company_id en el entityFilter
                );
                
                console.log("✅ Aplicación aprobada por empresa:", result);
                
                // Actualizar UI con respuesta del servidor
                updateLocalApprovalStatus(applicationId, { approvedByCompany: true });
                
                // Verificar si la aplicación ya está aprobada por el asesor
                const approvalStatus = await getApprovalStatus(applicationId);
                console.log("Estado de aprobación actual:", approvalStatus);
                
                // Si está aprobada por ambos, mover automáticamente a "por_dispersar"
                if (approvalStatus?.approvedByAdvisor) {
                  console.log("❇️ Ambas aprobaciones completadas, moviendo a Por Dispersar");
                  // Mostrar notificación de transición automática
                  setAutoTransitionMessage(`La solicitud ha sido aprobada por asesor y empresa. Moviendo automáticamente a "${STATUS_LABELS[APPLICATION_STATUS.POR_DISPERSAR] || 'Por Dispersar'}"`);
                  
                  // Cambiar el estado a "por_dispersar" después de un breve retraso
                  setTimeout(() => {
                    if (onStatusChange) {
                      onStatusChange(application, APPLICATION_STATUS.POR_DISPERSAR);
                    }
                    // Limpiar el mensaje después de mostrar
                    setTimeout(() => setAutoTransitionMessage(null), 3000);
                  }, 500);
                }
              } catch (error) {
                console.error("❌ Error al aprobar por empresa:", error);
                setErrorMessage(`Error al aprobar: ${(error as Error).message}`);
                
                // Revertir el estado optimista en caso de error
            updatedApp.approvalStatus = {
              ...(updatedApp.approvalStatus || { approvedByAdvisor: false, approvedByCompany: false }),
              approvedByCompany: false
            };
                updatedApps[appIndex] = updatedApp;
                setAppsWithApproval([...updatedApps]);
              }
          }
        }
        
          // Actualizar la app en el estado
        updatedApps[appIndex] = updatedApp;
        setAppsWithApproval(updatedApps);
          
          // Quitar la marca de movimiento después de un breve retraso
          setTimeout(() => {
            setAppsWithApproval(prev => 
              prev.map(app => 
                app.id === applicationId
                  ? { ...app, isMoving: false, targetStatus: undefined }
                  : app
              )
            );
            setProcessingAppId(null);
          }, 500);
        }
      }
      // Para asesores (flujo normal)
      else if (isAdvisor()) {
        // Verificar que el estado es válido
        if (!validStatuses.includes(newStatus as APPLICATION_STATUS)) {
          setErrorMessage(`Estado de destino "${newStatus}" no es válido.`);
          setProcessingAppId(null);
          return;
        }
        
        // Actualización optimista en UI
        const updatedApps = [...appsWithApproval];
        const appIndex = updatedApps.findIndex(app => app.id === applicationId);
        
        if (appIndex !== -1) {
          // Crear copia profunda para evitar referencias
          const updatedApp = { 
            ...updatedApps[appIndex], 
            isMoving: true, 
            targetStatus: newStatus, 
            status: newStatus as Application['status'] // actualizar el estado directamente
          };
          
          // Lógica para manejar aprobaciones de manera optimista
          if (newStatus === APPLICATION_STATUS.APPROVED) {
            console.log(`Advisor ${user?.id} está aprobando la solicitud ${applicationId}`);
            
            // Actualizar inmediatamente el estado visual de aprobación del asesor
            // para una respuesta inmediata en la UI
            updatedApp.approvalStatus = {
              ...(updatedApp.approvalStatus || { approvedByAdvisor: false, approvedByCompany: false }),
              approvedByAdvisor: true  // Optimistically set to true
            };
            
            // Aplicar cambio optimista a la UI
            updatedApps[appIndex] = updatedApp;
            setAppsWithApproval([...updatedApps]);  // Clone to trigger re-render
            
            // Llamar a la API para aprobar por asesor
            if (user?.entityId) {
              try {
                // Llamar a la API y esperar a que termine
                console.log("Llamando a approveByAdvisor API...");
                const result = await approveByAdvisor(
            applicationId, 
            "Aprobado vía Kanban", 
            user.entityId, 
                  { advisor_id: user.entityId }  // Ensure we're using the advisor filter
                );
                
                console.log("✅ Aplicación aprobada por asesor:", result);
                
                // Actualizar UI con respuesta del servidor explícitamente
                // para asegurar que el indicador se actualiza correctamente
                updateLocalApprovalStatus(applicationId, { approvedByAdvisor: true });
                
                // Verificar si la aplicación ya está aprobada por la empresa
                const approvalStatus = await getApprovalStatus(applicationId);
                console.log("Estado de aprobación actual:", approvalStatus);
                
                // Si está aprobada por ambos, mover automáticamente a "por_dispersar"
                if (approvalStatus?.approvedByCompany) {
                  // Mostrar notificación de transición automática
                  setAutoTransitionMessage(`La solicitud ha sido aprobada por asesor y empresa. Moviendo automáticamente a "${STATUS_LABELS[APPLICATION_STATUS.POR_DISPERSAR] || 'Por Dispersar'}"`);
                  
                  // Cambiar el estado a "por_dispersar" después de un breve retraso
                  setTimeout(() => {
                    if (onStatusChange) {
                      onStatusChange(application, APPLICATION_STATUS.POR_DISPERSAR);
                    }
                    // Limpiar el mensaje después de mostrar
                    setTimeout(() => setAutoTransitionMessage(null), 3000);
                  }, 500);
                }
              } catch (error) {
                console.error("❌ Error al aprobar por asesor:", error);
                setErrorMessage(`Error al aprobar: ${(error as Error).message}`);
                
                // Revertir el estado optimista en caso de error
                // pero solo si realmente falló la aprobación
                const appToPatch = appsWithApproval.find(app => app.id === applicationId);
                if (appToPatch) {
                  updateLocalApprovalStatus(applicationId, { approvedByAdvisor: false });
                }
              }
            }
          }
          // Si se mueve de APPROVED a otro estado, quitar la aprobación
          else if (oldStatus === APPLICATION_STATUS.APPROVED && newStatus !== APPLICATION_STATUS.POR_DISPERSAR) {
            console.log("Moviendo de aprobado a otro estado, resetear aprobación de asesor");
            updatedApp.approvalStatus = {
              ...(updatedApp.approvalStatus || { approvedByAdvisor: false, approvedByCompany: false }),
              approvedByAdvisor: false
            };
            
            // Actualizar en BD para quitar aprobación (nueva API)
            if (user?.entityId && newStatus === APPLICATION_STATUS.IN_REVIEW) {
              try {
                console.log("Quitando aprobación de asesor en la base de datos");
                // Ejecutamos una consulta SQL para quitar la aprobación
                const query = `
                  UPDATE ${TABLES.APPLICATIONS}
                  SET approved_by_advisor = false, 
                      approval_date_advisor = NULL
                  WHERE id = '${applicationId}' AND assigned_to = '${user.entityId}'
                  RETURNING *
                `;
                
                const response = await fetch('http://localhost:3100/query', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ query }),
                });
                
                const result = await response.json();
                if (result.error) {
                  throw new Error(result.error);
                }
                
                console.log("✅ Aprobación de asesor removida correctamente:", result.data);
                
                // Registrar en historial
                const historyQuery = `
                  INSERT INTO ${APPLICATION_HISTORY_TABLE} (application_id, status, comment, created_by)
                  VALUES ('${applicationId}', 'in_review', 'Revisión adicional requerida', '${user.entityId}')
                  RETURNING *
                `;
                
                await fetch('http://localhost:3100/query', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ query: historyQuery }),
                });
                
                // Actualizar UI explícitamente
                updateLocalApprovalStatus(applicationId, { approvedByAdvisor: false });
              } catch (error) {
                console.error("❌ Error al quitar aprobación del asesor:", error);
                setErrorMessage(`Error al quitar aprobación: ${(error as Error).message}`);
              }
            }
          }
          
          // Actualizar la app en el estado solo si no es una aprobación (ese caso ya lo manejamos arriba)
          if (newStatus !== APPLICATION_STATUS.APPROVED) {
            updatedApps[appIndex] = updatedApp;
            setAppsWithApproval(updatedApps);
          }
          
          // Llamar a la API para actualizar el estado
          if (onStatusChange) {
            try {
              await onStatusChange(application, newStatus);
            } catch (error) {
          console.error("Error updating status:", error);
              setErrorMessage(`Error al actualizar el estado: ${(error as Error).message}`);
          
              // Revertir cambios en caso de error
          setAppsWithApproval(prev => 
            prev.map(app => 
              app.id === applicationId
                    ? { ...app, status: oldStatus as Application['status'], isMoving: false, targetStatus: undefined }
                : app
            )
          );
            }
          }
          
          // Quitar la marca de movimiento después de un breve retraso
          setTimeout(() => {
      setAppsWithApproval(prev => 
        prev.map(app => 
          app.id === applicationId
                  ? { ...app, isMoving: false, targetStatus: undefined }
            : app
        )
      );
            setProcessingAppId(null);
          }, 500);
        }
      }
    } catch (error) {
      console.error("Error in handleDrop:", error);
      setErrorMessage(`Error al actualizar el estado: ${(error as Error).message}`);
      setProcessingAppId(null);
    }
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };
  
  // Renderizar los indicadores de aprobación con mejor formato y legibilidad
  const renderApprovalIndicators = (app: ApplicationWithApproval) => {
    if (!app.approvalStatus) return null;
    
    const { approvedByAdvisor, approvedByCompany } = app.approvalStatus;
    const hasFullApproval = approvedByAdvisor && approvedByCompany;
    
    return (
      <div className="flex flex-col mt-1 space-y-1">
        <div className="flex items-center justify-between">
          <div className="tooltip tooltip-top flex items-center" data-tip={approvedByAdvisor ? "Aprobado por asesor" : "Pendiente de aprobación por asesor"}>
            <span className="text-xs mr-1 whitespace-nowrap">Asesor:</span>
            <div className={`w-3 h-3 rounded-full ${approvedByAdvisor ? 'bg-success' : 'bg-warning'}`}></div>
            {approvedByAdvisor && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          
          <div className="tooltip tooltip-top flex items-center ml-3" data-tip={approvedByCompany ? "Aprobado por empresa" : "Pendiente de aprobación por empresa"}>
            <span className="text-xs mr-1 whitespace-nowrap">Empresa:</span>
            <div className={`w-3 h-3 rounded-full ${approvedByCompany ? 'bg-success' : 'bg-warning'}`}></div>
            {approvedByCompany && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        </div>
        
        {/* Indicador de doble aprobación */}
        {hasFullApproval && (
          <div className="w-full flex justify-center mt-1">
            <div className="badge badge-success text-xs px-2 py-1 text-white font-medium">
              Aprobado Total
            </div>
          </div>
        )}
        
        {/* Botón para deshacer aprobación (solo para empresa y si está aprobado) */}
        {isCompanyAdmin() && approvedByCompany && app.status === APPLICATION_STATUS.APPROVED && (
          <div className="w-full flex justify-center mt-1">
            <button 
              onClick={(e) => {
                e.stopPropagation(); // Evitar que se propague al card
                handleDrop(e as unknown as React.DragEvent<HTMLDivElement>, APPLICATION_STATUS.IN_REVIEW);
              }}
              className="btn btn-xs btn-error w-full"
            >
              Deshacer Aprobación
            </button>
          </div>
        )}
      </div>
    );
  };
  
  // Mejorar el formato de las etiquetas de producto para mayor legibilidad
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
  
  // Función para renderizar el producto como una etiqueta bien formateada
  const renderProductLabel = (type: string, color: string) => {
    return (
      <span className={`badge badge-${color} badge-md text-xs px-3 py-1 whitespace-nowrap inline-block`}>
        {getProductLabel(type || '')}
      </span>
    );
  };
  
  // Función para obtener el color apropiado para la tarjeta según estado y aprobaciones
  const getCardColor = (app: ApplicationWithApproval) => {
    const status = app.status || '';
    
    // Colores específicos según el estado
    switch (status.toLowerCase()) {
      case APPLICATION_STATUS.REJECTED:
        return 'border-error bg-red-50';
      case APPLICATION_STATUS.APPROVED:
        // Si está aprobado, verificar el estado de las aprobaciones
        if (app.approvalStatus) {
          const { approvedByAdvisor, approvedByCompany } = app.approvalStatus;
          if (approvedByAdvisor && approvedByCompany) {
            return 'border-success bg-green-100'; // Aprobado por ambos
          } else if (approvedByAdvisor) {
            return 'border-success bg-green-50'; // Aprobado solo por asesor
          } else if (approvedByCompany) {
            return 'border-info bg-blue-50'; // Aprobado solo por empresa
          }
        }
        return 'border-success bg-green-50';
      case APPLICATION_STATUS.IN_REVIEW:
        return 'border-info bg-blue-50';
      case APPLICATION_STATUS.NEW:
        return 'border-warning bg-yellow-50';
      case APPLICATION_STATUS.PENDING:
        return 'border-warning bg-amber-50';
      case APPLICATION_STATUS.POR_DISPERSAR:
        return 'border-accent bg-purple-50';
      case APPLICATION_STATUS.COMPLETED:
        return 'border-primary bg-indigo-50';
      case APPLICATION_STATUS.EXPIRED:
        return 'border-error bg-red-100';
      case APPLICATION_STATUS.CANCELLED:
        return 'border-neutral bg-gray-100';
      default:
        // Si el estado no coincide con ninguno de los anteriores, usar el color de la columna
        return `border-${app.status || 'neutral'}`;
    }
  };
  
  // Estilos personalizados para mostrar claramente cuáles tarjetas se pueden arrastrar
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
      will-change: transform, opacity;
    }
    
    .kanban-card-draggable {
      cursor: grab !important;
      position: relative;
    }
    
    .kanban-card-draggable:hover {
      transform: translateY(-4px);
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.15);
      border-color: #a855f7;
      z-index: 10;
    }
    
    .kanban-card-draggable:active {
      cursor: grabbing !important;
    }
    
    /* Indicator for draggable cards */
    .kanban-card-draggable::after {
      content: '';
      position: absolute;
      top: 8px;
      right: 8px;
      width: 20px;
      height: 20px;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23666'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 013 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11' /%3E%3C/svg%3E");
      background-size: contain;
      background-repeat: no-repeat;
      opacity: 0.7;
      transition: opacity 0.2s ease;
    }
    
    .kanban-card-draggable:hover::after {
      opacity: 1;
    }
    
    .kanban-card-locked {
      position: relative;
      cursor: not-allowed !important;
      opacity: 0.8;
    }
    
    .kanban-card-locked::after {
      content: '';
      position: absolute;
      top: 8px;
      right: 8px;
      width: 20px;
      height: 20px;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23999'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' /%3E%3C/svg%3E");
      background-size: contain;
      background-repeat: no-repeat;
      opacity: 0.7;
    }
    
    .kanban-card.dragging {
      opacity: 0.8;
      transform: scale(1.03);
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      z-index: 50;
    }
    
    .kanban-column {
      transition: all 0.2s ease;
      border-radius: 0.75rem;
      will-change: transform, background-color;
    }
    
    .kanban-column.drag-over {
      background-color: rgba(var(--b2, 217 217 217) / 0.5);
      transform: scale(1.01);
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
      border: 2px dashed #a855f7 !important;
    }

    .kanban-container {
      scroll-behavior: smooth;
    }

    @media (min-width: 768px) {
      .kanban-card-draggable:hover {
        transform: translateY(-4px);
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.15);
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
    
    .auto-transition-toast {
      position: fixed;
      bottom: 70px;
      left: 50%;
      transform: translateX(-50%);
      padding: 10px 20px;
      background-color: #dcfce7;
      border: 1px solid #86efac;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 1000;
      display: flex;
      align-items: center;
      gap: 8px;
      animation: slideIn 0.3s ease-out;
    }
    
    /* Pop-up tooltip con instrucciones para arrastrar */
    .drag-instructions {
      position: fixed;
      top: 20px;
      right: 20px;
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      padding: 12px 16px;
      z-index: 1000;
      max-width: 300px;
      animation: fadeIn 0.3s ease-out;
    }
    
    /* Mejoras para vista mobile */
    @media (max-width: 640px) {
      .kanban-column {
        min-height: 300px;
      }
    }
  `;
  
  // Función para obtener clases draggable
  const getDraggableClasses = (app: ApplicationWithApproval): string => {
    // Usar la función canDragCard que está definida en el ámbito superior
    const isDraggable = canDragCard(app) && app.id !== processingAppId;
    return isDraggable 
      ? 'cursor-grab kanban-card-draggable' 
      : 'cursor-not-allowed opacity-80 kanban-card-locked';
  };

  // Función para definir los tooltips con información clara y precisa
  const getDragTooltip = (app: ApplicationWithApproval): string => {
    if (app.id === processingAppId) {
      return "Esta tarjeta está siendo procesada";
    }
    
    // Si la tarjeta se puede arrastrar, mostrar mensaje informativo
    if (canDragCard(app)) {
      return "Arrastra para cambiar el estado";
    }
    
    // Mensajes específicos para casos donde no se puede arrastrar
    if (app.approvalStatus?.approvedByAdvisor && app.approvalStatus?.approvedByCompany) {
      return "Esta solicitud ya está completamente aprobada y no puede ser movida";
    }
    
    // Asegurarse de que app.status no es undefined
    const status = app.status || APPLICATION_STATUS.NEW;
    
    // Mensajes específicos según el rol y estado
    if (isCompanyAdmin()) {
      if (status === APPLICATION_STATUS.REJECTED) {
        return "Las solicitudes rechazadas solo pueden ser movidas por asesores";
      } else if (status === APPLICATION_STATUS.POR_DISPERSAR) {
        return "Esta solicitud ya está lista para dispersión y no puede regresar a estados anteriores";
      } else if (status === APPLICATION_STATUS.COMPLETED) {
        return "Esta solicitud ya está completada y no puede cambiar de estado";
      } else if (status === APPLICATION_STATUS.EXPIRED) {
        return "Esta solicitud ha expirado y no puede cambiar de estado";
      } else if (status === APPLICATION_STATUS.CANCELLED) {
        return "Esta solicitud fue cancelada y no puede cambiar de estado";
      }
    }
    
    return "No puedes mover esta tarjeta en este momento";
  };

  // Efecto para mover automáticamente tarjetas con ambas aprobaciones a "Por Dispersar"
  useEffect(() => {
    const moveFullyApprovedCards = async () => {
      // Encontrar tarjetas que tienen ambas aprobaciones pero no están en Por Dispersar
      const fullyApprovedCards = appsWithApproval.filter(app => 
        app.approvalStatus?.approvedByAdvisor && 
        app.approvalStatus?.approvedByCompany && 
        app.status !== APPLICATION_STATUS.POR_DISPERSAR &&
        app.status !== APPLICATION_STATUS.COMPLETED
      );
      
      if (fullyApprovedCards.length > 0) {
        console.log(`Encontradas ${fullyApprovedCards.length} tarjetas con aprobación total, moviendo a Por Dispersar...`);
        
        // Mover cada tarjeta a Por Dispersar
        for (const app of fullyApprovedCards) {
          if (onStatusChange) {
            try {
              console.log(`Moviendo tarjeta ${app.id} a Por Dispersar automáticamente...`);
              await onStatusChange(app, APPLICATION_STATUS.POR_DISPERSAR);
            } catch (error) {
              console.error(`Error al mover tarjeta ${app.id} a Por Dispersar:`, error);
            }
          }
        }
      }
    };
    
    // Ejecutar después de un breve retraso para permitir que los estados se inicialicen
    const timer = setTimeout(() => {
      moveFullyApprovedCards();
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [appsWithApproval, onStatusChange]);

  // Agregar una sincronización de estados avanzados para las aplicaciones existentes
  useEffect(() => {
    const syncAdvancedStatusCards = async () => {
      if (!isCompanyAdmin() || applications.length === 0) return;
      
      console.log("Sincronizando tarjetas en estados avanzados para el administrador de empresa...");
      
      // Estados avanzados que siempre deben sincronizarse entre ambas vistas
      const advancedStatuses = [
        APPLICATION_STATUS.POR_DISPERSAR,
        APPLICATION_STATUS.COMPLETED,
        APPLICATION_STATUS.EXPIRED,
        APPLICATION_STATUS.CANCELLED,
        APPLICATION_STATUS.REJECTED
      ];
      
      // Buscar aplicaciones con ambas aprobaciones que deberían estar en Por Dispersar
      const needsStatusUpdate = applications.filter(app => {
        // Si la aplicación ya está en un estado avanzado, respetar ese estado
        if (advancedStatuses.includes(app.status as APPLICATION_STATUS)) {
          return false;
        }
        
        // Verificar si tiene ambas aprobaciones
        return app.approved_by_advisor && app.approved_by_company;
      });
      
      if (needsStatusUpdate.length > 0) {
        console.log(`Encontradas ${needsStatusUpdate.length} aplicaciones que necesitan actualización de estado:`);
        
        const updatedApps = [...appsWithApproval];
        let hasChanges = false;
        
        for (const app of needsStatusUpdate) {
          console.log(`- Aplicación ${app.id} con ambas aprobaciones, actualizando a Por Dispersar`);
          
          const index = updatedApps.findIndex(a => a.id === app.id);
          if (index !== -1) {
            updatedApps[index] = {
              ...updatedApps[index],
              status: APPLICATION_STATUS.POR_DISPERSAR
            };
            hasChanges = true;
            
            // Actualizar en la base de datos si es necesario
            if (onStatusChange) {
              try {
                await onStatusChange(app, APPLICATION_STATUS.POR_DISPERSAR);
                console.log(`✅ Estado de aplicación ${app.id} actualizado a Por Dispersar`);
              } catch (error) {
                console.error(`Error al actualizar estado de ${app.id}:`, error);
              }
            }
          }
        }
        
        if (hasChanges) {
          console.log("Actualizando estado local con aplicaciones sincronizadas");
          setAppsWithApproval(updatedApps);
        }
      }
    };
    
    // Ejecutar la sincronización después de cargar las aplicaciones
    syncAdvancedStatusCards();
  }, [applications, isCompanyAdmin, onStatusChange]);

  // Mejora para sincronizar estados entre vistas del asesor y administrador de empresa
  useEffect(() => {
    const syncCardStatusesWithAdvisorView = () => {
      if (!isCompanyAdmin() || applications.length === 0) return;
      
      // Obtener todas las aplicaciones que no están en los estados básicos de flujo de empresa
      const applicationsWithAdvancedStatus = applications.filter(app => {
        const isBasicStatus = [
          APPLICATION_STATUS.NEW,
          APPLICATION_STATUS.IN_REVIEW,
          APPLICATION_STATUS.APPROVED
        ].includes(app.status as APPLICATION_STATUS);
        
        return !isBasicStatus;
      });
      
      if (applicationsWithAdvancedStatus.length > 0) {
        console.log(`Sincronizando ${applicationsWithAdvancedStatus.length} tarjetas con estados avanzados:`);
        
        // Crear copia del estado actual
        const updatedApps = [...appsWithApproval];
        let hasChanges = false;
        
        // Actualizar cada aplicación para que refleje el estado real
        applicationsWithAdvancedStatus.forEach(app => {
          const index = updatedApps.findIndex(a => a.id === app.id);
          
          if (index !== -1 && updatedApps[index].status !== app.status) {
            console.log(`- Sincronizando aplicación ${app.id} de estado '${updatedApps[index].status}' a '${app.status}'`);
            
            // Actualizar el estado para que coincida con el estado real
            updatedApps[index] = {
              ...updatedApps[index],
              status: app.status
            };
            
            hasChanges = true;
          }
        });
        
        // Actualizar el estado solo si hubo cambios
        if (hasChanges) {
          console.log("Actualizando estado local con aplicaciones sincronizadas");
          setAppsWithApproval(updatedApps);
        }
      }
    };
    
    // Ejecutar la sincronización
    syncCardStatusesWithAdvisorView();
  }, [applications, appsWithApproval, isCompanyAdmin]);

  // Agregar un nuevo useEffect para refrescar los estados de aprobación periódicamente
  useEffect(() => {
    // Función para refrescar los estados de aprobación desde la API
    const refreshApprovalStatuses = async () => {
      if (!applications || applications.length === 0) return;
      
      console.log("Refrescando estados de aprobación desde la API...");
      try {
        const updatedApps = [...appsWithApproval];
        let hasChanges = false;
        
        for (const app of updatedApps) {
          // Obtener el estado de aprobación actualizado desde la API
          const status = await getApprovalStatus(app.id);
          
          // Si el estado es diferente al actual, actualizarlo
          if (status && 
              (status.approvedByAdvisor !== app.approvalStatus?.approvedByAdvisor ||
               status.approvedByCompany !== app.approvalStatus?.approvedByCompany)) {
            
            console.log(`Actualización encontrada para app ${app.id}:`, {
              actual: app.approvalStatus,
              nuevo: status
            });
            
            // Actualizar el estado de aprobación
            app.approvalStatus = status;
            hasChanges = true;
            
            // Si hay doble aprobación y no está en Por Dispersar, actualizarlo
            if (status.approvedByAdvisor && status.approvedByCompany && 
                app.status !== APPLICATION_STATUS.POR_DISPERSAR &&
                app.status !== APPLICATION_STATUS.COMPLETED) {
              console.log(`Aplicación ${app.id} tiene doble aprobación, moviendo a Por Dispersar`);
              
              // Actualizar el estado localmente
              app.status = APPLICATION_STATUS.POR_DISPERSAR;
              
              // Actualizar en la BD
              if (onStatusChange) {
                try {
                  await onStatusChange(app, APPLICATION_STATUS.POR_DISPERSAR);
                } catch (error) {
                  console.error(`Error actualizando estado a Por Dispersar:`, error);
                }
              }
            }
          }
        }
        
        // Si hubo cambios, actualizar el estado
        if (hasChanges) {
          console.log("Actualizando aplicaciones con estados de aprobación refrescados");
          setAppsWithApproval(updatedApps);
        }
      } catch (error) {
        console.error("Error al refrescar estados de aprobación:", error);
      }
    };
    
    // Refrescar los estados inicialmente y cada 10 segundos
    refreshApprovalStatuses();
    
    const intervalId = setInterval(() => {
      refreshApprovalStatuses();
    }, 10000); // 10 segundos
    
    return () => {
      clearInterval(intervalId);
    };
  }, [applications, appsWithApproval, onStatusChange]);

  // Mejora para funcionamiento con tarjetas existentes
  useEffect(() => {
    // Solo ejecutar para admin de empresa
    if (!isCompanyAdmin() || applications.length === 0) return;
    
    console.log("Verificando y sincronizando estados de tarjetas existentes...");
    
    // Encontrar tarjetas que deben mostrar el mismo estado que en la vista del asesor
    const appsNeedingSync = applications.filter(app => {
      // Si no está en uno de los estados básicos del flujo de admin de empresa,
      // debe sincronizarse exactamente con la vista del asesor
      const isBasicStatus = [
        APPLICATION_STATUS.NEW,
        APPLICATION_STATUS.IN_REVIEW,
        APPLICATION_STATUS.APPROVED
      ].includes(app.status as APPLICATION_STATUS);
      
      return !isBasicStatus;
    });
    
    if (appsNeedingSync.length > 0) {
      console.log(`Encontradas ${appsNeedingSync.length} tarjetas que necesitan sincronización con vista del asesor`);
      
      // Crear copia del estado actual
      const updatedApps = [...appsWithApproval];
      let hasChanges = false;
      
      // Para cada aplicación que necesita sincronización
      appsNeedingSync.forEach(app => {
        const index = updatedApps.findIndex(a => a.id === app.id);
        
        // Si encontramos la aplicación y su estado es diferente al que debería tener
        if (index !== -1 && updatedApps[index].status !== app.status) {
          console.log(`- Actualizando tarjeta ${app.id}: de '${updatedApps[index].status}' a '${app.status}'`);
          
          // Actualizar el estado para que coincida con el de la vista del asesor
          updatedApps[index] = {
            ...updatedApps[index],
            status: app.status
          };
          
          hasChanges = true;
        }
      });
      
      // Si hubo cambios, actualizar el estado
      if (hasChanges) {
        console.log("Actualizando estados para sincronizar con vista del asesor");
        setAppsWithApproval(updatedApps);
      }
    }
  }, [applications, appsWithApproval, isCompanyAdmin]);

  // Añadir función para manejar la limpieza de filtros
  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setTypeFilter('all');
    setDateFromFilter('');
    setDateToFilter('');
    setAmountMinFilter('');
    setAmountMaxFilter('');
  };

  // Modificar función para filtrar las aplicaciones según los criterios
  const getFilteredApplications = (apps: ApplicationWithApproval[]): ApplicationWithApproval[] => {
    return apps.filter(app => {
      // Filtro por búsqueda de texto
      if (searchQuery && !(
        (app.client_name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (app.client_email?.toLowerCase().includes(searchQuery.toLowerCase()))
      )) {
        return false;
      }
      
      // Filtro por estado
      if (statusFilter !== 'all' && app.status !== statusFilter) {
        return false;
      }
      
      // Filtro por tipo de aplicación
      if (typeFilter !== 'all' && app.application_type !== typeFilter) {
        return false;
      }
      
      // Filtro por fecha desde
      if (dateFromFilter) {
        const appDate = new Date(app.created_at);
        const fromDate = new Date(dateFromFilter);
        if (appDate < fromDate) {
          return false;
        }
      }
      
      // Filtro por fecha hasta
      if (dateToFilter) {
        const appDate = new Date(app.created_at);
        const toDate = new Date(dateToFilter);
        // Ajustar para incluir todo el día
        toDate.setHours(23, 59, 59, 999);
        if (appDate > toDate) {
          return false;
        }
      }
      
      // Filtro por monto mínimo
      if (amountMinFilter && parseFloat(amountMinFilter) > 0) {
        const amount = app.amount || app.requested_amount || 0;
        if (amount < parseFloat(amountMinFilter)) {
          return false;
        }
      }
      
      // Filtro por monto máximo
      if (amountMaxFilter && parseFloat(amountMaxFilter) > 0) {
        const amount = app.amount || app.requested_amount || 0;
        if (amount > parseFloat(amountMaxFilter)) {
          return false;
        }
      }
      
      return true;
    });
  };

  if (applications.length === 0) {
    return (
      <div className="bg-base-200 p-6 rounded-lg">
        <h3 className="text-xl font-medium text-center">No hay solicitudes para mostrar</h3>
        <p className="text-center text-gray-500 mt-2">No se encontraron solicitudes en el sistema</p>
      </div>
    );
  }
  
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
      
      {/* Notificación para transiciones automáticas */}
      {autoTransitionMessage && (
        <div className="auto-transition-toast">
          <span className="loading loading-spinner loading-sm text-success"></span>
          <p className="font-medium">{autoTransitionMessage}</p>
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
      
      {/* Panel de Filtros */}
      <div className="mb-6">
        <div className="bg-base-100 border border-base-300 rounded-lg shadow-sm">
          <div className="flex justify-between items-center p-4 border-b border-base-300">
            <div className="relative flex-grow mr-4">
              <input
                type="text"
                placeholder="Buscar por nombre o email..."
                className="input input-bordered w-full pr-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            
            <button 
              className="btn btn-ghost btn-sm"
              onClick={() => setIsFilterExpanded(!isFilterExpanded)}
            >
              {isFilterExpanded ? 'Ocultar Filtros' : 'Mostrar Filtros'}
              <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ml-2 transform ${isFilterExpanded ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          
          {isFilterExpanded && (
            <div className="bg-base-200 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Filtros Avanzados</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Estado</span>
                  </label>
                  <select
                    className="select select-bordered w-full"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">Todos los estados</option>
                    {Object.entries(APPLICATION_STATUS).map(([key, value]) => (
                      <option key={key} value={value}>{STATUS_LABELS[value as keyof typeof STATUS_LABELS] || value}</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Tipo de Aplicación</span>
                  </label>
                  <select
                    className="select select-bordered w-full"
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                  >
                    <option value="all">Todos los tipos</option>
                    {Object.entries(APPLICATION_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Fecha Desde</span>
                  </label>
                  <input
                    type="date"
                    className="input input-bordered w-full"
                    value={dateFromFilter}
                    onChange={(e) => setDateFromFilter(e.target.value)}
                  />
                </div>
                
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Fecha Hasta</span>
                  </label>
                  <input
                    type="date"
                    className="input input-bordered w-full"
                    value={dateToFilter}
                    onChange={(e) => setDateToFilter(e.target.value)}
                  />
                </div>
                
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Monto Mínimo</span>
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    className="input input-bordered w-full"
                    value={amountMinFilter}
                    onChange={(e) => setAmountMinFilter(e.target.value)}
                  />
                </div>
                
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Monto Máximo</span>
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    className="input input-bordered w-full"
                    value={amountMaxFilter}
                    onChange={(e) => setAmountMaxFilter(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="flex justify-end">
                <button 
                  className="btn btn-ghost"
                  onClick={handleClearFilters}
                >
                  Limpiar Filtros
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6 gap-4 pb-4 kanban-container p-4" style={{ minWidth: '1000px' }}>
        {/* Modificar bucle de columnas para usar aplicaciones filtradas */}
        {columns.map(column => {
          // Filtrar aplicaciones para esta columna
          const filteredApps = getFilteredApplications(column.applications);
          
          return (
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
                <span className={`badge badge-${column.color} badge-lg`}>{filteredApps.length}</span>
              </div>
              
              <div className="p-3 space-y-3 min-h-[500px] max-h-[calc(100vh-220px)] overflow-y-auto custom-scrollbar flex-grow">
                {filteredApps.length === 0 ? (
                  <div className="flex items-center justify-center h-full opacity-50 border-2 border-dashed border-base-300 rounded-lg p-6">
                    <div className="text-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-sm mt-2">No hay solicitudes</p>
                    </div>
                  </div>
                ) : (
                  filteredApps.map((app, index) => {
                    const isCardDraggable = canDragCard(app) && app.id !== processingAppId;
                    return (
                      <div
                        key={app.id}
                        data-tip={getDragTooltip(app)}
                        className={`card shadow hover:shadow-lg transition-all ${getCardColor(app)} border-l-4 border-t border-r border-b hover:border-primary kanban-card relative ${app.id === processingAppId ? 'processing' : ''} ${app.isMoving ? 'opacity-90' : ''} ${getDraggableClasses(app)}`}
                        draggable={isCardDraggable}
                        onDragStart={isCardDraggable ? (e) => handleDragStart(e, app, index) : undefined}
                        onDragEnd={isCardDraggable ? handleDragEnd : undefined}
                        style={{
                          animation: app.id === processingAppId ? 'processingPulse 1.5s infinite' : ''
                        }}
                      >
                        <div className="card-body p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex flex-col">
                              <div className="font-semibold mb-1">{app.client_name}</div>
                              {renderProductLabel(app.application_type || '', column.color)}
                            </div>
                          </div>
                          
                          <div className="mt-1">
                            {/* Info de la empresa */}
                            <div className="text-sm text-gray-600 mb-2 flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 inline flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                              <span className="truncate max-w-[180px] font-medium">
                                {app.company_name || "Sin empresa"}
                              </span>
                            </div>
                            
                            {/* Fecha de creación */}
                            <div className="text-xs text-gray-500 mb-2 flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 inline flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span>
                                {app.created_at ? formatDate(app.created_at, 'datetime') : 'N/A'}
                              </span>
                            </div>
                            
                            {/* Monto */}
                            <div className="flex items-center mb-3">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="text-base font-bold text-primary">
                                {formatCurrency(app.requested_amount || 0)}
                              </span>
                            </div>
                            
                            {/* Indicadores de estado de aprobación */}
                            {renderApprovalIndicators(app)}
                            
                            <div className="card-actions justify-end mt-3">
                              {/* Botón para marcar como completado/dispersado (solo para asesores y tarjetas en Por Dispersar) */}
                              {isAdvisor() && app.status === APPLICATION_STATUS.POR_DISPERSAR && (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation(); // Evitar navegación al detalle
                                    e.preventDefault();
                                    if (onStatusChange) {
                                      setProcessingAppId(app.id);
                                      onStatusChange(app, APPLICATION_STATUS.COMPLETED)
                                        .then(() => {
                                          setAutoTransitionMessage(`Solicitud ${app.id} marcada como Completada correctamente`);
                                          setTimeout(() => setAutoTransitionMessage(null), 3000);
                                        })
                                        .catch(error => {
                                          setErrorMessage(`Error al marcar como completado: ${error.message}`);
                                        })
                                        .finally(() => {
                                          setProcessingAppId(null);
                                        });
                                    }
                                  }}
                                  className="btn btn-sm btn-accent w-full mb-2"
                                >
                                  Marcar como Dispersado
                                </button>
                              )}
                              {/* Botón para mover a Por Dispersar cuando hay ambas aprobaciones pero no está en ese estado */}
                              {isAdvisor() && 
                               app.approvalStatus?.approvedByAdvisor && 
                               app.approvalStatus?.approvedByCompany && 
                               app.status !== APPLICATION_STATUS.POR_DISPERSAR &&
                               app.status !== APPLICATION_STATUS.COMPLETED && (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    if (onStatusChange && !processingAppId) {
                                      setProcessingAppId(app.id);
                                      onStatusChange(app, APPLICATION_STATUS.POR_DISPERSAR)
                                        .then(() => {
                                          setAutoTransitionMessage(`Solicitud movida a Por Dispersar`);
                                          setTimeout(() => setAutoTransitionMessage(null), 3000);
                                        })
                                        .catch(error => {
                                          console.error("Error al mover a Por Dispersar:", error);
                                        })
                                        .finally(() => {
                                          setTimeout(() => setProcessingAppId(null), 500);
                                        });
                                    }
                                  }}
                                  className="btn btn-xs btn-accent w-full mt-2 mb-2"
                                >
                                  Mover a Por Dispersar
                                </button>
                              )}
                              <Link to={`/applications/${app.id}`} className="btn btn-sm btn-primary w-full">
                                Ver Detalle
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default KanbanBoard; 