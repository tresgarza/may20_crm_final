import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { PERMISSIONS } from '../utils/constants/permissions';
import { usePermissions } from '../contexts/PermissionsContext';
import { useAuth } from '../contexts/AuthContext';
import MainLayout from '../components/layout/MainLayout';
import { getClients, Client, ClientFilter } from '../services/clientService';
import { getCompanies, getCompaniesForAdvisor, Company } from '../services/companyService';

const Clients: React.FC = () => {
  const { userCan, isCompanyAdmin, isAdvisor } = usePermissions();
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [sortField, setSortField] = useState<string>("created_at");
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState<ClientFilter>({
    searchQuery: '',
    page: 0,
    pageSize: 10
  });

  // Add strict advisor_id filter if user is an advisor
  useEffect(() => {
    console.log('🔄 useEffect [user] triggered with user:', user?.role, user?.entityId);
    if (user && user.role === 'ADVISOR') {
      console.log('Setting strict advisor filter: advisor_id =', user.id);
      setFilters(prev => ({
        ...prev,
        advisor_id: user.id,
        // Explicitly remove company_id to prevent company-wide access
        company_id: undefined
      }));
    } else if (user && user.role === 'COMPANY_ADMIN') {
      console.log('🔒 SECURITY: Setting company admin filter:', { company_id: user.entityId });
      setFilters(prev => ({ 
        ...prev, 
        company_id: user.entityId,
        // Ensure no advisor_id filter for company admins
        advisor_id: undefined
      }));
    }
  }, [user]);

  // Load companies based on user role
  useEffect(() => {
    console.log('🔄 useEffect [loadCompanies] triggered with user:', user?.role);
    const loadCompanies = async () => {
      try {
        let companiesData: Company[] = [];
        
        if (user && user.role === 'ADVISOR') {
          // For advisors, only load companies related to this advisor
          console.log('Loading companies for advisor ID:', user.id);
          companiesData = await getCompaniesForAdvisor(user.id);
          console.log('Companies for advisor:', companiesData);
        } else if (user && (user.role === 'SUPERADMIN' || user.role === 'COMPANY_ADMIN')) {
          // For admins, load all companies
          companiesData = await getCompanies();
        }
        
        setCompanies(companiesData);
      } catch (error) {
        console.error('Error loading companies:', error);
      }
    };
    
    if (user) {
      loadCompanies();
    }
  }, [user]);

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true);
      
      // CRITICAL SECURITY CHECK: Prevent company admins from querying without company filter
      if (isCompanyAdmin() && user && user.entityId && !filters.company_id) {
        console.error('🚨 FRONTEND SECURITY VIOLATION: Company admin attempting to fetch clients without company filter');
        console.error('🚨 User entityId:', user.entityId);
        console.error('🚨 Current filters:', filters);
        setError('Error de seguridad: No se puede acceder a datos sin filtro de empresa');
        return;
      }
      
      // Ensure advisor_id filter is always applied for advisors
      let currentFilters = {...filters};
      if (isAdvisor() && user && !currentFilters.advisor_id) {
        console.log('Adding missing advisor_id filter for advisor role');
        currentFilters.advisor_id = user.id;
      }
      
      // CRITICAL: Ensure company_id filter is ALWAYS applied for company admins
      if (isCompanyAdmin() && user && user.entityId && !currentFilters.company_id) {
        console.log('🔒 SECURITY: Adding missing company_id filter for company admin role');
        currentFilters.company_id = user.entityId;
      }
      
      // DOUBLE CHECK: If user is company admin, FORCE the company_id filter even if it exists
      if (isCompanyAdmin() && user && user.entityId) {
        console.log('🔒 SECURITY: Enforcing company_id filter for company admin:', user.entityId);
        currentFilters.company_id = user.entityId;
      }
      
      // SECURITY VALIDATION: Log the final filters being sent
      console.log('🔍 FINAL FILTERS BEING SENT TO API:', JSON.stringify(currentFilters, null, 2));
      console.log('🔍 USER ROLE:', user?.role);
      console.log('🔍 USER ENTITY ID:', user?.entityId);
      
      // Debug log to verify filters sent to API
      console.log('Fetching clients with filters:', currentFilters);
      
      const result = await getClients(currentFilters);
      // Handle potential undefined values with default empty array and zero
      setClients(result.clients || []);
      setTotalCount(result.totalCount || 0);
      
      // SECURITY LOG: Log how many clients were returned
      console.log(`🔍 SECURITY CHECK: Returned ${result.clients?.length || 0} clients for company admin with entityId: ${user?.entityId}`);
      
      // If we got an empty list, check if it's because the table doesn't exist
      // Use optional chaining to avoid potential undefined errors
      if ((result.clients?.length === 0 || !result.clients) && (result.totalCount === 0 || !result.totalCount)) {
        setError('No se pudieron cargar los clientes. La tabla de clientes no existe en la base de datos.');
      } else {
        setError(null);
      }
    } catch (err) {
      console.error('Error fetching clients:', err);
      setError('No se pudieron cargar los clientes. Por favor intente nuevamente.');
    } finally {
      setLoading(false);
    }
  }, [filters, isCompanyAdmin, user, isAdvisor]);

  useEffect(() => {
    console.log('🔄 useEffect [fetchClients] triggered with filters:', filters);
    
    // CRITICAL: Prevent race condition - don't fetch if company admin doesn't have company_id filter yet
    if (isCompanyAdmin() && user && user.entityId && !filters.company_id) {
      console.log('⏳ WAITING: Company admin filter not yet established, skipping fetch');
      return;
    }
    
    fetchClients();
  }, [filters.page, filters.pageSize, filters.advisor_id, filters.company_id, filters.searchQuery, filters.dateFrom, filters.dateTo, fetchClients, isCompanyAdmin, user]);

  // Separate effect for search to avoid too many requests
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      // CRITICAL: Prevent race condition for search as well
      if (isCompanyAdmin() && user && user.entityId && !filters.company_id) {
        console.log('⏳ WAITING: Company admin filter not yet established, skipping search fetch');
        return;
      }
      
      if (filters.page !== 0) {
        // Reset to first page when search changes
        setFilters(prev => ({ ...prev, page: 0 }));
      } else {
        fetchClients();
      }
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [filters.searchQuery, filters.dateFrom, filters.dateTo, filters.page, fetchClients, isCompanyAdmin, user, setFilters]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, searchQuery: e.target.value }));
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  // Handle sorting
  const handleSort = (field: string) => {
    if (field === sortField) {
      // If clicking on the same field, toggle direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // If clicking on a new field, set it as sort field with default direction
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Apply sorting to clients list
  const getSortedClients = () => {
    if (!sortField) return clients;
    
    return [...clients].sort((a, b) => {
      let aValue: any = a[sortField as keyof Client];
      let bValue: any = b[sortField as keyof Client];
      
      // Handle null or undefined values
      if (aValue === null || aValue === undefined) aValue = '';
      if (bValue === null || bValue === undefined) bValue = '';
      
      // Format for comparison
      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();
      
      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });
  };

  const handleNextPage = () => {
    // If we have clients and the number of clients equals the page size, 
    // there's likely more content to show on the next page
    if (clients.length > 0 && clients.length === filters.pageSize) {
      setFilters(prev => ({ ...prev, page: prev.page! + 1 }));
    }
  };

  const handlePrevPage = () => {
    if (filters.page! > 0) {
      setFilters(prev => ({ ...prev, page: prev.page! - 1 }));
    }
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPageSize = parseInt(e.target.value);
    // When changing page size, we want to reset to page 0 and fetch new data
    setFilters(prev => {
      console.log(`Changing page size from ${prev.pageSize} to ${newPageSize}, resetting page to 0`);
      return { ...prev, pageSize: newPageSize, page: 0 };
    });
  };

  // Calculate pagination info
  const startIndex = filters.page! * filters.pageSize! + 1;
  // If we're showing a full page of clients, we display the exact range
  // If totalCount is accurate, use it; otherwise show based on current page data
  const endIndex = Math.min(startIndex + clients.length - 1, totalCount || (startIndex + clients.length - 1));
  // Calculate total pages - if we can't rely on totalCount, show at least current page + 1 if we have a full page
  const totalPages = totalCount 
    ? Math.ceil(totalCount / filters.pageSize!) 
    : (clients.length === filters.pageSize! ? filters.page! + 2 : filters.page! + 1);

  // Show company selector dropdown only if there are companies available to select
  const showCompanySelector = companies.length > 0 && (isAdvisor() || user?.role === 'SUPERADMIN' || isCompanyAdmin());

  return (
    <MainLayout>
      <div className="p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <h1 className="text-2xl font-bold mb-4 md:mb-0">
            {isCompanyAdmin() ? 'Empleados' : 'Clientes'}
            {isAdvisor() && (
              <span className="text-sm font-normal ml-2 text-gray-500">
                (Solo tus clientes asignados)
              </span>
            )}
          </h1>
          
          {userCan(PERMISSIONS.CREATE_CLIENT) && (
            <Link to="/clients/new" className="btn btn-primary">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              {isCompanyAdmin() ? 'Nuevo Empleado' : 'Nuevo Cliente'}
            </Link>
          )}
        </div>

        <div className="card bg-base-100 shadow-xl mb-6">
          <div className="card-body">
            <h2 className="card-title text-lg mb-4">Filtros</h2>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Buscar</span>
                </label>
                <div className="input-group">
                  <input
                    type="text"
                    placeholder="Buscar por nombre, correo, teléfono, RFC o CURP..."
                    className="input input-bordered w-full"
                    value={filters.searchQuery}
                    onChange={handleSearchChange}
                  />
                  <button className="btn btn-square" onClick={() => {
                    // Force a re-fetch by updating the filters timestamp
                    // This ensures the useEffect is triggered with current filters
                    setFilters(prev => ({ ...prev }));
                  }}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </button>
                </div>
              </div>
              
              {/* Show company selector only if there are companies available to select */}
              {showCompanySelector && companies.length > 0 && (
                <div className="form-control w-full md:w-1/2">
                  <label className="label">
                    <span className="label-text">Empresa</span>
                  </label>
                  {isCompanyAdmin() ? (
                    // Company admins should only see their own company - no selection allowed
                    <div className="input input-bordered w-full bg-base-200 flex items-center">
                      <span className="text-gray-700">
                        {companies.find(c => c.id === user?.entityId)?.name || 'Mi Empresa'}
                      </span>
                      <span className="badge badge-primary ml-2 text-xs">Solo mi empresa</span>
                    </div>
                  ) : (
                    // Advisors and super admins can select companies
                    <select
                      className="select select-bordered w-full"
                      value={filters.company_id || ''}
                      onChange={(e) => {
                        const value = e.target.value || undefined;
                        setFilters(prev => ({ 
                          ...prev, 
                          company_id: value,
                          // For advisors, always keep advisor_id filter even when company changes
                          ...(isAdvisor() && { advisor_id: user?.id }),
                          page: 0 
                        }));
                      }}
                    >
                      <option value="">Todas mis empresas</option>
                      {companies.map(company => (
                        <option key={company.id} value={company.id}>
                          {company.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col md:flex-row gap-4 mt-4">
              <div className="form-control w-full md:w-1/2">
                <label className="label">
                  <span className="label-text">Fecha Desde</span>
                </label>
                <input
                  type="date"
                  name="dateFrom"
                  className="input input-bordered w-full"
                  value={filters.dateFrom || ''}
                  onChange={handleDateChange}
                />
              </div>
              <div className="form-control w-full md:w-1/2">
                <label className="label">
                  <span className="label-text">Fecha Hasta</span>
                </label>
                <input
                  type="date"
                  name="dateTo"
                  className="input input-bordered w-full"
                  value={filters.dateTo || ''}
                  onChange={handleDateChange}
                />
              </div>
            </div>
          </div>
        </div>
        
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <span className="loading loading-spinner loading-lg"></span>
              </div>
            ) : error ? (
              <div className="alert alert-error">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            ) : clients.length === 0 ? (
              <div>
                <p className="text-center py-8 text-gray-500">No se encontraron clientes con los filtros aplicados.</p>
                
                {/* Show special message for empty pages beyond the first page */}
                {filters.page! > 0 && (
                  <div className="alert alert-warning mt-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                      <h3 className="font-bold">No hay resultados en esta página</h3>
                      <div className="text-sm">
                        No se encontraron clientes en la página {filters.page! + 1}.
                        <button 
                          className="btn btn-sm btn-outline ml-4"
                          onClick={() => setFilters(prev => ({ ...prev, page: 0 }))}
                        >
                          Volver a la primera página
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Only show this if there's no search query or date filters */}
                {!filters.searchQuery && !filters.dateFrom && !filters.dateTo && (
                  <div className="alert alert-info mt-4">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current flex-shrink-0 w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <div>
                      <h3 className="font-bold">
                        {isCompanyAdmin() ? 'No hay empleados registrados' : 'No hay clientes registrados'}
                      </h3>
                      <div className="text-sm">
                        {userCan(PERMISSIONS.CREATE_CLIENT) ? (
                          <span>
                            {isCompanyAdmin() 
                              ? 'Puede crear un nuevo empleado utilizando el botón "Nuevo Empleado" en la parte superior.' 
                              : 'Puede crear un nuevo cliente utilizando el botón "Nuevo Cliente" en la parte superior.'}
                          </span>
                        ) : (
                          <span>
                            {isCompanyAdmin() 
                              ? 'Contacte al administrador para registrar empleados en el sistema.' 
                              : 'Contacte al administrador para registrar clientes en el sistema.'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="table w-full">
                    <thead>
                      <tr>
                        <th onClick={() => handleSort('name')} className="cursor-pointer">
                          <div className="flex items-center">
                            Nombre
                            {sortField === 'name' && (
                              <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </div>
                        </th>
                        <th onClick={() => handleSort('email')} className="cursor-pointer">
                          <div className="flex items-center">
                            Correo
                            {sortField === 'email' && (
                              <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </div>
                        </th>
                        <th onClick={() => handleSort('phone')} className="cursor-pointer">
                          <div className="flex items-center">
                            Teléfono
                            {sortField === 'phone' && (
                              <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </div>
                        </th>
                        {/* Show company column if not company admin */}
                        {!isCompanyAdmin() && (
                          <th onClick={() => handleSort('company_name')} className="cursor-pointer">
                            <div className="flex items-center">
                              Empresa
                              {sortField === 'company_name' && (
                                <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                              )}
                            </div>
                          </th>
                        )}
                        <th onClick={() => handleSort('rfc')} className="cursor-pointer">
                          <div className="flex items-center">
                            RFC
                            {sortField === 'rfc' && (
                              <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </div>
                        </th>
                        <th onClick={() => handleSort('created_at')} className="cursor-pointer">
                          <div className="flex items-center">
                            Fecha Registro
                            {sortField === 'created_at' && (
                              <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </div>
                        </th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getSortedClients().map(client => (
                        <tr key={client.id} className="hover">
                          <td>
                            {/* Construct full name from name components */}
                            {client.name || 
                              [client.first_name, client.paternal_surname, client.maternal_surname]
                                .filter(Boolean)
                                .join(' ')
                            }
                          </td>
                          <td>{client.email}</td>
                          <td>{client.phone}</td>
                          {/* Show company column if not company admin */}
                          {!isCompanyAdmin() && (
                            <td>{client.company_name || 'N/A'}</td>
                          )}
                          <td>{client.rfc || '-'}</td>
                          <td>{new Date(client.created_at).toLocaleDateString()}</td>
                          <td className="flex gap-2">
                            <Link to={`/clients/${client.id}`} className="btn btn-sm btn-info">
                              Ver
                            </Link>
                            {userCan(PERMISSIONS.EDIT_CLIENT) && (
                              <Link to={`/clients/${client.id}/edit`} className="btn btn-sm btn-secondary">
                                Editar
                              </Link>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination */}
                <div className="flex flex-col md:flex-row justify-between items-center mt-6">
                  <div className="mb-4 md:mb-0">
                    <span className="text-sm text-gray-500">
                      Mostrando {startIndex} a {endIndex} de {totalCount} clientes
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="form-control">
                      <select 
                        className="select select-bordered select-sm"
                        value={filters.pageSize}
                        onChange={handlePageSizeChange}
                      >
                        <option value={10}>10 por página</option>
                        <option value={25}>25 por página</option>
                        <option value={50}>50 por página</option>
                        <option value={100}>100 por página</option>
                      </select>
                    </div>
                    
                    <div className="join">
                      <button 
                        className="join-item btn btn-sm" 
                        onClick={handlePrevPage}
                        disabled={filters.page === 0}
                      >
                        «
                      </button>
                      <button className="join-item btn btn-sm">
                        Página {filters.page! + 1} de {totalPages}
                      </button>
                      <button 
                        className="join-item btn btn-sm" 
                        onClick={handleNextPage}
                        disabled={clients.length === 0 || clients.length < filters.pageSize!}
                      >
                        »
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Clients; 