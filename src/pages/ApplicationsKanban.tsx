import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import KanbanBoard from '../components/ui/KanbanBoard';
import Alert from '../components/ui/Alert';
import { usePermissions } from '../contexts/PermissionsContext';
import { useAuth } from '../contexts/AuthContext';
import { PERMISSIONS } from '../utils/constants/permissions';
import { getApplications, updateApplicationStatus, Application as ApplicationType } from '../services/applicationService';

const ApplicationsKanban: React.FC = () => {
  const { userCan } = usePermissions();
  const { user } = useAuth();
  const { getEntityFilter, shouldFilterByEntity } = usePermissions();
  
  const [applications, setApplications] = useState<ApplicationType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  // Referencia para rastrear si deberíamos actualizar
  const pendingRefreshRef = React.useRef(false);
  
  const fetchApplications = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Aplicar filtros según el rol del usuario
      const entityFilter = shouldFilterByEntity() ? getEntityFilter() : null;
      
      // Obtener las aplicaciones
      const data = await getApplications(undefined, entityFilter);
      console.log("Aplicaciones recuperadas:", data);
      setApplications(data);
      // Limpiar la bandera de actualización pendiente
      pendingRefreshRef.current = false;
    } catch (error: any) {
      console.error('Error fetching applications:', error);
      setError('Error al cargar las solicitudes: ' + (error.message || 'Error desconocido'));
    } finally {
      setIsLoading(false);
    }
  }, [shouldFilterByEntity, getEntityFilter]);
  
  useEffect(() => {
    fetchApplications();
    
    // Configurar un intervalo para verificar si necesitamos actualizar
    const interval = setInterval(() => {
      if (pendingRefreshRef.current) {
        fetchApplications();
      }
    }, 5000); // Verificar cada 5 segundos
    
    return () => clearInterval(interval);
  }, [fetchApplications]);
  
  // Función para actualizar una aplicación específica en el estado local
  const updateLocalApplication = (updatedApp: ApplicationType) => {
    setApplications(prev => 
      prev.map(app => app.id === updatedApp.id ? updatedApp : app)
    );
  };
  
  const handleStatusChange = async (application: ApplicationType, newStatus: string) => {
    if (!user) {
      setError('No has iniciado sesión. Por favor, inicia sesión para realizar esta acción.');
      return;
    }
    
    try {
      const entityFilter = shouldFilterByEntity() ? getEntityFilter() : null;
      
      // Actualizar el estado de la aplicación
      const defaultComment = `Cambio de estado de ${application.status} a ${newStatus} vía Kanban`;
      
      await updateApplicationStatus(
        application.id,
        newStatus as ApplicationType['status'],
        defaultComment,
        user.id,
        entityFilter
      );
      
      // Actualizar localmente la aplicación con el nuevo estado
      const updatedApplication = { 
        ...application, 
        status: newStatus as ApplicationType['status'] 
      };
      updateLocalApplication(updatedApplication);
      
      // Marcar que necesitamos una actualización completa en segundo plano
      pendingRefreshRef.current = true;
      
      setSuccess(`Solicitud de ${application.client_name || 'cliente'} actualizada correctamente a "${newStatus}"`);
      
      // Limpiar mensaje de éxito después de unos segundos
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
      
      return updatedApplication;
    } catch (error: any) {
      console.error('Error updating application status:', error);
      setError(`Error al actualizar el estado: ${error.message || 'Error desconocido'}`);
      throw error;
    }
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
      <div className="p-6 max-w-[2000px] mx-auto">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-primary">Tablero Kanban</h1>
            <p className="text-gray-600 mt-1">Visualiza y gestiona tus solicitudes arrastrando las tarjetas entre columnas</p>
          </div>
          
          <div className="flex gap-2">
            <Link to="/applications" className="btn btn-outline btn-md">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              Vista Lista
            </Link>
            
            {userCan(PERMISSIONS.CREATE_APPLICATION) && (
              <Link to="/applications/new" className="btn btn-primary btn-md">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Nueva Solicitud
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
        
        {success && (
          <Alert 
            type="success" 
            message={success}
            onClose={() => setSuccess(null)}
            autoClose={true}
            className="mb-6"
          />
        )}
        
        {isLoading && applications.length === 0 ? (
          <div className="flex justify-center items-center h-96 w-full">
            <div className="text-center">
              <span className="loading loading-spinner loading-lg text-primary"></span>
              <p className="mt-4 text-gray-500">Cargando solicitudes...</p>
            </div>
          </div>
        ) : (
          <div className="bg-base-100 shadow-xl rounded-xl overflow-hidden border border-base-300">
            <KanbanBoard 
              applications={applications}
              onStatusChange={userCan(PERMISSIONS.EDIT_APPLICATION) ? handleStatusChange : undefined}
            />
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default ApplicationsKanban; 