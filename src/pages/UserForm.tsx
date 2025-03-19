import React from 'react';
import { useParams } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';

const UserForm: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const isEditMode = !!id;
  
  return (
    <MainLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">
          {isEditMode ? 'Editar Usuario' : 'Nuevo Usuario'}
        </h1>
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            {isEditMode ? (
              <p>Formulario de edición para usuario ID: {id}</p>
            ) : (
              <p>Formulario para nuevo usuario</p>
            )}
            <p className="text-gray-500">Esta página está en desarrollo.</p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default UserForm; 