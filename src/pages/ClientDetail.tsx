import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { getClientById, getClientApplications, Client } from '../services/clientService';
import { PERMISSIONS } from '../utils/constants/permissions';
import { usePermissions } from '../contexts/PermissionsContext';

const ClientDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userCan } = usePermissions();
  const [client, setClient] = useState<Client | null>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchClientData(id);
    }
  }, [id]);

  const fetchClientData = async (clientId: string) => {
    try {
      setLoading(true);
      const clientData = await getClientById(clientId);
      setClient(clientData);

      const applicationsData = await getClientApplications(clientId);
      setApplications(applicationsData);
      
      setError(null);
    } catch (err) {
      console.error('Error fetching client data:', err);
      setError('No se pudieron cargar los datos del cliente. Por favor intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/clients')} 
              className="btn btn-sm btn-outline"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              Volver a Clientes
            </button>
            <h1 className="text-2xl font-bold">Detalle de Cliente</h1>
          </div>
          
          {client && userCan(PERMISSIONS.EDIT_CLIENT) && (
            <Link to={`/clients/${id}/edit`} className="btn btn-primary">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
              Editar Cliente
            </Link>
          )}
        </div>

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
        ) : client ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Información General */}
            <div className="card bg-base-100 shadow-xl md:col-span-2">
              <div className="card-body">
                <h2 className="card-title text-xl mb-4">Información General</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Nombre</p>
                    <p className="font-medium">{client.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Correo Electrónico</p>
                    <p className="font-medium">{client.email || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Teléfono</p>
                    <p className="font-medium">{client.phone || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Fecha de Registro</p>
                    <p className="font-medium">
                      {new Date(client.created_at).toLocaleDateString('es-MX', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">RFC</p>
                    <p className="font-medium">{client.rfc || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">CURP</p>
                    <p className="font-medium">{client.curp || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Fecha de Nacimiento</p>
                    <p className="font-medium">
                      {client.birth_date 
                        ? new Date(client.birth_date).toLocaleDateString('es-MX', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })
                        : '-'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Dirección */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title text-xl mb-4">Dirección</h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Dirección</p>
                    <p className="font-medium">{client.address || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Ciudad</p>
                    <p className="font-medium">{client.city || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Estado</p>
                    <p className="font-medium">{client.state || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Código Postal</p>
                    <p className="font-medium">{client.postal_code || '-'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Solicitudes del Cliente */}
            <div className="card bg-base-100 shadow-xl md:col-span-3">
              <div className="card-body">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="card-title text-xl">Solicitudes</h2>
                  {userCan(PERMISSIONS.CREATE_APPLICATION) && (
                    <Link to={`/applications/new?client=${id}`} className="btn btn-sm btn-primary">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                      Nueva Solicitud
                    </Link>
                  )}
                </div>
                
                {!applications || applications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-gray-500 mb-4">Este cliente no tiene solicitudes registradas.</p>
                    {userCan(PERMISSIONS.CREATE_APPLICATION) && (
                      <Link to={`/applications/new?client=${id}`} className="btn btn-primary">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                        Crear Solicitud
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="table w-full">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Fecha</th>
                          <th>Tipo</th>
                          <th>Monto</th>
                          <th>Estado</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {applications.map(app => (
                          <tr key={app.id} className="hover">
                            <td>{app.id.substring(0, 8)}...</td>
                            <td>
                              {new Date(app.created_at).toLocaleDateString('es-MX', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              })}
                            </td>
                            <td>{app.application_type}</td>
                            <td>${app.amount.toLocaleString('es-MX')}</td>
                            <td>
                              <span className={`badge ${
                                app.status === 'approved' ? 'badge-success' :
                                app.status === 'rejected' ? 'badge-error' :
                                app.status === 'in_review' ? 'badge-warning' :
                                'badge-info'
                              }`}>
                                {app.status}
                              </span>
                            </td>
                            <td>
                              <Link to={`/applications/${app.id}`} className="btn btn-xs btn-info">
                                Ver
                              </Link>
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
        ) : (
          <div className="alert alert-warning">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Cliente no encontrado.</span>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default ClientDetail; 