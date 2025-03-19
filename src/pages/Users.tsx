import React from 'react';
import { Link } from 'react-router-dom';
import { PERMISSIONS } from '../utils/constants/permissions';
import { usePermissions } from '../contexts/PermissionsContext';
import MainLayout from '../components/layout/MainLayout';

const Users: React.FC = () => {
  const { userCan } = usePermissions();
  
  if (!userCan(PERMISSIONS.VIEW_ADVISORS)) {
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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <h1 className="text-2xl font-bold mb-4 md:mb-0">Usuarios</h1>
          
          {userCan(PERMISSIONS.CREATE_ADVISOR) && (
            <Link to="/users/new" className="btn btn-primary">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Nuevo Usuario
            </Link>
          )}
        </div>
        
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <p className="text-center py-12 text-gray-500">Esta página está en desarrollo.</p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Users; 