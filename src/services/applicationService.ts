import { TABLES } from '../utils/constants/tables';
import { APPLICATION_STATUS } from '../utils/constants/statuses';

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
  requested_amount: number;
  status: ApplicationStatus;
  status_previous?: string;
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

// Función para ejecutar consultas SQL a través del servidor MCP
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

// Get all applications with filters
export const getApplications = async (filters?: ApplicationFilter, entityFilter?: Record<string, any> | null) => {
  let query = `SELECT * FROM ${TABLES.APPLICATIONS} WHERE 1=1`;
  
  // Aplicar filtro por entidad (asesor o empresa)
  if (entityFilter) {
    if (entityFilter.advisor_id) {
      query += ` AND assigned_to = '${entityFilter.advisor_id}'`;
    }
    if (entityFilter.company_id) {
      query += ` AND company_id = '${entityFilter.company_id}'`;
    }
  }

  // Aplicar otros filtros
  if (filters) {
    // Filter by status
    if (filters.status && filters.status !== 'all') {
      query += ` AND status = '${filters.status}'`;
    }

    // Filter by application type
    if (filters.application_type && filters.application_type !== 'all') {
      query += ` AND application_type = '${filters.application_type}'`;
    }

    // Filter by advisor
    if (filters.advisor_id) {
      query += ` AND assigned_to = '${filters.advisor_id}'`;
    }

    // Filter by company
    if (filters.company_id) {
      query += ` AND company_id = '${filters.company_id}'`;
    }

    // Filter by date range
    if (filters.dateFrom) {
      query += ` AND created_at >= '${filters.dateFrom}'`;
    }

    if (filters.dateTo) {
      query += ` AND created_at <= '${filters.dateTo}'`;
    }

    // Filter by amount range
    if (filters.amountMin !== undefined) {
      query += ` AND amount >= ${filters.amountMin}`;
    }

    if (filters.amountMax !== undefined) {
      query += ` AND amount <= ${filters.amountMax}`;
    }

    // Search by name, email or phone (ajustado a los campos reales)
    if (filters.searchQuery) {
      query += ` AND (
        client_name ILIKE '%${filters.searchQuery}%' OR 
        client_email ILIKE '%${filters.searchQuery}%'
      )`;
    }
  }

  // Ordenar por fecha de creación más reciente
  query += ` ORDER BY created_at DESC`;

  try {
    const data = await executeQuery(query);
    
    // Mapear los campos de la BD a nuestra interfaz
    return data.map((app: any) => ({
      id: app.id,
      client_id: app.source_id || "",
      company_id: app.company_id || "",
      assigned_to: app.assigned_to || "",
      application_type: app.application_type || "",
      requested_amount: parseFloat(app.amount) || 0,
      status: mapStatusFromDB(app.status),
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
    })) as Application[];
  } catch (error) {
    console.error('Error fetching applications:', error);
    throw error;
  }
};

// Función auxiliar para mapear estados de la BD a nuestro enum
const mapStatusFromDB = (dbStatus: string): ApplicationStatus => {
  // Primero verificamos si coincide con algún enum directamente
  const directMapping = Object.values(APPLICATION_STATUS).find(status => 
    status.toLowerCase() === dbStatus.toLowerCase()
  );
  
  if (directMapping) {
    return directMapping as ApplicationStatus;
  }
  
  // Si no hay coincidencia directa, usamos un mapeo manual
  const statusMap: Record<string, ApplicationStatus> = {
    'Solicitud': APPLICATION_STATUS.SOLICITUD,
    'Pendiente': APPLICATION_STATUS.PENDING,
    'En Revisión': APPLICATION_STATUS.IN_REVIEW,
    'Revisión': APPLICATION_STATUS.IN_REVIEW,
    'Aprobado': APPLICATION_STATUS.APPROVED,
    'Rechazado': APPLICATION_STATUS.REJECTED,
    'Por Dispersar': APPLICATION_STATUS.POR_DISPERSAR,
    'Completado': APPLICATION_STATUS.COMPLETED,
    'Cancelado': APPLICATION_STATUS.CANCELLED,
    'Expirado': APPLICATION_STATUS.EXPIRED
  };
  
  console.log(`Mapeando estado desde BD: "${dbStatus}" -> "${statusMap[dbStatus] || APPLICATION_STATUS.PENDING}"`);
  return statusMap[dbStatus] || APPLICATION_STATUS.PENDING;
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
  // 1. Obtener estado actual de la aplicación
  let currentQuery = `
    SELECT status FROM ${TABLES.APPLICATIONS}
    WHERE id = '${id}'
  `;
  
  // Aplicar filtro por entidad si es necesario
  if (entityFilter) {
    if (entityFilter.advisor_id) {
      currentQuery += ` AND assigned_to = '${entityFilter.advisor_id}'`;
    }
    if (entityFilter.company_id) {
      currentQuery += ` AND company_id = '${entityFilter.company_id}'`;
    }
  }
  
  try {
    // Obtener el estado actual
    const currentState = await executeQuery(currentQuery);
    if (!currentState || currentState.length === 0) {
      throw new Error('Application not found or you do not have permission to update it');
    }
    
    const currentStatus = currentState[0].status;
    
    // 2. Actualizar el estado de la aplicación
    let updateQuery = `
      UPDATE ${TABLES.APPLICATIONS}
      SET status = '${status}',
          status_previous = '${currentStatus}'
    `;
    
    // Si el nuevo estado es "completed", actualizar la fecha de dispersión
    if (status === 'completed') {
      updateQuery += `, dispersal_date = NOW()`;
    }
    
    updateQuery += ` WHERE id = '${id}'`;
    
    // Aplicar filtro por entidad si es necesario
    if (entityFilter) {
      if (entityFilter.advisor_id) {
        updateQuery += ` AND assigned_to = '${entityFilter.advisor_id}'`;
      }
      if (entityFilter.company_id) {
        updateQuery += ` AND company_id = '${entityFilter.company_id}'`;
      }
    }
    
    updateQuery += ' RETURNING *';
    
    // Ejecutar la actualización
    const updatedApp = await executeQuery(updateQuery);
    if (!updatedApp || updatedApp.length === 0) {
      throw new Error('Application not found or you do not have permission to update it');
    }
    
    // 3. Añadir al historial
    const historyComment = currentStatus !== status 
      ? `${comment} (Cambio de estado: ${currentStatus} → ${status})`
      : comment;
      
    const historyQuery = `
      INSERT INTO ${APPLICATION_HISTORY_TABLE} (application_id, status, comment, created_by)
      VALUES ('${id}', '${status}', '${historyComment}', '${user_id}')
      RETURNING *
    `;
    
    await executeQuery(historyQuery);
    
    console.log(`Estado de aplicación actualizado: ${currentStatus} → ${status}`);
    return updatedApp[0] as Application;
  } catch (error) {
    console.error(`Error updating status of application ${id}:`, error);
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
  
  // Actualizar la solicitud
  let updateQuery = `
    UPDATE ${TABLES.APPLICATIONS}
    SET approved_by_advisor = true, 
        approval_date_advisor = NOW()
    WHERE id = '${id}' AND assigned_to = '${advisor_id}'
    RETURNING *
  `;
  
  try {
    // Ejecutar la actualización
    const updatedApp = await executeQuery(updateQuery);
    if (!updatedApp || updatedApp.length === 0) {
      throw new Error('Solicitud no encontrada o no tienes permisos para aprobarla');
    }
    
    // Añadir al historial
    const historyQuery = `
      INSERT INTO ${APPLICATION_HISTORY_TABLE} (application_id, status, comment, created_by)
      VALUES ('${id}', 'approved_by_advisor', '${comment}', '${advisor_id}')
      RETURNING *
    `;
    
    await executeQuery(historyQuery);
    
    // Verificar si ambas aprobaciones están completas, para actualizar el estado principal
    const app = updatedApp[0] as Application;
    if (app.approved_by_advisor && app.approved_by_company && app.status !== 'approved') {
      console.log("Ambas aprobaciones completadas, actualizando estado principal a 'approved'");
      
      // Si ambos han aprobado, actualizar el estado a aprobado
      return await updateApplicationStatus(
        id, 
        'approved', 
        'Aprobación completa: Asesor y Empresa han aprobado esta solicitud', 
        advisor_id,
        entityFilter
      );
    }
    
    return app;
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
  
  // Actualizar la solicitud
  let updateQuery = `
    UPDATE ${TABLES.APPLICATIONS}
    SET approved_by_company = true, 
        approval_date_company = NOW()
    WHERE id = '${id}' AND company_id = '${company_id}'
    RETURNING *
  `;
  
  try {
    // Ejecutar la actualización
    const updatedApp = await executeQuery(updateQuery);
    if (!updatedApp || updatedApp.length === 0) {
      throw new Error('Solicitud no encontrada o no tienes permisos para aprobarla');
    }
    
    // Añadir al historial
    const historyQuery = `
      INSERT INTO ${APPLICATION_HISTORY_TABLE} (application_id, status, comment, created_by)
      VALUES ('${id}', 'approved_by_company', '${comment}', '${company_admin_id}')
      RETURNING *
    `;
    
    await executeQuery(historyQuery);
    
    // Verificar si ambas aprobaciones están completas, para actualizar el estado principal
    const app = updatedApp[0] as Application;
    if (app.approved_by_advisor && app.approved_by_company && app.status !== 'approved') {
      console.log("Ambas aprobaciones completadas, actualizando estado principal a 'approved'");
      
      // Si ambos han aprobado, actualizar el estado a aprobado
      return await updateApplicationStatus(
        id, 
        'approved', 
        'Aprobación completa: Asesor y Empresa han aprobado esta solicitud', 
        company_admin_id,
        entityFilter
      );
    }
    
    return app;
  } catch (error) {
    console.error(`Error aprobando solicitud ${id} por empresa:`, error);
    throw error;
  }
};

// Obtener estado de aprobación de una solicitud
export const getApprovalStatus = async (
  id: string,
  entityFilter?: Record<string, any> | null
) => {
  let query = `
    SELECT 
      approved_by_advisor, 
      approved_by_company, 
      approval_date_advisor, 
      approval_date_company
    FROM ${TABLES.APPLICATIONS}
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
  
  try {
    const data = await executeQuery(query);
    if (data && data.length > 0) {
      return {
        approvedByAdvisor: data[0].approved_by_advisor || false,
        approvedByCompany: data[0].approved_by_company || false,
        approvalDateAdvisor: data[0].approval_date_advisor,
        approvalDateCompany: data[0].approval_date_company
      };
    }
    throw new Error('Solicitud no encontrada');
  } catch (error) {
    console.error(`Error obteniendo estado de aprobación para solicitud ${id}:`, error);
    throw error;
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
    return data[0];
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