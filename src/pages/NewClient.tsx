import React, { useState, useContext, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import MainLayout from '../components/layout/MainLayout';
import ClientForm from '../components/clients/ClientForm';
import { Client, ClientDocument, createClient, updateClient, uploadClientDocuments } from '../services/clientService';
import Alert from '../components/ui/Alert';

// Default company ID (Herramental)
const DEFAULT_COMPANY_ID = "70b2aa97-a5b6-4b5e-91db-be8acbd3701a";

const NewClient: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [sectionSubmitting, setSectionSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [draftClient, setDraftClient] = useState<Partial<Client> | null>(null);
  const [temporaryClientId, setTemporaryClientId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const location = useLocation();

  // Cargar datos del cliente en borrador si existen en localStorage al iniciar
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem('draftClient');
      const savedClientId = localStorage.getItem('temporaryClientId');
      const savedDocuments = localStorage.getItem('temporaryDocuments');
      
      if (savedDraft) {
        console.log('Recuperando datos del cliente del localStorage:', savedDraft);
        setDraftClient(JSON.parse(savedDraft));
      }
      
      if (savedClientId) {
        console.log('Recuperando ID de cliente temporal:', savedClientId);
        setTemporaryClientId(savedClientId);
      }
      
      if (savedDocuments) {
        console.log('Recuperando documentos temporales del localStorage');
        // No podemos guardar los objetos File directamente en localStorage, 
        // así que los documentos se gestionan en memoria hasta el envío final
      }
    } catch (e) {
      console.error('Error loading draft from localStorage:', e);
    }
  }, []);

  const handleSubmit = async (data: Partial<Client>, clientDocuments: ClientDocument[]) => {
    setIsSubmitting(true);
    setError(null);
    console.log('Submitting client data:', data);
    
    try {
      // Si el usuario es asesor o admin de empresa, asignar los IDs correspondientes
      const clientData: Partial<Client> = { ...data };
      
      // Handle advisor_id assignment
      if (user && user.role === 'ADVISOR') {
        clientData.advisor_id = user.id;
      }
      
      // Handle the company_id requirement - only set default if not selected in form
      if (!clientData.company_id) {
        console.log('No company selected in form, applying default/user company logic');
        
        if (user) {
          if (user.role === 'COMPANY_ADMIN') {
            clientData.company_id = user.entityId;
            console.log('Using company_id from COMPANY_ADMIN user:', clientData.company_id);
          } else {
            // For other roles without company selection, use default
            clientData.company_id = DEFAULT_COMPANY_ID;
            console.log('Using default company_id for user with role:', user.role);
          }
        } else {
          // No user information available, use default company_id
          clientData.company_id = DEFAULT_COMPANY_ID;
          console.log('No user context, using default company_id');
        }
      } else {
        console.log('Using company_id selected in form:', clientData.company_id);
      }
      
      // Si ya tenemos un cliente temporal, actualizar en vez de crear
      let newClient;
      if (temporaryClientId) {
        console.log(`Updating temporary client with ID ${temporaryClientId}`);
        newClient = await updateClient(temporaryClientId, clientData, clientDocuments, user?.id);
        console.log('Client updated successfully:', newClient);
      } else {
        // Crear nuevo cliente
        console.log('Creando nuevo cliente sin ID temporal');
        newClient = await createClient(clientData as Omit<Client, 'id' | 'created_at'>, clientDocuments, user?.id);
        console.log('Client created successfully:', newClient);
      }
      
      // Check if there's a warning message (e.g., some documents failed to upload)
      if (newClient.warningMessage) {
        setSuccessMessage(newClient.warningMessage);
        setIsSubmitting(false);
        // No limpiamos localStorage ni navegamos para que el usuario pueda intentar subir documentos nuevamente
        return;
      }
      
      console.log('Client created/updated successfully:', newClient);
      
      // Clear local storage
      localStorage.removeItem('draftClient');
      localStorage.removeItem('clientFormStep');
      localStorage.removeItem('temporaryClientId');
      localStorage.removeItem('temporaryDocuments');
      
      // Redireccionar a la lista de clientes
      navigate('/clients');
    } catch (error: any) {
      console.error('Error al crear cliente:', error);
      setError(error.message || 'Error al crear el cliente. Por favor, intente de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSavePartial = async (data: Partial<Client>, step: number) => {
    try {
      setSectionSubmitting(true);
      setError(null); // Limpiar errores anteriores
      console.log(`Saving partial data for step ${step}:`, data);
      
      // Asegurarnos de que tenemos todos los campos requeridos
      const partialData = collectFieldsForStep(data, step);
      
      // Asignar campos importantes si no están presentes
      if (user && user.role === 'ADVISOR' && !partialData.advisor_id) {
        partialData.advisor_id = user.id;
      }
      
      if (!partialData.company_id) {
        if (user && user.role === 'COMPANY_ADMIN') {
          partialData.company_id = user.entityId;
        } else {
          partialData.company_id = DEFAULT_COMPANY_ID;
        }
      }
      
      // Update our local draft client data
      const updatedDraftClient = { ...draftClient, ...partialData };
      setDraftClient(updatedDraftClient);
      
      // Guardar los datos en Supabase
      try {
        // Si ya tenemos un ID de cliente temporal, actualizar
        if (temporaryClientId) {
          console.log(`Updating temporary client with ID ${temporaryClientId}`);
          const updatedClient = await updateClient(temporaryClientId, partialData);
          console.log('Client updated successfully:', updatedClient);
          
          if (!updatedClient) {
            throw new Error('No se recibió respuesta después de la actualización');
          }
          
          // Check if there's a warning message
          if (updatedClient.warningMessage) {
            setSuccessMessage(updatedClient.warningMessage);
          } else {
            setSuccessMessage(`Los datos de la sección ${step} se han guardado correctamente.`);
          }
          
          // Clear success message after 3 seconds
          setTimeout(() => {
            setSuccessMessage(null);
          }, 3000);
        } 
        // Si es la primera vez que guardamos, crear un cliente temporal
        else if (step === 1) {
          console.log('Creating temporary client');
          
          // Nos aseguramos de tener al menos nombre y apellido para el cliente temporal
          if (!partialData.first_name || !partialData.paternal_surname) {
            setError('Debe proporcionar al menos nombre y apellido paterno para guardar.');
            setSectionSubmitting(false);
            return null;
          }
          
          const newClient = await createClient(partialData as Omit<Client, 'id' | 'created_at'>, [], user?.id);
          console.log('Temporary client created successfully:', newClient);
          
          if (newClient && newClient.id) {
            setTemporaryClientId(newClient.id);
            localStorage.setItem('temporaryClientId', newClient.id);
          } else {
            throw new Error('No se recibió un ID de cliente después de la creación');
          }
        } else {
          console.log('No se puede guardar en Supabase sin haber completado el paso 1 primero');
          // En este caso, solo guardamos en localStorage
        }
        
        // Save to local storage for persistence
        localStorage.setItem('draftClient', JSON.stringify(updatedDraftClient));
        
        return updatedDraftClient;
      } catch (e: any) {
        console.error('Error saving to Supabase:', e);
        
        // Log more details about the error
        if (e.message) console.error('Error message:', e.message);
        if (e.cause) console.error('Error cause:', e.cause);
        if (e.stack) console.error('Error stack:', e.stack);
        
        // Try to get more information if it's a Supabase error
        if (e.code || e.details || e.hint) {
          console.error('Supabase error details:', {
            code: e.code,
            details: e.details,
            hint: e.hint
          });
        }
        
        setError(`Error al guardar los datos en el servidor: ${e.message || 'Error desconocido'}`);
        
        // Aún así actualizamos localStorage
        try {
          localStorage.setItem('draftClient', JSON.stringify(updatedDraftClient));
        } catch (storageError) {
          console.error('Error saving to localStorage:', storageError);
        }
        
        return null;
      }
    } catch (error: any) {
      console.error('Error saving partial data:', error);
      setError('Error al guardar los datos parciales.');
      return null;
    } finally {
      setSectionSubmitting(false);
    }
  };
  
  // Helper to ensure we have all required fields
  const ensureRequiredFields = (clientData: Partial<Client>) => {
    // Handle advisor_id assignment
    if (user && user.role === 'ADVISOR') {
      clientData.advisor_id = user.id;
    }
    
    // Handle the company_id requirement - only set default if not selected in form
    if (!clientData.company_id) {
      console.log('🔍 No se seleccionó empresa en el formulario, aplicando lógica predeterminada');
      
      if (user) {
        if (user.role === 'COMPANY_ADMIN') {
          clientData.company_id = user.entityId;
          console.log('🔍 Usando company_id del usuario COMPANY_ADMIN:', clientData.company_id);
        } else {
          // For other roles without company selection, use default
          clientData.company_id = DEFAULT_COMPANY_ID;
          console.log('🔍 Usando company_id predeterminado para usuario con rol:', user.role);
        }
      } else {
        // No user information available, use default company_id
        clientData.company_id = DEFAULT_COMPANY_ID;
        console.log('🔍 Sin contexto de usuario, usando company_id predeterminado');
      }
    } else {
      console.log('🔍 Usando company_id seleccionado en el formulario:', clientData.company_id);
    }
  };
  
  // Helper to collect fields based on step
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
          'city', 'state', 'postal_code',
          // NEW personal/contact fields
          'spouse_paternal_surname', 'spouse_maternal_surname',
          'birth_state', 'nationality',
          'street_number_ext', 'street_number_int', 'neighborhood', 'home_phone',
          'dependent_persons'
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
          'additional_income', 'monthly_expenses', 'other_loan_balances',
          // NEW financial/employment fields
          'job_position',
          'employer_name', 'employer_phone', 'employer_address', 'employer_activity',
          'mortgage_payment', 'rent_payment',
          'income_frequency', 'payment_method', 'credit_purpose'
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
          'bank_account_type', 'bank_account_origin',
          // References
          'reference1_name', 'reference1_relationship', 'reference1_address', 'reference1_phone',
          'reference2_name', 'reference2_relationship', 'reference2_address', 'reference2_phone'
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
          <h1 className="text-2xl font-bold">Nuevo Cliente</h1>
        </div>
        
        {/* Display error message */}
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
        
        {/* Display success message */}
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
        
        {temporaryClientId && (
          <div className="mb-4">
            <div className="alert alert-info">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Cliente guardado como borrador. Complete y envíe el formulario para finalizar.</span>
            </div>
          </div>
        )}
        
        <ClientForm 
          initialData={draftClient || undefined}
          onSubmit={handleSubmit}
          onSavePartial={handleSavePartial}
          isSubmitting={isSubmitting}
        />
      </div>
    </MainLayout>
  );
};

export default NewClient; 