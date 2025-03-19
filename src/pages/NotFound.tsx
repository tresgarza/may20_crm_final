import React from 'react';
import { Link } from 'react-router-dom';

const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200">
      <div className="text-center p-8">
        <h1 className="text-8xl font-bold text-primary">404</h1>
        <h2 className="text-2xl font-bold my-4">Página No Encontrada</h2>
        <p className="mb-6 text-gray-600">Lo sentimos, la página que buscas no existe o ha sido movida.</p>
        <Link to="/" className="btn btn-primary">
          Volver al Inicio
        </Link>
      </div>
    </div>
  );
};

export default NotFound; 