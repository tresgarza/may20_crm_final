import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
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
  
  const [applications, setApplications] = useState<ApplicationType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  // Referencia para rastrear si deberíamos actualizar
  const pendingRefreshRef = React.useRef(false);
  // Almacenar estados previos de aplicaciones antes de rechazar
  const previousStatusesRef = React.useRef<PreviousStatuses>({});

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
    amountMaxFilter
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
            // Importante: también actualizamos el campo status para que el cambio visual ocurra
            updatedApplication.status = updatedStatus as ApplicationType['status'];
          } else if (updatedStatusField === 'company_status') {
            updatedApplication.company_status = updatedStatus as ApplicationType['status'];
            // Importante: también actualizamos el campo status para que el cambio visual ocurra
            updatedApplication.status = updatedStatus as ApplicationType['status'];
          } else if (updatedStatusField === 'global_status') {
            updatedApplication.global_status = updatedStatus as ApplicationType['status'];
            // Importante: también actualizamos el campo status para que el cambio visual ocurra
            updatedApplication.status = updatedStatus as ApplicationType['status'];
          } else {
            updatedApplication.status = updatedStatus as ApplicationType['status'];
          }
          
          console.log('Aplicación actualizada localmente:', updatedApplication);
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
        const updateQuery = `
          UPDATE applications 
          SET 
            status = '${APPLICATION_STATUS.REJECTED}', 
            advisor_status = '${APPLICATION_STATUS.REJECTED}', 
            company_status = '${APPLICATION_STATUS.REJECTED}', 
            global_status = '${APPLICATION_STATUS.REJECTED}',
            rejected_by_advisor = ${isAdvisorRejecting ? 'TRUE' : 'FALSE'},
            rejected_by_company = ${isCompanyRejecting ? 'TRUE' : 'FALSE'},
            previous_status = '${currentStatus}',
            previous_advisor_status = '${getStatusField() === 'advisor_status' ? currentStatus : ''}',
            previous_company_status = '${getStatusField() === 'company_status' ? currentStatus : ''}',
            previous_global_status = '${getStatusField() === 'global_status' ? currentStatus : ''}'
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
        pendingRefreshRef.current = true;
        fetchApplications();
        
        return;
      } catch (error: any) {
        console.error('Error al reactivar la solicitud:', error.message);
        toast.error('Error al reactivar la solicitud');
        return;
      }
    }

    // Para otros estados, usar updateApplicationStatusField del servicio
    try {
      console.log(`Actualizando estado de aplicación ${applicationId} a ${newStatus} usando campo ${statusField}`);
      
      // Usar el campo de estado correspondiente al rol actual
      await updateApplicationStatusField(
        applicationId,
        newStatus as any,
        statusField,
        `Estado cambiado a ${newStatus}`,
        user?.id || 'system',
        getEntityFilter()
      );
      
      // Actualizar la UI local
      updateLocalApplication(application, statusField, newStatus);
      
      // Mostrar notificación
      toast.success(`Estado actualizado correctamente a ${STATUS_LABELS[newStatus as keyof typeof STATUS_LABELS] || newStatus}`);
      
      // Forzar una actualización completa
      pendingRefreshRef.current = true;
      fetchApplications();
      
    } catch (error: any) {
      console.error('Error al actualizar el estado:', error);
      toast.error(`Error al actualizar el estado: ${error.message}`);
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
      <div className="p-6 max-w-[2000px] mx-auto">
        {/* Debug info for filters - Only show in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-gray-100 p-3 mb-4 rounded text-xs font-mono overflow-x-auto">
            <p>Debug - Current filters:</p>
            <ul>
              <li>Type filter: {typeFilter}</li>
              <li>Status filter: {statusFilter}</li>
              <li>Status field: {statusField}</li>
            </ul>
          </div>
        )}
        
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-primary">Tablero Kanban - Planes Seleccionados</h1>
            <p className="text-gray-600 mt-1">
              {statusField === 'advisor_status' && 'Vista de Asesor: Gestiona tus planes seleccionados independientemente de otros roles'}
              {statusField === 'company_status' && 'Vista de Empresa: Gestiona tus planes seleccionados independientemente de otros roles'}
              {statusField === 'global_status' && 'Vista Global: Supervisa todos los planes seleccionados en el sistema'}
              {statusField === 'status' && 'Visualiza y gestiona tus planes seleccionados arrastrando las tarjetas entre columnas'}
            </p>
            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-blue-700 text-sm flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Este tablero muestra exclusivamente solicitudes de tipo "Planes Seleccionados".
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Link to="/applications" className="btn btn-outline btn-md">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              Vista Lista
            </Link>
            
            {userCan(PERMISSIONS.CREATE_APPLICATION) && (
              <Link to="/applications/new" className="btn btn-primary btn-md">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Nueva Solicitud
              </Link>
            )}
            
            <button 
              onClick={fetchApplications} 
              className="btn btn-outline btn-md"
              title="Sincronizar datos"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Sincronizar
            </button>
            
            <button 
              className="btn btn-outline btn-md" 
              onClick={handleFilterToggle}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filtros
            </button>
          </div>
        </div>
        
        {/* Indicador de Vista */}
        <div className="mb-4 bg-base-200 p-3 rounded-lg shadow-sm">
          <div className="flex items-center">
            <div className="badge badge-primary mr-2">
              {statusField === 'advisor_status' && 'Vista de Asesor'}
              {statusField === 'company_status' && 'Vista de Empresa'}
              {statusField === 'global_status' && 'Vista Global'}
              {statusField === 'status' && 'Vista Estándar'}
            </div>
            <p className="text-sm">
              {statusField === 'advisor_status' && 'Los cambios que hagas aquí no afectarán la vista de Empresa'}
              {statusField === 'company_status' && 'Los cambios que hagas aquí no afectarán la vista de Asesor'}
              {statusField === 'global_status' && 'Supervisando el estado global del proceso'}
              {statusField === 'status' && 'Vista estándar del sistema'}
            </p>
          </div>
        </div>
        
        {/* Panel de filtros */}
        {isFilterExpanded && (
          <div className="mb-6 bg-base-200 p-4 rounded-lg shadow-sm">
            <div className="mb-2 flex justify-between items-center">
              <h3 className="font-bold text-lg">Filtros de búsqueda</h3>
              <button 
                onClick={handleClearFilters}
                className="btn btn-sm btn-ghost"
              >
                Limpiar filtros
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {/* Filtro por búsqueda */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Buscar</span>
                </label>
                <input 
                  type="text" 
                  className="input input-bordered w-full" 
                  placeholder="Nombre, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              {/* Filtro por estado */}
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
                  {Object.values(APPLICATION_STATUS).map((status) => (
                    <option key={status} value={status}>
                      {STATUS_LABELS[status as keyof typeof STATUS_LABELS] || status}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Filtro por tipo */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Tipo</span>
                  <span className="label-text-alt text-primary">Enfocado en Planes Seleccionados</span>
                </label>
                <div className="border border-primary rounded-md p-2 bg-primary bg-opacity-10 flex items-center justify-between">
                  <span className="font-medium text-primary">Planes Seleccionados</span>
                  <span className="badge badge-primary">Predeterminado</span>
                </div>
                <label className="label">
                  <span className="label-text-alt text-info">El tablero Kanban solo muestra Planes Seleccionados</span>
                </label>
              </div>
              
              {/* Filtro por fecha desde */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Fecha desde</span>
                </label>
                <input 
                  type="date" 
                  className="input input-bordered w-full" 
                  value={dateFromFilter}
                  onChange={(e) => setDateFromFilter(e.target.value)}
                />
              </div>
              
              {/* Filtro por fecha hasta */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Fecha hasta</span>
                </label>
                <input 
                  type="date" 
                  className="input input-bordered w-full" 
                  value={dateToFilter}
                  onChange={(e) => setDateToFilter(e.target.value)}
                />
              </div>
              
              {/* Filtro por monto mínimo */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Monto mínimo</span>
                </label>
                <input 
                  type="number" 
                  className="input input-bordered w-full" 
                  placeholder="0"
                  value={amountMinFilter}
                  onChange={(e) => setAmountMinFilter(e.target.value)}
                />
              </div>
              
              {/* Filtro por monto máximo */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Monto máximo</span>
                </label>
                <input 
                  type="number" 
                  className="input input-bordered w-full" 
                  placeholder="1000000"
                  value={amountMaxFilter}
                  onChange={(e) => setAmountMaxFilter(e.target.value)}
                />
              </div>
              
              {/* Botón de aplicar filtros */}
              <div className="form-control md:self-end">
                <button 
                  className="btn btn-primary mt-8"
                  onClick={fetchApplications}
                >
                  Aplicar filtros
                </button>
              </div>
            </div>
          </div>
        )}
        
        {error && (
          <Alert 
            type="error" 
            message={error}
            onClose={() => setError(null)}
            className="mb-6"
          />
        )}
        
        {success && (
          <Alert 
            type="success" 
            message={success}
            onClose={() => setSuccess(null)}
            autoClose={true}
            className="mb-6"
          />
        )}
        
        {isLoading && applications.length === 0 ? (
          <div className="flex justify-center items-center h-96 w-full">
            <div className="text-center">
              <span className="loading loading-spinner loading-lg text-primary"></span>
              <p className="mt-4 text-gray-500">Cargando solicitudes...</p>
            </div>
          </div>
        ) : (
          <div className="bg-base-100 shadow-xl rounded-xl overflow-hidden border border-base-300">
            {/* Pre-filtrar las aplicaciones para mostrar solo Planes Seleccionados */}
            <KanbanBoard 
              applications={applications.filter(app => app.application_type === 'selected_plans')} 
              onStatusChange={userCan(PERMISSIONS.EDIT_APPLICATION) ? 
                async (app, newStatus, fieldToUpdate = statusField) => {
                  return handleStatusChange(app.id, newStatus);
                } : undefined}
              statusField={statusField}
              applicationTypeFilter={'selected_plans'} // Forzar siempre el filtro de planes seleccionados
            />
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default ApplicationsKanban; 