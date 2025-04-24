import * as React from 'react';
import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { 
  getApplicationById, 
  Application as ApplicationType, 
  getApprovalStatus, 
  approveByAdvisor, 
  approveByCompany,
  cancelCompanyApproval,
  updateApplicationStatus,
  ApplicationStatus,
  markAsDispersed
} from '../services/applicationService';
import { usePermissions } from '../contexts/PermissionsContext';
import { PERMISSIONS } from '../utils/constants/permissions';
import { useAuth } from '../contexts/AuthContext';
import Alert from '../components/ui/Alert';
import { STATUS_LABELS } from '../utils/constants/statuses';
import { APPLICATION_TYPE_LABELS } from '../utils/constants/applications';
import { APPLICATION_STATUS } from '../utils/constants/statuses';
import { TABLES } from '../utils/constants/tables';
import { useNotifications, NotificationType } from '../contexts/NotificationContext';
import { formatDate } from '../utils/formatters';

// Interfaces para estados de aprobación
interface ApprovalStatus {
  isFullyApproved: boolean;
  approvedByAdvisor: boolean;
  approvedByCompany: boolean;
  approvalDateAdvisor?: string;
  approvalDateCompany?: string;
  advisorStatus?: string;
  companyStatus?: string;
  globalStatus?: string;
}

const ApplicationDetail = () => {
  console.log('React at start', React); // Diagnostic log to check for shadowing
  
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addNotification, showPopup } = useNotifications();
  const [application, setApplication] = useState<ApplicationType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus | null>(null);
  const [approving, setApproving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { shouldFilterByEntity, getEntityFilter, userCan, isAdvisor, isCompanyAdmin } = usePermissions();
  
  // Función auxiliar para construir el estado de aprobación localmente si es necesario
  const buildApprovalStatus = (app: ApplicationType): ApprovalStatus => {
    return {
      approvedByAdvisor: app.approved_by_advisor === true,
      approvedByCompany: app.approved_by_company === true,
      approvalDateAdvisor: app.approval_date_advisor,
      approvalDateCompany: app.approval_date_company,
      isFullyApproved: app.approved_by_advisor === true && app.approved_by_company === true,
      advisorStatus: app.advisor_status,
      companyStatus: app.company_status,
      globalStatus: app.global_status || app.status
    };
  };
  
  // Función para cargar/recargar datos de la aplicación
  const loadApplicationData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Validar que el ID tenga un formato válido de UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!id || !uuidRegex.test(id)) {
        throw new Error('ID de solicitud inválido');
      }
      
      const entityFilter = shouldFilterByEntity() ? getEntityFilter() : null;
      const data = await getApplicationById(id, entityFilter);
      setApplication(data);
      
      // Obtener estado de aprobación
      const approvalData = await getApprovalStatus(id, entityFilter);
      // Only set approval status if we got a valid response
      if (approvalData) {
        setApprovalStatus(approvalData);
      } else {
        setApprovalStatus(buildApprovalStatus(data));
      }
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

  useEffect(() => {
    loadApplicationData();
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
      
      // Recargar datos para asegurar que tenemos la info más actualizada
      await loadApplicationData();
      
      // Si ambos han aprobado, mostrar mensaje adicional
      if (approvalStatus?.approvedByCompany) {
        setSuccessMessage('¡Aprobación completa! La solicitud ha sido aprobada por ambas partes.');
      } else {
        setSuccessMessage('Solicitud aprobada correctamente como asesor');
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
      
      // Recargar datos para asegurar que tenemos la info más actualizada
      await loadApplicationData();
      
      // Si ambos han aprobado, mostrar mensaje adicional
      if (approvalStatus?.approvedByAdvisor) {
        setSuccessMessage('¡Aprobación completa! La solicitud ha sido aprobada por ambas partes.');
      } else {
        setSuccessMessage('Solicitud aprobada correctamente como empresa');
      }
      
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      console.error('Error approving as company:', error);
      setError(`Error al aprobar: ${error.message || 'Error desconocido'}`);
    } finally {
      setApproving(false);
    }
  };
  
  // Función para deshacer la aprobación de empresa
  const handleCancelCompanyApproval = async () => {
    if (!id || !user || !application) return;
    
    try {
      setApproving(true);
      setError(null);
      
      const entityFilter = shouldFilterByEntity() ? getEntityFilter() : null;
      
      if (!entityFilter?.company_id) {
        throw new Error('No tienes una empresa asociada para realizar esta acción');
      }
      
      await cancelCompanyApproval(
        id, 
        'Aprobación cancelada por la empresa', 
        user.id,
        entityFilter.company_id,
        entityFilter
      );
      
      // Recargar datos para asegurar que tenemos la info más actualizada
      await loadApplicationData();
      
      setSuccessMessage('Aprobación de empresa cancelada correctamente');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      console.error('Error canceling approval:', error);
      setError(`Error al cancelar aprobación: ${error.message || 'Error desconocido'}`);
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
      
      // Si un administrador de empresa está cambiando el estado a "En revisión",
      // primero limpiamos su aprobación
      if (isCompanyAdmin() && newStatus === APPLICATION_STATUS.IN_REVIEW && approvalStatus?.approvedByCompany) {
        console.log("Quitando aprobación de empresa antes de cambiar el estado");
        
        // Ejecutar consulta SQL para quitar la aprobación
        const query = `
          UPDATE ${TABLES.APPLICATIONS}
          SET approved_by_company = false, 
              approval_date_company = NULL,
              status = '${APPLICATION_STATUS.IN_REVIEW}'
          WHERE id = '${id}' AND company_id = '${entityFilter?.company_id}'
          RETURNING *
        `;
        
        try {
          // Ejecutar la consulta directamente usando executeQuery
          const response = await fetch('http://localhost:3100/query', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query }),
          });
          
          const result = await response.json();
          console.log("Resultado de quitar aprobación:", result);
          
          if (result.error) {
            throw new Error(`Error al quitar aprobación: ${result.error}`);
          }
          
          console.log("✅ Aprobación de empresa removida correctamente");
          
          // Recargar los datos completos
          await loadApplicationData();
          
          setSuccessMessage(`Aprobación de empresa removida y solicitud actualizada a "${statusText}"`);
          setTimeout(() => setSuccessMessage(null), 3000);
          setApproving(false);
          return;
        } catch (error) {
          console.error("Error al quitar aprobación:", error);
          // Continuamos con el flujo normal si hay un error
        }
      }
      
      // Flujo normal para otros casos
      await updateApplicationStatus(
        id,
        newStatus,
        `Cambio de estado a ${statusText} desde vista detalle`,
        user.id,
        entityFilter
      );
      
      // Recargar datos completos
      await loadApplicationData();
      
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
  
  // Verificar si la solicitud está totalmente aprobada
  const isFullyApproved = approvalStatus?.approvedByAdvisor && approvalStatus?.approvedByCompany;
  
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
                    <p className="font-medium">{formatDate(application.created_at, 'short')}</p>
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
                        
                        // Use the imported APPLICATION_TYPE_LABELS directly
                        if (APPLICATION_TYPE_LABELS[appType as keyof typeof APPLICATION_TYPE_LABELS]) {
                          return APPLICATION_TYPE_LABELS[appType as keyof typeof APPLICATION_TYPE_LABELS];
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
                    
                    {/* Indicador de aprobación completa */}
                    {approvalStatus.isFullyApproved && (
                      <div className="mb-4 p-3 bg-success text-white rounded-lg">
                        <div className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span className="font-medium">Solicitud completamente aprobada</span>
                        </div>
                        <p className="text-sm mt-1">Esta solicitud ha sido aprobada tanto por el asesor como por la empresa</p>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      {/* Aprobación por asesor */}
                      <div className="border rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">Estado Asesor</p>
                          {approvalStatus.approvedByAdvisor ? (
                            <span className="badge badge-success">Aprobado</span>
                          ) : (
                            <span className="badge badge-warning">Pendiente</span>
                          )}
                        </div>
                        {application && application.advisor_status && (
                          <div className="flex items-center mt-2">
                            <p className="text-xs text-gray-500 mr-2">Estado en vista de Asesor:</p>
                            <span className={`badge badge-sm ${getStatusClass(application.advisor_status)}`}>
                              {STATUS_LABELS[application.advisor_status as keyof typeof STATUS_LABELS] || application.advisor_status}
                            </span>
                          </div>
                        )}
                        {approvalStatus.approvalDateAdvisor && (
                          <p className="text-xs text-gray-500 mt-1">
                            Fecha de aprobación: {formatDate(approvalStatus.approvalDateAdvisor, 'short')}
                          </p>
                        )}
                      </div>
                      
                      {/* Aprobación por empresa */}
                      <div className="border rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">Estado Empresa</p>
                          {approvalStatus.approvedByCompany ? (
                            <span className="badge badge-success">Aprobado</span>
                          ) : (
                            <span className="badge badge-warning">Pendiente</span>
                          )}
                        </div>
                        {application && application.company_status && (
                          <div className="flex items-center mt-2">
                            <p className="text-xs text-gray-500 mr-2">Estado en vista de Empresa:</p>
                            <span className={`badge badge-sm ${getStatusClass(application.company_status)}`}>
                              {STATUS_LABELS[application.company_status as keyof typeof STATUS_LABELS] || application.company_status}
                            </span>
                          </div>
                        )}
                        {approvalStatus.approvalDateCompany && (
                          <p className="text-xs text-gray-500 mt-1">
                            Fecha de aprobación: {formatDate(approvalStatus.approvalDateCompany, 'short')}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* Estado Global */}
                    {application && application.global_status && (
                      <div className="border rounded-lg p-3 mt-2">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">Estado Global del Proceso</p>
                          <span className={`badge ${getStatusClass(application.global_status)}`}>
                            {STATUS_LABELS[application.global_status as keyof typeof STATUS_LABELS] || application.global_status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Este es el estado consolidado que refleja el progreso global de la solicitud en el sistema.
                        </p>
                      </div>
                    )}
                    
                    {/* Sección de depuración para administradores del sistema */}
                    {application && (isCompanyAdmin() || isAdvisor()) && userCan(PERMISSIONS.VIEW_REPORTS) && (
                      <div className="mt-4 pt-4 border-t border-dashed">
                        <div className="bg-base-300 p-3 rounded-lg">
                          <h4 className="text-sm font-bold mb-2">Debug: Todos los estados (Solo administradores)</h4>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="font-bold">Estado Principal:</span> {application.status}
                            </div>
                            <div>
                              <span className="font-bold">Estado Asesor:</span> {application.advisor_status || 'No definido'}
                            </div>
                            <div>
                              <span className="font-bold">Estado Empresa:</span> {application.company_status || 'No definido'}
                            </div>
                            <div>
                              <span className="font-bold">Estado Global:</span> {application.global_status || 'No definido'}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
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
        
        {/* Acciones de aprobación */}
        {application && approvalStatus && (
          <div className="mt-6 space-y-4">
            {/* Botones de aprobación para asesores */}
            {isAdvisor() && !approvalStatus.approvedByAdvisor && userCan(PERMISSIONS.CHANGE_APPLICATION_STATUS) && (
              <div className="p-4 bg-base-200 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">Aprobación del Asesor</h3>
                <p className="mb-4 text-gray-600">Como asesor, puedes aprobar esta solicitud para avanzar en el proceso.</p>
                <button 
                  onClick={handleAdvisorApproval} 
                  disabled={approving}
                  className="btn btn-primary"
                >
                  {approving ? (
                    <>
                      <span className="loading loading-spinner loading-xs mr-2"></span>
                      Procesando...
                    </>
                  ) : 'Aprobar como Asesor'}
                </button>
              </div>
            )}
            
            {/* Botones de aprobación para administradores de empresa */}
            {isCompanyAdmin() && userCan(PERMISSIONS.CHANGE_APPLICATION_STATUS) && (
              <div className="p-4 bg-base-200 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">Aprobación de la Empresa</h3>
                <p className="mb-4 text-gray-600">Como administrador de empresa, puedes aprobar esta solicitud.</p>
                
                {!approvalStatus.approvedByCompany ? (
                  <button 
                    onClick={handleCompanyApproval} 
                    disabled={approving}
                    className="btn btn-primary"
                  >
                    {approving ? (
                      <>
                        <span className="loading loading-spinner loading-xs mr-2"></span>
                        Procesando...
                      </>
                    ) : 'Aprobar como Empresa'}
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className="alert alert-success">
                      <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <span>Esta solicitud ya ha sido aprobada por la empresa</span>
                    </div>
                    
                    <button 
                      onClick={handleCancelCompanyApproval} 
                      disabled={approving}
                      className="btn btn-outline btn-error"
                    >
                      {approving ? (
                        <>
                          <span className="loading loading-spinner loading-xs mr-2"></span>
                          Procesando...
                        </>
                      ) : 'Cancelar Aprobación'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        
        {/* Acciones de flujo de trabajo - Solo mostrar si ya están las aprobaciones necesarias */}
        {application && approvalStatus && (
          <>
            {/* Botón para mover a estado "Por Dispersar" después de aprobación */}
            {application.status === APPLICATION_STATUS.APPROVED && 
              isAdvisor() && 
              approvalStatus.approvedByAdvisor && 
              approvalStatus.approvedByCompany && (
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
            
            {/* Botón para marcar como completado si está en estado "Por Dispersar" */}
            {application.status === APPLICATION_STATUS.POR_DISPERSAR && 
              isAdvisor() && (
              <div className="mt-4 p-4 bg-base-200 rounded-lg">
                <h3 className="font-medium mb-2">Acciones disponibles</h3>
                <div className="flex flex-col space-y-2">
                  <button 
                    onClick={async () => {
                      if (!id || !user || !application) return;
                      
                      try {
                        setApproving(true);
                        setError(null);
                        
                        const entityFilter = shouldFilterByEntity() ? getEntityFilter() : null;
                        await markAsDispersed(
                          id, 
                          'Solicitud marcada como dispersada',
                          user.id,
                          entityFilter
                        );
                        
                        // Recargar datos para asegurar que tenemos la info más actualizada
                        await loadApplicationData();
                        
                        setSuccessMessage('Solicitud marcada como dispersada correctamente');
                        setTimeout(() => setSuccessMessage(null), 3000);
                      } catch (error: any) {
                        console.error('Error marking as dispersed:', error);
                        setError(`Error al marcar como dispersada: ${error.message || 'Error desconocido'}`);
                      } finally {
                        setApproving(false);
                      }
                    }}
                    className="btn btn-primary"
                    disabled={approving}
                  >
                    {approving ? (
                      <span className="loading loading-spinner loading-xs"></span>
                    ) : 'Marcar como Dispersado'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default ApplicationDetail; 