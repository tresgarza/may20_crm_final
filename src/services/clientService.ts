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
import { uploadClientDocuments as uploadDocs } from '../utils/documentUpload';

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
  
  return client;
};

export const getClients = async (filters?: ClientFilter) => {
  try {
    // Usamos el cliente de servicio para evitar problemas de autenticación
    const serviceClient = getServiceClient();
    
    let query = serviceClient.from(USERS_TABLE)
      .select('id, email, first_name, paternal_surname, maternal_surname, phone, company_id, created_at, birth_date, rfc, curp, advisor_id, address, city, state, postal_code, gender, marital_status, employment_type, employment_years, monthly_income, additional_income, monthly_expenses, other_loan_balances, bank_name, bank_clabe, bank_account_number, bank_account_type, bank_account_origin, street_number_ext, street_number_int, neighborhood, home_phone, birth_state, nationality, job_position, employer_name, employer_phone, employer_address, employer_activity, mortgage_payment, rent_payment, dependent_persons, income_frequency, payment_method, credit_purpose, spouse_paternal_surname, spouse_maternal_surname, reference1_name, reference1_relationship, reference1_address, reference1_phone, reference2_name, reference2_relationship, reference2_address, reference2_phone, last_login', { count: 'exact' });

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

      if (filters.searchQuery) {
        query = query.or(
          `first_name.ilike.%${filters.searchQuery}%,paternal_surname.ilike.%${filters.searchQuery}%,maternal_surname.ilike.%${filters.searchQuery}%,email.ilike.%${filters.searchQuery}%,phone.ilike.%${filters.searchQuery}%,rfc.ilike.%${filters.searchQuery}%,curp.ilike.%${filters.searchQuery}%`
        );
      }

      if (filters.page !== undefined && filters.pageSize) {
        const from = filters.page * filters.pageSize;
        const to = from + filters.pageSize - 1;
        query = query.range(from, to);
      }
    }

    query = query.order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      logError(error, 'getClients', { filters });
      throw handleApiError(error);
    }

    const clients = data ? data.map(mapUserToClient) : [];

    return {
      clients,
      totalCount: count || 0
    };
  } catch (error) {
    logError(error, 'getClients', { filters });
    throw handleApiError(error);
  }
};

export const getClientById = async (id: string) => {
  try {
    // Usamos el cliente de servicio para evitar problemas de autenticación
    const serviceClient = getServiceClient();
    
    const { data, error } = await serviceClient
      .from(USERS_TABLE)
      .select('id, email, first_name, paternal_surname, maternal_surname, phone, company_id, created_at, birth_date, rfc, curp, advisor_id, address, city, state, postal_code, gender, marital_status, employment_type, employment_years, monthly_income, additional_income, monthly_expenses, other_loan_balances, bank_name, bank_clabe, bank_account_number, bank_account_type, bank_account_origin, street_number_ext, street_number_int, neighborhood, home_phone, birth_state, nationality, job_position, employer_name, employer_phone, employer_address, employer_activity, mortgage_payment, rent_payment, dependent_persons, income_frequency, payment_method, credit_purpose, spouse_paternal_surname, spouse_maternal_surname, reference1_name, reference1_relationship, reference1_address, reference1_phone, reference2_name, reference2_relationship, reference2_address, reference2_phone, last_login')
      .eq('id', id)
      .single();

    if (error) {
      logError(error, 'getClientById', { clientId: id });
      throw handleApiError(error);
    }

    if (!data) {
      const notFoundError = createAppError(
        ErrorType.NOT_FOUND,
        `No se encontró cliente con ID: ${id}`
      );
      logError(notFoundError, 'getClientById', { clientId: id });
      throw notFoundError;
    }

    return mapUserToClient(data);
  } catch (error) {
    logError(error, 'getClientById', { clientId: id });
    throw handleApiError(error);
  }
};

function escapeSQLString(str: string) {
  if (!str) return '';
  return str.replace(/'/g, "''");
}

export const getClientApplications = async (clientId: string) => {
  try {
    const client = await getClientById(clientId).catch(err => {
      console.error(`Error obteniendo cliente con ID ${clientId}:`, err);
      throw handleApiError(err);
    });
    
    if (!client) {
      const notFoundError = createAppError(
        ErrorType.NOT_FOUND,
        `El cliente no existe`
      );
      logError(notFoundError, 'getClientApplications', { clientId });
      return [];
    }
    
    // Construir la consulta con el nombre del cliente
    const query = `
      SELECT * FROM ${TABLES.APPLICATIONS}
      WHERE client_name = '${escapeSQLString(client.name || '')}'
      ORDER BY created_at DESC
    `;
    
    console.log(`Ejecutando consulta para obtener aplicaciones del cliente ${clientId}:`, query);
    
    // Utilizamos el servicio de consulta SQL directo que evita problemas de RLS
    const executeQuery = async (query: string) => {
      try {
        const response = await fetch('http://localhost:3100/query', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: query }),
        });
        
        if (!response.ok) {
          throw new Error(`Error en la respuesta HTTP: ${response.status} ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.error) {
          console.error('Error en la consulta SQL:', result.error);
          throw new Error(result.error);
        }
        
        return result.data || [];
      } catch (error) {
        console.error('Error ejecutando la consulta:', error);
        throw error;
      }
    };
    
    const data = await executeQuery(query);
    console.log(`Aplicaciones encontradas para el cliente ${clientId}:`, data.length);
    return data;
  } catch (error) {
    logError(error, 'getClientApplications', { clientId });
    console.error(`Error completo al obtener aplicaciones para cliente ${clientId}:`, error);
    // Devolvemos un array vacío en caso de error para no interrumpir el flujo
    return [];
  }
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

export const createClient = async (client: Omit<Client, 'id' | 'created_at'>, documents?: ClientDocument[], userId?: string) => {
  try {
    // Create a copy to avoid modifying the original object
    const userData = {
      email: client.email,
      first_name: client.first_name || '',
      paternal_surname: client.paternal_surname || '',
      maternal_surname: client.maternal_surname || '',
      phone: client.phone,
      birth_date: client.birth_date,
      company_id: client.company_id,
      rfc: client.rfc,
      curp: client.curp,
      advisor_id: client.advisor_id,
      address: client.address,
      city: client.city,
      state: client.state,
      postal_code: client.postal_code,
      gender: client.gender,
      marital_status: client.marital_status,
      employment_type: client.employment_type,
      employment_years: client.employment_years,
      monthly_income: client.monthly_income,
      additional_income: client.additional_income,
      monthly_expenses: client.monthly_expenses,
      other_loan_balances: client.other_loan_balances,
      bank_name: client.bank_name,
      bank_clabe: client.bank_clabe,
      bank_account_number: client.bank_account_number,
      bank_account_type: client.bank_account_type,
      bank_account_origin: client.bank_account_origin,
      street_number_ext: client.street_number_ext,
      street_number_int: client.street_number_int,
      neighborhood: client.neighborhood,
      home_phone: client.home_phone,
      birth_state: client.birth_state,
      nationality: client.nationality,
      job_position: client.job_position,
      employer_name: client.employer_name,
      employer_phone: client.employer_phone,
      employer_address: client.employer_address,
      employer_activity: client.employer_activity,
      mortgage_payment: client.mortgage_payment,
      rent_payment: client.rent_payment,
      dependent_persons: client.dependent_persons,
      income_frequency: client.income_frequency,
      payment_method: client.payment_method,
      credit_purpose: client.credit_purpose,
      spouse_paternal_surname: client.spouse_paternal_surname,
      spouse_maternal_surname: client.spouse_maternal_surname,
      reference1_name: client.reference1_name,
      reference1_relationship: client.reference1_relationship,
      reference1_address: client.reference1_address,
      reference1_phone: client.reference1_phone,
      reference2_name: client.reference2_name,
      reference2_relationship: client.reference2_relationship,
      reference2_address: client.reference2_address,
      reference2_phone: client.reference2_phone,
    };

    // Asegurarse de que no se incluyan campos calculados
    // Estos campos son calculados en la aplicación pero no existen en la base de datos
    delete (userData as any).name;
    delete (userData as any).warningMessage;

    // Process numeric fields
    if (userData.employment_years !== undefined) {
      const processed = processNumericField(userData.employment_years);
      userData.employment_years = processed === null ? undefined : processed;
    }
    if (userData.monthly_income !== undefined) {
      const processed = processNumericField(userData.monthly_income);
      userData.monthly_income = processed === null ? undefined : processed;
    }
    if (userData.additional_income !== undefined) {
      const processed = processNumericField(userData.additional_income);
      userData.additional_income = processed === null ? undefined : processed;
    }
    if (userData.monthly_expenses !== undefined) {
      const processed = processNumericField(userData.monthly_expenses);
      userData.monthly_expenses = processed === null ? undefined : processed;
    }
    if (userData.other_loan_balances !== undefined) {
      const processed = processNumericField(userData.other_loan_balances);
      userData.other_loan_balances = processed === null ? undefined : processed;
    }

    // Ensure company_id is present as it's required by the database schema
    if (!userData.company_id) {
      console.warn('No company_id provided when creating client - using default company');
      userData.company_id = "70b2aa97-a5b6-4b5e-91db-be8acbd3701a"; // Default company (Herramental)
    }

    // Log sanitized data for debugging
    console.log(`Creating client with sanitized data:`, JSON.stringify(userData));

    // Get the service client for this operation to evitar problemas de autenticación
    const serviceClient = getServiceClient();

    const { data, error, count } = await serviceClient
      .from(USERS_TABLE)
      .insert([userData])
      .select();

    if (error) {
      // Verificar si es una violación de RLS
      if (isRlsViolation(error)) {
        throw createRlsViolationError('crear', 'cliente', 'nuevo', error);
      }
      
      logError(error, 'createClient');
      throw handleApiError(error);
    }

    // Verify that rows were affected
    if (!data || data.length === 0 || count === 0) {
      const noDataError = createAppError(
        ErrorType.SERVER,
        'No se pudo crear el cliente. No se recibieron datos del servidor.'
      );
      logError(noDataError, 'createClient');
      throw noDataError;
    }

    const newClient = mapUserToClient(data[0]);
    let documentResult = null;
    
    if (documents && documents.length > 0 && userId && newClient.id) {
      try {
        console.log(`Uploading ${documents.length} documents for new client ${newClient.id}`);
        
        // Usar la versión mejorada de uploadClientDocuments de utils
        documentResult = await uploadDocs(newClient.id, documents);
        
        // Check if any documents uploaded successfully
        if (documentResult && documentResult.length > 0) {
          console.log(`${documentResult.length} documents uploaded successfully during client creation`);
        } else {
          console.warn(`No documents were successfully uploaded during client creation`);
          newClient.warningMessage = 'Se creó el cliente, pero no se pudieron subir los documentos. Puede intentar agregarlos nuevamente más tarde.';
        }
      } catch (docError) {
        console.error('Error uploading documents during client creation:', docError);
        
        // Información más detallada del error
        const errorMessage = docError instanceof Error ? docError.message : 'Error desconocido';
        console.error(`Error detail: ${errorMessage}`);
        
        // Continue with client creation but add warning
        newClient.warningMessage = `Se creó el cliente, pero hubo un problema al subir los documentos: ${errorMessage}. Puede intentar agregarlos nuevamente más tarde.`;
      }
    }

    return newClient;
  } catch (error) {
    logError(error, 'createClient', { clientData: client });
    throw handleApiError(error);
  }
};

export const updateClient = async (id: string, updates: Partial<Client>, documents?: ClientDocument[], userId?: string) => {
  try {
    console.log(`Starting client update for ID ${id}`, updates);
    
    // Create a copy to avoid modifying the original object
    const userUpdates: any = { ...updates };
    
    // Eliminar campos calculados o virtuales que no existen en la base de datos
    // El campo 'name' es calculado en mapUserToClient pero no existe en la tabla
    delete userUpdates.name;
    delete userUpdates.warningMessage;
    
    // Process specific numeric fields
    if ('employment_years' in updates) {
      const processed = processNumericField(updates.employment_years);
      userUpdates.employment_years = processed === null ? undefined : processed;
    }
    if ('monthly_income' in updates) {
      const processed = processNumericField(updates.monthly_income);
      userUpdates.monthly_income = processed === null ? undefined : processed;
    }
    if ('additional_income' in updates) {
      const processed = processNumericField(updates.additional_income);
      userUpdates.additional_income = processed === null ? undefined : processed;
    }
    if ('monthly_expenses' in updates) {
      const processed = processNumericField(updates.monthly_expenses);
      userUpdates.monthly_expenses = processed === null ? undefined : processed;
    }
    if ('other_loan_balances' in updates) {
      const processed = processNumericField(updates.other_loan_balances);
      userUpdates.other_loan_balances = processed === null ? undefined : processed;
    }
    if ('mortgage_payment' in updates) {
      const processed = processNumericField(updates.mortgage_payment);
      userUpdates.mortgage_payment = processed === null ? undefined : processed;
    }
    if ('rent_payment' in updates) {
      const processed = processNumericField(updates.rent_payment);
      userUpdates.rent_payment = processed === null ? undefined : processed;
    }
    if ('dependent_persons' in updates) {
      const processed = processNumericField(updates.dependent_persons);
      userUpdates.dependent_persons = processed === null ? undefined : processed;
    }

    // Remove undefined fields
    Object.keys(userUpdates).forEach(key => {
      const typedKey = key as keyof typeof userUpdates;
      if (userUpdates[typedKey] === undefined) {
        delete userUpdates[typedKey];
      }
    });

    console.log(`Updating client ${id} with sanitized data:`, JSON.stringify(userUpdates));

    // Get the service client for this operation to evitar problemas de permisos
    const serviceClient = getServiceClient();

    // First, verify the client exists
    const { data: existingClient, error: existingError } = await serviceClient
      .from(USERS_TABLE)
      .select('id')
      .eq('id', id)
      .single();

    if (existingError || !existingClient) {
      const notFoundError = createAppError(
        ErrorType.NOT_FOUND,
        `No se encontró el cliente con ID ${id}. Verifique que el cliente exista.`
      );
      logError(notFoundError, 'updateClient', { clientId: id });
      throw notFoundError;
    }

    // Perform the update with the service client
    const { data, error, count } = await serviceClient
      .from(USERS_TABLE)
      .update(userUpdates)
      .eq('id', id)
      .select();

    if (error) {
      // Verificar si es una violación de RLS
      if (isRlsViolation(error)) {
        throw createRlsViolationError('actualizar', 'cliente', id, error);
      }
      
      logError(error, 'updateClient', { clientId: id });
      throw handleApiError(error);
    }

    // Verify that the update affected rows
    if (!data || data.length === 0 || count === 0) {
      console.warn(`Update operation didn't affect any rows for client ${id}`);
      throw createNoEffectError('update', 'cliente', id);
    }

    let updatedClient: Client;

    if (!data || data.length === 0) {
      console.log(`No data returned when updating client with ID ${id}, fetching client data separately`);
      
      // Fallback: fetch the client data separately
      const { data: fetchedData, error: fetchError } = await serviceClient
        .from(USERS_TABLE)
        .select('*')
        .eq('id', id)
        .single();
      
      if (fetchError) {
        console.error('Error fetching updated client:', fetchError);
        throw fetchError;
      }
      
      updatedClient = mapUserToClient(fetchedData);
    } else {
      updatedClient = mapUserToClient(data[0]);
    }
    
    let documentResult = null;
    
    // Upload documents if provided
    if (documents && documents.length > 0 && userId) {
      try {
        console.log(`Uploading ${documents.length} documents for client ${id}`);
        
        // Usar la versión mejorada de uploadClientDocuments de utils
        documentResult = await uploadDocs(id, documents);
        
        // Check if any documents failed to upload
        if (documentResult && documentResult.length > 0) {
          console.log(`${documentResult.length} documents uploaded successfully during client update`);
        } else {
          console.warn(`No documents were successfully uploaded during client update`);
          updatedClient.warningMessage = 'Se actualizó el cliente, pero no se pudieron subir los documentos. Puede intentar agregarlos nuevamente más tarde.';
        }
      } catch (docError) {
        console.error(`Error uploading documents for client ${id}:`, docError);
        
        // Información más detallada del error
        const errorMessage = docError instanceof Error ? docError.message : 'Error desconocido';
        console.error(`Error detail: ${errorMessage}`);
        
        // Continue with client update but add warning
        updatedClient.warningMessage = `Se actualizó el cliente, pero hubo un problema al subir los documentos: ${errorMessage}. Puede intentar agregarlos nuevamente más tarde.`;
      }
    }

    console.log(`Client update complete for ID ${id}`);
    return updatedClient;
  } catch (error) {
    logError(error, 'updateClient', { clientId: id, updates });
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