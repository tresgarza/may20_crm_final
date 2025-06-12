import { USER_ROLES } from "../constants/roles";
import { APPLICATION_STATUS } from "../constants/statuses";
import { APPLICATION_TYPE } from "../constants/applications";

export interface User {
  id: string;
  email: string;
  role: typeof USER_ROLES[keyof typeof USER_ROLES];
  name?: string;
  avatar_url?: string;
  entityId?: string;
}

export interface Advisor {
  id: string;
  name: string;
  access_code: string;
  phone: string;
  email: string;
  position: string;
  created_at?: string;
  updated_at?: string;
}

export interface Company {
  id: string;
  name: string;
  employee_code: string;
  interest_rate: number;
  payment_frequency: string;
  payment_day: number;
  max_credit_amount: number;
  min_credit_amount: number;
  iva_rate: number;
  commission_rate: number;
  created_at?: string;
  updated_at?: string;
  Advisor?: string;
  advisor_id?: string;
  advisor_phone?: string;
}

export interface CompanyAdmin {
  id: string;
  name: string;
  email: string;
  access_code: string;
  company_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface Application {
  id: string;
  created_at: string;
  updated_at: string;
  application_type: keyof typeof APPLICATION_TYPE;
  source_id?: string;
  status: keyof typeof APPLICATION_STATUS;
  client_name: string;
  client_email: string;
  client_phone: string;
  client_address?: string;
  dni?: string;
  amount: number;
  term?: number;
  interest_rate?: number;
  monthly_payment?: number;
  company_id?: string;
  company_name?: string;
  assigned_to?: string;
  approved_by_advisor?: boolean;
  approved_by_company?: boolean;
  isMoving?: boolean;
  financing_type?: 'producto' | 'personal' | string;
  product_type?: string;
}

export interface StatusHistory {
  id: string;
  application_id: string;
  status: string;
  comment?: string;
  created_by: string;
  created_at: string;
}

export interface Comment {
  id: string;
  application_id: string;
  user_id: string;
  text: string;
  created_at: string;
}

export interface Document {
  id: string;
  application_id: string;
  file_name: string;
  file_type: string;
  file_path: string;
  uploaded_by: string;
  created_at: string;
  updated_at?: string;
}

export interface AutoLoanApplication {
  id: string;
  created_at: string;
  name: string;
  last_name: string;
  email: string;
  phone: string;
  car_price: number;
  down_payment: number;
  loan_amount: number;
  term_months: number;
  monthly_payment: number;
  status: string;
  approved_by_advisor: boolean;
  approved_by_company: boolean;
  comments?: string;
}

export interface CarBackedLoanApplication {
  id: string;
  created_at: string;
  name: string;
  last_name: string;
  email: string;
  phone: string;
  car_year: number;
  car_model: string;
  car_price: number;
  loan_amount: number;
  term_months: number;
  monthly_payment: number;
  status: string;
  approved_by_advisor: boolean;
  approved_by_company: boolean;
  comments?: string;
}

export interface CashRequest {
  id: string;
  user_first_name: string;
  user_last_name: string;
  company_id: string;
  company_name: string;
  company_code: string;
  user_income: number;
  payment_frequency: string;
  requested_amount: number;
  monthly_income: number;
  recommended_plans: any;
  selected_plan_id?: string;
  created_at?: string;
  updated_at?: string;
  user_phone?: string;
  commission_rate?: number;
  commission_amount?: number;
  net_amount?: number;
  is_preauthorized?: boolean;
  status?: string;
  approved_by_advisor?: boolean;
  approved_by_company?: boolean;
  comments?: string;
} 