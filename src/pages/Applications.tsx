import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PERMISSIONS } from '../utils/constants/permissions';
import { usePermissions } from '../contexts/PermissionsContext';
import { useAuth } from '../contexts/AuthContext';
import MainLayout from '../components/layout/MainLayout';
import { getApplications, Application as ApplicationType, ApplicationFilter } from '../services/applicationService';
import Alert from '../components/ui/Alert';
import { APPLICATION_TYPE, APPLICATION_TYPE_LABELS } from '../utils/constants/applications';
import { APPLICATION_STATUS, STATUS_LABELS } from '../utils/constants/statuses';
import { formatCurrency, formatDate } from '../utils/formatters';

const Applications: React.FC = () => {
  const { userCan } = usePermissions();
  const { user } = useAuth();
  const { getEntityFilter, shouldFilterByEntity } = usePermissions();
  const navigate = useNavigate();
  
  const [applications, setApplications] = useState<ApplicationType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateFromFilter, setDateFromFilter] = useState<string>('');
  const [dateToFilter, setDateToFilter] = useState<string>('');
  const [amountMinFilter, setAmountMinFilter] = useState<string>('');
  const [amountMaxFilter, setAmountMaxFilter] = useState<string>('');
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchApplications = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
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
        
        // Obtener las aplicaciones del servicio
        const data = await getApplications(filters, entityFilter);
        setApplications(data);
      } catch (error: any) {
        console.error('Error fetching applications:', error);
        setError('Error al cargar las solicitudes: ' + (error.message || 'Error desconocido'));
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchApplications();
  }, [searchQuery, statusFilter, typeFilter, dateFromFilter, dateToFilter, amountMinFilter, amountMaxFilter, shouldFilterByEntity, getEntityFilter]);
  
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
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
    }).format(amount);
  };
  
  // Función para obtener la etiqueta del tipo de aplicación
  const getApplicationTypeLabel = (type: string): string => {
    return APPLICATION_TYPE_LABELS[type as keyof typeof APPLICATION_TYPE_LABELS] || type;
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
          <h1 className="text-2xl font-bold mb-4 md:mb-0">Solicitudes de Crédito</h1>
          
          <div className="flex gap-2">
            <Link to="/applications/kanban" className="btn btn-outline">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              Vista Kanban
            </Link>
            
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
              onClick={() => {
                setIsLoading(true);
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
                getApplications(filters, entityFilter)
                  .then(data => {
                    setApplications(data);
                    setIsLoading(false);
                  })
                  .catch(error => {
                    console.error('Error al sincronizar aplicaciones:', error);
                    setError('Error al sincronizar: ' + (error.message || 'Error desconocido'));
                    setIsLoading(false);
                  });
              }}
              title="Sincronizar datos"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Sincronizar
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
          
          {error && (
            <Alert 
              type="error" 
              message={error}
              onClose={() => setError(null)}
              className="mb-6"
            />
          )}
          
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          ) : applications.length === 0 ? (
            <div className="text-center py-12">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-4 text-xl font-medium text-gray-600">No se encontraron solicitudes</h3>
              <p className="mt-2 text-gray-500">Intenta cambiar los filtros de búsqueda</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-zebra w-full">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Empresa</th>
                    <th>Tipo</th>
                    <th>Monto</th>
                    <th>Estado</th>
                    <th>Fecha y Hora</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((application) => (
                    <tr key={application.id} className="hover cursor-pointer" onClick={() => navigate(`/applications/${application.id}`)}>
                      <td>{application.client_name || 'N/A'}</td>
                      <td>{application.company_name || 'N/A'}</td>
                      <td>
                        {application.application_type === 'selected_plans' && application.product_type
                          ? getApplicationTypeLabel(application.product_type)
                          : getApplicationTypeLabel(application.application_type)}
                      </td>
                      <td>{formatCurrency(Number(application.amount || 0))}</td>
                      <td>
                        <span
                          className={`badge badge-${
                            application.status === 'approved'
                              ? 'success'
                              : application.status === 'rejected'
                              ? 'error'
                              : application.status === 'pending'
                              ? 'warning'
                              : application.status === 'in_review'
                              ? 'info'
                              : 'ghost'
                          }`}
                        >
                          {application.status}
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
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Applications; 