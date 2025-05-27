import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const HealthCheck: React.FC = () => {
  const [supabaseConnected, setSupabaseConnected] = useState<boolean | null>(null);
  const [mcpConnected, setMcpConnected] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);
  const [retries, setRetries] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [errorDetails, setErrorDetails] = useState<{
    supabase?: string;
    mcp?: string;
  }>({});

  const checkSupabaseConnection = async () => {
    try {
      // Intentionally use a simple query that doesn't require special permissions
      const { data, error } = await supabase.from('users').select('count', { count: 'exact', head: true });
      console.log('Supabase connection check:', { data, error });
      setSupabaseConnected(!error);
      if (error) {
        setErrorDetails(prev => ({ ...prev, supabase: error.message }));
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error('Supabase connection error:', e);
      setSupabaseConnected(false);
      setErrorDetails(prev => ({ ...prev, supabase: errorMessage }));
    }
  };

  const checkMcpConnection = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // Increased timeout to 10 seconds
      
      console.log('Checking MCP connection at http://localhost:3100/health');
      const response = await fetch('http://localhost:3100/health', {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const responseText = await response.text();
        console.error('MCP server responded with error:', response.status, responseText);
        setMcpConnected(false);
        setErrorDetails(prev => ({ 
          ...prev, 
          mcp: `Status ${response.status}: ${responseText.substring(0, 100)}${responseText.length > 100 ? '...' : ''}` 
        }));
        return;
      }
      
      const responseData = await response.json();
      console.log('MCP server response:', responseData);
      
      setMcpConnected(true);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.warn('MCP server connection error:', e);
      setMcpConnected(false);
      setErrorDetails(prev => ({ ...prev, mcp: errorMessage }));
    }
  };

  const handleDismiss = () => {
    console.log('🔕 HealthCheck notification dismissed by user');
    setDismissed(true);
    
    // Store in both session and local storage for better persistence
    try {
      sessionStorage.setItem('healthcheck_dismissed', 'true');
      localStorage.setItem('healthcheck_dismissed', 'true');
      
      // Also store a timestamp to potentially auto-reset after some time
      const timestamp = Date.now().toString();
      sessionStorage.setItem('healthcheck_dismissed_at', timestamp);
      localStorage.setItem('healthcheck_dismissed_at', timestamp);
      
      console.log('✅ HealthCheck dismiss state saved to storage');
    } catch (e) {
      console.error('❌ Could not save dismiss state to storage', e);
    }
  };

  const handleRetryManually = () => {
    console.log('🔄 Manual retry requested by user');
    setRetries(0);
    setChecking(true);
    setSupabaseConnected(null);
    setMcpConnected(null);
    setErrorDetails({});
    
    // Run checks immediately
    Promise.all([
      checkSupabaseConnection(),
      checkMcpConnection()
    ]).then(() => {
      setChecking(false);
    });
  };

  useEffect(() => {
    // Check if previously dismissed in either session or local storage
    try {
      const sessionDismissed = sessionStorage.getItem('healthcheck_dismissed') === 'true';
      const localDismissed = localStorage.getItem('healthcheck_dismissed') === 'true';
      
      if (sessionDismissed || localDismissed) {
        console.log('🔕 HealthCheck was previously dismissed, hiding notification');
        setDismissed(true);
        return; // Don't run checks if dismissed
      }
    } catch (e) {
      console.error('❌ Could not read dismiss state from storage', e);
    }

    // Add global function to reset dismissed state (for debugging)
    (window as any).resetHealthCheckDismissed = () => {
      try {
        sessionStorage.removeItem('healthcheck_dismissed');
        sessionStorage.removeItem('healthcheck_dismissed_at');
        localStorage.removeItem('healthcheck_dismissed');
        localStorage.removeItem('healthcheck_dismissed_at');
        setDismissed(false);
        console.log('✅ HealthCheck dismiss state cleared. Notification will show again.');
      } catch (e) {
        console.error('❌ Could not clear dismiss state', e);
      }
    };

    const runChecks = async () => {
      setChecking(true);
      await Promise.all([
        checkSupabaseConnection(),
        checkMcpConnection()
      ]);
      setChecking(false);
    };

    // Only run initial checks
    runChecks();
  }, []); // FIXED: Remove problematic dependencies that were causing infinite loop

  // Separate useEffect for retry logic
  useEffect(() => {
    if (dismissed) return; // Don't retry if dismissed
    
    let interval: NodeJS.Timeout;
    
    // Only set up retry interval if there are connection issues and we haven't exceeded retry limit
    if ((!supabaseConnected || !mcpConnected) && retries < 5) {
      console.log(`Setting up retry interval (attempt ${retries + 1}/5)...`);
      
      interval = setTimeout(() => {
        console.log(`Retrying connections (attempt ${retries + 1}/5)...`);
        
        const runRetryChecks = async () => {
          setChecking(true);
          await Promise.all([
            checkSupabaseConnection(),
            checkMcpConnection()
          ]);
          setChecking(false);
          setRetries(prev => prev + 1);
        };
        
        runRetryChecks();
      }, Math.min(5000 + retries * 5000, 30000)); // Start at 5s, max 30s
    }

    return () => {
      if (interval) {
        clearTimeout(interval);
      }
    };
  }, [supabaseConnected, mcpConnected, retries, dismissed]); // Keep these dependencies for retry logic only

  // DISABLE IN PRODUCTION - No mostrar notificaciones molestas en producción
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  if (checking && retries === 0) {
    return null; // Don't show on first check
  }

  if (supabaseConnected && mcpConnected) {
    return null; // All connections are good
  }

  if (dismissed) {
    return null; // User has dismissed the notification
  }

  return (
    <div className="fixed bottom-4 right-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-lg z-50 max-w-md">
      <div className="flex">
        <div className="py-1"><svg className="fill-current h-6 w-6 text-red-500 mr-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M2.93 17.07A10 10 0 1 1 17.07 2.93 10 10 0 0 1 2.93 17.07zm12.73-1.41A8 8 0 1 0 4.34 4.34a8 8 0 0 0 11.32 11.32zM9 11V9h2v6H9v-4zm0-6h2v2H9V5z"/></svg></div>
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <p className="font-bold">Problemas de conectividad detectados</p>
            <button 
              onClick={handleDismiss}
              className="ml-2 p-2 text-red-700 hover:text-red-900 hover:bg-red-200 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors bg-red-50 border border-red-300"
              aria-label="Cerrar notificación"
              title="Cerrar notificación permanentemente"
            >
              <svg className="h-6 w-6 font-bold" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          <ul className="mt-2 list-disc list-inside text-sm">
            {supabaseConnected === false && (
              <li className="mb-2">
                No se pudo conectar a Supabase. Verifica tu conexión a internet.
                {errorDetails.supabase && (
                  <div className="mt-1 pl-5 text-xs font-mono bg-red-50 p-1 rounded">Error: {errorDetails.supabase}</div>
                )}
              </li>
            )}
            {mcpConnected === false && (
              <li className="mb-2">
                No se pudo conectar al servidor MCP en el puerto 3100. 
                <div className="mt-1 mb-1">Ejecuta uno de estos comandos:</div>
                <div className="bg-red-50 p-2 rounded text-xs font-mono mb-2 overflow-x-auto">
                  <div className="mb-1">npm run mcp</div>
                  <div>npx -y @supabase/mcp-server-supabase@latest --access-token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkbnlnbnRma3JsZWlzZXVjaXdxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTk5MjQwNiwiZXhwIjoyMDU1NTY4NDA2fQ.TwhEGW9DK4DTQQRquT6Z9UW8T8UjLX-hp9uKdRjWAhs</div>
                </div>
                {errorDetails.mcp && (
                  <div className="mt-1 pl-5 text-xs font-mono bg-red-50 p-1 rounded">Error: {errorDetails.mcp}</div>
                )}
              </li>
            )}
            <li className="mt-2 flex items-center justify-between">
              <span>Intentando reconectar... ({retries} intentos)</span>
              <div className="flex gap-2">
                <button 
                  onClick={handleRetryManually}
                  className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                  disabled={checking}
                >
                  {checking ? 'Verificando...' : 'Reintentar'}
                </button>
                <button 
                  onClick={handleDismiss}
                  className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors font-bold"
                  title="Cerrar notificación permanentemente"
                >
                  ✕ Cerrar
                </button>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default HealthCheck; 