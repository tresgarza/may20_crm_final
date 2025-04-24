import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, CompanyAdmin } from '../types/database.types';
import { 
  supabase, 
  getCurrentUser, 
  isAuthenticated, 
  signIn, 
  signOut, 
  signUp,
  signInWithAccessCode,
  hasRole
} from '../config/supabase';

interface AuthContextType {
  user: User | CompanyAdmin | null;
  loading: boolean;
  error: Error | null;
  authenticated: boolean;
  signIn: (email: string, password: string) => Promise<{ user: User | null; error: Error | null }>;
  signInWithAccessCode: (email: string, accessCode: string) => Promise<{ user: CompanyAdmin | null; error: Error | null }>;
  signUp: (email: string, password: string, userData: Omit<User, 'id' | 'created_at'>) => Promise<{ user: User | null; error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
  checkRole: (roles: string | string[]) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: false,
  error: null,
  authenticated: false,
  signIn: async () => ({ user: null, error: null }),
  signInWithAccessCode: async () => ({ user: null, error: null }),
  signUp: async () => ({ user: null, error: null }),
  signOut: async () => ({ error: null }),
  checkRole: async () => false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | CompanyAdmin | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [authenticated, setAuthenticated] = useState<boolean>(false);

  // Load user on initial load
  useEffect(() => {
    const loadUser = async () => {
      try {
        setLoading(true);
        const auth = await isAuthenticated();
        setAuthenticated(auth);

        if (auth) {
          const currentUser = await getCurrentUser();
          setUser(currentUser);
        }
      } catch (error) {
        console.error('Error loading user:', error);
        setError(error as Error);
      } finally {
        setLoading(false);
      }
    };

    loadUser();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        setAuthenticated(true);
        
        try {
          // Check user metadata to determine user type
          const { data: { user: authUser } } = await supabase.auth.getUser();
          
          if (authUser?.user_metadata?.role === 'company_admin') {
            // If it's a company admin, get the company admin data
            const { data: companyAdmin } = await supabase
              .from('company_admins')
              .select('*')
              .eq('email', authUser.email)
              .single();
              
            if (companyAdmin) {
              setUser(companyAdmin);
            }
          } else {
            // Regular user
            const currentUser = await getCurrentUser();
            setUser(currentUser);
          }
        } catch (err) {
          console.error('Error determining user type:', err);
          const currentUser = await getCurrentUser();
          setUser(currentUser);
        }
      } else if (event === 'SIGNED_OUT') {
        setAuthenticated(false);
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Helper function to check if user has a specific role
  const checkRole = async (roles: string | string[]): Promise<boolean> => {
    return await hasRole(roles);
  };

  // Auth context value
  const value = {
    user,
    loading,
    error,
    authenticated,
    signIn,
    signInWithAccessCode,
    signUp,
    signOut,
    checkRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext; 