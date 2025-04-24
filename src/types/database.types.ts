export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          created_at: string
          email: string
          role: 'admin' | 'advisor' | 'client'
          first_name: string
          last_name: string
          phone: string | null
          status: 'active' | 'inactive'
        }
        Insert: {
          id?: string
          created_at?: string
          email: string
          role: 'admin' | 'advisor' | 'client'
          first_name: string
          last_name: string
          phone?: string | null
          status?: 'active' | 'inactive'
        }
        Update: {
          id?: string
          created_at?: string
          email?: string
          role?: 'admin' | 'advisor' | 'client'
          first_name?: string
          last_name?: string
          phone?: string | null
          status?: 'active' | 'inactive'
        }
      }
      company_admins: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          name: string
          email: string
          access_code: string
          company_id: string
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          name: string
          email: string
          access_code: string
          company_id: string
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          name?: string
          email?: string
          access_code?: string
          company_id?: string
        }
      }
      applications: {
        Row: {
          id: string
          created_at: string
          company_id: string
          advisor_id: string
          client_name: string
          amount: number
          status: 'pending' | 'approved' | 'rejected'
          application_type: 'product' | 'product_simulations'
          approval_date_company: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          company_id: string
          advisor_id: string
          client_name: string
          amount: number
          status?: 'pending' | 'approved' | 'rejected'
          application_type?: 'product' | 'product_simulations'
          approval_date_company?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          company_id?: string
          advisor_id?: string
          client_name?: string
          amount?: number
          status?: 'pending' | 'approved' | 'rejected'
          application_type?: 'product' | 'product_simulations'
          approval_date_company?: string | null
        }
      }
      clients: {
        Row: {
          id: string
          created_at: string
          user_id: string
          advisor_id: string | null
          company_name: string
          industry: string
          annual_revenue: number | null
          employee_count: number | null
          status: 'active' | 'inactive' | 'pending'
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          advisor_id?: string | null
          company_name: string
          industry: string
          annual_revenue?: number | null
          employee_count?: number | null
          status?: 'active' | 'inactive' | 'pending'
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          advisor_id?: string | null
          company_name?: string
          industry?: string
          annual_revenue?: number | null
          employee_count?: number | null
          status?: 'active' | 'inactive' | 'pending'
        }
      }
      advisors: {
        Row: {
          id: string
          created_at: string
          user_id: string
          specialization: string[]
          years_experience: number
          certification: string[]
          status: 'active' | 'inactive'
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          specialization?: string[]
          years_experience?: number
          certification?: string[]
          status?: 'active' | 'inactive'
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          specialization?: string[]
          years_experience?: number
          certification?: string[]
          status?: 'active' | 'inactive'
        }
      }
      meetings: {
        Row: {
          id: string
          created_at: string
          client_id: string
          advisor_id: string
          date: string
          status: 'scheduled' | 'completed' | 'cancelled'
          notes: string | null
          meeting_type: 'initial' | 'followup' | 'review'
          duration: number
        }
        Insert: {
          id?: string
          created_at?: string
          client_id: string
          advisor_id: string
          date: string
          status?: 'scheduled' | 'completed' | 'cancelled'
          notes?: string | null
          meeting_type: 'initial' | 'followup' | 'review'
          duration: number
        }
        Update: {
          id?: string
          created_at?: string
          client_id?: string
          advisor_id?: string
          date?: string
          status?: 'scheduled' | 'completed' | 'cancelled'
          notes?: string | null
          meeting_type?: 'initial' | 'followup' | 'review'
          duration?: number
        }
      }
      documents: {
        Row: {
          id: string
          created_at: string
          client_id: string
          advisor_id: string
          title: string
          type: 'contract' | 'report' | 'proposal' | 'other'
          status: 'draft' | 'pending' | 'approved' | 'rejected'
          file_url: string
          approval_date_client: string | null
          approval_date_advisor: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          client_id: string
          advisor_id: string
          title: string
          type: 'contract' | 'report' | 'proposal' | 'other'
          status?: 'draft' | 'pending' | 'approved' | 'rejected'
          file_url: string
          approval_date_client?: string | null
          approval_date_advisor?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          client_id?: string
          advisor_id?: string
          title?: string
          type?: 'contract' | 'report' | 'proposal' | 'other'
          status?: 'draft' | 'pending' | 'approved' | 'rejected'
          file_url?: string
          approval_date_client?: string | null
          approval_date_advisor?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Helper type to extract table types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]

// Commonly used types
export type User = Tables<'users'>['Row']
export type Client = Tables<'clients'>['Row']
export type Advisor = Tables<'advisors'>['Row']
export type CompanyAdmin = Tables<'company_admins'>['Row']
export type Meeting = Tables<'meetings'>['Row']
export type Document = Tables<'documents'>['Row']

// Insert types
export type UserInsert = Tables<'users'>['Insert']
export type ClientInsert = Tables<'clients'>['Insert']
export type AdvisorInsert = Tables<'advisors'>['Insert']
export type CompanyAdminInsert = Tables<'company_admins'>['Insert']
export type MeetingInsert = Tables<'meetings'>['Insert']
export type DocumentInsert = Tables<'documents'>['Insert']

// Update types
export type UserUpdate = Tables<'users'>['Update']
export type ClientUpdate = Tables<'clients'>['Update']
export type AdvisorUpdate = Tables<'advisors'>['Update']
export type CompanyAdminUpdate = Tables<'company_admins'>['Update']
export type MeetingUpdate = Tables<'meetings'>['Update']
export type DocumentUpdate = Tables<'documents'>['Update'] 