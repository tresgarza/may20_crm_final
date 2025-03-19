export const USER_ROLES = {
  SUPERADMIN: 'SUPERADMIN',
  ADVISOR: 'ADVISOR',
  COMPANY_ADMIN: 'COMPANY_ADMIN',
} as const;

export const ROLE_LABELS = {
  [USER_ROLES.SUPERADMIN]: 'Administrador',
  [USER_ROLES.ADVISOR]: 'Asesor',
  [USER_ROLES.COMPANY_ADMIN]: 'Admin de Empresa',
} as const; 