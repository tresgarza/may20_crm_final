/**
 * API request utilities
 */
import { supabase } from '../services/supabaseService';
import { IFilteredApiResponse } from '../types/api';

interface ApiRequestOptions {
  endpoint: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: any;
  headers?: Record<string, string>;
}

/**
 * Makes an API request to the server
 * For now, we're using Supabase directly instead of an actual API endpoint
 */
export const apiRequest = async (options: ApiRequestOptions): Promise<IFilteredApiResponse> => {
  const { endpoint, method = 'GET', data } = options;
  
  // This is a simplified implementation that uses Supabase directly
  // In a real application, this would make actual HTTP requests to an API
  try {
    // Parse the endpoint to determine what we're requesting
    const endpointParts = endpoint.split('/').filter(Boolean);
    
    if (endpointParts[0] === 'applications') {
      if (endpointParts[1] === 'filtered') {
        // Handle filtered applications request
        let query = supabase.from('applications').select('*', { count: 'exact' });
        
        // Apply filters if provided
        if (data) {
          if (data.searchQuery) {
            query = query.or(`client_name.ilike.%${data.searchQuery}%,client_email.ilike.%${data.searchQuery}%`);
          }
          
          if (data.status && data.status !== 'all') {
            query = query.eq('status', data.status);
          }
          
          if (data.applicationType && data.applicationType !== 'all') {
            query = query.eq('application_type', data.applicationType);
          }
          
          if (data.dateRange?.start) {
            query = query.gte('created_at', data.dateRange.start.toISOString());
          }
          
          if (data.dateRange?.end) {
            query = query.lte('created_at', data.dateRange.end.toISOString());
          }
          
          if (data.amountRange?.min) {
            query = query.gte('amount', data.amountRange.min);
          }
          
          if (data.amountRange?.max) {
            query = query.lte('amount', data.amountRange.max);
          }
        }
        
        // Execute the query
        const { data: applications, error, count } = await query;
        
        if (error) {
          return {
            data: [],
            total: 0,
            error: error.message,
            status: 500
          };
        }
        
        return {
          data: applications || [],
          total: count || 0,
          error: null,
          status: 200
        };
      }
    }
    
    // Default error response for unsupported endpoints
    return {
      data: [],
      total: 0,
      error: `Endpoint ${endpoint} not supported`,
      status: 404
    };
  } catch (error) {
    console.error('API request error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return {
      data: [],
      total: 0,
      error: errorMessage,
      status: 500
    };
  }
}; 