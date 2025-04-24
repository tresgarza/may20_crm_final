import { supabase } from '../lib/supabaseClient';
import { TABLES } from '../utils/constants/tables';

export interface Advisor {
  id: string;
  created_at: string;
  name: string;
  email: string;
  phone: string;
  position: string;
  access_code: string;
  status?: 'active' | 'inactive';
}

export interface AdvisorFilter {
  searchQuery?: string;
  status?: 'active' | 'inactive' | 'all';
}

const ADVISORS_TABLE = TABLES.ADVISORS;

// Get all advisors with filters
export const getAdvisors = async (filters?: AdvisorFilter) => {
  let query = supabase.from(ADVISORS_TABLE).select('*');

  // Apply filters
  if (filters) {
    // Filter by status
    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    // Search by name, email, phone or access code
    if (filters.searchQuery) {
      query = query.or(
        `name.ilike.%${filters.searchQuery}%,email.ilike.%${filters.searchQuery}%,phone.ilike.%${filters.searchQuery}%,access_code.ilike.%${filters.searchQuery}%`
      );
    }
  }

  // Order by name
  query = query.order('name', { ascending: true });

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching advisors:', error);
    throw error;
  }

  return data as Advisor[];
};

// Get a single advisor by ID
export const getAdvisorById = async (id: string) => {
  const { data, error } = await supabase
    .from(ADVISORS_TABLE)
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error(`Error fetching advisor with ID ${id}:`, error);
    throw error;
  }

  return data as Advisor;
};

// Get advisor by access code
export const getAdvisorByAccessCode = async (accessCode: string) => {
  const { data, error } = await supabase
    .from(ADVISORS_TABLE)
    .select('*')
    .eq('access_code', accessCode)
    .single();

  if (error) {
    console.error(`Error fetching advisor with access code ${accessCode}:`, error);
    throw error;
  }

  return data as Advisor;
};

// Create a new advisor
export const createAdvisor = async (advisor: Omit<Advisor, 'id' | 'created_at'>) => {
  const { data, error } = await supabase
    .from(ADVISORS_TABLE)
    .insert([advisor])
    .select();

  if (error) {
    console.error('Error creating advisor:', error);
    throw error;
  }

  return data[0] as Advisor;
};

// Update an existing advisor
export const updateAdvisor = async (id: string, updates: Partial<Advisor>) => {
  const { data, error } = await supabase
    .from(ADVISORS_TABLE)
    .update(updates)
    .eq('id', id)
    .select();

  if (error) {
    console.error(`Error updating advisor with ID ${id}:`, error);
    throw error;
  }

  return data[0] as Advisor;
};

// Delete an advisor
export const deleteAdvisor = async (id: string) => {
  const { error } = await supabase
    .from(ADVISORS_TABLE)
    .delete()
    .eq('id', id);

  if (error) {
    console.error(`Error deleting advisor with ID ${id}:`, error);
    throw error;
  }

  return true;
};

// Get advisor's assigned companies
export const getAdvisorCompanies = async (advisorId: string) => {
  const { data, error } = await supabase
    .from(TABLES.COMPANIES)
    .select('*')
    .eq('advisor_id', advisorId)
    .order('name', { ascending: true });

  if (error) {
    console.error(`Error fetching companies for advisor ${advisorId}:`, error);
    throw error;
  }

  return data;
};

// Get advisor's applications
export const getAdvisorApplications = async (advisorId: string, limit?: number) => {
  let query = supabase
    .from(TABLES.APPLICATIONS)
    .select('*')
    .eq('advisor_id', advisorId)
    .order('created_at', { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error(`Error fetching applications for advisor ${advisorId}:`, error);
    throw error;
  }

  return data;
};

// Get advisor's clients
export const getAdvisorClients = async (advisorId: string) => {
  const { data, error } = await supabase
    .from(TABLES.CLIENTS)
    .select('*')
    .eq('advisor_id', advisorId)
    .order('name', { ascending: true });

  if (error) {
    console.error(`Error fetching clients for advisor ${advisorId}:`, error);
    throw error;
  }

  return data;
};

// Get advisor statistics
export const getAdvisorStatistics = async (advisorId: string) => {
  // Get total applications
  const { count: totalApplications, error: appError } = await supabase
    .from(TABLES.APPLICATIONS)
    .select('id', { count: 'exact', head: true })
    .eq('advisor_id', advisorId);

  if (appError) {
    console.error(`Error fetching application count for advisor ${advisorId}:`, appError);
    throw appError;
  }

  // Get applications by status using a raw query approach
  const { data: statusData, error: statusError } = await supabase
    .rpc('get_applications_by_status', { advisor_id_param: advisorId });

  if (statusError) {
    console.error(`Error fetching application status for advisor ${advisorId}:`, statusError);
    throw statusError;
  }

  // Get total companies
  const { count: totalCompanies, error: compError } = await supabase
    .from(TABLES.COMPANIES)
    .select('id', { count: 'exact', head: true })
    .eq('advisor_id', advisorId);

  if (compError) {
    console.error(`Error fetching company count for advisor ${advisorId}:`, compError);
    throw compError;
  }

  // Get total clients
  const { count: totalClients, error: clientError } = await supabase
    .from(TABLES.CLIENTS)
    .select('id', { count: 'exact', head: true })
    .eq('advisor_id', advisorId);

  if (clientError) {
    console.error(`Error fetching client count for advisor ${advisorId}:`, clientError);
    throw clientError;
  }

  return {
    totalApplications,
    applicationsByStatus: statusData || [],
    totalCompanies,
    totalClients
  };
}; 