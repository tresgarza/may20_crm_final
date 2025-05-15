import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ActionButton from './ui/ActionButton';
import { checkClientExistsById, createMissingClient, getClientFromAnySource, getClientWithSync, getCanonicalClientId } from '../services/clientService';

interface ClientProfileButtonProps {
  clientId: string;
  clientName?: string;
  applicationId?: string;
  className?: string;
  useSync?: boolean;
}

/**
 * Button component that navigates to a client profile, with automatic client creation if needed
 */
const ClientProfileButton: React.FC<ClientProfileButtonProps> = ({ 
  clientId, 
  clientName,
  applicationId,
  className = '',
  useSync = false
}) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientExists, setClientExists] = useState<boolean | null>(null);
  const [clientData, setClientData] = useState<any | null>(null);

  // Try to get client data when the component mounts
  useEffect(() => {
    if (!clientId) {
      setError('No client ID provided');
      setClientExists(false);
      return;
    }

    let isMounted = true;
    const checkClient = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log(`[ClientProfileButton] Fetching client data: ${clientId}`);
        let client;
        if (useSync) {
          // Use robust sync-aware function
          client = await getClientWithSync(clientId);
        } else {
          client = await getClientFromAnySource(clientId);
        }
        if (isMounted) {
          if (client) {
            setClientData(client);
            setClientExists(true);
            console.log(`[ClientProfileButton] Client ${clientId} found`);
          } else {
            setClientExists(false);
            console.log(`[ClientProfileButton] Client ${clientId} not found, will create on click`);
          }
        }
      } catch (err) {
        console.error(`[ClientProfileButton] Error checking client: ${err}`);
        if (isMounted) {
          setError('Failed to check client status');
          setClientExists(false);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    checkClient();
    return () => { isMounted = false; };
  }, [clientId, useSync, clientName]);

  const handleClick = async () => {
    if (!clientId) {
      console.error('[ClientProfileButton] Cannot navigate: No client ID');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get the canonical client ID first - this will resolve the correct ID to use
      const canonicalClientId = await getCanonicalClientId(clientId);
      console.log(`[ClientProfileButton] Resolved canonical ID: ${clientId} -> ${canonicalClientId}`);
      
      // If canonical ID is different, use that instead of the original clientId
      const idToUse = canonicalClientId || clientId;

      if (useSync) {
        // Use robust sync-aware function for navigation
        const syncedClient = await getClientWithSync(idToUse);
        if (!syncedClient) {
          setError('Unable to create or find client profile');
          setLoading(false);
          return;
        }
        navigate(`/clients/${idToUse}`, { 
          state: { 
            fromApplication: applicationId ? true : false,
            applicationId,
            autoCreated: false
          } 
        });
        setLoading(false);
        return;
      }

      // Only create client if it doesn't exist (legacy path)
      if (clientExists === false) {
        console.log(`[ClientProfileButton] Creating missing client: ${idToUse}`);
        const createdClient = await createMissingClient(idToUse, clientName);
        if (!createdClient) {
          setError('Unable to create client profile');
          setLoading(false);
          return;
        }
        console.log(`[ClientProfileButton] Successfully created client: ${createdClient.id}`);
      }

      // Navigate using the canonical ID if we found one
      navigate(`/clients/${idToUse}`, { 
        state: { 
          fromApplication: applicationId ? true : false,
          applicationId,
          autoCreated: clientExists === false,
          // Pass original clientId for reference if it was mapped
          originalClientId: canonicalClientId !== clientId ? clientId : undefined
        } 
      });
    } catch (err) {
      console.error(`[ClientProfileButton] Error navigating to client: ${err}`);
      setError('Failed to navigate to client profile');
      setLoading(false);
    }
  };

  // Determine button text based on client existence
  const getButtonText = () => {
    if (loading) return 'Checking...';
    if (error) return 'Error';
    if (clientExists === false) return 'Create & View Client';
    return 'View Client Profile';
  };

  return (
    <div className={`relative ${className}`}>
      <ActionButton
        variant={error ? 'error' : 'primary'}
        isLoading={loading}
        isDisabled={loading}
        onClick={handleClick}
        className="w-full"
      >
        {getButtonText()}
      </ActionButton>
      {error && (
        <div className="text-red-500 text-xs mt-1">
          {error}
        </div>
      )}
    </div>
  );
};

export default ClientProfileButton; 