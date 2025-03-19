import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PERMISSIONS } from '../utils/constants/permissions';
import { usePermissions } from '../contexts/PermissionsContext';
import MainLayout from '../components/layout/MainLayout';
import { getClients, Client, ClientFilter } from '../services/clientService';

const Clients: React.FC = () => {
  const { userCan } = usePermissions();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ClientFilter>({
    searchQuery: '',
  });

  useEffect(() => {
    fetchClients();
  }, [filters]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const clientsData = await getClients(filters);
      setClients(clientsData);
      setError(null);
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
            <div className="flex flex-col md:flex-row gap-4">
              <div className="form-control w-full">
                <div className="input-group">
                  <input
                    type="text"
                    placeholder="Buscar por nombre, correo, teléfono, RFC o CURP..."
                    className="input input-bordered w-full"
                    value={filters.searchQuery}
                    onChange={handleSearchChange}
                  />
                  <button className="btn btn-square" onClick={fetchClients}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </button>
                </div>
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
              <p className="text-center py-12 text-gray-500">No se encontraron clientes con los filtros aplicados.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table w-full">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Correo</th>
                      <th>Teléfono</th>
                      <th>RFC</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.map(client => (
                      <tr key={client.id} className="hover">
                        <td>{client.name}</td>
                        <td>{client.email}</td>
                        <td>{client.phone}</td>
                        <td>{client.rfc || '-'}</td>
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
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Clients; 