export interface Client {
  id: string;
  created_at?: string;
  name?: string;
  first_name?: string;
  paternal_surname?: string;
  maternal_surname?: string;
  email?: string;
  phone?: string;
  birth_date?: string;
  company_id?: string;
  rfc?: string;
  curp?: string;
  advisor_id?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  gender?: string;
  marital_status?: string;
  employment_type?: string;
  employment_years?: number;
  monthly_income?: number;
  additional_income?: number;
  monthly_expenses?: number;
  other_loan_balances?: number;
  bank_name?: string;
  bank_clabe?: string;
  bank_account_number?: string;
  bank_account_type?: string;
  bank_account_origin?: string;
  warningMessage?: string;

  // Financial fields from clientCoreService
  annual_income?: number;
  expected_annual_growth?: number;
  net_worth?: number;
  debt_amount?: number;
  investment_amount?: number;
  available_liquidity?: number;
  retirement_savings?: number;
  emergency_fund?: number;
  risk_tolerance?: number;
  [key: string]: any; // Index signature to allow string indexing
}

export interface ClientDocument {
  id?: string;
  file: File;
  name: string;
  category: string;
  description?: string;
  upload_date?: string;
  url?: string;
} 