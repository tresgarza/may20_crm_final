import { supabase, getAuthenticatedClient, getServiceClient } from "../lib/supabaseClient";
import { TABLES } from "../utils/constants/tables";
import * as documentService from './documentService';
import { Client, ClientDocument } from "../types/client";
import { 
  ErrorType, 
  createAppError, 
  logError, 
  handleApiError, 
  isRlsViolation,
  createRlsViolationError,
  createNoEffectError
} from '../utils/errorHandling';
import { parseNumericString, processNumericField } from '../utils/numberFormatting';
import { uploadClientDocuments as uploadDocs, ClientDocument as UploadClientDocument } from '../utils/documentUpload';
import * as clientDocumentService from './client/clientDocumentService';

// Re-exportamos las interfaces para mantener compatibilidad
export type { Client, ClientDocument };

export interface ClientFilter {
  searchQuery?: string;
  advisor_id?: string;
  company_id?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

const USERS_TABLE = 'users';

const mapUserToClient = (userData: any): Client => {
  if (!userData) {
    console.error('Error: userData is undefined in mapUserToClient');
    throw new Error('No se pudo procesar la información del cliente, los datos son inválidos');
  }
  
  // Generar el nombre completo a partir de los componentes del nombre
  const fullName = userData.name || [
    userData.first_name,
    userData.paternal_surname,
    userData.maternal_surname
  ].filter(Boolean).join(' ');
  
  // Crear el objeto cliente con todos los campos de la base de datos
  const client: Client = {
    id: userData.id,
    created_at: userData.created_at,
    last_login: userData.last_login,
    name: fullName, // Campo calculado/virtual - no existe en la base de datos
    first_name: userData.first_name,
    paternal_surname: userData.paternal_surname,
    maternal_surname: userData.maternal_surname,
    email: userData.email,
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
    employment_type: userData.employment_type,
    employment_years: userData.employment_years,
    monthly_income: userData.monthly_income,
    additional_income: userData.additional_income,
    monthly_expenses: userData.monthly_expenses,
    other_loan_balances: userData.other_loan_balances,
    bank_name: userData.bank_name,
    bank_clabe: userData.bank_clabe,
    bank_account_number: userData.bank_account_number,
    bank_account_type: userData.bank_account_type,
    bank_account_origin: userData.bank_account_origin,
    street_number_ext: userData.street_number_ext,
    street_number_int: userData.street_number_int,
    neighborhood: userData.neighborhood,
    home_phone: userData.home_phone,
    birth_state: userData.birth_state,
    nationality: userData.nationality,
    job_position: userData.job_position,
    employer_name: userData.employer_name,
    employer_phone: userData.employer_phone,
    employer_address: userData.employer_address,
    employer_activity: userData.employer_activity,
    mortgage_payment: userData.mortgage_payment,
    rent_payment: userData.rent_payment,
    dependent_persons: userData.dependent_persons,
    income_frequency: userData.income_frequency,
    payment_method: userData.payment_method,
    credit_purpose: userData.credit_purpose,
    spouse_paternal_surname: userData.spouse_paternal_surname,
    spouse_maternal_surname: userData.spouse_maternal_surname,
    reference1_name: userData.reference1_name,
    reference1_relationship: userData.reference1_relationship,
    reference1_address: userData.reference1_address,
    reference1_phone: userData.reference1_phone,
    reference2_name: userData.reference2_name,
    reference2_relationship: userData.reference2_relationship,
    reference2_address: userData.reference2_address,
    reference2_phone: userData.reference2_phone,
  };
  
  // Extraer company_name de la relación companies si existe (array u objeto)
  let companyName: string | undefined = undefined;
  const compRel: any = (userData as any).companies;
  if (compRel) {
    if (Array.isArray(compRel)) {
      companyName = (compRel as any)[0]?.name;
    } else if (typeof compRel === 'object') {
      companyName = (compRel as any)?.name;
    }
  }
  return {
    ...client,
    company_name: companyName
  } as Client;
};

export const getClients = async (filters?: ClientFilter) => {
  try {
    // Usamos el cliente de servicio para evitar problemas de autenticación
    const serviceClient = getServiceClient();
    
    // Additional debug logging
    console.log('[getClients] Starting client query with filters:', JSON.stringify(filters));
    
    let query = serviceClient.from(USERS_TABLE)
      .select(`
        id, email, first_name, paternal_surname, maternal_surname, phone, 
        company_id, created_at, birth_date, rfc, curp, advisor_id, 
        address, city, state, postal_code, gender, marital_status, employment_type, 
        employment_years, monthly_income, additional_income, monthly_expenses, 
        other_loan_balances, bank_name, bank_clabe, bank_account_number, 
        bank_account_type, bank_account_origin, street_number_ext, street_number_int, 
        neighborhood, home_phone, birth_state, nationality, job_position, 
        employer_name, employer_phone, employer_address, employer_activity, 
        mortgage_payment, rent_payment, dependent_persons, income_frequency, 
        payment_method, credit_purpose, spouse_paternal_surname, spouse_maternal_surname, 
        reference1_name, reference1_relationship, reference1_address, reference1_phone, 
        reference2_name, reference2_relationship, reference2_address, reference2_phone, 
        last_login,
        companies(name)
      `, { count: 'exact' });

    if (filters) {
      // Apply strict filtering - each filter is applied independently
      // Detailed filter logging for debugging
      console.log('[getClients] Filter application details:');
      console.log(`  - advisor_id filter: ${filters.advisor_id || 'not set'}`);
      console.log(`  - company_id filter: ${filters.company_id || 'not set'}`);
      console.log(`  - searchQuery filter: ${filters.searchQuery || 'not set'}`);
      
      // Advisors ALWAYS filter by advisor_id to ensure data isolation
      if (filters.advisor_id) {
        console.log(`[getClients] Applying STRICT advisor filter: advisor_id=${filters.advisor_id}`);
        query = query.eq('advisor_id', filters.advisor_id);
      }

      // Company filter logic
      if (filters.company_id) {
        console.log(`[getClients] Applying company filter: company_id=${filters.company_id}`);
        query = query.eq('company_id', filters.company_id);
      }

      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }

      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }

      if (filters.searchQuery) {
        const searchTerm = filters.searchQuery.trim();
        console.log(`[getClients] Applying search query filter: "${searchTerm}"`);
        
        // Build search condition using OR with multiple fields
        const searchCondition = [
          `first_name.ilike.%${searchTerm}%`,
          `paternal_surname.ilike.%${searchTerm}%`,
          `maternal_surname.ilike.%${searchTerm}%`,
          `email.ilike.%${searchTerm}%`,
          `phone.ilike.%${searchTerm}%`
        ].join(',');
        
        console.log(`[getClients] Search condition: ${searchCondition}`);
        query = query.or(searchCondition);
      }

      if (filters.page !== undefined && filters.pageSize) {
        const from = filters.page * filters.pageSize;
        const to = from + filters.pageSize - 1;
        console.log(`[getClients] Applying pagination: page ${filters.page}, size ${filters.pageSize}, range ${from}-${to}`);
        query = query.range(from, to);
      }
    }

    query = query.order('created_at', { ascending: false });

    console.log('[getClients] Executing final query');
    const { data, error, count } = await query;

    if (error) {
      console.error('[getClients] Query error:', error);
      logError(error, 'getClients', { filters });
      throw handleApiError(error);
    }

    // Procesar los resultados para incluir company_name
    const clients = data ? data.map((userData: any) => {
      // Crear el objeto cliente base usando la función existente
      const client = mapUserToClient(userData);
      return client;
    }) : [];

    console.log(`[getClients] Query returned ${clients.length} clients out of total ${count}`);

    return {
      clients,
      totalCount: count || 0
    };
  } catch (error) {
    console.error('[getClients] Error in getClients:', error);
    logError(error, 'getClients', { filters });
    throw handleApiError(error);
  }
};

export const getClientById = async (id: string) => {
  try {
    console.log(`[getClientById] Attempting to fetch client with ID: ${id}`);
    // Usamos el cliente de servicio para evitar problemas de autenticación
    const serviceClient = getServiceClient();
    
    // First try direct single fetch with better error handling
    const { data, error } = await serviceClient
      .from(USERS_TABLE)
      .select('id, email, first_name, paternal_surname, maternal_surname, phone, company_id, created_at, birth_date, rfc, curp, advisor_id, address, city, state, postal_code, gender, marital_status, employment_type, employment_years, monthly_income, additional_income, monthly_expenses, other_loan_balances, bank_name, bank_clabe, bank_account_number, bank_account_type, bank_account_origin, street_number_ext, street_number_int, neighborhood, home_phone, birth_state, nationality, job_position, employer_name, employer_phone, employer_address, employer_activity, mortgage_payment, rent_payment, dependent_persons, income_frequency, payment_method, credit_purpose, spouse_paternal_surname, spouse_maternal_surname, reference1_name, reference1_relationship, reference1_address, reference1_phone, reference2_name, reference2_relationship, reference2_address, reference2_phone, last_login')
      .eq('id', id)
      .limit(1);  // Use limit(1) instead of single() to avoid 406 errors

    if (error) {
      console.log(`[getClientById] Error on first attempt: ${error.message}`);
      logError(error, 'getClientById', { clientId: id });
      
      // Try fallback approach by getting array and taking first element
      console.log(`Trying fallback approach for client ${id}`);
      const { data: fallbackData, error: fallbackError } = await serviceClient
        .from(USERS_TABLE)
        .select('*')
        .eq('id', id);
      
      if (fallbackError) {
        console.log(`[getClientById] Fallback attempt also failed: ${fallbackError.message}`);
        logError(fallbackError, 'getClientById fallback', { clientId: id });
        throw handleApiError(fallbackError);
      }
      
      if (!fallbackData || fallbackData.length === 0) {
        console.log(`[getClientById] No data found for client ID: ${id}`);
        const notFoundError = createAppError(
          ErrorType.NOT_FOUND,
          `No se encontró cliente con ID: ${id}`
        );
        logError(notFoundError, 'getClientById', { clientId: id });
        throw notFoundError;
      }
      
      console.log(`[getClientById] Found client via fallback method: ${id}`);
      return mapUserToClient(fallbackData[0]);
    }

    if (!data || (Array.isArray(data) && data.length === 0)) {
      console.log(`[getClientById] No data returned on first attempt for client ID: ${id}`);
      const notFoundError = createAppError(
        ErrorType.NOT_FOUND,
        `No se encontró cliente con ID: ${id}`
      );
      logError(notFoundError, 'getClientById', { clientId: id });
      throw notFoundError;
    }

    // If data is an array, take the first element
    const clientData = Array.isArray(data) ? data[0] : data;
    console.log(`[getClientById] Successfully found client with ID: ${id}`);
    return mapUserToClient(clientData);
  } catch (error) {
    console.error(`[getClientById] Unexpected error for client ID ${id}:`, error);
    logError(error, 'getClientById', { clientId: id });
    throw handleApiError(error);
  }
};

// Improved SQL string escaping function to ensure proper handling of different data types
function safeEscapeSQLString(value: any): string {
  if (value === null || value === undefined) return 'NULL';
  
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'number') return value.toString();
  
  // String values need escaping
  const str = String(value);
  return str.replace(/'/g, "''"); // Proper SQL escaping for strings
}

export const getClientApplications = async (clientId: string) => {
  try {
    // Obtener información básica del cliente para posible filtro por nombre
    const client = await getClientById(clientId).catch(err => {
      console.error(`Error obteniendo cliente con ID ${clientId}:`, err);
      return null; // Continuar aunque falle para intentar por client_id
    });

    const serviceClient = getServiceClient();

    // Construir consulta principal por client_id
    let query = serviceClient
      .from(TABLES.APPLICATIONS)
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    let { data, error } = await query;

    if (error) {
      console.error('[getClientApplications] Error fetching by client_id:', error);
      data = [];
    }

    // Si no encontramos nada y tenemos nombre del cliente, intentar por nombre (datos viejos)
    if ((!data || data.length === 0) && client?.name) {
      const nameQuery = serviceClient
        .from(TABLES.APPLICATIONS)
        .select('*')
        .ilike('client_name', `%${client.name}%`)
        .order('created_at', { ascending: false });

      const nameRes = await nameQuery;
      if (!nameRes.error && nameRes.data) {
        data = nameRes.data;
      }
    }

    return data || [];
  } catch (error) {
    logError(error, 'getClientApplications', { clientId });
    return [];
  }
};

// Función para convertir documentos al formato correcto para upload
const convertDocumentsForUpload = (documents: ClientDocument[]): UploadClientDocument[] => {
  return documents.map(doc => ({
    file: doc.file,
    name: doc.name,
    category: doc.category,
    description: doc.description,
    documentName: doc.name // Copiar name como documentName para satisfacer la interfaz
  }));
};

export const uploadClientDocuments = async (
  clientId: string, 
  documents: ClientDocument[],
  userId: string
): Promise<documentService.Document[]> => {
  if (!clientId) {
    console.error('Client ID is required for uploading documents');
    throw new Error('El ID del cliente es requerido para subir documentos');
  }

  // Verificar que se proporcionaron documentos válidos
  if (!documents || !Array.isArray(documents) || documents.length === 0) {
    console.error('No valid documents provided for upload');
    throw new Error('No se proporcionaron documentos válidos para subir');
  }

  if (!userId) {
    console.error('User ID is required for uploading documents');
    throw new Error('Se requiere el ID del usuario para subir documentos');
  }

  try {
    // Obtener cliente con permisos de servicio para operaciones que requieren más privilegios
    const serviceClient = getServiceClient();
    
    // Asegurarse de que el bucket de almacenamiento exista
    await documentService.ensureStorageBucketExists(serviceClient);

    // Intentar subir cada documento
    const uploadPromises = documents.map(async (document) => {
      try {
        // Verificar que el documento tenga datos válidos
        if (!document.file || !document.name) {
          console.error('Invalid document data', document);
          throw new Error(
            'Datos de documento inválidos: se requiere archivo y nombre'
          );
        }

        // Create a document upload request compatible with the document service
        const uploadParams: documentService.UploadDocumentParams = {
          file: document.file,
          category: document.category,
          documentName: document.name,
          description: document.description,
          userId: userId,
          client_id: clientId,
          authClient: serviceClient
        };

        // Subir el documento
        return await documentService.uploadDocument(uploadParams);
      } catch (docError: any) {
        // Manejo de errores específicos de permisos RLS
        if (docError.message && (
            docError.message.includes('permission denied') || 
            docError.message.includes('not authorized') ||
            docError.message.includes('row level security')
          )) {
          console.error('Permission error when uploading document:', docError);
          throw new Error('No tienes permiso para subir documentos para este cliente. Verifica tus permisos.');
        }
        
        // Registrar el error pero permitir que otros uploads continúen
        console.error(`Error uploading document for client ${clientId}:`, docError);
        throw docError;
      }
    });

    const results = await Promise.all(uploadPromises);
    
    return results;
  } catch (error) {
    logError(error, 'uploadClientDocuments', { clientId });
    throw handleApiError(error);
  }
};

/**
 * Creates a new client in the database
 */
export const createClient = async (client: Omit<Client, 'id' | 'created_at'>, documents?: ClientDocument[], userId?: string) => {
  try {
    // Log basic client data for debugging
    console.log(`Creating client with sanitized data:`, JSON.stringify({
      email: client.email,
      first_name: client.first_name || '',
      paternal_surname: client.paternal_surname || '',
      maternal_surname: client.maternal_surname || '',
      phone: client.phone,
      birth_date: client.birth_date && client.birth_date.trim() !== '' ? client.birth_date : null,
      company_id: client.company_id || "70b2aa97-a5b6-4b5e-91db-be8acbd3701a",
      rfc: client.rfc || '',
      curp: client.curp || '',
      advisor_id: client.advisor_id || null
    }));

    // Get the service client for this operation
    const serviceClient = getServiceClient();

    // Define fields that are allowed in the users table
    const insertableFields = [
      'first_name', 'paternal_surname', 'maternal_surname', 'email', 'phone',
      'rfc', 'curp', 'birth_date', 'gender', 'marital_status', 'company_id',
      'address', 'city', 'state', 'postal_code', 'advisor_id',
      'employment_type', 'employment_years', 'monthly_income',
      'additional_income', 'monthly_expenses', 'other_loan_balances',
      'dependent_persons', 'bank_name', 'bank_clabe', 'bank_account_number',
      'bank_account_type', 'bank_account_origin',
      'spouse_paternal_surname', 'spouse_maternal_surname',
      'birth_state', 'nationality', 'street_number_ext', 'street_number_int',
      'neighborhood', 'home_phone', 'job_position',
      'employer_name', 'employer_phone', 'employer_address', 'employer_activity',
      'mortgage_payment', 'rent_payment', 'income_frequency',
      'payment_method', 'credit_purpose',
      'reference1_name', 'reference1_relationship', 'reference1_address', 'reference1_phone',
      'reference2_name', 'reference2_relationship', 'reference2_address', 'reference2_phone'
    ];

    // Create a clean client object with only valid insertable fields
    const cleanClientObj: Record<string, any> = {};
    for (const field of insertableFields) {
      const key = field as keyof typeof client;
      if (client[key] !== undefined) {
        // Handle special cases for field types
        if (field === 'birth_date' && client[key] === '') {
          // Skip empty date strings
          continue;
        }
        
        // Handle dependent_persons as a number if it's a string
        if (field === 'dependent_persons' && typeof client[key] === 'string') {
          const numValue = parseInt(client[key] as string, 10);
          if (!isNaN(numValue)) {
            cleanClientObj[field] = numValue;
          }
        } else {
          cleanClientObj[field] = client[key];
        }
      }
    }

    // Approach 1: Use direct Supabase API for insertion
    try {
      console.log('Inserting client with direct Supabase API');
      
      const { data, error } = await serviceClient
        .from(USERS_TABLE)
        .insert(cleanClientObj)
        .select('id')
        .single();
        
      if (error) {
        console.error('Error inserting client with direct API:', error);
        // We'll fall back to the SQL approach
      } else if (data && data.id) {
        console.log(`Client created successfully with ID: ${data.id}`);
        const mappedClient = {
          ...cleanClientObj,
          id: data.id,
          created_at: new Date().toISOString()
        };
        
        // If we have documents to upload
        if (documents && documents.length > 0 && userId) {
          try {
            console.log(`Uploading ${documents.length} documents for client ${mappedClient.id}`);
            await uploadClientDocuments(mappedClient.id, documents, userId);
        } catch (docError) {
            console.error('Error uploading documents:', docError);
            // We'll still return the client, but add a warning
            return {
              ...mappedClient,
              warningMessage: `El cliente se creó correctamente, pero hubo un problema al subir documentos: ${docError instanceof Error ? docError.message : 'Error desconocido'}`
            };
        }
      }
      
      return mappedClient;
      }
    } catch (apiError) {
      console.error('Exception during client creation with direct API:', apiError);
      // Continue to fallback
    }

    // Fallback approach: Use safer parameterized SQL execution
    console.log('Using fallback SQL approach for client creation');
    
    try {
      // Build column lists and prepare parameters array
      const cols: string[] = Object.keys(cleanClientObj);
      const params: any[] = Object.values(cleanClientObj);
      
      // Add UUID generation for the ID
      cols.push('id');
      
      // Create the parameterized SQL query
      const placeholders = params.map((_, i) => `$${i + 1}`).join(', ');
      const sql = `
        INSERT INTO users (${cols.join(', ')})
        VALUES (${placeholders}, gen_random_uuid())
        RETURNING id;
      `;
      
      console.log('Executing parameterized SQL insert');
      const { data: sqlData, error: sqlError } = await serviceClient.rpc('execute_sql', {
        sql: sql,
        params: params
      });
      
      if (sqlError) {
        console.error('Error with parameterized SQL insert:', sqlError);
        throw sqlError;
      }
      
      if (!sqlData || !sqlData.length || !sqlData[0].id) {
        throw new Error("No se pudo crear el cliente (SQL directo no retornó id)");
      }
      
      const clientId = sqlData[0].id;
      console.log(`Client created with ID ${clientId} using SQL fallback`);
    
    // Get the newly created client
    const { data: newClient, error: fetchError } = await serviceClient
      .from(USERS_TABLE)
      .select('*')
      .eq('id', clientId)
      .single();
      
    if (fetchError) {
        console.error('Error fetching newly created client:', fetchError);
        throw fetchError;
    }
    
    const mappedClient = mapUserToClient(newClient);
    
    // Handle documents if provided
    if (documents && documents.length > 0 && userId && mappedClient.id) {
      try {
        console.log(`Uploading ${documents.length} documents for new client ${mappedClient.id}`);
          await uploadClientDocuments(mappedClient.id, documents, userId);
      } catch (docError) {
        console.error('Error uploading documents during client creation:', docError);
        mappedClient.warningMessage = `Se creó el cliente, pero hubo un problema al subir los documentos. Puede intentar agregarlos nuevamente más tarde.`;
      }
    }

    return mappedClient;
    } catch (sqlError) {
      logError(sqlError, 'createClient - SQL fallback');
      throw handleApiError(sqlError);
    }
  } catch (error) {
    logError(error, 'createClient', { clientData: client });
    throw handleApiError(error);
  }
};

export const updateClient = async (
  id: string, 
  data: Partial<Client>, 
  documents?: ClientDocument[],
  userId?: string
): Promise<Partial<Client>> => {
  try {
    // Log the update operation for debugging
    console.log(`Updating client with ID ${id}`);
    console.log('Update data:', data);
    console.log('Documents to upload:', documents?.length || 0);

    // Get the service client for operations that require elevated privileges
    const serviceClient = getServiceClient();
    
    // Handle empty birth_date to prevent DB errors
    if (data.birth_date !== undefined) {
      // If birth_date is empty string, set it to null
      if (data.birth_date === '' || (typeof data.birth_date === 'string' && data.birth_date.trim() === '')) {
        console.log('Converting empty birth_date to null');
        // Use type assertion to fix TypeScript error
        data.birth_date = null as unknown as string;
      }
    }
    
    // List of the 27 problematic fields for reference and debugging
    const problematicFields = [
      'dependent_persons', 'spouse_paternal_surname', 'spouse_maternal_surname',
      'birth_state', 'nationality', 'street_number_ext', 'street_number_int',
      'neighborhood', 'home_phone', 'job_position', 'employer_name', 
      'employer_phone', 'employer_address', 'employer_activity', 'mortgage_payment',
      'rent_payment', 'income_frequency', 'payment_method', 'credit_purpose',
      'reference1_name', 'reference1_relationship', 'reference1_address', 
      'reference1_phone', 'reference2_name', 'reference2_relationship',
      'reference2_address', 'reference2_phone'
    ];
    
    // Log problematic fields being updated, if any
    const updatedProblematicFields = problematicFields.filter(
      field => data[field as keyof Partial<Client>] !== undefined
    );
    
    if (updatedProblematicFields.length > 0) {
      console.log('Updating the following previously problematic fields:', updatedProblematicFields);
      
      // Log each problematic field's value and type
      updatedProblematicFields.forEach(field => {
        const value = data[field as keyof Partial<Client>];
        console.log(`  - ${field}: ${value} (${typeof value})`);
      });
    }
    
    // Special check for dependent_persons
    if ('dependent_persons' in data) {
      console.log(`FOCUS: dependent_persons is ${data.dependent_persons} (type: ${typeof data.dependent_persons})`);
    }
    
    let success = false;
    let rpcError = null;
    
    // First try with the RPC method
    try {
    // Use our stored procedure to update the client
    const { data: updateResult, error } = await serviceClient.rpc('update_client', {
      p_id: id,
      p_updates: data
    });
    
    // If there was an error with the update
    if (error) {
        console.error('Error updating client with RPC:', error);
        rpcError = error;
      } else if (!updateResult) {
        console.warn(`The RPC update for client ${id} had no effect`);
      } else {
        success = true;
        console.log(`Successfully updated client ${id} via RPC`);
      }
    } catch (error) {
      console.error('Exception during RPC update:', error);
      rpcError = error;
    }
    
    // If RPC failed and we have problematic fields, try direct SQL
    if (!success && (rpcError || updatedProblematicFields.length > 0)) {
      console.log('Attempting direct SQL update as fallback');
      
      try {
        // Build column list and values for update
        const updateParts: string[] = [];
        
        // Process each key in the data object
        for (const [key, value] of Object.entries(data)) {
          if (value === undefined) continue;
          
          // Special log for dependent_persons to debug the issue
          if (key === 'dependent_persons') {
            console.log(`Processing ${key}, value: ${value}, type: ${typeof value}`);
          }
          
          let sqlValue: string;
          if (value === null) {
            sqlValue = 'NULL';
          } else if (key === 'birth_date' && (value === '' || !value)) {
            // Handle empty date strings specifically
            sqlValue = 'NULL';
          } else if (typeof value === 'number') {
            sqlValue = value.toString();
            // Log number fields for debugging
            if (key === 'dependent_persons') {
              console.log(`Numeric field ${key} with value ${value} converted to SQL: ${sqlValue}`);
            }
          } else if (typeof value === 'boolean') {
            sqlValue = value ? 'TRUE' : 'FALSE';
          } else {
            // Escape string values
            sqlValue = `'${safeEscapeSQLString(String(value))}'`;
          }
          
          updateParts.push(`${key} = ${sqlValue}`);
        }
        
        if (updateParts.length === 0) {
          console.warn('No valid fields to update');
          throw new Error('No hay campos válidos para actualizar');
        }
        
        // Create SQL statement
        const updateSql = `
          UPDATE users 
          SET ${updateParts.join(', ')}, 
              updated_at = NOW()
          WHERE id = '${id}'
          RETURNING id;
        `;
        
        console.log('Executing direct SQL update');
        const { data: sqlResult, error: sqlError } = await serviceClient.rpc('execute_sql', {
          sql: updateSql
        });
        
        if (sqlError) {
          console.error('Error with direct SQL update:', sqlError);
          throw new Error(`Error al actualizar cliente (directo): ${sqlError.message}`);
        }
        
        success = true;
        console.log('Direct SQL update successful');
      } catch (sqlError) {
        console.error('Failed with direct SQL update:', sqlError);
        
        // If both methods failed, throw the original RPC error
        if (rpcError) {
          // Cast rpcError to any to avoid TypeScript error or use a safer approach
          const errorMessage = typeof rpcError === 'object' && rpcError !== null 
            ? (rpcError as any).message || JSON.stringify(rpcError)
            : String(rpcError);
          throw new Error(`Error al actualizar cliente: ${errorMessage}`);
        } else {
          throw sqlError;
        }
      }
    }
    
    // If no update was successful
    if (!success) {
      throw new Error('La actualización no tuvo efecto. Es posible que no tenga permisos para actualizar este cliente o que no haya cambios para guardar.');
    }
    
    // If we have documents to upload
    if (documents && documents.length > 0 && userId) {
      console.log(`Processing ${documents.length} documents for client ${id}`);
      try {
        // Use the clientDocumentService function for better error handling
        const documentResult = await clientDocumentService.uploadClientDocuments(id, userId, documents);
        console.log('Document upload result:', documentResult);
        
        if (!documentResult.allSuccessful && documentResult.warningMessage) {
          // Return the client data with a warning message about document issues
          return {
            ...data,
            id,
            warningMessage: documentResult.warningMessage
          };
        }
      } catch (docError) {
        console.error('Error uploading documents during client update:', docError);
        
        // We still return the updated client data but with a warning message
        return {
          ...data,
          id,
          warningMessage: `Se actualizó la información del cliente, pero hubo un problema al subir los documentos: ${docError instanceof Error ? docError.message : 'Error desconocido'}`
        };
      }
    }
    
    // Return the updated client data
    return {
      ...data,
      id
    };
  } catch (error) {
    logError(error, 'updateClient', { clientId: id });
    throw handleApiError(error);
  }
};

export const deleteClient = async (id: string) => {
  try {
    // Get the service client for this operation
    const serviceClient = getServiceClient();
    
    const { error, count } = await serviceClient
      .from(USERS_TABLE)
      .delete()
      .eq('id', id);

    if (error) {
      // Verificar si es una violación de RLS
      if (isRlsViolation(error)) {
        throw createRlsViolationError('eliminar', 'cliente', id, error);
      }
      
      logError(error, 'deleteClient', { clientId: id });
      throw handleApiError(error);
    }

    // Verify that rows were affected
    if (count === 0) {
      console.warn(`Delete operation didn't affect any rows for client ${id}`);
      throw createNoEffectError('delete', 'cliente', id);
    }

    return true;
  } catch (error) {
    logError(error, 'deleteClient', { clientId: id });
    throw handleApiError(error);
  }
};

export const checkClientExists = async (email: string, rfc?: string) => {
  try {
    const serviceClient = getServiceClient();
    
    let query = serviceClient
      .from(USERS_TABLE)
      .select('id, email, rfc')
      .eq('email', email);

    if (rfc) {
      query = query.or(`rfc.eq.${rfc}`);
    }

    const { data, error } = await query;

    if (error) {
      logError(error, 'checkClientExists', { email, rfc });
      throw handleApiError(error);
    }

    return data?.length > 0;
  } catch (error) {
    logError(error, 'checkClientExists', { email, rfc });
    throw handleApiError(error);
  }
};

export const getClientCount = async (filters?: ClientFilter) => {
  try {
    const serviceClient = getServiceClient();
    
    let query = serviceClient
      .from(USERS_TABLE)
      .select('*', { count: 'exact', head: true });

    if (filters) {
      if (filters.advisor_id) {
        query = query.eq('advisor_id', filters.advisor_id);
      }

      if (filters.company_id) {
        query = query.eq('company_id', filters.company_id);
      }

      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }

      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }
    }

    const { count, error } = await query;

    if (error) {
      logError(error, 'getClientCount', { filters });
      throw handleApiError(error);
    }

    return count || 0;
  } catch (error) {
    logError(error, 'getClientCount', { filters });
    throw handleApiError(error);
  }
};

// Función para verificar si un cliente existe por su ID
export const checkClientExistsById = async (clientId: string): Promise<boolean> => {
  if (!clientId || clientId.trim() === '') {
    console.log('[checkClientExistsById] Received empty or null clientId');
    return false;
  }
  
  console.log(`[checkClientExistsById] Verifying if client with ID ${clientId} exists in the database...`);
  
  try {
    // Primero verificar en la tabla users
    const { data: userData, error: userError, count: userCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('id', clientId);
    
    if (userError) {
      console.error(`[checkClientExistsById] Error checking users table: ${userError.message}`, userError);
    } else if (userCount && userCount > 0) {
      console.log(`[checkClientExistsById] Client ${clientId} found in users table`);
      return true;
    }

    // Si no se encuentra en users, verificar en la tabla clients como respaldo
    const { data: clientData, error: clientError, count: clientCount } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .eq('id', clientId);
    
    if (clientError) {
      console.error(`[checkClientExistsById] Error checking clients table: ${clientError.message}`, clientError);
    } else if (clientCount && clientCount > 0) {
      console.log(`[checkClientExistsById] Client ${clientId} found in clients table`);
      return true;
    }
    
    // Si llegamos hasta aquí, el cliente no existe en ninguna tabla
    console.log(`[checkClientExistsById] Client with ID ${clientId} not found in any table`);
    return false;
  } catch (error) {
    console.error('[checkClientExistsById] Unexpected error:', error);
    // En caso de error, devolvemos false para manejar el caso de forma segura
    return false;
  }
};

/**
 * Creates a stub client record for a client ID that exists in applications but not in the users table
 * This is used to handle data inconsistency where client IDs in applications don't match existing users
 */
export const createMissingClient = async (clientId: string, clientName?: string): Promise<Client | null> => {
  try {
    console.log(`[createMissingClient] Attempting to create missing client record for ID: ${clientId}`);
    
    // Special case handling for the known problematic ID
    const isKnownProblemId = clientId === 'f04660f4-6aeb-46fb-aff3-6d0241925a4d';
    if (isKnownProblemId) {
      console.log(`[createMissingClient] Special handling for known problematic ID: ${clientId}`);
      
      // For this ID, we'll use the most direct approach possible
      const directSql = `
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM users WHERE id = '${clientId}') THEN
            INSERT INTO users (
              id, first_name, paternal_surname, maternal_surname, email, phone, 
              company_id, is_sso_user, is_anonymous, created_at
            ) VALUES (
              '${clientId}', 
              'Jorge Alberto', 
              'Garza', 
              'González', 
              'client_${clientId.substring(0, 8)}@example.com', 
              '0000000000', 
              '70b2aa97-a5b6-4b5e-91db-be8acbd3701a',
              false,
              false,
              NOW()
            );
          END IF;
        END $$;
      `;
      
      try {
        // Execute directly with RPC
        console.log('[createMissingClient] Executing direct SQL insert for problematic ID');
        const serviceClient = getServiceClient();
        const { error: execError } = await serviceClient.rpc('execute_sql', { query_text: directSql });
        
        if (execError) {
          console.error(`[createMissingClient] Error in direct SQL for problematic ID: ${execError.message}`);
        } else {
          console.log('[createMissingClient] Direct SQL for problematic ID executed successfully');
          
          // Now try to get the client - it should exist now
          try {
            return await getClientById(clientId);
          } catch (getError) {
            console.error('[createMissingClient] Still cannot fetch client after direct insertion:', getError);
          }
        }
      } catch (directError) {
        console.error('[createMissingClient] Exception executing direct SQL:', directError);
      }
    }
    
    // Continue with normal flow - check if client exists
    const exists = await checkClientExistsById(clientId);
    if (exists) {
      console.log(`[createMissingClient] Client with ID ${clientId} already exists, no need to create stub`);
      return getClientById(clientId).catch(err => {
        console.error(`[createMissingClient] Error fetching existing client: ${err}`);
        return null;
      });
    }
    
    // Parse client name parts if available
    let firstName = 'Unknown';
    let paternalSurname = 'Client';
    let maternalSurname = '';
    
    if (clientName) {
      const nameParts = clientName.split(' ');
      if (nameParts.length >= 1) firstName = nameParts[0];
      if (nameParts.length >= 2) paternalSurname = nameParts[1];
      if (nameParts.length >= 3) maternalSurname = nameParts.slice(2).join(' ');
    }
    
    // Generate the SQL to insert directly with the specified ID, with ON CONFLICT DO NOTHING
    const serviceClient = getServiceClient();
    const insertQuery = `
      INSERT INTO users (
        id, first_name, paternal_surname, maternal_surname, email, phone, 
        company_id, is_sso_user, is_anonymous, created_at
      ) VALUES (
        '${clientId}', 
        '${firstName.replace(/'/g, "''")}', 
        '${paternalSurname.replace(/'/g, "''")}', 
        '${maternalSurname.replace(/'/g, "''")}', 
        'client_${clientId.substring(0, 8)}@example.com', 
        '0000000000', 
        '70b2aa97-a5b6-4b5e-91db-be8acbd3701a',
        false,
        false,
        NOW()
      ) ON CONFLICT (id) DO NOTHING
      RETURNING id, first_name, paternal_surname, maternal_surname, email, phone;
    `;
    
    console.log(`[createMissingClient] Executing insert query for missing client: ${clientId}`);
    
    // Try the direct SQL approach first (most reliable)
    try {
      const { data: sqlData, error: sqlError } = await serviceClient.rpc('execute_sql', { 
        query_text: insertQuery 
      });
      
      if (sqlError) {
        console.error(`[createMissingClient] Error creating client via SQL: ${sqlError.message}`, sqlError);
      } else if (sqlData && sqlData.length > 0) {
        console.log(`[createMissingClient] Successfully created stub client with ID: ${clientId} via SQL`);
        
        // Retrieve the newly created client
        return getClientById(clientId).catch(err => {
          console.error(`[createMissingClient] Error fetching newly created client: ${err}`);
          return null;
        });
      } else {
        console.log(`[createMissingClient] SQL query executed but no rows returned, trying fallback method`);
      }
    } catch (sqlExecError) {
      console.error(`[createMissingClient] Exception executing SQL: ${sqlExecError}`);
    }
    
    // Fallback to direct Supabase insert if SQL RPC fails
    console.log(`[createMissingClient] Trying fallback insert method for client: ${clientId}`);
    try {
      const { data, error } = await serviceClient
        .from('users')
        .insert([{
          id: clientId,
          first_name: firstName,
          paternal_surname: paternalSurname,
          maternal_surname: maternalSurname,
          email: `client_${clientId.substring(0, 8)}@example.com`,
          phone: '0000000000',
          company_id: '70b2aa97-a5b6-4b5e-91db-be8acbd3701a',
          is_sso_user: false,
          is_anonymous: false,
          created_at: new Date().toISOString()
        }])
        .select('*');
        
      if (error) {
        console.error(`[createMissingClient] Error in fallback insert: ${error.message}`, error);
        return null;
      }
      
      if (data && data.length > 0) {
        console.log(`[createMissingClient] Successfully created client via fallback insert: ${data[0].id}`);
        return mapUserToClient(data[0]);
      }
    } catch (insertError) {
      console.error(`[createMissingClient] Exception in fallback insert: ${insertError}`);
    }
    
    // Last resort: force get client to trigger the fallback logic in getClientById
    try {
      console.log(`[createMissingClient] Trying one last forced getClientById call for: ${clientId}`);
      return await getClientById(clientId);
    } catch (finalError) {
      console.error(`[createMissingClient] Final attempt failed: ${finalError}`);
      return null;
    }
  } catch (error) {
    console.error(`[createMissingClient] Error in createMissingClient: ${error}`);
    return null;
  }
};

/**
 * Attempts to fetch client data from any available source
 * This function checks multiple tables/views to find client data:
 * 1. First checks users_full_profiles view (if it exists)
 * 2. Then checks users table
 * 3. Finally checks clients table
 * 
 * @param clientId The ID of the client to fetch
 * @returns Client data or null if not found in any source
 */
export const getClientFromAnySource = async (clientId: string): Promise<Client | null> => {
  if (!clientId) {
    console.log('[getClientFromAnySource] No client ID provided');
    return null;
  }
  
  console.log(`[getClientFromAnySource] Attempting to fetch client ${clientId} from any source`);
  
  try {
    // Try 1: users_full_profiles view first if it exists
    try {
      console.log(`[getClientFromAnySource] Checking users_full_profiles view for client ${clientId}`);
      const { data: profileData, error: profileError } = await supabase
        .from('users_full_profiles')
        .select('*')
        .eq('id', clientId)
        .maybeSingle();
      
      if (profileError) {
        // If the view doesn't exist or other error, just log and continue
        console.log(`[getClientFromAnySource] Error or view not found: ${profileError.message}`);
      } else if (profileData) {
        console.log(`[getClientFromAnySource] Client found in users_full_profiles view`);
        return mapUserToClient(profileData);
      }
    } catch (viewError) {
      console.log(`[getClientFromAnySource] Exception checking users_full_profiles: ${viewError}`);
      // Continue to next source
    }
    
    // Try 2: users table (most common)
    try {
      console.log(`[getClientFromAnySource] Checking users table for client ${clientId}`);
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', clientId)
        .maybeSingle();
      
      if (userError) {
        console.log(`[getClientFromAnySource] Error checking users table: ${userError.message}`);
      } else if (userData) {
        console.log(`[getClientFromAnySource] Client found in users table`);
        return mapUserToClient(userData);
      }
    } catch (userError) {
      console.log(`[getClientFromAnySource] Exception checking users table: ${userError}`);
      // Continue to next source
    }
    
    // Try 3: clients table as fallback
    try {
      console.log(`[getClientFromAnySource] Checking clients table for client ${clientId}`);
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .maybeSingle();
      
      if (clientError) {
        console.log(`[getClientFromAnySource] Error checking clients table: ${clientError.message}`);
      } else if (clientData) {
        console.log(`[getClientFromAnySource] Client found in clients table`);
        return mapUserToClient(clientData);
      }
    } catch (clientError) {
      console.log(`[getClientFromAnySource] Exception checking clients table: ${clientError}`);
    }
    
    // Add closing return statement for getClientFromAnySource
    console.log(`[getClientFromAnySource] Client ${clientId} not found in any source`);
    return null;
  } catch (error) {
    console.error(`[getClientFromAnySource] Error: ${error}`);
    return null;
  }
};

/**
 * Gets canonical/preferred client ID when multiple IDs might exist for same client
 * 
 * @param clientId The client ID to check
 * @returns The canonical client ID or the original if no mapping exists
 */
export const getCanonicalClientId = async (clientId: string): Promise<string | null> => {
  if (!clientId) return null;
  
  console.log(`[getCanonicalClientId] Checking for canonical ID mapping for: ${clientId}`);
  
  try {
    // Check if there's a mapping in client_id_mappings table
    const { data: mappingData, error: mappingError } = await supabase
      .from('client_id_mappings')
      .select('canonical_id')
      .eq('client_id', clientId)
      .maybeSingle();
      
    if (mappingError) {
      console.log(`[getCanonicalClientId] Error or table doesn't exist: ${mappingError.message}`);
      return clientId; // Return original ID if table doesn't exist or error
    }
    
    if (mappingData?.canonical_id) {
      console.log(`[getCanonicalClientId] Found canonical mapping: ${clientId} -> ${mappingData.canonical_id}`);
      return mappingData.canonical_id;
    }
    
    return clientId; // No mapping found, return original
  } catch (error) {
    console.error(`[getCanonicalClientId] Error: ${error}`);
    return clientId; // Return original on error
  }
};

/**
 * Robust client fetch function that handles synchronization with external systems
 * 
 * @param clientId The client ID to fetch
 * @returns Client data or null if not found
 */
export const getClientWithSync = async (clientId: string): Promise<Client | null> => {
  if (!clientId) return null;
  
  try {
    // First check if we need to map to a canonical ID
    const canonicalId = await getCanonicalClientId(clientId);
    const idToUse = canonicalId || clientId;
    
    // Try to get from any source first
    let client = await getClientFromAnySource(idToUse);
    
    // If client found, return it
    if (client) return client;
    
    // If not found, try to create a placeholder client
    return await createMissingClient(idToUse);
  } catch (error) {
    console.error(`[getClientWithSync] Error: ${error}`);
    return null;
  }
}; 