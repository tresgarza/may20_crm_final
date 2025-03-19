import React from 'react';
import { PERMISSIONS } from '../utils/constants/permissions';
import { usePermissions } from '../contexts/PermissionsContext';
import MainLayout from '../components/layout/MainLayout';

const Reports: React.FC = () => {
  const { userCan } = usePermissions();
  
  if (!userCan(PERMISSIONS.VIEW_REPORTS)) {
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
        <h1 className="text-2xl font-bold mb-6">Reportes</h1>
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <p className="text-center py-12 text-gray-500">Esta página está en desarrollo.</p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Reports; 