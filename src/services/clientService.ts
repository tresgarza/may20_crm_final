import { supabase } from '../lib/supabaseClient';
import { TABLES } from '../utils/constants/tables';

export interface Client {
  id: string;
  created_at: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  birth_date?: string;
  rfc?: string;
  curp?: string;
  company_id?: string;
  advisor_id?: string;
}

export interface ClientFilter {
  searchQuery?: string;
  advisor_id?: string;
  company_id?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

const CLIENTS_TABLE = TABLES.CLIENTS;

// Get all clients with filters
export const getClients = async (filters?: ClientFilter) => {
  try {
    let query = supabase.from(CLIENTS_TABLE).select('*', { count: 'exact' });

    // Apply filters
    if (filters) {
      // Filter by advisor
      if (filters.advisor_id) {
        query = query.eq('advisor_id', filters.advisor_id);
      }

      // Filter by company
      if (filters.company_id) {
        query = query.eq('company_id', filters.company_id);
      }

      // Filter by date range
      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }

      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }

      // Search by name, email, phone, RFC or CURP
      if (filters.searchQuery) {
        query = query.or(
          `name.ilike.%${filters.searchQuery}%,email.ilike.%${filters.searchQuery}%,phone.ilike.%${filters.searchQuery}%,rfc.ilike.%${filters.searchQuery}%,curp.ilike.%${filters.searchQuery}%`
        );
      }

      // Apply pagination if provided
      if (filters.page !== undefined && filters.pageSize) {
        const from = filters.page * filters.pageSize;
        const to = from + filters.pageSize - 1;
        query = query.range(from, to);
      }
    }

    // Order by most recent first
    query = query.order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      // Check if the error is because the table doesn't exist
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        console.warn('Clients table does not exist. Using fallback empty list.');
        return {
          clients: [],
          totalCount: 0
        };
      }
      
      console.error('Error fetching clients:', error);
      throw error;
    }

    return {
      clients: data as Client[],
      totalCount: count || 0
    };
  } catch (error) {
    // For any other errors, return an empty list
    console.error('Error in getClients:', error);
    return {
      clients: [],
      totalCount: 0
    };
  }
};

// Get a single client by ID
export const getClientById = async (id: string) => {
  try {
    const { data, error } = await supabase
      .from(CLIENTS_TABLE)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      // Check if the error is because the table doesn't exist
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        console.warn('Clients table does not exist. Returning empty client.');
        throw new Error('Clients table does not exist');
      }
      
      console.error(`Error fetching client with ID ${id}:`, error);
      throw error;
    }

    return data as Client;
  } catch (error) {
    console.error(`Error in getClientById:`, error);
    throw error; // Rethrow as this is a single client request, caller should handle
  }
};

// Función para escapar cadenas de texto para SQL
function escapeSQLString(str: string) {
  if (!str) return '';
  return str.replace(/'/g, "''");
}

// Get client applications
export const getClientApplications = async (clientId: string) => {
  // Consultar aplicaciones usando MCP en lugar de Supabase
  try {
    // Primero obtenemos el cliente para saber su nombre
    const client = await getClientById(clientId).catch(err => {
      // If clients table doesn't exist, use a workaround
      if (err.message === 'Clients table does not exist') {
        return null;
      }
      throw err;
    });
    
    if (!client) {
      console.warn('Client not found or clients table does not exist. Returning empty applications list.');
      return [];
    }
    
    // Luego usamos el nombre del cliente para buscar aplicaciones
    const query = `
      SELECT * FROM ${TABLES.APPLICATIONS}
      WHERE client_name = '${escapeSQLString(client.name)}'
      ORDER BY created_at DESC
    `;
    
    // Usamos executeQuery que es el método para el MCP
    const executeQuery = async (query: string) => {
      try {
        const response = await fetch('http://localhost:3100/query', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query }),
        });
        
        const result = await response.json();
        
        if (result.error) {
          console.error('Error en la consulta SQL:', result.error);
          throw new Error(result.error);
        }
        
        return result.data;
      } catch (error) {
        console.error('Error ejecutando la consulta:', error);
        throw error;
      }
    };
    
    const data = await executeQuery(query);
    return data;
  } catch (error) {
    console.error(`Error fetching applications for client ${clientId}:`, error);
    throw error;
  }
};

// Create a new client
export const createClient = async (client: Omit<Client, 'id' | 'created_at'>) => {
  try {
    const { data, error } = await supabase
      .from(CLIENTS_TABLE)
      .insert([client])
      .select();

    if (error) {
      // Check if the error is because the table doesn't exist
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        console.warn('Clients table does not exist. Cannot create client.');
        throw new Error('Clients table does not exist');
      }
      
      console.error('Error creating client:', error);
      throw error;
    }

    return data[0] as Client;
  } catch (error) {
    console.error('Error in createClient:', error);
    throw error;
  }
};

// Update an existing client
export const updateClient = async (id: string, updates: Partial<Client>) => {
  try {
    const { data, error } = await supabase
      .from(CLIENTS_TABLE)
      .update(updates)
      .eq('id', id)
      .select();

    if (error) {
      // Check if the error is because the table doesn't exist
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        console.warn('Clients table does not exist. Cannot update client.');
        throw new Error('Clients table does not exist');
      }
      
      console.error(`Error updating client with ID ${id}:`, error);
      throw error;
    }

    return data[0] as Client;
  } catch (error) {
    console.error(`Error in updateClient:`, error);
    throw error;
  }
};

// Delete a client
export const deleteClient = async (id: string) => {
  try {
    const { error } = await supabase
      .from(CLIENTS_TABLE)
      .delete()
      .eq('id', id);

    if (error) {
      // Check if the error is because the table doesn't exist
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        console.warn('Clients table does not exist. Cannot delete client.');
        throw new Error('Clients table does not exist');
      }
      
      console.error(`Error deleting client with ID ${id}:`, error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error(`Error in deleteClient:`, error);
    throw error;
  }
};

// Check if a client exists with the given email or RFC
export const checkClientExists = async (email: string, rfc?: string) => {
  try {
    let query = supabase
      .from(CLIENTS_TABLE)
      .select('id, email, rfc')
      .eq('email', email);

    if (rfc) {
      query = query.or(`rfc.eq.${rfc}`);
    }

    const { data, error } = await query;

    if (error) {
      // Check if the error is because the table doesn't exist
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        console.warn('Clients table does not exist. Returning null.');
        return null;
      }
      
      console.error('Error checking client existence:', error);
      throw error;
    }

    return data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error('Error in checkClientExists:', error);
    throw error;
  }
};

// Get client count by filters
export const getClientCount = async (filters?: ClientFilter) => {
  try {
    let query = supabase
      .from(CLIENTS_TABLE)
      .select('id', { count: 'exact', head: true });

    // Apply filters
    if (filters) {
      // Filter by advisor
      if (filters.advisor_id) {
        query = query.eq('advisor_id', filters.advisor_id);
      }

      // Filter by company
      if (filters.company_id) {
        query = query.eq('company_id', filters.company_id);
      }

      // Filter by date range
      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }

      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }

      // Search by name, email or phone
      if (filters.searchQuery) {
        query = query.or(
          `name.ilike.%${filters.searchQuery}%,email.ilike.%${filters.searchQuery}%,phone.ilike.%${filters.searchQuery}%,rfc.ilike.%${filters.searchQuery}%,curp.ilike.%${filters.searchQuery}%`
        );
      }
    }

    const { count, error } = await query;

    if (error) {
      // Check if the error is because the table doesn't exist
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        console.warn('Clients table does not exist. Returning count 0.');
        return 0;
      }
      
      console.error('Error getting client count:', error);
      throw error;
    }

    return count || 0;
  } catch (error) {
    console.error('Error in getClientCount:', error);
    return 0;
  }
}; 