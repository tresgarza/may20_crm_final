import { USER_ROLES } from './roles';

export enum PERMISSIONS {
  // Application permissions
  VIEW_APPLICATIONS = 'VIEW_APPLICATIONS',
  CREATE_APPLICATION = 'CREATE_APPLICATION',
  EDIT_APPLICATION = 'EDIT_APPLICATION',
  CHANGE_APPLICATION_STATUS = 'CHANGE_APPLICATION_STATUS',
  ASSIGN_APPLICATION = 'ASSIGN_APPLICATION',
  DELETE_APPLICATION = 'DELETE_APPLICATION',

  // Company permissions
  VIEW_COMPANIES = 'VIEW_COMPANIES',
  CREATE_COMPANY = 'CREATE_COMPANY',
  EDIT_COMPANY = 'EDIT_COMPANY',
  DELETE_COMPANY = 'DELETE_COMPANY',
  ASSIGN_COMPANY_ADMIN = 'ASSIGN_COMPANY_ADMIN',

  // Client permissions
  VIEW_CLIENTS = 'VIEW_CLIENTS',
  CREATE_CLIENT = 'CREATE_CLIENT',
  EDIT_CLIENT = 'EDIT_CLIENT',
  DELETE_CLIENT = 'DELETE_CLIENT',

  // Advisor permissions
  VIEW_ADVISORS = 'VIEW_ADVISORS',
  CREATE_ADVISOR = 'CREATE_ADVISOR',
  EDIT_ADVISOR = 'EDIT_ADVISOR',
  DELETE_ADVISOR = 'DELETE_ADVISOR',

  // Dashboard permissions
  VIEW_DASHBOARD = 'VIEW_DASHBOARD',
  VIEW_REPORTS = 'VIEW_REPORTS',
}

type UserRoleType = keyof typeof USER_ROLES;

export const ROLE_PERMISSIONS: Record<UserRoleType, PERMISSIONS[]> = {
  [USER_ROLES.SUPERADMIN]: Object.values(PERMISSIONS),
  [USER_ROLES.ADVISOR]: [
    PERMISSIONS.VIEW_APPLICATIONS,
    PERMISSIONS.CREATE_APPLICATION,
    PERMISSIONS.EDIT_APPLICATION,
    PERMISSIONS.CHANGE_APPLICATION_STATUS,
    PERMISSIONS.VIEW_COMPANIES,
    PERMISSIONS.VIEW_CLIENTS,
    PERMISSIONS.CREATE_CLIENT,
    PERMISSIONS.EDIT_CLIENT,
    PERMISSIONS.VIEW_DASHBOARD,
  ],
  [USER_ROLES.COMPANY_ADMIN]: [
    PERMISSIONS.VIEW_APPLICATIONS,
    PERMISSIONS.VIEW_COMPANIES,
    PERMISSIONS.VIEW_CLIENTS,
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.CHANGE_APPLICATION_STATUS,
  ],
};

export function hasPermission(userRole: UserRoleType, permission: PERMISSIONS): boolean {
  if (!userRole || !permission) return false;
  return ROLE_PERMISSIONS[userRole]?.includes(permission) || false;
}

export function hasAllPermissions(userRole: UserRoleType, permissions: PERMISSIONS[]): boolean {
  if (!userRole || !permissions.length) return false;
  return permissions.every(permission => hasPermission(userRole, permission));
}

export function hasAnyPermission(userRole: UserRoleType, permissions: PERMISSIONS[]): boolean {
  if (!userRole || !permissions.length) return false;
  return permissions.some(permission => hasPermission(userRole, permission));
} 