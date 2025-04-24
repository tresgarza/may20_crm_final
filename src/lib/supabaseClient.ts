// Re-export everything from the supabaseService
import { 
  supabase, 
  getAuthenticatedClient, 
  getServiceClient, 
  reinitializeSupabaseClient, 
  createTableSubscription, 
  getStorage,
  default as defaultSupabase
} from '../services/supabaseService';

export { 
  supabase, 
  getAuthenticatedClient, 
  getServiceClient, 
  reinitializeSupabaseClient, 
  createTableSubscription, 
  getStorage 
};

export default defaultSupabase; 