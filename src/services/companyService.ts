import { supabase } from '../lib/supabaseClient';
import { TABLES } from '../utils/constants/tables';

export interface Company {
  id: string;
  created_at: string;
  name: string;
  rfc: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  status: 'active' | 'inactive';
  logo_url?: string;
  advisor_id?: string;
  max_loan_amount?: number;
  interest_rate?: number;
  max_loan_term?: number;
}

export interface CompanyFilter {
  searchQuery?: string;
  advisor_id?: string;
  status?: 'active' | 'inactive' | 'all';
}

const COMPANIES_TABLE = TABLES.COMPANIES;
const COMPANY_ADMINS_TABLE = TABLES.COMPANY_ADMINS;

// Get all companies with filters
export const getCompanies = async (filters?: CompanyFilter) => {
  let query = supabase.from(COMPANIES_TABLE).select('*');

  // Apply filters
  if (filters) {
    // Filter by advisor
    if (filters.advisor_id) {
      query = query.eq('advisor_id', filters.advisor_id);
    }

    // Filter by status
    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    // Search by name, rfc or contact
    if (filters.searchQuery) {
      query = query.or(
        `name.ilike.%${filters.searchQuery}%,rfc.ilike.%${filters.searchQuery}%,contact_name.ilike.%${filters.searchQuery}%,contact_email.ilike.%${filters.searchQuery}%`
      );
    }
  }

  // Order by name
  query = query.order('name', { ascending: true });

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching companies:', error);
    throw error;
  }

  return data as Company[];
};

// Get a single company by ID
export const getCompanyById = async (id: string) => {
  const { data, error } = await supabase
    .from(COMPANIES_TABLE)
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error(`Error fetching company with ID ${id}:`, error);
    throw error;
  }

  return data as Company;
};

// Create a new company
export const createCompany = async (company: Omit<Company, 'id' | 'created_at'>) => {
  const { data, error } = await supabase
    .from(COMPANIES_TABLE)
    .insert([company])
    .select();

  if (error) {
    console.error('Error creating company:', error);
    throw error;
  }

  return data[0] as Company;
};

// Update an existing company
export const updateCompany = async (id: string, updates: Partial<Company>) => {
  const { data, error } = await supabase
    .from(COMPANIES_TABLE)
    .update(updates)
    .eq('id', id)
    .select();

  if (error) {
    console.error(`Error updating company with ID ${id}:`, error);
    throw error;
  }

  return data[0] as Company;
};

// Delete a company
export const deleteCompany = async (id: string) => {
  const { error } = await supabase
    .from(COMPANIES_TABLE)
    .delete()
    .eq('id', id);

  if (error) {
    console.error(`Error deleting company with ID ${id}:`, error);
    throw error;
  }

  return true;
};

// Get company administrators
export const getCompanyAdmins = async (companyId: string) => {
  const { data, error } = await supabase
    .from(COMPANY_ADMINS_TABLE)
    .select(`
      *,
      user:user_id (id, name, email, phone)
    `)
    .eq('company_id', companyId);

  if (error) {
    console.error(`Error fetching admins for company ${companyId}:`, error);
    throw error;
  }

  return data;
};

// Add administrator to company
export const addCompanyAdmin = async (companyId: string, userId: string) => {
  const { data, error } = await supabase
    .from(COMPANY_ADMINS_TABLE)
    .insert([{ company_id: companyId, user_id: userId }])
    .select();

  if (error) {
    console.error(`Error adding admin to company ${companyId}:`, error);
    throw error;
  }

  return data[0];
};

// Remove administrator from company
export const removeCompanyAdmin = async (companyId: string, userId: string) => {
  const { error } = await supabase
    .from(COMPANY_ADMINS_TABLE)
    .delete()
    .eq('company_id', companyId)
    .eq('user_id', userId);

  if (error) {
    console.error(`Error removing admin from company ${companyId}:`, error);
    throw error;
  }

  return true;
};

// Check if a user is admin of a company
export const isCompanyAdmin = async (companyId: string, userId: string) => {
  const { data, error } = await supabase
    .from(COMPANY_ADMINS_TABLE)
    .select('id')
    .eq('company_id', companyId)
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
    console.error(`Error checking admin status for company ${companyId}:`, error);
    throw error;
  }

  return !!data;
};

// Get company clients
export const getCompanyClients = async (companyId: string) => {
  const { data, error } = await supabase
    .from(TABLES.CLIENTS)
    .select('*')
    .eq('company_id', companyId)
    .order('name', { ascending: true });

  if (error) {
    console.error(`Error fetching clients for company ${companyId}:`, error);
    throw error;
  }

  return data;
};

// Get company applications
export const getCompanyApplications = async (companyId: string, limit?: number) => {
  let query = supabase
    .from(TABLES.APPLICATIONS)
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error(`Error fetching applications for company ${companyId}:`, error);
    throw error;
  }

  return data;
};

// Get companies for a specific advisor
export const getCompaniesForAdvisor = async (advisorId: string) => {
  try {
    console.log(`Fetching companies for advisor ID: ${advisorId}`);
    
    // Query companies where advisor_id matches the provided ID
    const { data, error } = await supabase
      .from(COMPANIES_TABLE)
      .select('*')
      .eq('advisor_id', advisorId)
      .order('name', { ascending: true });

    if (error) {
      console.error(`Error fetching companies for advisor ${advisorId}:`, error);
      throw error;
    }

    console.log(`Found ${data?.length || 0} companies for advisor ${advisorId}`);
    return data as Company[];
  } catch (err) {
    console.error('Error in getCompaniesForAdvisor:', err);
    // Return empty array in case of error to avoid breaking the UI
    return [] as Company[];
  }
}; 