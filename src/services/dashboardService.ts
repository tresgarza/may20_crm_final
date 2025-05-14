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
      query = baseQuery.select('status');
    } else if (queryType === 'GROUP_BY_MONTH') {
      query = baseQuery.select('created_at');
    } else if (queryType === 'AMOUNT_RANGES') {
      query = baseQuery.select('amount');
    } else if (queryType === 'RECENT') {
      query = baseQuery.select('*');
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
    
    // Apply date range filters
    if (filters.startDate) {
      query = query.gte('created_at', filters.startDate);
      console.log(`Applied start date filter: created_at >= ${filters.startDate}`);
    }
    
    if (filters.endDate) {
      query = query.lte('created_at', filters.endDate);
      console.log(`Applied end date filter: created_at <= ${filters.endDate}`);
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
    
    // Process results based on query type
    if (queryType === 'COUNT' || queryType === 'COUNT_DISTINCT_CLIENTS' || queryType === 'COUNT_DISTINCT_COMPANIES') {
      // For count queries, return the count as a total
      return [{ total: count ?? data?.length ?? 0 }];
    } else if (queryType === 'GROUP_BY_STATUS') {
      // For status grouping, count occurrences of each status
      const statusCounts: Record<string, number> = {};
      data?.forEach((item) => {
        const status = item.status || 'unknown';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      
      // Convert to required format
      return Object.entries(statusCounts).map(([status, count]) => ({
        status,
        count
      }));
    } else if (queryType === 'GROUP_BY_MONTH') {
      // For month grouping, extract month from created_at and count occurrences
      const monthCounts: Record<string, number> = {};
      data?.forEach((item) => {
        const date = new Date(item.created_at);
        const month = date.toISOString().substring(0, 7); // YYYY-MM format
        monthCounts[month] = (monthCounts[month] || 0) + 1;
      });
      
      // Convert to required format
      return Object.entries(monthCounts).map(([month, count]) => ({
        month,
        count
      }));
    } else if (queryType === 'AMOUNT_RANGES') {
      // For amount ranges, segment amounts into predefined ranges and count
      const rangeMap: Record<string, number> = {
        '0-5,000': 0,
        '5,001-10,000': 0,
        '10,001-50,000': 0,
        '50,001-100,000': 0,
        '100,001+': 0
      };
      
      data?.forEach((item) => {
        const amount = Number(item.amount) || 0;
        if (amount <= 5000) {
          rangeMap['0-5,000']++;
        } else if (amount <= 10000) {
          rangeMap['5,001-10,000']++;
        } else if (amount <= 50000) {
          rangeMap['10,001-50,000']++;
        } else if (amount <= 100000) {
          rangeMap['50,001-100,000']++;
        } else {
          rangeMap['100,001+']++;
        }
      });
      
      // Convert to required format
      return Object.entries(rangeMap)
        .filter(([_, count]) => count > 0) // Only include ranges with data
        .map(([range, count]) => ({
          range,
          count
        }));
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

    // Find status counts
    const statusCounts: Record<string, number> = {};
    applicationsByStatus.forEach(item => {
      statusCounts[item.status] = item.count;
    });
    
    // Get counts for specific statuses
    const pendingApplications = statusCounts['pending'] || statusCounts['Solicitud'] || 0;
    const approvedApplications = statusCounts['approved'] || statusCounts['completed'] || 0;
    const rejectedApplications = statusCounts['rejected'] || 0;

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
    
    // Create a chart-friendly version of applicationsByStatus for general dashboard
    const applicationsByStatusChart = applicationsByStatus.map(item => ({
      status: mapToDashboardStatus(item.status),
      count: item.count
    }));
    
    // Calculate conversion rate
    const conversionRate = totalApplications > 0 
      ? (approvedApplications / totalApplications) * 100 
      : 0;
    
    // Return dashboard stats
    return {
      totalApplications,
      pendingApplications,
      approvedApplications,
      rejectedApplications,
      applicationsByStatus,
      applicationsByStatusChart,
      applicationsByMonth,
      recentApplications,
      totalClients,
      totalCompanies,
      totalAmount: 0, // Pending calculation
      avgAmount: 0,  // Pending calculation
      conversionRate,
      amountRanges: amountRanges as AmountRange[]
    };
  } catch (error) {
    console.error('Error getting general dashboard stats:', error);
    throw error;
  }
};

/**
 * Map a raw status string to a normalized dashboard status
 */
const mapToDashboardStatus = (raw?: string): string => {
  if (!raw) return 'pending';
  
  const status = raw.toLowerCase();
  
  if (status === 'new' || status === 'solicitud' || status === 'pending') {
    return 'pending';
  } else if (status === 'in_review') {
    return 'in_review';
  } else if (status === 'approved' || status === 'por_dispersar' || status === 'completed') {
    return 'approved';
  } else if (status === 'rejected' || status === 'cancelled' || status === 'expired') {
    return 'rejected';
  }
  
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
    
    // Get the counts for specific statuses
    const approvedApplications = statusMap['approved'] || statusMap['completed'] || 0;
    const rejectedApplications = statusMap['rejected'] || 0;
    const pendingApplications = statusMap['pending'] || statusMap['Solicitud'] || 0;

    // Get total amount and average amount
    const amountResult = await executeQuery('COUNT', 'applications', {
      ...queryFilters,
      // This will just count total applications, we'll calculate amount in memory
    });
    
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
    
    // Get total unique clients
    const clientsResult = await executeQuery('COUNT_DISTINCT_CLIENTS', 'applications', queryFilters);
    const totalClients = parseInt(String(clientsResult[0]?.total) || '0');
    
    // Get total unique companies
    const companiesResult = await executeQuery('COUNT_DISTINCT_COMPANIES', 'applications', queryFilters);
    
    // Calculate conversion rate (approved / total)
    const conversionRate = totalApplications > 0 
      ? (approvedApplications / totalApplications) * 100 
      : 0;
    
    // Generate amount ranges from the actual data
    console.log('Fetching amount ranges...');
    const amountRanges = await executeQuery('AMOUNT_RANGES', 'applications', queryFilters);
    
    // Create a chart-friendly version of applicationsByStatus
    const applicationsByStatusChart = applicationsByStatus.map(item => ({
      status: mapToDashboardStatus(item.status),
      count: item.count
    }));
    
    // Set up result object
    const result: ApplicationStats = {
      applicationId: advisorId,
      advisorId: advisorId,
      totalApplications,
      pendingApplications,
      approvedApplications,
      rejectedApplications,
      totalAmount: 0, // We'll calculate this from real data in a later version
      avgAmount: 0,  // We'll calculate this from real data in a later version
      applicationsByStatus,
      applicationsByStatusChart,
      applicationsByMonth,
      recentApplications,
      totalClients,
      conversionRate,
      amountRanges: amountRanges as AmountRange[]
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
    
    // Get counts for specific statuses
    const pendingApplications = statusMap['pending'] || statusMap['Solicitud'] || 0;
    const approvedApplications = statusMap['approved'] || statusMap['completed'] || 0;
    const rejectedApplications = statusMap['rejected'] || 0;

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
    
    // Get unique clients
    console.log('Fetching unique clients...');
    const clientsResult = await executeQuery('COUNT_DISTINCT_CLIENTS', 'applications', queryFilters);
    const totalClients = parseInt(String(clientsResult[0]?.total) || '0');
    
    // Get amount ranges
    console.log('Fetching amount ranges...');
    const amountRanges = await executeQuery('AMOUNT_RANGES', 'applications', queryFilters);
    
    // Create a chart-friendly version of applicationsByStatus
    const applicationsByStatusChart = applicationsByStatus.map(item => ({
      status: mapToDashboardStatus(item.status),
      count: item.count
    }));
    
    // Get total advisors for this company
    console.log('Fetching advisors count...');
    const advisorsResult = await executeQuery('COUNT', 'advisors', {
      companyId
    });
    const totalAdvisors = parseInt(String(advisorsResult[0]?.total) || '0');
    
    // Calculate conversion rate
    const conversionRate = totalApplications > 0 
      ? (approvedApplications / totalApplications) * 100 
      : 0;
    
    // Set up result object
      const result: CompanyStats = {
        totalApplications,
        pendingApplications,
        approvedApplications,
        rejectedApplications,
      totalAmount: 0, // We'll calculate this from real data later
      avgAmount: 0,  // We'll calculate this from real data later
        applicationsByStatus,
      applicationsByStatusChart,
        applicationsByMonth,
      recentApplications,
        totalClients,
      totalAdvisors,
      avgApprovalTime: 0, // Placeholder for future implementation
      advisorPerformance: [], // Will be populated in the future
      companyId
    };
    
    console.log('Successfully compiled company dashboard stats');
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