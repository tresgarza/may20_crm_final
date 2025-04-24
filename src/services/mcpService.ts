/**
 * Service for MCP (Mini Client Protocol) 
 * Used for executing direct SQL queries to our custom PostgreSQL server
 */
import { executeQuery as databaseExecuteQuery } from '../utils/databaseUtils';

interface QueryResponse {
  data?: any[];
  error?: string;
}

/**
 * Execute a SQL query using the database utilities
 * @param query SQL query to execute
 * @returns QueryResponse with data array or error message
 */
export const executeQuery = async (query: string): Promise<QueryResponse> => {
  try {
    console.log('🔍 MCP Service: Ejecutando consulta:', query);
    
    // Use the databaseUtils.executeQuery function instead of making HTTP requests
    const data = await databaseExecuteQuery(query);
    
    console.log('🔍 MCP Service: Respuesta:', data);
    return { data };
  } catch (error: any) {
    console.error('🔍 MCP Service: Error:', error);
    return { error: error.message || 'Error ejecutando consulta' };
  }
};

/**
 * Simple ping to check if database connection is available
 * @returns true if connection is available, false otherwise
 */
export const pingMcpServer = async (): Promise<boolean> => {
  try {
    // Execute a simple query to check database connection
    const result = await executeQuery('SELECT 1 as connection_test');
    return Boolean(result.data && result.data.length > 0);
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}; 