// Generated types for Supabase database
export type Database = {
  public: {
    Tables: {
      applications: {
        Row: {
          id: string;
          client_id?: string;
          client_name?: string;
          company_id?: string;
          company_name?: string;
          assigned_to?: string;
          status?: string;
          amount?: number;
          application_type?: string;
          created_at?: string;
          updated_at?: string;
          approved_by_advisor?: boolean;
          approved_by_company?: boolean;
          rejected_by_advisor?: boolean;
          rejected_by_company?: boolean;
          approval_date_advisor?: string;
          approval_date_company?: string;
          financing_type?: string;
          product_type?: string;
          docusign_envelope_id?: string | null;
          docusign_sent_to?: string | null;
          docusign_manual_status?: string | null;
          deletedAt?: string | null;
          [key: string]: any;
        };
      };
      advisors: {
        Row: {
          id: string;
          user_id?: string;
          email?: string;
          name?: string;
          access_code?: string;
          specialization?: string;
          company_id?: string;
          [key: string]: any;
        };
      };
      companies: {
        Row: {
          id: string;
          name?: string;
          [key: string]: any;
        };
      };
      clients: {
        Row: {
          id: string;
          [key: string]: any;
        };
      };
      users: {
        Row: {
          id: string;
          first_name?: string;
          last_name?: string;
          email?: string;
          [key: string]: any;
        };
      };
    };
    Functions: {};
    Enums: {};
  };
};

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