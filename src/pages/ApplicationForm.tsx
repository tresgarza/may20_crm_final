import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { usePermissions } from '../contexts/PermissionsContext';
import { PERMISSIONS } from '../utils/constants/permissions';
import { useAuth } from '../contexts/AuthContext';
import Alert from '../components/ui/Alert';
import { 
  getApplicationById, 
  createApplication, 
  updateApplication, 
  Application as ApplicationType,
  ApplicationStatus
} from '../services/applicationService';
import { APPLICATION_TYPE, APPLICATION_TYPE_LABELS } from '../utils/constants/applications';
import { APPLICATION_STATUS, STATUS_LABELS } from '../utils/constants/statuses';
import { useNotifications, NotificationType } from '../contexts/NotificationContext';

interface FormData {
  client_name: string;
  client_email: string;
  client_phone: string;
  client_address: string;
  dni: string;
  amount: number;
  term: number;
  interest_rate: number;
  monthly_payment: number;
  application_type: string;
  status: ApplicationStatus;
  company_id: string;
  company_name: string;
  assigned_to: string;
}

const initialFormData: FormData = {
  client_name: '',
  client_email: '',
  client_phone: '',
  client_address: '',
  dni: '',
  amount: 0,
  term: 12,
  interest_rate: 0,
  monthly_payment: 0,
  application_type: 'personal_loan',
  status: APPLICATION_STATUS.PENDING,
  company_id: '',
  company_name: '',
  assigned_to: '',
};

const ApplicationForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userCan } = usePermissions();
  const { user } = useAuth();
  const { shouldFilterByEntity, getEntityFilter } = usePermissions();
  const { addNotification, showPopup } = useNotifications();
  
  const isEditMode = !!id;
  
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  useEffect(() => {
    if (isEditMode && id) {
      const fetchApplication = async () => {
        try {
          setLoading(true);
          setError(null);
          
          // Aplicar filtros según el rol del usuario
          const entityFilter = shouldFilterByEntity() ? getEntityFilter() : null;
          
          const application = await getApplicationById(id, entityFilter);
          
          // Cargar los datos del formulario con valores por defecto para campos opcionales
          setFormData({
            client_name: application.client_name || '',
            client_email: application.client_email || '',
            client_phone: application.client_phone || '',
            client_address: application.client_address || '',
            dni: application.dni || '',
            amount: application.amount || 0,
            term: application.term || 12,
            interest_rate: application.interest_rate || 0,
            monthly_payment: application.monthly_payment || 0,
            application_type: application.application_type || 'personal_loan',
            status: application.status,
            company_id: application.company_id || '',
            company_name: application.company_name || '',
            assigned_to: application.assigned_to || '',
          });
        } catch (error: any) {
          console.error('Error fetching application:', error);
          setError(`Error al cargar la solicitud: ${error.message || 'Error desconocido'}`);
        } finally {
          setLoading(false);
        }
      };
      
      fetchApplication();
    } else if (!isEditMode && user) {
      // Si no estamos en modo edición y tenemos datos del usuario, pre-rellenar algunos campos
      const entityFilter = shouldFilterByEntity() ? getEntityFilter() : null;
      
      if (entityFilter) {
        if (entityFilter.advisor_id) {
          setFormData(prev => ({
            ...prev,
            assigned_to: entityFilter.advisor_id
          }));
        }
        
        if (entityFilter.company_id) {
          setFormData(prev => ({
            ...prev,
            company_id: entityFilter.company_id
          }));
        }
      }
    }
  }, [id, isEditMode, user, shouldFilterByEntity, getEntityFilter]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    // Convertir valores numéricos según corresponda
    if (type === 'number') {
      setFormData(prev => ({
        ...prev,
        [name]: parseFloat(value) || 0
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setError(null);
      
      if (!formData.client_name) {
        setError('El nombre del cliente es obligatorio');
        setSaving(false);
        return;
      }
      
      // Aplicar filtros según el rol del usuario
      const entityFilter = shouldFilterByEntity() ? getEntityFilter() : null;
      
      if (isEditMode && id) {
        // Convertir FormData a Partial<ApplicationType> para actualización
        const applicationUpdate: Partial<ApplicationType> = {
          client_name: formData.client_name,
          client_email: formData.client_email,
          client_phone: formData.client_phone,
          client_address: formData.client_address,
          dni: formData.dni,
          amount: formData.amount,
          term: formData.term,
          interest_rate: formData.interest_rate,
          monthly_payment: formData.monthly_payment,
          application_type: formData.application_type,
          status: formData.status,
          company_id: formData.company_id,
          company_name: formData.company_name,
          assigned_to: formData.assigned_to
        };
        
        // Actualizar aplicación existente
        await updateApplication(id, applicationUpdate, entityFilter);
        setSuccessMessage('Solicitud actualizada con éxito');
      } else {
        // Convertir FormData a los campos necesarios para crear una nueva aplicación
        const newApplicationData: Omit<ApplicationType, 'id' | 'created_at' | 'updated_at'> = {
          client_name: formData.client_name,
          client_email: formData.client_email,
          client_phone: formData.client_phone,
          client_address: formData.client_address,
          dni: formData.dni,
          amount: formData.amount,
          term: formData.term,
          interest_rate: formData.interest_rate,
          monthly_payment: formData.monthly_payment,
          application_type: formData.application_type,
          status: formData.status,
          company_id: formData.company_id,
          company_name: formData.company_name,
          assigned_to: formData.assigned_to,
          client_id: '', // Generado por el servidor
          requested_amount: formData.amount,
          approved_by_advisor: false,
          approved_by_company: false
        };
        
        // Crear nueva aplicación
        const newApplication = await createApplication(newApplicationData);
        setSuccessMessage('Solicitud creada con éxito');
        
        // Create a notification and show popup - make sure we have a valid UUID
        if (newApplication && newApplication.id) {
          const notificationData = {
            title: 'Nueva solicitud creada',
            message: `Se ha creado una nueva solicitud para ${formData.client_name}`,
            type: NotificationType.NEW_APPLICATION,
            relatedItemType: 'application',
            relatedItemId: newApplication.id // This will be a valid UUID from the database
          };
          
          // Add to notifications list
          addNotification(notificationData);
          
          // Show immediate popup with sound
          showPopup({
            ...notificationData,
            playSound: true,
            soundType: 'notification',
            duration: 5000
          });
        }
        
        // Redirigir a la página de detalle después de un breve retraso
        setTimeout(() => {
          navigate(`/applications/${newApplication.id}`);
        }, 1500);
      }
    } catch (error: any) {
      console.error('Error saving application:', error);
      setError(`Error al guardar la solicitud: ${error.message || 'Error desconocido'}`);
    } finally {
      setSaving(false);
    }
  };
  
  if (!userCan(isEditMode ? PERMISSIONS.EDIT_APPLICATION : PERMISSIONS.CREATE_APPLICATION)) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-700">Acceso Restringido</h2>
            <p className="text-gray-500 mt-2">No tienes permisos para {isEditMode ? 'editar' : 'crear'} solicitudes.</p>
          </div>
        </div>
      </MainLayout>
    );
  }
  
  return (
    <MainLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">
            {isEditMode ? 'Editar Solicitud' : 'Nueva Solicitud'}
          </h1>
          <Link to={isEditMode ? `/applications/${id}` : '/applications'} className="btn btn-ghost">
            Cancelar
          </Link>
        </div>
        
        {error && (
          <Alert 
            type="error" 
            message={error}
            onClose={() => setError(null)}
            className="mb-6"
          />
        )}
        
        {successMessage && (
          <Alert 
            type="success" 
            message={successMessage}
            onClose={() => setSuccessMessage(null)}
            className="mb-6"
          />
        )}
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Información del cliente */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title text-lg border-b pb-2 mb-4">Información del Cliente</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Nombre Completo*</span>
                    </label>
                    <input
                      type="text"
                      name="client_name"
                      value={formData.client_name}
                      onChange={handleChange}
                      className="input input-bordered"
                      required
                    />
                  </div>
                  
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Email*</span>
                    </label>
                    <input
                      type="email"
                      name="client_email"
                      value={formData.client_email}
                      onChange={handleChange}
                      className="input input-bordered"
                      required
                    />
                  </div>
                  
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Teléfono*</span>
                    </label>
                    <input
                      type="tel"
                      name="client_phone"
                      value={formData.client_phone}
                      onChange={handleChange}
                      className="input input-bordered"
                      required
                    />
                  </div>
                  
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">DNI / Identificación</span>
                    </label>
                    <input
                      type="text"
                      name="dni"
                      value={formData.dni}
                      onChange={handleChange}
                      className="input input-bordered"
                    />
                  </div>
                  
                  <div className="form-control md:col-span-2">
                    <label className="label">
                      <span className="label-text">Dirección</span>
                    </label>
                    <input
                      type="text"
                      name="client_address"
                      value={formData.client_address}
                      onChange={handleChange}
                      className="input input-bordered"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Información del crédito */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title text-lg border-b pb-2 mb-4">Información del Crédito</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Tipo de Aplicación*</span>
                    </label>
                    <select
                      name="application_type"
                      value={formData.application_type}
                      onChange={handleChange}
                      className="select select-bordered"
                      required
                    >
                      {Object.values(APPLICATION_TYPE).map((type) => (
                        <option key={type} value={type}>
                          {APPLICATION_TYPE_LABELS[type as keyof typeof APPLICATION_TYPE_LABELS]}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Estado*</span>
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      className="select select-bordered"
                      required
                    >
                      {Object.values(APPLICATION_STATUS).map((status) => (
                        <option key={status} value={status}>
                          {STATUS_LABELS[status as keyof typeof STATUS_LABELS]}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Monto*</span>
                    </label>
                    <input
                      type="number"
                      name="amount"
                      value={formData.amount}
                      onChange={handleChange}
                      className="input input-bordered"
                      min="0"
                      step="1000"
                      required
                    />
                  </div>
                  
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Plazo (meses)</span>
                    </label>
                    <input
                      type="number"
                      name="term"
                      value={formData.term}
                      onChange={handleChange}
                      className="input input-bordered"
                      min="1"
                    />
                  </div>
                  
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Tasa de Interés (%)</span>
                    </label>
                    <input
                      type="number"
                      name="interest_rate"
                      value={formData.interest_rate}
                      onChange={handleChange}
                      className="input input-bordered"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Pago Mensual</span>
                    </label>
                    <input
                      type="number"
                      name="monthly_payment"
                      value={formData.monthly_payment}
                      onChange={handleChange}
                      className="input input-bordered"
                      min="0"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Información de empresa y asesor */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title text-lg border-b pb-2 mb-4">Empresa y Asesor</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">ID de Empresa</span>
                    </label>
                    <input
                      type="text"
                      name="company_id"
                      value={formData.company_id}
                      onChange={handleChange}
                      className="input input-bordered"
                    />
                  </div>
                  
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Nombre de Empresa</span>
                    </label>
                    <input
                      type="text"
                      name="company_name"
                      value={formData.company_name}
                      onChange={handleChange}
                      className="input input-bordered"
                    />
                  </div>
                  
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">ID de Asesor Asignado</span>
                    </label>
                    <input
                      type="text"
                      name="assigned_to"
                      value={formData.assigned_to}
                      onChange={handleChange}
                      className="input input-bordered"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                type="submit"
                className={`btn btn-primary ${saving ? 'loading' : ''}`}
                disabled={saving}
              >
                {isEditMode ? 'Actualizar Solicitud' : 'Crear Solicitud'}
              </button>
            </div>
          </form>
        )}
      </div>
    </MainLayout>
  );
};

export default ApplicationForm; 