import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { APPLICATION_STATUS, STATUS_LABELS } from '../../utils/constants/statuses';
import { usePermissions } from '../../contexts/PermissionsContext';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency } from '../../utils/formatters';
import { APPLICATION_TYPE_LABELS } from '../../utils/constants/applications';
import { USER_ROLES } from '../../utils/constants/roles';

// NOTA: La funcionalidad de tiempo real ha sido desactivada 
// debido a problemas de compatibilidad
// Las actualizaciones se reflejarán al recargar la página o cuando el componente
// padre envíe nuevas aplicaciones como prop

interface KanbanBoardProps {
  applications: any[];
  onStatusChange?: (application: any, newStatus: string, statusField?: string) => Promise<void>;
  statusField?: 'status' | 'advisor_status' | 'company_status' | 'global_status';
  applicationTypeFilter?: string;
}

interface ApplicationWithApproval {
  id: string;
  status: string;
  advisor_status?: string;
  company_status?: string;
  global_status?: string;
  client_name: string;
  company_name?: string;
  amount: number;
  application_type: string;
  financing_type?: string;
  isMoving?: boolean;
  approvalStatus?: {
    approvedByAdvisor?: boolean;
    approvedByCompany?: boolean;
    isFullyApproved?: boolean;
  };
}

// Añadir nueva interfaz para el payload
interface ApplicationStatusPayload {
  id: string;
  status?: string;
  advisor_status?: string;
  company_status?: string;
  global_status?: string;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ applications, onStatusChange, statusField = 'status', applicationTypeFilter }) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [warnMessage, setWarnMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [processingAppId, setProcessingAppId] = useState<string | null>(null);
  const [appsWithApproval, setAppsWithApproval] = useState<ApplicationWithApproval[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dragItemRef = useRef<HTMLDivElement | null>(null);
  const pendingRefreshRef = useRef<boolean>(false);
  const [expandedColumns, setExpandedColumns] = useState<Record<string, boolean>>({});
  
  // Añadir contexto de permisos para verificar el rol del usuario
  const { isAdvisor, isCompanyAdmin } = usePermissions();
  const { user } = useAuth();
  
  // Set up applications when component mounts
  useEffect(() => {
    const fetchApplicationsWithApproval = async () => {
      setIsLoading(true);
      try {
        // Debug: Log all unique application types 
        const appTypes = new Set(applications.map(app => app.application_type));
        console.log('Available application types:', Array.from(appTypes));
        console.log('Current filter type:', applicationTypeFilter);
        console.log('Number of applications before filtering:', applications.length);
        
        // Debug: Log financing_type values
        console.log('Financing types:', applications.map(app => ({ 
          id: app.id, 
          type: app.application_type, 
          financing: app.financing_type 
        })));
        
        // Primero, asegurarse de que solo trabajamos con aplicaciones de tipo 'selected_plans'
        const selectedPlansOnly = applications.filter(app => app.application_type === 'selected_plans');
        console.log(`Filtered to ${selectedPlansOnly.length} 'selected_plans' applications`);
        
        // Map applications to a simpler format and initialize status properties
        let mappedApps = selectedPlansOnly.map(app => {
          // Prioritize global status for column placement
          // Siempre usar status o global_status para determinar la columna, 
          // independientemente de la vista (asesor o empresa)
          const globalStatus = app.status || app.global_status;
          
          // Debug: Log status values for this specific app
          console.log(`App ${app.id} status values:`, {
            global_status: globalStatus,
            advisor_status: app.advisor_status,
            company_status: app.company_status,
            approvedByAdvisor: app.approved_by_advisor,
            approvedByCompany: app.approved_by_company
          });
          
          return {
            id: app.id,
            status: globalStatus, // SIEMPRE usar status global para la columna
            advisor_status: app.advisor_status || app.status, // Mantener estados específicos de rol
            company_status: app.company_status || app.status, // Mantener estados específicos de rol
            global_status: app.global_status || app.status,
            client_name: app.client_name || 'Cliente sin nombre',
            company_name: app.company_name,
            amount: app.amount || app.requested_amount || 0,
            application_type: app.application_type,
            financing_type: app.financing_type || null, // Asegurarse de incluir financing_type
            approvalStatus: {
              approvedByAdvisor: app.approved_by_advisor,
              approvedByCompany: app.approved_by_company,
              isFullyApproved: app.approved_by_advisor && app.approved_by_company
            }
          } as ApplicationWithApproval;
        });
        
        // Debug: Log mapped apps to check rejection flags
        console.log('Mapped applications with rejection flags:');
        mappedApps.forEach(app => {
          if (app.status === 'rejected') {
            console.log(`Rejected app ${app.id}:`, {
              rejectedByAdvisor: app.advisor_status === APPLICATION_STATUS.REJECTED,
              rejectedByCompany: app.company_status === APPLICATION_STATUS.REJECTED
            });
          }
        });
        
        // Filter by application type if specified
        if (applicationTypeFilter && applicationTypeFilter !== 'all') {
          console.log(`Filtering initial applications by type: ${applicationTypeFilter}`);
          const beforeCount = mappedApps.length;
          mappedApps = mappedApps.filter(app => app.application_type === applicationTypeFilter);
          console.log(`Filtered from ${beforeCount} to ${mappedApps.length} applications with type ${applicationTypeFilter}`);
        }

        // Set the applications in state
        setAppsWithApproval(mappedApps);
      } catch (error) {
        console.error('Error setting up applications:', error);
        setErrorMessage('Error al cargar las aplicaciones');
      } finally {
        setIsLoading(false);
      }
    };
    
    // Call the function
    fetchApplicationsWithApproval();
  }, [applications, statusField, applicationTypeFilter]);
  
  // Group applications by status
  const getApplicationsByStatus = (status: string) => {
    // Filtrar SIEMPRE por el campo status global para las columnas
    // Esto garantiza que ambos Kanbans (asesor y empresa) coloquen las tarjetas en las mismas columnas
    let filteredApps = appsWithApproval.filter(app => app.status === status);
    
    // SIEMPRE filtrar por 'selected_plans' independientemente del filtro recibido
    const selectedPlansFilter = 'selected_plans';
    filteredApps = filteredApps.filter(app => app.application_type === selectedPlansFilter);
    
    return filteredApps;
  };
  
  // Get visible applications (limited to 5 by default)
  const getVisibleApplications = (status: string) => {
    const apps = getApplicationsByStatus(status);
    if (expandedColumns[status]) {
      return apps; // Show all if expanded
    }
    return apps.slice(0, 5); // Show only first 5
  };
  
  // Toggle expanded state for a column
  const toggleColumnExpand = (status: string) => {
    setExpandedColumns(prev => ({
      ...prev,
      [status]: !prev[status]
    }));
  };
  
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, application: ApplicationWithApproval) => {
    // Store the drag start element for later reference
    dragItemRef.current = e.currentTarget;
    
    // Add moving class to the dragged item
    e.currentTarget.classList.add('card-moving');
    
    // Set the data for the drag operation
    e.dataTransfer.setData('application/id', application.id);
    e.dataTransfer.effectAllowed = 'move';
    
    // Create a custom drag image for better UX
    try {
      const ghostElement = e.currentTarget.cloneNode(true) as HTMLElement;
      ghostElement.style.position = 'absolute';
      ghostElement.style.top = '-1000px';
      ghostElement.style.opacity = '0.8';
      ghostElement.style.transform = 'scale(0.8)';
      ghostElement.style.width = `${e.currentTarget.offsetWidth}px`;
      document.body.appendChild(ghostElement);
      e.dataTransfer.setDragImage(ghostElement, 20, 20);

      // Clean up the ghost element after a short delay
      setTimeout(() => {
        if (ghostElement.parentNode) {
          document.body.removeChild(ghostElement);
        }
      }, 100);
    } catch (error) {
      console.warn('Failed to create custom drag image:', error);
      // Fall back to default drag image
    }
  };
  
  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    // Remove dragging-related classes from the dragged item
    if (dragItemRef.current) {
      dragItemRef.current.classList.remove('card-moving');
    }
    
    // Get and remove any columns with drag-over class
    const columns = document.querySelectorAll('.column-content');
    columns.forEach(column => column.classList.remove('drag-over'));
    
    // Clear the reference
    dragItemRef.current = null;
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    // Add a class to the drop target
      e.currentTarget.classList.add('drag-over');
  };
  
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    // Remove the drag-over class
    e.currentTarget.classList.remove('drag-over');
  };
  
  const canMoveToStatus = (applicationStatus: string, newStatus: string, application: ApplicationWithApproval): boolean => {
    // Don't allow moving to the same status
    if (applicationStatus === newStatus) return false;

    // Status transition rules based on the specific view (advisor, company, or global)
    if (statusField === 'advisor_status') {
      // Advisor-specific rules
      if (applicationStatus === APPLICATION_STATUS.NEW) {
        // From NEW, advisors can move to IN_REVIEW, APPROVED or REJECTED
        return newStatus === APPLICATION_STATUS.IN_REVIEW || 
               newStatus === APPLICATION_STATUS.APPROVED || 
               newStatus === APPLICATION_STATUS.REJECTED;
      } else if (applicationStatus === APPLICATION_STATUS.IN_REVIEW) {
        // From IN_REVIEW, advisors can go back to NEW, approve or reject
        return newStatus === APPLICATION_STATUS.NEW || 
               newStatus === APPLICATION_STATUS.APPROVED || 
               newStatus === APPLICATION_STATUS.REJECTED;
      } else if (applicationStatus === APPLICATION_STATUS.APPROVED) {
        // Once approved, advisors can go back to IN_REVIEW or reject
        return newStatus === APPLICATION_STATUS.IN_REVIEW || 
               newStatus === APPLICATION_STATUS.REJECTED;
      } else if (applicationStatus === APPLICATION_STATUS.POR_DISPERSAR) {
        // Permitir a asesores retroceder de POR_DISPERSAR a EN_REVISIÓN para corregir errores
        // o marcar como COMPLETED para indicar que se ha completado la dispersión
        // o REJECTED para rechazar
        return newStatus === APPLICATION_STATUS.IN_REVIEW || 
               newStatus === APPLICATION_STATUS.COMPLETED || 
               newStatus === APPLICATION_STATUS.REJECTED;
      } else if (applicationStatus === APPLICATION_STATUS.REJECTED) {
        // Permitir mover desde REJECTED a NEW o IN_REVIEW para reactivar
        return newStatus === APPLICATION_STATUS.NEW || 
               newStatus === APPLICATION_STATUS.IN_REVIEW || 
               newStatus === APPLICATION_STATUS.APPROVED;
      }
    } 
    else if (statusField === 'company_status') {
      // Company-specific rules
      if (applicationStatus === APPLICATION_STATUS.NEW) {
        // From NEW, company can move to IN_REVIEW, APPROVED or REJECTED
        return newStatus === APPLICATION_STATUS.IN_REVIEW || 
               newStatus === APPLICATION_STATUS.APPROVED || 
               newStatus === APPLICATION_STATUS.REJECTED;
      } else if (applicationStatus === APPLICATION_STATUS.IN_REVIEW) {
        // From IN_REVIEW, company can go back to NEW, approve or reject
        return newStatus === APPLICATION_STATUS.NEW || 
               newStatus === APPLICATION_STATUS.APPROVED || 
               newStatus === APPLICATION_STATUS.REJECTED;
      } else if (applicationStatus === APPLICATION_STATUS.APPROVED) {
        // Once approved, company can go back to IN_REVIEW or reject
        return newStatus === APPLICATION_STATUS.IN_REVIEW || 
               newStatus === APPLICATION_STATUS.REJECTED;
      } else if (applicationStatus === APPLICATION_STATUS.REJECTED) {
        // Permitir mover desde REJECTED a NEW o IN_REVIEW para reactivar
        return newStatus === APPLICATION_STATUS.NEW || 
               newStatus === APPLICATION_STATUS.IN_REVIEW ||
               newStatus === APPLICATION_STATUS.APPROVED;
      }
    }
    else if (statusField === 'global_status') {
      // Global view rules - this is for admins or the "por dispersar" stage and beyond
      if (applicationStatus === APPLICATION_STATUS.NEW) {
        // Can move from NEW to IN_REVIEW, APPROVED or REJECTED
        return newStatus === APPLICATION_STATUS.IN_REVIEW || 
               newStatus === APPLICATION_STATUS.APPROVED || 
               newStatus === APPLICATION_STATUS.REJECTED;
      } else if (applicationStatus === APPLICATION_STATUS.IN_REVIEW) {
        // From IN_REVIEW, can move to NEW, APPROVED or REJECTED
        if (newStatus === APPLICATION_STATUS.NEW) return true;
        if (newStatus === APPLICATION_STATUS.APPROVED) {
          // For global view, we still require both approvals when moving from IN_REVIEW to APPROVED
          return application.approvalStatus?.approvedByAdvisor === true && 
                 application.approvalStatus?.approvedByCompany === true;
        }
        if (newStatus === APPLICATION_STATUS.REJECTED) return true;
        return false;
      } else if (applicationStatus === APPLICATION_STATUS.APPROVED) {
        // From APPROVED, can move to IN_REVIEW, POR_DISPERSAR or REJECTED
        return newStatus === APPLICATION_STATUS.IN_REVIEW || 
               newStatus === APPLICATION_STATUS.POR_DISPERSAR || 
               newStatus === APPLICATION_STATUS.REJECTED;
      } else if (applicationStatus === APPLICATION_STATUS.POR_DISPERSAR) {
        // From POR_DISPERSAR, can move to APPROVED, COMPLETED, IN_REVIEW or REJECTED
        return newStatus === APPLICATION_STATUS.APPROVED || 
               newStatus === APPLICATION_STATUS.COMPLETED || 
               newStatus === APPLICATION_STATUS.IN_REVIEW ||
               newStatus === APPLICATION_STATUS.REJECTED;
      } else if (applicationStatus === APPLICATION_STATUS.COMPLETED) {
        // Completed applications cannot be moved
        return false;
      } else if (applicationStatus === APPLICATION_STATUS.REJECTED) {
        // Permitir mover desde REJECTED a otros estados para reactivar
        return newStatus === APPLICATION_STATUS.NEW || 
               newStatus === APPLICATION_STATUS.IN_REVIEW ||
               newStatus === APPLICATION_STATUS.APPROVED;
      }
    } else {
      // Default rules for the standard status field
      if (applicationStatus === APPLICATION_STATUS.NEW) {
        // Can move from NEW to IN_REVIEW, APPROVED or REJECTED
        return newStatus === APPLICATION_STATUS.IN_REVIEW || 
               newStatus === APPLICATION_STATUS.APPROVED ||
               newStatus === APPLICATION_STATUS.REJECTED;
      } else if (applicationStatus === APPLICATION_STATUS.IN_REVIEW) {
        // From IN_REVIEW, can move to NEW or APPROVED or REJECTED
        if (newStatus === APPLICATION_STATUS.NEW) return true;
        if (newStatus === APPLICATION_STATUS.APPROVED) {
          if (isAdvisor()) {
            return application.approvalStatus?.approvedByAdvisor === true;
          }
          else if (isCompanyAdmin()) {
            return application.approvalStatus?.approvedByCompany === true;
          }
          else {
            return application.approvalStatus?.approvedByAdvisor === true && 
                   application.approvalStatus?.approvedByCompany === true;
          }
        }
        if (newStatus === APPLICATION_STATUS.REJECTED) return true;
        return false;
      } else if (applicationStatus === APPLICATION_STATUS.APPROVED) {
        // From APPROVED, can move to IN_REVIEW, POR_DISPERSAR or REJECTED
        return newStatus === APPLICATION_STATUS.IN_REVIEW || 
               newStatus === APPLICATION_STATUS.POR_DISPERSAR ||
               newStatus === APPLICATION_STATUS.REJECTED;
      } else if (applicationStatus === APPLICATION_STATUS.POR_DISPERSAR) {
        // From POR_DISPERSAR, can move to APPROVED, COMPLETED, IN_REVIEW or REJECTED
        if (isAdvisor() && newStatus === APPLICATION_STATUS.IN_REVIEW) return true;
        if (isAdvisor() && newStatus === APPLICATION_STATUS.REJECTED) return true;
        return newStatus === APPLICATION_STATUS.APPROVED || 
               newStatus === APPLICATION_STATUS.COMPLETED;
      } else if (applicationStatus === APPLICATION_STATUS.COMPLETED) {
        // Completed applications cannot be moved
        return false;
      } else if (applicationStatus === APPLICATION_STATUS.REJECTED) {
        // Permitir mover desde REJECTED a otros estados para reactivar
        return newStatus === APPLICATION_STATUS.NEW || 
               newStatus === APPLICATION_STATUS.IN_REVIEW ||
               newStatus === APPLICATION_STATUS.APPROVED;
      }
    }
      
    // Default: allow movement between states that don't have specific rules
    return true;
  };
  
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, newStatus: string) => {
    e.preventDefault();
    
    // Clear styling
    e.currentTarget.classList.remove('drag-over');
    
    // Check if something is being dragged
    if (!dragItemRef.current) {
      console.warn('Nothing is being dragged');
      return;
    }
    
    // Extract application data from the dataTransfer
    const applicationId = e.dataTransfer.getData('application/id');
    const application = appsWithApproval.find(app => app.id === applicationId);
    
    if (!application) {
      console.error('Application not found:', applicationId);
      return;
    }
        
    // Don't allow dropping in the same column or if processing another application
    if (application.status === newStatus || processingAppId !== null) {
      return;
    }
        
    // Check if this transition is allowed
    if (!canMoveToStatus(application.status, newStatus, application)) {
      if (application.status === APPLICATION_STATUS.IN_REVIEW && newStatus === APPLICATION_STATUS.APPROVED) {
        // Mensaje personalizado según el rol del usuario
        if (isAdvisor() && !application.approvalStatus?.approvedByAdvisor) {
          setWarnMessage('No puedes aprobar esta solicitud. Debes aprobarla primero desde la página de detalle.');
        } else if (isCompanyAdmin() && !application.approvalStatus?.approvedByCompany) {
          setWarnMessage('No puedes aprobar esta solicitud. Debes aprobarla primero desde la página de detalle.');
        } else {
          // Para otros roles, mostrar mensaje sobre ambas aprobaciones
          const missingApprovals = [];
          if (!application.approvalStatus?.approvedByAdvisor) missingApprovals.push('del asesor');
          if (!application.approvalStatus?.approvedByCompany) missingApprovals.push('de la empresa');
          
          setWarnMessage(`No se puede aprobar esta solicitud. Falta aprobación ${missingApprovals.join(' y ')}.`);
        }
        setTimeout(() => setWarnMessage(null), 5000);
      } else {
        // General transition not allowed message
        setErrorMessage(`No se permite cambiar el estado de "${STATUS_LABELS[application.status as keyof typeof STATUS_LABELS]}" a "${STATUS_LABELS[newStatus as keyof typeof STATUS_LABELS]}"`);
        setTimeout(() => setErrorMessage(null), 5000);
      }
      return;
    }
    
    // Bail if there's no status change handler
    if (!onStatusChange) {
      setWarnMessage('No tienes permisos para cambiar el estado de las solicitudes');
      setTimeout(() => setWarnMessage(null), 3000);
      return;
    }
    
    // Mark that we're processing this application
    setProcessingAppId(applicationId);
    
    // Mark this application as moving in the UI
    setAppsWithApproval(prev => 
      prev.map(app => 
        app.id === applicationId
          ? { ...app, isMoving: true } 
          : app
      )
    );
    
    try {
      // IMPORTANTE: Crear un payload que solo contenga el campo de status específico
      // para evitar que se actualicen otros campos
      const payload: ApplicationStatusPayload = { 
        id: application.id,
        // Solo incluir el campo correspondiente al statusField actual
      };
      
      // Solo añadir el campo que necesitamos actualizar, no todos los campos de estado
      if (statusField === 'advisor_status') {
        payload.advisor_status = newStatus;
      } else if (statusField === 'company_status') {
        payload.company_status = newStatus;
      } else if (statusField === 'global_status') {
        payload.global_status = newStatus;
      } else {
        payload.status = newStatus;
      }

      console.log(`Actualizando ${statusField} a ${newStatus} para aplicación ${application.id}. Payload:`, payload);
      
      // Call the parent component to update the status
      await onStatusChange(
        application,
        newStatus,
        statusField
      );
      
      // Update local state after successful change
      setAppsWithApproval(prev => 
        prev.map(app => {
          if (app.id === applicationId) {
            // Create a new object with updated status
            const updatedApp = { ...app, isMoving: false };
            
            // IMPORTANT: Update ONLY the specific status field and the local "status" property
            // This ensures that only the current view sees the card in the new position
            if (statusField === 'advisor_status') {
              updatedApp.advisor_status = newStatus;
              updatedApp.status = newStatus; // This is the view-specific status
              
              // Si estamos moviendo directo de NEW a APPROVED, actualizar el indicador de aprobación del asesor
              if (app.status === APPLICATION_STATUS.NEW && newStatus === APPLICATION_STATUS.APPROVED) {
                updatedApp.approvalStatus = {
                  ...app.approvalStatus,
                  approvedByAdvisor: true,
                  isFullyApproved: app.approvalStatus?.approvedByCompany === true
                };
              }
            } else if (statusField === 'company_status') {
              updatedApp.company_status = newStatus;
              updatedApp.status = newStatus; // This is the view-specific status
              
              // Si estamos moviendo directo de NEW a APPROVED, actualizar el indicador de aprobación de la empresa
              if (app.status === APPLICATION_STATUS.NEW && newStatus === APPLICATION_STATUS.APPROVED) {
                updatedApp.approvalStatus = {
                  ...app.approvalStatus,
                  approvedByCompany: true,
                  isFullyApproved: app.approvalStatus?.approvedByAdvisor === true
                };
              }
            } else if (statusField === 'global_status') {
              updatedApp.global_status = newStatus;
              updatedApp.status = newStatus; // This is the view-specific status
              
              // Si estamos moviendo directo de NEW a APPROVED en global_status, establecer ambos como aprobados
              if (app.status === APPLICATION_STATUS.NEW && newStatus === APPLICATION_STATUS.APPROVED) {
                updatedApp.approvalStatus = {
                  ...app.approvalStatus,
                  approvedByAdvisor: true,
                  approvedByCompany: true,
                  isFullyApproved: true
                };
              }
            } else {
              updatedApp.status = newStatus;
              
              // Si estamos moviendo directo de NEW a APPROVED en el status principal
              if (app.status === APPLICATION_STATUS.NEW && newStatus === APPLICATION_STATUS.APPROVED) {
                if (isAdvisor()) {
              updatedApp.approvalStatus = {
                ...app.approvalStatus,
                    approvedByAdvisor: true,
                    isFullyApproved: app.approvalStatus?.approvedByCompany === true
                  };
                } else if (isCompanyAdmin()) {
                  updatedApp.approvalStatus = {
                    ...app.approvalStatus,
                    approvedByCompany: true,
                    isFullyApproved: app.approvalStatus?.approvedByAdvisor === true
                  };
                } else {
                  // Para rol de admin, establecer ambos como aprobados
                  updatedApp.approvalStatus = {
                    ...app.approvalStatus,
                    approvedByAdvisor: true,
                    approvedByCompany: true,
                isFullyApproved: true
              };
                }
              }
            }
            
            // Handle specific status change actions
            if (newStatus === APPLICATION_STATUS.REJECTED) {
              // Rechazar la aplicación
              if (statusField === 'advisor_status') {
                // Un asesor está rechazando
                updatedApp.advisor_status = APPLICATION_STATUS.REJECTED;
                // NO modificar company_status
                updatedApp.approvalStatus = {
                  ...app.approvalStatus,
                  approvedByAdvisor: false // Asegurarse de quitar cualquier aprobación
                };
                console.log('Advisor rejection - setting advisor_status to rejected');
              } 
              else if (statusField === 'company_status') {
                // Una empresa está rechazando
                updatedApp.company_status = APPLICATION_STATUS.REJECTED;
                // NO modificar advisor_status
                updatedApp.approvalStatus = {
                  ...app.approvalStatus,
                  approvedByCompany: false // Asegurarse de quitar cualquier aprobación
                };
                console.log('Company rejection - setting company_status to rejected');
              } 
              else if (statusField === 'status' || statusField === 'global_status') {
                // Vista global/normal - establecer según el rol
                if (isAdvisor()) {
                  updatedApp.advisor_status = APPLICATION_STATUS.REJECTED;
                  // Mantener company_status como está
                  updatedApp.approvalStatus = {
                    ...app.approvalStatus,
                    approvedByAdvisor: false
                  };
                  console.log('Global view: Setting advisor_status to rejected (company_status unchanged)');
                } 
                else if (isCompanyAdmin()) {
                  updatedApp.company_status = APPLICATION_STATUS.REJECTED;
                  // Mantener advisor_status como está
                  updatedApp.approvalStatus = {
                    ...app.approvalStatus,
                    approvedByCompany: false
                  };
                  console.log('Global view: Setting company_status to rejected (advisor_status unchanged)');
                }
                else {
                  // Para administradores globales, marcar según la lógica de negocio
                  console.log('Global admin determining rejection logic');
                  // Si el asesor ya había aprobado, entonces la empresa rechazó
                  if (app.approvalStatus?.approvedByAdvisor === true || 
                      app.advisor_status === APPLICATION_STATUS.APPROVED) {
                    updatedApp.company_status = APPLICATION_STATUS.REJECTED;
                    // Mantener advisor_status como está
                    updatedApp.approvalStatus = {
                      ...app.approvalStatus,
                      approvedByCompany: false
                    };
                    console.log('Global admin: Setting company_status to rejected (advisor pre-approved)');
                  }
                  // Si la empresa ya había aprobado, entonces el asesor rechazó
                  else if (app.approvalStatus?.approvedByCompany === true || 
                           app.company_status === APPLICATION_STATUS.APPROVED) {
                    updatedApp.advisor_status = APPLICATION_STATUS.REJECTED;
                    // Mantener company_status como está
                    updatedApp.approvalStatus = {
                      ...app.approvalStatus,
                      approvedByAdvisor: false
                    };
                    console.log('Global admin: Setting advisor_status to rejected (company pre-approved)');
                  }
                  // Si no hay información clara, asumir que la empresa rechazó (caso más común)
                  else {
                    updatedApp.company_status = APPLICATION_STATUS.REJECTED;
                    // Mantener advisor_status como está
                    updatedApp.approvalStatus = {
                      ...app.approvalStatus,
                      approvedByCompany: false
                    };
                    console.log('Global admin: Default to company_status rejected');
                  }
                }
              }
            }
            
            // Si movemos desde REJECTED a otro estado, quitar los indicadores de rechazo
            if (app.status === APPLICATION_STATUS.REJECTED && newStatus !== APPLICATION_STATUS.REJECTED) {
              // Restaurar estados a un estado no rechazado
              if (statusField === 'advisor_status') {
                updatedApp.advisor_status = newStatus;
              } else if (statusField === 'company_status') {
                updatedApp.company_status = newStatus;
              } else {
                // En vista global, restaurar ambos estados
                updatedApp.advisor_status = newStatus;
                updatedApp.company_status = newStatus;
              }
            }
            
            // If moving from APPROVED to another status, update approvalStatus
            if (app.status === APPLICATION_STATUS.APPROVED && newStatus !== APPLICATION_STATUS.APPROVED) {
              if (statusField === 'advisor_status') {
                updatedApp.approvalStatus = {
                  ...app.approvalStatus,
                  approvedByAdvisor: false,
                  isFullyApproved: false
                };
              } else if (statusField === 'company_status') {
                updatedApp.approvalStatus = {
                  ...app.approvalStatus,
                  approvedByCompany: false,
                  isFullyApproved: false
                };
              }
            }
            
            // Existing code for when both parties have approved
            if (
              (statusField === 'advisor_status' && newStatus === APPLICATION_STATUS.APPROVED && app.approvalStatus?.approvedByCompany) ||
              (statusField === 'company_status' && newStatus === APPLICATION_STATUS.APPROVED && app.approvalStatus?.approvedByAdvisor)
            ) {
              updatedApp.approvalStatus = {
                ...app.approvalStatus,
                isFullyApproved: true
              };
            }
            
            return updatedApp;
          }
          return app;
        })
      );
      
      // Show success message
      setSuccessMessage(`Se ha movido "${application.client_name}" a "${STATUS_LABELS[newStatus as keyof typeof STATUS_LABELS]}"`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Error updating status:', error);
      
      // Reset the card to its original state
      setAppsWithApproval(prev => 
        prev.map(app => 
          app.id === applicationId
            ? { ...app, isMoving: false } 
            : app
        )
      );
      
      // Show error message
      if (error instanceof Error) {
        setErrorMessage(`Error: ${error.message}`);
      } else {
        setErrorMessage('Error desconocido al actualizar el estado');
      }
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      // Clear processing state
      setProcessingAppId(null);
    }
  };
  
  // Function to get the appropriate card color based on its approval status
  const getCardColor = (app: ApplicationWithApproval) => {
    // Here you can implement different styling based on approval status
    if (app.isMoving) return 'card-moving';
    
    // Use the status that corresponds to the current view
    const viewStatus = statusField === 'advisor_status' ? app.advisor_status :
                       statusField === 'company_status' ? app.company_status :
                       statusField === 'global_status' ? app.global_status : 
                       app.status;
    
    switch (viewStatus) {
      case APPLICATION_STATUS.NEW:
        return 'bg-white border-l-yellow-400';
      case APPLICATION_STATUS.IN_REVIEW:
        return 'bg-white border-l-blue-400';
      case APPLICATION_STATUS.APPROVED:
        return 'bg-white border-l-green-400';
      case APPLICATION_STATUS.REJECTED:
        return 'bg-white border-l-red-400';
      case APPLICATION_STATUS.POR_DISPERSAR:
        return 'bg-white border-l-purple-400';
      case APPLICATION_STATUS.COMPLETED:
        return 'bg-white border-l-slate-400';
      default:
        return 'bg-white';
    }
  };
  
  // Function to determine if a card can be dragged
  const canDragCard = (app: ApplicationWithApproval) => {
    // Implement your business rules for what cards can be dragged
    // For example, you might not want completed applications to be moved
    
    // Simple example: don't allow dragging of cards that are already moving
    if (app.isMoving) return false;
    
    // Don't allow dragging while any card is processing
    if (processingAppId) return false;
    
    return true;
  };
  
  // Function to get tooltip text for draggable status
  const getDragTooltip = (app: ApplicationWithApproval) => {
    if (processingAppId) return 'Procesando otra aplicación, espere un momento';
    if (app.isMoving) return 'Actualizando estado...';
    if (!canDragCard(app)) return 'Esta aplicación no puede ser movida';
    return 'Arrastre para cambiar el estado';
  };
  
  // Function to get CSS classes for draggable status
  const getDraggableClasses = (app: ApplicationWithApproval) => {
    if (!canDragCard(app)) return 'kanban-card-locked';
    return 'kanban-card-draggable';
  };
  
  // Función auxiliar para renderizar los indicadores de aprobación
  const renderApprovalIndicators = (app: ApplicationWithApproval) => {
    console.log(`Rendering approval indicators for app ${app.id}`, {
      status: app.status,
      advisor_status: app.advisor_status,
      company_status: app.company_status
    });

    // Determinar si cada rol ha rechazado directamente desde sus campos de estado
    const isAdvisorRejected = app.advisor_status === 'rejected';
    const isCompanyRejected = app.company_status === 'rejected';
    
    // Determinar las clases y textos de estado para cada rol
    let advisorBadgeClass = isAdvisorRejected ? 'bg-red-500' : 
                           (app.approvalStatus?.approvedByAdvisor ? 'bg-green-500' : 'bg-yellow-500');
    
    let companyBadgeClass = isCompanyRejected ? 'bg-red-500' : 
                           (app.approvalStatus?.approvedByCompany ? 'bg-green-500' : 'bg-yellow-500');
    
    let advisorStatusText = isAdvisorRejected ? 'Rechazado' : 
                           (app.approvalStatus?.approvedByAdvisor ? 'Aprobado' : 'Pendiente');
    
    let companyStatusText = isCompanyRejected ? 'Rechazado' : 
                           (app.approvalStatus?.approvedByCompany ? 'Aprobado' : 'Pendiente');
    
    // Determinar quién rechazó la solicitud para el badge principal
    // Solo mostrar el badge de rechazo si la tarjeta está en la columna Rechazado (status global)
    let showRejectionBadge = app.status === 'rejected';
    let rejector = "";
    
    if (showRejectionBadge) {
      // Determinar quién rechazó basado en los estados específicos de rol
      if (isAdvisorRejected) {
        rejector = "Asesor";
      } else if (isCompanyRejected) {
        rejector = "Empresa";
      }
    }
    
    console.log(`Rendering rejection for app ${app.id}:`, {
      globalStatus: app.status,
      isAdvisorRejected,
      isCompanyRejected,
      showRejectionBadge,
      rejector
    });
    
    return (
      <div className="flex flex-col gap-1 mb-2">
        {/* Only show "Complete" badge when both are approved and status is APPROVED */}
        {app.status === 'approved' && 
         app.approvalStatus?.approvedByAdvisor && 
         app.approvalStatus?.approvedByCompany && (
          <div className="flex items-center">
            <div className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-blue-500 text-white">
              Aprobación Completa
            </div>
          </div>
        )}
        
        {/* Individual approval badges */}
        <div className="flex items-center">
          <div className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${advisorBadgeClass} text-white mr-1`}>
            Asesor: {advisorStatusText}
          </div>
          <div className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${companyBadgeClass} text-white`}>
            Empresa: {companyStatusText}
          </div>
        </div>
      </div>
    );
  };
  
  const getApplicationTag = (type: string, financingType?: string) => {
    // Get the human-readable label
    const label = APPLICATION_TYPE_LABELS[type] || type;
    
    // Si es un plan seleccionado y tiene tipo de financiamiento, mostrar eso en lugar del tipo de aplicación
    if (type === 'selected_plans' && financingType) {
      const financingLabel = financingType === 'producto' ? 'Financiamiento de Producto' : 
                           financingType === 'personal' ? 'Crédito Personal' : 
                           financingType;
      
      const bgColorClass = financingType === 'producto' ? 'bg-indigo-100 text-indigo-800' : 
                         financingType === 'personal' ? 'bg-purple-100 text-purple-800' : 
                         'bg-blue-100 text-blue-800';
      
      return (
        <span className={`application-tag ${bgColorClass}`}>
          {financingLabel}
        </span>
      );
    }
    
    // Funcionamiento original para otros tipos
    switch (type) {
      case 'selected_plans':
        return (
          <span className="application-tag bg-blue-100 text-blue-800">
            {label}
          </span>
        );
      case 'cash_requests':
        return (
          <span className="application-tag bg-green-100 text-green-800">
            {label}
          </span>
        );
      case 'product_simulations':
        return (
          <span className="application-tag bg-orange-100 text-orange-800">
            {label}
          </span>
        );
      case 'AUTO_LOAN':
        return (
          <span className="application-tag bg-purple-100 text-purple-800">
            {label}
          </span>
        );
      case 'CAR_BACKED_LOAN':
        return (
          <span className="application-tag bg-indigo-100 text-indigo-800">
            {label}
          </span>
        );
      case 'PERSONAL_LOAN':
        return (
          <span className="application-tag bg-pink-100 text-pink-800">
            {label}
          </span>
        );
      case 'CASH_ADVANCE':
        return (
          <span className="application-tag bg-yellow-100 text-yellow-800">
            {label}
          </span>
        );
      default:
        return (
          <span className="application-tag bg-gray-100 text-gray-800">
            {label || type}
          </span>
        );
    }
  };
  
  // CSS for the Kanban board
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
    
    .kanban-card-locked {
      position: relative;
      cursor: not-allowed !important;
      opacity: 0.8;
    }
    
    .card-moving {
      opacity: 0.7;
      background-color: #f9fafb;
    }
    
    .drag-over {
      background-color: #f3f4f6;
    }
    
    @keyframes processingPulse {
      0% { box-shadow: 0 0 0 0 rgba(168, 85, 247, 0.4); }
      70% { box-shadow: 0 0 0 10px rgba(168, 85, 247, 0); }
      100% { box-shadow: 0 0 0 0 rgba(168, 85, 247, 0); }
    }
    
    .processing {
      animation: processingPulse 1.5s infinite;
    }

    .application-tag {
      display: inline-block;
      font-size: 0.7rem;
      padding: 0.15rem 0.4rem;
      border-radius: 0.25rem;
      font-weight: 500;
    }

    .approval-indicators {
      display: flex;
      margin-top: 0.5rem;
      margin-bottom: 0.5rem;
      gap: 0.5rem;
    }
    
    .approval-indicator {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }
    
    .approval-indicator-dot {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid #e2e8f0;
      transition: all 0.2s ease;
    }
    
    .approval-indicator-dot.approved {
      background-color: #22c55e;
      border-color: #16a34a;
      box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.2);
    }
    
    .approval-indicator-dot.pending {
      background-color: #d1d5db;
      border-color: #9ca3af;
    }
    
    .approval-indicator-label {
      font-size: 0.75rem;
      font-weight: 500;
    }
    
    .approval-indicator-label.approved {
      color: #16a34a;
    }
    
    .approval-indicator-label.pending {
      color: #6b7280;
    }

    .tag-product {
      background-color: #e0f2fe;
      color: #0369a1;
    }

    .tag-cash {
      background-color: #dcfce7;
      color: #15803d;
    }

    .tag-selected {
      background-color: #f3e8ff;
      color: #7e22ce;
    }

    .column-header {
      font-weight: 600;
      padding: 0.75rem;
      border-radius: 0.5rem;
      margin-bottom: 1rem;
    }

    .column-count {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.5rem;
      height: 1.5rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      background-color: white;
      color: #4b5563;
      margin-left: 0.5rem;
    }
  `;
  
    return (
    <div className="kanban-board-container bg-base-100 p-2">
      <style dangerouslySetInnerHTML={{ __html: customStyles }} />
      
      {/* Indicador permanente de filtro de Planes Seleccionados */}
      <div className="flex justify-center mb-4">
        <div className="badge badge-lg badge-accent gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-4 h-4 stroke-current">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          Solo Planes Seleccionados
        </div>
      </div>
      
      {/* Messages display area */}
      {errorMessage && (
        <div className="alert alert-error shadow-lg mb-4 mx-2">
          <div>
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>{errorMessage}</span>
          </div>
          <div className="flex-none">
            <button onClick={() => setErrorMessage(null)} className="btn btn-sm btn-ghost">Cerrar</button>
          </div>
        </div>
      )}
      
      {warnMessage && (
        <div className="alert alert-warning shadow-lg mb-4 mx-2">
          <div>
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <span>{warnMessage}</span>
          </div>
          <div className="flex-none">
            <button onClick={() => setWarnMessage(null)} className="btn btn-sm btn-ghost">Cerrar</button>
          </div>
        </div>
      )}
      
      {successMessage && (
        <div className="alert alert-success shadow-lg mb-4 mx-2">
          <div>
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>{successMessage}</span>
          </div>
          <div className="flex-none">
            <button onClick={() => setSuccessMessage(null)} className="btn btn-sm btn-ghost">Cerrar</button>
          </div>
        </div>
      )}
      
      {/* Loading indicator */}
      {isLoading ? (
        <div className="flex items-center justify-center h-24">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2 text-gray-600">Cargando aplicaciones...</span>
              </div>
      ) : error ? (
        <div className="alert alert-error shadow-lg mb-4">
          <div>
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>Error: {error}</span>
            </div>
        </div>
      ) : (
        // The actual Kanban board grid
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {/* New Applications */}
          <div className="kanban-column bg-base-200 rounded-lg p-4 h-full">
            <div className="column-header mb-4">
              <h3 className="text-lg font-bold flex items-center">
                <span className="w-3 h-3 rounded-full bg-yellow-400 mr-2"></span>
                {STATUS_LABELS[APPLICATION_STATUS.NEW]} ({getApplicationsByStatus(APPLICATION_STATUS.NEW).length})
              </h3>
            </div>
            <div 
              className="column-content h-[calc(100vh-300px)] overflow-y-auto custom-scrollbar p-1 rounded-md"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, APPLICATION_STATUS.NEW)}
            >
              {getVisibleApplications(APPLICATION_STATUS.NEW).map((app) => (
                <div 
                  key={app.id}
                  className={`kanban-card ${getCardColor(app)} p-4 rounded-md shadow-md mb-3 border-l-4 ${getDraggableClasses(app)} ${processingAppId === app.id ? 'processing' : ''}`}
                  draggable={canDragCard(app)}
                  onDragStart={canDragCard(app) ? (e) => handleDragStart(e, app) : undefined}
                  onDragEnd={handleDragEnd}
                  title={getDragTooltip(app)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-gray-800">{app.client_name || "Cliente sin nombre"}</h4>
                    {getApplicationTag(app.application_type, app.financing_type)}
          </div>
                  <div className="text-sm text-gray-600 mb-2">
                    {app.company_name && <p>{app.company_name}</p>}
                  </div>
                  <div className="text-sm font-medium text-gray-900 mb-1">
                    {formatCurrency(app.amount)}
                  </div>
                  <div className="flex flex-col mt-2 pt-2 border-t border-gray-100">
                    {renderApprovalIndicators(app)}
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-gray-500">ID: {app.id.substring(0, 5)}...</span>
                      <Link 
                        to={`/applications/${app.id}`} 
                        className="btn btn-xs btn-primary"
                      >
                        VER DETALLE
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
              {getApplicationsByStatus(APPLICATION_STATUS.NEW).length > 5 && !expandedColumns[APPLICATION_STATUS.NEW] && (
                <button 
                  onClick={() => toggleColumnExpand(APPLICATION_STATUS.NEW)}
                  className="w-full py-2 text-sm text-primary hover:text-primary-focus hover:bg-base-200 rounded-md text-center transition-colors"
                >
                  Ver {getApplicationsByStatus(APPLICATION_STATUS.NEW).length - 5} más
                </button>
              )}
              {expandedColumns[APPLICATION_STATUS.NEW] && (
                <button 
                  onClick={() => toggleColumnExpand(APPLICATION_STATUS.NEW)}
                  className="w-full py-2 text-sm text-primary hover:text-primary-focus hover:bg-base-200 rounded-md text-center transition-colors"
                >
                  Ver menos
                </button>
              )}
              {getApplicationsByStatus(APPLICATION_STATUS.NEW).length === 0 && (
                <div className="text-center py-4 text-gray-500 italic">
                  No hay solicitudes
                </div>
              )}
            </div>
                </div>
                
          {/* In Review Applications */}
          <div className="kanban-column bg-base-200 rounded-lg p-4 h-full">
            <div className="column-header mb-4">
              <h3 className="text-lg font-bold flex items-center">
                <span className="w-3 h-3 rounded-full bg-blue-400 mr-2"></span>
                {STATUS_LABELS[APPLICATION_STATUS.IN_REVIEW]} ({getApplicationsByStatus(APPLICATION_STATUS.IN_REVIEW).length})
              </h3>
            </div>
            <div 
              className="column-content h-[calc(100vh-300px)] overflow-y-auto custom-scrollbar p-1 rounded-md"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, APPLICATION_STATUS.IN_REVIEW)}
            >
              {getVisibleApplications(APPLICATION_STATUS.IN_REVIEW).map((app) => (
                <div 
                  key={app.id}
                  className={`kanban-card ${getCardColor(app)} p-4 rounded-md shadow-md mb-3 border-l-4 ${getDraggableClasses(app)} ${processingAppId === app.id ? 'processing' : ''}`}
                  draggable={canDragCard(app)}
                  onDragStart={canDragCard(app) ? (e) => handleDragStart(e, app) : undefined}
                  onDragEnd={handleDragEnd}
                  title={getDragTooltip(app)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-gray-800">{app.client_name || "Cliente sin nombre"}</h4>
                    {getApplicationTag(app.application_type, app.financing_type)}
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    {app.company_name && <p>{app.company_name}</p>}
                  </div>
                  <div className="text-sm font-medium text-gray-900 mb-1">
                    {formatCurrency(app.amount)}
                  </div>
                  <div className="flex flex-col mt-2 pt-2 border-t border-gray-100">
                    {renderApprovalIndicators(app)}
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-gray-500">ID: {app.id.substring(0, 5)}...</span>
                      <Link 
                        to={`/applications/${app.id}`} 
                        className="btn btn-xs btn-primary"
                      >
                        VER DETALLE
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
              {getApplicationsByStatus(APPLICATION_STATUS.IN_REVIEW).length > 5 && !expandedColumns[APPLICATION_STATUS.IN_REVIEW] && (
                <button 
                  onClick={() => toggleColumnExpand(APPLICATION_STATUS.IN_REVIEW)}
                  className="w-full py-2 text-sm text-primary hover:text-primary-focus hover:bg-base-200 rounded-md text-center transition-colors"
                >
                  Ver {getApplicationsByStatus(APPLICATION_STATUS.IN_REVIEW).length - 5} más
                </button>
              )}
              {expandedColumns[APPLICATION_STATUS.IN_REVIEW] && (
                <button 
                  onClick={() => toggleColumnExpand(APPLICATION_STATUS.IN_REVIEW)}
                  className="w-full py-2 text-sm text-primary hover:text-primary-focus hover:bg-base-200 rounded-md text-center transition-colors"
                >
                  Ver menos
                </button>
              )}
              {getApplicationsByStatus(APPLICATION_STATUS.IN_REVIEW).length === 0 && (
                <div className="text-center py-4 text-gray-500 italic">
                  No hay solicitudes
                </div>
              )}
                </div>
                </div>
                
          {/* Approved Applications */}
          <div className="kanban-column bg-base-200 rounded-lg p-4 h-full">
            <div className="column-header mb-4">
              <h3 className="text-lg font-bold flex items-center">
                <span className="w-3 h-3 rounded-full bg-green-400 mr-2"></span>
                {STATUS_LABELS[APPLICATION_STATUS.APPROVED]} ({getApplicationsByStatus(APPLICATION_STATUS.APPROVED).length})
              </h3>
                </div>
            <div 
              className="column-content h-[calc(100vh-300px)] overflow-y-auto custom-scrollbar p-1 rounded-md"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, APPLICATION_STATUS.APPROVED)}
            >
              {getVisibleApplications(APPLICATION_STATUS.APPROVED).map((app) => (
                <div 
                  key={app.id}
                  className={`kanban-card ${getCardColor(app)} p-4 rounded-md shadow-md mb-3 border-l-4 ${getDraggableClasses(app)} ${processingAppId === app.id ? 'processing' : ''}`}
                  draggable={canDragCard(app)}
                  onDragStart={canDragCard(app) ? (e) => handleDragStart(e, app) : undefined}
                  onDragEnd={handleDragEnd}
                  title={getDragTooltip(app)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-gray-800">{app.client_name || "Cliente sin nombre"}</h4>
                    {getApplicationTag(app.application_type, app.financing_type)}
                </div>
                  <div className="text-sm text-gray-600 mb-2">
                    {app.company_name && <p>{app.company_name}</p>}
              </div>
                  <div className="text-sm font-medium text-gray-900 mb-1">
                    {formatCurrency(app.amount)}
                  </div>
                  <div className="flex flex-col mt-2 pt-2 border-t border-gray-100">
                    {renderApprovalIndicators(app)}
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-gray-500">ID: {app.id.substring(0, 5)}...</span>
                      <Link 
                        to={`/applications/${app.id}`} 
                        className="btn btn-xs btn-primary"
                      >
                        VER DETALLE
                      </Link>
              </div>
                  </div>
                </div>
              ))}
              {getApplicationsByStatus(APPLICATION_STATUS.APPROVED).length > 5 && !expandedColumns[APPLICATION_STATUS.APPROVED] && (
                <button 
                  onClick={() => toggleColumnExpand(APPLICATION_STATUS.APPROVED)}
                  className="w-full py-2 text-sm text-primary hover:text-primary-focus hover:bg-base-200 rounded-md text-center transition-colors"
                >
                  Ver {getApplicationsByStatus(APPLICATION_STATUS.APPROVED).length - 5} más
                </button>
              )}
              {expandedColumns[APPLICATION_STATUS.APPROVED] && (
                <button 
                  onClick={() => toggleColumnExpand(APPLICATION_STATUS.APPROVED)}
                  className="w-full py-2 text-sm text-primary hover:text-primary-focus hover:bg-base-200 rounded-md text-center transition-colors"
                >
                  Ver menos
                </button>
              )}
              {getApplicationsByStatus(APPLICATION_STATUS.APPROVED).length === 0 && (
                <div className="text-center py-4 text-gray-500 italic">
                  No hay solicitudes
            </div>
          )}
        </div>
      </div>
      
          {/* Ready for Disbursement (Por Dispersar) */}
          <div className="kanban-column bg-base-200 rounded-lg p-4 h-full">
            <div className="column-header mb-4">
              <h3 className="text-lg font-bold flex items-center">
                <span className="w-3 h-3 rounded-full bg-purple-400 mr-2"></span>
                {STATUS_LABELS[APPLICATION_STATUS.POR_DISPERSAR]} ({getApplicationsByStatus(APPLICATION_STATUS.POR_DISPERSAR).length})
              </h3>
            </div>
            <div 
              className="column-content h-[calc(100vh-300px)] overflow-y-auto custom-scrollbar p-1 rounded-md"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, APPLICATION_STATUS.POR_DISPERSAR)}
            >
              {getVisibleApplications(APPLICATION_STATUS.POR_DISPERSAR).map((app) => (
                <div 
                  key={app.id}
                  className={`kanban-card ${getCardColor(app)} p-4 rounded-md shadow-md mb-3 border-l-4 ${getDraggableClasses(app)} ${processingAppId === app.id ? 'processing' : ''}`}
                  draggable={canDragCard(app)}
                  onDragStart={canDragCard(app) ? (e) => handleDragStart(e, app) : undefined}
                  onDragEnd={handleDragEnd}
                  title={getDragTooltip(app)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-gray-800">{app.client_name || "Cliente sin nombre"}</h4>
                    {getApplicationTag(app.application_type, app.financing_type)}
              </div>
                  <div className="text-sm text-gray-600 mb-2">
                    {app.company_name && <p>{app.company_name}</p>}
                    </div>
                  <div className="text-sm font-medium text-gray-900 mb-1">
                    {formatCurrency(app.amount)}
                  </div>
                  <div className="flex flex-col mt-2 pt-2 border-t border-gray-100">
                    {renderApprovalIndicators(app)}
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-gray-500">ID: {app.id.substring(0, 5)}...</span>
                      <Link 
                        to={`/applications/${app.id}`} 
                        className="btn btn-xs btn-primary"
                      >
                        VER DETALLE
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
              {getApplicationsByStatus(APPLICATION_STATUS.POR_DISPERSAR).length > 5 && !expandedColumns[APPLICATION_STATUS.POR_DISPERSAR] && (
                <button 
                  onClick={() => toggleColumnExpand(APPLICATION_STATUS.POR_DISPERSAR)}
                  className="w-full py-2 text-sm text-primary hover:text-primary-focus hover:bg-base-200 rounded-md text-center transition-colors"
                >
                  Ver {getApplicationsByStatus(APPLICATION_STATUS.POR_DISPERSAR).length - 5} más
                </button>
              )}
              {expandedColumns[APPLICATION_STATUS.POR_DISPERSAR] && (
                <button 
                  onClick={() => toggleColumnExpand(APPLICATION_STATUS.POR_DISPERSAR)}
                  className="w-full py-2 text-sm text-primary hover:text-primary-focus hover:bg-base-200 rounded-md text-center transition-colors"
                >
                  Ver menos
                </button>
              )}
              {getApplicationsByStatus(APPLICATION_STATUS.POR_DISPERSAR).length === 0 && (
                <div className="text-center py-4 text-gray-500 italic">
                  No hay solicitudes
                </div>
              )}
            </div>
          </div>
          
          {/* Completed Applications */}
          <div className="kanban-column bg-base-200 rounded-lg p-4 h-full">
            <div className="column-header mb-4">
              <h3 className="text-lg font-bold flex items-center">
                <span className="w-3 h-3 rounded-full bg-slate-400 mr-2"></span>
                {STATUS_LABELS[APPLICATION_STATUS.COMPLETED]} ({getApplicationsByStatus(APPLICATION_STATUS.COMPLETED).length})
              </h3>
            </div>
            <div 
              className="column-content h-[calc(100vh-300px)] overflow-y-auto custom-scrollbar p-1 rounded-md"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, APPLICATION_STATUS.COMPLETED)}
            >
              {getVisibleApplications(APPLICATION_STATUS.COMPLETED).map((app) => (
                      <div
                        key={app.id}
                  className={`kanban-card ${getCardColor(app)} p-4 rounded-md shadow-md mb-3 border-l-4 ${getDraggableClasses(app)} ${processingAppId === app.id ? 'processing' : ''}`}
                  draggable={canDragCard(app)}
                  onDragStart={canDragCard(app) ? (e) => handleDragStart(e, app) : undefined}
                  onDragEnd={handleDragEnd}
                  title={getDragTooltip(app)}
                >
                          <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-gray-800">{app.client_name || "Cliente sin nombre"}</h4>
                    {getApplicationTag(app.application_type, app.financing_type)}
                            </div>
                  <div className="text-sm text-gray-600 mb-2">
                    {app.company_name && <p>{app.company_name}</p>}
                          </div>
                  <div className="text-sm font-medium text-gray-900 mb-1">
                    {formatCurrency(app.amount)}
                            </div>
                  <div className="flex flex-col mt-2 pt-2 border-t border-gray-100">
                    {renderApprovalIndicators(app)}
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-gray-500">ID: {app.id.substring(0, 5)}...</span>
                      <Link 
                        to={`/applications/${app.id}`} 
                        className="btn btn-xs btn-primary"
                      >
                        VER DETALLE
                      </Link>
                            </div>
                  </div>
                </div>
              ))}
              {getApplicationsByStatus(APPLICATION_STATUS.COMPLETED).length > 5 && !expandedColumns[APPLICATION_STATUS.COMPLETED] && (
                <button 
                  onClick={() => toggleColumnExpand(APPLICATION_STATUS.COMPLETED)}
                  className="w-full py-2 text-sm text-primary hover:text-primary-focus hover:bg-base-200 rounded-md text-center transition-colors"
                >
                  Ver {getApplicationsByStatus(APPLICATION_STATUS.COMPLETED).length - 5} más
                </button>
              )}
              {expandedColumns[APPLICATION_STATUS.COMPLETED] && (
                <button 
                  onClick={() => toggleColumnExpand(APPLICATION_STATUS.COMPLETED)}
                  className="w-full py-2 text-sm text-primary hover:text-primary-focus hover:bg-base-200 rounded-md text-center transition-colors"
                >
                  Ver menos
                </button>
              )}
              {getApplicationsByStatus(APPLICATION_STATUS.COMPLETED).length === 0 && (
                <div className="text-center py-4 text-gray-500 italic">
                  No hay solicitudes
                </div>
              )}
            </div>
                            </div>
                            
          {/* Rejected Applications */}
          <div className="kanban-column bg-base-200 rounded-lg p-4 h-full">
            <div className="column-header mb-4">
              <h3 className="text-lg font-bold flex items-center">
                <span className="w-3 h-3 rounded-full bg-red-400 mr-2"></span>
                {STATUS_LABELS[APPLICATION_STATUS.REJECTED]} ({getApplicationsByStatus(APPLICATION_STATUS.REJECTED).length})
              </h3>
            </div>
            <div 
              className="column-content h-[calc(100vh-300px)] overflow-y-auto custom-scrollbar p-1 rounded-md"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, APPLICATION_STATUS.REJECTED)}
            >
              {getVisibleApplications(APPLICATION_STATUS.REJECTED).map((app) => (
                <div 
                  key={app.id}
                  className={`kanban-card ${getCardColor(app)} p-4 rounded-md shadow-md mb-3 border-l-4 ${getDraggableClasses(app)} ${processingAppId === app.id ? 'processing' : ''}`}
                  draggable={canDragCard(app)}
                  onDragStart={canDragCard(app) ? (e) => handleDragStart(e, app) : undefined}
                  onDragEnd={handleDragEnd}
                  title={getDragTooltip(app)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-gray-800">{app.client_name || "Cliente sin nombre"}</h4>
                    {getApplicationTag(app.application_type, app.financing_type)}
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    {app.company_name && <p>{app.company_name}</p>}
                  </div>
                  <div className="text-sm font-medium text-gray-900 mb-1">
                    {formatCurrency(app.amount)}
                  </div>
                  <div className="flex flex-col mt-2 pt-2 border-t border-gray-100">
                    {renderApprovalIndicators(app)}
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-gray-500">ID: {app.id.substring(0, 5)}...</span>
                      <Link 
                        to={`/applications/${app.id}`} 
                        className="btn btn-xs btn-primary"
                      >
                        VER DETALLE
                              </Link>
                            </div>
                          </div>
                        </div>
              ))}
              {getApplicationsByStatus(APPLICATION_STATUS.REJECTED).length > 5 && !expandedColumns[APPLICATION_STATUS.REJECTED] && (
                <button 
                  onClick={() => toggleColumnExpand(APPLICATION_STATUS.REJECTED)}
                  className="w-full py-2 text-sm text-primary hover:text-primary-focus hover:bg-base-200 rounded-md text-center transition-colors"
                >
                  Ver {getApplicationsByStatus(APPLICATION_STATUS.REJECTED).length - 5} más
                </button>
              )}
              {expandedColumns[APPLICATION_STATUS.REJECTED] && (
                <button 
                  onClick={() => toggleColumnExpand(APPLICATION_STATUS.REJECTED)}
                  className="w-full py-2 text-sm text-primary hover:text-primary-focus hover:bg-base-200 rounded-md text-center transition-colors"
                >
                  Ver menos
                </button>
              )}
              {getApplicationsByStatus(APPLICATION_STATUS.REJECTED).length === 0 && (
                <div className="text-center py-4 text-gray-500 italic">
                  No hay solicitudes
                      </div>
                )}
              </div>
            </div>
      </div>
      )}
    </div>
  );
};

export default KanbanBoard; 