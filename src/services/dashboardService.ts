import { TABLES } from '../utils/constants/tables';
import { executeQuery } from '../utils/databaseUtils';

interface DashboardStatsFilter {
  dateFrom?: string;
  dateTo?: string;
  companyId?: string;
  advisorId?: string;
  includeSimulations?: boolean; // Nuevo parámetro para controlar si se incluyen simulaciones
}

interface AdvisorPerformanceStats {
  advisorId: string;
  advisorName: string;
  totalApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  approvalRate: number;
}

export interface DashboardStats {
  totalApplications: number;
  pendingApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  averageAmount: number;
  minAmount: number;
  maxAmount: number;
  recentApplications: any[];
  applicationsByStatus: Record<string, number>;
  applicationsByMonth: Record<string, number>;
  advisorsPerformance?: AdvisorPerformanceStats[];
  totalClients: number;
}

export interface AdvisorStats extends Omit<DashboardStats, 'applicationsByMonth' | 'applicationsByStatus'> {
  advisorId: string;
  advisorName: string;
  applicationsByMonth: Array<{month: string, count: number}>;
  applicationsByStatus: Array<{status: string, count: number}>;
  totalApproved: number;
  totalRejected: number;
  totalPending: number;
  pendingApproval: number;
  totalCompanies: number;
  conversionRate: number;
  avgTimeToApproval: number;
}

export interface CompanyStats extends Omit<DashboardStats, 'applicationsByMonth' | 'applicationsByStatus'> {
  totalAdvisors: number;
  totalClientsCompany: number;
  avgApprovalTime: number;
  pendingApplications: number;
  applicationsByStatus: Array<{status: string, count: number}>;
  applicationsByMonth: Array<{month: string, count: number}>;
}

/**
 * Obtiene estadísticas generales para el dashboard
 */
export const getGeneralDashboardStats = async (filters: DashboardStatsFilter = {}): Promise<DashboardStats> => {
  const { dateFrom, dateTo, companyId, advisorId, includeSimulations = false } = filters;
  
  // Construir la parte de la consulta para los filtros de fecha
  let dateFilter = '';
  if (dateFrom) {
    dateFilter += ` AND created_at >= '${dateFrom}'`;
  }
  if (dateTo) {
    dateFilter += ` AND created_at <= '${dateTo}'`;
  }
  
  // Filtro por compañía si se proporciona
  let companyFilter = '';
  if (companyId) {
    companyFilter = ` AND company_id = '${companyId}'`;
  }
  
  // Filtro por asesor si se proporciona
  let advisorFilter = '';
  if (advisorId) {
    advisorFilter = ` AND assigned_to = '${advisorId}'`;
  }
  
  // Filtro para excluir simulaciones por defecto
  let simulationFilter = '';
  if (!includeSimulations) {
    simulationFilter = ` AND application_type != 'product_simulations'`;
  }

  try {
    // 1. Total de aplicaciones
    const totalApplicationsQuery = `
      SELECT COUNT(*) as total 
      FROM ${TABLES.APPLICATIONS} 
      WHERE 1=1 ${dateFilter} ${companyFilter} ${advisorFilter} ${simulationFilter}
    `;
    
    let totalApplicationsData;
    try {
      totalApplicationsData = await executeQuery(totalApplicationsQuery);
    } catch (error) {
      console.error('Error al obtener total de aplicaciones:', error);
      totalApplicationsData = [{ total: 0 }]; // Valor por defecto si falla
    }
    
    const totalApplications = totalApplicationsData[0]?.total || 0;
    
    // 2. Aplicaciones por estado
    const applicationsByStatusQuery = `
      SELECT status, COUNT(*) as count 
      FROM ${TABLES.APPLICATIONS} 
      WHERE 1=1 ${dateFilter} ${companyFilter} ${advisorFilter} ${simulationFilter}
      GROUP BY status
    `;
    
    let applicationsByStatusData;
    try {
      applicationsByStatusData = await executeQuery(applicationsByStatusQuery);
    } catch (error) {
      console.error('Error al obtener aplicaciones por estado:', error);
      applicationsByStatusData = []; // Valor por defecto si falla
    }
    
    const applicationsByStatus: Record<string, number> = {};
    applicationsByStatusData.forEach((item: any) => {
      applicationsByStatus[item.status] = parseInt(item.count);
    });
    
    const pendingApplications = applicationsByStatus['pending'] || 0;
    const approvedApplications = applicationsByStatus['approved'] || 0;
    const rejectedApplications = applicationsByStatus['rejected'] || 0;
    
    // 3. Promedio, mínimo y máximo de montos
    const amountStatsQuery = `
      SELECT 
        AVG(amount) as avg_amount, 
        MIN(amount) as min_amount, 
        MAX(amount) as max_amount 
      FROM ${TABLES.APPLICATIONS} 
      WHERE 1=1 ${dateFilter} ${companyFilter} ${advisorFilter} ${simulationFilter}
    `;
    
    let amountStatsData;
    try {
      amountStatsData = await executeQuery(amountStatsQuery);
    } catch (error) {
      console.error('Error al obtener estadísticas de montos:', error);
      amountStatsData = [{ avg_amount: 0, min_amount: 0, max_amount: 0 }]; // Valor por defecto si falla
    }
    
    const averageAmount = parseFloat(amountStatsData[0]?.avg_amount) || 0;
    const minAmount = parseFloat(amountStatsData[0]?.min_amount) || 0;
    const maxAmount = parseFloat(amountStatsData[0]?.max_amount) || 0;
    
    // 4. Aplicaciones recientes
    const recentApplicationsQuery = `
      SELECT id, client_name, company_name, created_at, status, amount, application_type
      FROM ${TABLES.APPLICATIONS} 
      WHERE 1=1 ${dateFilter} ${companyFilter} ${advisorFilter} ${simulationFilter}
      AND application_type = 'selected_plans'
      ORDER BY created_at DESC 
      LIMIT 5
    `;
    
    let recentApplicationsData;
    try {
      recentApplicationsData = await executeQuery(recentApplicationsQuery);
    } catch (error) {
      console.error('Error al obtener aplicaciones recientes:', error);
      recentApplicationsData = []; // Valor por defecto si falla
    }
    
    // 5. Aplicaciones por mes (para gráfico de líneas)
    const applicationsByMonthQuery = `
      SELECT 
        TO_CHAR(created_at, 'YYYY-MM') as month, 
        COUNT(*) as count 
      FROM ${TABLES.APPLICATIONS} 
      WHERE 1=1 ${dateFilter} ${companyFilter} ${advisorFilter} ${simulationFilter}
      GROUP BY month 
      ORDER BY month
    `;
    
    let applicationsByMonthData;
    try {
      applicationsByMonthData = await executeQuery(applicationsByMonthQuery);
    } catch (error) {
      console.error('Error al obtener aplicaciones por mes:', error);
      applicationsByMonthData = []; // Valor por defecto si falla
    }
    
    const applicationsByMonth: Record<string, number> = {};
    applicationsByMonthData.forEach((item: any) => {
      applicationsByMonth[item.month] = parseInt(item.count);
    });
    
    // 6. Rendimiento de asesores (solo para superadmin o filtrado por compañía)
    let advisorsPerformance: AdvisorPerformanceStats[] = [];
    
    if (!advisorId) { // Solo si no estamos filtrando por un asesor específico
      const advisorsPerformanceQuery = `
        SELECT 
          a.assigned_to as advisor_id, 
          u.name as advisor_name,
          COUNT(*) as total_applications,
          SUM(CASE WHEN a.status = 'approved' THEN 1 ELSE 0 END) as approved_applications,
          SUM(CASE WHEN a.status = 'rejected' THEN 1 ELSE 0 END) as rejected_applications
        FROM ${TABLES.APPLICATIONS} a
        LEFT JOIN ${TABLES.ADVISORS} u ON a.assigned_to = u.id
        WHERE 1=1 ${dateFilter} ${companyFilter} ${simulationFilter}
        GROUP BY a.assigned_to, u.name
        ORDER BY total_applications DESC
      `;
      
      try {
        const advisorsData = await executeQuery(advisorsPerformanceQuery);
        advisorsPerformance = advisorsData.map((advisor: any) => ({
          advisorId: advisor.advisor_id,
          advisorName: advisor.advisor_name || 'Desconocido',
          totalApplications: parseInt(advisor.total_applications) || 0,
          approvedApplications: parseInt(advisor.approved_applications) || 0,
          rejectedApplications: parseInt(advisor.rejected_applications) || 0,
          approvalRate: advisor.total_applications > 0 
            ? (parseInt(advisor.approved_applications) / parseInt(advisor.total_applications)) * 100 
            : 0
        }));
      } catch (error) {
        console.error('Error al obtener rendimiento de asesores:', error);
        // Continuamos incluso si esta consulta falla
      }
    }
    
    // 7. Total de clientes
    let totalClients = 0;
    const totalClientsQuery = `
      SELECT COUNT(DISTINCT source_id) as total 
      FROM ${TABLES.APPLICATIONS} 
      WHERE source_id IS NOT NULL ${dateFilter} ${companyFilter} ${advisorFilter} ${simulationFilter}
    `;
    
    try {
      const totalClientsData = await executeQuery(totalClientsQuery);
      totalClients = parseInt(totalClientsData[0]?.total) || 0;
    } catch (error) {
      console.error('Error al obtener total de clientes:', error);
      // Continuamos incluso si esta consulta falla
    }
    
    return {
      totalApplications: parseInt(totalApplications),
      pendingApplications,
      approvedApplications,
      rejectedApplications,
      averageAmount,
      minAmount,
      maxAmount,
      recentApplications: recentApplicationsData,
      applicationsByStatus,
      applicationsByMonth,
      advisorsPerformance,
      totalClients
    };
    
  } catch (error) {
    console.error('Error obteniendo estadísticas del dashboard:', error);
    // En caso de error, devolvemos datos vacíos para evitar que la UI se rompa
    return {
      totalApplications: 0,
      pendingApplications: 0,
      approvedApplications: 0,
      rejectedApplications: 0,
      averageAmount: 0,
      minAmount: 0,
      maxAmount: 0,
      recentApplications: [],
      applicationsByStatus: {},
      applicationsByMonth: {},
      totalClients: 0
    };
  }
};

/**
 * Obtiene estadísticas específicas para un asesor
 * @param advisorId ID del asesor
 * @param includeSimulations Si es true, incluye las simulaciones en las estadísticas
 */
export const getAdvisorDashboardStats = async (advisorId: string, includeSimulations: boolean = false): Promise<AdvisorStats> => {
  try {
    // Filtro para excluir simulaciones por defecto
    let simulationFilter = '';
    if (!includeSimulations) {
      simulationFilter = ` AND application_type != 'product_simulations'`;
    }
    
    // No obtener estadísticas generales, sino filtrar todo por el asesor
    
    // Total de aplicaciones del asesor
    const advisorApplicationsQuery = `
      SELECT COUNT(*) as total 
      FROM ${TABLES.APPLICATIONS} 
      WHERE assigned_to = '${advisorId}'
      ${simulationFilter}
    `;
    const advisorAppResult = await executeQuery(advisorApplicationsQuery);
    const totalAdvisorApplications = parseInt(advisorAppResult[0]?.total || '0');

    // Aplicaciones por estado del asesor
    const advisorStatusQuery = `
      SELECT status, COUNT(*) as count 
      FROM ${TABLES.APPLICATIONS} 
      WHERE assigned_to = '${advisorId}'
      ${simulationFilter}
      GROUP BY status
    `;
    const advisorStatusResult = await executeQuery(advisorStatusQuery);
    const advisorApplicationsByStatus = advisorStatusResult.map((row: any) => ({
      status: row.status,
      count: parseInt(row.count)
    }));

    // Estadísticas de montos específicas del asesor
    const amountStatsQuery = `
      SELECT 
        AVG(amount) as avg_amount, 
        MIN(amount) as min_amount, 
        MAX(amount) as max_amount 
      FROM ${TABLES.APPLICATIONS} 
      WHERE amount IS NOT NULL
      AND assigned_to = '${advisorId}'
      ${simulationFilter}
    `;
    const amountResult = await executeQuery(amountStatsQuery);
    const avgAmount = parseFloat(amountResult[0]?.avg_amount || '0');
    const minAmount = parseFloat(amountResult[0]?.min_amount || '0');
    const maxAmount = parseFloat(amountResult[0]?.max_amount || '0');

    // Calcular aplicaciones por mes para este asesor
    const monthlyQuery = `
      SELECT 
        TO_CHAR(created_at, 'YYYY-MM') as month,
        COUNT(*) as count
      FROM ${TABLES.APPLICATIONS}
      WHERE assigned_to = '${advisorId}'
      ${simulationFilter}
      GROUP BY TO_CHAR(created_at, 'YYYY-MM')
      ORDER BY month
    `;
    
    let applicationsByMonth: {month: string, count: number}[] = [];
    try {
      const monthlyResult = await executeQuery(monthlyQuery);
      applicationsByMonth = monthlyResult.map((row: any) => ({
        month: row.month,
        count: parseInt(row.count)
      }));
    } catch (error) {
      console.error(`Error al obtener aplicaciones por mes para asesor ${advisorId}:`, error);
      applicationsByMonth = [];
    }

    // Total de clientes del asesor
    let totalClients = 0;
    try {
      // First attempt: try to get clients from users table instead of clients
      const clientsQuery = `
        SELECT COUNT(DISTINCT u.id) as total 
        FROM ${TABLES.USERS} u
        JOIN ${TABLES.APPLICATIONS} a ON a.source_id = u.id
        WHERE a.assigned_to = '${advisorId}'
        ${simulationFilter}
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
          ${simulationFilter}
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
      ${simulationFilter}
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
      ${simulationFilter}
    `;
    const conversionResult = await executeQuery(conversionRateQuery);
    const approved = parseInt(conversionResult[0]?.approved || '0');
    const total = parseInt(conversionResult[0]?.total || '0');
    const conversionRate = total > 0 ? (approved / total) * 100 : 0;

    // Calcular totales específicos para cada estado
    const totalApprovedQuery = `
      SELECT COUNT(*) as count
      FROM ${TABLES.APPLICATIONS}
      WHERE assigned_to = '${advisorId}'
      AND status IN ('approved', 'APROBADO', 'completed')
      ${simulationFilter}
    `;
    const totalApprovedResult = await executeQuery(totalApprovedQuery);
    const totalApproved = parseInt(totalApprovedResult[0]?.count || '0');

    const totalRejectedQuery = `
      SELECT COUNT(*) as count
      FROM ${TABLES.APPLICATIONS}
      WHERE assigned_to = '${advisorId}'
      AND status IN ('rejected', 'RECHAZADO')
      ${simulationFilter}
    `;
    const totalRejectedResult = await executeQuery(totalRejectedQuery);
    const totalRejected = parseInt(totalRejectedResult[0]?.count || '0');

    const totalPendingQuery = `
      SELECT COUNT(*) as count
      FROM ${TABLES.APPLICATIONS}
      WHERE assigned_to = '${advisorId}'
      AND status IN ('pending', 'PENDIENTE', 'review', 'REVISION')
      ${simulationFilter}
    `;
    const totalPendingResult = await executeQuery(totalPendingQuery);
    const totalPending = parseInt(totalPendingResult[0]?.count || '0');

    const pendingApprovalQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE 
          (approved_by_advisor = false AND approved_by_company = false) OR
          (approved_by_advisor = true AND approved_by_company = false) OR
          (approved_by_advisor = false AND approved_by_company = true)
        ) as pending_approval
      FROM ${TABLES.APPLICATIONS}
      WHERE assigned_to = '${advisorId}'
      ${simulationFilter}
    `;
    const pendingApprovalResult = await executeQuery(pendingApprovalQuery);
    const pendingApproval = parseInt(pendingApprovalResult[0]?.pending_approval || '0');

    // Tiempo promedio hasta aprobación
    const avgTimeQuery = `
      SELECT AVG(EXTRACT(EPOCH FROM (approval_date_advisor - created_at))/86400) as avg_days
      FROM ${TABLES.APPLICATIONS} 
      WHERE assigned_to = '${advisorId}'
      AND approval_date_advisor IS NOT NULL
      ${simulationFilter}
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
        AND application_type = 'selected_plans'
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
      recentAdvisorApps = [];
    }

    return {
      totalApplications: totalAdvisorApplications,
      applicationsByStatus: advisorApplicationsByStatus,
      averageAmount: avgAmount,
      minAmount,
      maxAmount,
      recentApplications: recentAdvisorApps,
      applicationsByMonth,
      totalApproved,
      totalRejected,
      totalPending,
      pendingApproval,
      totalClients,
      totalCompanies,
      conversionRate,
      avgTimeToApproval,
      advisorId,
      advisorName: '',  // This would be populated from user data
      pendingApplications: totalPending,
      approvedApplications: totalApproved,
      rejectedApplications: totalRejected
    };
  } catch (error) {
    console.error(`Error al obtener estadísticas del asesor ${advisorId}:`, error);
    throw error;
  }
};

/**
 * Obtiene estadísticas específicas para una empresa
 * @param companyId ID de la empresa
 * @param includeSimulations Si es true, incluye las simulaciones en las estadísticas
 */
export const getCompanyDashboardStats = async (companyId: string, includeSimulations: boolean = false): Promise<CompanyStats> => {
  try {
    // Filtro para excluir simulaciones por defecto
    let simulationFilter = '';
    if (!includeSimulations) {
      simulationFilter = ` AND application_type != 'product_simulations'`;
    }
    
    // Obtenemos las estadísticas generales primero con el mismo filtro
    const baseStats = await getGeneralDashboardStats({ companyId, includeSimulations });

    // Estadísticas específicas de la empresa
    // Total de aplicaciones de la empresa
    const companyApplicationsQuery = `
      SELECT COUNT(*) as total 
      FROM ${TABLES.APPLICATIONS} 
      WHERE company_id = '${companyId}'
      ${simulationFilter}
    `;
    const companyAppResult = await executeQuery(companyApplicationsQuery);
    const totalCompanyApplications = parseInt(companyAppResult[0]?.total || '0');

    // Aplicaciones por estado de la empresa
    const companyStatusQuery = `
      SELECT status, COUNT(*) as count 
      FROM ${TABLES.APPLICATIONS} 
      WHERE company_id = '${companyId}'
      ${simulationFilter}
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
      ${simulationFilter}
    `;
    const advisorsResult = await executeQuery(advisorsQuery);
    const totalAdvisors = parseInt(advisorsResult[0]?.total || '0');

    // Total de clientes de la empresa
    const clientNamesQuery = `
      SELECT COUNT(DISTINCT client_name) as total 
      FROM ${TABLES.APPLICATIONS} 
      WHERE company_id = '${companyId}'
      ${simulationFilter}
    `;
    const clientNamesResult = await executeQuery(clientNamesQuery);
    const totalClientsCompany = parseInt(clientNamesResult[0]?.total || '0');

    // Tiempo promedio de aprobación
    const avgTimeQuery = `
      SELECT AVG(EXTRACT(EPOCH FROM (approval_date_company - created_at))/86400) as avg_days
      FROM ${TABLES.APPLICATIONS} 
      WHERE company_id = '${companyId}'
      AND approval_date_company IS NOT NULL
      ${simulationFilter}
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
        AND application_type = 'selected_plans'
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
      avgApprovalTime,
      pendingApplications: parseInt(baseStats.pendingApplications?.toString() || '0'),
      applicationsByMonth: Array.isArray(baseStats.applicationsByMonth) 
        ? baseStats.applicationsByMonth 
        : Object.entries(baseStats.applicationsByMonth || {}).map(([month, count]) => ({
            month,
            count: Number(count)
          }))
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