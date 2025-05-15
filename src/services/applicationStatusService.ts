import { supabase } from './supabaseService';
import { APPLICATION_STATES, VALID_STATUS_TRANSITIONS, AUTO_APPROVAL_RULES } from '../utils/constants/applicationStates';
import { TABLES } from '../utils/constants/tables';

/**
 * Interfaz para los parámetros de actualización de estado
 */
interface StatusUpdateParams {
  applicationId: string;
  newStatus: string;
  previousStatus?: string;
  statusField?: string;
  entityType?: string;
  userId?: string;
  comment?: string;
}

/**
 * Verifica si la transición de estado es válida según el rol del usuario
 */
export const isValidStatusTransition = (
  currentStatus: string,
  newStatus: string,
  userRole: 'ADVISOR' | 'COMPANY' | 'ADMIN'
): boolean => {
  // Si los estados son iguales, siempre es válido
  if (currentStatus === newStatus) return true;
  
  // Obtener el mapa de transiciones para el rol
  const roleTransitions = 
    userRole === 'ADVISOR' 
      ? VALID_STATUS_TRANSITIONS.ADVISOR 
      : userRole === 'COMPANY' 
        ? VALID_STATUS_TRANSITIONS.COMPANY 
        : VALID_STATUS_TRANSITIONS.ADMIN;
  
  // Verificar si la transición está permitida
  return roleTransitions[currentStatus]?.includes(newStatus) || false;
};

/**
 * Actualiza el estado de una aplicación y registra el cambio en el historial
 */
export const updateApplicationStatus = async ({
  applicationId,
  newStatus,
  previousStatus,
  statusField = APPLICATION_STATES.STATUS_FIELDS.GLOBAL,
  entityType = APPLICATION_STATES.ENTITIES.SYSTEM,
  userId,
  comment
}: StatusUpdateParams) => {
  try {
    // 1. Si no se proporciona el estado anterior, obtenerlo de la base de datos
    if (!previousStatus) {
      const { data, error } = await supabase
        .from(TABLES.APPLICATIONS)
        .select(`${statusField}`)
        .eq('id', applicationId)
        .single();
      
      if (error) throw error;
      previousStatus = data?.[statusField as keyof typeof data] as string | undefined;
    }
    
    // 2. Actualizar el estado en la tabla de aplicaciones
    const updateData: Record<string, any> = {
      [statusField]: newStatus,
      updated_at: new Date().toISOString()
    };
    
    // 3. Lógica para estados de aprobación
    if (statusField === APPLICATION_STATES.STATUS_FIELDS.ADVISOR) {
      if (newStatus === APPLICATION_STATES.APPROVED) {
        updateData.approved_by_advisor = true;
        updateData.approval_date_advisor = new Date().toISOString();
      } else if (previousStatus === APPLICATION_STATES.APPROVED) {
        updateData.approved_by_advisor = false;
        updateData.approval_date_advisor = null;
      }
    } 
    else if (statusField === APPLICATION_STATES.STATUS_FIELDS.COMPANY) {
      if (newStatus === APPLICATION_STATES.APPROVED) {
        updateData.approved_by_company = true;
        updateData.approval_date_company = new Date().toISOString();
      } else if (previousStatus === APPLICATION_STATES.APPROVED) {
        updateData.approved_by_company = false;
        updateData.approval_date_company = null;
      }
    }
    
    // 4. Verificar si se debe actualizar también el estado global
    if (statusField !== APPLICATION_STATES.STATUS_FIELDS.GLOBAL) {
      // Obtener los estados actuales
      const { data: application, error: appError } = await supabase
        .from(TABLES.APPLICATIONS)
        .select('advisor_status, company_status')
        .eq('id', applicationId)
        .single();
      
      if (appError) throw appError;
      
      // Estado de asesor (actual o el que estamos actualizando)
      const advisorStatus = statusField === APPLICATION_STATES.STATUS_FIELDS.ADVISOR 
        ? newStatus 
        : application?.advisor_status;
      
      // Estado de empresa (actual o el que estamos actualizando)
      const companyStatus = statusField === APPLICATION_STATES.STATUS_FIELDS.COMPANY
        ? newStatus
        : application?.company_status;
      
      // Verificar reglas de actualización automática
      if (AUTO_APPROVAL_RULES.BOTH_APPROVED.condition(advisorStatus, companyStatus)) {
        updateData.status = AUTO_APPROVAL_RULES.BOTH_APPROVED.nextStatus;
        updateData.advisor_status = AUTO_APPROVAL_RULES.BOTH_APPROVED.nextStatus;
        updateData.company_status = AUTO_APPROVAL_RULES.BOTH_APPROVED.nextStatus;
      }
      // Si cualquiera rechaza, todo el status se marca como rechazado
      else if (newStatus === APPLICATION_STATES.REJECTED) {
        updateData.status = APPLICATION_STATES.REJECTED;
        updateData.advisor_status = APPLICATION_STATES.REJECTED;
        updateData.company_status = APPLICATION_STATES.REJECTED;
      }
    }
    
    // 5. Ejecutar la actualización en la base de datos
    const { error: updateError } = await supabase
      .from(TABLES.APPLICATIONS)
      .update(updateData)
      .eq('id', applicationId);
      
    if (updateError) throw updateError;
    
    // 6. Registrar en el historial con información detallada
    const fullComment = comment 
      ? `${comment} (${statusField}: ${previousStatus} → ${newStatus})` 
      : `Status changed from ${previousStatus} to ${newStatus}. Field: ${statusField}`;
    
    const historyEntry = {
      application_id: applicationId,
      status: newStatus,
      comment: fullComment,
      created_by: userId || null
    };
    
    const { error: historyError } = await supabase
      .from(TABLES.APPLICATION_HISTORY)
      .insert(historyEntry);
      
    if (historyError) {
      console.error('Error registrando historial:', historyError);
      // No fallamos por error en historial
    }
    
    return { 
      success: true, 
      data: { 
        previousStatus,
        newStatus,
        statusField
      }
    };
  } catch (error) {
    console.error('Error actualizando estado:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
};

/**
 * Obtiene el historial de estados de una aplicación
 */
export const getApplicationStatusHistory = async (applicationId: string) => {
  try {
    const { data, error } = await supabase
      .from(TABLES.APPLICATION_HISTORY)
      .select(`
        *,
        users:created_by (
          name,
          email
        )
      `)
      .eq('application_id', applicationId)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    return {
      success: true,
      data: data.map(item => ({
        ...item,
        userName: item.users?.name || 'Sistema'
      }))
    };
  } catch (error) {
    console.error('Error obteniendo historial:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}; 