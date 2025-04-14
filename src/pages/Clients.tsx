import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PERMISSIONS } from '../utils/constants/permissions';
import { usePermissions } from '../contexts/PermissionsContext';
import { useAuth } from '../contexts/AuthContext';
import MainLayout from '../components/layout/MainLayout';
import { getClients, Client, ClientFilter } from '../services/clientService';

const Clients: React.FC = () => {
  const { userCan } = usePermissions();
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [filters, setFilters] = useState<ClientFilter>({
    searchQuery: '',
    page: 0,
    pageSize: 10
  });

  // Add advisor_id filter if user is an advisor
  useEffect(() => {
    if (user && user.role === 'ADVISOR') {
      setFilters(prev => ({ ...prev, advisor_id: user.id }));
    } else if (user && user.role === 'COMPANY_ADMIN') {
      setFilters(prev => ({ ...prev, company_id: user.entityId }));
    }
  }, [user]);

  useEffect(() => {
    fetchClients();
  }, [filters.page, filters.pageSize, filters.advisor_id, filters.company_id]);

  // Separate effect for search to avoid too many requests
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (filters.page !== 0) {
        // Reset to first page when search changes
        setFilters(prev => ({ ...prev, page: 0 }));
      } else {
        fetchClients();
      }
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [filters.searchQuery, filters.dateFrom, filters.dateTo]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const result = await getClients(filters);
      // Handle potential undefined values with default empty array and zero
      setClients(result.clients || []);
      setTotalCount(result.totalCount || 0);
      
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
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, searchQuery: e.target.value }));
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleNextPage = () => {
    if ((filters.page! + 1) * filters.pageSize! < totalCount) {
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
    setFilters(prev => ({ ...prev, pageSize: newPageSize, page: 0 }));
  };

  // Calculate pagination info
  const startIndex = filters.page! * filters.pageSize! + 1;
  const endIndex = Math.min(startIndex + clients.length - 1, totalCount);
  const totalPages = Math.ceil(totalCount / filters.pageSize!);

  return (
    <MainLayout>
      <div className="p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <h1 className="text-2xl font-bold mb-4 md:mb-0">Clientes</h1>
          
          {userCan(PERMISSIONS.CREATE_CLIENT) && (
            <Link to="/clients/new" className="btn btn-primary">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Nuevo Cliente
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
                  <button className="btn btn-square" onClick={() => fetchClients()}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </button>
                </div>
              </div>
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
                
                {/* Only show this if there's no search query or date filters */}
                {!filters.searchQuery && !filters.dateFrom && !filters.dateTo && (
                  <div className="alert alert-info mt-4">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current flex-shrink-0 w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <div>
                      <h3 className="font-bold">No hay clientes registrados</h3>
                      <div className="text-sm">
                        {userCan(PERMISSIONS.CREATE_CLIENT) ? (
                          <span>Puede crear un nuevo cliente utilizando el botón "Nuevo Cliente" en la parte superior.</span>
                        ) : (
                          <span>Contacte al administrador para registrar clientes en el sistema.</span>
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
                        <th>Nombre</th>
                        <th>Correo</th>
                        <th>Teléfono</th>
                        <th>RFC</th>
                        <th>Fecha Registro</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clients.map(client => (
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
                        disabled={(filters.page! + 1) * filters.pageSize! >= totalCount}
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