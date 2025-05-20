// Definición de un cliente en el sistema
export interface Client {
  // Campos del sistema
  id: string;
  created_at: string;
  last_login?: string;
  
  // Campos virtuales (calculados en la aplicación, no existen en la base de datos)
  name?: string; // VIRTUAL: Combinación de first_name + paternal_surname + maternal_surname
  warningMessage?: string; // VIRTUAL: Para comunicar mensajes de advertencia al frontend
  
  // Datos personales básicos (existentes en la tabla users)
  first_name?: string;
  paternal_surname?: string;
  maternal_surname?: string;
  email: string;
  phone: string;
  birth_date?: string;
  gender?: string;
  marital_status?: string;
  rfc?: string;
  curp?: string;
  
  // Dirección
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  street_number_ext?: string;
  street_number_int?: string;
  neighborhood?: string;
  home_phone?: string;
  birth_state?: string;
  nationality?: string;
  
  // Información de empleo
  employment_type?: string;
  employment_years?: number;
  job_position?: string;
  employer_name?: string;
  employer_phone?: string;
  employer_address?: string;
  employer_activity?: string;
  
  // Información financiera
  monthly_income?: number;
  additional_income?: number;
  monthly_expenses?: number;
  other_loan_balances?: number;
  mortgage_payment?: number;
  rent_payment?: number;
  dependent_persons?: number;
  income_frequency?: string;
  payment_method?: string;
  credit_purpose?: string;
  
  // Información familiar
  spouse_paternal_surname?: string;
  spouse_maternal_surname?: string;
  
  // Información bancaria
  bank_name?: string;
  bank_clabe?: string;
  bank_account_number?: string;
  bank_account_type?: string;
  bank_account_origin?: string;
  
  // Referencias
  reference1_name?: string;
  reference1_relationship?: string;
  reference1_address?: string;
  reference1_phone?: string;
  reference2_name?: string;
  reference2_relationship?: string;
  reference2_address?: string;
  reference2_phone?: string;
  
  // Relaciones
  company_id?: string;
  advisor_id?: string;
  
  // Campos adicionales (generalmente obtenidos por JOIN)
  company_name?: string; // Nombre de la empresa a la que pertenece el cliente
}

// Documento para subir al sistema
export interface ClientDocument {
  id?: string;
  file: File;
  category: string;
  name: string;
  description?: string;
  url?: string; // URL del documento una vez subido
} 