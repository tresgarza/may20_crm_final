import { PostgrestError, SupabaseClient } from '@supabase/supabase-js';
import { Client, ClientDocument } from '../../types/client';
import { supabase } from '../../lib/supabaseClient';
import { formatApiError, logError } from '../../utils/errorHandling';
import { processNumericFields } from '../../utils/dataConversion';

/**
 * Retrieves a client by ID
 * @param id The client ID
 * @returns The client data or null if not found
 */
export const getClientById = async (id: string): Promise<Client | null> => {
  try {
    console.log(`Getting client with ID: ${id}`);
    
    const { data, error } = await supabase
      .from('users')  // Usar 'users' en lugar de 'clients'
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error(`Error fetching client with ID ${id}:`, error);
      logError(error, 'getClientById');
      throw error;
    }

    if (!data) {
      console.warn(`No client found with ID ${id}`);
      return null;
    }

    console.log(`Successfully retrieved client with ID ${id}`);
    return mapUserToClient(data);
  } catch (error) {
    console.error(`Error in getClientById:`, error);
    logError(error, 'getClientById');
    throw error;
  }
};

/**
 * Checks if a client exists with the specified ID
 * @param id The client ID to check
 * @returns True if the client exists, false otherwise
 */
export const checkClientExists = async (id: string): Promise<boolean> => {
  try {
    console.log(`Checking if client exists with ID: ${id}`);
    
    const { data, error, count } = await supabase
      .from('users')  // Usar 'users' en lugar de 'clients'
      .select('id', { count: 'exact' })
      .eq('id', id);

    if (error) {
      console.error(`Error checking if client exists with ID ${id}:`, error);
      logError(error, 'checkClientExists');
      throw error;
    }

    const exists = (count || 0) > 0;
    console.log(`Client with ID ${id} exists: ${exists}`);
    return exists;
  } catch (error) {
    console.error(`Error in checkClientExists:`, error);
    logError(error, 'checkClientExists');
    throw error;
  }
};

/**
 * Deletes a client by ID
 * @param id The client ID to delete
 * @returns True if the client was successfully deleted
 */
export const deleteClient = async (id: string): Promise<boolean> => {
  try {
    console.log(`Deleting client with ID: ${id}`);
    
    const { error } = await supabase
      .from('users')  // Usar 'users' en lugar de 'clients'
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error(`Error deleting client with ID ${id}:`, error);
      logError(error, 'deleteClient');
      throw error;
    }
    
    console.log(`Successfully deleted client with ID: ${id}`);
    return true;
  } catch (error) {
    console.error(`Error in deleteClient:`, error);
    logError(error, 'deleteClient');
    throw error;
  }
};

/**
 * Gets the total count of clients, optionally filtered by advisor ID
 * @param advisorId Optional advisor ID to filter by
 * @returns The total count of clients
 */
export const getClientCount = async (advisorId?: string): Promise<number> => {
  try {
    console.log('Getting client count' + (advisorId ? ` for advisor ${advisorId}` : ''));
    
    let query = supabase
      .from('users')
      .select('id', { count: 'exact', head: true });
    
    if (advisorId) {
      query = query.eq('advisor_id', advisorId);
    }
    
    const { count, error } = await query;
    
    if (error) {
      logError(error, 'getClientCount');
      throw error;
    }
    
    console.log(`Client count result: ${count}`);
    return count || 0;
  } catch (error) {
    logError(error, 'getClientCount');
    
    const formattedError = formatApiError(error, 'client-count');
    throw new Error(formattedError.message);
  }
};

/**
 * Creates a new client in the database
 * @param client Client data to create
 * @returns The created client data
 */
export const createClient = async (client: Partial<Client>): Promise<Client> => {
  try {
    console.log('Creating a new client:', client.name);
    
    // Process numeric fields to ensure they are stored as numbers
    const numericFields = [
      'annual_income',
      'expected_annual_growth',
      'net_worth',
      'debt_amount',
      'investment_amount',
      'available_liquidity',
      'retirement_savings',
      'emergency_fund'
    ] as unknown as (keyof Client)[];
    
    const integerFields = [
      'risk_tolerance'
    ] as unknown as (keyof Client)[];
    
    // Process client data with numeric fields
    const processedClient = processNumericFields(client, numericFields, integerFields);
    
    // Remove undefined fields to avoid errors
    const clientData = Object.entries(processedClient).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, any>);
    
    console.log('Processed client data:', clientData);
    
    // Create client in Supabase - USAR 'users' en lugar de 'clients'
    const { data, error } = await supabase
      .from('users')
      .insert([clientData])
      .select();
    
    if (error) {
      console.error('Error creating client:', error);
      logError(error, 'createClient');
      throw error;
    }
    
    if (!data || data.length === 0) {
      throw new Error('No se pudo crear el cliente. No se recibieron datos.');
    }
    
    console.log('Client created successfully:', data[0]);
    return mapUserToClient(data[0]);
  } catch (error) {
    console.error('Error in createClient:', error);
    logError(error, 'createClient');
    throw error;
  }
};

/**
 * Updates an existing client in the database
 * @param id Client ID to update
 * @param client Updated client data
 * @returns The updated client data
 */
export const updateClient = async (id: string, client: Partial<Client>): Promise<Client> => {
  try {
    console.log(`Starting client update for ID ${id}`, client);
    
    // Verificar si el cliente existe
    const exists = await checkClientExists(id);
    if (!exists) {
      throw new Error(`No se encontró ningún cliente con el ID: ${id}`);
    }
    
    // Procesar campos numéricos
    const numericFields = [
      'annual_income',
      'expected_annual_growth',
      'net_worth',
      'debt_amount',
      'investment_amount',
      'available_liquidity',
      'retirement_savings',
      'emergency_fund'
    ] as unknown as (keyof Client)[];
    
    const integerFields = [
      'risk_tolerance'
    ] as unknown as (keyof Client)[];
    
    // Process client data with numeric fields
    const processedClient = processNumericFields(client, numericFields, integerFields);
    
    // Remove undefined fields to avoid errors
    const clientData = Object.entries(processedClient).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, any>);
    
    if (Object.keys(clientData).length === 0) {
      console.error("No valid data to update");
      throw new Error("No se proporcionaron datos válidos para actualizar");
    }
    
    console.log(`Updating client ${id} with sanitized data:`, JSON.stringify(clientData));

    // IMPORTANTE: Usar 'users' en lugar de 'clients'
    const { data, error, count } = await supabase
      .from('users')  // ¡Cambiado de 'clients' a 'users'!
      .update(clientData)
      .eq('id', id)
      .select();

    if (error) {
      console.error(`Error updating client with ID ${id}:`, error);
      throw error;
    }

    // Verificar si se actualizó alguna fila
    if (!data || data.length === 0) {
      console.warn(`No data returned from update operation for client ${id}. This could indicate the update had no effect.`);
      
      // Verificar específicamente si se realizaron cambios
      const { count: updateCount } = await supabase
        .from('users')
        .update(clientData)
        .eq('id', id);
        
      if (updateCount === 0) {
        console.error(`Update operation had no effect. Check RLS policies or if the client data differs from the current values.`);
        throw new Error("La actualización no tuvo efecto. Verifica los permisos o si los datos ya están actualizados.");
      }
      
      // Si hay un count pero no hay data, intentamos recuperar el cliente actualizado
      console.log(`Fetching updated client data separately for ID ${id}`);
      const updatedClient = await getClientById(id);
      
      if (!updatedClient) {
        throw new Error(`No se pudo encontrar el cliente actualizado con ID: ${id}`);
      }
      
      console.log(`Successfully retrieved client data after update for ID ${id}`);
      return updatedClient;
    }

    console.log(`Successfully updated client with data returned, ID ${id}`);
    return mapUserToClient(data[0]);
  } catch (error) {
    console.error(`Error in updateClient:`, error);
    logError(error, 'updateClient');
    throw error;
  }
};

/**
 * Mapea un registro de usuario a la estructura de Cliente
 */
const mapUserToClient = (userData: any): Client => {
  if (!userData) {
    console.error('Error: userData is undefined in mapUserToClient');
    throw new Error('No se pudo procesar la información del cliente, los datos son inválidos');
  }
  
  // Crear un objeto básico con los campos principales
  const client: Record<string, any> = {
    id: userData.id,
    created_at: userData.created_at,
    email: userData.email,
    first_name: userData.first_name,
    paternal_surname: userData.paternal_surname,
    maternal_surname: userData.maternal_surname,
    phone: userData.phone,
    birth_date: userData.birth_date,
    company_id: userData.company_id,
    rfc: userData.rfc,
    curp: userData.curp,
    advisor_id: userData.advisor_id,
    address: userData.address,
    city: userData.city,
    state: userData.state,
    postal_code: userData.postal_code,
    gender: userData.gender,
    marital_status: userData.marital_status,
  };
  
  // Campos financieros (solo incluirlos si existen en los datos)
  if (userData.annual_income !== undefined) client.annual_income = userData.annual_income;
  if (userData.expected_annual_growth !== undefined) client.expected_annual_growth = userData.expected_annual_growth;
  if (userData.net_worth !== undefined) client.net_worth = userData.net_worth;
  if (userData.debt_amount !== undefined) client.debt_amount = userData.debt_amount;
  if (userData.investment_amount !== undefined) client.investment_amount = userData.investment_amount;
  if (userData.available_liquidity !== undefined) client.available_liquidity = userData.available_liquidity;
  if (userData.retirement_savings !== undefined) client.retirement_savings = userData.retirement_savings;
  if (userData.emergency_fund !== undefined) client.emergency_fund = userData.emergency_fund;
  if (userData.risk_tolerance !== undefined) client.risk_tolerance = userData.risk_tolerance;
  
  // Añadir nombre completo si está disponible o construirlo
  client.name = userData.name || [
    userData.first_name,
    userData.paternal_surname,
    userData.maternal_surname
  ].filter(Boolean).join(' ');
  
  return client as Client;
};

/**
 * Obtiene una lista de clientes según los filtros proporcionados
 */
export const getClients = async (filters: any = {}, pagination: any = {}): Promise<{ clients: Client[]; total: number }> => {
  try {
    console.log('Getting clients with filters:', filters);
    
    let query = supabase
      .from('users')  // Usar 'users' en lugar de 'clients'
      .select('*', { count: 'exact' });
    
    // Aplicar filtros si se proporcionan
    if (filters.search) {
      query = query.or(`first_name.ilike.%${filters.search}%,paternal_surname.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
    }
    
    if (filters.advisor_id) {
      query = query.eq('advisor_id', filters.advisor_id);
    }
    
    if (filters.company_id) {
      query = query.eq('company_id', filters.company_id);
    }
    
    // Aplicar paginación si se proporciona
    if (pagination.page !== undefined && pagination.pageSize) {
      const from = pagination.page * pagination.pageSize;
      const to = from + pagination.pageSize - 1;
      query = query.range(from, to);
    }
    
    // Ejecutar la consulta
    const { data, error, count } = await query;
    
    if (error) {
      console.error('Error fetching clients:', error);
      logError(error, 'getClients');
      throw error;
    }
    
    console.log(`Retrieved ${data?.length || 0} clients out of ${count || 0} total`);
    return {
      clients: data ? data.map(mapUserToClient) : [],
      total: count || 0
    };
  } catch (error) {
    console.error('Error in getClients:', error);
    logError(error, 'getClients');
    throw error;
  }
}; 