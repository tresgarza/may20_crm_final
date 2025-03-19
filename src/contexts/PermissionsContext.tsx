import React, { createContext, useContext, useState } from 'react';
import { useAuth } from './AuthContext';
import { PERMISSIONS, hasPermission, hasAllPermissions, hasAnyPermission } from '../utils/constants/permissions';
import { USER_ROLES } from '../utils/constants/roles';

interface PermissionsContextType {
  userCan: (permission: PERMISSIONS) => boolean;
  userCanAll: (permissions: PERMISSIONS[]) => boolean;
  userCanAny: (permissions: PERMISSIONS[]) => boolean;
  getEntityFilter: () => Record<string, any> | null;
  shouldFilterByEntity: () => boolean;
  isAdmin: () => boolean;
  isAdvisor: () => boolean;
  isCompanyAdmin: () => boolean;
  loadPermissions: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export const usePermissions = () => {
  const context = useContext(PermissionsContext);
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionsProvider');
  }
  return context;
};

export const PermissionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [userPermissions, setUserPermissions] = useState<string[]>([]);

  const userCan = (permission: PERMISSIONS): boolean => {
    if (!user || !user.role) return false;
    
    // El SUPERADMIN siempre tiene todos los permisos
    if (user.role === USER_ROLES.SUPERADMIN) {
      return true;
    }
    
    // Para otros roles, usar la función de utilidad
    return hasPermission(user.role as any, permission);
  };

  const userCanAll = (permissions: PERMISSIONS[]): boolean => {
    if (!user || !user.role) return false;
    
    // El SUPERADMIN siempre tiene todos los permisos
    if (user.role === USER_ROLES.SUPERADMIN) {
      return true;
    }
    
    // Para otros roles, verificar cada permiso
    return hasAllPermissions(user.role as any, permissions);
  };

  const userCanAny = (permissions: PERMISSIONS[]): boolean => {
    if (!user || !user.role) return false;
    
    // El SUPERADMIN siempre tiene todos los permisos
    if (user.role === USER_ROLES.SUPERADMIN) {
      return true;
    }
    
    // Para otros roles, verificar si tiene al menos un permiso
    return hasAnyPermission(user.role as any, permissions);
  };

  // Determina si se deben filtrar los datos por entidad (asesor o empresa)
  const shouldFilterByEntity = (): boolean => {
    if (!user || !user.role) return false;
    
    // Solo los roles de asesor y admin de empresa necesitan filtrado
    return user.role === USER_ROLES.ADVISOR || user.role === USER_ROLES.COMPANY_ADMIN;
  };

  // Obtiene el filtro apropiado según el rol del usuario
  const getEntityFilter = (): Record<string, any> | null => {
    if (!user || !user.role || !user.entityId) return null;
    
    // No filtrar para administradores
    if (user.role === USER_ROLES.SUPERADMIN) {
      return null;
    }
    
    // Filtro para asesores: solicitudes donde advisor_id = user.entityId
    if (user.role === USER_ROLES.ADVISOR) {
      return { advisor_id: user.entityId };
    }
    
    // Filtro para administradores de empresa: solicitudes donde company_id = user.entityId
    if (user.role === USER_ROLES.COMPANY_ADMIN) {
      return { company_id: user.entityId };
    }
    
    return null;
  };

  const isAdmin = () => {
    return user?.role === USER_ROLES.SUPERADMIN;
  };
  
  const isAdvisor = () => {
    return user?.role === USER_ROLES.ADVISOR;
  };
  
  const isCompanyAdmin = () => {
    return user?.role === USER_ROLES.COMPANY_ADMIN;
  };

  const loadPermissions = async () => {
    // Implementation of loadPermissions
  };

  const value = {
    userCan,
    userCanAll,
    userCanAny,
    shouldFilterByEntity,
    getEntityFilter,
    isAdmin,
    isAdvisor,
    isCompanyAdmin,
    loadPermissions,
  };

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
}; 