import { supabase } from '../supabaseClient';

/**
 * Gets the current user's role based on the session data
 * @returns The user role ('advisor', 'company', 'global') or undefined if not logged in
 */
export const getUserRole = async (): Promise<'advisor' | 'company' | 'global' | undefined> => {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) return undefined;
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return undefined;
  
  // This is just a placeholder implementation
  // In your actual application, you'll need to get the user's role from session metadata or user claims
  // or from a separate user_roles table in your database
  
  // For example, if using claims:
  // return user.app_metadata?.role as 'advisor' | 'company' | 'global';
  
  // For now, we'll return a default role for development
  return 'advisor';
};

/**
 * Checks if the current user has a specific role
 * @param role The role to check for
 * @returns Boolean indicating if the user has the specified role
 */
export const hasRole = async (role: 'advisor' | 'company' | 'global'): Promise<boolean> => {
  const userRole = await getUserRole();
  return userRole === role || userRole === 'global';
};

/**
 * Gets the current user ID
 * @returns The user ID or undefined if not logged in
 */
export const getUserId = async (): Promise<string | undefined> => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id;
};

/**
 * Checks if a user is authenticated
 * @returns Boolean indicating if the user is authenticated
 */
export const isAuthenticated = async (): Promise<boolean> => {
  const { data: { session } } = await supabase.auth.getSession();
  return !!session;
}; 