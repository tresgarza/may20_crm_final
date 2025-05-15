import React, { useEffect, useState, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import KanbanBoard from '../components/ui/KanbanBoard';
import Alert from '../components/ui/Alert';
import { usePermissions } from '../contexts/PermissionsContext';
import { useAuth } from '../contexts/AuthContext';
import { PERMISSIONS } from '../utils/constants/permissions';
import { getApplications, updateApplicationStatusField, Application as ApplicationType, ApplicationFilter, markAsDispersed } from '../services/applicationService';
import { APPLICATION_STATUS, STATUS_LABELS } from '../utils/constants/statuses';
import { APPLICATION_TYPE, APPLICATION_TYPE_LABELS } from '../utils/constants/applications';
import { TABLES } from '../utils/constants/tables';
import { toast } from 'react-hot-toast';
import { supabase } from '../services/supabase';

// Objeto para almacenar estados previos de las solicitudes antes de ser rechazadas
interface PreviousStatuses {
  [applicationId: string]: {
    advisor_status?: string;
    company_status?: string;
    global_status?: string;
    status?: string;
  };
}

const ApplicationsKanban: React.FC = () => {
  const { userCan, isAdvisor, isCompanyAdmin, isAdmin } = usePermissions();
  const { user } = useAuth();
  const { getEntityFilter, shouldFilterByEntity } = usePermissions();
  const location = useLocation(); // Use location to access URL query params
  
  const [applications, setApplications] = useState<ApplicationType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  // Referencia para rastrear si deberíamos actualizar
  const pendingRefreshRef = React.useRef(false);
  // Almacenar estados previos de aplicaciones antes de rechazar
  const previousStatusesRef = React.useRef<PreviousStatuses>({});
  // Track if we're filtering for attention needed applications
  const [showOnlyAttentionNeeded, setShowOnlyAttentionNeeded] = useState(false);

  // Estado para filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('selected_plans');
  const [dateFromFilter, setDateFromFilter] = useState<string>('');
  const [dateToFilter, setDateToFilter] = useState<string>('');
  const [amountMinFilter, setAmountMinFilter] = useState<string>('');
  const [amountMaxFilter, setAmountMaxFilter] = useState<string>('');
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  
  // Determinar qué campo de estado usar según el rol del usuario
  const getStatusField = useCallback(() => {
    if (isAdvisor()) {
      return 'advisor_status';
    } else if (isCompanyAdmin()) {
      return 'company_status';
    } else if (isAdmin()) {
      return 'global_status';
    } else {
      return 'status'; // Fallback al estado estándar
    }
  }, [isAdvisor, isCompanyAdmin, isAdmin]);
  
  // Obtener el campo de estado actual
  const statusField = getStatusField();
  
  const fetchApplications = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Check for the attention_needed filter in URL query params
      const searchParams = new URLSearchParams(location.search);
      const attentionNeededFilter = searchParams.get('filter') === 'attention_needed';
      setShowOnlyAttentionNeeded(attentionNeededFilter);
      
      // Aplicar filtros según el rol del usuario
      const entityFilter = shouldFilterByEntity() ? getEntityFilter() : null;
      
      // Crear objeto de filtros para la búsqueda
      const filters: ApplicationFilter = {
        status: statusFilter !== 'all' ? statusFilter : undefined,
        searchQuery: searchQuery || undefined,
        application_type: 'selected_plans', // Siempre usar 'selected_plans' como filtro
        dateFrom: dateFromFilter || undefined,
        dateTo: dateToFilter || undefined,
        amountMin: amountMinFilter ? parseFloat(amountMinFilter) : undefined,
        amountMax: amountMaxFilter ? parseFloat(amountMaxFilter) : undefined
      };
      
      console.log('Applying filters:', JSON.stringify(filters, null, 2));
      console.log('Type filter value:', typeFilter);
      console.log('Attention needed filter:', attentionNeededFilter);
      
      // Obtener las aplicaciones
      const data = await getApplications(filters, entityFilter);
      console.log(`Applications retrieved: ${data.length}`);
      
      // Debug: check application types
      const appTypes = new Set(data.map(app => app.application_type));
      console.log('Retrieved application types:', Array.from(appTypes));
      
      if (filters.application_type) {
        const filteredCount = data.filter(app => app.application_type === filters.application_type).length;
        console.log(`Expected ${filteredCount} applications with type '${filters.application_type}', got ${data.length}`);
      }
      
      // Ordenar las aplicaciones de más antiguas a más recientes
      const sortedApplications = [...data].sort((a, b) => {
        const dateA = new Date(a.created_at);
        const dateB = new Date(b.created_at);
        return dateA.getTime() - dateB.getTime(); // Orden ascendente (más viejas primero)
      });
      
      setApplications(sortedApplications);
      // Limpiar la bandera de actualización pendiente
      pendingRefreshRef.current = false;
    } catch (error: any) {
      console.error('Error fetching applications:', error);
      setError('Error al cargar las solicitudes: ' + (error.message || 'Error desconocido'));
    } finally {
      setIsLoading(false);
    }
  }, [
    shouldFilterByEntity, 
    getEntityFilter, 
    searchQuery, 
    statusFilter, 
    typeFilter, 
    dateFromFilter, 
    dateToFilter, 
    amountMinFilter, 
    amountMaxFilter,
    location.search // Add location.search as a dependency to refetch when URL params change
  ]);
  
  useEffect(() => {
    fetchApplications();
    
    // Configurar un intervalo para verificar si necesitamos actualizar
    const interval = setInterval(() => {
      if (pendingRefreshRef.current) {
        fetchApplications();
      }
    }, 5000); // Verificar cada 5 segundos
    
    return () => clearInterval(interval);
  }, [fetchApplications]);
  
  const handleFilterToggle = () => {
    setIsFilterExpanded(!isFilterExpanded);
  };
  
  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    // Mantener el filtro de Planes Seleccionados incluso al limpiar los filtros
    setTypeFilter('selected_plans');
    setDateFromFilter('');
    setDateToFilter('');
    setAmountMinFilter('');
    setAmountMaxFilter('');
  };
  
  // Función para actualizar una aplicación específica en el estado local
  const updateLocalApplication = (updatedApp: ApplicationType, updatedStatusField: string, updatedStatus: string) => {
    setApplications(prev => 
      prev.map(app => {
        if (app.id === updatedApp.id) {
          // Creamos una copia de la aplicación
          const updatedApplication = { ...app };
          
          // Actualizamos solo el campo específico que se cambió
          if (updatedStatusField === 'advisor_status') {
            updatedApplication.advisor_status = updatedStatus as ApplicationType['status'];
            // También actualizamos el estado global para la visualización correcta
            updatedApplication.status = updatedStatus as ApplicationType['status'];
          } else if (updatedStatusField === 'company_status') {
            updatedApplication.company_status = updatedStatus as ApplicationType['status'];
            // También actualizamos el estado global para la visualización correcta
            updatedApplication.status = updatedStatus as ApplicationType['status'];
          } else if (updatedStatusField === 'global_status') {
            updatedApplication.global_status = updatedStatus as ApplicationType['status'];
            updatedApplication.status = updatedStatus as ApplicationType['status'];
          } else {
            updatedApplication.status = updatedStatus as ApplicationType['status'];
          }
          
          return updatedApplication;
        }
        return app;
      })
    );
  };
  
  const handleStatusChange = async (applicationId: string, newStatus: string) => {
    // Obtener la aplicación que se va a actualizar
    const application = applications.find(app => app.id === applicationId);
    
    if (!application) {
      console.error('No se encontró la aplicación');
      return;
    }
    
    const currentStatus = getStatusField() === 'advisor_status' ? application.advisor_status :
                         getStatusField() === 'company_status' ? application.company_status :
                         getStatusField() === 'global_status' ? application.global_status :
                         application.status;
    
    // Caso especial - si se mueve a Rechazado, guardar los estados actuales y actualizar todos los estados a RECHAZADO
    if (newStatus === APPLICATION_STATUS.REJECTED) {
      try {
        console.log(`Rejecting application as ${getStatusField()}`);
        
        // Determine who is rejecting based on user role directly
        let isAdvisorRejecting = false;
        let isCompanyRejecting = false;
        
        // Asignar correctamente basado en el rol y no solo en el statusField
        if (isAdvisor()) {
          isAdvisorRejecting = true;
          isCompanyRejecting = false;
        } else if (isCompanyAdmin()) {
          isAdvisorRejecting = false;
          isCompanyRejecting = true;
        } else if (isAdmin()) {
          // Si es un admin global, usar el statusField para determinar
          isAdvisorRejecting = getStatusField() === 'advisor_status';
          isCompanyRejecting = getStatusField() === 'company_status';
        }
        
        console.log(`Rejecting with flags - advisor: ${isAdvisorRejecting}, company: ${isCompanyRejecting}`);
        
        // Actualizar el estado en la base de datos
        // Siempre actualizar el estado global a REJECTED para que aparezca en la columna de rechazados
        // para todos los usuarios, pero preservar los estados específicos de cada rol
        const updateQuery = `
          UPDATE applications 
          SET 
            status = '${APPLICATION_STATUS.REJECTED}', 
            ${isAdvisorRejecting ? `advisor_status = '${APPLICATION_STATUS.REJECTED}',` : ''}
            ${isCompanyRejecting ? `company_status = '${APPLICATION_STATUS.REJECTED}',` : ''}
            ${isAdmin() && getStatusField() === 'global_status' ? `global_status = '${APPLICATION_STATUS.REJECTED}',` : ''}
            rejected_by_advisor = ${isAdvisorRejecting ? 'TRUE' : application.rejected_by_advisor ? 'TRUE' : 'FALSE'},
            rejected_by_company = ${isCompanyRejecting ? 'TRUE' : application.rejected_by_company ? 'TRUE' : 'FALSE'},
            previous_status = '${currentStatus}',
            previous_advisor_status = '${isAdvisorRejecting ? currentStatus : application.previous_advisor_status || ''}',
            previous_company_status = '${isCompanyRejecting ? currentStatus : application.previous_company_status || ''}',
            previous_global_status = '${isAdmin() && getStatusField() === 'global_status' ? currentStatus : application.previous_global_status || ''}'
          WHERE id = '${applicationId}'
        `;
        
        console.log(`Executing update query with rejection flags - advisor: ${isAdvisorRejecting}, company: ${isCompanyRejecting}`);
        
        await supabase.rpc('execute_sql', { query_text: updateQuery });
      
        // Actualizar el estado local
        updateLocalApplication(application, getStatusField(), APPLICATION_STATUS.REJECTED);
      
        // Mostrar notificación
        toast.success(`La solicitud ha sido rechazada correctamente.`);
        
        // Forzar una actualización completa
        pendingRefreshRef.current = true;
        fetchApplications();
        
        return;
      } catch (error: any) {
        console.error('Error al actualizar el estado de la solicitud:', error.message);
        toast.error('Error al actualizar el estado de la solicitud');
        return;
      }
    }
    
    // Caso especial - si se reactivar desde Rechazado, restaurar estados previos
    if (currentStatus === APPLICATION_STATUS.REJECTED && newStatus !== APPLICATION_STATUS.REJECTED) {
      try {
        // Determinar los estados correctos para cada rol
        const previousStatus = application.previous_status || APPLICATION_STATUS.NEW;
        const previousAdvisorStatus = application.previous_advisor_status || APPLICATION_STATUS.NEW;
        const previousCompanyStatus = application.previous_company_status || APPLICATION_STATUS.NEW;
        const previousGlobalStatus = application.previous_global_status || APPLICATION_STATUS.NEW;
        
        // Actualizar el estado en la base de datos
        const updateQuery = `
          UPDATE applications 
          SET 
            status = '${previousStatus}', 
            advisor_status = '${previousAdvisorStatus}', 
            company_status = '${previousCompanyStatus}', 
            global_status = '${previousGlobalStatus}',
            rejected_by_advisor = FALSE,
            rejected_by_company = FALSE
          WHERE id = '${applicationId}'
        `;
        
        await supabase.rpc('execute_sql', { query_text: updateQuery });
        
        // Actualizar el estado local
        updateLocalApplication(application, getStatusField(), previousStatus);

        // Mostrar notificación
        toast.success(`La solicitud ha sido reactivada correctamente.`);
        
        // Forzar una actualización completa
        if (pendingRefreshRef.current) {
          fetchApplications();
        }
        
        return;
      } catch (error: any) {
        console.error('Error al reactivar la solicitud:', error.message);
        toast.error('Error al reactivar la solicitud');
        return;
      }
    }

    // Caso por defecto: Actualizar el estado específico y global
    try {
      console.log(`Actualizando estado de ${getStatusField()} a ${newStatus} para solicitud ${applicationId}`);
      
      // Crear la consulta que actualiza tanto el campo específico como el campo de estado global
      const updateQuery = `
        UPDATE applications 
        SET 
          ${getStatusField()} = '${newStatus}',
          status = '${newStatus}'
        WHERE id = '${applicationId}'
      `;
      
      await supabase.rpc('execute_sql', { query_text: updateQuery });
      
      // Actualizar el estado local
      updateLocalApplication(application, getStatusField(), newStatus);
      
      // Mostrar notificación
      toast.success(`El estado de la solicitud ha sido actualizado correctamente.`);
      
      // Forzar una actualización
      pendingRefreshRef.current = true;
      fetchApplications();
      
    } catch (error: any) {
      console.error('Error al actualizar el estado de la solicitud:', error.message);
      toast.error('Error al actualizar el estado de la solicitud');
    }
  };
  
  if (!userCan(PERMISSIONS.VIEW_APPLICATIONS)) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-700">Acceso Restringido</h2>
            <p className="text-gray-500 mt-2">No tienes permisos para ver esta página.</p>
          </div>
        </div>
      </MainLayout>
    );
  }
  
  return (
    <MainLayout>
      <div className="flex flex-col h-full">
        <div className="flex justify-between items-center p-4 border-b">
          <h1 className="text-2xl font-bold">Tablero de Solicitudes</h1>
          <div className="flex gap-2">
            {/* Show indicator when filtering for attention needed applications */}
            {showOnlyAttentionNeeded && (
              <div className="badge badge-warning gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Mostrando sólo solicitudes que requieren atención
              </div>
            )}
            {userCan(PERMISSIONS.CREATE_APPLICATION) && (
              <Link to="/applications/new" className="btn btn-sm btn-primary">
                Nueva Solicitud
              </Link>
            )}
          </div>
        </div>

        {error && <Alert type="error" message={error} />}
        {success && <Alert type="success" message={success} />}
        
        {isLoading ? (
          <div className="flex justify-center items-center p-8 h-full">
            <div className="spinner-border text-primary" role="status">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          </div>
        ) : (
          <div className="flex-grow overflow-auto">
            <KanbanBoard 
              applications={applications} 
              onStatusChange={handleStatusChange} 
              statusField={statusField}
              applicationTypeFilter={'selected_plans'} // Forzar siempre el filtro de planes seleccionados
              attentionNeededOnly={showOnlyAttentionNeeded}
            />
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default ApplicationsKanban; 