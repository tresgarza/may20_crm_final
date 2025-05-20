import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../contexts/PermissionsContext';
import MainLayout from '../components/layout/MainLayout';
import { runAdvisorIdMigration } from '../utils/runMigrations';

const Admin: React.FC = () => {
  const { user } = useAuth();
  const { userCan, isAdmin } = usePermissions();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Function to run the advisor migration
  const handleRunAdvisorMigration = async () => {
    try {
      setLoading(true);
      const success = await runAdvisorIdMigration();
      if (success) {
        setSuccessMessage('Migración de asignación de asesores completada con éxito');
      } else {
        setError('Error al ejecutar la migración de asesores');
      }
    } catch (err) {
      console.error('Error running advisor migration:', err);
      setError('Error al ejecutar la migración: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  // Clear messages when either appears
  React.useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  React.useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  if (!isAdmin()) {
    return (
      <MainLayout>
        <div className="p-4">
          <h1 className="text-2xl font-bold mb-4">Administración</h1>
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            No tienes permiso para acceder a esta página.
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-6">Panel de Administración</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 relative">
            {error}
            <button 
              className="absolute top-0 right-0 mt-2 mr-2"
              onClick={() => setError(null)}
            >
              ✕
            </button>
          </div>
        )}
        
        {successMessage && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 relative">
            {successMessage}
            <button 
              className="absolute top-0 right-0 mt-2 mr-2"
              onClick={() => setSuccessMessage(null)}
            >
              ✕
            </button>
          </div>
        )}
        
        {/* Admin Section for Database Management */}
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">Mantenimiento de Base de Datos</h2>
          <div className="space-y-4">
            <div className="p-4 bg-white rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-2">Sincronizar Asignación de Asesores</h3>
              <p className="text-gray-600 mb-4">
                Esta operación asigna automáticamente asesores a los clientes que fueron creados por administradores 
                de empresa y que no tienen asesor asignado. Se usa el asesor asociado a la empresa.
              </p>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                onClick={handleRunAdvisorMigration}
                disabled={loading}
              >
                {loading ? 'Ejecutando...' : 'Ejecutar Sincronización'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Admin; 