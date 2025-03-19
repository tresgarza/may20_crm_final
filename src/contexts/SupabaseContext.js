const React = require('react');
const { createContext, useContext, useState, useEffect } = React;
const { supabase } = require('../utils/supabase');
const db = require('../utils/database');

// Create a context for Supabase
const SupabaseContext = createContext(null);

// Hook to use the Supabase context
const useSupabase = () => useContext(SupabaseContext);

// Supabase Provider component
const SupabaseProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Test database connection on component mount
  useEffect(() => {
    const testConnection = async () => {
      try {
        setLoading(true);
        const connected = await db.testConnection();
        setIsConnected(connected);
        if (!connected) {
          setError('Failed to connect to Supabase');
        }
      } catch (err) {
        console.error('Error connecting to Supabase:', err);
        setError(err.message);
        setIsConnected(false);
      } finally {
        setLoading(false);
      }
    };

    testConnection();
  }, []);

  // Value to be provided by the context
  const value = {
    supabase,
    db,
    isConnected,
    loading,
    error
  };

  return (
    <SupabaseContext.Provider value={value}>
      {children}
    </SupabaseContext.Provider>
  );
};

module.exports = {
  SupabaseContext,
  SupabaseProvider,
  useSupabase
}; 