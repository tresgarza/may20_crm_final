import React, { createContext, useContext, useState, useEffect } from 'react';
import { Session, createClient, PostgrestError } from '@supabase/supabase-js';
import { USER_ROLES } from '../utils/constants/roles';

// Tipos
interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
  entityId?: string; // ID del asesor o empresa asociada
  companyId?: string; // ID de la empresa asociada (si aplica)
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: Error | null;
  signIn: (email: string, password: string) => Promise<{
    error: any | null;
    data: any | null;
  }>;
  signInWithCode: (accessCode: string, userType: string) => Promise<{
    error: any | null;
    data: any | null;
  }>;
  signOut: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

// Constantes para almacenamiento
const STORAGE_KEY_USER = 'crm_user';
const STORAGE_KEY_TOKEN = 'crm_token';
const STORAGE_KEY_TOKEN_EXP = 'crm_token_exp';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true); // Cambiado a true para evitar parpadeo
  const [error, setError] = useState<Error | null>(null);

  // Generar un token único para la sesión (simplificado)
  const generateToken = (): string => {
    const randomPart = Math.random().toString(36).substring(2, 15);
    const timestampPart = Date.now().toString(36);
    return `${randomPart}${timestampPart}`;
  };

  // Establecer el token con tiempo de expiración (12 horas por defecto)
  const setSessionToken = (token: string, expireHours: number = 12) => {
    const expiration = new Date();
    expiration.setHours(expiration.getHours() + expireHours);
    
    localStorage.setItem(STORAGE_KEY_TOKEN, token);
    localStorage.setItem(STORAGE_KEY_TOKEN_EXP, expiration.toISOString());
  };

  // Verificar si el token ha expirado
  const isTokenExpired = (): boolean => {
    const expirationStr = localStorage.getItem(STORAGE_KEY_TOKEN_EXP);
    if (!expirationStr) return true;
    
    const expiration = new Date(expirationStr);
    return new Date() > expiration;
  };

  // Verificar sesión al iniciar
  useEffect(() => {
    const checkStoredSession = () => {
      try {
        // Primero verificar si el token existe y no ha expirado
        const token = localStorage.getItem(STORAGE_KEY_TOKEN);
        
        if (token && !isTokenExpired()) {
          // Si el token es válido, recuperar datos del usuario
          const storedUser = localStorage.getItem(STORAGE_KEY_USER);
          if (storedUser) {
            setUser(JSON.parse(storedUser));
          }
        } else if (token) {
          // Si el token ha expirado, limpiar la sesión
          console.log('La sesión ha expirado');
          localStorage.removeItem(STORAGE_KEY_TOKEN);
          localStorage.removeItem(STORAGE_KEY_TOKEN_EXP);
          localStorage.removeItem(STORAGE_KEY_USER);
        }
      } catch (error) {
        console.error('Error checking stored session:', error);
      } finally {
        setLoading(false);
      }
    };

    checkStoredSession();

    // Listener para sincronizar múltiples pestañas
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY_USER) {
        if (!event.newValue) {
          // Usuario se deslogueó en otra pestaña
          setUser(null);
          setSession(null);
        } else {
          // Usuario se logueó en otra pestaña
          setUser(JSON.parse(event.newValue));
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Simulación de autenticación
      if (email === 'admin@fincentiva.com' && password === 'admin123') {
        const mockUser: User = {
          id: '1',
          email: 'admin@fincentiva.com',
          name: 'Administrador',
          role: 'SUPERADMIN',
        };
        
        // Generar y guardar token de sesión
        const token = generateToken();
        setSessionToken(token);
        
        // Guardar datos del usuario
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(mockUser));
        setUser(mockUser);
        
        return { data: { user: mockUser }, error: null };
      }
      
      const errorMsg = 'Credenciales inválidas';
      setError(new Error(errorMsg));
      return { data: null, error: errorMsg };
    } catch (error) {
      console.error('Error signing in:', error);
      setError(error instanceof Error ? error : new Error('Error al iniciar sesión'));
      return { error, data: null };
    } finally {
      setLoading(false);
    }
  };

  const signInWithCode = async (accessCode: string, userType: string) => {
    try {
      setLoading(true);
      setError(null);
      console.log('Starting signInWithCode process...');
      console.log(`Attempting to authenticate ${userType} with code: ${accessCode}`);
      
      // Initialize Supabase client directly
      const supabaseUrl = 'https://ydnygntfkrleiseuciwq.supabase.co';
      const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkbnlnbnRma3JsZWlzZXVjaXdxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTk5MjQwNiwiZXhwIjoyMDU1NTY4NDA2fQ.TwhEGW9DK4DTQQRquT6Z9UW8T8UjLX-hp9uKdRjWAhs';
      console.log('Creating Supabase client with URL:', supabaseUrl);
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      // Query the appropriate table based on user type
      let userData = null;
      let error = null;
      
      try {
      if (userType === USER_ROLES.ADVISOR) {
        console.log('Querying advisors table...');
        const { data, error: queryError } = await supabase
          .from('advisors')
          .select('*')
          .eq('access_code', accessCode)
          .limit(1);
        
        userData = data && data.length > 0 ? data[0] : null;
        error = queryError;
        console.log('Advisors query result:', { dataFound: !!userData, error: error ? error.message : null });
      } else if (userType === USER_ROLES.COMPANY_ADMIN) {
        console.log('Querying company_admins table...');
          
          // First check if the table exists by doing a simple select
          const { error: tableCheckError } = await supabase
            .from('company_admins')
            .select('id')
            .limit(1);
            
          if (tableCheckError && 
             typeof tableCheckError === 'object' && 
             'message' in tableCheckError && 
             (tableCheckError as PostgrestError).message?.includes('relation "company_admins" does not exist')) {
            console.error('The company_admins table does not exist in the database');
            // Fall back to using the advisors table for company admins
            const { data, error: queryError } = await supabase
              .from('advisors')
              .select('*')
              .eq('access_code', accessCode)
              .limit(1);
            
            userData = data && data.length > 0 ? data[0] : null;
            error = queryError;
            console.log('Fallback to advisors table result:', { dataFound: !!userData, error: error ? error.message : null });
          } else {
        const { data, error: queryError } = await supabase
          .from('company_admins')
          .select('*')
          .eq('access_code', accessCode)
          .limit(1);
        
        userData = data && data.length > 0 ? data[0] : null;
        error = queryError;
        console.log('Company admins query result:', { dataFound: !!userData, error: error ? error.message : null });
          }
      } else {
        console.error('Invalid user type:', userType);
        return { data: null, error: 'Tipo de usuario no válido' };
        }
      } catch (queryError) {
        console.error('Error during database query:', queryError);
        error = queryError;
      }
      
      if (error) {
        console.error('Database error:', error);
        const errorMessage = error instanceof Error || (error as PostgrestError).message 
          ? (error as PostgrestError).message || error.toString() 
          : 'Error desconocido';
        return { data: null, error: 'Error de base de datos: ' + errorMessage };
      }
      
      if (!userData) {
        console.log('No user found with provided access code');
        return { data: null, error: 'Código de acceso inválido' };
      }
      
      console.log('User data found:', { id: userData.id, email: userData.email, role: userType });
      
      const userInfo: User = {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userType,
        entityId: userType === USER_ROLES.COMPANY_ADMIN ? userData.company_id : userData.id,
        companyId: userData.company_id || null,
      };
      
      // Generar y guardar token de sesión
      const token = generateToken();
      setSessionToken(token);
      
      // Guardar datos del usuario
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(userInfo));
      setUser(userInfo);
      
      console.log('Login successful, user info stored in localStorage');
      return { data: { user: userInfo }, error: null };
    } catch (error) {
      console.error('Error signing in with code:', error);
      // Ensure returned error is always a string
      const errorObj = error instanceof Error ? error : new Error('Error al iniciar sesión');
      setError(errorObj);
      return { 
        error: errorObj.message, 
        data: null 
      };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      // Eliminar todos los datos de sesión
      localStorage.removeItem(STORAGE_KEY_USER);
      localStorage.removeItem(STORAGE_KEY_TOKEN);
      localStorage.removeItem(STORAGE_KEY_TOKEN_EXP);
      setUser(null);
      setSession(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const value = {
    user,
    session,
    loading,
    error,
    signIn,
    signInWithCode,
    signOut,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 