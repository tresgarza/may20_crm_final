import * as React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const auth = useAuth();
  const { user, loading } = auth;
  // Get error safely if it exists in the context
  const error = auth.error;
  const location = useLocation();
  const [loadingTime, setLoadingTime] = React.useState(0);
  const [healthCheckRunning, setHealthCheckRunning] = React.useState(false);
  const [serverConnectionError, setServerConnectionError] = React.useState(false);
  
  // Track how long the loading state has been active
  React.useEffect(() => {
    if (!loading) return;
    
    const interval = setInterval(() => {
      setLoadingTime(prev => prev + 1);
    }, 1000);
    
    // If loading takes too long, check if MCP server is accessible
    if (loadingTime === 8) {
      fetch('http://localhost:3100/health', {
        method: 'GET'
      })
      .then(response => {
        if (!response.ok) {
          setServerConnectionError(true);
        }
      })
      .catch(() => {
        setServerConnectionError(true);
      });
    }
    
    return () => clearInterval(interval);
  }, [loading, loadingTime]);
  
  if (loading) {
    // Si la carga toma más de 10 segundos, muestra un mensaje diferente
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-base-200 p-4">
        <span className="loading loading-spinner loading-lg text-primary"></span>
        <p className="mt-3 text-base-content">Verificando sesión...</p>
        
        {loadingTime > 10 && (
          <div className="mt-6 max-w-md p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-700">La verificación está tomando más tiempo de lo esperado.</p>
            <ul className="mt-2 list-disc list-inside text-sm text-yellow-600">
              <li>Asegúrate de que el servidor está funcionando correctamente</li>
              <li>Verifica tu conexión a internet</li>
              <li>El servidor MCP debe estar ejecutándose en el puerto 3100</li>
              {serverConnectionError && (
                <li className="text-red-600 font-semibold">No se puede conectar al servidor MCP</li>
              )}
              {error && (
                <li className="text-red-600 font-semibold">Error: {error.message}</li>
              )}
            </ul>
            <div className="mt-4 flex flex-col space-y-2">
              <button 
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
              >
                Recargar página
              </button>
              <button 
                onClick={() => window.location.href = '/login'}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                Ir a la página de login
              </button>
            </div>
          </div>
        )}
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