import { TABLES } from '../utils/constants/tables';
import { executeQuery } from '../utils/databaseUtils';

export interface DashboardStats {
  totalApplications: number;
  applicationsByStatus: {
    status: string;
    count: number;
  }[];
  avgAmount: number;
  minAmount: number;
  maxAmount: number;
  recentApplications: any[];
  applicationsByMonth: {
    month: string;
    count: number;
  }[];
  totalApproved: number;
  totalRejected: number;
  totalPending: number;
  pendingApproval: number;
  totalClients: number;
}

export interface AdvisorStats extends DashboardStats {
  totalClients: number;
  totalCompanies: number;
  conversionRate: number;
  avgTimeToApproval: number;
}

export interface CompanyStats extends DashboardStats {
  totalAdvisors: number;
  totalClientsCompany: number;
  avgApprovalTime: number;
}

/**
 * Obtiene estadísticas generales para el dashboard
 */
export const getGeneralDashboardStats = async (): Promise<DashboardStats> => {
  try {
    // Total de aplicaciones
    const totalApplicationsQuery = `SELECT COUNT(*) as total FROM ${TABLES.APPLICATIONS}`;
    const totalAppResult = await executeQuery(totalApplicationsQuery);
    const totalApplications = parseInt(totalAppResult[0]?.total || '0');

    // Aplicaciones por estado
    const applicationsByStatusQuery = `
      SELECT status, COUNT(*) as count 
      FROM ${TABLES.APPLICATIONS} 
      GROUP BY status
    `;
    const statusResult = await executeQuery(applicationsByStatusQuery);
    const applicationsByStatus = statusResult.map((row: any) => ({
      status: row.status,
      count: parseInt(row.count)
    }));

    // Estadísticas de montos
    const amountStatsQuery = `
      SELECT 
        AVG(amount) as avg_amount, 
        MIN(amount) as min_amount, 
        MAX(amount) as max_amount 
      FROM ${TABLES.APPLICATIONS} 
      WHERE amount IS NOT NULL
    `;
    const amountResult = await executeQuery(amountStatsQuery);
    const avgAmount = parseFloat(amountResult[0]?.avg_amount || '0');
    const minAmount = parseFloat(amountResult[0]?.min_amount || '0');
    const maxAmount = parseFloat(amountResult[0]?.max_amount || '0');

    // Aplicaciones recientes
    let recentApplications = [];
    try {
      const recentApplicationsQuery = `
        SELECT id, created_at, client_name, status, amount, company_name, application_type
        FROM ${TABLES.APPLICATIONS}
        ORDER BY created_at DESC
        LIMIT 10
      `;
      recentApplications = await executeQuery(recentApplicationsQuery);
      
      // Asegurarse de que application_type esté presente en todos los registros
      recentApplications = recentApplications.map((app: any) => {
        if (!app.application_type) {
          // Si no tiene application_type, intentar determinar por otros campos
          if (app.status && app.status.toLowerCase().includes('simul')) {
            app.application_type = 'product_simulations';
          } else if (app.status && app.status.toLowerCase().includes('solicit')) {
            app.application_type = 'selected_plans';
          }
        }
        return app;
      });
    } catch (error) {
      console.error('Error al obtener aplicaciones recientes:', error);
      // Proporcionar datos de muestra si falla la consulta
      recentApplications = [
        { id: '1', created_at: new Date().toISOString(), client_name: 'Usuario de Muestra', status: 'pending', amount: '10000', company_name: 'Empresa Ejemplo', application_type: 'selected_plans' },
        { id: '2', created_at: new Date().toISOString(), client_name: 'Usuario de Muestra', status: 'approved', amount: '15000', company_name: 'Empresa Ejemplo', application_type: 'product_simulations' }
      ];
    }

    // Aplicaciones por mes (últimos 6 meses)
    const applicationsByMonthQuery = `
      SELECT 
        TO_CHAR(created_at, 'YYYY-MM') as month, 
        COUNT(*) as count 
      FROM ${TABLES.APPLICATIONS} 
      WHERE created_at >= NOW() - INTERVAL '6 months'
      GROUP BY TO_CHAR(created_at, 'YYYY-MM')
      ORDER BY month
    `;
    const monthResult = await executeQuery(applicationsByMonthQuery);
    const applicationsByMonth = monthResult.map((row: any) => ({
      month: row.month,
      count: parseInt(row.count)
    }));

    // Totales por categoría principal
    const totalByMajorCategoryQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE status IN ('approved', 'APROBADO', 'Aprobado por Asesor')) as approved,
        COUNT(*) FILTER (WHERE status IN ('rejected', 'RECHAZADO')) as rejected,
        COUNT(*) FILTER (WHERE status IN ('pending', 'new', 'Solicitud', 'Simulación')) as pending,
        COUNT(*) FILTER (WHERE 
          (approved_by_advisor = false AND approved_by_company = false) OR
          (approved_by_advisor = true AND approved_by_company = false) OR
          (approved_by_advisor = false AND approved_by_company = true)
        ) as pending_approval
      FROM ${TABLES.APPLICATIONS}
    `;
    const categoryResult = await executeQuery(totalByMajorCategoryQuery);
    const totalApproved = parseInt(categoryResult[0]?.approved || '0');
    const totalRejected = parseInt(categoryResult[0]?.rejected || '0');
    const totalPending = parseInt(categoryResult[0]?.pending || '0');
    const pendingApproval = parseInt(categoryResult[0]?.pending_approval || '0');

    // Total clients - use a try-catch block to handle the case where the table doesn't exist
    let totalClients = 0;
    try {
      // First attempt: try to get clients count from clients table
      const totalClientsQuery = `SELECT COUNT(*) as total FROM ${TABLES.CLIENTS}`;
      const totalClientsResult = await executeQuery(totalClientsQuery);
      totalClients = parseInt(totalClientsResult[0]?.total || '0');
    } catch (error) {
      // Fallback: if clients table doesn't exist, count distinct client names from applications
      try {
        const clientNamesQuery = `SELECT COUNT(DISTINCT client_name) as total FROM ${TABLES.APPLICATIONS}`;
        const clientNamesResult = await executeQuery(clientNamesQuery);
        totalClients = parseInt(clientNamesResult[0]?.total || '0');
      } catch (innerError) {
        console.error('Error counting clients from applications table:', innerError);
        // If that also fails, default to 0
        totalClients = 0;
      }
    }

    return {
      totalApplications,
      applicationsByStatus,
      avgAmount,
      minAmount,
      maxAmount,
      recentApplications,
      applicationsByMonth,
      totalApproved,
      totalRejected,
      totalPending,
      pendingApproval,
      totalClients
    };
  } catch (error) {
    console.error('Error al obtener estadísticas del dashboard:', error);
    throw error;
  }
};

/**
 * Obtiene estadísticas específicas para un asesor
 * @param advisorId ID del asesor
 */
export const getAdvisorDashboardStats = async (advisorId: string): Promise<AdvisorStats> => {
  try {
    // Obtenemos las estadísticas generales primero
    const baseStats = await getGeneralDashboardStats();

    // Estadísticas específicas del asesor
    // Total de aplicaciones del asesor
    const advisorApplicationsQuery = `
      SELECT COUNT(*) as total 
      FROM ${TABLES.APPLICATIONS} 
      WHERE assigned_to = '${advisorId}'
    `;
    const advisorAppResult = await executeQuery(advisorApplicationsQuery);
    const totalAdvisorApplications = parseInt(advisorAppResult[0]?.total || '0');

    // Aplicaciones por estado del asesor
    const advisorStatusQuery = `
      SELECT status, COUNT(*) as count 
      FROM ${TABLES.APPLICATIONS} 
      WHERE assigned_to = '${advisorId}'
      GROUP BY status
    `;
    const advisorStatusResult = await executeQuery(advisorStatusQuery);
    const advisorApplicationsByStatus = advisorStatusResult.map((row: any) => ({
      status: row.status,
      count: parseInt(row.count)
    }));

    // Total de clientes del asesor
    let totalClients = 0;
    try {
      // First attempt: try to get clients from clients table
      const clientsQuery = `
        SELECT COUNT(*) as total 
        FROM ${TABLES.CLIENTS} 
        WHERE advisor_id = '${advisorId}'
      `;
      const clientsResult = await executeQuery(clientsQuery);
      totalClients = parseInt(clientsResult[0]?.total || '0');
    } catch (error) {
      // Fallback: count distinct client names from applications
      try {
        const clientNamesQuery = `
          SELECT COUNT(DISTINCT client_name) as total 
          FROM ${TABLES.APPLICATIONS} 
          WHERE assigned_to = '${advisorId}'
        `;
        const clientNamesResult = await executeQuery(clientNamesQuery);
        totalClients = parseInt(clientNamesResult[0]?.total || '0');
      } catch (innerError) {
        console.error(`Error counting clients for advisor ${advisorId}:`, innerError);
        // If that also fails, default to 0
        totalClients = 0;
      }
    }

    // Total de empresas asignadas al asesor
    const companiesQuery = `
      SELECT COUNT(DISTINCT company_id) as total 
      FROM ${TABLES.APPLICATIONS} 
      WHERE assigned_to = '${advisorId}'
    `;
    const companiesResult = await executeQuery(companiesQuery);
    const totalCompanies = parseInt(companiesResult[0]?.total || '0');

    // Tasa de conversión (aprobados / total)
    const conversionRateQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE status IN ('approved', 'APROBADO', 'completed')) as approved,
        COUNT(*) as total
      FROM ${TABLES.APPLICATIONS} 
      WHERE assigned_to = '${advisorId}'
    `;
    const conversionResult = await executeQuery(conversionRateQuery);
    const approved = parseInt(conversionResult[0]?.approved || '0');
    const total = parseInt(conversionResult[0]?.total || '0');
    const conversionRate = total > 0 ? (approved / total) * 100 : 0;

    // Tiempo promedio hasta aprobación
    const avgTimeQuery = `
      SELECT AVG(EXTRACT(EPOCH FROM (approval_date_advisor - created_at))/86400) as avg_days
      FROM ${TABLES.APPLICATIONS} 
      WHERE assigned_to = '${advisorId}'
      AND approval_date_advisor IS NOT NULL
    `;
    const timeResult = await executeQuery(avgTimeQuery);
    const avgTimeToApproval = parseFloat(timeResult[0]?.avg_days || '0');

    // Aplicaciones recientes del asesor
    let recentAdvisorApps = [];
    try {
      const recentAdvisorAppsQuery = `
        SELECT id, created_at, client_name, status, amount, company_name, application_type
        FROM ${TABLES.APPLICATIONS}
        WHERE assigned_to = '${advisorId}'
        ORDER BY created_at DESC
        LIMIT 10
      `;
      recentAdvisorApps = await executeQuery(recentAdvisorAppsQuery);
      
      // Asegurarse de que application_type esté presente en todos los registros
      recentAdvisorApps = recentAdvisorApps.map((app: any) => {
        if (!app.application_type) {
          // Si no tiene application_type, intentar determinar por otros campos
          if (app.status && app.status.toLowerCase().includes('simul')) {
            app.application_type = 'product_simulations';
          } else if (app.status && app.status.toLowerCase().includes('solicit')) {
            app.application_type = 'selected_plans';
          }
        }
        return app;
      });
    } catch (error) {
      console.error(`Error al obtener aplicaciones recientes del asesor ${advisorId}:`, error);
      // Datos de muestra en caso de error
      recentAdvisorApps = [
        { id: '1', created_at: new Date().toISOString(), client_name: 'Cliente de Asesor', status: 'pending', amount: '12000', company_name: 'Empresa Asignada', application_type: 'selected_plans' }
      ];
    }

    return {
      ...baseStats,
      totalApplications: totalAdvisorApplications,
      applicationsByStatus: advisorApplicationsByStatus,
      recentApplications: recentAdvisorApps,
      totalClients,
      totalCompanies,
      conversionRate,
      avgTimeToApproval
    };
  } catch (error) {
    console.error(`Error al obtener estadísticas del asesor ${advisorId}:`, error);
    throw error;
  }
};

/**
 * Obtiene estadísticas específicas para una empresa
 * @param companyId ID de la empresa
 */
export const getCompanyDashboardStats = async (companyId: string): Promise<CompanyStats> => {
  try {
    // Obtenemos las estadísticas generales primero
    const baseStats = await getGeneralDashboardStats();

    // Estadísticas específicas de la empresa
    // Total de aplicaciones de la empresa
    const companyApplicationsQuery = `
      SELECT COUNT(*) as total 
      FROM ${TABLES.APPLICATIONS} 
      WHERE company_id = '${companyId}'
    `;
    const companyAppResult = await executeQuery(companyApplicationsQuery);
    const totalCompanyApplications = parseInt(companyAppResult[0]?.total || '0');

    // Aplicaciones por estado de la empresa
    const companyStatusQuery = `
      SELECT status, COUNT(*) as count 
      FROM ${TABLES.APPLICATIONS} 
      WHERE company_id = '${companyId}'
      GROUP BY status
    `;
    const companyStatusResult = await executeQuery(companyStatusQuery);
    const companyApplicationsByStatus = companyStatusResult.map((row: any) => ({
      status: row.status,
      count: parseInt(row.count)
    }));

    // Total de asesores asignados a la empresa
    const advisorsQuery = `
      SELECT COUNT(DISTINCT assigned_to) as total 
      FROM ${TABLES.APPLICATIONS} 
      WHERE company_id = '${companyId}'
    `;
    const advisorsResult = await executeQuery(advisorsQuery);
    const totalAdvisors = parseInt(advisorsResult[0]?.total || '0');

    // Total de clientes de la empresa
    let totalClientsCompany = 0;
    try {
      // First attempt: try to get clients from clients table
      const clientsQuery = `
        SELECT COUNT(*) as total 
        FROM ${TABLES.CLIENTS} 
        WHERE company_id = '${companyId}'
      `;
      const clientsResult = await executeQuery(clientsQuery);
      totalClientsCompany = parseInt(clientsResult[0]?.total || '0');
    } catch (error) {
      // Fallback: count distinct client names from applications
      try {
        const clientNamesQuery = `
          SELECT COUNT(DISTINCT client_name) as total 
          FROM ${TABLES.APPLICATIONS} 
          WHERE company_id = '${companyId}'
        `;
        const clientNamesResult = await executeQuery(clientNamesQuery);
        totalClientsCompany = parseInt(clientNamesResult[0]?.total || '0');
      } catch (innerError) {
        console.error(`Error counting clients for company ${companyId}:`, innerError);
        // If that also fails, default to 0
        totalClientsCompany = 0;
      }
    }

    // Tiempo promedio de aprobación
    const avgTimeQuery = `
      SELECT AVG(EXTRACT(EPOCH FROM (approval_date_company - created_at))/86400) as avg_days
      FROM ${TABLES.APPLICATIONS} 
      WHERE company_id = '${companyId}'
      AND approval_date_company IS NOT NULL
    `;
    const timeResult = await executeQuery(avgTimeQuery);
    const avgApprovalTime = parseFloat(timeResult[0]?.avg_days || '0');

    // Aplicaciones recientes de la empresa
    let recentCompanyApps = [];
    try {
      const recentCompanyAppsQuery = `
        SELECT id, created_at, client_name, status, amount, assigned_to, application_type
        FROM ${TABLES.APPLICATIONS}
        WHERE company_id = '${companyId}'
        ORDER BY created_at DESC
        LIMIT 10
      `;
      recentCompanyApps = await executeQuery(recentCompanyAppsQuery);
      
      // Asegurarse de que application_type esté presente en todos los registros
      recentCompanyApps = recentCompanyApps.map((app: any) => {
        if (!app.application_type) {
          // Si no tiene application_type, intentar determinar por otros campos
          if (app.status && app.status.toLowerCase().includes('simul')) {
            app.application_type = 'product_simulations';
          } else if (app.status && app.status.toLowerCase().includes('solicit')) {
            app.application_type = 'selected_plans';
          }
        }
        return app;
      });
    } catch (error) {
      console.error(`Error al obtener aplicaciones recientes de la empresa ${companyId}:`, error);
      // Datos de muestra en caso de error
      recentCompanyApps = [
        { id: '1', created_at: new Date().toISOString(), client_name: 'Cliente de Empresa', status: 'pending', amount: '15000', assigned_to: 'Asesor Asignado', application_type: 'selected_plans' }
      ];
    }

    return {
      ...baseStats,
      totalApplications: totalCompanyApplications,
      applicationsByStatus: companyApplicationsByStatus,
      recentApplications: recentCompanyApps,
      totalAdvisors,
      totalClientsCompany,
      avgApprovalTime
    };
  } catch (error) {
    console.error(`Error al obtener estadísticas de la empresa ${companyId}:`, error);
    throw error;
  }
};

/**
 * Obtiene estadísticas de aplicaciones pendientes de aprobación
 * @param userId ID del usuario (asesor o admin de empresa)
 * @param isCompanyAdmin Indica si el usuario es un admin de empresa
 */
export const getPendingApprovalStats = async (userId: string, isCompanyAdmin: boolean): Promise<any> => {
  try {
    let query = '';
    
    if (isCompanyAdmin) {
      // Obtener ID de la compañía del admin
      const companyQuery = `
        SELECT company_id FROM ${TABLES.COMPANY_ADMINS} WHERE id = '${userId}'
      `;
      const companyResult = await executeQuery(companyQuery);
      const companyId = companyResult[0]?.company_id;
      
      if (!companyId) {
        throw new Error('No se encontró la compañía para este administrador');
      }
      
      // Aplicaciones pendientes de aprobación por la compañía
      query = `
        SELECT COUNT(*) as pending_count
        FROM ${TABLES.APPLICATIONS}
        WHERE company_id = '${companyId}'
        AND approved_by_advisor = true
        AND approved_by_company = false
      `;
    } else {
      // Aplicaciones pendientes de aprobación por el asesor
      query = `
        SELECT COUNT(*) as pending_count
        FROM ${TABLES.APPLICATIONS}
        WHERE assigned_to = '${userId}'
        AND approved_by_advisor = false
      `;
    }
    
    const result = await executeQuery(query);
    return {
      pendingCount: parseInt(result[0]?.pending_count || '0')
    };
  } catch (error) {
    console.error('Error al obtener estadísticas de aprobaciones pendientes:', error);
    throw error;
  }
};