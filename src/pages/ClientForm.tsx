import React, { useState, useEffect, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { getClientById, createClient, updateClient, Client } from '../services/clientService';

interface ClientFormData {
  name: string;
  email: string;
  phone: string;
  rfc: string;
  curp: string;
  birth_date: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  company_id?: string;
  advisor_id?: string;
}

const initialFormData: ClientFormData = {
  name: '',
  email: '',
  phone: '',
  rfc: '',
  curp: '',
  birth_date: '',
  address: '',
  city: '',
  state: '',
  postal_code: '',
};

const ClientForm: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isEditMode = !!id;
  
  const [formData, setFormData] = useState<ClientFormData>(initialFormData);
  const [loading, setLoading] = useState<boolean>(false);
  const [fetchingData, setFetchingData] = useState<boolean>(isEditMode);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEditMode && id) {
      fetchClientData(id);
    }
  }, [isEditMode, id]);

  const fetchClientData = async (clientId: string) => {
    try {
      setFetchingData(true);
      const clientData = await getClientById(clientId);
      
      // Check if clientData exists before using it
      if (!clientData) {
        setError('No se encontraron los datos del cliente o la tabla de clientes no existe.');
        return;
      }
      
      // Convertir las fechas a formato YYYY-MM-DD para el input date
      setFormData({
        name: clientData.name,
        email: clientData.email,
        phone: clientData.phone,
        rfc: clientData.rfc || '',
        curp: clientData.curp || '',
        birth_date: clientData.birth_date ? new Date(clientData.birth_date).toISOString().split('T')[0] : '',
        address: clientData.address || '',
        city: clientData.city || '',
        state: clientData.state || '',
        postal_code: clientData.postal_code || '',
        company_id: clientData.company_id,
        advisor_id: clientData.advisor_id
      });
      
      setError(null);
    } catch (err) {
      console.error('Error fetching client data:', err);
      setError('No se pudieron cargar los datos del cliente. Por favor intente nuevamente.');
    } finally {
      setFetchingData(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      // Validaciones básicas
      if (!formData.name.trim()) {
        setError('El nombre es obligatorio');
        return;
      }
      
      if (!formData.email.trim()) {
        setError('El correo electrónico es obligatorio');
        return;
      }
      
      if (!formData.phone.trim()) {
        setError('El teléfono es obligatorio');
        return;
      }
      
      // Crear o actualizar cliente
      if (isEditMode && id) {
        await updateClient(id, formData);
        navigate(`/clients/${id}`);
      } else {
        const newClient = await createClient(formData);
        navigate(`/clients/${newClient.id}`);
      }
    } catch (err) {
      console.error('Error saving client:', err);
      setError('Ocurrió un error al guardar los datos. Por favor intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <button 
            onClick={() => navigate(-1)} 
            className="btn btn-ghost btn-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Volver
          </button>
          <h1 className="text-2xl font-bold">
            {isEditMode ? 'Editar Cliente' : 'Nuevo Cliente'}
          </h1>
        </div>

        {fetchingData ? (
          <div className="flex justify-center items-center py-12">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              {error && (
                <div className="alert alert-error mb-6">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Información Personal */}
                  <div className="space-y-4 md:col-span-2">
                    <h2 className="text-xl font-bold">Información Personal</h2>
                    
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text">Nombre Completo*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Nombre completo"
                        className="input input-bordered w-full"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="form-control w-full">
                        <label className="label">
                          <span className="label-text">Correo Electrónico*</span>
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="correo@ejemplo.com"
                          className="input input-bordered w-full"
                          required
                        />
                      </div>

                      <div className="form-control w-full">
                        <label className="label">
                          <span className="label-text">Teléfono*</span>
                        </label>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          placeholder="(123) 456-7890"
                          className="input input-bordered w-full"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="form-control w-full">
                        <label className="label">
                          <span className="label-text">RFC</span>
                        </label>
                        <input
                          type="text"
                          name="rfc"
                          value={formData.rfc}
                          onChange={handleChange}
                          placeholder="RFC"
                          className="input input-bordered w-full"
                        />
                      </div>

                      <div className="form-control w-full">
                        <label className="label">
                          <span className="label-text">CURP</span>
                        </label>
                        <input
                          type="text"
                          name="curp"
                          value={formData.curp}
                          onChange={handleChange}
                          placeholder="CURP"
                          className="input input-bordered w-full"
                        />
                      </div>

                      <div className="form-control w-full">
                        <label className="label">
                          <span className="label-text">Fecha de Nacimiento</span>
                        </label>
                        <input
                          type="date"
                          name="birth_date"
                          value={formData.birth_date}
                          onChange={handleChange}
                          className="input input-bordered w-full"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Dirección */}
                  <div className="space-y-4 md:col-span-2">
                    <h2 className="text-xl font-bold">Dirección</h2>
                    
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text">Dirección</span>
                      </label>
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        placeholder="Calle, número, colonia"
                        className="input input-bordered w-full"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="form-control w-full">
                        <label className="label">
                          <span className="label-text">Ciudad</span>
                        </label>
                        <input
                          type="text"
                          name="city"
                          value={formData.city}
                          onChange={handleChange}
                          placeholder="Ciudad"
                          className="input input-bordered w-full"
                        />
                      </div>

                      <div className="form-control w-full">
                        <label className="label">
                          <span className="label-text">Estado</span>
                        </label>
                        <input
                          type="text"
                          name="state"
                          value={formData.state}
                          onChange={handleChange}
                          placeholder="Estado"
                          className="input input-bordered w-full"
                        />
                      </div>

                      <div className="form-control w-full">
                        <label className="label">
                          <span className="label-text">Código Postal</span>
                        </label>
                        <input
                          type="text"
                          name="postal_code"
                          value={formData.postal_code}
                          onChange={handleChange}
                          placeholder="Código Postal"
                          className="input input-bordered w-full"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-4 mt-8">
                  <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="btn btn-ghost"
                    disabled={loading}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="loading loading-spinner loading-sm"></span>
                        {isEditMode ? 'Guardando...' : 'Creando...'}
                      </>
                    ) : (
                      <>{isEditMode ? 'Guardar Cambios' : 'Crear Cliente'}</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default ClientForm; 