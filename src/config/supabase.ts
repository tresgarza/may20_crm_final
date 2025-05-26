import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types';
import { User, CompanyAdmin } from '../types/database.types';
import { USER_ROLES } from '../utils/constants/roles';

// Define UserRoleType based on USER_ROLES
export type UserRoleType = typeof USER_ROLES[keyof typeof USER_ROLES] | 'ANONYMOUS';

// Environment variables for Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ydnygntfkrleiseuciwq.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkbnlnbnRma3JsZWlzZXVjaXdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk5OTI0MDYsImV4cCI6MjA1NTU2ODQwNn0.B-dH2Kptzz1oyM4ynno_GjlvjpxL-HbNKC_st4bgf0A';

// Storage keys
const AUTH_STORAGE_KEY = 'supabase.auth.token';
const USER_STORAGE_KEY = 'supabase.auth.user';

// Create Supabase client
export const createSupabaseClient = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase URL or Anon Key is missing!');
    // Fallback to hardcoded values if environment variables are missing
    return createClient<Database>(
      'https://ydnygntfkrleiseuciwq.supabase.co', 
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkbnlnbnRma3JsZWlzZXVjaXdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk5OTI0MDYsImV4cCI6MjA1NTU2ODQwNn0.B-dH2Kptzz1oyM4ynno_GjlvjpxL-HbNKC_st4bgf0A', 
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storageKey: AUTH_STORAGE_KEY,
        },
        global: {
          headers: { 'x-application-name': 'CRM' },
        },
      }
    );
  }

  const options = {
    auth: {
      persistSession: true,      // Enable session persistence
      autoRefreshToken: true,    // Auto refresh token
      detectSessionInUrl: true,  // Detect session in URL
      storageKey: AUTH_STORAGE_KEY,
    },
    global: {
      headers: { 'x-application-name': 'CRM' },
    },
  };

  return createClient<Database>(supabaseUrl, supabaseAnonKey, options);
};

// Export a singleton instance
export const supabase = createSupabaseClient();

// Authentication helpers
export const isAuthenticated = async (): Promise<boolean> => {
  const session = await supabase.auth.getSession();
  return !!session.data.session;
};

export const getCurrentUser = async (): Promise<User | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;
  
  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();
    
  return data;
};

/**
 * Obtiene el rol del usuario autenticado
 * @returns El rol del usuario autenticado o 'ANONYMOUS' si no está autenticado
 */
export const getUserRole = async (): Promise<UserRoleType> => {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) return 'ANONYMOUS';

    const { data: user } = await supabase.auth.getUser();
    if (!user || !user.user) return 'ANONYMOUS';

    const userId = user.user.id;

    // Check if the user is a superadmin
    const { data: superAdmin } = await supabase
      .from('superadmins')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (superAdmin) return 'SUPERADMIN';

    // Check if the user is an advisor
    const { data: advisor } = await supabase
      .from('advisors')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (advisor) return 'ADVISOR';

    // Check if the user is a company admin - use a safer approach
    try {
      const { data: companyAdmin, error } = await supabase
        .from('company_admins')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error checking company_admin role:', error);
        return 'ANONYMOUS';
      }

      if (companyAdmin) return 'COMPANY_ADMIN';
    } catch (companyAdminError) {
      console.error('Exception checking company_admin role:', companyAdminError);
    }

    return 'ANONYMOUS';
  } catch (error) {
    console.error('Error getting user role:', error);
    return 'ANONYMOUS';
  }
};

export const hasRole = async (roles: string | string[]): Promise<boolean> => {
  const userRole = await getUserRole();
  if (!userRole) return false;
  
  if (Array.isArray(roles)) {
    return roles.includes(userRole);
  }
  
  return userRole === roles;
};

export const signIn = async (
  email: string,
  password: string
): Promise<{ user: User | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    if (data.user) {
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      return { user: userData || null, error: null };
    }

    return { user: null, error: null };
  } catch (error) {
    console.error('Error signing in:', error);
    return { user: null, error: error as Error };
  }
};

export const signInWithAccessCode = async (
  email: string,
  accessCode: string
): Promise<{ user: CompanyAdmin | null; error: Error | null }> => {
  try {
    // Validate access code
    const { data: companyAdmin, error } = await supabase
      .from('company_admins')
      .select('*')
      .eq('email', email)
      .eq('access_code', accessCode)
      .single();

    if (error) throw error;

    if (!companyAdmin) {
      throw new Error('Invalid access code or email');
    }

    // Create a session for company admin
    const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({
      email,
      password: accessCode, // Using access code as password
    });

    if (sessionError) {
      // If user doesn't exist in auth, create one
      if (sessionError.message.includes('Invalid login credentials')) {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password: accessCode,
        });

        if (signUpError) throw signUpError;

        // Update metadata
        if (signUpData.user) {
          await supabase.auth.updateUser({
            data: { role: USER_ROLES.COMPANY_ADMIN }
          });
        }

        return { user: companyAdmin, error: null };
      }

      throw sessionError;
    }

    return { user: companyAdmin, error: null };
  } catch (error) {
    console.error('Error signing in with access code:', error);
    return { user: null, error: error as Error };
  }
};

export const signUp = async (
  email: string,
  password: string,
  userData: Omit<User, 'id' | 'created_at'>,
): Promise<{ user: User | null; error: Error | null }> => {
  try {
    // Create auth user
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: userData.role,
          first_name: userData.first_name,
          last_name: userData.last_name,
        }
      }
    });

    if (error) throw error;

    if (data.user) {
      // Create user in the users table
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          id: data.user.id,
          email: data.user.email!,
          role: userData.role,
          first_name: userData.first_name,
          last_name: userData.last_name,
          phone: userData.phone,
          status: userData.status || 'active',
        })
        .select('*')
        .single();

      if (insertError) throw insertError;

      return { user: newUser, error: null };
    }

    return { user: null, error: null };
  } catch (error) {
    console.error('Error signing up:', error);
    return { user: null, error: error as Error };
  }
};

export const signOut = async (): Promise<{ error: Error | null }> => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    // Clear local storage
    if (typeof window !== 'undefined') {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);
    }

    return { error: null };
  } catch (error) {
    console.error('Error signing out:', error);
    return { error: error as Error };
  }
};

export const refreshSession = async (): Promise<{ error: Error | null }> => {
  try {
    const { error } = await supabase.auth.refreshSession();
    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error refreshing session:', error);
    return { error: error as Error };
  }
};

export const resetPassword = async (email: string): Promise<{ error: Error | null }> => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    });
    
    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error resetting password:', error);
    return { error: error as Error };
  }
};

export const updatePassword = async (
  newPassword: string
): Promise<{ error: Error | null }> => {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    
    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error updating password:', error);
    return { error: error as Error };
  }
};

export const updateUserProfile = async (
  userId: string,
  updates: Partial<User>
): Promise<{ user: User | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select('*')
      .single();
      
    if (error) throw error;
    
    // Update auth metadata if relevant fields are being updated
    if (updates.first_name || updates.last_name || updates.role) {
      await supabase.auth.updateUser({
        data: {
          first_name: updates.first_name,
          last_name: updates.last_name,
          role: updates.role,
        }
      });
    }
    
    return { user: data, error: null };
  } catch (error) {
    console.error('Error updating user profile:', error);
    return { user: null, error: error as Error };
  }
}; 