import * as React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../contexts/PermissionsContext';
import { PERMISSIONS } from '../utils/constants/permissions';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermissions?: PERMISSIONS[];
  requireAnyPermission?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermissions = [],
  requireAnyPermission = false,
}) => {
  const { user, loading } = useAuth();
  const { userCanAll, userCanAny } = usePermissions();
  const location = useLocation();

  if (loading) {
    // You can replace this with a loading component if needed
    return <div className="flex h-screen w-full items-center justify-center">
      <div className="text-center">
        <span className="loading loading-spinner loading-lg text-primary"></span>
        <p className="mt-2">Cargando...</p>
      </div>
    </div>;
  }

  if (!user) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check permissions if required
  if (requiredPermissions.length > 0) {
    const hasPermission = requireAnyPermission
      ? userCanAny(requiredPermissions)
      : userCanAll(requiredPermissions);

    if (!hasPermission) {
      // Redirect to dashboard if authenticated but doesn't have permission
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute; 