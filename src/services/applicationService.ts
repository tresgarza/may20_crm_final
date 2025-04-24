import { TABLES } from '../utils/constants/tables';
import { APPLICATION_STATUS } from '../utils/constants/statuses';
import { supabase, getServiceClient } from '../services/supabaseService';
import { executeQuery, escapeSqlString } from '../utils/databaseUtils';

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
  product_type?: string;  // Tipo de producto (préstamo personal, auto, etc.)
  requested_amount: number;
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
        query = query.gte('amount', filters.amountMin);
      }
      
      if (filters.amountMax) {
        query = query.lte('amount', filters.amountMax);
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
        client_id: app.source_id || "",
        company_id: app.company_id || "",
        assigned_to: app.assigned_to || "",
        application_type: app.application_type || "",
        requested_amount: parseFloat(app.amount) || 0,
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
        approval_date_advisor: app.approval_date_advisor,
        approval_date_company: app.approval_date_company,
        
        // Mapeo directo de campos adicionales de la BD
        client_phone: app.client_phone,
        client_address: app.client_address,
        dni: app.dni,
        amount: parseFloat(app.amount) || 0,
        term: app.term ? parseInt(app.term) : undefined,
        interest_rate: app.interest_rate ? parseFloat(app.interest_rate) : undefined,
        monthly_payment: app.monthly_payment ? parseFloat(app.monthly_payment) : undefined,
        
        // Campos para tipo de financiamiento y productos
        financing_type: app.financing_type || null,
        product_url: app.product_url || null,
        product_title: app.product_title || null,
        product_image: app.product_image || null,
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
  let query = `SELECT * FROM ${TABLES.APPLICATIONS} WHERE id = '${id}'`;
  
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
    const data = await executeQuery(query);
    if (data && data.length > 0) {
      return data[0] as Application;
    }
    throw new Error('Application not found');
  } catch (error) {
    console.error(`Error fetching application with ID ${id}:`, error);
    throw error;
  }
};

// Create a new application
export const createApplication = async (application: Omit<Application, 'id' | 'created_at' | 'updated_at'>) => {
  const fields = Object.keys(application).join(', ');
  const values = Object.values(application)
    .map(val => (typeof val === 'string' ? `'${val}'` : val))
    .join(', ');
  
  const query = `
    INSERT INTO ${TABLES.APPLICATIONS} (${fields})
    VALUES (${values})
    RETURNING *
  `;
  
  try {
    const data = await executeQuery(query);
    return data[0] as Application;
  } catch (error) {
    console.error('Error creating application:', error);
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
      .select('status, assigned_to, company_id')
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
    
    // 3. Add to history
    const historyComment = currentStatus !== status 
      ? `${comment} (Cambio de estado: ${currentStatus} → ${status})`
      : comment;
      
    try {
      const { error: historyError } = await supabase
        .from(APPLICATION_HISTORY_TABLE)
        .insert({
          application_id: id,
          status: status,
          comment: historyComment,
          created_by: user_id
        });
      
      if (historyError) {
        console.error(`[updateApplicationStatus] Error adding to history for application ${id}:`, historyError);
        // We don't throw here to avoid disrupting the status update
      }
    } catch (historyErr) {
      console.error(`[updateApplicationStatus] Error adding to history:`, historyErr);
      // We don't throw here to avoid disrupting the status update
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
    
    // Solo actualizar el estado global si la empresa ya ha aprobado
    if (application.approved_by_company === true) {
      // Cuando ambos aprueban, automáticamente pasa a POR_DISPERSAR
      updateData.status = APPLICATION_STATUS.POR_DISPERSAR;
      updateData.global_status = APPLICATION_STATUS.POR_DISPERSAR;
      updateData.advisor_status = APPLICATION_STATUS.POR_DISPERSAR;
      updateData.company_status = APPLICATION_STATUS.POR_DISPERSAR;
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
    
    // Añadir al historial usando Supabase client
    const { error: historyError } = await supabase
      .from(APPLICATION_HISTORY_TABLE)
      .insert({
        application_id: id,
        previous_status: application.advisor_status || application.status,
        new_status: APPLICATION_STATUS.APPROVED,
        status_field: 'advisor_status',
        changed_by: advisor_id,
        comments: comment || 'Solicitud aprobada por asesor',
        changed_at: new Date().toISOString()
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
    
    // Solo actualizar el estado global si el asesor ya ha aprobado
    if (application.approved_by_advisor === true) {
      // Cuando ambos aprueban, automáticamente pasa a POR_DISPERSAR
      updateData.status = APPLICATION_STATUS.POR_DISPERSAR;
      updateData.global_status = APPLICATION_STATUS.POR_DISPERSAR;
      updateData.advisor_status = APPLICATION_STATUS.POR_DISPERSAR;
      updateData.company_status = APPLICATION_STATUS.POR_DISPERSAR;
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
    
    // Añadir al historial usando Supabase client
    const { error: historyError } = await supabase
      .from(APPLICATION_HISTORY_TABLE)
      .insert({
        application_id: id,
        previous_status: application.company_status || application.status,
        new_status: APPLICATION_STATUS.APPROVED,
        status_field: 'company_status',
        changed_by: company_admin_id,
        comments: comment || 'Solicitud aprobada por empresa',
        changed_at: new Date().toISOString()
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
    
    // Solo actualizar el estado global si estaba basado en la aprobación completa
    if (application.status === APPLICATION_STATUS.APPROVED && 
        application.advisor_status === APPLICATION_STATUS.APPROVED && 
        application.company_status === APPLICATION_STATUS.APPROVED) {
      // Revertir al estado de revisión ya que una parte retiró su aprobación
      updateData.status = APPLICATION_STATUS.IN_REVIEW;
      updateData.global_status = APPLICATION_STATUS.IN_REVIEW;
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
    
    // Añadir al historial usando Supabase client
    const { error: historyError } = await supabase
      .from(APPLICATION_HISTORY_TABLE)
      .insert({
        application_id: id,
        previous_status: application.company_status || application.status,
        new_status: APPLICATION_STATUS.IN_REVIEW,
        status_field: 'company_status',
        changed_by: company_admin_id,
        comments: comment || 'Aprobación de empresa cancelada',
        changed_at: new Date().toISOString()
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
export const getApplicationHistory = async (applicationId: string, entityFilter?: Record<string, any> | null) => {
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
    
    const app = await executeQuery(appQuery);
    if (!app || app.length === 0) {
      throw new Error('Application not found or you do not have permission to view it');
    }
  }
  
  const query = `
    SELECT h.*, u.id as user_id, u.name as user_name, u.email as user_email
    FROM ${APPLICATION_HISTORY_TABLE} h
    LEFT JOIN users u ON h.created_by = u.id
    WHERE h.application_id = '${applicationId}'
    ORDER BY h.created_at DESC
  `;
  
  try {
    return await executeQuery(query);
  } catch (error) {
    console.error(`Error fetching history for application ${applicationId}:`, error);
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
  
  const query = `
    INSERT INTO ${TABLES.COMMENTS} (application_id, user_id, text)
    VALUES ('${applicationId}', '${userId}', '${text}')
    RETURNING *
  `;
  
  try {
    const data = await executeQuery(query);
    return data[0] as { 
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
  
  const query = `
    SELECT c.*, u.id as user_id, u.name as user_name, u.email as user_email
    FROM ${TABLES.COMMENTS} c
    LEFT JOIN users u ON c.user_id = u.id
    WHERE c.application_id = '${applicationId}'
    ORDER BY c.created_at DESC
  `;
  
  try {
    return await executeQuery(query);
  } catch (error) {
    console.error(`Error fetching comments for application ${applicationId}:`, error);
    throw error;
  }
};

export interface ApplicationWithClient {
  // ... existing code ...
}

/**
 * Calcula el pago mensual de un préstamo basado en el monto, tasa de interés y plazo
 * @param loanAmount - Monto del préstamo 
 * @param interestRate - Tasa de interés anual (en decimales, ej: 0.12 para 12%)
 * @param termMonths - Plazo en meses
 * @returns Pago mensual calculado
 */
export const calculateMonthlyPayment = (loanAmount: number, interestRate: number, termMonths: number): number => {
  // Convertir tasa de interés anual a mensual
  const monthlyInterestRate = interestRate / 12;
  
  // Si la tasa es 0, simplemente dividir el monto entre los meses
  if (interestRate === 0) {
    return loanAmount / termMonths;
  }
  
  // Fórmula para calcular pago mensual: P = L[r(1+r)^n]/[(1+r)^n-1]
  // Donde: P = pago mensual, L = monto del préstamo, r = tasa mensual, n = número de pagos
  const numerator = monthlyInterestRate * Math.pow(1 + monthlyInterestRate, termMonths);
  const denominator = Math.pow(1 + monthlyInterestRate, termMonths) - 1;
  
  const monthlyPayment = loanAmount * (numerator / denominator);
  
  // Redondear a 2 decimales y devolver
  return Math.round(monthlyPayment * 100) / 100;
};

// Update a specific status field (advisor_status, company_status, or global_status)
export const updateApplicationStatusField = async (
  id: string, 
  status: Application['status'],
  statusField: 'advisor_status' | 'company_status' | 'global_status' | 'status',
  comment: string, 
  user_id: string,
  entityFilter?: Record<string, any> | null
) => {
  try {
    // Validate the status field
    if (!['advisor_status', 'company_status', 'global_status', 'status'].includes(statusField)) {
      throw new Error(`Invalid status field: ${statusField}`);
    }

    // Fetch the application
    const { data: application, error: fetchError } = await supabase
      .from(TABLES.APPLICATIONS)
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error(`Error fetching application with ID ${id}:`, fetchError);
      throw fetchError;
    }

    if (!application) {
      throw new Error(`Application with ID ${id} not found`);
    }

    // Apply entity filter if provided
    if (entityFilter) {
      if (entityFilter.advisor_id && application.assigned_to !== entityFilter.advisor_id) {
        throw new Error('You do not have permission to update this application status');
      }
      if (entityFilter.company_id && application.company_id !== entityFilter.company_id) {
        throw new Error('You do not have permission to update this application status');
      }
    }

    // Save the previous status to record the change
    const previousStatus = statusField === 'status' ? application.status : (application[statusField] || application.status);

    // Prepare the update data - ONLY update the specific field requested
    const updateData: Record<string, any> = {
      [statusField]: status,
      updated_at: new Date().toISOString()
    };

    // Additional specific logic for approval status changes
    if (statusField === 'advisor_status') {
      // Update the approved_by_advisor flag if status is changing to APPROVED
      if (status === APPLICATION_STATUS.APPROVED) {
        updateData.approved_by_advisor = true;
        updateData.approval_date_advisor = new Date().toISOString();
      } else {
        // If status is changing from APPROVED to something else, remove the approval
        if (previousStatus === APPLICATION_STATUS.APPROVED) {
          updateData.approved_by_advisor = false;
          updateData.approval_date_advisor = null;
        }
        
        // Caso especial: Al mover de POR_DISPERSAR a IN_REVIEW, resetear la aprobación del asesor
        if (previousStatus === APPLICATION_STATUS.POR_DISPERSAR && status === APPLICATION_STATUS.IN_REVIEW) {
          console.log('Caso especial: Asesor moviendo de POR_DISPERSAR a IN_REVIEW - reseteando aprobación');
          updateData.approved_by_advisor = false;
          updateData.approval_date_advisor = null;
        }
      }
      
      // CRITICAL: Do NOT update the main status field when making advisor-specific changes
      // Remove any code that would update 'status' here
    } 
    else if (statusField === 'company_status') {
      // Update the approved_by_company flag if status is changing to APPROVED
      if (status === APPLICATION_STATUS.APPROVED) {
        updateData.approved_by_company = true;
        updateData.approval_date_company = new Date().toISOString();
      } else {
        // If status is changing from APPROVED to something else, remove the approval
        if (previousStatus === APPLICATION_STATUS.APPROVED) {
          updateData.approved_by_company = false;
          updateData.approval_date_company = null;
        }
      }
      
      // CRITICAL: Do NOT update the main status field when making company-specific changes
      // Remove any code that would update 'status' here
    }
    else if (statusField === 'status') {
      // When explicitly updating the main status field, we allow it
      updateData.status = status;
    }
    
    // Special logic for when both parties have approved
    if (
      status === APPLICATION_STATUS.APPROVED &&
      ((statusField === 'advisor_status' && application.approved_by_company === true) ||
       (statusField === 'company_status' && application.approved_by_advisor === true))
    ) {
      // Both parties have approved, update global_status to POR_DISPERSAR
      console.log('Both parties have approved, updating global_status to POR_DISPERSAR');
      updateData.global_status = APPLICATION_STATUS.POR_DISPERSAR;
      updateData.status = APPLICATION_STATUS.POR_DISPERSAR;
      updateData.advisor_status = APPLICATION_STATUS.POR_DISPERSAR;
      updateData.company_status = APPLICATION_STATUS.POR_DISPERSAR;
    }
    
    // Special logic for when any party rejects the application
    if (status === APPLICATION_STATUS.REJECTED && 
        (statusField === 'advisor_status' || statusField === 'company_status')) {
      // When any party rejects, update all statuses to REJECTED
      console.log('Application rejected, updating all statuses to REJECTED');
      updateData.global_status = APPLICATION_STATUS.REJECTED;
      updateData.status = APPLICATION_STATUS.REJECTED;
      updateData.advisor_status = APPLICATION_STATUS.REJECTED;
      updateData.company_status = APPLICATION_STATUS.REJECTED;
    }
    
    // When using the global_status field, also update the main status to match
    if (statusField === 'global_status') {
      updateData.status = status;
    }

    console.log(`Updating application ${id} ${statusField} to ${status}`, updateData);

    // Update the application
    const { error: updateError } = await supabase
      .from(TABLES.APPLICATIONS)
      .update(updateData)
      .eq('id', id);

    if (updateError) {
      console.error(`Error updating ${statusField} for application ${id}:`, updateError);
      throw updateError;
    }

    // Record the status change in the history
    const historyEntry = {
      application_id: id,
      previous_status: previousStatus,
      new_status: status,
      status_field: statusField,
      changed_by: user_id,
      comments: comment || `Status changed from ${previousStatus} to ${status}`,
      changed_at: new Date().toISOString()
    };

    const { error: historyError } = await supabase
      .from(APPLICATION_HISTORY_TABLE)
      .insert([historyEntry]);

    if (historyError) {
      console.error(`Error recording status history for application ${id}:`, historyError);
      // Don't throw, as the primary operation succeeded
    }

    return { 
      success: true, 
      application: { 
        ...application, 
        [statusField]: status,
        // Include these updated fields in the response so the UI can reflect them
        ...(statusField === 'advisor_status' && status === APPLICATION_STATUS.APPROVED 
            ? { approved_by_advisor: true, approval_date_advisor: updateData.approval_date_advisor } 
            : {}),
        ...(statusField === 'company_status' && status === APPLICATION_STATUS.APPROVED 
            ? { approved_by_company: true, approval_date_company: updateData.approval_date_company } 
            : {})
      } 
    };
  } catch (error) {
    console.error('Error updating application status field:', error);
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
        previous_status: APPLICATION_STATUS.POR_DISPERSAR,
        new_status: APPLICATION_STATUS.COMPLETED,
        status_field: 'global_status',
        changed_by: advisor_id,
        comments: comment || 'Solicitud marcada como dispersada',
        changed_at: new Date().toISOString()
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