import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PERMISSIONS } from '../utils/constants/permissions';
import { usePermissions } from '../contexts/PermissionsContext';
import { useAuth } from '../contexts/AuthContext';
import MainLayout from '../components/layout/MainLayout';
import { getApplications, Application as ApplicationType, ApplicationFilter } from '../services/applicationService';
import Alert from '../components/ui/Alert';
import { APPLICATION_TYPE, APPLICATION_TYPE_LABELS } from '../utils/constants/applications';
import { APPLICATION_STATUS, STATUS_LABELS } from '../utils/constants/statuses';
import { formatCurrency as formatCurrencyUtil, formatDate } from '../utils/formatters';
import KanbanBoardAdvisor from '../components/ui/KanbanBoardAdvisor';
import KanbanBoardCompany from '../components/ui/KanbanBoardCompany';
import KanbanBoard from '../components/ui/KanbanBoard';

const Applications: React.FC = () => {
  const { userCan } = usePermissions();
  const { user } = useAuth();
  const { getEntityFilter, shouldFilterByEntity, isAdvisor, isCompanyAdmin } = usePermissions();
  const navigate = useNavigate();
  
  const [applications, setApplications] = useState<ApplicationType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('selected_plans');
  const [dateFromFilter, setDateFromFilter] = useState<string>('');
  const [dateToFilter, setDateToFilter] = useState<string>('');
  const [amountMinFilter, setAmountMinFilter] = useState<string>('');
  const [amountMaxFilter, setAmountMaxFilter] = useState<string>('');
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('list');
  const [sortField, setSortField] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  const fetchApplications = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const entityFilter = shouldFilterByEntity() ? getEntityFilter() : null;
      
      const filters: ApplicationFilter = {
        status: statusFilter !== 'all' ? statusFilter : undefined,
        searchQuery: searchQuery || undefined,
        application_type: 'selected_plans',
        dateFrom: dateFromFilter || undefined,
        dateTo: dateToFilter || undefined,
        amountMin: amountMinFilter ? parseFloat(amountMinFilter) : undefined,
        amountMax: amountMaxFilter ? parseFloat(amountMaxFilter) : undefined
      };
      
      console.log('Aplicando filtros:', JSON.stringify(filters, null, 2));
      
      const data = await getApplications(filters, entityFilter);
      
      console.log(`Solicitudes recuperadas: ${data.length}`);
      if (data.length > 0) {
        console.log('Tipos de solicitudes:', new Set(data.map(app => app.application_type)));
        
        // Verificar si hay alguna aplicación que no sea 'selected_plans'
        const nonSelectedPlans = data.filter(app => app.application_type !== 'selected_plans');
        if (nonSelectedPlans.length > 0) {
          console.warn(`ADVERTENCIA: Se encontraron ${nonSelectedPlans.length} solicitudes que no son de tipo 'selected_plans':`);
          console.warn(nonSelectedPlans.map(app => ({ id: app.id, type: app.application_type })));
        }
      }
      
      setApplications(data);
    } catch (error: any) {
      console.error('Error fetching applications:', error);
      setError('Error al cargar las solicitudes: ' + (error.message || 'Error desconocido'));
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, statusFilter, typeFilter, dateFromFilter, dateToFilter, amountMinFilter, amountMaxFilter, shouldFilterByEntity, getEntityFilter]);
  
  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);
  
  const handleFilterToggle = () => {
    setIsFilterExpanded(!isFilterExpanded);
  };
  
  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setTypeFilter('selected_plans');
    setDateFromFilter('');
    setDateToFilter('');
    setAmountMinFilter('');
    setAmountMaxFilter('');
  };
  
  // Función para ordenar las aplicaciones
  const handleSort = (field: string) => {
    // Si se hace clic en el mismo campo, invertir la dirección del ordenamiento
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Si se hace clic en un campo diferente, establecerlo como el nuevo campo de ordenamiento
      // y establecer la dirección a ascendente por defecto
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  // Función para obtener las aplicaciones ordenadas
  const getSortedApplications = () => {
    // Clonar el array para no modificar el original
    const sortedApps = [...applications];
    
    // Ordenar según el campo y dirección actual
    return sortedApps.sort((a, b) => {
      let aValue = a[sortField as keyof ApplicationType];
      let bValue = b[sortField as keyof ApplicationType];
      
      // Manejar valores nulos o undefined
      if (aValue === null || aValue === undefined) aValue = '';
      if (bValue === null || bValue === undefined) bValue = '';
      
      // Convertir a string para comparación (excepto números)
      if (typeof aValue !== 'number') aValue = String(aValue).toLowerCase();
      if (typeof bValue !== 'number') bValue = String(bValue).toLowerCase();
      
      // Ordenar según la dirección
      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });
  };
  
  const getStatusClass = (status: string) => {
    switch (status) {
      case 'pending':
        return 'badge-warning';
      case 'review':
        return 'badge-info';
      case 'approved':
        return 'badge-success';
      case 'rejected':
        return 'badge-error';
      default:
        return 'badge-ghost';
    }
  };
  
  const getStatusText = (status: string) => {
    return STATUS_LABELS[status as keyof typeof STATUS_LABELS] || status;
  };
  
  const getTypeText = (type: string, productType?: string) => {
    if (productType && type === 'selected_plans') {
      return getApplicationTypeLabel(productType);
    }
    
    const typeLabels: Record<string, string> = {
      'selected_plans': 'Planes Seleccionados',
      'product_simulations': 'Simulación',
      'cash_requests': 'Solicitud de Efectivo'
    };
    
    return typeLabels[type] || type;
  };
  
  const formatCurrency = (amount: number) => {
    return formatCurrencyUtil(amount);
  };
  
  const getApplicationTypeLabel = (type: string): string => {
    return APPLICATION_TYPE_LABELS[type as keyof typeof APPLICATION_TYPE_LABELS] || type;
  };
  
  const renderKanbanBoard = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="loader animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="alert alert-error">
          <div className="flex-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mx-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <label>{error}</label>
          </div>
        </div>
      );
    }

    if (isAdvisor()) {
      return <KanbanBoardAdvisor applications={applications} onRefresh={fetchApplications} />;
    } else if (isCompanyAdmin()) {
      return <KanbanBoardCompany applications={applications} onRefresh={fetchApplications} />;
    } else {
      return (
        <KanbanBoard 
          applications={applications} 
          statusField="global_status"
          onStatusChange={async (app, newStatus) => {
            await fetchApplications();
          }}
        />
      );
    }
  };
  
  const renderListView = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="loader animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="alert alert-error">
          <div className="flex-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mx-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <label>{error}</label>
          </div>
        </div>
      );
    }

    if (applications.length === 0) {
      return (
        <div className="text-center py-12">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-4 text-xl font-medium text-gray-600">No se encontraron solicitudes</h3>
          <p className="mt-2 text-gray-500">Intenta cambiar los filtros de búsqueda</p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="table table-zebra w-full">
          <thead>
            <tr>
              <th onClick={() => handleSort('client_name')} className="cursor-pointer">
                <div className="flex items-center">
                  Cliente
                  {sortField === 'client_name' && (
                    <span className="ml-2 text-primary">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              <th onClick={() => handleSort('company_name')} className="cursor-pointer">
                <div className="flex items-center">
                  Empresa
                  {sortField === 'company_name' && (
                    <span className="ml-2 text-primary">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              <th onClick={() => handleSort('application_type')} className="cursor-pointer">
                <div className="flex items-center">
                  Tipo
                  {sortField === 'application_type' && (
                    <span className="ml-2 text-primary">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              <th onClick={() => handleSort('amount')} className="cursor-pointer">
                <div className="flex items-center">
                  Monto
                  {sortField === 'amount' && (
                    <span className="ml-2 text-primary">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              <th onClick={() => handleSort('status')} className="cursor-pointer">
                <div className="flex items-center">
                  Estado
                  {sortField === 'status' && (
                    <span className="ml-2 text-primary">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              <th onClick={() => handleSort('created_at')} className="cursor-pointer">
                <div className="flex items-center">
                  Fecha y Hora
                  {sortField === 'created_at' && (
                    <span className="ml-2 text-primary">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {getSortedApplications().map((application) => (
              <tr key={application.id} className="hover cursor-pointer" onClick={() => navigate(`/applications/${application.id}`)}>
                <td>{application.client_name || 'N/A'}</td>
                <td>{application.company_name || 'N/A'}</td>
                <td>
                  <span className="badge badge-primary badge-outline">
                  {application.application_type === 'selected_plans' && application.product_type
                    ? getApplicationTypeLabel(application.product_type)
                    : getApplicationTypeLabel(application.application_type)}
                  </span>
                </td>
                <td>{formatCurrency(Number(application.amount || 0))}</td>
                <td>
                  <span
                    className={`badge badge-${
                      application.status === APPLICATION_STATUS.APPROVED
                        ? 'success'
                        : application.status === APPLICATION_STATUS.REJECTED
                        ? 'error'
                        : application.status === APPLICATION_STATUS.NEW
                        ? 'warning'
                        : application.status === APPLICATION_STATUS.IN_REVIEW
                        ? 'info'
                        : application.status === APPLICATION_STATUS.COMPLETED
                        ? 'success'
                        : application.status === APPLICATION_STATUS.POR_DISPERSAR
                        ? 'warning'
                        : 'ghost'
                    }`}
                  >
                    {STATUS_LABELS[application.status as keyof typeof STATUS_LABELS] || application.status}
                  </span>
                </td>
                <td>{application.created_at ? formatDate(application.created_at, 'datetime') : 'N/A'}</td>
                <td>
                  <div className="dropdown dropdown-end">
                    <label tabIndex={0} className="btn btn-ghost btn-circle">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                      </svg>
                    </label>
                    <ul tabIndex={0} className="dropdown-content menu menu-compact mt-3 p-2 shadow bg-base-100 rounded-box w-52">
                      <li>
                        <Link to={`/applications/${application.id}`} className="justify-between">
                          Ver Detalle
                          <span className="text-info">⌘T</span>
                        </Link>
                      </li>
                    </ul>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
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
      <div className="p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-1">Solicitudes de Crédito</h1>
            <div className="badge badge-primary mb-3">Planes Seleccionados</div>
            <p className="text-sm text-gray-600">Esta vista muestra exclusivamente solicitudes de tipo "Planes Seleccionados"</p>
          </div>
          
          <div className="flex gap-2">
            {userCan(PERMISSIONS.CREATE_APPLICATION) && (
              <Link to="/applications/new" className="btn btn-primary">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Nueva Solicitud
              </Link>
            )}
            
            <button 
              className="btn btn-outline"
              onClick={fetchApplications}
              disabled={isLoading}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
              Actualizar
            </button>
            
            <button 
              className="btn btn-outline" 
              onClick={handleFilterToggle}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              {isFilterExpanded ? 'Ocultar Filtros' : 'Mostrar Filtros'}
            </button>
          </div>
        </div>
        
        <div className="bg-base-100 shadow-xl rounded-box p-6 mb-6">
          <div className="flex flex-col gap-4 mb-6">
            <div className="form-control w-full">
              <div className="input-group">
                <input
                  type="text"
                  placeholder="Buscar por nombre, email o teléfono"
                  className="input input-bordered w-full"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button className="btn btn-square">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>
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
                      {Object.entries(STATUS_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Tipo de Aplicación</span>
                      <span className="label-text-alt text-primary">Enfocado en Planes Seleccionados</span>
                    </label>
                    <div className="border border-primary rounded-md p-2 bg-primary bg-opacity-10 flex items-center justify-between">
                      <span className="font-medium text-primary">Planes Seleccionados</span>
                      <span className="badge badge-primary">Predeterminado</span>
                    </div>
                    <label className="label">
                      <span className="label-text-alt text-info">Esta vista solo muestra Planes Seleccionados</span>
                    </label>
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
          
          {error && (
            <Alert 
              type="error" 
              message={error}
              onClose={() => setError(null)}
              className="mb-6"
            />
          )}
          
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Solicitudes</h2>
            <div className="flex space-x-2">
              <div className="btn-group">
                <button 
                  className={`btn btn-sm ${viewMode === 'kanban' ? 'btn-active' : ''}`}
                  onClick={() => setViewMode('kanban')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                  </svg>
                  Kanban
                </button>
                <button 
                  className={`btn btn-sm ${viewMode === 'list' ? 'btn-active' : ''}`}
                  onClick={() => setViewMode('list')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  Lista
                </button>
              </div>
            </div>
          </div>
          
          {/* Información sobre el filtro de Planes Seleccionados */}
          <div className="mb-4 p-2 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-blue-700 text-sm flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Esta vista muestra exclusivamente solicitudes de tipo "Planes Seleccionados". Para ver otros tipos de solicitudes, contacte al administrador del sistema.
            </p>
          </div>
          
          {viewMode === 'kanban' ? renderKanbanBoard() : renderListView()}
        </div>
      </div>
    </MainLayout>
  );
};

export default Applications; 