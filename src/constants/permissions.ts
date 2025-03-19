export enum PERMISSIONS {
  // Dashboard
  VIEW_DASHBOARD = 'VIEW_DASHBOARD',
  
  // Applications
  VIEW_APPLICATIONS = 'VIEW_APPLICATIONS',
  CREATE_APPLICATION = 'CREATE_APPLICATION',
  EDIT_APPLICATION = 'EDIT_APPLICATION',
  DELETE_APPLICATION = 'DELETE_APPLICATION',
  
  // Clients
  VIEW_CLIENTS = 'VIEW_CLIENTS',
  CREATE_CLIENT = 'CREATE_CLIENT',
  EDIT_CLIENT = 'EDIT_CLIENT',
  DELETE_CLIENT = 'DELETE_CLIENT',
  
  // Reports
  VIEW_REPORTS = 'VIEW_REPORTS',
  
  // Users
  VIEW_USERS = 'VIEW_USERS',
  CREATE_USER = 'CREATE_USER',
  EDIT_USER = 'EDIT_USER',
  DELETE_USER = 'DELETE_USER',
  
  // Settings
  VIEW_SETTINGS = 'VIEW_SETTINGS',
  EDIT_SETTINGS = 'EDIT_SETTINGS',
}

export type Permission = keyof typeof PERMISSIONS;

export type UserRole = 'admin' | 'manager' | 'agent' | 'analyst';

// Define which permissions each role has
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: Object.keys(PERMISSIONS) as Permission[],
  
  manager: [
    'VIEW_DASHBOARD',
    'VIEW_APPLICATIONS',
    'CREATE_APPLICATION',
    'EDIT_APPLICATION',
    'VIEW_CLIENTS',
    'CREATE_CLIENT',
    'EDIT_CLIENT',
    'VIEW_REPORTS',
    'VIEW_USERS',
  ],
  
  agent: [
    'VIEW_DASHBOARD',
    'VIEW_APPLICATIONS',
    'CREATE_APPLICATION',
    'VIEW_CLIENTS',
    'CREATE_CLIENT',
    'EDIT_CLIENT',
  ],
  
  analyst: [
    'VIEW_DASHBOARD',
    'VIEW_APPLICATIONS',
    'EDIT_APPLICATION',
    'VIEW_CLIENTS',
    'VIEW_REPORTS',
  ],
}; 