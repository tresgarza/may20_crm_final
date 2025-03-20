import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { 
  getApplicationById, 
  Application, 
  getApprovalStatus, 
  approveByAdvisor, 
  approveByCompany, 
  updateApplicationStatus,
  ApplicationStatus 
} from '../services/applicationService';
import { usePermissions } from '../contexts/PermissionsContext';
import { PERMISSIONS } from '../utils/constants/permissions';
import { useAuth } from '../contexts/AuthContext';
import Alert from '../components/ui/Alert';
import { STATUS_LABELS } from '../utils/constants/statuses';
import { APPLICATION_TYPE_LABELS } from '../utils/constants/applications';
import { APPLICATION_STATUS } from '../utils/constants/statuses';
import { useNotifications, NotificationType } from '../contexts/NotificationContext';

// Interfaces para estados de aprobación
interface ApprovalStatus {
  approvedByAdvisor: boolean;
  approvedByCompany: boolean;
  approvalDateAdvisor?: string;
  approvalDateCompany?: string;
}

const ApplicationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addNotification, showPopup } = useNotifications();
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus | null>(null);
  const [approving, setApproving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { shouldFilterByEntity, getEntityFilter, userCan, isAdvisor, isCompanyAdmin } = usePermissions();
  
  useEffect(() => {
    const loadApplication = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Validar que el ID tenga un formato válido de UUID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!id || !uuidRegex.test(id)) {
          throw new Error('ID de solicitud inválido');
        }
        
        const data = await getApplicationById(id);
        setApplication(data);
        
        // Obtener estado de aprobación
        const approvalData = await getApprovalStatus(id);
        setApprovalStatus(approvalData);
      } catch (err) {
        console.error('Error al cargar la solicitud:', err);
        setError(err instanceof Error ? err.message : 'Error al cargar los datos de la solicitud');
        
        // Mostrar notificación de error
        showPopup({
          title: 'Solicitud no encontrada',
          message: 'No se pudo encontrar la solicitud especificada. Es posible que haya sido eliminada o que no tengas permisos para verla.',
          type: NotificationType.ERROR,
          playSound: true,
          soundType: 'alert'
        });
        
        // Redirigir al listado de aplicaciones después de 3 segundos
        setTimeout(() => {
          navigate('/applications');
        }, 3000);
      } finally {
        setLoading(false);
      }
    };

    loadApplication();
  }, [id, showPopup, navigate]);
  
  // Función para aprobar como asesor
  const handleAdvisorApproval = async () => {
    if (!id || !user || !application) return;
    
    try {
      setApproving(true);
      setError(null);
      
      const entityFilter = shouldFilterByEntity() ? getEntityFilter() : null;
      const result = await approveByAdvisor(
        id, 
        'Solicitud aprobada por el asesor', 
        user.id,
        entityFilter
      );
      
      // Recargar datos
      const updatedApp = await getApplicationById(id, entityFilter);
      setApplication(updatedApp);
      
      const updatedApproval = await getApprovalStatus(id, entityFilter);
      setApprovalStatus(updatedApproval);
      
      setSuccessMessage('Solicitud aprobada correctamente como asesor');
      
      // Si ambos han aprobado, mostrar mensaje adicional
      if (updatedApproval.approvedByAdvisor && updatedApproval.approvedByCompany) {
        setSuccessMessage('¡Aprobación completa! La solicitud ha sido aprobada por ambas partes.');
      }
      
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      console.error('Error approving as advisor:', error);
      setError(`Error al aprobar: ${error.message || 'Error desconocido'}`);
    } finally {
      setApproving(false);
    }
  };
  
  // Función para aprobar como empresa
  const handleCompanyApproval = async () => {
    if (!id || !user || !application) return;
    
    try {
      setApproving(true);
      setError(null);
      
      const entityFilter = shouldFilterByEntity() ? getEntityFilter() : null;
      
      if (!entityFilter?.company_id) {
        throw new Error('No tienes una empresa asociada para realizar esta aprobación');
      }
      
      const result = await approveByCompany(
        id, 
        'Solicitud aprobada por la empresa', 
        user.id,
        entityFilter.company_id,
        entityFilter
      );
      
      // Recargar datos
      const updatedApp = await getApplicationById(id, entityFilter);
      setApplication(updatedApp);
      
      const updatedApproval = await getApprovalStatus(id, entityFilter);
      setApprovalStatus(updatedApproval);
      
      setSuccessMessage('Solicitud aprobada correctamente como empresa');
      
      // Si ambos han aprobado, mostrar mensaje adicional
      if (updatedApproval.approvedByAdvisor && updatedApproval.approvedByCompany) {
        setSuccessMessage('¡Aprobación completa! La solicitud ha sido aprobada por ambas partes.');
      }
      
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      console.error('Error approving as company:', error);
      setError(`Error al aprobar: ${error.message || 'Error desconocido'}`);
    } finally {
      setApproving(false);
    }
  };
  
  // Función para cambiar estado
  const handleStatusChange = async (newStatus: ApplicationStatus) => {
    if (!id || !user || !application) return;
    
    try {
      setApproving(true);
      setError(null);
      
      const entityFilter = shouldFilterByEntity() ? getEntityFilter() : null;
      const statusText = STATUS_LABELS[newStatus as keyof typeof STATUS_LABELS] || newStatus;
      
      await updateApplicationStatus(
        id,
        newStatus,
        `Cambio de estado a ${statusText} desde vista detalle`,
        user.id,
        entityFilter
      );
      
      // Recargar datos
      const updatedApp = await getApplicationById(id, entityFilter);
      setApplication(updatedApp);
      
      // Mostrar mensaje de éxito
      setSuccessMessage(`Solicitud actualizada correctamente a "${statusText}"`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      console.error('Error updating application status:', error);
      setError(`Error al actualizar el estado: ${error.message || 'Error desconocido'}`);
    } finally {
      setApproving(false);
    }
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };
  
  const getStatusClass = (status: string) => {
    switch (status) {
      case 'pending':
        return 'badge-warning';
      case 'in_review':
        return 'badge-info';
      case 'approved':
        return 'badge-success';
      case 'rejected':
        return 'badge-error';
      default:
        return 'badge-ghost';
    }
  };
  
  // Obtener la etiqueta legible para el tipo de aplicación
  const getProductTypeLabel = (type: string | null | undefined): string => {
    if (!type) return 'N/A';
    
    // Normalizar el tipo a minúsculas para comparación
    const normalizedType = type.toLowerCase();
    
    // Verificar si es alguno de los tipos definidos en APPLICATION_TYPE_LABELS
    for (const [key, value] of Object.entries(APPLICATION_TYPE_LABELS)) {
      if (key.toLowerCase() === normalizedType || key.toLowerCase().includes(normalizedType) || normalizedType.includes(key.toLowerCase())) {
        return value;
      }
    }
    
    // Mapeo adicional para otros valores comunes
    const typeMappings: Record<string, string> = {
      'selected_plans': 'Crédito a Plazos',
      'product_simulations': 'Simulación',
      'auto_loan': 'Crédito Auto',
      'car_backed_loan': 'Crédito con Garantía',
      'personal_loan': 'Préstamo Personal',
      'cash_advance': 'Adelanto de Efectivo'
    };
    
    // Buscar una coincidencia parcial
    for (const [key, value] of Object.entries(typeMappings)) {
      if (normalizedType.includes(key) || key.includes(normalizedType)) {
        return value;
      }
    }
    
    // Si no hay coincidencia, retornar el valor original
    return type;
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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Detalle de Solicitud</h1>
          <div className="space-x-2">
            <Link to="/applications" className="btn btn-ghost">
              Volver
            </Link>
            {application && userCan(PERMISSIONS.EDIT_APPLICATION) && (
              <Link to={`/applications/${id}/edit`} className="btn btn-primary">
                Editar
              </Link>
            )}
          </div>
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
        ) : application ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Información básica */}
            <div className="card bg-base-100 shadow-xl col-span-2">
              <div className="card-body">
                <h2 className="card-title text-lg border-b pb-2 mb-4">Información de la Solicitud</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">ID de Solicitud</p>
                    <p className="font-medium">{application.id}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500">Fecha de Creación</p>
                    <p className="font-medium">{formatDate(application.created_at)}</p>
                  </div>
                  
                  <div className="mb-4">
                    <h3 className="text-sm font-medium text-gray-500">Tipo de Producto</h3>
                    <p className="text-sm text-gray-900">
                      {(() => {
                        const appType = application.application_type;
                        if (!appType) return 'No especificado';
                        
                        // Check for common types
                        if (appType === 'selected_plans') return 'Planes Seleccionados';
                        if (appType === 'product_simulations') return 'Simulación de Producto';
                        if (appType === 'cash_requests') return 'Solicitud de Efectivo';
                        
                        // Try to find in APPLICATION_TYPE_LABELS if imported
                        const { APPLICATION_TYPE_LABELS } = require('../utils/constants/applications');
                        if (APPLICATION_TYPE_LABELS && APPLICATION_TYPE_LABELS[appType]) {
                          return APPLICATION_TYPE_LABELS[appType];
                        }
                        
                        // Format nicely as fallback
                        return appType
                          .split('_')
                          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                          .join(' ');
                      })()}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500">Estado</p>
                    <p>
                      <span className={`badge ${getStatusClass(application.status)}`}>
                        {STATUS_LABELS[application.status as keyof typeof STATUS_LABELS] || application.status}
                      </span>
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500">Monto Solicitado</p>
                    <p className="font-medium">{formatCurrency(application.requested_amount || application.amount || 0)}</p>
                  </div>
                </div>
                
                {/* Estado de aprobación */}
                {approvalStatus && (
                  <div className="mt-6 pt-4 border-t">
                    <h3 className="font-semibold mb-4">Estado de Aprobación</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Aprobación por asesor */}
                      <div className="border rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">Asesor</p>
                          {approvalStatus.approvedByAdvisor ? (
                            <span className="badge badge-success">Aprobado</span>
                          ) : (
                            <span className="badge badge-warning">Pendiente</span>
                          )}
                        </div>
                        {approvalStatus.approvalDateAdvisor && (
                          <p className="text-xs text-gray-500 mt-1">
                            Fecha: {formatDate(approvalStatus.approvalDateAdvisor)}
                          </p>
                        )}
                        
                        {/* Botón para aprobar como asesor */}
                        {isAdvisor() && !approvalStatus.approvedByAdvisor && (
                          <button 
                            onClick={handleAdvisorApproval}
                            disabled={approving}
                            className="btn btn-sm btn-primary mt-2 w-full"
                          >
                            {approving ? (
                              <span className="loading loading-spinner loading-xs"></span>
                            ) : 'Aprobar como Asesor'}
                          </button>
                        )}
                      </div>
                      
                      {/* Aprobación por empresa */}
                      <div className="border rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">Empresa</p>
                          {approvalStatus.approvedByCompany ? (
                            <span className="badge badge-success">Aprobado</span>
                          ) : (
                            <span className="badge badge-warning">Pendiente</span>
                          )}
                        </div>
                        {approvalStatus.approvalDateCompany && (
                          <p className="text-xs text-gray-500 mt-1">
                            Fecha: {formatDate(approvalStatus.approvalDateCompany)}
                          </p>
                        )}
                        
                        {/* Botón para aprobar como empresa */}
                        {isCompanyAdmin() && !approvalStatus.approvedByCompany && (
                          <button 
                            onClick={handleCompanyApproval}
                            disabled={approving}
                            className="btn btn-sm btn-primary mt-2 w-full"
                          >
                            {approving ? (
                              <span className="loading loading-spinner loading-xs"></span>
                            ) : 'Aprobar como Empresa'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Información del cliente */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title text-lg border-b pb-2 mb-4">Información del Cliente</h2>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Nombre</p>
                    <p className="font-medium">{application.client_name}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{application.client_email}</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Información de la empresa */}
            {(application.company_id || application.company_name) && (
              <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <h2 className="card-title text-lg border-b pb-2 mb-4">Información de la Empresa</h2>
                  
                  <div className="space-y-4">
                    {application.company_name && (
                      <div>
                        <p className="text-sm text-gray-500">Nombre de la Empresa</p>
                        <p className="font-medium">{application.company_name}</p>
                      </div>
                    )}
                    
                    {application.company_id && (
                      <div>
                        <p className="text-sm text-gray-500">ID de la Empresa</p>
                        <p className="font-medium">{application.company_id}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Información del asesor */}
            {application.assigned_to && (
              <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <h2 className="card-title text-lg border-b pb-2 mb-4">Asesor Asignado</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-500">ID del Asesor</p>
                      <p className="font-medium">{application.assigned_to}</p>
                    </div>
                    {application.advisor_name && (
                      <div>
                        <p className="text-sm text-gray-500">Nombre del Asesor</p>
                        <p className="font-medium">{application.advisor_name}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center p-10">
            <h3 className="text-xl text-gray-500">No se encontró la solicitud</h3>
          </div>
        )}
        
        {/* Agregar botón para mover a estado "Por Dispersar" después de aprobación */}
        {application && application.status === APPLICATION_STATUS.APPROVED && 
          isAdvisor() && (
          <div className="mt-4 p-4 bg-base-200 rounded-lg">
            <h3 className="font-medium mb-2">Acciones disponibles</h3>
            <div className="flex flex-col space-y-2">
              <button 
                onClick={() => handleStatusChange(APPLICATION_STATUS.POR_DISPERSAR)}
                className="btn btn-accent"
                disabled={approving}
              >
                {approving ? (
                  <span className="loading loading-spinner loading-xs"></span>
                ) : 'Marcar como Por Dispersar'}
              </button>
            </div>
          </div>
        )}
        
        {application && application.status === APPLICATION_STATUS.POR_DISPERSAR && 
          isAdvisor() && (
          <div className="mt-4 p-4 bg-base-200 rounded-lg">
            <h3 className="font-medium mb-2">Acciones disponibles</h3>
            <div className="flex flex-col space-y-2">
              <button 
                onClick={() => handleStatusChange(APPLICATION_STATUS.COMPLETED)}
                className="btn btn-primary"
                disabled={approving}
              >
                {approving ? (
                  <span className="loading loading-spinner loading-xs"></span>
                ) : 'Marcar como Completado (Dispersado)'}
              </button>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default ApplicationDetail; 