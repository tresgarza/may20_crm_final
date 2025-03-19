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
  const [loading, setLoading] = useState(false);

  // Simular verificación de sesión al iniciar
  useEffect(() => {
    const checkStoredUser = () => {
      try {
        const storedUser = localStorage.getItem('crm_user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error('Error checking stored user:', error);
      } finally {
        setLoading(false);
      }
    };

    checkStoredUser();
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
        
        // Guardar en localStorage para mantener la sesión
        localStorage.setItem('crm_user', JSON.stringify(mockUser));
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
        
        // Guardar en localStorage para mantener la sesión
        localStorage.setItem('crm_user', JSON.stringify(userInfo));
        setUser(userInfo);
        
        return { data: { user: userInfo }, error: null };
      }
      
      return { data: null, error: 'Código de acceso inválido' };
    } catch (error) {
      console.error('Error signing in with code:', error);
      return { error, data: null };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      // Eliminar datos de sesión
      localStorage.removeItem('crm_user');
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