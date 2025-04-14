/**
 * Utility functions for error handling throughout the application
 */

import { PostgrestError } from '@supabase/supabase-js';
import { toast } from 'react-hot-toast';

/**
 * Error types for common application errors
 */
export enum ErrorType {
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  SERVER = 'SERVER',
  NETWORK = 'NETWORK',
  UPLOAD = 'UPLOAD',
  NOT_FOUND = 'NOT_FOUND',
  DATABASE = 'DATABASE',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Standard interface for API errors
 */
export interface ApiError {
  message: string;
  code?: string;
  details?: string;
  context?: string;
  handled?: boolean;
}

/**
 * Standard error shape for the application
 */
export interface AppError {
  type: ErrorType;
  message: string;
  details?: Record<string, unknown>;
  originalError?: unknown;
}

/**
 * Creates a standardized error object from any error type
 * @param error The original error
 * @param context Additional context information about where the error occurred
 * @returns A standardized API error object
 */
export const formatApiError = (error: any, context: string): ApiError => {
  // Default error message
  let formattedError: ApiError = {
    message: 'Error desconocido',
    context
  };

  // Handle Error object
  if (error instanceof Error) {
    formattedError.message = error.message;
  } 
  // Handle Supabase-style errors
  else if (typeof error === 'object' && error !== null) {
    if (error.message) {
      formattedError.message = error.message;
    }
    
    if (error.code) {
      formattedError.code = error.code;
      
      // Add more descriptive messages for specific error codes
      if (error.code === '23505') {
        formattedError.message = 'Ya existe un registro con estos datos.';
      } else if (error.code === '42P01') {
        formattedError.message = 'La tabla no existe en la base de datos.';
      }
    }
    
    if (error.details) {
      formattedError.details = error.details;
    }
  }
  
  return formattedError;
};

/**
 * Creates a user-friendly error message from an API error
 * @param error The API error object
 * @returns A user-friendly error message
 */
export const getUserFriendlyErrorMessage = (error: ApiError): string => {
  // Use the original message if already user-friendly
  if (error.handled) {
    return error.message;
  }
  
  // Generic user-friendly messages based on context
  if (error.context === 'document-upload') {
    return `Error al subir documentos: ${error.message}`;
  }
  
  if (error.context === 'client-update') {
    return `Error al actualizar cliente: ${error.message}`;
  }
  
  if (error.context === 'client-create') {
    return `Error al crear cliente: ${error.message}`;
  }
  
  if (error.context?.includes('fetch')) {
    return `Error al cargar datos: ${error.message}`;
  }
  
  // Default message
  return `Error: ${error.message}`;
};

/**
 * Creates an application error with standard shape
 */
export const createAppError = (
  type: ErrorType,
  message: string,
  details?: Record<string, unknown>,
  originalError?: unknown
): AppError => ({
  type,
  message,
  details,
  originalError
});

/**
 * Shows error toast with appropriate messaging
 */
export const showErrorToast = (
  error: AppError | string,
  title?: string
) => {
  const message = typeof error === 'string' 
    ? error 
    : error.message || 'An unexpected error occurred';
  
  toast.error(message, {
    duration: 5000
  });
};

/**
 * Determines if an error is a specific type
 */
export const isErrorType = (error: AppError, type: ErrorType): boolean => {
  return error.type === type;
};

/**
 * Determines if an error is a network error
 */
export const isNetworkError = (error: unknown): boolean => {
  return (
    error instanceof Error && 
    (error.message.includes('network') || 
     error.message.includes('offline') ||
     error.message.includes('failed to fetch') ||
     error.message.includes('NetworkError'))
  );
};

/**
 * Determines if an error is a server error
 */
export const isServerError = (error: unknown): boolean => {
  return (
    error instanceof Error && 
    (error.message.includes('500') || 
     error.message.includes('server error'))
  );
};

/**
 * Determines if an error is a transient error that may succeed on retry
 */
export const isTransientError = (error: unknown): boolean => {
  if (error instanceof Error) {
    return (
      isNetworkError(error) ||
      isServerError(error) ||
      error.message.includes('timeout') ||
      error.message.includes('rate limit')
    );
  }
  return false;
};

/**
 * Handles API errors and returns a standardized AppError
 */
export const handleApiError = (error: unknown): AppError => {
  if (error instanceof Error) {
    if (error.message.includes('401') || error.message.includes('authentication')) {
      return createAppError(
        ErrorType.AUTHENTICATION,
        'Authentication failed. Please log in again.',
        {},
        error
      );
    }
    
    if (error.message.includes('403') || error.message.includes('permission')) {
      return createAppError(
        ErrorType.AUTHORIZATION,
        'You do not have permission to perform this action.',
        {},
        error
      );
    }
    
    if (error.message.includes('404') || error.message.includes('not found')) {
      return createAppError(
        ErrorType.NOT_FOUND,
        'The requested resource was not found.',
        {},
        error
      );
    }
    
    if (isNetworkError(error)) {
      return createAppError(
        ErrorType.NETWORK,
        'A network error occurred. Please check your connection and try again.',
        {},
        error
      );
    }
    
    if (isServerError(error)) {
      return createAppError(
        ErrorType.SERVER,
        'A server error occurred. Please try again later.',
        {},
        error
      );
    }
  }
  
  return createAppError(
    ErrorType.UNKNOWN,
    'An unexpected error occurred.',
    {},
    error
  );
};

/**
 * Safely parses API response to extract error details
 */
export const parseApiErrorResponse = (response: Response): Promise<AppError> => {
  return response.json()
    .then(data => {
      if (data && data.error) {
        return createAppError(
          data.type || ErrorType.UNKNOWN,
          data.error || 'An error occurred',
          data.details || {},
          null
        );
      }
      
      return createAppError(
        ErrorType.UNKNOWN,
        'An unexpected error occurred',
        {},
        null
      );
    })
    .catch(() => {
      return createAppError(
        ErrorType.UNKNOWN,
        `${response.status}: ${response.statusText || 'An error occurred'}`,
        {},
        null
      );
    });
};

/**
 * Log error information with standard formatting
 */
export const logError = (
  error: unknown,
  context: string,
  additionalInfo?: Record<string, any>
): void => {
  // In production, send to logging service
  // For development, just log to console
  console.error(`Error in ${context}:`, error);
  
  if (additionalInfo) {
    console.error('Additional info:', additionalInfo);
  }
  
  // If AppError, log its details
  if (error && typeof error === 'object' && 'type' in error) {
    const appError = error as AppError;
    console.error('Error type:', appError.type);
    console.error('Error message:', appError.message);
    if (appError.details) {
      console.error('Error details:', appError.details);
    }
    if (appError.originalError) {
      console.error('Original error:', appError.originalError);
    }
  }
};

/**
 * Parses an unknown error into a standardized AppError format
 */
export const parseError = (error: unknown): AppError => {
  // Handle PostgrestError
  if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
    const pgError = error as PostgrestError;
    return createAppError(
      pgError.code ? ErrorType.DATABASE : ErrorType.UNKNOWN,
      pgError.message,
      { details: pgError.details, hint: pgError.hint },
      error
    );
  }
  
  // Handle Error objects
  if (error instanceof Error) {
    // Convert to AppError format
    return createAppError(
      ErrorType.UNKNOWN,
      error.message,
      {},
      error
    );
  }
  
  // Handle string errors
  if (typeof error === 'string') {
    return createAppError(
      ErrorType.UNKNOWN,
      error
    );
  }
  
  // Generic fallback for unknown error types
  return createAppError(
    ErrorType.UNKNOWN,
    'An unknown error occurred',
    { rawError: error }
  );
};

/**
 * Safely handles promises and returns a standardized response
 * @param promise The promise to execute
 * @param errorContext Context string for error logging
 * @returns A tuple of [data, error]
 */
export const safeAsync = async <T>(
  promise: Promise<T>,
  errorContext: string
): Promise<[T | null, AppError | null]> => {
  try {
    const data = await promise;
    return [data, null];
  } catch (error) {
    const appError = parseError(error);
    logError(appError, errorContext);
    return [null, appError];
  }
};

/**
 * Checks if an error is related to Row Level Security violations
 * @param error The error to check
 * @returns Boolean indicating if this is an RLS violation
 */
export const isRlsViolation = (error: any): boolean => {
  if (!error || !error.message) return false;
  
  return error.message.includes('violates row-level security policy') ||
    error.message.includes('permission denied') ||
    error.message.includes('Unauthorized') ||
    error.message.includes('403');
};

/**
 * Creates a standard RLS violation error
 * @param operation The operation that was attempted (e.g., 'update', 'delete')
 * @param resourceType The type of resource (e.g., 'client', 'application')
 * @param resourceId The ID of the resource
 * @param originalError The original error object
 * @returns A standardized App Error for RLS violations
 */
export const createRlsViolationError = (
  operation: string,
  resourceType: string,
  resourceId: string,
  originalError: any
) => {
  const rlsError = createAppError(
    ErrorType.AUTHORIZATION,
    `No tienes permisos para ${operation} este ${resourceType}. Esto puede deberse a políticas de seguridad RLS en Supabase.`,
    { originalError: originalError?.message || 'Unknown error' }
  );
  
  logError(rlsError, `${operation}${resourceType}.RLS_VIOLATION`, { [`${resourceType}Id`]: resourceId });
  
  return rlsError;
};

/**
 * Creates a standard no-effect error for database operations that didn't affect any rows
 * @param operation The operation that was attempted (e.g., 'update', 'delete')
 * @param resourceType The type of resource (e.g., 'client', 'application')
 * @param resourceId The ID of the resource
 * @returns A standardized App Error for no-effect operations
 */
export const createNoEffectError = (
  operation: string,
  resourceType: string,
  resourceId: string
) => {
  const operationName = operation === 'update' ? 'actualización' : 
                         operation === 'delete' ? 'eliminación' : operation;
  
  const noEffectError = createAppError(
    ErrorType.DATABASE,
    `La ${operationName} no tuvo efecto en la base de datos. Esto puede deberse a permisos insuficientes.`,
    { [`${resourceType}Id`]: resourceId }
  );
  
  logError(noEffectError, `${operation}${resourceType}.NO_EFFECT`, { [`${resourceType}Id`]: resourceId });
  
  return noEffectError;
}; 