// Generated types for Supabase database
export interface Database {
  public: {
    Tables: {
      applications: {
        Row: {
          id: string;
          client_id: string;
          company_id: string;
          assigned_to: string;
          application_type: string;
          product_type?: string;
          requested_amount: number;
          status: string;
          status_previous?: string;
          advisor_status?: string;
          company_status?: string;
          global_status?: string;
          previous_status?: string;
          previous_advisor_status?: string;
          previous_company_status?: string;
          previous_global_status?: string;
          created_at: string;
          updated_at: string;
          client_name?: string;
          client_email?: string;
          client_phone?: string;
          client_address?: string;
          company_name?: string;
          advisor_name?: string;
          approved_by_advisor: boolean;
          approved_by_company: boolean;
          rejected_by_advisor?: boolean;
          rejected_by_company?: boolean;
          approval_date_advisor?: string;
          approval_date_company?: string;
          dispersal_date?: string;
          dni?: string;
          amount?: number;
          term?: number;
          interest_rate?: number;
          monthly_payment?: number;
          financing_type?: string;
          product_url?: string;
          product_title?: string;
          product_image?: string;
        };
        Insert: any;
        Update: any;
      };
      advisors: {
        Row: {
          id: string;
          user_id: string;
          first_name?: string;
          last_name?: string;
          email: string;
          phone?: string;
          specialization?: string;
          company_id?: string;
          created_at: string;
          updated_at?: string;
          status?: string;
        };
        Insert: any;
        Update: any;
      };
      // Define other tables as needed
    };
    Functions: {};
    Enums: {};
  };
}

export interface User {
  id: string;
  email: string;
  role: string;
  first_name?: string;
  last_name?: string;
  company_id?: string;
  created_at: string;
  updated_at?: string;
  status?: string;
  phone?: string;
}

export interface CompanyAdmin {
  id: string;
  email: string;
  company_id: string;
  created_at: string;
  role: string;
  first_name?: string;
  last_name?: string;
  status?: string;
  phone?: string;
}

// Ensure this is treated as a module
export {}; 