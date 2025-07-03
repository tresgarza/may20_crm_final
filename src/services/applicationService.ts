import { TABLES } from '../utils/constants/tables';
import { APPLICATION_STATUS, STATUS_LABELS } from '../utils/constants/statuses';
import { supabase, getServiceClient } from '../services/supabaseService';
import { executeQuery, escapeSqlString } from '../utils/databaseUtils';
import { v4 as uuidv4 } from 'uuid';

// Verify if APPLICATION_HISTORY table is defined in TABLES
let APPLICATION_HISTORY_TABLE = TABLES.APPLICATION_HISTORY;
if (!APPLICATION_HISTORY_TABLE) {
  // If not defined, create a fallback
  APPLICATION_HISTORY_TABLE = 'application_history';
}

// Define the type of application statuses
export type ApplicationStatus = 'pending' | 'in_review' | 'approved' | 'rejected' | 'cancelled' | 'expired' | 'completed' | 'solicitud' | 'new' | 'por_dispersar';

// Define application interface
export interface Application {
  id: string;
  client_id: string;
  company_id: string;
  assigned_to: string;
  application_type: string;
  source_id: string; // Identificador de la fuente (por ejemplo, ID del cliente o campaña que originó la solicitud)
  product_type?: string;  // Tipo de producto (préstamo personal, auto, etc.)
  status: ApplicationStatus;
  status_previous?: string;
  
  // Añadir campos de estado específicos para cada rol 
  advisor_status?: ApplicationStatus;
  company_status?: ApplicationStatus;
  global_status?: ApplicationStatus;
  
  // Campos para el historial de estados previos
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
  rejected_by_advisor?: boolean;  // New field to track advisor rejections
  rejected_by_company?: boolean;  // New field to track company rejections  
  approval_date_advisor?: string;
  approval_date_company?: string;
  dispersal_date?: string;
  dni?: string;
  
  // Campos adicionales que necesitan los formularios
  amount?: number;
  term?: number;
  interest_rate?: number;
  monthly_payment?: number;
  
  // Campo de tipo de financiamiento
  financing_type?: string;
  product_url?: string;
  product_title?: string;
  product_image?: string;
  product_price?: number;  // Precio del producto (para financing_type='producto')

  // Campo de pago / comisión
  credito_solicitado?: number;
  payment_frequency?: string;
}

export interface ApplicationFilter {
  status?: string;
  searchQuery?: string;
  advisor_id?: string;
  company_id?: string;
  dateFrom?: string;
  dateTo?: string;
  application_type?: string;
  amountMin?: number;
  amountMax?: number;
}

// Get all applications with filters
export const getApplications = async (filters?: ApplicationFilter, entityFilter?: Record<string, any> | null) => {
  try {
    console.log("getApplications called with filters:", filters);
    
    // Usar directamente la API de Supabase en lugar de SQL manual
    let query = supabase
      .from(TABLES.APPLICATIONS)
      .select('*');
    
    // Aplicar filtro de entidad
    if (entityFilter?.advisor_id) {
      query = query.eq('assigned_to', entityFilter.advisor_id);
    }
    
    if (entityFilter?.company_id) {
      query = query.eq('company_id', entityFilter.company_id);
    }
    
    // Aplicar filtros de búsqueda
    if (filters) {
      // Filtro por estado
      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      
      // Filtro por tipo de aplicación
      if (filters.application_type) {
        console.log(`Applying application_type filter: ${filters.application_type}`);
        query = query.eq('application_type', filters.application_type);
      }
      
      // Filtro por asesor
      if (filters.advisor_id) {
        query = query.eq('assigned_to', filters.advisor_id);
      }
      
      // Filtro por empresa
      if (filters.company_id) {
        query = query.eq('company_id', filters.company_id);
      }
      
      // Filtro por fecha
      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      
      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }
      
      // Filtros de monto
      if (filters.amountMin) {
        query = query.gte('credito_solicitado', filters.amountMin);
      }
      
      if (filters.amountMax) {
        query = query.lte('credito_solicitado', filters.amountMax);
      }
      
      // Búsqueda por texto
      if (filters.searchQuery) {
        const searchTerm = filters.searchQuery.toLowerCase();
        query = query.or(`client_name.ilike.%${searchTerm}%,client_email.ilike.%${searchTerm}%,company_name.ilike.%${searchTerm}%`);
      }
    }
    
    // Ordenar por fecha de creación más reciente
    query = query.order('created_at', { ascending: false });
    
    // Ejecutar la consulta
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching applications:', error);
      return [];
    }
    
    if (!data || !Array.isArray(data) || data.length === 0) {
      return [];
    }
    
    console.log(`Retrieved ${data.length} applications from database`);
    
    // Log the types of applications we retrieved
    const types = new Set(data.map(app => app.application_type));
    console.log('DB application types:', Array.from(types));
    
    // Double-check if the filter was applied correctly
    if (filters?.application_type) {
      const matchingApps = data.filter(app => app.application_type === filters.application_type);
      console.log(`After DB query: ${matchingApps.length} of ${data.length} apps match type '${filters.application_type}'`);
    }
    
    // Mapear los campos de la BD a nuestra interfaz
    return data.map((app: any) => {
      // Obtener el estado mapeado
      const mappedStatus = mapStatusFromDB(app.status);
      
      // Asegurar que los estados específicos por rol estén inicializados
      // Si no existen, usar el estado principal
      const advisorStatus = app.advisor_status ? mapStatusFromDB(app.advisor_status) : mappedStatus;
      const companyStatus = app.company_status ? mapStatusFromDB(app.company_status) : mappedStatus;
      const globalStatus = app.global_status ? mapStatusFromDB(app.global_status) : mappedStatus;
      
      return {
        id: app.id,
        client_id: app.client_id || "",
        company_id: app.company_id || "",
        assigned_to: app.assigned_to || "",
        application_type: app.application_type || "",
        source_id: app.source_id || "",
        status: mappedStatus,
        
        // Añadir los estados específicos para cada rol
        advisor_status: advisorStatus,
        company_status: companyStatus,
        global_status: globalStatus,
        
        created_at: app.created_at,
        updated_at: app.updated_at,
        client_name: app.client_name,
        client_email: app.client_email,
        company_name: app.company_name,
        advisor_name: "", // Este campo no está en la BD
        approved_by_advisor: app.approved_by_advisor || false,
        approved_by_company: app.approved_by_company || false,
        rejected_by_advisor: app.rejected_by_advisor || false,
        rejected_by_company: app.rejected_by_company || false,
        approval_date_advisor: app.approval_date_advisor,
        approval_date_company: app.approval_date_company,
        
        // Mapeo directo de campos adicionales de la BD
        client_phone: app.client_phone,
        client_address: app.client_address,
        dni: app.dni,
        amount: app.credito_solicitado ? parseFloat(app.credito_solicitado) : (app.amount ? parseFloat(app.amount) : 0),
        term: app.term ? parseInt(app.term) : undefined,
        interest_rate: app.interest_rate ? parseFloat(app.interest_rate) : undefined,
        monthly_payment: app.monthly_payment ? parseFloat(app.monthly_payment) : undefined,
        
        // Campos para tipo de financiamiento y productos
        financing_type: app.financing_type || null,
        product_url: app.product_url || null,
        product_title: app.product_title || null,
        product_image: app.product_image || null,
        product_price: app.product_price ? parseFloat(app.product_price.toString()) : undefined,

        // NUEVOS CAMPOS
        credito_solicitado: app.credito_solicitado ? parseFloat(app.credito_solicitado) : undefined,
        payment_frequency: app.payment_frequency || null,
      };
    }) as Application[];
  } catch (error) {
    console.error('Error fetching applications:', error);
    // Return empty array instead of throwing to prevent UI crashes
    return [];
  }
};

// Función auxiliar para mapear estados de la BD a nuestro enum
const mapStatusFromDB = (dbStatus: string): ApplicationStatus => {
  // Si el estado es null, undefined, o una cadena vacía, asumimos que es NEW
  if (!dbStatus) {
    console.log('Estado vacío o nulo, mapeando a NEW');
    return APPLICATION_STATUS.NEW as ApplicationStatus;
  }
  
  // Normalizamos para comparar
  const normalizedStatus = dbStatus.toLowerCase().trim();
  
  // Estos estados siempre deben considerarse como 'new'
  if (normalizedStatus === 'solicitud' || normalizedStatus === 'pending') {
    console.log(`Mapeando estado "${dbStatus}" a "new"`);
    return APPLICATION_STATUS.NEW as ApplicationStatus;
  }
  
  // Primero verificamos si coincide con algún enum directamente
  const directMapping = Object.values(APPLICATION_STATUS).find(status => 
    status.toLowerCase() === normalizedStatus
  );
  
  if (directMapping) {
    return directMapping as ApplicationStatus;
  }
  
  // Si no hay coincidencia directa, usamos un mapeo manual
  const statusMap: Record<string, ApplicationStatus> = {
    'solicitud': APPLICATION_STATUS.NEW,
    'pendiente': APPLICATION_STATUS.NEW,
    'pending': APPLICATION_STATUS.NEW,
    'en revisión': APPLICATION_STATUS.IN_REVIEW,
    'revisión': APPLICATION_STATUS.IN_REVIEW,
    'aprobado': APPLICATION_STATUS.APPROVED,
    'rechazado': APPLICATION_STATUS.REJECTED,
    'por dispersar': APPLICATION_STATUS.POR_DISPERSAR,
    'completado': APPLICATION_STATUS.COMPLETED,
    'cancelado': APPLICATION_STATUS.CANCELLED,
    'expirado': APPLICATION_STATUS.EXPIRED
  };
  
  console.log(`Mapeando estado desde BD: "${dbStatus}" -> "${statusMap[normalizedStatus] || APPLICATION_STATUS.NEW}"`);
  return (statusMap[normalizedStatus] || APPLICATION_STATUS.NEW) as ApplicationStatus;
};

// Get a single application by ID
export const getApplicationById = async (id: string, entityFilter?: Record<string, any> | null) => {
  console.log(`[getApplicationById] Fetching application with ID: ${id}`);
  
  let query = `SELECT a.*, adv.name AS advisor_name FROM ${TABLES.APPLICATIONS} a LEFT JOIN advisors adv ON adv.id = a.assigned_to WHERE a.id = '${id}'`;
  
  // Aplicar filtro por entidad si es necesario
  if (entityFilter) {
    if (entityFilter.advisor_id) {
      query += ` AND a.assigned_to = '${entityFilter.advisor_id}'`;
    }
    if (entityFilter.company_id) {
      query += ` AND a.company_id = '${entityFilter.company_id}'`;
    }
  }
  
  try {
    const data = await executeQuery(query);
    if (data && data.length > 0) {
      const app = data[0];
      const originalClientId = app.client_id;
      
      // Verificar si el ID del cliente es válido (formato UUID y existe en la BD)
      if (app.client_id) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        const isValidUuid = uuidRegex.test(app.client_id);
        
        if (isValidUuid) {
          // Importamos la función para verificar la existencia del cliente
          const { checkClientExistsById } = require('../services/clientService');
          
          try {
            const clientExists = await checkClientExistsById(app.client_id);
            
            // Si el cliente no existe pero tenemos source_id, intentamos usarlo como respaldo
            if (!clientExists && app.source_id) {
              console.log(`[getApplicationById] Cliente con ID ${app.client_id} no encontrado, verificando source_id: ${app.source_id}`);
              
              // Verificar también si source_id existe como cliente
              const sourceIdExists = await checkClientExistsById(app.source_id);
              
              if (sourceIdExists) {
                console.log(`[getApplicationById] source_id ${app.source_id} es válido, usándolo como respaldo`);
                app.client_id = app.source_id;
              } else {
                console.log(`[getApplicationById] Ni client_id ni source_id son válidos. Manteniendo client_id original.`);
              }
            } else {
              console.log(`[getApplicationById] Cliente con ID ${app.client_id} ${clientExists ? 'existe' : 'no existe'}`);
            }
          } catch (checkError) {
            console.error(`[getApplicationById] Error verificando cliente: ${checkError}`);
          }
        } else {
          console.log(`[getApplicationById] ID de cliente ${app.client_id} tiene formato no válido`);
          
          // Si el ID no es un UUID válido y tenemos source_id, intentamos usarlo
          if (app.source_id) {
            console.log(`[getApplicationById] Usando source_id ${app.source_id} como respaldo`);
            app.client_id = app.source_id;
          }
        }
      }
      
      if (originalClientId !== app.client_id) {
        console.log(`[getApplicationById] client_id cambiado de ${originalClientId} a ${app.client_id}`);
      }
      
      return app as Application;
    }
    throw new Error('Application not found');
  } catch (error) {
    console.error(`Error fetching application with ID ${id}:`, error);
    throw error;
  }
};

// Create a new application
export const createApplication = async (application: Omit<Application, 'id' | 'created_at' | 'updated_at'>) => {
  try {
    console.log('[createApplication] Creating new application:', application);
    
    /*
     * ---------------------------------------------------------------------
     * Ensure client_id provided in the payload actually exists in the
     * `clients` table (which keeps a 1-to-1 relation with `users`).
     * ---------------------------------------------------------------------
     * The form currently sends the selected user\'s ID (coming from `users`)
     * inside the `client_id` field.  Before inserting the application we
     * must translate this value into a valid record in the `clients` table,
     * creating the record (and the related user) if they do not yet exist.
     */

    let incomingUserId: string | undefined = application.client_id?.trim() || undefined;

    // If we don\'t have a user id at all, generate one and create a minimal
    // user record so we can satisfy the FK chain (users -> clients -> applications)
    if (!incomingUserId) {
      incomingUserId = uuidv4();
      await supabase.from('users').insert({ id: incomingUserId });
      console.log(`[createApplication] Generated new user with id ${incomingUserId}`);
    }

    // Try to find an existing client linked to this user_id
    let resolvedClientId = incomingUserId;
    const { data: existingClient, error: clientLookupError } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', incomingUserId)
      .single();

    if (clientLookupError && clientLookupError.code !== 'PGRST116') {
      // Real DB error – stop the flow
      console.error('[createApplication] Error looking up client:', clientLookupError);
      throw clientLookupError;
    }

    if (existingClient) {
      resolvedClientId = existingClient.id;
      console.log(`[createApplication] Found existing client ${resolvedClientId} for user_id ${incomingUserId}`);
    } else {
      // Create the client record – use the same UUID for id/user_id to respect the trigger constraint
      console.log(`[createApplication] Creating new client for user_id ${incomingUserId}`);
      resolvedClientId = incomingUserId;
      const { error: createClientError } = await supabase.from('clients').insert({
        id: resolvedClientId,
        user_id: incomingUserId,
        name: application.client_name,
        email: application.client_email,
        phone: application.client_phone,
        address: application.client_address,
        company_id: application.company_id,
        advisor_id: application.assigned_to,
      });
      if (createClientError) {
        console.error('[createApplication] Error creating new client:', createClientError);
        throw createClientError;
      }
    }

    // Overwrite the client_id in the payload with the verified value
    application.client_id = resolvedClientId;
    // ------------------------------------------------------------------

    // Remove undefined values and convert data types
    const cleanApplication = Object.fromEntries(
      Object.entries(application)
        .filter(([_, value]) => value !== undefined)
        .map(([key, value]) => {
          // Ensure numeric fields are actually numbers
          if (['amount', 'term', 'interest_rate', 'monthly_payment', 'product_price'].includes(key) && value !== undefined) {
            return [key, typeof value === 'string' ? parseFloat(value) : value];
          }
          
          // Ensure boolean fields are actually booleans
          if (['approved_by_advisor', 'approved_by_company', 'rejected_by_advisor', 'rejected_by_company'].includes(key)) {
            return [key, typeof value === 'string' ? value === 'true' : Boolean(value)];
          }
          
          return [key, value];
        })
    );
    
    // Si la aplicación no tiene source_id, generamos uno automáticamente usando uuidv4
    if (!cleanApplication.source_id || cleanApplication.source_id === '') {
      cleanApplication.source_id = uuidv4();
    }
    
    // Directly use Supabase client for better reliability
    const { data, error } = await supabase
      .from(TABLES.APPLICATIONS)
      .insert([cleanApplication])
      .select();
    
    if (error) {
      console.error('[createApplication] Error creating application via Supabase client:', error);
      
      // Fall back to SQL query if Supabase client fails
      console.log('[createApplication] Falling back to SQL query method');
      const fields = Object.keys(cleanApplication).join(', ');
      const values = Object.values(cleanApplication)
        .map(val => {
          if (val === null || val === undefined) {
            return 'NULL';
          } else if (typeof val === 'string') {
            return `'${val.replace(/'/g, "''")}'`; // Escape single quotes
          } else if (typeof val === 'number') {
            return val;
          } else if (typeof val === 'boolean') {
            return val ? 'true' : 'false';
          } else {
            return 'NULL';
          }
        })
    .join(', ');
  
  const query = `
    INSERT INTO ${TABLES.APPLICATIONS} (${fields})
    VALUES (${values})
    RETURNING *
  `;
  
      const sqlData = await executeQuery(query);
      console.log('[createApplication] SQL method returned:', sqlData[0]);
      return sqlData[0] as Application;
    }
    
    console.log('[createApplication] Successfully created application via Supabase client:', data);
    return data[0] as Application;
  } catch (error) {
    console.error('[createApplication] Error creating application:', error);
    throw error;
  }
};

// Update an existing application
export const updateApplication = async (id: string, updates: Partial<Application>, entityFilter?: Record<string, any> | null) => {
  const setClause = Object.entries(updates)
    .map(([key, value]) => `${key} = ${typeof value === 'string' ? `'${value}'` : value}`)
    .join(', ');
  
  let query = `
    UPDATE ${TABLES.APPLICATIONS}
    SET ${setClause}
    WHERE id = '${id}'
  `;
  
  // Aplicar filtro por entidad si es necesario
  if (entityFilter) {
    if (entityFilter.advisor_id) {
      query += ` AND assigned_to = '${entityFilter.advisor_id}'`;
    }
    if (entityFilter.company_id) {
      query += ` AND company_id = '${entityFilter.company_id}'`;
    }
  }
  
  query += ' RETURNING *';
  
  try {
    const data = await executeQuery(query);
    if (data && data.length > 0) {
      return data[0] as Application;
    }
    throw new Error('Application not found or you do not have permission to update it');
  } catch (error) {
    console.error(`Error updating application with ID ${id}:`, error);
    throw error;
  }
};

// Update application status and add to history
export const updateApplicationStatus = async (
  id: string, 
  status: Application['status'], 
  comment: string, 
  user_id: string,
  entityFilter?: Record<string, any> | null
) => {
  console.log(`[updateApplicationStatus] Updating status for application ${id} to ${status}`, { entityFilter });
  
  // 1. Obtener estado actual de la aplicación
  try {
    // Use Supabase client directly instead of SQL query for better reliability
    let query = supabase
      .from(TABLES.APPLICATIONS)
      .select('status, assigned_to, company_id, advisor_name, company_name')
      .eq('id', id);
    
    // Apply entity filter if needed
  if (entityFilter) {
    if (entityFilter.advisor_id) {
        query = query.eq('assigned_to', entityFilter.advisor_id);
    }
    if (entityFilter.company_id) {
        query = query.eq('company_id', entityFilter.company_id);
      }
    }
    
    const { data: currentStateData, error: fetchError } = await query;
    
    if (fetchError) {
      console.error(`[updateApplicationStatus] Error fetching application ${id}:`, fetchError);
      throw new Error(`Error fetching application: ${fetchError.message}`);
    }
    
    if (!currentStateData || currentStateData.length === 0) {
      console.error(`[updateApplicationStatus] Application not found or permission denied: ${id}`, { entityFilter });
      throw new Error('Application not found or you do not have permission to update it');
    }
    
    const currentStatus = currentStateData[0].status;
    console.log(`[updateApplicationStatus] Current status: ${currentStatus}, New status: ${status}`);
    
    // 2. Update the application using Supabase client
    const updateData: Partial<Application> = {
      status: status,
      status_previous: currentStatus
    };
    
    // If the new status is "completed", update the dispersal date
    if (status === 'completed') {
      updateData.dispersal_date = new Date().toISOString();
    }
    
    let updateQuery = supabase
      .from(TABLES.APPLICATIONS)
      .update(updateData)
      .eq('id', id);
    
    // Apply entity filter if needed
    if (entityFilter) {
      if (entityFilter.advisor_id) {
        updateQuery = updateQuery.eq('assigned_to', entityFilter.advisor_id);
      }
      if (entityFilter.company_id) {
        updateQuery = updateQuery.eq('company_id', entityFilter.company_id);
      }
    }
    
    const { data: updatedApp, error: updateError } = await updateQuery.select();
    
    if (updateError) {
      console.error(`[updateApplicationStatus] Error updating application ${id}:`, updateError);
      throw new Error(`Error updating application: ${updateError.message}`);
    }
    
    if (!updatedApp || updatedApp.length === 0) {
      console.error(`[updateApplicationStatus] Application not found or permission denied during update: ${id}`);
      throw new Error('Application not found or you do not have permission to update it');
    }
    
    // Obtener información del usuario que realiza el cambio
    let userQuery = supabase
      .from('users')
      .select('id, name, email, role')
      .eq('id', user_id);
    
    const { data: userData, error: userError } = await userQuery;
    let userName = 'Usuario desconocido';
    let userRole = 'Sin rol';
    
    if (!userError && userData && userData.length > 0) {
      userName = userData[0].name || 'Usuario desconocido';
      userRole = userData[0].role || 'Sin rol';
    }
    
    // Determinar si es asesor o empresa
    let userType = 'usuario';
    if (userRole.toLowerCase().includes('advisor') || 
        userRole.toLowerCase().includes('asesor')) {
      userType = 'asesor';
    } else if (userRole.toLowerCase().includes('company') || 
               userRole.toLowerCase().includes('empresa')) {
      userType = 'administrador de empresa';
    }
    
    // 3. Add to history with better description
    let historyComment = '';
    
    if (currentStatus !== status) {
      const statusFrom = STATUS_LABELS[currentStatus as keyof typeof STATUS_LABELS] || currentStatus;
      const statusTo = STATUS_LABELS[status as keyof typeof STATUS_LABELS] || status;
      
      if (comment.includes('Cambio de estado')) {
        historyComment = `Estado cambiado a ${status} por ${userType}`;
      } else {
        historyComment = `${comment} (Estado cambiado: ${statusFrom} → ${statusTo} por ${userName})`;
      }
    } else {
      historyComment = comment;
    }
      
    try {
      const historyEntry = {
        application_id: id,
        status: status,
        comment: historyComment,
        created_by: user_id ? user_id : null,
        old_status: currentStatus,
        user_type: userType
      };

      const { error: historyError } = await supabase
        .from(APPLICATION_HISTORY_TABLE)
        .insert([historyEntry]);

      if (historyError) {
        console.error(`Error recording status history for application ${id}:`, historyError);
        // Don't throw, as the primary operation succeeded
      } else {
        console.log(`Successfully recorded status history for application ${id}`);
      }
    } catch (historyError) {
      console.error(`Error recording status history for application ${id}:`, historyError);
      // Don't throw this error as it's not critical
    }
    
    console.log(`[updateApplicationStatus] Successfully updated status: ${currentStatus} → ${status}`);
    return updatedApp[0] as Application;
  } catch (error) {
    console.error(`[updateApplicationStatus] Error updating status of application ${id}:`, error);
    throw error;
  }
};

// Aprobar solicitud por asesor
export const approveByAdvisor = async (
  id: string,
  comment: string,
  advisor_id: string,
  entityFilter?: Record<string, any> | null
) => {
  // Verificar que el usuario es realmente un asesor
  if (!entityFilter?.advisor_id) {
    throw new Error('Solo los asesores pueden realizar esta acción');
  }
  
  try {
    console.log(`Aprobando solicitud ${id} por asesor ${advisor_id}...`);
    
    // Primero obtenemos la aplicación para verificar el estado de la aprobación de la empresa
    const { data: application, error: fetchError } = await supabase
      .from(TABLES.APPLICATIONS)
      .select('*')
      .eq('id', id)
      .eq('assigned_to', advisor_id)
      .single();
    
    if (fetchError) {
      console.error(`Error obteniendo solicitud ${id}:`, fetchError);
      throw new Error(`Error al obtener solicitud: ${fetchError.message}`);
    }
    
    if (!application) {
      throw new Error('Solicitud no encontrada o no tienes permisos para aprobarla');
    }
    
    // Preparar los campos a actualizar
    const updateData: Record<string, any> = {
      approved_by_advisor: true,
      approval_date_advisor: new Date().toISOString(),
      advisor_status: APPLICATION_STATUS.APPROVED, // Siempre actualizar el estado específico del asesor
      updated_at: new Date().toISOString()
    };
    
    // Si el asesor ya aprobó, marcar el estado principal/global como APPROVED (pero NO mover a por_dispersar)
    if (application.approved_by_advisor === true) {
      updateData.status = APPLICATION_STATUS.APPROVED;
      updateData.global_status = APPLICATION_STATUS.APPROVED;
      console.log('Ambos aprobaron, manteniendo estado APPROVED (sin mover a POR_DISPERSAR)');
    }
    
    // Actualizar la aplicación
    const { data: updatedApp, error } = await supabase
      .from(TABLES.APPLICATIONS)
      .update(updateData)
      .eq('id', id)
      .eq('assigned_to', advisor_id)
      .select('*');
    
    if (error) {
      console.error(`Error aprobando solicitud ${id} por asesor:`, error);
      throw new Error(`Error al aprobar solicitud: ${error.message}`);
    }
    
    if (!updatedApp || updatedApp.length === 0) {
      throw new Error('Solicitud no encontrada o no tienes permisos para aprobarla');
    }
    
    console.log(`Solicitud ${id} aprobada exitosamente por asesor ${advisor_id}`);
    
    // Guardar en el historial
    const { error: historyError } = await supabase
      .from(APPLICATION_HISTORY_TABLE)
      .insert({
        application_id: id,
        status: APPLICATION_STATUS.APPROVED,
        comment: comment || 'Solicitud aprobada por asesor',
        created_by: advisor_id ? advisor_id : null
      });
    
    if (historyError) {
      console.error(`Error al registrar historial de aprobación:`, historyError);
      // No interrumpimos el flujo por errores en el historial
    } else {
      console.log(`Historial registrado para la solicitud ${id}`);
    }
    
    return updatedApp[0] as Application;
  } catch (error) {
    console.error(`Error aprobando solicitud ${id} por asesor:`, error);
    throw error;
  }
};

// Aprobar solicitud por empresa
export const approveByCompany = async (
  id: string,
  comment: string,
  company_admin_id: string,
  company_id: string,
  entityFilter?: Record<string, any> | null
) => {
  // Verificar que el usuario es realmente un administrador de la empresa correcta
  if (!entityFilter?.company_id || entityFilter.company_id !== company_id) {
    throw new Error('Solo los administradores de la empresa pueden realizar esta acción');
  }
  
  try {
    // Primero obtenemos la aplicación para verificar el estado de la aprobación del asesor
    const { data: application, error: fetchError } = await supabase
      .from(TABLES.APPLICATIONS)
      .select('*')
      .eq('id', id)
      .eq('company_id', company_id)
      .single();
    
    if (fetchError) {
      console.error(`Error obteniendo solicitud ${id}:`, fetchError);
      throw new Error(`Error al obtener solicitud: ${fetchError.message}`);
    }
    
    if (!application) {
      throw new Error('Solicitud no encontrada o no tienes permisos para aprobarla');
    }
    
    // Preparar los campos a actualizar
    const updateData: Record<string, any> = {
      approved_by_company: true,
      approval_date_company: new Date().toISOString(),
      company_status: APPLICATION_STATUS.APPROVED, // Siempre actualizar el estado específico de la empresa
      updated_at: new Date().toISOString()
    };
    
    // Si el asesor ya aprobó, marcar el estado principal/global como APPROVED (pero NO mover a por_dispersar)
    if (application.approved_by_advisor === true) {
      updateData.status = APPLICATION_STATUS.APPROVED;
      updateData.global_status = APPLICATION_STATUS.APPROVED;
      console.log('Ambos aprobaron, manteniendo estado APPROVED (sin mover a POR_DISPERSAR)');
    }
    
    // Actualizar la aplicación
    const { data: updatedApp, error } = await supabase
      .from(TABLES.APPLICATIONS)
      .update(updateData)
      .eq('id', id)
      .eq('company_id', company_id)
      .select('*');
    
    if (error) {
      console.error(`Error aprobando solicitud ${id} por empresa:`, error);
      throw new Error(`Error al aprobar solicitud: ${error.message}`);
    }
    
    if (!updatedApp || updatedApp.length === 0) {
      throw new Error('Solicitud no encontrada o no tienes permisos para aprobarla');
    }
    
    // Guardar en el historial
    const { error: historyError } = await supabase
      .from(APPLICATION_HISTORY_TABLE)
      .insert({
        application_id: id,
        status: APPLICATION_STATUS.APPROVED,
        comment: comment || 'Solicitud aprobada por empresa',
        created_by: company_admin_id ? company_admin_id : null
      });
    
    if (historyError) {
      console.error(`Error al registrar historial de aprobación:`, historyError);
      // No interrumpimos el flujo por errores en el historial
    }
    
    return updatedApp[0] as Application;
  } catch (error) {
    console.error(`Error aprobando solicitud ${id} por empresa:`, error);
    throw error;
  }
};

// Cancelar aprobación de una empresa
export const cancelCompanyApproval = async (
  id: string,
  comment: string,
  company_admin_id: string,
  company_id: string,
  entityFilter?: Record<string, any> | null
) => {
  // Verificar que el usuario es realmente un administrador de la empresa correcta
  if (!entityFilter?.company_id || entityFilter.company_id !== company_id) {
    throw new Error('Solo los administradores de la empresa pueden realizar esta acción');
  }
  
  try {
    // Primero obtenemos la aplicación para verificar su estado actual
    const { data: application, error: fetchError } = await supabase
      .from(TABLES.APPLICATIONS)
      .select('*')
      .eq('id', id)
      .eq('company_id', company_id)
      .single();
    
    if (fetchError) {
      console.error(`Error obteniendo solicitud ${id}:`, fetchError);
      throw new Error(`Error al obtener solicitud: ${fetchError.message}`);
    }
    
    if (!application) {
      throw new Error('Solicitud no encontrada o no tienes permisos para cancelar la aprobación');
    }

    // Preparar los campos a actualizar
    const updateData: Record<string, any> = {
      approved_by_company: false,
      approval_date_company: null,
      company_status: APPLICATION_STATUS.IN_REVIEW, // Solo cambiamos el estado de la empresa
      updated_at: new Date().toISOString()
    };
    
    // Si el asesor ya aprobó, marcar el estado principal/global como APPROVED (pero NO mover a por_dispersar)
    if (application.approved_by_advisor === true) {
      updateData.status = APPLICATION_STATUS.APPROVED;
      updateData.global_status = APPLICATION_STATUS.APPROVED;
    }
    
    // Actualizar la aplicación
    const { data: updatedApp, error } = await supabase
      .from(TABLES.APPLICATIONS)
      .update(updateData)
      .eq('id', id)
      .eq('company_id', company_id)
      .select('*');
    
    if (error) {
      console.error(`Error cancelando aprobación de solicitud ${id} por empresa:`, error);
      throw new Error(`Error al cancelar aprobación: ${error.message}`);
    }
    
    if (!updatedApp || updatedApp.length === 0) {
      throw new Error('Solicitud no encontrada o no tienes permisos para cancelar la aprobación');
    }
    
    // Guardar en el historial
    const { error: historyError } = await supabase
      .from(APPLICATION_HISTORY_TABLE)
      .insert({
        application_id: id,
        status: APPLICATION_STATUS.IN_REVIEW,
        comment: comment || 'Aprobación de empresa cancelada',
        created_by: company_admin_id ? company_admin_id : null
      });
    
    if (historyError) {
      console.error(`Error al registrar historial de cancelación de aprobación:`, historyError);
      // No interrumpimos el flujo por errores en el historial
    }
    
    return updatedApp[0] as Application;
  } catch (error) {
    console.error(`Error cancelando aprobación de solicitud ${id} por empresa:`, error);
    throw error;
  }
};

// Obtener estado de aprobación de una solicitud
export const getApprovalStatus = async (
  id: string,
  entityFilter?: Record<string, any> | null
) => {
  try {
    // Usar Supabase client para obtener los datos
    let query = supabase
      .from(TABLES.APPLICATIONS)
      .select(`
        approved_by_advisor, 
        approved_by_company, 
        approval_date_advisor, 
        approval_date_company,
        status,
        advisor_status,
        company_status,
        global_status
      `)
      .eq('id', id);
    
    // Aplicar filtro por entidad si es necesario
    if (entityFilter) {
      if (entityFilter.advisor_id) {
        query = query.eq('assigned_to', entityFilter.advisor_id);
      }
      if (entityFilter.company_id) {
        query = query.eq('company_id', entityFilter.company_id);
      }
    }
    
    const { data, error } = await query.single();
    
    if (error) {
      console.error(`Error obteniendo estado de aprobación para ${id}:`, error);
      
      // En caso de error, devolvemos valor indefinido para que la UI maneje el caso correctamente
      return undefined;
    }
    
    if (!data) {
      console.warn(`Solicitud ${id} no encontrada para obtener estado de aprobación`);
      return undefined;
    }
    
    // Verificar si la solicitud está totalmente aprobada (ambas partes)
    const isFullyApproved = data.approved_by_advisor === true && data.approved_by_company === true;
    
    return {
      approvedByAdvisor: data.approved_by_advisor === true,
      approvedByCompany: data.approved_by_company === true,
      approvalDateAdvisor: data.approval_date_advisor,
      approvalDateCompany: data.approval_date_company,
      isFullyApproved: isFullyApproved,
      // Incluir estados para que la UI pueda mostrar información contextual
      status: data.status,
      advisorStatus: data.advisor_status,
      companyStatus: data.company_status,
      globalStatus: data.global_status
    };
  } catch (error) {
    console.error(`[getApprovalStatus] Error al obtener el estado de aprobación para ${id}:`, error);
    
    // En caso de error, devolvemos valor indefinido para que la UI maneje el caso correctamente
    return undefined;
  }
};

// Delete an application
export const deleteApplication = async (id: string, entityFilter?: Record<string, any> | null) => {
  let query = `DELETE FROM ${TABLES.APPLICATIONS} WHERE id = '${id}'`;
  
  // Aplicar filtro por entidad si es necesario
  if (entityFilter) {
    if (entityFilter.advisor_id) {
      query += ` AND assigned_to = '${entityFilter.advisor_id}'`;
    }
    if (entityFilter.company_id) {
      query += ` AND company_id = '${entityFilter.company_id}'`;
    }
  }
  
  try {
    await executeQuery(query);
    return true;
  } catch (error) {
    console.error(`Error deleting application with ID ${id}:`, error);
    throw error;
  }
};

// Get application history
export const getApplicationHistory = async (
  applicationId: string, 
  entityFilter?: Record<string, any> | null,
  page: number = 1,
  limit: number = 50
) => {
  console.log(`[getApplicationHistory] Fetching history for application: ${applicationId}, page: ${page}, limit: ${limit}`);
  
  // Verificar primero si el usuario tiene permiso para ver esta aplicación
  if (entityFilter) {
    let appQuery = `
      SELECT id FROM ${TABLES.APPLICATIONS} 
      WHERE id = '${applicationId}'
    `;
    
    if (entityFilter.advisor_id) {
      appQuery += ` AND assigned_to = '${entityFilter.advisor_id}'`;
    }
    if (entityFilter.company_id) {
      appQuery += ` AND company_id = '${entityFilter.company_id}'`;
    }
    
    try {
    const app = await executeQuery(appQuery);
    if (!app || app.length === 0) {
        console.log(`[getApplicationHistory] No permission to view application ${applicationId} with filter:`, entityFilter);
      throw new Error('Application not found or you do not have permission to view it');
      }
    } catch (error) {
      console.error(`[getApplicationHistory] Error checking permission:`, error);
      throw error;
    }
  }
  
  // Calcular offset para paginación
  const offset = (page - 1) * limit;
  
  const query = `
    SELECT h.*, u.id as user_id, u.name as user_name, u.email as user_email, u.role as user_role
    FROM ${APPLICATION_HISTORY_TABLE} h
    LEFT JOIN users u ON h.created_by = u.id
    WHERE h.application_id = '${applicationId}'
    ORDER BY h.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
  
  try {
    const result = await executeQuery(query);
    console.log(`[getApplicationHistory] Found ${result.length} history items for application ${applicationId}`);
    
    // Verificación adicional para confirmar que todas las entradas pertenecen a esta aplicación
    return result.filter(item => item.application_id === applicationId);
  } catch (error) {
    console.error(`[getApplicationHistory] Error fetching history:`, error);
    throw error;
  }
};

// Add a comment to an application
export const addComment = async (applicationId: string, userId: string, text: string, entityFilter?: Record<string, any> | null) => {
  // Verificar primero si el usuario tiene permiso para comentar esta aplicación
  if (entityFilter) {
    let appQuery = `
      SELECT id FROM ${TABLES.APPLICATIONS} 
      WHERE id = '${applicationId}'
    `;
    
    if (entityFilter.advisor_id) {
      appQuery += ` AND assigned_to = '${entityFilter.advisor_id}'`;
    }
    if (entityFilter.company_id) {
      appQuery += ` AND company_id = '${entityFilter.company_id}'`;
    }
    
    const app = await executeQuery(appQuery);
    if (!app || app.length === 0) {
      throw new Error('Application not found or you do not have permission to comment on it');
    }
  }
  
  try {
    // Usar directamente el cliente de Supabase para evitar el fallback MCP que falla en producción
    const { data, error } = await supabase
      .from(TABLES.COMMENTS)
      .insert({ application_id: applicationId, user_id: userId, text })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data as {
      id: string;
      application_id: string;
      user_id: string;
      text: string;
      created_at: string;
    };
  } catch (error) {
    console.error(`Error adding comment to application ${applicationId}:`, error);
    throw error;
  }
};

// Get comments for an application
export const getComments = async (applicationId: string, entityFilter?: Record<string, any> | null) => {
  // Verificar primero si el usuario tiene permiso para ver los comentarios de esta aplicación
  if (entityFilter) {
    let appQuery = `
      SELECT id FROM ${TABLES.APPLICATIONS} 
      WHERE id = '${applicationId}'
    `;
    
    if (entityFilter.advisor_id) {
      appQuery += ` AND assigned_to = '${entityFilter.advisor_id}'`;
    }
    if (entityFilter.company_id) {
      appQuery += ` AND company_id = '${entityFilter.company_id}'`;
    }
    
    const app = await executeQuery(appQuery);
    if (!app || app.length === 0) {
      throw new Error('Application not found or you do not have permission to view its comments');
    }
  }
  
  try {
    const { data, error } = await supabase
      .from('v_comments_users')
      .select('*')
      .eq('application_id', applicationId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error(`Error fetching comments for application ${applicationId}:`, error);
    throw error;
  }
};

export interface ApplicationWithClient {
  // ... existing code ...
}

/**
 * Calculadora de pago mensual para créditos con comisiones y tasas de interés
 * 
 * @param loanAmount El monto solicitado por el cliente (neto)
 * @param interestRate La tasa de interés anual en formato decimal (ej: 0.45 para 45%)
 * @param termMonths Número de meses del plazo
 * @param commissionRate Tasa de comisión en formato decimal (ej: 0.05 para 5%)
 * @param ivaTax Tasa de IVA en formato decimal (ej: 0.16 para 16%)
 * @returns El pago mensual calculado, redondeado a 2 decimales
 */
export const calculateMonthlyPayment = (loanAmount: number, interestRate: number, termMonths: number, commissionRate: number = 0.05, ivaTax: number = 0.16): number => {
  // Si los valores no son válidos, devolver 0
  if (loanAmount <= 0 || termMonths <= 0) {
    return 0;
  }
  
  // Para debugging
  console.log("Calculando pago mensual con los siguientes parámetros:");
  console.log(`- Monto solicitado: ${loanAmount}`);
  console.log(`- Tasa anual: ${interestRate * 100}%`);
  console.log(`- Plazo (meses): ${termMonths}`);
  console.log(`- Comisión: ${commissionRate * 100}%`);
  console.log(`- IVA: ${ivaTax * 100}%`);
  
  // 1. Expandir el monto para incluir la comisión
  // La fórmula es: montoExpandido = montoSolicitado / (1 - comisión)
  const expandedAmount = commissionRate > 0 ? loanAmount / (1 - commissionRate) : loanAmount;
  console.log(`- Monto expandido (incluye comisión): ${expandedAmount.toFixed(2)}`);
  
  // 2. Calcular la tasa mensual bruta (incluyendo IVA)
  // Tasa mensual = (tasa anual * (1 + IVA)) / 12
  const annualRateWithTax = interestRate * (1 + ivaTax);
  const monthlyInterestRate = annualRateWithTax / 12;
  console.log(`- Tasa anual con IVA: ${(annualRateWithTax * 100).toFixed(4)}%`);
  console.log(`- Tasa mensual efectiva: ${(monthlyInterestRate * 100).toFixed(4)}%`);
  
  // Si la tasa es 0, simplemente dividir el monto entre los meses
  if (interestRate === 0) {
    return Math.round((expandedAmount / termMonths) * 100) / 100;
  }
  
  // 3. Fórmula para calcular pago mensual: P = L[r(1+r)^n]/[(1+r)^n-1]
  // Donde: P = pago mensual, L = monto expandido, r = tasa mensual, n = número de pagos
  const numerator = monthlyInterestRate * Math.pow(1 + monthlyInterestRate, termMonths);
  const denominator = Math.pow(1 + monthlyInterestRate, termMonths) - 1;
  
  const monthlyPayment = expandedAmount * (numerator / denominator);
  console.log(`- Pago mensual calculado: ${monthlyPayment.toFixed(2)}`);
  
  // Calcular el total a pagar
  const totalPayment = monthlyPayment * termMonths;
  console.log(`- Total a pagar: ${totalPayment.toFixed(2)}`);
  
  // Calcular la comisión en pesos
  const commissionAmount = expandedAmount - loanAmount;
  console.log(`- Comisión en pesos: ${commissionAmount.toFixed(2)}`);
  
  // 4. Redondear a 2 decimales y devolver
  return Math.round(monthlyPayment * 100) / 100;
};

/**
 * Logs a status change to the application history table
 */
export const logStatusChange = async (
  applicationId: string,
  statusField: string,
  newStatus: string,
  comment: string, 
  userId: string
): Promise<void> => {
  try {
    console.log(`Registrando cambio de ${statusField} a ${newStatus} en el historial para aplicación ${applicationId}`);
    
    const { error } = await supabase
      .from(APPLICATION_HISTORY_TABLE)
      .insert({
        application_id: applicationId,
        status: newStatus,
        comment: comment || `Estado ${statusField} cambiado a ${newStatus}`,
        created_by: userId || null
      });
    
    if (error) {
      console.error(`Error al registrar historial para aplicación ${applicationId}:`, error);
      // No interrumpimos el flujo por errores en el historial
    } else {
      console.log(`Historial registrado correctamente para la aplicación ${applicationId}`);
    }
  } catch (error) {
    console.error(`Error en logStatusChange para aplicación ${applicationId}:`, error);
    // No interrumpimos el flujo por errores en el historial
  }
};

/**
 * Update a specific status field of an application
 */
export const updateApplicationStatusField = async (
  applicationId: string,
  newStatus: ApplicationStatus,
  statusField: 'status' | 'advisor_status' | 'company_status' | 'global_status',
  comment: string,
  userId: string
): Promise<void> => {
  try {
    console.log(`Actualizando ${statusField} a ${newStatus} para aplicación ${applicationId}`);
    
    // First, get the current application to check approval statuses
    const { data: application, error: fetchError } = await supabase
      .from('applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (fetchError) {
      console.error(`Error obteniendo solicitud ${applicationId}:`, fetchError);
      throw new Error(`Error al obtener solicitud: ${fetchError.message}`);
    }

    // 1. Primero actualizamos el campo específico
    const updatePayload: Record<string, any> = {
      [statusField]: newStatus,
      updated_at: new Date().toISOString()
    };

    // 2. Además del campo específico, actualizamos el global_status para reflejar el cambio
    // Esto asegura que los dashboards siempre vean el estado más reciente
    if (statusField !== 'global_status') {
      updatePayload['global_status'] = newStatus;
      console.log(`También actualizando global_status a ${newStatus}`);
    }
    
    // 3. Si se está rechazando, establecer los flags correspondientes y actualizar todos los estados
    if (newStatus === APPLICATION_STATUS.REJECTED) {
      console.log('Solicitud rechazada, actualizando todos los estados a REJECTED');
      
      // Actualizar todos los estados para asegurar consistencia en todas las vistas
      updatePayload['status'] = APPLICATION_STATUS.REJECTED;
      updatePayload['global_status'] = APPLICATION_STATUS.REJECTED;
      updatePayload['advisor_status'] = APPLICATION_STATUS.REJECTED;
      updatePayload['company_status'] = APPLICATION_STATUS.REJECTED;
      
      // IMPORTANTE: Establecer SOLO UNO de los flags de rechazo, nunca ambos
    if (statusField === 'advisor_status') {
        // El asesor rechazó la solicitud - explícitamente marcar solo uno
        updatePayload['rejected_by_advisor'] = true;
        updatePayload['rejected_by_company'] = false; // Asegurarse que no se marca como rechazado por la empresa
        updatePayload['approved_by_advisor'] = false; // Quitar flag de aprobación del asesor
        console.log('Marcando como rechazado ÚNICAMENTE por el asesor (advisor_status)');
      } else if (statusField === 'company_status') {
        // La empresa rechazó la solicitud - explícitamente marcar solo uno
        updatePayload['rejected_by_company'] = true;
        updatePayload['rejected_by_advisor'] = false; // Asegurarse que no se marca como rechazado por el asesor
        updatePayload['approved_by_company'] = false; // Quitar flag de aprobación de la empresa
        console.log('Marcando como rechazado ÚNICAMENTE por la empresa (company_status)');
      } else {
        // Para global_status o status principal, determinar según usuario
        try {
          // Intentar obtener información del usuario para determinar su rol
          const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('id', userId)
            .single();
          
          if (userData?.role === 'advisor') {
            // Si es asesor quien rechaza - explícitamente marcar solo uno
            updatePayload['rejected_by_advisor'] = true;
            updatePayload['rejected_by_company'] = false; // Explícitamente false para evitar doble rechazo
            updatePayload['approved_by_advisor'] = false; // Quitar flag de aprobación del asesor
            console.log('Marcando como rechazado ÚNICAMENTE por asesor basado en el rol explícito');
          } else if (userData?.role === 'company_admin') {
            // Si es admin de empresa quien rechaza - explícitamente marcar solo uno
            updatePayload['rejected_by_company'] = true;
            updatePayload['rejected_by_advisor'] = false; // Explícitamente false para evitar doble rechazo
            updatePayload['approved_by_company'] = false; // Quitar flag de aprobación de la empresa
            console.log('Marcando como rechazado ÚNICAMENTE por empresa basado en el rol explícito');
          } else {
            // Para super admin u otros roles, usar contexto adicional para determinar
            if (application.approved_by_advisor && !application.approved_by_company) {
              // Si el asesor ya aprobó pero la empresa no, entonces la empresa rechazó
              updatePayload['rejected_by_company'] = true;
              updatePayload['rejected_by_advisor'] = false; // Explícitamente false para evitar doble rechazo
              updatePayload['approved_by_company'] = false; // Quitar flag de aprobación de la empresa
              console.log('Rechazo por admin - ÚNICAMENTE por empresa (basado en aprobaciones previas)');
            } else if (application.approved_by_company && !application.approved_by_advisor) {
              // Si la empresa ya aprobó pero el asesor no, entonces el asesor rechazó
              updatePayload['rejected_by_advisor'] = true;
              updatePayload['rejected_by_company'] = false; // Explícitamente false para evitar doble rechazo
              updatePayload['approved_by_advisor'] = false; // Quitar flag de aprobación del asesor
              console.log('Rechazo por admin - ÚNICAMENTE por asesor (basado en aprobaciones previas)');
            } else {
              // Si no hay contexto claro, elegir explícitamente uno basado en el comentario
              const lowerComment = comment?.toLowerCase() || '';
              
              if (lowerComment.includes('asesor') || lowerComment.includes('advisor')) {
                // El comentario sugiere que es un rechazo del asesor
                updatePayload['rejected_by_advisor'] = true;
                updatePayload['rejected_by_company'] = false; // Explícitamente false para evitar doble rechazo
                updatePayload['approved_by_advisor'] = false; // Quitar flag de aprobación del asesor
                console.log('Marcando como rechazado ÚNICAMENTE por asesor basado en el comentario');
              } else if (lowerComment.includes('empresa') || lowerComment.includes('company')) {
                // El comentario sugiere que es un rechazo de la empresa
                updatePayload['rejected_by_company'] = true;
                updatePayload['rejected_by_advisor'] = false; // Explícitamente false para evitar doble rechazo
                updatePayload['approved_by_company'] = false; // Quitar flag de aprobación de la empresa
                console.log('Marcando como rechazado ÚNICAMENTE por empresa basado en el comentario');
      } else {
                // Si no hay información específica, verificar el estado reciente
                if (application.advisor_status === APPLICATION_STATUS.REJECTED) {
                  // Si el estado específico del asesor ya es REJECTED, probablemente el asesor rechazó
                  updatePayload['rejected_by_advisor'] = true;
                  updatePayload['rejected_by_company'] = false; // Explícitamente false para evitar doble rechazo
                  updatePayload['approved_by_advisor'] = false; // Quitar flag de aprobación del asesor
                  console.log('Marcando como rechazado ÚNICAMENTE por asesor basado en estado previo');
                } else if (application.company_status === APPLICATION_STATUS.REJECTED) {
                  // Si el estado específico de la empresa ya es REJECTED, probablemente la empresa rechazó
                  updatePayload['rejected_by_company'] = true;
                  updatePayload['rejected_by_advisor'] = false; // Explícitamente false para evitar doble rechazo
                  updatePayload['approved_by_company'] = false; // Quitar flag de aprobación de la empresa
                  console.log('Marcando como rechazado ÚNICAMENTE por empresa basado en estado previo');
                } else {
                  // En caso de completa ambigüedad, tomar una decisión explícita por defecto
                  // Elegir empresa por defecto para ser consistente en ambigüedades
                  updatePayload['rejected_by_company'] = true;
                  updatePayload['rejected_by_advisor'] = false; // Explícitamente false para evitar doble rechazo
                  updatePayload['approved_by_company'] = false; // Quitar flag de aprobación de la empresa
                  console.log('Marcando como rechazado ÚNICAMENTE por empresa (decisión por defecto en ambigüedad)');
                }
              }
            }
          }
        } catch (err) {
          console.error('Error al determinar el rol del usuario que rechaza:', err);
          // En caso de error, aplicar lógica de último recurso clara, pero siempre solo un flag activo
          updatePayload['rejected_by_company'] = true;
          updatePayload['rejected_by_advisor'] = false; // Explícitamente false para evitar doble rechazo
          updatePayload['approved_by_company'] = false; // Quitar flag de aprobación de la empresa
          console.log('ERROR: Marcando como rechazado ÚNICAMENTE por empresa tras error de consulta');
        }
      }
    }
    
    // 4. Si se está aprobando, establecer los flags correspondientes
    if (newStatus === APPLICATION_STATUS.APPROVED) {
      if (statusField === 'advisor_status') {
        updatePayload['approved_by_advisor'] = true;
        updatePayload['approval_date_advisor'] = new Date().toISOString();
        updatePayload['rejected_by_advisor'] = false; // Ensure rejection flag is removed
        
        // Ambas partes aprobaron: mantener estado APPROVED (sin mover a Por Dispersar)
        updatePayload['status'] = APPLICATION_STATUS.APPROVED;
        updatePayload['global_status'] = APPLICATION_STATUS.APPROVED;
        console.log('Ambos aprobaron, permaneciendo en APPROVED (firma pendiente)');
      } else if (statusField === 'company_status') {
        updatePayload['approved_by_company'] = true;
        updatePayload['approval_date_company'] = new Date().toISOString();
        updatePayload['rejected_by_company'] = false; // Ensure rejection flag is removed
        
        // Ambas partes aprobaron: mantener estado APPROVED (sin mover a Por Dispersar)
        updatePayload['status'] = APPLICATION_STATUS.APPROVED;
        updatePayload['global_status'] = APPLICATION_STATUS.APPROVED;
        console.log('Ambos aprobaron, permaneciendo en APPROVED (firma pendiente)');
      }
    }
    
    // 5. Si se está moviendo manualmente a POR_DISPERSAR, asegurarse de que sea posible y actualizar todos los campos
    if (newStatus === APPLICATION_STATUS.POR_DISPERSAR) {
      // Para ir a POR_DISPERSAR, debe estar previamente en APPROVED o ambas partes deben haber aprobado
      const bothApproved = application.approved_by_advisor === true && application.approved_by_company === true;
      const fromApproved = application.status === APPLICATION_STATUS.APPROVED || 
                           application[statusField] === APPLICATION_STATUS.APPROVED;
      
      if (bothApproved || fromApproved) {
        // Asegurarse de que todos los estados se actualicen a POR_DISPERSAR
        updatePayload['status'] = APPLICATION_STATUS.POR_DISPERSAR;
        updatePayload['global_status'] = APPLICATION_STATUS.POR_DISPERSAR;
        updatePayload['advisor_status'] = APPLICATION_STATUS.POR_DISPERSAR;
        updatePayload['company_status'] = APPLICATION_STATUS.POR_DISPERSAR;
        console.log('Moviendo manualmente a POR_DISPERSAR y actualizando todos los estados');
      } else {
        console.error('No se puede mover a POR_DISPERSAR sin ambas aprobaciones o desde APPROVED');
        throw new Error('La solicitud no puede moverse a Por Dispersar. Requiere aprobación de asesor y empresa.');
      }
    }
    
    // Actualizar la aplicación en Supabase
    const { error } = await supabase
      .from('applications')
      .update(updatePayload)
      .eq('id', applicationId);

    if (error) {
      console.error('Error updating application status:', error);
      throw new Error(`Error updating application status: ${error.message}`);
    }
    
    // 6. Registrar el cambio de estado en el historial
    await logStatusChange(applicationId, statusField, newStatus, comment, userId);
    
    // Si se movió automáticamente a POR_DISPERSAR, registrar ese cambio también
    if (updatePayload['status'] === APPLICATION_STATUS.POR_DISPERSAR && newStatus !== APPLICATION_STATUS.POR_DISPERSAR) {
      await logStatusChange(
        applicationId, 
        'status', 
        APPLICATION_STATUS.POR_DISPERSAR, 
        'Movido automáticamente a Por Dispersar porque ambas partes aprobaron', 
        userId
      );
    }
    
    console.log(`Estado de aplicación ${applicationId} actualizado correctamente a ${newStatus}`);
  } catch (error) {
    console.error('Error in updateApplicationStatusField:', error);
    throw error;
  }
};

// Marcar solicitud como dispersada (solo asesores)
export const markAsDispersed = async (
  id: string,
  comment: string,
  advisor_id: string,
  entityFilter?: Record<string, any> | null
) => {
  // Verificar que el usuario es realmente un asesor
  if (!entityFilter?.advisor_id) {
    throw new Error('Solo los asesores pueden realizar esta acción');
  }
  
  try {
    console.log(`Marcando solicitud ${id} como dispersada por asesor ${advisor_id}...`);
    
    // Primero obtenemos la aplicación para verificar su estado actual
    const { data: application, error: fetchError } = await supabase
      .from(TABLES.APPLICATIONS)
      .select('*')
      .eq('id', id)
      .eq('assigned_to', advisor_id)
      .single();
    
    if (fetchError) {
      console.error(`Error obteniendo solicitud ${id}:`, fetchError);
      throw new Error(`Error al obtener solicitud: ${fetchError.message}`);
    }
    
    if (!application) {
      throw new Error('Solicitud no encontrada o no tienes permisos para marcarla como dispersada');
    }
    
    // Verificar que la solicitud está en estado POR_DISPERSAR
    if (application.status !== APPLICATION_STATUS.POR_DISPERSAR) {
      throw new Error('Solo las solicitudes que están Por Dispersar pueden ser marcadas como dispersadas');
    }
    
    // Preparar los campos a actualizar - todos los estados pasan a COMPLETED
    const updateData: Record<string, any> = {
      status: APPLICATION_STATUS.COMPLETED,
      global_status: APPLICATION_STATUS.COMPLETED,
      advisor_status: APPLICATION_STATUS.COMPLETED,
      company_status: APPLICATION_STATUS.COMPLETED, 
      dispersal_date: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Actualizar la aplicación
    const { data: updatedApp, error } = await supabase
      .from(TABLES.APPLICATIONS)
      .update(updateData)
      .eq('id', id)
      .eq('assigned_to', advisor_id)
      .select('*');
    
    if (error) {
      console.error(`Error marcando solicitud ${id} como dispersada:`, error);
      throw new Error(`Error al marcar solicitud como dispersada: ${error.message}`);
    }
    
    if (!updatedApp || updatedApp.length === 0) {
      throw new Error('Solicitud no encontrada o no tienes permisos para marcarla como dispersada');
    }
    
    console.log(`Solicitud ${id} marcada exitosamente como dispersada por asesor ${advisor_id}`);
    
    // Añadir al historial
    const { error: historyError } = await supabase
      .from(APPLICATION_HISTORY_TABLE)
      .insert({
        application_id: id,
        status: APPLICATION_STATUS.COMPLETED,
        comment: comment || 'Solicitud marcada como dispersada',
        created_by: advisor_id ? advisor_id : null
      });
    
    if (historyError) {
      console.error(`Error al registrar historial de dispersión:`, historyError);
      // No interrumpimos el flujo por errores en el historial
    } else {
      console.log(`Historial registrado para la solicitud ${id}`);
    }
    
    return updatedApp[0] as Application;
  } catch (error) {
    console.error(`Error marcando solicitud ${id} como dispersada:`, error);
    throw error;
  }
};

const recordHistory = (tx: any, applicationId: string, previousStatus: string, newStatus: string) => {
  return tx.application_history.insert({
    application_id: applicationId,
    status: newStatus,
    comment: `Status changed from ${previousStatus} to ${newStatus}`,
    created_by: null
  });
};

// Función para actualizar el client_id de una aplicación específica
export const updateApplicationClientId = async (
  applicationId: string, 
  newClientId: string,
  comment: string = "Actualización manual de client_id"
) => {
  console.log(`[updateApplicationClientId] Actualizando client_id de aplicación ${applicationId} a ${newClientId}`);
  
  try {
    // Primero, verificar que el nuevo client_id existe
    const { checkClientExistsById } = require('../services/clientService');
    const clientExists = await checkClientExistsById(newClientId);
    
    if (!clientExists) {
      throw new Error(`El cliente con ID ${newClientId} no existe en la base de datos`);
    }
    
    // Obtener la aplicación actual para registrar el cambio en el historial
    const currentApp = await getApplicationById(applicationId);
    
    if (!currentApp) {
      throw new Error(`No se encontró la aplicación con ID ${applicationId}`);
    }

    const oldClientId = currentApp.client_id || 'ninguno';
    
    // Actualizar el client_id
    const { data, error } = await supabase
      .from(TABLES.APPLICATIONS)
      .update({ 
        client_id: newClientId,
        updated_at: new Date().toISOString()
      })
      .eq('id', applicationId)
      .select('*');
    
    if (error) {
      console.error('Error al actualizar client_id:', error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      throw new Error('No se pudo actualizar la aplicación');
    }
    
    // Registrar el cambio en el historial
    const { error: historyError } = await supabase
      .from(APPLICATION_HISTORY_TABLE)
      .insert({
        application_id: applicationId,
        status: currentApp.status,
        comment: `${comment} (Cambio de client_id: ${oldClientId} → ${newClientId})`,
        created_by: null
      });
    
    if (historyError) {
      console.error('Error al registrar historial de cambio de client_id:', historyError);
      // No interrumpimos el proceso por errores en el historial
    }
    
    console.log(`[updateApplicationClientId] Client_id actualizado correctamente para aplicación ${applicationId}`);
    return data[0] as Application;
  } catch (error) {
    console.error(`Error al actualizar client_id para aplicación ${applicationId}:`, error);
    throw error;
  }
}; 