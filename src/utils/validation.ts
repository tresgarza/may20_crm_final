/**
 * Utility functions for form validation
 */

import { z } from 'zod';
import { ErrorType, createAppError } from './errorHandling';

/**
 * Basic validation rules for common field types
 */
export const ValidationRules = {
  required: (fieldName: string) => z.string().min(1, `${fieldName} es requerido`),
  email: z.string().email('Correo electrónico inválido'),
  phone: z.string().regex(/^\d{10}$/, 'Número telefónico debe tener 10 dígitos'),
  name: z.string().min(1, 'El nombre es requerido'),
  rfc: z.string().regex(/^[A-Z&Ñ]{3,4}\d{6}[A-Z\d]{3}$/, 'RFC inválido'),
  curp: z.string().regex(/^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z\d]\d$/, 'CURP inválido'),
  postalCode: z.string().regex(/^\d{5}$/, 'Código postal debe tener 5 dígitos'),
  numberString: z.string().regex(/^\d+$/, 'Solo números son permitidos'),
  currency: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Formato de moneda inválido'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)'),
  percentage: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Formato de porcentaje inválido'),
  alphabetical: z.string().regex(/^[a-zA-Z\s]+$/, 'Solo letras son permitidas'),
  alphanumeric: z.string().regex(/^[a-zA-Z0-9\s]+$/, 'Solo letras y números son permitidos'),
  clabe: z.string().regex(/^\d{18}$/, 'CLABE debe tener 18 dígitos'),
  accountNumber: z.string().regex(/^\d{10,20}$/, 'Número de cuenta debe tener entre 10 y 20 dígitos'),
}

/**
 * Interface for validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Validates a single field using the specified schema
 */
export const validateField = (value: unknown, schema: z.ZodType): { isValid: boolean; error: string | null } => {
  const result = schema.safeParse(value);
  if (!result.success) {
    return { 
      isValid: false, 
      error: result.error.errors[0]?.message || 'Valor inválido' 
    };
  }
  return { isValid: true, error: null };
};

/**
 * Validates multiple fields against a schema
 */
export const validateForm = <T extends Record<string, unknown>>(
  data: T,
  schema: z.ZodSchema<any>
): ValidationResult => {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { isValid: true, errors: {} };
  }
  
  const formattedErrors: Record<string, string> = {};
  
  result.error.errors.forEach((error) => {
    const path = error.path.join('.');
    formattedErrors[path] = error.message;
  });
  
  return { isValid: false, errors: formattedErrors };
};

/**
 * Creates a validation error with structured data
 */
export const createValidationError = (
  errors: Record<string, string>,
  message = 'Validation failed'
) => {
  return createAppError(
    ErrorType.VALIDATION,
    message,
    { validationErrors: errors }
  );
};

/**
 * Common schemas for reuse throughout the application
 */
export const Schemas = {
  /**
   * Client form schema
   */
  client: z.object({
    email: ValidationRules.email,
    first_name: ValidationRules.required('Nombre'),
    paternal_surname: ValidationRules.required('Apellido paterno'),
    maternal_surname: ValidationRules.required('Apellido materno'),
    phone: ValidationRules.phone,
    rfc: ValidationRules.rfc.optional().nullable(),
    curp: ValidationRules.curp.optional().nullable(),
    address: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    state: z.string().optional().nullable(),
    postal_code: ValidationRules.postalCode.optional().nullable(),
    birth_date: ValidationRules.date.optional().nullable(),
    company_id: z.string().optional().nullable(),
    advisor_id: z.string().optional().nullable(),
    monthly_income: z.string().or(z.number()).optional().nullable(),
    additional_income: z.string().or(z.number()).optional().nullable(),
    monthly_expenses: z.string().or(z.number()).optional().nullable(),
    other_loan_balances: z.string().or(z.number()).optional().nullable(),
    bank_name: z.string().optional().nullable(),
    bank_clabe: ValidationRules.clabe.optional().nullable(),
    bank_account_number: ValidationRules.accountNumber.optional().nullable(),
    bank_account_type: z.string().optional().nullable()
  }),
  
  /**
   * Login form schema
   */
  login: z.object({
    email: ValidationRules.email,
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres')
  }),

  /**
   * Reset password schema
   */
  resetPassword: z.object({
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
    confirmPassword: z.string()
  }).refine(data => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword']
  }),

  /**
   * Document upload schema
   */
  documentUpload: z.object({
    name: ValidationRules.required('Nombre del documento'),
    category: ValidationRules.required('Categoría'),
    file: z.instanceof(File, { message: 'Archivo es requerido' })
  }),

  /**
   * Application schema
   */
  application: z.object({
    client_id: z.string().uuid('ID de cliente inválido'),
    loan_amount: z.preprocess(
      val => typeof val === 'string' ? Number(val) || 0 : val,
      z.number().min(1, 'Monto requerido')
    ),
    loan_term: z.preprocess(
      val => typeof val === 'string' ? Number(val) || 0 : val,
      z.number().min(1, 'Plazo requerido')
    ),
    loan_type: z.string().min(1, 'Tipo de préstamo requerido'),
    interest_rate: z.preprocess(
      val => typeof val === 'string' ? Number(val) || 0 : val,
      z.number().min(0, 'Tasa de interés inválida')
    )
  })
};

/**
 * Validates a client object
 */
export const validateClient = (client: Record<string, unknown>): ValidationResult => {
  return validateForm(client, Schemas.client);
};

/**
 * Validates login credentials
 */
export const validateLogin = (credentials: Record<string, unknown>): ValidationResult => {
  return validateForm(credentials, Schemas.login);
};

/**
 * Validates document upload data
 */
export const validateDocument = (document: Record<string, unknown>): ValidationResult => {
  return validateForm(document, Schemas.documentUpload);
};

/**
 * Validates application data
 */
export const validateApplication = (application: Record<string, unknown>): ValidationResult => {
  return validateForm(application, Schemas.application);
};

/**
 * Extracts validation error messages from a Zod error
 */
export const extractZodErrors = (error: z.ZodError): Record<string, string> => {
  const errors: Record<string, string> = {};
  
  error.errors.forEach(err => {
    const path = err.path.join('.');
    errors[path] = err.message;
  });
  
  return errors;
};

/**
 * Validates an object against a schema and throws a formatted error if invalid
 */
export const validateOrThrow = <T>(
  data: unknown, 
  schema: z.ZodSchema<T>,
  errorMessage = 'Validation failed'
): T => {
  const result = schema.safeParse(data);
  
  if (!result.success) {
    const errors = extractZodErrors(result.error);
    throw createValidationError(errors, errorMessage);
  }
  
  return result.data;
}; 