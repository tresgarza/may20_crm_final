/**
 * Service for MCP (Mini Client Protocol) 
 * Used for executing direct SQL queries to our custom PostgreSQL server
 */

// The base URL where our MCP server is running
const MCP_URL = 'http://localhost:3100';

interface QueryResponse {
  data?: any[];
  error?: string;
}

/**
 * Execute a SQL query against the MCP server
 * @param query SQL query to execute
 * @returns QueryResponse with data array or error message
 */
export const executeQuery = async (query: string): Promise<QueryResponse> => {
  try {
    console.log('🔍 MCP Service: Ejecutando consulta:', query);
    
    const response = await fetch(`${MCP_URL}/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    const result = await response.json();
    console.log('🔍 MCP Service: Respuesta completa:', result);

    if (!response.ok) {
      console.error('🔍 MCP Service: Error en la respuesta:', result);
      throw new Error(result.error || 'Error executing query');
    }

    // La respuesta del MCP server tiene formato { data: [...], metadata: {...} }
    // O simplemente es un array directamente
    if (result.data) {
      return { data: result.data };
    } else if (Array.isArray(result)) {
      return { data: result };
    } else {
      console.log('🔍 MCP Service: Estructura de datos atípica:', result);
      return { data: result };
    }
  } catch (error: any) {
    console.error('🔍 MCP Service: Error:', error);
    return { error: error.message || 'Error connecting to MCP server' };
  }
};

/**
 * Simple ping to check if MCP server is available
 * @returns true if server is available, false otherwise
 */
export const pingMcpServer = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${MCP_URL}/ping`);
    return response.ok;
  } catch (error) {
    console.error('MCP server ping failed:', error);
    return false;
  }
}; 