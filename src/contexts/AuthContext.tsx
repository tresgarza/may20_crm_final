import React, { createContext, useContext, useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { USER_ROLES } from '../utils/constants/roles';

// Tipos
interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
  entityId?: string; // ID del asesor o empresa asociada
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
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
      
      return { data: null, error: 'Credenciales inválidas' };
    } catch (error) {
      console.error('Error signing in:', error);
      return { error, data: null };
    } finally {
      setLoading(false);
    }
  };

  const signInWithCode = async (accessCode: string, userType: string) => {
    try {
      setLoading(true);
      
      // Consultar la base de datos para verificar el access_code
      let queryUrl = 'http://localhost:3100/query';
      let queryBody = {};
      
      if (userType === USER_ROLES.ADVISOR) {
        queryBody = {
          query: `SELECT * FROM advisors WHERE access_code = '${accessCode}' LIMIT 1`
        };
      } else if (userType === USER_ROLES.COMPANY_ADMIN) {
        queryBody = {
          query: `SELECT * FROM company_admins WHERE access_code = '${accessCode}' LIMIT 1`
        };
      } else {
        return { data: null, error: 'Tipo de usuario no válido' };
      }
      
      const response = await fetch(queryUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(queryBody),
      });
      
      const result = await response.json();
      
      if (result.error) {
        console.error('Database error:', result.error);
        return { data: null, error: 'Error de base de datos' };
      }
      
      if (result.data && result.data.length > 0) {
        const userData = result.data[0];
        const userInfo: User = {
          id: userData.id,
          email: userData.email,
          name: userData.name,
          role: userType,
          entityId: userType === USER_ROLES.COMPANY_ADMIN ? userData.company_id : userData.id,
        };
        
        // Generar y guardar token de sesión
        const token = generateToken();
        setSessionToken(token);
        
        // Guardar datos del usuario
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(userInfo));
        setUser(userInfo);
        
        return { data: { user: userInfo }, error: null };
      }
      
      return { data: null, error: 'Código de acceso inválido' };
    } catch (error) {
      console.error('Error signing in with code:', error);
      // Ensure returned error is always a string
      return { 
        error: error instanceof Error ? error.message : 'Error al iniciar sesión', 
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
    signIn,
    signInWithCode,
    signOut,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 