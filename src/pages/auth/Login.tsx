import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import ActionButton from '../../components/ui/ActionButton';
import { USER_ROLES, ROLE_LABELS } from '../../utils/constants/roles';

const Login: React.FC = () => {
  // Estado para el modo de login (normal o con código)
  const [loginMode, setLoginMode] = useState<'admin' | 'code'>('code');
  
  // Estado para login normal
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Estado para login con código
  const [accessCode, setAccessCode] = useState('');
  const [userType, setUserType] = useState<string>(USER_ROLES.ADVISOR);
  
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const { signIn, signInWithCode } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const from = (location.state as any)?.from?.pathname || '/dashboard';
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    
    try {
      if (loginMode === 'admin') {
        // Login como admin (mantiene la funcionalidad anterior)
        const { data, error: loginError } = await signIn(email, password);
        
        if (loginError) {
          setError('Credenciales inválidas');
          setIsLoading(false);
          return;
        }
        
        if (data) {
          navigate(from, { replace: true });
        }
      } else {
        // Login con código de acceso
        if (!accessCode.trim()) {
          setError('Debe ingresar un código de acceso');
          setIsLoading(false);
          return;
        }
        
        const { data, error: loginError } = await signInWithCode(accessCode, userType);
        
        if (loginError) {
          setError(loginError);
          setIsLoading(false);
          return;
        }
        
        if (data) {
          navigate(from, { replace: true });
        }
      }
    } catch (err) {
      setError('Error al iniciar sesión');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200">
      <div className="card flex-shrink-0 w-full max-w-sm shadow-2xl bg-base-100">
        <div className="card-body">
          <div className="text-center mb-4">
            <h1 className="text-4xl font-bold text-primary">Fincentiva</h1>
            <p className="text-sm opacity-70 mt-1">CRM</p>
          </div>
          
          <div className="tabs tabs-boxed mb-4">
            <a 
              className={`tab ${loginMode === 'code' ? 'tab-active' : ''}`}
              onClick={() => setLoginMode('code')}
            >
              Código de Acceso
            </a>
            <a 
              className={`tab ${loginMode === 'admin' ? 'tab-active' : ''}`}
              onClick={() => setLoginMode('admin')}
            >
              Administrador
            </a>
          </div>
          
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="alert alert-error mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span>{error}</span>
              </div>
            )}
            
            {loginMode === 'admin' ? (
              // Formulario de admin
              <>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Correo electrónico</span>
                  </label>
                  <input
                    type="email"
                    placeholder="correo@ejemplo.com"
                    className="input input-bordered"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Contraseña</span>
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="input input-bordered"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </>
            ) : (
              // Formulario de código de acceso
              <>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Tipo de Usuario</span>
                  </label>
                  <select 
                    className="select select-bordered w-full" 
                    value={userType}
                    onChange={(e) => setUserType(e.target.value)}
                  >
                    <option value={USER_ROLES.ADVISOR}>{ROLE_LABELS[USER_ROLES.ADVISOR]}</option>
                    <option value={USER_ROLES.COMPANY_ADMIN}>{ROLE_LABELS[USER_ROLES.COMPANY_ADMIN]}</option>
                  </select>
                </div>
                
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Código de Acceso</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ingrese su código de acceso"
                    className="input input-bordered"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    required
                  />
                </div>
              </>
            )}
            
            <div className="form-control mt-6">
              <ActionButton 
                type="submit" 
                variant="primary" 
                isLoading={isLoading}
                className="w-full"
              >
                Iniciar Sesión
              </ActionButton>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login; 