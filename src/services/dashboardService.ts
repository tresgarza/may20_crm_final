import { supabase } from '../lib/supabaseClient';
import { 
  DashboardStats, 
  ApplicationStats, 
  AdvisorPerformance, 
  AdvisorPerformanceStats,
  CompanyStats,
  QueryResult,
  QueryFilters,
  StatusCount,
  AmountRange
} from '../types/dashboard.types';
import type { Database } from '../types/database.types';
import { USER_ROLES } from '../utils/constants/roles';

// Local type definitions
type Tables = Database['public']['Tables'];
type Application = Tables['applications']['Row'];

// Constants
const TABLES = {
  APPLICATIONS: 'applications',
  ADVISORS: 'advisors',
  COMPANIES: 'companies',
  CLIENTS: 'clients',
  USERS: 'users'
};

// Helper function to execute queries using Supabase API instead of raw SQL
const executeQuery = async (
  queryType: string, 
  table: string = 'applications',
  filters: {
    advisorId?: string;
    companyId?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
    applicationTypeFilter?: boolean;
    approvedByAdvisor?: boolean;
    groupBy?: string;
    limit?: number;
    orderBy?: { column: string; ascending: boolean };
  } = {}
): Promise<any[]> => {
  try {
    console.log('---------------------------------------------');
    console.log(`EXECUTING QUERY TYPE: ${queryType} on table ${table}`);
    console.log(`WITH FILTERS:`, filters);
    console.log('---------------------------------------------');
    
    // We only apply special filtering for applications table
    if (table.toLowerCase() !== 'applications') {
      console.log(`Table is not applications, executing regular query for ${table}`);
      const { data, error } = await supabase.from(table).select('*');
      if (error) {
        console.error('Error executing query:', error);
      return [];
    }
      return data || [];
    }
    
    // CRITICAL: Build query for applications table with proper filters
    let baseQuery = supabase.from('applications');
    
    // Select based on query type
    let query;
    if (queryType === 'COUNT') {
      query = baseQuery.select('*', { count: 'exact', head: true });
    } else if (queryType === 'COUNT_DISTINCT_CLIENTS') {
      query = baseQuery.select('client_id', { count: 'exact' }).limit(1000);
    } else if (queryType === 'COUNT_DISTINCT_COMPANIES') {
      query = baseQuery.select('company_id', { count: 'exact' }).limit(1000);
    } else if (queryType === 'GROUP_BY_STATUS') {
      // Para obtener resultados más precisos, vamos a consultar el campo de estado correcto
      // basado en el rol del usuario (advisor_status, company_status o global_status)
      let statusField = 'status';
      
      // Verificar si estamos en dashboard de asesor o empresa
      if (filters.advisorId && !filters.companyId) {
        statusField = 'advisor_status';
        console.log('Consulta por GROUP_BY_STATUS usando campo advisor_status');
      } else if (!filters.advisorId && filters.companyId) {
        statusField = 'company_status';
        console.log('Consulta por GROUP_BY_STATUS usando campo company_status');
      } else {
        statusField = 'global_status';
        console.log('Consulta por GROUP_BY_STATUS usando campo global_status (default)');
      }
      
      query = baseQuery.select(`${statusField}`);
      
      // Para forzar refresco, no usamos opciones especiales sino parámetros que aseguren
      // que Supabase no use caché para esta consulta
      console.log('Asegurando que no se use caché para consulta GROUP_BY_STATUS');
    } else if (queryType === 'GROUP_BY_MONTH') {
      query = baseQuery.select('created_at');
    } else if (queryType === 'AMOUNT_RANGES') {
      query = baseQuery.select('amount');
    } else if (queryType === 'RECENT') {
      query = baseQuery.select('*');
    } else if (queryType === 'ATTENTION_NEEDED') {
      // For applications needing attention: not rejected or completed and no status change in 48 hours
      // 48 hours = 48 * 60 * 60 * 1000 = 172800000 milliseconds
      query = baseQuery.select('*')
        .not('status', 'in', '("rejected","completed")')
        .lt('updated_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString());
    } else {
      query = baseQuery.select('*');
    }
    
    // ALWAYS apply application_type filter for applications table
    if (filters.applicationTypeFilter !== false) {
      query = query.eq('application_type', 'selected_plans');
      console.log('✅ Applied MANDATORY application_type = selected_plans filter');
    }
    
    // Apply advisor filter if provided
    if (filters.advisorId) {
      query = query.eq('assigned_to', filters.advisorId);
      console.log(`✅ Applied advisor filter: assigned_to = ${filters.advisorId}`);
      } else {
      console.warn('⚠️ NO ADVISOR FILTER APPLIED - this might return applications from all advisors');
    }
    
    // Apply company filter if provided
    if (filters.companyId) {
      query = query.eq('company_id', filters.companyId);
      console.log(`✅ Applied company filter: company_id = ${filters.companyId}`);
    } else {
      console.warn('⚠️ NO COMPANY FILTER APPLIED - this might return applications from all companies');
    }
    
    // Apply date range filters - MEJORADO: más detalles en logs y validación de fechas
    if (filters.startDate && filters.startDate.trim() !== '') {
      // Asegurar formato correcto: YYYY-MM-DD
      const startDate = new Date(filters.startDate);
      if (!isNaN(startDate.getTime())) {
        const formattedStartDate = startDate.toISOString().split('T')[0];
        query = query.gte('created_at', formattedStartDate);
        console.log(`✅ Applied start date filter: created_at >= ${formattedStartDate}`);
      } else {
        console.warn(`⚠️ Invalid start date format: ${filters.startDate}`);
      }
    }
    
    if (filters.endDate && filters.endDate.trim() !== '') {
      // Asegurar formato correcto y ajustar para incluir todo el día
      const endDate = new Date(filters.endDate);
      if (!isNaN(endDate.getTime())) {
        // Ajustar al final del día (23:59:59)
        endDate.setHours(23, 59, 59, 999);
        const formattedEndDate = endDate.toISOString();
        query = query.lte('created_at', formattedEndDate);
        console.log(`✅ Applied end date filter: created_at <= ${formattedEndDate}`);
      } else {
        console.warn(`⚠️ Invalid end date format: ${filters.endDate}`);
      }
    }
    
    // Apply status filter if provided
    if (filters.status) {
      query = query.eq('status', filters.status);
      console.log(`Applied status filter: status = ${filters.status}`);
    }
    
    // Apply approved_by_advisor filter if provided
    if (filters.approvedByAdvisor !== undefined) {
      query = query.eq('approved_by_advisor', filters.approvedByAdvisor);
      console.log(`Applied approved_by_advisor filter: ${filters.approvedByAdvisor}`);
    }
    
    // Apply order if needed
    if (filters.orderBy) {
      query = query.order(filters.orderBy.column, { ascending: filters.orderBy.ascending });
      console.log(`Applied ordering by ${filters.orderBy.column} ${filters.orderBy.ascending ? 'ASC' : 'DESC'}`);
    }
    
    // Apply limit if provided
    if (filters.limit) {
      query = query.limit(filters.limit);
      console.log(`Applied limit: ${filters.limit}`);
    }
    
    // Execute the query and process results based on query type
    const { data, error, count } = await query;
      
      if (error) {
      console.error('Error executing Supabase query:', error);
        return [];
      }
      
    console.log(`Query returned ${data?.length || 0} results. Count: ${count || 'N/A'}`);
    
    // Normalizar montos: usar credito_solicitado cuando exista
    if (data && data.length > 0) {
      data.forEach((item: any) => {
        if (item.credito_solicitado !== undefined && item.credito_solicitado !== null) {
          item.amount = parseFloat(item.credito_solicitado);
        } else if (typeof item.amount === 'string') {
          // Asegurar que amount sea numérico
          item.amount = parseFloat(item.amount);
        }
      });
    }
    
    // Process results based on query type
    if (queryType === 'COUNT' || queryType === 'COUNT_DISTINCT_CLIENTS' || queryType === 'COUNT_DISTINCT_COMPANIES') {
      // For count queries, return the count as a total
      return [{ total: count ?? data?.length ?? 0 }];
    } else if (queryType === 'GROUP_BY_STATUS') {
      // Determinar el campo de estado que se consultó
      let statusField = 'status';
      if (filters.advisorId && !filters.companyId) {
        statusField = 'advisor_status';
      } else if (!filters.advisorId && filters.companyId) {
        statusField = 'company_status';
      } else {
        statusField = 'global_status';
      }
      
      // For status grouping, count occurrences of each status
      const statusCounts: Record<string, number> = {};
      data?.forEach((item: any) => {
        // Usar el campo correcto según lo determinado anteriormente
        const status = item[statusField] || 'unknown';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      
      console.log(`GROUP_BY_STATUS usando campo ${statusField} - resultados:`, statusCounts);
      
      // Convert to required format
      return Object.entries(statusCounts).map(([status, count]) => ({
        status,
        count
      }));
    } else if (queryType === 'GROUP_BY_MONTH') {
      // For month grouping, extract month from created_at and count occurrences
      const monthCounts: Record<string, number> = {};
      
      // For day-by-day data, we'll also include more detailed information
      const dailyCounts: Record<string, number> = {};
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      
      data?.forEach((item: any) => {
        const date = new Date(item.created_at);
        
        // For monthly view (YYYY-MM)
        const month = date.toISOString().substring(0, 7); // YYYY-MM format
        monthCounts[month] = (monthCounts[month] || 0) + 1;
        
        // For daily view (YYYY-MM-DD)
        const day = date.toISOString().split('T')[0]; // YYYY-MM-DD format
        dailyCounts[day] = (dailyCounts[day] || 0) + 1;
      });
      
      // Convert to required format and sort by month
      const results = Object.entries(monthCounts).map(([month, count]) => ({
        month,
        count,
        // Add daily data for more detailed views
        daily: Object.entries(dailyCounts)
          .filter(([day]) => day.startsWith(month)) // Only include days for this month
          .map(([day, count]) => ({ date: day, count }))
      })).sort((a, b) => a.month.localeCompare(b.month)); // Ordenar cronológicamente
      
      console.log(`Month distribution results (${results.length} months):`, results);
      return results;
    } else if (queryType === 'AMOUNT_RANGES') {
      // For amount ranges, segment amounts into predefined ranges and count
      const rangeMap: Record<string, number> = {
        '0-10000': 0,
        '10001-25000': 0,
        '25001-50000': 0,
        '50001-75000': 0,
        '75001-100000': 0
      };
      
      console.log(`Processing AMOUNT_RANGES with ${data?.length || 0} items`);
      
      if (!data || data.length === 0) {
        console.log('No data returned for AMOUNT_RANGES query');
        return Object.entries(rangeMap).map(([range, count]) => ({
          range,
          count
        }));
      }
      
      // Log a sample of data to verify it contains 'amount' field
      if (data && data.length > 0) {
        console.log('AMOUNT_RANGES sample data:', {
          first: data[0],
          hasAmountField: 'amount' in data[0],
          amountValue: data[0].amount,
          amountType: typeof data[0].amount
        });
      }
      
      data?.forEach((item: any) => {
        const amount = Number(item.amount) || 0;
        if (amount <= 10000) {
          rangeMap['0-10000']++;
        } else if (amount <= 25000) {
          rangeMap['10001-25000']++;
        } else if (amount <= 50000) {
          rangeMap['25001-50000']++;
        } else if (amount <= 75000) {
          rangeMap['50001-75000']++;
        } else if (amount <= 100000) {
          rangeMap['75001-100000']++;
        }
      });
      
      console.log('AMOUNT_RANGES distribution after processing:', rangeMap);
      
      // Convert to required format
      const result = Object.entries(rangeMap)
        .filter(([_, count]) => count > 0) // Only include ranges with data
        .map(([range, count]) => ({
          range,
        count
      }));
      
      console.log(`AMOUNT_RANGES final result (${result.length} ranges):`, result);
      return result;
    } else {
      // For other queries, return data as is
    return data || [];
    }
  } catch (error) {
    console.error('Error in executeQuery:', error);
    // Return appropriate fallback based on query type
    if (queryType === 'COUNT' || queryType === 'COUNT_DISTINCT_CLIENTS' || queryType === 'COUNT_DISTINCT_COMPANIES') {
      return [{ total: 0 }];
    } else {
      return [];
    }
  }
};

/**
 * Get general dashboard stats based on filters
 */
export const getGeneralDashboardStats = async (
  filters: { advisorId?: string; companyId?: string; startDate?: string; endDate?: string }
): Promise<DashboardStats> => {
  try {
    console.log('=====================================================');
    console.log('GENERAL DASHBOARD STATS');
    console.log('=====================================================');
    console.log('Filters applied:', JSON.stringify(filters, null, 2));

    // Get total applications
    console.log('Fetching total applications...');
    const totalApplicationsResult = await executeQuery('COUNT', 'applications', filters);
    const totalApplications = parseInt(String(totalApplicationsResult[0]?.total) || '0');
    console.log(`Total applications: ${totalApplications}`);

    // Get applications by status
    console.log('Fetching applications by status...');
    const applicationsByStatusResult = await executeQuery('GROUP_BY_STATUS', 'applications', filters);
    const applicationsByStatus = applicationsByStatusResult;

    // Process status results
    const statusMap: Record<string, number> = {};
    applicationsByStatus.forEach(item => {
      statusMap[item.status] = item.count;
    });
    
    // Get counts for specific statuses - FIXED to count each status separately
    const pendingApplications = statusMap['pending'] || statusMap['Solicitud'] || statusMap['new'] || 0;
    const approvedApplications = statusMap['approved'] || 0;
    const porDispersarApplications = statusMap['por_dispersar'] || 0;
    const completedApplications = statusMap['completed'] || 0;
    const rejectedApplications = statusMap['rejected'] || 0;

    // MODIFICACIÓN: Para la métrica "Solicitudes Aprobadas", sumar todas las solicitudes en estado
    // 'approved', 'por_dispersar' y 'completed'
    const totalApprovedApplications = approvedApplications + porDispersarApplications + completedApplications;

    // Get applications by month
    console.log('Fetching applications by month...');
    const applicationsByMonth = await executeQuery('GROUP_BY_MONTH', 'applications', filters);

    // Get recent applications
    console.log('Fetching recent applications...');
    const recentApplications = await executeQuery('RECENT', 'applications', {
      ...filters,
      orderBy: { column: 'created_at', ascending: false },
      limit: 10
    });
    
    // Get unique clients
    console.log('Fetching unique clients...');
    const clientsResult = await executeQuery('COUNT_DISTINCT_CLIENTS', 'applications', filters);
    const totalClients = parseInt(String(clientsResult[0]?.total) || '0');
    
    // Get unique companies
    console.log('Fetching unique companies...');
    const companiesResult = await executeQuery('COUNT_DISTINCT_COMPANIES', 'applications', filters);
    const totalCompanies = parseInt(String(companiesResult[0]?.total) || '0');
    
    // Get amount ranges
    console.log('Fetching amount ranges...');
    const amountRanges = await executeQuery('AMOUNT_RANGES', 'applications', filters);
    
    // Get all applications to calculate total and average amount for approved applications only
    console.log('Calculating total and average amounts for approved applications...');
    const allApplications = await executeQuery('RECENT', 'applications', {
      ...filters,
      limit: 1000 // Limit to avoid excessive data retrieval
    });
    
    // Calculate total and average amount for approved applications only
    let totalAmount = 0;
    let approvedCount = 0;
    
    allApplications.forEach(app => {
      const status = (app.status || '').toLowerCase();
      const isApproved = status === 'approved' || status === 'por_dispersar' || status === 'completed';
      
      if (isApproved && app.amount) {
        const amount = typeof app.amount === 'number' ? app.amount : parseFloat(app.amount);
        if (!isNaN(amount)) {
          totalAmount += amount;
          approvedCount++;
        }
      }
    });
    
    // Calculate average amount
    const avgAmount = approvedCount > 0 ? totalAmount / approvedCount : 0;
    console.log(`Total amount for approved applications: ${totalAmount}`);
    console.log(`Average amount for approved applications: ${avgAmount}`);
    
    // Create a chart-friendly version of applicationsByStatus for general dashboard
    const applicationsByStatusChart = applicationsByStatus.map(item => {
      const statusLower = item.status.toLowerCase();
      let status = item.status;
      
      // Map status to consistent categories for display
      // This is for chart display, but we preserve the original data in applicationsByStatus
      if (statusLower.includes('pend') || statusLower === 'solicitud' || statusLower === 'new' || statusLower === 'nuevo') {
        status = 'Nuevo';
      } else if (statusLower.includes('review') || statusLower.includes('revis')) {
        status = 'En Revisión';
      } else if (statusLower.includes('aprob') || statusLower.includes('aprov') || statusLower.includes('approv')) {
        status = 'Aprobado';
      } else if (statusLower.includes('recha') || statusLower.includes('reject')) {
        status = 'Rechazado';
      } else if (statusLower.includes('comple')) {
        status = 'Completado';
      } else if (statusLower.includes('dispers')) {
        status = 'Por Dispersar';
      }
      
    return {
        status,
        count: item.count
      };
    });

    // Calculate conversion rate
    const conversionRate = totalApplications > 0 
      ? (approvedCount / totalApplications) * 100 
      : 0;
    
    // Get applications needing attention (48+ hours without status change)
    console.log('Fetching applications needing attention...');
    const attentionNeededResult = await executeQuery('ATTENTION_NEEDED', 'applications', filters);
    const attentionNeededCount = attentionNeededResult?.length || 0;
    
    // Return dashboard stats
    return {
      totalApplications,
      pendingApplications,
      approvedApplications: totalApprovedApplications,
      rejectedApplications,
      applicationsByStatus,
      applicationsByStatusChart,
      applicationsByMonth,
      recentApplications,
      totalClients,
      totalCompanies,
      totalAmount,
      avgAmount,
      conversionRate,
      amountRanges: amountRanges as AmountRange[],
      attentionNeededCount
    };
  } catch (error) {
    console.error('Error getting general dashboard stats:', error);
    throw error;
  }
};

/**
 * Map a raw status string to a normalized dashboard status, preserving specific states
 */
const mapToDashboardStatus = (raw?: string): string => {
  if (!raw) return 'pending';
  
  const status = raw.toLowerCase();
  
  // Mantener estados específicos en lugar de normalizarlos todos
  if (status === 'new' || status === 'solicitud' || status === 'pending') {
    return 'pending';
  } else if (status === 'in_review') {
    return 'in_review';
  } else if (status === 'approved') {
    return 'approved';
  } else if (status === 'por_dispersar') {
    return 'por_dispersar';
  } else if (status === 'completed') {
    return 'completed';
  } else if (status === 'rejected') {
    return 'rejected';
  } else if (status === 'cancelled') {
    return 'cancelled';
  } else if (status === 'expired') {
    return 'expired';
  }
  
  // Fallback: tratar de encontrar coincidencias parciales
  if (status.includes('pend')) return 'pending';
  if (status.includes('revis')) return 'in_review';
  if (status.includes('aprob') || status.includes('aprov')) return 'approved';
  if (status.includes('disper')) return 'por_dispersar';
  if (status.includes('comple')) return 'completed';
  if (status.includes('recha')) return 'rejected';
  if (status.includes('cancel')) return 'cancelled';
  if (status.includes('expir')) return 'expired';
  
  return 'pending'; // Default fallback
};

/**
 * Normalize application status to one of the four dashboard categories:
 * pending, in_review, approved, rejected
 */
const normalizeApplicationStatus = (status?: string): string => {
  return mapToDashboardStatus(status);
};

/**
 * Get stats for a specific advisor
 */
export const getAdvisorStats = async (
  advisorId: string,
  filters: { startDate?: string; endDate?: string; companyId?: string }
): Promise<ApplicationStats> => {
  try {
    console.log('=====================================================');
    console.log(`ADVISOR DASHBOARD STATS - Advisor ID: ${advisorId}`);
    console.log('=====================================================');
    console.log('Filters:', JSON.stringify(filters, null, 2));
    console.log('Advisor ID check:', { advisorId, type: typeof advisorId, hasValue: !!advisorId });
    
    // CRITICAL FIX: Siempre aplicar el filtro de asesor
    if (!advisorId) {
      console.error('ERROR: No advisor ID provided to getAdvisorStats');
      throw new Error('Advisor ID is required for advisor stats');
    }
    
    const queryFilters = {
      advisorId,
      ...filters
    };
    
    console.log(`SQL base filter with advisor: ${advisorId} and company: ${filters.companyId || 'none'}`);
    
    // Get total applications
    console.log('Fetching total applications...');
    const totalApplicationsResult = await executeQuery('COUNT', 'applications', queryFilters);
    const totalApplications = parseInt(String(totalApplicationsResult[0]?.total) || '0');
    console.log(`Total applications for advisor ${advisorId}: ${totalApplications}`);
    
    // Get applications by status
    console.log('Fetching applications by status...');
    const applicationsByStatusResult = await executeQuery('GROUP_BY_STATUS', 'applications', queryFilters);
    
    // Process status results
    const statusMap: Record<string, number> = {};
    const applicationsByStatus: {status: string; count: number}[] = [];
    
    if (applicationsByStatusResult && Array.isArray(applicationsByStatusResult)) {
      applicationsByStatusResult.forEach((item: any) => {
        if (!item) return;
        
        const status = item.status || 'unknown';
        let count = 0;
        
        if (typeof item.count === 'number') {
          count = item.count;
        } else if (typeof item.count === 'string') {
          count = parseInt(item.count, 10) || 0;
        } else if (item.count) {
          count = parseInt(String(item.count), 10) || 0;
        }
        
        statusMap[status] = count;
        applicationsByStatus.push({ status, count });
      });
    }
    
    // Get the counts for specific statuses - FIXED to count each status separately
    const approvedApplications = statusMap['approved'] || 0;
    const rejectedApplications = statusMap['rejected'] || 0;
    const pendingApplications = statusMap['pending'] || statusMap['Solicitud'] || statusMap['new'] || 0;
    const porDispersarApplications = statusMap['por_dispersar'] || 0;
    const completedApplications = statusMap['completed'] || 0;

    // MODIFICACIÓN: Para la métrica "Solicitudes Aprobadas", sumar todas las solicitudes en estado
    // 'approved', 'por_dispersar' y 'completed'
    const totalApprovedApplications = approvedApplications + porDispersarApplications + completedApplications;

    // Get all applications to calculate total and average amount for approved applications only
    console.log('Calculating total and average amounts for approved applications...');
    const allApplicationsResult = await executeQuery('RECENT', 'applications', {
      ...queryFilters,
      limit: 1000 // Limit to avoid excessive data retrieval
    });
    
    // Calculate total and average amount for approved applications only
    let totalAmount = 0;
    let approvedCount = 0;
    
    allApplicationsResult.forEach(app => {
      const status = (app.status || '').toLowerCase();
      const isApproved = status === 'approved' || status === 'por_dispersar' || status === 'completed';
      
      if (isApproved && app.amount) {
        const amount = typeof app.amount === 'number' ? app.amount : parseFloat(app.amount);
        if (!isNaN(amount)) {
          totalAmount += amount;
          approvedCount++;
        }
      }
    });
    
    // Calculate average amount
    const avgAmount = approvedCount > 0 ? totalAmount / approvedCount : 0;
    console.log(`Total amount for approved applications: ${totalAmount}`);
    console.log(`Average amount for approved applications: ${avgAmount}`);
    
    // Get recent applications
    console.log('Fetching recent applications...');
    const recentApplicationsResult = await executeQuery('RECENT', 'applications', {
      ...queryFilters,
      orderBy: { column: 'created_at', ascending: false },
      limit: 10
    });
    const recentApplications = recentApplicationsResult;

    // Get applications by month
    console.log('Fetching applications by month...');
    const applicationsByMonth = await executeQuery('GROUP_BY_MONTH', 'applications', queryFilters);
    
    // Fetch totalClients - Corregido para contar solo clientes de este asesor
    console.log('Calculating total unique clients for advisor...');
    
    // En el caso del asesor, contamos clientes únicos basados en las aplicaciones
    // asignadas a este asesor
    const { data: clientsData, error: clientsError, count: clientsCount } = await supabase
      .from('applications')
      .select('client_id', { count: 'exact' })
      .eq('assigned_to', advisorId)
      .not('client_id', 'is', null);
    
    if (clientsError) {
      console.error('Error counting unique clients for advisor:', clientsError);
    }
    
    // Crear un conjunto de IDs únicos (ya que count de Supabase cuenta filas, no valores únicos)
    const uniqueClientIds = new Set();
    clientsData?.forEach(app => {
      if (app.client_id) {
        uniqueClientIds.add(app.client_id);
      }
    });
    
    const totalClients = uniqueClientIds.size;
    console.log(`Total unique clients for advisor ${advisorId}: ${totalClients}`);
    
    // Get total unique companies
    const companiesResult = await executeQuery('COUNT_DISTINCT_COMPANIES', 'applications', queryFilters);
    
    // Calculate conversion rate (approved / total)
    const conversionRate = totalApplications > 0 
      ? (approvedCount / totalApplications) * 100 
      : 0;
    
    // Get amount ranges
    console.log('Fetching amount ranges for advisor...');
    
    // Corrección: Asegurarnos de que la consulta para amount ranges incluya todos los datos
    // necesarios sin importar el estado de la aplicación
    const amountRangesQuery = {
      ...filters,
      // No aplicar filtros de estado para asegurar que obtenemos todas las aplicaciones
      // que cumplan con los criterios de fecha y asesor
      status: undefined
    };
    
    const amountRangesResult = await executeQuery('AMOUNT_RANGES', 'applications', amountRangesQuery);
    console.log('Amount ranges query result for advisor:', JSON.stringify(amountRangesResult, null, 2));
    
    // Si no hay resultados, crear distribución base predeterminada
    let finalAmountRanges = amountRangesResult;
    if (!Array.isArray(amountRangesResult) || amountRangesResult.length === 0) {
      console.log('No amount ranges data returned for advisor, creating default distribution');
      finalAmountRanges = [
        { range: '0-10000', count: 0 },
        { range: '10001-25000', count: 0 },
        { range: '25001-50000', count: 0 },
        { range: '50001-75000', count: 0 },
        { range: '75001-100000', count: 0 }
      ];
    }
    
    // Create a chart-friendly version of applicationsByStatus
    const applicationsByStatusChart = applicationsByStatus.map(item => {
      const statusLower = item.status.toLowerCase();
      let status = item.status;
      
      // Map status to consistent categories for display
      // This is for chart display, but we preserve the original data in applicationsByStatus
      if (statusLower.includes('pend') || statusLower === 'solicitud' || statusLower === 'new' || statusLower === 'nuevo') {
        status = 'Nuevo';
      } else if (statusLower.includes('review') || statusLower.includes('revis')) {
        status = 'En Revisión';
      } else if (statusLower.includes('aprob') || statusLower.includes('aprov') || statusLower.includes('approv')) {
        status = 'Aprobado';
      } else if (statusLower.includes('recha') || statusLower.includes('reject')) {
        status = 'Rechazado';
      } else if (statusLower.includes('comple')) {
        status = 'Completado';
      } else if (statusLower.includes('dispers')) {
        status = 'Por Dispersar';
      }
      
      return {
        status,
      count: item.count
      };
    });
    
    // Get applications needing attention (48+ hours without status change)
    console.log('Fetching applications needing attention for advisor...');
    const attentionNeededResult = await executeQuery('ATTENTION_NEEDED', 'applications', queryFilters);
    const attentionNeededCount = attentionNeededResult?.length || 0;
    
    // Set up result object
    const result: ApplicationStats = {
      applicationId: '',
      advisorId,
      totalApplications,
      pendingApplications,
      approvedApplications: totalApprovedApplications,
      rejectedApplications,
      totalAmount,
      avgAmount,
      applicationsByStatus,
      applicationsByStatusChart,
      applicationsByMonth,
      recentApplications,
      totalClients: totalClients,
      conversionRate: conversionRate,
      amountRanges: finalAmountRanges, // Usar el valor procesado para amountRanges
      attentionNeededCount
    };
    
    console.log('Successfully compiled advisor dashboard stats');
    return result;

  } catch (error) {
    console.error('Error getting advisor stats:', error);
    throw error;
  }
};

/**
 * Get stats for a specific company
 */
export const getCompanyDashboardStats = async (
  companyId: string,
  filters: { startDate?: string; endDate?: string }
): Promise<CompanyStats> => {
  try {
    console.log('=====================================================');
    console.log(`COMPANY DASHBOARD STATS - Company ID: ${companyId}`);
    console.log('=====================================================');
    console.log('Filters:', JSON.stringify(filters, null, 2));
    
    // CRITICAL: Asegurar que siempre se use company_id
    if (!companyId) {
      console.error('ERROR: No company ID provided to getCompanyDashboardStats');
      throw new Error('Company ID is required for company dashboard stats');
    }
    
    const queryFilters = {
      companyId,
      ...filters
    };
    
    console.log(`Company filter applied: ${companyId}`);

    // Get total applications
    console.log('Fetching total applications...');
    const totalApplicationsResult = await executeQuery('COUNT', 'applications', queryFilters);
    const totalApplications = parseInt(String(totalApplicationsResult[0]?.total) || '0');
    console.log(`Total applications for company ${companyId}: ${totalApplications}`);

    // Get applications by status
    console.log('Fetching applications by status...');
    const applicationsByStatusResult = await executeQuery('GROUP_BY_STATUS', 'applications', queryFilters);
    const applicationsByStatus = applicationsByStatusResult;
    
    // Process status results to get counts
    const statusMap: Record<string, number> = {};
    applicationsByStatus.forEach(item => {
      statusMap[item.status] = item.count;
    });
    
    // Get counts for specific statuses - FIXED to count each status separately
    const pendingApplications = statusMap['pending'] || statusMap['Solicitud'] || statusMap['new'] || 0;
    const approvedApplications = statusMap['approved'] || 0;
    const porDispersarApplications = statusMap['por_dispersar'] || 0;
    const completedApplications = statusMap['completed'] || 0; 
    const rejectedApplications = statusMap['rejected'] || 0;

    // MODIFICACIÓN: Para la métrica "Solicitudes Aprobadas", sumar todas las solicitudes en estado
    // 'approved', 'por_dispersar' y 'completed'
    const totalApprovedApplications = approvedApplications + porDispersarApplications + completedApplications;

    // Get applications by month
    console.log('Fetching applications by month...');
    const applicationsByMonth = await executeQuery('GROUP_BY_MONTH', 'applications', queryFilters);
    
    // Get recent applications
    console.log('Fetching recent applications...');
    const recentApplications = await executeQuery('RECENT', 'applications', {
      ...queryFilters,
      orderBy: { column: 'created_at', ascending: false },
      limit: 10
    });
    
    // CORREGIDO: Obtener el total de usuarios afiliados a esta empresa
    console.log('Fetching total users affiliated with this company...');
    
    // Consulta directa a Supabase para contar usuarios con este company_id
    const { data: usersData, error: usersError, count: usersCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId);
    
    if (usersError) {
      console.error('Error fetching users count:', usersError);
    }
    
    // Usar el recuento de usuarios como totalClients, o 0 si hay error
    const totalClients = usersCount || 0;
    console.log(`Total users (clients) affiliated with company ${companyId}: ${totalClients}`);
    
    // Get all applications to calculate total and average amount for approved applications
    console.log('Calculating total and average amounts for approved applications...');
    const allApplicationsResult = await executeQuery('RECENT', 'applications', {
      ...queryFilters,
      limit: 1000 // Limit to avoid excessive data retrieval
    });
    
    // Calculate total and average amount for approved applications only
    let totalAmount = 0;
    let approvedCount = 0;
    
    allApplicationsResult.forEach(app => {
      const status = (app.status || '').toLowerCase();
      const isApproved = status === 'approved' || status === 'por_dispersar' || status === 'completed';
      
      if (isApproved && app.amount) {
        const amount = typeof app.amount === 'number' ? app.amount : parseFloat(app.amount);
        if (!isNaN(amount)) {
          totalAmount += amount;
          approvedCount++;
        }
      }
    });
    
    // Calculate average amount
    const avgAmount = approvedCount > 0 ? totalAmount / approvedCount : 0;
    console.log(`Total amount for approved applications: ${totalAmount}`);
    console.log(`Average amount for approved applications: ${avgAmount}`);
    
    // Get amount ranges
    console.log('Fetching amount ranges...');
    console.log('Using query filters for AMOUNT_RANGES:', JSON.stringify(queryFilters, null, 2));
    
    // Corrección: Asegurarnos de que la consulta para amount ranges incluya todos los datos
    // necesarios sin importar el estado de la aplicación
    const amountRangesQuery = {
      ...queryFilters,
      // No aplicar filtros de estado para asegurar que obtenemos todas las aplicaciones
      // que cumplan con los criterios de fecha y compañía
      status: undefined
    };
    
    const amountRangesResult = await executeQuery('AMOUNT_RANGES', 'applications', amountRangesQuery);
    console.log('Amount ranges query result:', JSON.stringify(amountRangesResult, null, 2));
    
    // Si no hay resultados, crear distribución base predeterminada
    let finalAmountRanges = amountRangesResult;
    if (!Array.isArray(amountRangesResult) || amountRangesResult.length === 0) {
      console.log('No amount ranges data returned, creating default distribution');
      finalAmountRanges = [
        { range: '0-10000', count: 0 },
        { range: '10001-25000', count: 0 },
        { range: '25001-50000', count: 0 },
        { range: '50001-75000', count: 0 },
        { range: '75001-100000', count: 0 }
      ];
    }
    
    // Create a chart-friendly version of applicationsByStatus
    const applicationsByStatusChart = applicationsByStatus.map(item => {
      const statusLower = item.status.toLowerCase();
      let status = item.status;
      
      // Map status to consistent categories for display
      // This is for chart display, but we preserve the original data in applicationsByStatus
      if (statusLower.includes('pend') || statusLower === 'solicitud' || statusLower === 'new' || statusLower === 'nuevo') {
        status = 'Nuevo';
      } else if (statusLower.includes('review') || statusLower.includes('revis')) {
        status = 'En Revisión';
      } else if (statusLower.includes('aprob') || statusLower.includes('aprov') || statusLower.includes('approv')) {
        status = 'Aprobado';
      } else if (statusLower.includes('recha') || statusLower.includes('reject')) {
        status = 'Rechazado';
      } else if (statusLower.includes('comple')) {
        status = 'Completado';
      } else if (statusLower.includes('dispers')) {
        status = 'Por Dispersar';
      }
        
        return {
        status,
        count: item.count
        };
      });

    // Get total advisors for this company
    console.log('Fetching advisors count...');
    const advisorsResult = await executeQuery('COUNT', 'advisors', {
      companyId
    });
    const totalAdvisors = parseInt(String(advisorsResult[0]?.total) || '0');
    
    // Calculate conversion rate
    const conversionRate = totalApplications > 0 
      ? (approvedCount / totalApplications) * 100 
      : 0;
    
    // Calcular el tiempo promedio de aprobación
    console.log('Calculating average approval time...');
    const avgApprovalTimeQuery = `
      SELECT AVG(
        EXTRACT(EPOCH FROM (approval_date_company - created_at)) / 86400
      ) as avg_days
      FROM ${TABLES.APPLICATIONS} 
      WHERE company_id = '${companyId}'
      AND approval_date_company IS NOT NULL
      ${filters.startDate ? `AND created_at >= '${filters.startDate}'` : ''}
      ${filters.endDate ? `AND created_at <= '${filters.endDate}'` : ''}
      AND application_type = 'selected_plans'
    `;
    
    const avgApprovalTimeResult = await supabase.rpc('execute_sql', { query: avgApprovalTimeQuery });
    let avgApprovalTime = 0;
    
    if (avgApprovalTimeResult.error) {
      console.error('Error calculating average approval time:', avgApprovalTimeResult.error);
    } else {
      avgApprovalTime = parseFloat(avgApprovalTimeResult.data?.[0]?.avg_days || '0');
      console.log(`Average approval time: ${avgApprovalTime} days`);
    }
    
    // Get applications needing attention (48+ hours without status change)
    console.log('Fetching applications needing attention for company...');
    const attentionNeededResult = await executeQuery('ATTENTION_NEEDED', 'applications', queryFilters);
    const attentionNeededCount = attentionNeededResult?.length || 0;
    
    // Set up result object
      const result: CompanyStats = {
        totalApplications,
        pendingApplications,
      approvedApplications: totalApprovedApplications,
        rejectedApplications,
        totalAmount,
        avgAmount,
        applicationsByStatus,
      applicationsByStatusChart,
      applicationsByMonth,
      recentApplications,
        totalClients,
      totalAdvisors,
      avgApprovalTime, // Valor calculado del tiempo promedio de aprobación
      advisorPerformance: [], // Will be populated in the future
      companyId,
      amountRanges: finalAmountRanges, // Asegurar que siempre tengamos un valor válido para amountRanges
      attentionNeededCount
    };
    
    console.log('Successfully compiled company dashboard stats');
    console.log('Amount ranges in result:', JSON.stringify(result.amountRanges, null, 2));
      return result;
  } catch (error) {
    console.error('Error getting company dashboard stats:', error);
    throw error;
  }
};

/**
 * Get pending approvals for user
 */
export const getPendingApprovals = async (userId: string, isCompanyAdmin: boolean) => {
  try {
    let query = '';
    
    if (isCompanyAdmin) {
      // Aplicaciones pendientes de aprobación por la empresa
      query = `
        SELECT COUNT(*) as pending_count
        FROM ${TABLES.APPLICATIONS}
        WHERE company_id = '${userId}'
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
    const totalPending = parseInt(result[0]?.pending_count || '0');

    // Obtener aplicaciones pendientes de aprobación
    const pendingApplicationsQuery = `
      SELECT *
      FROM ${TABLES.APPLICATIONS}
      WHERE ${isCompanyAdmin ? 'company_id' : 'assigned_to'} = '${userId}'
      AND ${isCompanyAdmin ? 'approved_by_company = false' : 'approved_by_advisor = false'}
    `;
    const pendingApplicationsResult = await executeQuery(pendingApplicationsQuery);
    const pendingApplications = pendingApplicationsResult.map((app: any) => ({
      ...app,
      approval_date_company: app.approval_date_company ? new Date(app.approval_date_company).toISOString() : null,
      approval_date_advisor: app.approval_date_advisor ? new Date(app.approval_date_advisor).toISOString() : null
    }));

    return {
      totalPending,
      pendingApplications
    };
  } catch (error) {
    console.error('Error al obtener estadísticas de aprobaciones pendientes:', error);
    throw error;
  }
};

// Parse the query condition strings and apply common filters
const parseQuery = (query: string): { baseQuery: string, conditions: string[] } => {
  let baseQuery = query;
  const conditions: string[] = [];
  
  // Always include the application_type filter
  conditions.push(`application_type = 'selected_plans'`);
  
  return { baseQuery, conditions };
};