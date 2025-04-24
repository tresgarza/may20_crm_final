import * as React from 'react';
import MainLayout from '../components/layout/MainLayout';

const Companies: React.FC = () => {
  return (
    <MainLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Empresas</h1>
        
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <p className="text-lg text-center py-10">
              La sección de Empresas está en desarrollo. Estará disponible próximamente.
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Companies; 