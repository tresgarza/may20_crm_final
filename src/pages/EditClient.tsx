import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import MainLayout from '../components/layout/MainLayout';
import ClientForm from '../components/clients/ClientForm';
import { Client, ClientDocument, getClientById, updateClient, uploadClientDocuments } from '../services/clientService';
import { getClientDocuments, Document } from '../services/documentService';
import Alert from '../components/ui/Alert';

// Interface for documents that have been stored (don't have file object)
interface StoredDocument {
  id: string;
  name: string;
  category: string;
  url?: string;
  // No file property since these are already stored
}

// Default company ID (Herramental)
const DEFAULT_COMPANY_ID = "70b2aa97-a5b6-4b5e-91db-be8acbd3701a";

const EditClient: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [client, setClient] = useState<Client | null>(null);
  const [existingDocuments, setExistingDocuments] = useState<StoredDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDocuments, setLoadingDocuments] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchClientData(id);
      fetchClientDocuments(id);
    }
  }, [id]);

  const fetchClientData = async (clientId: string) => {
    try {
      setLoading(true);
      console.log(`Fetching client data for ID ${clientId}`);
      const clientData = await getClientById(clientId);
      
      if (clientData) {
        console.log('Client data retrieved successfully:', clientData);
        setClient(clientData);
      } else {
        setError('No se encontró el cliente especificado.');
      }
    } catch (err) {
      console.error('Error al obtener datos del cliente:', err);
      setError('Error al cargar los datos del cliente. Por favor, intente de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const fetchClientDocuments = async (clientId: string) => {
    try {
      setLoadingDocuments(true);
      console.log(`Fetching documents for client ${clientId}`);
      const documentsData = await getClientDocuments(clientId);
      console.log('Documents retrieved:', documentsData);
      
      // Convert server documents to StoredDocument format
      const storedDocuments: StoredDocument[] = documentsData.map(doc => ({
        id: doc.id,
        name: doc.file_name || '',
        category: doc.category || '',
        url: doc.file_path
      }));
      
      setExistingDocuments(storedDocuments);
    } catch (err) {
      console.error('Error fetching client documents:', err);
      // Don't show error to user - just log it
    } finally {
      setLoadingDocuments(false);
    }
  };

  const handleSubmit = async (data: Partial<Client>, uploadDocuments: ClientDocument[]) => {
    if (!id) return;
    
    try {
      setIsSubmitting(true);
      setError(null); // Clear any previous errors
      setSuccessMessage(null); // Clear any previous success message
      
      // First save the client data with documents
      console.log('Updating client data with documents...', data);
      console.log('Documents to upload:', uploadDocuments.length);
      const updatedClient = await updateClient(id, data, uploadDocuments, user?.id);
      console.log('Client data successfully updated', updatedClient);
      
      // Check if there's a warning message (e.g., some documents failed to upload)
      if (updatedClient.warningMessage) {
        setSuccessMessage(updatedClient.warningMessage);
        // Don't navigate away when there's a warning about documents
        return;
      }
      
      // Successfully updated
      console.log('Client update complete');
      navigate('/clients');
    } catch (error: any) {
      console.error('Error al actualizar cliente:', error);
      
      // Specific message for RLS policy violations
      if (error.message && (
        error.message.includes('políticas de seguridad RLS') ||
        error.message.includes('permisos') ||
        error.message.includes('Unauthorized') ||
        error.message.includes('No tienes permisos')
      )) {
        setError(`Error de permisos: ${error.message}. Contacte al administrador para verificar las políticas de seguridad de la base de datos.`);
      } else if (error.message && error.message.includes('actualización no tuvo efecto')) {
        // For when update has no effect due to RLS or unchanged data
        setError(`${error.message} Contacte al administrador para verificar si tiene los permisos necesarios.`);
      } else {
        // Generic error
      setError(error.message || 'Error al guardar los cambios. Por favor, intente de nuevo.');
      }
      
      // Scroll to top to show the error message
      window.scrollTo(0, 0);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle partial save
  const handleSavePartial = async (data: Partial<Client>, step: number) => {
    try {
      // Log the saving attempt
      console.log(`🔍 Guardando datos parciales del cliente en paso ${step}...`);
      console.log('🔍 Datos a guardar:', data);
      
      // Show saving indicator
      setIsSubmitting(true);
      setError(null); // Clear any previous errors
      
      if (!client || !client.id) {
        throw new Error('No se encontró el ID del cliente para actualización parcial');
      }
      
      // Asegurarnos de que siempre incluimos el ID del cliente
      const partialData: Partial<Client> = {
        id: client.id, // Siempre incluir el ID para asegurar la actualización correcta
        ...collectFieldsForStep(data, step)
      };
      
      // Asegurarnos de que tenemos campos importantes como company_id
      if (!partialData.company_id && client.company_id) {
        partialData.company_id = client.company_id;
      }
      
      // Asegurarnos de que tenemos advisor_id
      if (!partialData.advisor_id && client.advisor_id) {
        partialData.advisor_id = client.advisor_id;
      }
      
      console.log('🔍 Datos finales a enviar a Supabase:', partialData);
      
      try {
        // Update client with partial data
        const updatedClient = await updateClient(client.id, partialData);
        console.log(`🔍 Actualización exitosa para sección ${step}:`, updatedClient);
        
        if (!updatedClient) {
          throw new Error('No se recibió respuesta después de la actualización');
        }
        
        // Create a complete merged client object with ALL data
        // This ensures all fields are available in subsequent steps
        const mergedClient = {
          ...client,                 // Start with original data
          ...partialData,            // Apply our partial changes 
          ...updatedClient           // Apply any additional fields returned from the update
        };
        
        // Update local state with the merged client data
        setClient(mergedClient as Client);
        console.log('🔍 Cliente actualizado en estado local:', mergedClient);
        
        // Show success message (including any warnings)
        if (updatedClient.warningMessage) {
          setSuccessMessage(updatedClient.warningMessage);
        } else {
          setSuccessMessage(`Se guardaron los datos de la sección ${step} correctamente`);
        }
        
        // Clear message after delay
        setTimeout(() => {
          setSuccessMessage(null);
        }, 3000);
        
        // Return the complete merged client data to the form
        // This ensures we always have all client data in the form regardless of step
        console.log('🔍 Datos completos a devolver al formulario:', mergedClient);
        
        // For debugging, log all the fields we expect to see in the next step
        if (step === 1 && mergedClient) {
          console.log('🔍 Verificando campos financieros para el paso 2:');
          console.log('employment_type:', mergedClient.employment_type);
          console.log('employment_years:', mergedClient.employment_years);
          console.log('monthly_income:', mergedClient.monthly_income);
          console.log('additional_income:', mergedClient.additional_income);
          console.log('monthly_expenses:', mergedClient.monthly_expenses);
          console.log('other_loan_balances:', mergedClient.other_loan_balances);
        } else if (step === 2 && mergedClient) {
          console.log('🔍 Verificando campos bancarios para el paso 3:');
          console.log('bank_name:', mergedClient.bank_name);
          console.log('bank_clabe:', mergedClient.bank_clabe);
          console.log('bank_account_number:', mergedClient.bank_account_number);
          console.log('bank_account_type:', mergedClient.bank_account_type);
          console.log('bank_account_origin:', mergedClient.bank_account_origin);
        }
        
        return mergedClient;
      } catch (err: any) {
        console.error(`🔍 Error al actualizar cliente en paso ${step}:`, err);
        
        // Log more details about the error
        if (err.message) console.error('Error message:', err.message);
        if (err.cause) console.error('Error cause:', err.cause);
        if (err.stack) console.error('Error stack:', err.stack);
        
        // Try to get more information if it's a Supabase error
        if (err.code || err.details || err.hint) {
          console.error('Supabase error details:', {
            code: err.code,
            details: err.details,
            hint: err.hint
          });
        }
        
        // Specific message for RLS policy violations
        if (err.message && (
          err.message.includes('políticas de seguridad RLS') ||
          err.message.includes('permisos') ||
          err.message.includes('Unauthorized') ||
          err.message.includes('No tienes permisos')
        )) {
          setError(`Error de permisos al guardar la sección ${step}: ${err.message}. 
            Contacte al administrador para verificar las políticas de seguridad de la base de datos.`);
        } else if (err.message && err.message.includes('actualización no tuvo efecto')) {
          // For when update has no effect due to RLS or unchanged data
          setError(`${err.message} Contacte al administrador para verificar si tiene los permisos necesarios.`);
        } else {
          // Generic error for other cases
        setError(`Error al guardar la sección ${step}: ${err.message || 'Error desconocido'}`);
        }
        
        throw err;
      }
    } catch (error: any) {
      console.error(`🔍 Error en handleSavePartial en paso ${step}:`, error);
      
      // Don't override more specific error messages - this is a fallback
      if (!document.getElementById('error-message')) {
      setError(error.message || `Error al guardar la sección ${step}. Por favor, intente nuevamente.`);
      }
      
      // Mostrar el error por 6 segundos antes de limpiarlo automáticamente
      setTimeout(() => {
        if (error.message === setError) { // Solo limpiar si es el mismo error
          setError(null);
        }
      }, 6000);
      
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Helper function to collect fields based on step
  const collectFieldsForStep = (data: Partial<Client>, step: number): Partial<Client> => {
    const result: Partial<Client> = {};
    
    // Always preserve these fields if they exist
    if (data.id) result.id = data.id;
    if (data.company_id) result.company_id = data.company_id;
    if (data.advisor_id) result.advisor_id = data.advisor_id;
    
    switch(step) {
      case 1: // Personal data
        const personalFields = [
          'first_name', 'paternal_surname', 'maternal_surname', 'email', 'phone',
          'rfc', 'curp', 'birth_date', 'gender', 'marital_status', 'address',
          'city', 'state', 'postal_code'
        ];
        personalFields.forEach(field => {
          if (field in data) {
            (result as any)[field] = (data as any)[field];
          }
        });
        break;
        
      case 2: // Financial details
        const financialFields = [
          'employment_type', 'employment_years', 'monthly_income',
          'additional_income', 'monthly_expenses', 'other_loan_balances'
        ];
        financialFields.forEach(field => {
          if (field in data) {
            (result as any)[field] = (data as any)[field];
          }
        });
        break;
        
      case 3: // Bank details
        const bankFields = [
          'bank_name', 'bank_clabe', 'bank_account_number',
          'bank_account_type', 'bank_account_origin'
        ];
        bankFields.forEach(field => {
          if (field in data) {
            (result as any)[field] = (data as any)[field];
          }
        });
        break;
        
      default:
        console.warn(`🔍 Paso desconocido para guardado parcial: ${step}`);
    }
    
    return result;
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="p-6 flex justify-center">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </MainLayout>
    );
  }

  if (error || !client) {
    return (
      <MainLayout>
        <div className="p-6">
          <div className="alert alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error || 'No se encontró el cliente solicitado.'}</span>
          </div>
          <div className="mt-4">
            <button 
              onClick={() => navigate('/clients')}
              className="btn btn-primary"
            >
              Volver a Clientes
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-6">
        <div className="flex items-center mb-6">
          <button 
            onClick={() => navigate('/clients')} 
            className="btn btn-sm btn-outline mr-4"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Volver
          </button>
          <h1 className="text-2xl font-bold">Editar Cliente</h1>
        </div>
        
        {/* Display error alert if there's an error */}
        {error && (
          <div className="mb-4">
            <div className="alert alert-error">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
              <button onClick={() => setError(null)} className="ml-auto">×</button>
            </div>
          </div>
        )}
        
        {/* Display success message if there's one */}
        {successMessage && (
          <div className="mb-4">
            <div className="alert alert-success">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{successMessage}</span>
              <button onClick={() => setSuccessMessage(null)} className="ml-auto">×</button>
            </div>
          </div>
        )}
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="loading loading-spinner loading-lg"></div>
          </div>
        ) : client ? (
          <ClientForm 
            initialData={client}
            onSubmit={handleSubmit}
            onSavePartial={handleSavePartial}
            existingDocuments={existingDocuments}
            isSubmitting={isSubmitting}
          />
        ) : (
          <div className="alert alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Cliente no encontrado</span>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default EditClient; 