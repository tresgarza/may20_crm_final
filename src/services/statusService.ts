import { supabase } from '../supabaseClient';
import { TABLES } from '../utils/constants/tables';
import { APPLICATION_STATUS, APPROVAL_STATUS, ApplicationStatus, ApprovalStatus } from '../utils/constants/applicationStatus';
import { getUserRole } from '../utils/auth';

interface StatusChangeResult {
  success: boolean;
  message?: string;
  data?: any;
}

/**
 * Validates if a status transition is allowed based on user role and current status
 */
export const canChangeStatus = (
  currentStatus: ApplicationStatus,
  newStatus: ApplicationStatus,
  userRole: 'advisor' | 'company' | 'global'
): { allowed: boolean; message?: string } => {
  
  // Global users can make any transition
  if (userRole === 'global') {
    return { allowed: true };
  }

  // Advisor permissions
  if (userRole === 'advisor') {
    if (currentStatus === APPLICATION_STATUS.NEW) {
      if (newStatus === APPLICATION_STATUS.IN_REVIEW) {
        return { allowed: true };
      }
    }
    
    if (currentStatus === APPLICATION_STATUS.IN_REVIEW) {
      if ([APPLICATION_STATUS.NEW, APPLICATION_STATUS.APPROVED, APPLICATION_STATUS.REJECTED].includes(newStatus as any)) {
        return { allowed: true };
      }
    }
    
    if (currentStatus === APPLICATION_STATUS.APPROVED) {
      if (newStatus === APPLICATION_STATUS.POR_DISPERSAR) {
        return { allowed: true };
      }
    }
    
    if (currentStatus === APPLICATION_STATUS.REJECTED) {
      if ([APPLICATION_STATUS.NEW, APPLICATION_STATUS.IN_REVIEW, APPLICATION_STATUS.APPROVED].includes(newStatus as any)) {
        return { allowed: true };
      }
    }
    
    if (currentStatus === APPLICATION_STATUS.POR_DISPERSAR) {
      if (newStatus === APPLICATION_STATUS.COMPLETED) {
        return { allowed: true };
      }
    }
  }
  
  // Company permissions
  if (userRole === 'company') {
    if (currentStatus === APPLICATION_STATUS.APPROVED) {
      if (newStatus === APPLICATION_STATUS.POR_DISPERSAR) {
        return { allowed: true };
      }
    }
    
    if (currentStatus === APPLICATION_STATUS.REJECTED) {
      if ([APPLICATION_STATUS.NEW, APPLICATION_STATUS.IN_REVIEW, APPLICATION_STATUS.APPROVED].includes(newStatus as any)) {
        return { allowed: true };
      }
    }
  }
  
  return { 
    allowed: false, 
    message: `No tienes permisos para cambiar de ${currentStatus} a ${newStatus} con rol ${userRole}` 
  };
};

/**
 * Updates an application's status with proper validation and history tracking
 */
export const updateApplicationStatus = async (
  applicationId: string,
  newStatus: ApplicationStatus,
  notes?: string
): Promise<StatusChangeResult> => {
  try {
    const userRole = await getUserRole();
    
    if (!userRole) {
      return { success: false, message: 'Usuario no autenticado' };
    }
    
    // Get current application status
    const { data: application, error: fetchError } = await supabase
      .from(TABLES.APPLICATIONS)
      .select('status, advisor_status, company_status')
      .eq('id', applicationId)
      .single();
      
    if (fetchError) {
      return { success: false, message: `Error al obtener aplicación: ${fetchError.message}` };
    }
    
    const currentStatus = application.status as ApplicationStatus;
    
    // Validate if status change is allowed
    const { allowed, message } = canChangeStatus(currentStatus, newStatus, userRole);
    if (!allowed) {
      return { success: false, message };
    }
    
    // Determine new approval statuses based on the status change
    let advisorStatus = application.advisor_status;
    let companyStatus = application.company_status;
    
    if (newStatus === APPLICATION_STATUS.NEW) {
      // Reset approvals when moving back to NEW
      advisorStatus = APPROVAL_STATUS.PENDING;
      companyStatus = APPROVAL_STATUS.PENDING;
    } else if (newStatus === APPLICATION_STATUS.IN_REVIEW) {
      // Reset approvals when moving to IN_REVIEW
      advisorStatus = APPROVAL_STATUS.PENDING;
      companyStatus = APPROVAL_STATUS.PENDING;
    } else if (newStatus === APPLICATION_STATUS.APPROVED) {
      // Set appropriate approvals when moving to APPROVED
      if (userRole === 'advisor') {
        advisorStatus = APPROVAL_STATUS.APPROVED;
      } else if (userRole === 'company') {
        companyStatus = APPROVAL_STATUS.APPROVED;
      } else if (userRole === 'global') {
        advisorStatus = APPROVAL_STATUS.APPROVED;
        companyStatus = APPROVAL_STATUS.APPROVED;
      }
    } else if (newStatus === APPLICATION_STATUS.REJECTED) {
      // Set appropriate rejections based on user role
      if (userRole === 'advisor') {
        advisorStatus = APPROVAL_STATUS.REJECTED;
      } else if (userRole === 'company') {
        companyStatus = APPROVAL_STATUS.REJECTED;
      }
    }
    
    // Perform the update
    const { error: updateError } = await supabase
      .from(TABLES.APPLICATIONS)
      .update({
        status: newStatus,
        advisor_status: advisorStatus,
        company_status: companyStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', applicationId);
      
    if (updateError) {
      return { success: false, message: `Error al actualizar estado: ${updateError.message}` };
    }
    
    // Add history entry
    await addStatusHistoryEntry(applicationId, currentStatus, newStatus, notes);
    
    return { 
      success: true, 
      data: {
        status: newStatus,
        advisor_status: advisorStatus,
        company_status: companyStatus
      }
    };
  } catch (error) {
    console.error('Error updating application status:', error);
    return { 
      success: false, 
      message: `Error inesperado: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
};

/**
 * Updates an application's approval status for a specific role
 */
export const updateApprovalStatus = async (
  applicationId: string,
  role: 'advisor' | 'company',
  newApprovalStatus: ApprovalStatus,
  notes?: string
): Promise<StatusChangeResult> => {
  try {
    const userRole = await getUserRole();
    
    if (!userRole) {
      return { success: false, message: 'Usuario no autenticado' };
    }
    
    // Only allow users to update their own role's approval status
    if (
      (role === 'advisor' && userRole !== 'advisor' && userRole !== 'global') ||
      (role === 'company' && userRole !== 'company' && userRole !== 'global')
    ) {
      return { 
        success: false, 
        message: `No tienes permisos para actualizar el estado de aprobación de ${role}` 
      };
    }
    
    // Get current application data
    const { data: application, error: fetchError } = await supabase
      .from(TABLES.APPLICATIONS)
      .select('status, advisor_status, company_status')
      .eq('id', applicationId)
      .single();
      
    if (fetchError) {
      return { success: false, message: `Error al obtener aplicación: ${fetchError.message}` };
    }
    
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString()
    };
    
    if (role === 'advisor') {
      updateData.advisor_status = newApprovalStatus;
    } else {
      updateData.company_status = newApprovalStatus;
    }
    
    // Update global status based on approval statuses
    let newGlobalStatus = application.status;
    
    // If either role rejects, application is rejected
    if (newApprovalStatus === APPROVAL_STATUS.REJECTED) {
      newGlobalStatus = APPLICATION_STATUS.REJECTED;
    } 
    // If both approve, application is approved
    else if (
      (role === 'advisor' && newApprovalStatus === APPROVAL_STATUS.APPROVED && application.company_status === APPROVAL_STATUS.APPROVED) ||
      (role === 'company' && newApprovalStatus === APPROVAL_STATUS.APPROVED && application.advisor_status === APPROVAL_STATUS.APPROVED)
    ) {
      newGlobalStatus = APPLICATION_STATUS.APPROVED;
    }
    
    updateData.status = newGlobalStatus;
    
    // Perform the update
    const { error: updateError } = await supabase
      .from(TABLES.APPLICATIONS)
      .update(updateData)
      .eq('id', applicationId);
      
    if (updateError) {
      return { success: false, message: `Error al actualizar estado: ${updateError.message}` };
    }
    
    // Add history entry if global status changed
    if (newGlobalStatus !== application.status) {
      await addStatusHistoryEntry(applicationId, application.status, newGlobalStatus, notes);
    }
    
    return { 
      success: true, 
      data: {
        ...updateData,
        status: newGlobalStatus
      }
    };
  } catch (error) {
    console.error('Error updating approval status:', error);
    return { 
      success: false, 
      message: `Error inesperado: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
};

/**
 * Adds an entry to the application history table
 */
const addStatusHistoryEntry = async (
  applicationId: string,
  oldStatus: ApplicationStatus,
  newStatus: ApplicationStatus,
  notes?: string
): Promise<void> => {
  try {
    const userRole = await getUserRole();
    
    await supabase
      .from(TABLES.APPLICATION_HISTORY)
      .insert({
        application_id: applicationId,
        old_status: oldStatus,
        new_status: newStatus,
        notes: notes || '',
        role: userRole || 'system',
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Error adding history entry:', error);
  }
}; 