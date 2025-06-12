/**
 * Utilidades para adaptar tipos y valores entre diferentes formatos
 */

/**
 * Comprueba si dos estados son iguales (case insensitive)
 */
export const statusEquals = (status1: string, status2: string): boolean => {
  return status1.toLowerCase() === status2.toLowerCase();
};

/**
 * Convierte un string a una key válida para un objeto de estados
 */
export const asStatusKey = (status: string): string => {
  return status.toUpperCase();
};

/**
 * Convierte una key de estado a un valor para mostrar
 */
export const asStatusValue = (statusKey: string): string => {
  return statusKey.toLowerCase();
};

/**
 * Asegura que un valor numérico sea tratado correctamente
 */
export const ensureAmount = (amount: number | string | undefined): number => {
  if (amount === undefined || amount === null) {
    return 0;
  }
  
  if (typeof amount === 'string') {
    return parseFloat(amount) || 0;
  }
  
  return amount;
}; 