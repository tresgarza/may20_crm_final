import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  
  if (loading) {
    // Mostrar indicador de carga mejorado
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-base-200">
        <span className="loading loading-spinner loading-lg text-primary"></span>
        <p className="mt-3 text-base-content">Verificando sesión...</p>
      </div>
    );
  }
  
  if (!user) {
    // Guardar la ruta actual para redirigir después del login
    // y mostrar mensaje de sesión expirada si viene de una navegación interna
    const isFromInternalNavigation = location.key !== 'default';
    
    return (
      <Navigate 
        to="/login" 
        state={{ 
          from: location,
          sessionExpired: isFromInternalNavigation 
        }} 
        replace 
      />
    );
  }
  
  // Si está autenticado, renderizar los componentes hijos
  return <>{children}</>;
};

export default ProtectedRoute; 