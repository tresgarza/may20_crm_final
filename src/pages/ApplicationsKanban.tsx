import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import KanbanBoard from '../components/ui/KanbanBoard';
import Alert from '../components/ui/Alert';
import { usePermissions } from '../contexts/PermissionsContext';
import { useAuth } from '../contexts/AuthContext';
import { PERMISSIONS } from '../utils/constants/permissions';
import { getApplications, updateApplicationStatus, Application as ApplicationType, ApplicationFilter } from '../services/applicationService';
import { APPLICATION_STATUS, STATUS_LABELS } from '../utils/constants/statuses';
import { APPLICATION_TYPE, APPLICATION_TYPE_LABELS } from '../utils/constants/applications';

const ApplicationsKanban: React.FC = () => {
  const { userCan } = usePermissions();
  const { user } = useAuth();
  const { getEntityFilter, shouldFilterByEntity } = usePermissions();
  
  const [applications, setApplications] = useState<ApplicationType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  // Referencia para rastrear si deberíamos actualizar
  const pendingRefreshRef = React.useRef(false);

  // Estado para filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateFromFilter, setDateFromFilter] = useState<string>('');
  const [dateToFilter, setDateToFilter] = useState<string>('');
  const [amountMinFilter, setAmountMinFilter] = useState<string>('');
  const [amountMaxFilter, setAmountMaxFilter] = useState<string>('');
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  
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
        application_type: typeFilter !== 'all' ? typeFilter : undefined,
        dateFrom: dateFromFilter || undefined,
        dateTo: dateToFilter || undefined,
        amountMin: amountMinFilter ? parseFloat(amountMinFilter) : undefined,
        amountMax: amountMaxFilter ? parseFloat(amountMaxFilter) : undefined
      };
      
      // Obtener las aplicaciones
      const data = await getApplications(filters, entityFilter);
      console.log("Aplicaciones recuperadas:", data);
      setApplications(data);
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
    setTypeFilter('all');
    setDateFromFilter('');
    setDateToFilter('');
    setAmountMinFilter('');
    setAmountMaxFilter('');
  };
  
  // Función para actualizar una aplicación específica en el estado local
  const updateLocalApplication = (updatedApp: ApplicationType) => {
    setApplications(prev => 
      prev.map(app => app.id === updatedApp.id ? updatedApp : app)
    );
  };
  
  const handleStatusChange = async (application: ApplicationType, newStatus: string): Promise<void> => {
    if (!user) {
      setError('No has iniciado sesión. Por favor, inicia sesión para realizar esta acción.');
      return;
    }
    
    try {
      const entityFilter = shouldFilterByEntity() ? getEntityFilter() : null;
      
      // Actualizar el estado de la aplicación
      const defaultComment = `Cambio de estado de ${application.status} a ${newStatus} vía Kanban`;
      
      await updateApplicationStatus(
        application.id,
        newStatus as ApplicationType['status'],
        defaultComment,
        user.id,
        entityFilter
      );
      
      // Actualizar localmente la aplicación con el nuevo estado
      const updatedApplication = { 
        ...application, 
        status: newStatus as ApplicationType['status'] 
      };
      updateLocalApplication(updatedApplication);
      
      // Marcar que necesitamos una actualización completa en segundo plano
      pendingRefreshRef.current = true;
      
      setSuccess(`Solicitud de ${application.client_name || 'cliente'} actualizada correctamente a "${newStatus}"`);
      
      // Limpiar mensaje de éxito después de unos segundos
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (error: any) {
      console.error('Error updating application status:', error);
      setError(`Error al actualizar el estado: ${error.message || 'Error desconocido'}`);
      throw error;
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
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-primary">Tablero Kanban</h1>
            <p className="text-gray-600 mt-1">Visualiza y gestiona tus solicitudes arrastrando las tarjetas entre columnas</p>
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
                </label>
                <select 
                  className="select select-bordered w-full"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <option value="all">Todos los tipos</option>
                  {Object.entries(APPLICATION_TYPE).map(([key, value]) => (
                    <option key={key} value={value}>
                      {APPLICATION_TYPE_LABELS[key as keyof typeof APPLICATION_TYPE_LABELS] || key}
                    </option>
                  ))}
                </select>
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
            <KanbanBoard 
              applications={applications}
              onStatusChange={userCan(PERMISSIONS.EDIT_APPLICATION) ? handleStatusChange : undefined}
            />
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default ApplicationsKanban; 