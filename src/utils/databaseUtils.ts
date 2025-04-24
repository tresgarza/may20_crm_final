/**
 * Database utilities for direct data access
 */
import { SupabaseClient } from '@supabase/supabase-js';
import { TABLES } from './constants/tables';
import { supabase } from '../lib/supabaseClient';

// Valores de autenticación de Supabase
const SUPABASE_URL = 'https://ydnygntfkrleiseuciwq.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkbnlnbnRma3JsZWlzZXVjaXdxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTk5MjQwNiwiZXhwIjoyMDU1NTY4NDA2fQ.TwhEGW9DK4DTQQRquT6Z9UW8T8UjLX-hp9uKdRjWAhs';

// Use the imported supabase client instead of creating a new one
// This helps ensure we only have one client instance across the app

// Add a cache for approval status to persist data during connection issues
const approvalStatusCache = new Map<string, any>();

// Track connection status
let supabaseConnected = true;
let lastConnectionAttempt = 0;
const CONNECTION_RETRY_INTERVAL = 30000; // 30 seconds

// Helper function to parse SQL query
export const parseQuery = (query: string): { table: string; type: string; conditions: any } => {
  const queryLower = query.toLowerCase();
  
  // Detect query type
  let type = 'select';
  if (queryLower.startsWith('insert')) type = 'insert';
  if (queryLower.startsWith('update')) type = 'update';
  if (queryLower.startsWith('delete')) type = 'delete';
  
  // Extract table name
  let table = '';
  if (type === 'select') {
    const fromMatch = queryLower.match(/from\s+([a-z0-9_]+)/i);
    if (fromMatch && fromMatch[1]) table = fromMatch[1];
  } else if (type === 'insert') {
    const intoMatch = queryLower.match(/into\s+([a-z0-9_]+)/i);
    if (intoMatch && intoMatch[1]) table = intoMatch[1];
  } else if (type === 'update') {
    const updateMatch = queryLower.match(/update\s+([a-z0-9_]+)/i);
    if (updateMatch && updateMatch[1]) table = updateMatch[1];
  } else if (type === 'delete') {
    const fromMatch = queryLower.match(/from\s+([a-z0-9_]+)/i);
    if (fromMatch && fromMatch[1]) table = fromMatch[1];
  }
  
  // Extract conditions from WHERE clause (simplified)
  let conditions: any = {};
  const whereMatch = queryLower.match(/where\s+(.*?)(?:order by|group by|limit|$)/i);
  if (whereMatch && whereMatch[1]) {
    const whereClause = whereMatch[1].trim();
    
    // For simpler queries, try to parse conditions
    // This is a very basic implementation and might not work for complex conditions
    const condPairs = whereClause.split(/\s+and\s+/i);
    condPairs.forEach(pair => {
      const equalMatch = pair.match(/([a-z0-9_]+)\s*=\s*'([^']+)'/i);
      if (equalMatch) {
        conditions[equalMatch[1]] = equalMatch[2];
      }
    });
  }
  
  return { table, type, conditions };
};

// Execute query specifically with Supabase
export const executeSupabaseQuery = async (
  table: string, 
  type: string, 
  conditions: any, 
  originalQuery: string
): Promise<any[]> => {
  if (!table) {
    throw new Error('Table name is required for Supabase query execution');
  }
  
  try {
    let result;
    
    if (type === 'select') {
      // For select queries, use Supabase query builder
      let query = supabase.from(table).select('*');
      
      // Apply conditions if available
      if (conditions && Object.keys(conditions).length > 0) {
        Object.entries(conditions).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      result = data || [];
    } else {
      // For other query types, we'd need more complex logic
      // This is a simplified implementation
      console.warn('Non-SELECT queries are not fully implemented in executeSupabaseQuery');
      throw new Error('Only SELECT queries are supported in this implementation');
    }
    
    return result;
  } catch (error) {
    console.error('Supabase query execution error:', error);
    throw error;
  }
};

// Execute query with MCP server
export const executeMcpQuery = async (query: string): Promise<any[]> => {
  try {
    // Here we would implement the logic to send the query to the MCP server
    // For now, this is a placeholder that simulates an MCP call
    const response = await fetch('/api/mcp-query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });
    
    if (!response.ok) {
      throw new Error(`MCP server responded with status: ${response.status}`);
    }
    
    const result = await response.json();
    return result.data || [];
  } catch (error) {
    console.error('MCP server connection error:', error);
    throw error;
  }
};

// Helper function to check and potentially reconnect to Supabase
export const ensureSupabaseConnection = async (): Promise<boolean> => {
  const now = Date.now();
  
  // Only retry connection every 30 seconds to avoid too many reconnect attempts
  if (!supabaseConnected && (now - lastConnectionAttempt) > CONNECTION_RETRY_INTERVAL) {
    console.log('Attempting to reconnect to Supabase...');
    lastConnectionAttempt = now;
    
    try {
      // Simple health check query
      const { data, error } = await supabase.from('applications').select('count(*)', { count: 'exact' }).limit(1);
      
      if (error) {
        console.error('Supabase reconnection failed:', error);
        supabaseConnected = false;
        return false;
      }
      
      console.log('Successfully reconnected to Supabase');
      supabaseConnected = true;
      return true;
    } catch (error) {
      console.error('Supabase reconnection error:', error);
      supabaseConnected = false;
      return false;
    }
  }
  
  return supabaseConnected;
};

// Function to execute a database query
export const executeQuery = async (query: string): Promise<any[]> => {
  // Log the query for debugging
  console.log('Original SQL query:', query);
  
  // Try to ensure we have a connection first if we're not connected
  if (!supabaseConnected) {
    await ensureSupabaseConnection();
  }
  
  try {
    // First, try to execute with Supabase
    const { table, type, conditions } = parseQuery(query);
    
    if (!table) {
      console.error('Could not determine table from query:', query);
      throw new Error('Invalid query: Could not determine table');
    }
    
    console.log('Extracted table name:', `'${table}'`);
    
    // For approval status queries, check the cache first in case of connection issues
    if (table === 'applications' && query.includes('approved_by_advisor') && query.includes('WHERE id =')) {
      // Extract the application ID from the query
      const idMatch = query.match(/WHERE id = '([^']+)'/);
      if (idMatch && idMatch[1]) {
        const appId = idMatch[1];
        
        try {
          // Attempt to execute the query normally
          const result = await executeSupabaseQuery(table, type, conditions, query);
          
          // If successful, update the cache
          if (result && result.length > 0) {
            approvalStatusCache.set(appId, result[0]);
            console.log(`Updated approval cache for ${appId}`);
          }
          
          return result;
        } catch (error) {
          // If query fails but we have cached data, use it
          if (approvalStatusCache.has(appId)) {
            console.log(`Using cached approval data for ${appId} due to connection error`);
            return [approvalStatusCache.get(appId)];
          }
          // Otherwise, rethrow the error
          throw error;
        }
      }
    }
    
    // Execute the query through Supabase
    const result = await executeSupabaseQuery(table, type, conditions, query);
    
    // If we get here, connection is working
    supabaseConnected = true;
    
    return result;
  } catch (error) {
    // Mark connection as potentially broken
    supabaseConnected = false;
    
    console.error('Error in executeQuery:', error);
    console.log('Using fallback query execution for:', query);
    
    // For select queries with the MCP server
    try {
      return await executeMcpQuery(query);
    } catch (mcpError) {
      console.error('MCP server query failed:', mcpError);
      
      // If this is specifically an approval status query and both Supabase and MCP fail
      if (query.includes('SELECT') && 
          query.includes('approved_by_advisor') && 
          query.includes('approved_by_company')) {
        
        console.warn('Both Supabase and MCP failed for approval status query. Returning default values.');
        return [{
          approved_by_advisor: false,
          approved_by_company: false,
          approval_date_advisor: null,
          approval_date_company: null
        }];
      }
      
      throw mcpError;
    }
  }
};

// Function to reinitialize Supabase client in case of connection issues
export const reinitializeSupabaseClient = () => {
  console.log('Reinitializing Supabase client connection...');
  // Since we're now using the imported client, we can't recreate it here,
  // but we can test the connection to effectively reinitialize the session
  return testSupabaseConnection().then(connected => {
    supabaseConnected = connected;
    return supabase;
  });
};

// Function to test the Supabase connection
export const testSupabaseConnection = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.from('applications').select('count(*)', { count: 'exact' }).limit(1);
    if (error) {
      console.error('Supabase connection test failed:', error);
      return false;
    }
    console.log('Supabase connection test successful');
    return true;
  } catch (error) {
    console.error('Supabase connection test error:', error);
    return false;
  }
};

// Export supabase client for direct usage
export { supabase };

/**
 * Escapa caracteres especiales en string para prevenir inyección SQL
 * @param value String a escapar
 * @returns String escapado
 */
export const escapeSqlString = (value: string): string => {
  if (!value) return '';
  
  // Reemplazar comillas simples por dos comillas simples (estándar SQL)
  return value.replace(/'/g, "''");
};

/**
 * Formatea una fecha para SQL
 * @param date Fecha a formatear
 * @returns String formateado para SQL
 */
export const formatDateForSql = (date: Date): string => {
  return date.toISOString();
};

/**
 * Convierte un objeto a una cadena de condiciones SQL WHERE
 * @param conditions Objeto con condiciones {columna: valor}
 * @returns String con condiciones SQL
 */
export const objectToSqlWhere = (conditions: Record<string, any>): string => {
  const clauses = [];
  
  for (const [key, value] of Object.entries(conditions)) {
    if (value === undefined || value === null) continue;
    
    if (typeof value === 'string') {
      clauses.push(`${key} = '${escapeSqlString(value)}'`);
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      clauses.push(`${key} = ${value}`);
    } else if (value instanceof Date) {
      clauses.push(`${key} = '${formatDateForSql(value)}'`);
    } else if (Array.isArray(value)) {
      const formattedValues = value.map(v => 
        typeof v === 'string' ? `'${escapeSqlString(v)}'` : v
      );
      clauses.push(`${key} IN (${formattedValues.join(',')})`);
    }
  }
  
  return clauses.length > 0 ? clauses.join(' AND ') : '1=1';
}; 

/**
 * Fetches approval statuses for multiple applications in a single batch query
 * @param ids Array of application IDs to fetch approval statuses for
 * @returns A Map with application IDs as keys and approval data as values
 */
export const fetchApprovalsBatch = async (ids: string[]) => {
  if (!ids || ids.length === 0) {
    return new Map();
  }

  try {
    console.log(`Fetching approval statuses in batch for ${ids.length} applications`);
    
    // Execute a single query for all IDs instead of individual queries
    const { data, error } = await supabase
      .from('applications')
      .select('id, approved_by_advisor, approved_by_company, approval_date_advisor, approval_date_company')
      .in('id', ids);
    
    if (error) {
      console.error('Error fetching approval statuses in batch:', error);
      throw error;
    }
    
    if (!data || data.length === 0) {
      console.warn('No approval data returned for batch query');
      return new Map();
    }
    
    console.log(`Successfully fetched ${data.length} approval statuses in batch`);
    
    // Store results in the cache
    data.forEach(item => {
      const cachedResultKey = `approval_status_${item.id}`;
      try {
        sessionStorage.setItem(cachedResultKey, JSON.stringify(item));
      } catch (e) {
        // Ignore storage errors
      }
    });
    
    // Return a Map for easy lookup by ID
    return new Map(data.map(item => [
      item.id, 
      {
        approvedByAdvisor: item.approved_by_advisor || false,
        approvedByCompany: item.approved_by_company || false,
        approvalDateAdvisor: item.approval_date_advisor,
        approvalDateCompany: item.approval_date_company
      }
    ]));
  } catch (error) {
    console.error('Error in fetchApprovalsBatch:', error);
    // Return empty Map on error
    return new Map();
  }
}

// Initialize connection status check
setTimeout(() => {
  ensureSupabaseConnection();
}, 1000); 