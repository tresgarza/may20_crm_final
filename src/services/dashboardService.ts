import { supabase } from '../lib/supabaseClient';
import { 
  DashboardStats, 
  ApplicationStats, 
  AdvisorPerformance, 
  AdvisorPerformanceStats,
  CompanyStats,
  QueryResult,
  QueryFilters
} from '../types/dashboard.types';
import type { Database } from '../types/database.types';

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

// Helper function to execute SQL queries
const executeQuery = async (query: string): Promise<any[]> => {
  try {
    console.log('---------------------------------------------');
    console.log('EXECUTING QUERY:', query);
    console.log('---------------------------------------------');
    
    // Extract table name
    const tableMatch = query.match(/FROM\s+([a-zA-Z_][a-zA-Z0-9_]*)/i);
    const tableName = tableMatch?.[1];
    
    if (!tableName) {
      console.error('Could not determine table name from query:', query);
      return [];
    }

    console.log(`Table: ${tableName}`);
    
    // Define base query
    let supabaseQuery = supabase.from(tableName).select('*');
    console.log(`Created base Supabase query for table: ${tableName}`);
    
    // Define useful query pattern checks
    const q = query.toLowerCase();
    const hasCount = q.includes('count(*)');
    const hasGroupBy = q.includes('group by');
    
    // Handle simple COUNT queries (without GROUP BY)
    if (hasCount && !hasGroupBy) {
      console.log('Processing simple COUNT query (without GROUP BY)...');
      // Extract WHERE conditions if they exist
      const whereMatch = query.match(/WHERE\s+(.*?)(?:\s+GROUP BY|\s+ORDER BY|\s+LIMIT|$)/i);
      
      if (whereMatch && whereMatch[1]) {
        const conditions = whereMatch[1];
        console.log(`WHERE conditions found: ${conditions}`);
        
        try {
          // Check for common filters and apply them
          if (conditions.includes('assigned_to =')) {
            const advisorMatch = conditions.match(/assigned_to\s*=\s*'([^']+)'/i);
            if (advisorMatch && advisorMatch[1]) {
              supabaseQuery = supabaseQuery.eq('assigned_to', advisorMatch[1]);
              console.log(`Applied advisor filter: assigned_to = ${advisorMatch[1]}`);
            }
          }
          
          if (conditions.includes('company_id =')) {
            const companyMatch = conditions.match(/company_id\s*=\s*'([^']+)'/i);
            if (companyMatch && companyMatch[1]) {
              supabaseQuery = supabaseQuery.eq('company_id', companyMatch[1]);
              console.log(`Applied company filter: company_id = ${companyMatch[1]}`);
            }
          }
          
          // Handle date conditions
          if (conditions.includes('created_at >=')) {
            const dateMatch = conditions.match(/created_at\s*>=\s*'([^']+)'/i);
            if (dateMatch && dateMatch[1]) {
              supabaseQuery = supabaseQuery.gte('created_at', dateMatch[1]);
              console.log(`Applied date filter: created_at >= ${dateMatch[1]}`);
            }
          }
          
          if (conditions.includes('created_at <=')) {
            const dateMatch = conditions.match(/created_at\s*<=\s*'([^']+)'/i);
            if (dateMatch && dateMatch[1]) {
              supabaseQuery = supabaseQuery.lte('created_at', dateMatch[1]);
              console.log(`Applied date filter: created_at <= ${dateMatch[1]}`);
            }
          }
        } catch (filterError) {
          console.error('Error applying filters:', filterError);
        }
      } else {
        console.log('No WHERE conditions found in query');
      }
      
      // For counts, just fetch all matching data and count it
      console.log('Executing count query with Supabase...');
      const { data, error } = await supabaseQuery;
      
      if (error) {
        console.error('Error executing count query:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        return [{ total: 0 }];
      }
      
      console.log(`Count result: ${data?.length || 0} items`);
      return [{ total: data?.length || 0 }];
    }
    
    // Handle status distribution queries
    if (hasGroupBy && q.includes('group by status')) {
      console.log('Processing GROUP BY STATUS query...');
      
      // Extract WHERE conditions if they exist
      const whereMatch = query.match(/WHERE\s+(.*?)(?:\s+GROUP BY|\s+ORDER BY|\s+LIMIT|$)/i);
      
      if (whereMatch && whereMatch[1]) {
        const conditions = whereMatch[1];
        console.log(`WHERE conditions for status groups: ${conditions}`);
        
        // Apply filters
        if (conditions.includes('company_id =')) {
          const companyMatch = conditions.match(/company_id\s*=\s*'([^']+)'/i);
          if (companyMatch && companyMatch[1]) {
            supabaseQuery = supabaseQuery.eq('company_id', companyMatch[1]);
            console.log(`Applied company filter for status groups: company_id = ${companyMatch[1]}`);
          }
        }
      }
      
      // Get all rows first (with potential filters)
      console.log('Executing status distribution query with Supabase...');
      const { data, error } = await supabaseQuery;
      
      if (error) {
        console.error('Error fetching data for status distribution:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        return [];
      }
      
      console.log(`Status distribution query returned ${data?.length || 0} items`);
      
      // Process the data to get status counts
      const statusCounts: Record<string, number> = {};
      
      data?.forEach(row => {
        const status = row.status || 'unknown';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      
      // Convert to array of status and count
      const result = Object.entries(statusCounts).map(([status, count]) => ({
        status,
        count
      }));
      
      console.log('Status distribution result:', result);
      return result;
    }
    
    // Handle SUM/AVG queries
    if (q.includes('sum(amount)') || q.includes('avg(amount)')) {
      console.log('Processing SUM/AVG query...');
      
      // Extract WHERE conditions if they exist
      const whereMatch = query.match(/WHERE\s+(.*?)(?:\s+GROUP BY|\s+ORDER BY|\s+LIMIT|$)/i);
      
      if (whereMatch && whereMatch[1]) {
        const conditions = whereMatch[1];
        console.log(`WHERE conditions for amount calculation: ${conditions}`);
        
        // Apply filters
        if (conditions.includes('company_id =')) {
          const companyMatch = conditions.match(/company_id\s*=\s*'([^']+)'/i);
          if (companyMatch && companyMatch[1]) {
            supabaseQuery = supabaseQuery.eq('company_id', companyMatch[1]);
            console.log(`Applied company filter for amount calculation: company_id = ${companyMatch[1]}`);
          }
        }
      }
      
      console.log('Executing amount calculation query with Supabase...');
      const { data, error } = await supabaseQuery;
      
      if (error) {
        console.error('Error fetching data for amount calculations:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        return [{ total_amount: 0, avg_amount: 0 }];
      }
      
      console.log(`Amount calculation query returned ${data?.length || 0} items`);
      console.log('Raw amount data sample:', data?.slice(0, 3));
      
      // Process data to calculate sum and average
      const amounts = data
        ?.filter(row => {
          const validAmount = row.amount !== null && !isNaN(Number(row.amount));
          if (!validAmount) {
            console.log(`Filtering out invalid amount value:`, row.amount);
          }
          return validAmount;
        })
        .map(row => {
          const amount = Number(row.amount);
          console.log(`Converting amount ${row.amount} to number: ${amount}`);
          return amount;
        }) || [];
      
      const totalAmount = amounts.reduce((sum, amount) => {
        console.log(`Adding ${amount} to sum ${sum}`);
        return sum + amount;
      }, 0);
      const avgAmount = amounts.length > 0 ? totalAmount / amounts.length : 0;
      
      console.log(`Amount calculations - Total: ${totalAmount}, Average: ${avgAmount}, Count: ${amounts.length}`);
      return [{ total_amount: totalAmount, avg_amount: avgAmount }];
    }
    
    // Handle recent applications query
    if (q.includes('order by created_at desc') && q.includes('limit')) {
      console.log('Processing RECENT APPLICATIONS query...');
      
      // Extract WHERE conditions if they exist
      const whereMatch = query.match(/WHERE\s+(.*?)(?:\s+ORDER BY|\s+LIMIT|$)/i);
      
      if (whereMatch && whereMatch[1]) {
        const conditions = whereMatch[1];
        console.log(`WHERE conditions for recent applications: ${conditions}`);
        
        // Apply filters
        if (conditions.includes('company_id =') || conditions.includes('a.company_id =')) {
          const companyMatch = conditions.match(/(?:a\.)?company_id\s*=\s*'([^']+)'/i);
          if (companyMatch && companyMatch[1]) {
            supabaseQuery = supabaseQuery.eq('company_id', companyMatch[1]);
            console.log(`Applied company filter for recent applications: company_id = ${companyMatch[1]}`);
          }
        }
      }
      
      // Extract limit value
      const limitMatch = query.match(/LIMIT\s+(\d+)/i);
      const limit = limitMatch ? parseInt(limitMatch[1], 10) : 5;
      
      // Apply ordering and limit
      console.log(`Executing recent applications query with limit ${limit}...`);
      supabaseQuery = supabaseQuery.order('created_at', { ascending: false }).limit(limit);
      
      // Execute query
      const { data, error } = await supabaseQuery;
      
      if (error) {
        console.error('Error fetching recent applications:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        return [];
      }
      
      console.log(`Recent applications query returned ${data?.length || 0} items`);
      console.log('Recent applications sample:', data?.slice(0, 1));
      return data || [];
    }
    
    // Handle applications by month
    if (q.includes("to_char(created_at, 'yyyy-mm')") && hasGroupBy) {
      console.log('Processing APPLICATIONS BY MONTH query...');
      
      // Extract WHERE conditions if they exist
      const whereMatch = query.match(/WHERE\s+(.*?)(?:\s+GROUP BY|\s+ORDER BY|\s+LIMIT|$)/i);
      
      if (whereMatch && whereMatch[1]) {
        const conditions = whereMatch[1];
        console.log(`WHERE conditions for applications by month: ${conditions}`);
        
        // Apply filters
        if (conditions.includes('company_id =')) {
          const companyMatch = conditions.match(/company_id\s*=\s*'([^']+)'/i);
          if (companyMatch && companyMatch[1]) {
            supabaseQuery = supabaseQuery.eq('company_id', companyMatch[1]);
            console.log(`Applied company filter for applications by month: company_id = ${companyMatch[1]}`);
          }
        }
      }
      
      console.log('Executing applications by month query with Supabase...');
      const { data, error } = await supabaseQuery;
      
      if (error) {
        console.error('Error fetching data for monthly breakdown:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        return [];
      }
      
      console.log(`Applications by month query returned ${data?.length || 0} items`);
      
      // Process data to get counts by month
      const monthCounts: Record<string, number> = {};
      
      data?.forEach(row => {
        try {
          const date = new Date(row.created_at);
          const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          monthCounts[monthYear] = (monthCounts[monthYear] || 0) + 1;
        } catch (dateError) {
          console.error('Error processing date:', row.created_at, dateError);
        }
      });
      
      // Convert to expected format
      const result = Object.entries(monthCounts).map(([month, count]) => ({
        month,
        count
      }));
      
      console.log('Applications by month result:', result);
      return result;
    }
    
    // Default case - just fetch the data
    console.log('Executing default query...');
    
    // Extract WHERE conditions if they exist
    const whereMatch = query.match(/WHERE\s+(.*?)(?:\s+GROUP BY|\s+ORDER BY|\s+LIMIT|$)/i);
    
    if (whereMatch && whereMatch[1]) {
      const conditions = whereMatch[1];
      console.log(`WHERE conditions for default query: ${conditions}`);
      
      // Apply filters
      if (conditions.includes('company_id =')) {
        const companyMatch = conditions.match(/company_id\s*=\s*'([^']+)'/i);
        if (companyMatch && companyMatch[1]) {
          supabaseQuery = supabaseQuery.eq('company_id', companyMatch[1]);
          console.log(`Applied company filter for default query: company_id = ${companyMatch[1]}`);
        }
      }
    }
    
    const { data, error } = await supabaseQuery;
    
    if (error) {
      console.error('Error executing query:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return [];
    }
    
    console.log(`Query returned ${data?.length || 0} items`);
    return data || [];
  } catch (err) {
    console.error('Error handling query execution:', err);
    console.error('Error stack:', err instanceof Error ? err.stack : 'Unknown error');
    return [];
  }
};

/**
 * Get general dashboard stats based on filters
 */
export const getGeneralDashboardStats = async (
  filters: { advisorId?: string; companyId?: string; startDate?: string; endDate?: string }
): Promise<DashboardStats> => {
  try {
    // Filter conditions
    let filterConditions = '';
    const conditions: string[] = [];
    
    if (filters.advisorId) {
      conditions.push(`assigned_to = '${filters.advisorId}'`);
    }
    
    if (filters.companyId) {
      conditions.push(`company_id = '${filters.companyId}'`);
    }
    
    if (filters.startDate) {
      conditions.push(`created_at >= '${filters.startDate}'`);
    }
    
    if (filters.endDate) {
      conditions.push(`created_at <= '${filters.endDate}'`);
    }
    
    if (conditions.length > 0) {
      filterConditions = ` WHERE ${conditions.join(' AND ')}`;
    }

    // Get total applications
    const totalApplicationsQuery = `
      SELECT COUNT(*) as total 
      FROM ${TABLES.APPLICATIONS}${filterConditions}
    `;
    const totalApplicationsResult = await executeQuery(totalApplicationsQuery);
    const totalApplications = parseInt(totalApplicationsResult[0]?.total || '0');

    // Get applications by status
    const applicationsByStatusQuery = `
      SELECT status, COUNT(*) as count 
      FROM ${TABLES.APPLICATIONS}${filterConditions}
      GROUP BY status
    `;
    const applicationsByStatusResult = await executeQuery(applicationsByStatusQuery);
    const applicationsByStatus: Record<string, number> = {};
    
    if (applicationsByStatusResult && Array.isArray(applicationsByStatusResult)) {
      applicationsByStatusResult.forEach((item: any) => {
        if (!item || !item.status) return;
        
        const status = item.status;
        let count = 0;
        
        if (typeof item.count === 'number') {
          count = item.count;
        } else if (typeof item.count === 'string') {
          count = parseInt(item.count, 10) || 0;
        } else if (item.count) {
          count = parseInt(String(item.count), 10) || 0;
        }
        
        applicationsByStatus[status] = count;
      });
    }
    
    // Calcular aplicaciones aprobadas, rechazadas y pendientes
    const approvedApplications = applicationsByStatus['approved'] || 0;
    const rejectedApplications = applicationsByStatus['rejected'] || 0;
    const pendingApplications = applicationsByStatus['pending'] || 0;
    
    // Get total amount and average amount
    const amountQuery = `
      SELECT 
        SUM(amount) as total_amount,
        AVG(amount) as avg_amount
      FROM ${TABLES.APPLICATIONS}${filterConditions}
    `;
    const amountResult = await executeQuery(amountQuery);
    const totalAmount = parseFloat(amountResult[0]?.total_amount || '0');
    const averageAmount = parseFloat(amountResult[0]?.avg_amount || '0');

    // Get recent applications
    const recentApplicationsQuery = `
      SELECT *
      FROM ${TABLES.APPLICATIONS}${filterConditions}
      ORDER BY created_at DESC 
      LIMIT 5
    `;
    const recentApplicationsResult = await executeQuery(recentApplicationsQuery);
    const recentApplications = recentApplicationsResult as Application[];

    // Get applications by month
    const applicationsByMonthQuery = `
      SELECT 
        TO_CHAR(created_at, 'YYYY-MM') as month, 
        COUNT(*) as count 
      FROM ${TABLES.APPLICATIONS}${filterConditions}
      GROUP BY month 
      ORDER BY month
    `;
    const applicationsByMonthResult = await executeQuery(applicationsByMonthQuery);
    const applicationsByMonth = applicationsByMonthResult.map((item: any) => ({
      month: item.month,
      count: parseInt(item.count)
    }));

    // Get advisor performance
    const advisorPerformanceQuery = `
        SELECT 
        assigned_to as advisor_id,
          COUNT(*) as total_applications,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_applications
      FROM ${TABLES.APPLICATIONS}${filterConditions}
      GROUP BY assigned_to
    `;
    
    const advisorPerformanceResult = await executeQuery(advisorPerformanceQuery);
    const advisorPerformance: AdvisorPerformance[] = advisorPerformanceResult.map((item: any) => {
      const applications = parseInt(item.total_applications);
      const approvedApplications = parseInt(item.approved_applications);
      
      return {
        advisorId: item.advisor_id,
        applications,
        approvalRate: applications > 0 ? (approvedApplications / applications) * 100 : 0
      };
    });
    
    return {
      totalApplications,
      pendingApplications,
      approvedApplications,
      rejectedApplications,
      totalAmount,
      averageAmount,
      recentApplications,
      applicationsByMonth,
      applicationsByStatus,
      advisorPerformance
    };
  } catch (error) {
    console.error('Error al obtener estadísticas del dashboard:', error);
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
  filters: QueryFilters = {}
): Promise<ApplicationStats> => {
  console.log(`Getting advisor stats for advisorId: ${advisorId} with filters:`, filters);

  try {
    // Get advisor details to construct the name
    const advisorQuery = `
      SELECT a.id, a.email, a.name, a.access_code, u.first_name, u.last_name, u.email as user_email
      FROM ${TABLES.ADVISORS} a
      LEFT JOIN ${TABLES.USERS} u ON a.email = u.email
      WHERE a.id = '${advisorId}'
    `;

    const advisorResult = await executeQuery(advisorQuery);
    
    if (!advisorResult || !advisorResult.length || !advisorResult[0]) {
      console.error(`No advisor found with ID: ${advisorId}`);
      throw new Error(`No advisor found with ID: ${advisorId}`);
    }

    const advisor = advisorResult[0];
    console.log(`Found advisor:`, advisor);

    // Get the applications by status
    const applicationsByStatusQuery = `
      SELECT 
        status,
        COUNT(*) as count
      FROM ${TABLES.APPLICATIONS}
      WHERE assigned_to = '${advisorId}'
      ${filters.startDate ? `AND created_at >= '${filters.startDate}'` : ''}
      ${filters.endDate ? `AND created_at <= '${filters.endDate}'` : ''}
      GROUP BY status
    `;

    // Execute the query and get the results
    const statusResults = await executeQuery(applicationsByStatusQuery);
    console.log('Status query results:', statusResults);

    // Initialize the applicationsByStatus with default values
    const applicationsByStatus: { [key: string]: number } = {
      'pending': 0,
      'in_review': 0,
      'approved': 0,
      'rejected': 0
    };

    // Map them to the normalized dashboard statuses
    if (statusResults && Array.isArray(statusResults)) {
      statusResults.forEach(result => {
        if (result && typeof result === 'object' && 'status' in result && 'count' in result) {
          const status = String(result.status || '');
          const count = typeof result.count === 'number' ? result.count : 
                        (result.count ? Number(result.count) : 0);
          
          // Using the normalized status
          const normalizedStatus = normalizeApplicationStatus(status);
          
          // Add to the appropriate status count (defensively)
          if (normalizedStatus && applicationsByStatus[normalizedStatus] !== undefined) {
            applicationsByStatus[normalizedStatus] += count;
          }
          
          console.log(`Mapped status ${status} (normalized: ${normalizedStatus}) with count ${count}`);
        }
      });
    }
    
    console.log('Final applicationsByStatus:', applicationsByStatus);

    // Calculate total applications
    const totalApplicationsQuery = `
      SELECT COUNT(*) as count
      FROM ${TABLES.APPLICATIONS}
      WHERE assigned_to = '${advisorId}'
      ${filters.startDate ? `AND created_at >= '${filters.startDate}'` : ''}
      ${filters.endDate ? `AND created_at <= '${filters.endDate}'` : ''}
    `;

    const totalResult = await executeQuery(totalApplicationsQuery);
    const totalApplications = totalResult && totalResult[0] ? Number(totalResult[0].count || 0) : 0;
    console.log(`Total applications: ${totalApplications}`);

    // Get total amount and average amount
    const amountQuery = `
      SELECT 
        SUM(amount) as total_amount,
        AVG(amount) as avg_amount
      FROM ${TABLES.APPLICATIONS}
      WHERE assigned_to = '${advisorId}'
      ${filters.startDate ? `AND created_at >= '${filters.startDate}'` : ''}
      ${filters.endDate ? `AND created_at <= '${filters.endDate}'` : ''}
    `;

    const amountResult = await executeQuery(amountQuery);
    const totalAmount = amountResult && amountResult[0] ? Number(amountResult[0].total_amount || 0) : 0;
    const averageAmount = amountResult && amountResult[0] ? Number(amountResult[0].avg_amount || 0) : 0;
    console.log(`Total amount: ${totalAmount}, Average amount: ${averageAmount}`);

    // Prepare the application by status chart data (array format for charts)
    const applicationsByStatusChart = Object.entries(applicationsByStatus).map(([status, count]) => ({
      status,
      count
    }));
    console.log('applicationsByStatusChart array format:', applicationsByStatusChart);

    // Calculate the conversion rate (approved / total)
    const approvedApplications = applicationsByStatus['approved'] || 0;
    const rejectedApplications = applicationsByStatus['rejected'] || 0;
    const pendingApplications = (applicationsByStatus['pending'] || 0) + (applicationsByStatus['in_review'] || 0);
    
    const conversionRate = totalApplications > 0 ? Number(((approvedApplications / totalApplications) * 100).toFixed(2)) : 0;
    console.log(`Calculated conversion rate: ${conversionRate}%`);

    // Create the advisor stats object
    const advisorStats: ApplicationStats = {
      advisorId,
      advisorName: advisor.name || `${advisor.first_name || ''} ${advisor.last_name || ''}`.trim() || advisor.email,
      totalApplications,
      approvedApplications,
      rejectedApplications,
      pendingApplications,
      totalAmount,
      averageAmount,
      conversionRate,
      applicationsByStatus,
      applicationsByStatusChart,
      applicationsByMonth: [],  // Will be populated later if needed
      recent: [],  // Will be populated later if needed
      
      // Add missing required properties from the ApplicationStats interface
      recentApplications: [], // This will be filled later if needed
      advisorPerformance: [], // Not applicable for single advisor stats
      totalApproved: approvedApplications,
      totalRejected: rejectedApplications,
      totalPending: pendingApplications,
      pendingApproval: 0, // This would need to be calculated separately if needed
      totalClients: 0, // Would need a separate query to get this
      totalCompanies: 0, // Would need a separate query to get this
      avgTimeToApproval: 0 // Would need a separate query to calculate this
    };

    // Get applications by month
    const applicationsByMonthQuery = `
      SELECT 
        TO_CHAR(created_at, 'YYYY-MM') as month,
        COUNT(*) as count
      FROM ${TABLES.APPLICATIONS}
      WHERE assigned_to = '${advisorId}'
      ${filters.startDate ? `AND created_at >= '${filters.startDate}'` : ''}
      ${filters.endDate ? `AND created_at <= '${filters.endDate}'` : ''}
      GROUP BY TO_CHAR(created_at, 'YYYY-MM')
      ORDER BY month
    `;

    const monthResults = await executeQuery(applicationsByMonthQuery);
    if (monthResults && Array.isArray(monthResults)) {
      advisorStats.applicationsByMonth = monthResults.map(result => ({
        month: String(result.month || ''),
        count: typeof result.count === 'number' ? result.count : Number(result.count || 0)
      }));
    }
    console.log(`Applications by month (${advisorStats.applicationsByMonth.length} entries)`, advisorStats.applicationsByMonth);

    // Get recent applications
    const recentApplicationsQuery = `
      SELECT a.*, c.name as company_name
      FROM ${TABLES.APPLICATIONS} a
      LEFT JOIN ${TABLES.COMPANIES} c ON a.company_id = c.id
      WHERE a.assigned_to = '${advisorId}'
      ${filters.startDate ? `AND a.created_at >= '${filters.startDate}'` : ''}
      ${filters.endDate ? `AND a.created_at <= '${filters.endDate}'` : ''}
      ORDER BY a.created_at DESC
      LIMIT 5
    `;

    const recentResults = await executeQuery(recentApplicationsQuery);
    if (recentResults && Array.isArray(recentResults)) {
      advisorStats.recent = recentResults;
      advisorStats.recentApplications = recentResults; // Also populate the recentApplications field
    }
    console.log(`Recent applications (${advisorStats.recent?.length || 0} entries)`, advisorStats.recent || []);

    return advisorStats;
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
    console.log('Filters:', JSON.stringify(filters));
    
    // Filter conditions for date range
    let dateFilterConditions = '';
    const dateConditions: string[] = [];
    
    if (filters.startDate) {
      dateConditions.push(`created_at >= '${filters.startDate}'`);
    }
    
    if (filters.endDate) {
      dateConditions.push(`created_at <= '${filters.endDate}'`);
    }
    
    if (dateConditions.length > 0) {
      dateFilterConditions = ` AND ${dateConditions.join(' AND ')}`;
    }

    // Base filter for company
    const baseFilter = `company_id = '${companyId}'${dateFilterConditions}`;
    console.log(`SQL base filter: ${baseFilter}`);

    // Get total applications
    const totalApplicationsQuery = `
      SELECT COUNT(*) as total 
      FROM ${TABLES.APPLICATIONS} 
      WHERE ${baseFilter}
    `;
    console.log('Fetching total applications...');
    const totalApplicationsResult = await executeQuery(totalApplicationsQuery);
    const totalApplications = parseInt(totalApplicationsResult[0]?.total || '0');
    console.log(`Total applications: ${totalApplications}`);

    // Get applications by status
    const applicationsByStatusQuery = `
      SELECT status, COUNT(*) as count 
      FROM ${TABLES.APPLICATIONS} 
      WHERE ${baseFilter}
      GROUP BY status
    `;
    console.log('Fetching applications by status...');
    const applicationsByStatusResult = await executeQuery(applicationsByStatusQuery);
    console.log('Applications by status raw result:', applicationsByStatusResult);
    
    // Convert the result to the required format and calculate totals by status
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
        
        // Store in a map for easy access
        statusMap[status] = count;
        
        // Also add to the array format
        applicationsByStatus.push({ status, count });
      });
    }
    
    // Get the counts for specific statuses - defaulting to 0 if not found
    const approvedApplications = statusMap['approved'] || 0;
    const rejectedApplications = statusMap['rejected'] || 0;
    const pendingApplications = statusMap['pending'] || 0;
    
    console.log('Status totals:', { 
      approved: approvedApplications, 
      rejected: rejectedApplications, 
      pending: pendingApplications
    });

    // Get total amount and average amount
    const amountQuery = `
      SELECT 
        SUM(amount) as total_amount,
        AVG(amount) as avg_amount
      FROM ${TABLES.APPLICATIONS} 
      WHERE ${baseFilter}
    `;
    console.log('Fetching amount totals...');
    const amountResult = await executeQuery(amountQuery);
    const totalAmount = parseFloat(amountResult[0]?.total_amount || '0');
    const avgAmount = parseFloat(amountResult[0]?.avg_amount || '0');
    console.log(`Amount totals: total=${totalAmount}, average=${avgAmount}`);

    // Get recent applications with advisor info
    const recentApplicationsQuery = `
      SELECT a.*, adv.id as advisor_id, adv.user_id, adv.specialization
      FROM ${TABLES.APPLICATIONS} a
      LEFT JOIN ${TABLES.ADVISORS} adv ON a.assigned_to = adv.user_id
      WHERE a.${baseFilter}
      ORDER BY a.created_at DESC
      LIMIT 5
    `;
    console.log('Fetching recent applications...');
    const recentApplicationsResult = await executeQuery(recentApplicationsQuery);
    console.log(`Retrieved ${recentApplicationsResult.length} recent applications`);
    
    // Map the results to include advisor info
    const recentApplications = recentApplicationsResult.map((app: any) => {
      // Check if app has advisor-related fields
      const hasAdvisorInfo = !!app.advisor_id;
      console.log(`Application ${app.id} has advisor info: ${hasAdvisorInfo}`);
      
      return {
        ...app,
        advisor: hasAdvisorInfo ? {
          id: app.advisor_id,
          user_id: app.user_id,
          specialization: app.specialization
        } : null
      };
    }) as Application[];

    // Get applications by month
    const applicationsByMonthQuery = `
      SELECT 
        TO_CHAR(created_at, 'YYYY-MM') as month,
        COUNT(*) as count
      FROM ${TABLES.APPLICATIONS} 
      WHERE ${baseFilter}
      GROUP BY month
      ORDER BY month
    `;
    console.log('Fetching applications by month...');
    const applicationsByMonthResult = await executeQuery(applicationsByMonthQuery);
    const applicationsByMonth = applicationsByMonthResult.map((item: any) => ({
      month: item.month || '',
      count: parseInt(String(item.count), 10) || 0 // Ensure count is always a number
    }));
    console.log(`Retrieved ${applicationsByMonth.length} months of application data`);

    // Get total unique clients
    const totalClientsQuery = `
      SELECT COUNT(DISTINCT client_id) as total
      FROM ${TABLES.APPLICATIONS} 
      WHERE ${baseFilter}
    `;
    console.log('Fetching total clients...');
    const totalClientsResult = await executeQuery(totalClientsQuery);
    const totalClients = parseInt(totalClientsResult[0]?.total || '0');
    console.log(`Total clients: ${totalClients}`);

    // Get total advisors for this company
    const totalAdvisorsQuery = `
      SELECT COUNT(*) as total
      FROM ${TABLES.ADVISORS}
      WHERE company_id = '${companyId}'
    `;
    console.log('Fetching total advisors...');
    const totalAdvisorsResult = await executeQuery(totalAdvisorsQuery);
    const totalAdvisors = parseInt(totalAdvisorsResult[0]?.total || '0');
    console.log(`Total advisors: ${totalAdvisors}`);

    // Calculate average time to approval for company
    const avgApprovalTimeQuery = `
      SELECT AVG(
        EXTRACT(EPOCH FROM (approval_date_company - created_at)) / 3600
      ) as avg_time
      FROM ${TABLES.APPLICATIONS} 
      WHERE ${baseFilter}
      AND approval_date_company IS NOT NULL
    `;
    console.log('Fetching average approval time...');
    const avgApprovalTimeResult = await executeQuery(avgApprovalTimeQuery);
    const avgApprovalTime = parseFloat(avgApprovalTimeResult[0]?.avg_time || '0');
    console.log(`Average approval time: ${avgApprovalTime} hours`);

    // Get advisor performance for this company
    try {
      const advisorPerformanceQuery = `
        SELECT 
          a.assigned_to as advisor_id,
          u.first_name || ' ' || u.last_name as advisor_name,
          COUNT(*) as total_applications,
          SUM(CASE WHEN a.status = 'approved' THEN 1 ELSE 0 END) as approved_applications,
          SUM(CASE WHEN a.status = 'rejected' THEN 1 ELSE 0 END) as rejected_applications,
          SUM(CASE WHEN a.status = 'pending' THEN 1 ELSE 0 END) as pending_applications,
          AVG(
            CASE 
              WHEN a.approval_date_advisor IS NOT NULL 
              THEN EXTRACT(EPOCH FROM (a.approval_date_advisor - a.created_at)) / 3600
              ELSE NULL
            END
          ) as avg_approval_time
        FROM ${TABLES.APPLICATIONS} a
        JOIN ${TABLES.USERS} u ON a.assigned_to = u.id
        WHERE a.${baseFilter}
        GROUP BY a.assigned_to, u.first_name, u.last_name
      `;
      
      console.log('Fetching advisor performance...');
      const advisorPerformanceResult = await executeQuery(advisorPerformanceQuery);
      console.log(`Retrieved advisor performance for ${advisorPerformanceResult.length} advisors`);
      
      const advisorPerformance: AdvisorPerformanceStats[] = advisorPerformanceResult.map((item: any) => {
        const totalApplications = parseInt(item.total_applications || '0');
        const approvedApplications = parseInt(item.approved_applications || '0');
        const rejectedApplications = parseInt(item.rejected_applications || '0');
        const pendingApplications = parseInt(item.pending_applications || '0');
        
        return {
          advisorId: item.advisor_id || '',
          advisorName: item.advisor_name || '',
          totalApplications,
          approvedApplications,
          rejectedApplications,
          pendingApplications,
          approvalRate: totalApplications > 0 ? (approvedApplications / totalApplications) * 100 : 0,
          avgApprovalTime: parseFloat(item.avg_approval_time || '0')
        };
      });

      // Build the final result object
      const result: CompanyStats = {
        totalApplications,
        pendingApplications,
        approvedApplications,
        rejectedApplications,
        totalAmount,
        avgAmount,
        recentApplications,
        applicationsByMonth,
        applicationsByStatus,
        advisorPerformance,
        totalClients,
        totalAdvisors,
        avgApprovalTime
      };
      
      console.log('Successfully compiled complete company dashboard stats');
      return result;
    } catch (error) {
      console.error('Error in advisor performance section:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'Unknown error');
      
      // Return data without advisor performance if there's an error
      const result: CompanyStats = {
        totalApplications,
        pendingApplications,
        approvedApplications,
        rejectedApplications,
        totalAmount,
        avgAmount,
        recentApplications,
        applicationsByMonth,
        applicationsByStatus,
        advisorPerformance: [],
        totalClients,
      totalAdvisors,
        avgApprovalTime
      };
      
      console.log('Returning company dashboard stats without advisor performance due to error');
      return result;
    }
  } catch (error) {
    console.error('Error getting company dashboard stats:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'Unknown error');
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