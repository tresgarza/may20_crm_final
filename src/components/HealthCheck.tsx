import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const HealthCheck: React.FC = () => {
  const [supabaseConnected, setSupabaseConnected] = useState<boolean | null>(null);
  const [mcpConnected, setMcpConnected] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);
  const [retries, setRetries] = useState(0);
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

  useEffect(() => {
    const runChecks = async () => {
      setChecking(true);
      await Promise.all([
        checkSupabaseConnection(),
        checkMcpConnection()
      ]);
      setChecking(false);
    };

    runChecks();

    // Retry if not connected, with exponential backoff
    const interval = setInterval(() => {
      if ((!supabaseConnected || !mcpConnected) && retries < 5) {
        console.log(`Retrying connections (attempt ${retries + 1}/5)...`);
        runChecks();
        setRetries(prev => prev + 1);
      } else {
        clearInterval(interval);
      }
    }, Math.min(5000 + retries * 5000, 30000)); // Start at 5s, max 30s

    return () => clearInterval(interval);
  }, [supabaseConnected, mcpConnected, retries]);

  if (checking && retries === 0) {
    return null; // Don't show on first check
  }

  if (supabaseConnected && mcpConnected) {
    return null; // All connections are good
  }

  return (
    <div className="fixed bottom-4 right-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-lg z-50 max-w-md">
      <div className="flex">
        <div className="py-1"><svg className="fill-current h-6 w-6 text-red-500 mr-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M2.93 17.07A10 10 0 1 1 17.07 2.93 10 10 0 0 1 2.93 17.07zm12.73-1.41A8 8 0 1 0 4.34 4.34a8 8 0 0 0 11.32 11.32zM9 11V9h2v6H9v-4zm0-6h2v2H9V5z"/></svg></div>
        <div className="flex-1">
          <p className="font-bold">Problemas de conectividad detectados</p>
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
            <li className="mt-2">
              Intentando reconectar... ({retries} intentos)
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default HealthCheck; 