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
import '../styles/kanban.css';

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
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
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
              <th className="text-center">Detalle</th>
            </tr>
          </thead>
          <tbody>
            {getSortedApplications().map((application) => (
              <tr key={application.id} className="hover cursor-pointer" onClick={() => navigate(`/applications/${application.id}`)}>
                <td>{application.client_name || 'N/A'}</td>
                <td>{application.company_name || 'N/A'}</td>
                <td>
                  <span className={`badge ${application.financing_type === 'producto' ? 'badge-primary' : application.financing_type === 'personal' ? 'badge-secondary' : 'badge-primary'} badge-outline`}>
                  {application.financing_type === 'producto' ? (
                    'Financiamiento de Producto'
                  ) : application.financing_type === 'personal' ? (
                    'Crédito Personal'
                  ) : application.application_type === 'selected_plans' && application.product_type
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
                <td className="text-center">
                  <button 
                    className="btn btn-primary btn-sm"
                    onClick={(e) => {
                      e.stopPropagation(); // Evitar que el onClick del tr se active también
                      navigate(`/applications/${application.id}`);
                    }}
                    title={`Ver detalles de la solicitud ${application.id}`}
                  >
                    {application.id.substring(0, 5)}...
                  </button>
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
      <div className="p-6 applications-page-flex-container">

        {/* --- Cabecera y Filtros --- */}
        <div className="flex-shrink-0">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold">Solicitudes de Crédito</h1>
              <p className="text-gray-500">Gestiona todas las solicitudes en un solo lugar.</p>
            </div>
            {userCan(PERMISSIONS.CREATE_APPLICATION) && (
              <button className="btn btn-primary mt-4 md:mt-0" onClick={() => navigate('/applications/new')}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Nueva Solicitud
              </button>
            )}
          </div>
        </div>

        {/* --- Área de Contenido Principal (el "recuadro azul") --- */}
        <div className="mt-6 bg-base-100 shadow-xl rounded-box kanban-content-area-wrapper">
          
          {/* Controles: Búsqueda y cambio de vista */}
          <div className="p-6 pb-2 flex-shrink-0">
            <div className="flex justify-between items-center mb-6">
              <div className="form-control w-full max-w-sm">
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
              <div className="flex items-center gap-2">
                <button className="btn btn-ghost" onClick={fetchApplications}>
                  Actualizar
                </button>
                <button className="btn btn-ghost" onClick={handleFilterToggle}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                  Mostrar Filtros
                </button>
                <div className="tabs tabs-boxed">
                  <a className={`tab ${viewMode === 'kanban' ? 'tab-active' : ''}`} onClick={() => setViewMode('kanban')}>Kanban</a>
                  <a className={`tab ${viewMode === 'list' ? 'tab-active' : ''}`} onClick={() => setViewMode('list')}>Lista</a>
                </div>
              </div>
            </div>
            {isFilterExpanded && (
              <div className="bg-base-200 p-4 rounded-lg mb-6">
                 {/* ... Contenido de los filtros ... */}
              </div>
            )}
            {error && <Alert type="error" message={error} onClose={() => setError(null)} className="mb-6" />}
          </div>

          {/* El contenedor que se estira para el Kanban/Lista */}
          <div className="px-6 pb-6 flex-grow">
            {viewMode === 'kanban' ? (
              <div className="kanban-board-wrapper">
                {renderKanbanBoard()}
              </div>
            ) : (
              renderListView()
            )}
          </div>
        </div>

      </div>
    </MainLayout>
  );
};

export default Applications; 