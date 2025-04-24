import { 
  ErrorType, 
  createAppError, 
  logError 
} from './errorHandling';

/**
 * Verifica si un error es una violación de políticas RLS (Row Level Security)
 */
export const isRlsViolation = (error: any): boolean => {
  if (!error || !error.message) return false;
  
  return (
    error.message.includes('violates row-level security policy') ||
    error.message.includes('permission denied') ||
    error.message.includes('Unauthorized') ||
    error.message.includes('403')
  );
};

/**
 * Crea un error estandarizado para violaciones de políticas RLS
 */
export const createRlsViolationError = (
  operation: string,
  resourceType: string = 'recurso',
  originalError: any = null
) => {
  const errorMessage = `No tienes permisos para ${operation} este ${resourceType}. Esto puede deberse a políticas de seguridad RLS en Supabase.`;
  
  const rlsError = createAppError(
    ErrorType.AUTHORIZATION,
    errorMessage,
    { originalError: originalError?.message || 'RLS Policy Violation' }
  );
  
  // Registrar el error
  logError(rlsError, `${operation}.RLS_VIOLATION`);
  
  return rlsError;
};

/**
 * Crea un error estandarizado para operaciones sin efecto en la base de datos
 */
export const createNoEffectError = (
  operation: string,
  resourceType: string = 'recurso',
  resourceId: string | null = null
) => {
  const errorMessage = `La operación de ${operation} no tuvo efecto en la base de datos. Esto puede deberse a permisos insuficientes o a que los datos no cambiaron.`;
  
  const contextData: Record<string, any> = {};
  if (resourceId) {
    contextData[`${resourceType}Id`] = resourceId;
  }
  
  const noEffectError = createAppError(
    ErrorType.DATABASE,
    errorMessage,
    contextData
  );
  
  // Registrar el error
  logError(noEffectError, `${operation}.NO_EFFECT`, contextData);
  
  return noEffectError;
}; 
 