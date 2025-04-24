/**
 * Application status constants
 */
export enum APPLICATION_STATUS {
  PENDING = 'pending',
  IN_REVIEW = 'in_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
  COMPLETED = 'completed',
  SOLICITUD = 'solicitud',
  NEW = 'new',
  POR_DISPERSAR = 'por_dispersar'
}

export const STATUS_LABELS = {
  [APPLICATION_STATUS.NEW]: 'Nuevo',
  [APPLICATION_STATUS.PENDING]: 'Pendiente',
  [APPLICATION_STATUS.IN_REVIEW]: 'En Revisión',
  [APPLICATION_STATUS.APPROVED]: 'Aprobado',
  [APPLICATION_STATUS.REJECTED]: 'Rechazado',
  [APPLICATION_STATUS.POR_DISPERSAR]: 'Por Dispersar',
  [APPLICATION_STATUS.COMPLETED]: 'Completado',
  [APPLICATION_STATUS.CANCELLED]: 'Cancelado',
  [APPLICATION_STATUS.EXPIRED]: 'Expirado',
  [APPLICATION_STATUS.SOLICITUD]: 'Pendiente'
};

// These are theme-based colors (not actual hex colors)
export const STATUS_THEME_COLORS = {
  [APPLICATION_STATUS.NEW]: 'info',
  [APPLICATION_STATUS.PENDING]: 'warning',
  [APPLICATION_STATUS.IN_REVIEW]: 'secondary',
  [APPLICATION_STATUS.APPROVED]: 'success',
  [APPLICATION_STATUS.REJECTED]: 'error',
  [APPLICATION_STATUS.POR_DISPERSAR]: 'accent',
  [APPLICATION_STATUS.COMPLETED]: 'primary',
  [APPLICATION_STATUS.CANCELLED]: 'neutral',
  [APPLICATION_STATUS.EXPIRED]: 'error',
  [APPLICATION_STATUS.SOLICITUD]: 'warning'
};

// Actual hex colors for chart usage
export const STATUS_COLORS = {
  [APPLICATION_STATUS.NEW]: '#3ABFF8',         // bright blue
  [APPLICATION_STATUS.PENDING]: '#FBBD23',     // amber/yellow
  [APPLICATION_STATUS.IN_REVIEW]: '#D926AA',   // magenta/purple
  [APPLICATION_STATUS.APPROVED]: '#36D399',    // green
  [APPLICATION_STATUS.REJECTED]: '#F87272',    // red
  [APPLICATION_STATUS.POR_DISPERSAR]: '#62A0EA', // light blue
  [APPLICATION_STATUS.COMPLETED]: '#570DF8',   // primary blue
  [APPLICATION_STATUS.CANCELLED]: '#6E6E6E',   // gray
  [APPLICATION_STATUS.EXPIRED]: '#FF5757',     // bright red
  [APPLICATION_STATUS.SOLICITUD]: '#FFCE00'    // gold/yellow
}; 