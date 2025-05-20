import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { usePermissions } from '../contexts/PermissionsContext';
import { PERMISSIONS } from '../utils/constants/permissions';
import { useAuth } from '../contexts/AuthContext';
import Alert from '../components/ui/Alert';
import { 
  getApplicationById, 
  createApplication, 
  updateApplication, 
  Application as ApplicationType,
  ApplicationStatus
} from '../services/applicationService';
import { 
  APPLICATION_TYPE, 
  APPLICATION_TYPE_LABELS, 
  DEFAULT_TERM, 
  DEFAULT_INTEREST_RATE, 
  FINANCING_TYPE 
} from '../utils/constants/applications';
import { APPLICATION_STATUS, STATUS_LABELS } from '../utils/constants/statuses';
import { useNotifications, NotificationType } from '../contexts/NotificationContext';
import { getClientById, getClients, Client, ClientFilter } from '../services/clientService';
import { getCompanyById } from '../services/companyService';
import { calculateMonthlyPayment } from '../services/applicationService';
import { supabase } from '../lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid';

// Client search and selection interface
interface ClientSearchResult {
  id: string;
  name: string;
  email: string;
  phone: string;
  company_name?: string;
}

interface Company {
  id: string;
  name: string;
}

interface FormData {
  client_name: string;
  client_email: string;
  client_phone: string;
  client_address: string;
  dni: string;
  amount: number | undefined;
  term: number | undefined;
  interest_rate: number | undefined;
  monthly_payment: number | undefined;
  financing_type: 'producto' | 'personal';
  product_url: string;
  product_price: number | undefined;
  application_type: string;
  status: ApplicationStatus;
  company_id: string;
  company_name: string;
  assigned_to: string;
  client_id: string | undefined;
}

const initialFormData: FormData = {
  client_name: '',
  client_email: '',
  client_phone: '',
  client_address: '',
  dni: '',
  amount: undefined,
  term: DEFAULT_TERM,
  interest_rate: DEFAULT_INTEREST_RATE,
  monthly_payment: undefined,
  financing_type: 'personal',
  product_url: '',
  product_price: undefined,
  application_type: 'selected_plans', // Default is 'selected_plans' for 'personal' financing
  status: APPLICATION_STATUS.NEW,
  company_id: '',
  company_name: '',
  assigned_to: '',
  client_id: '',
};

const ApplicationForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userCan } = usePermissions();
  const { user } = useAuth();
  const { shouldFilterByEntity, getEntityFilter } = usePermissions();
  const { addNotification, showPopup } = useNotifications();
  const location = useLocation();
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  
  const isEditMode = !!id;
  
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Client search state
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<ClientSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showClientSearch, setShowClientSearch] = useState(false);
  const [clientSelected, setClientSelected] = useState(false);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  
  // Company filter state
  const [companies, setCompanies] = useState<{id: string, name: string}[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [companyClients, setCompanyClients] = useState<ClientSearchResult[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [loadingCompanyClients, setLoadingCompanyClients] = useState(false);
  
  // Debounce search term
  useEffect(() => {
    const timerId = setTimeout(() => {
      const trimmedTerm = searchTerm.trim();
      if (trimmedTerm && trimmedTerm !== debouncedSearchTerm) {
        setDebouncedSearchTerm(trimmedTerm);
      }
    }, 500);

    return () => clearTimeout(timerId);
  }, [searchTerm, debouncedSearchTerm]);

  // Trigger search when debounced term changes
  useEffect(() => {
    if (debouncedSearchTerm) {
      handleClientSearch(debouncedSearchTerm);
    }
  }, [debouncedSearchTerm]);
  
  useEffect(() => {
    if (isEditMode && id) {
      const fetchApplication = async () => {
        try {
          setLoading(true);
          setError(null);
          
          // Aplicar filtros según el rol del usuario
          const entityFilter = shouldFilterByEntity() ? getEntityFilter() : null;
          
          const application = await getApplicationById(id, entityFilter);
          
          // Cargar los datos del formulario con valores por defecto para campos opcionales
          setFormData({
            client_name: application.client_name || '',
            client_email: application.client_email || '',
            client_phone: application.client_phone || '',
            client_address: application.client_address || '',
            dni: application.dni || '',
            amount: application.amount || undefined,
            term: application.term || undefined,
            interest_rate: application.interest_rate || undefined,
            monthly_payment: application.monthly_payment || undefined,
            // Ensure the financing_type is properly cast as a union type
            financing_type: (application.financing_type === 'producto' ? 'producto' : 'personal') as 'producto' | 'personal',
            product_url: application.product_url || '',
            product_price: application.product_price || undefined,
            application_type: application.application_type || 'selected_plans',
            status: application.status,
            company_id: application.company_id || '',
            company_name: application.company_name || '',
            assigned_to: application.assigned_to || '',
            client_id: application.client_id || '',
          });
          
          // If we have a client_id, consider the client as selected
          if (application.client_id) {
            setClientSelected(true);
          }
        } catch (error: any) {
          console.error('Error fetching application:', error);
          setError(`Error al cargar la solicitud: ${error.message || 'Error desconocido'}`);
        } finally {
          setLoading(false);
        }
      };
      
      fetchApplication();
    } else if (!isEditMode && user) {
      // Si no estamos en modo edición y tenemos datos del usuario, pre-rellenar algunos campos
      const entityFilter = shouldFilterByEntity() ? getEntityFilter() : null;
      
      if (entityFilter) {
        if (entityFilter.advisor_id) {
          setFormData(prev => ({
            ...prev,
            assigned_to: entityFilter.advisor_id
          }));
        }
        
        if (entityFilter.company_id) {
          setFormData(prev => ({
            ...prev,
            company_id: entityFilter.company_id
          }));
        }
      }
      
      // Show client search by default if no client param in URL
      const params = new URLSearchParams(location.search);
      const clientIdParam = params.get('client');
      if (!clientIdParam) {
        setShowClientSearch(true);
      }
    }
  }, [id, isEditMode, user, shouldFilterByEntity, getEntityFilter, location.search]);
  
  // Detect client param from URL for auto-fill
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const clientIdParam = params.get('client');
    if (!isEditMode && clientIdParam) {
      (async () => {
        try {
          setLoading(true);
          // Fetch client
          const client = await getClientById(clientIdParam);
          if (client) {
            // Fetch company to get interest rate
            let companyInterest = 0;
            let companyName = '';
            let commissionRate = 0.05; // Default commission rate (5%)
            let ivaTax = 0.16; // Standard IVA rate in Mexico
            
            if (client.company_id) {
              const company = await getCompanyById(client.company_id);
              if (company) {
                companyInterest = company.interest_rate || 0;
                companyName = company.name || '';
                // Get commission rate from company if available
                commissionRate = company.commission_rate !== undefined ? company.commission_rate : 0.05;
                console.log(`Using company commission rate from URL param: ${commissionRate * 100}%`);
              }
            }

            // Auto-calculate monthly payment with default term and zero amount until entered
            const autoMonthly = 0; // Don't show any monthly payment until user enters values

            setFormData(prev => ({
              ...prev,
              client_name: client.name || '',
              client_email: client.email || '',
              client_phone: client.phone || '',
              client_address: client.address || '',
              company_id: client.company_id || '',
              company_name: companyName,
              assigned_to: client.advisor_id || prev.assigned_to,
              interest_rate: companyInterest,
              monthly_payment: undefined,
              client_id: client.id || '',
            }));
            setClientSelected(true);
            // Close client search panel
            setShowClientSearch(false);
          }
        } catch (error: any) {
          console.error('Error fetching client data:', error);
          setError(`Error al cargar los datos del cliente: ${error.message || 'Error desconocido'}`);
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [location.search, isEditMode]);
  
  // Auto-calculate monthly payment when amount, term or interest_rate change
  useEffect(() => {
    if (!isEditMode) {
      const { amount, term, interest_rate, company_id, financing_type } = formData;
      
      // Only calculate if we have valid numeric values
      if (amount !== undefined && term !== undefined && term > 0) {
        // Get the company data to retrieve the proper commission rate
        const fetchCompanyRates = async () => {
          let commissionRate = 0.05; // Default commission rate (5%)
          const ivaTax = 0.16; // Standard IVA rate in Mexico
          
          try {
            if (company_id) {
              const company = await getCompanyById(company_id);
              if (company && company.commission_rate !== undefined) {
                commissionRate = company.commission_rate;
                console.log(`Using company commission rate: ${commissionRate * 100}%`);
              }
            }
            
            // Calculate the monthly payment with proper default handling
            const amountValue = amount || 0;
            const termValue = term || 0;
            const interestRateValue = interest_rate || 0;
            
            const monthly = calculateMonthlyPayment(
              amountValue, 
              interestRateValue / 100, 
              termValue, 
              commissionRate, 
              ivaTax
            );
            
            if (monthly !== formData.monthly_payment) {
              setFormData(prev => ({ ...prev, monthly_payment: monthly }));
            }
          } catch (error) {
            console.error("Error retrieving company rates:", error);
          }
        };
        
        fetchCompanyRates();
      } else {
        // Clear monthly payment if amount or term is not valid
        if (formData.monthly_payment !== undefined) {
          setFormData(prev => ({ ...prev, monthly_payment: undefined }));
        }
      }
    }
  }, [formData.amount, formData.term, formData.interest_rate, formData.company_id, formData.financing_type, isEditMode]);
  
  // Load advisor companies on mount
  useEffect(() => {
    if (!isEditMode && user) {
      loadAdvisorCompanies();
    }
  }, [user, isEditMode]);
  
  // Load companies associated with logged-in advisor
  const loadAdvisorCompanies = async () => {
    try {
      setLoadingCompanies(true);
      const entityFilter = shouldFilterByEntity() ? getEntityFilter() : null;
      
      // Using Supabase to query companies
      let query = supabase.from('companies').select('id, name');
      
      // Apply advisor filter if needed
      if (entityFilter?.advisor_id) {
        // This depends on your DB structure - adjust as needed
        query = query.eq('advisor_id', entityFilter.advisor_id);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error loading advisor companies', error);
        return;
      }
      
      if (data) {
        setCompanies(data.map(company => ({
          id: company.id,
          name: company.name
        })));
      }
    } catch (err) {
      console.error('Error loading companies', err);
    } finally {
      setLoadingCompanies(false);
    }
  };

  // Load clients for a selected company
  const handleCompanyChange = async (companyId: string) => {
    setSelectedCompanyId(companyId);
    if (!companyId) {
      setCompanyClients([]);
      return;
    }
    
    try {
      setLoadingCompanyClients(true);
      
      const filters: ClientFilter = {
        company_id: companyId
      };
      
      // Add advisor filter if needed
      const entityFilter = shouldFilterByEntity() ? getEntityFilter() : null;
      if (entityFilter?.advisor_id) {
        filters.advisor_id = entityFilter.advisor_id;
      }
      
      const results = await getClients(filters);
      
      setCompanyClients(results.clients.map(client => ({
        id: client.id,
        name: client.name || 'Sin nombre',
        email: client.email || 'Sin email',
        phone: client.phone || 'Sin teléfono',
        company_name: client.company_name
      })));
    } catch (err) {
      console.error('Error loading clients for company', err);
    } finally {
      setLoadingCompanyClients(false);
    }
  };

  // Handler for searching clients
  const handleClientSearch = async (manualSearchTerm?: string) => {
    const trimmedSearchTerm = manualSearchTerm || searchTerm.trim();
    if (!trimmedSearchTerm) {
      // If search is empty, just show the companyClients if a company is selected
      setSearchResults([]);
      return;
    }
    
    try {
      setSearchLoading(true);
      setError(null); // Clear any previous errors
      
      const entityFilter = shouldFilterByEntity() ? getEntityFilter() : null;
      
      const filters: ClientFilter = {
        searchQuery: trimmedSearchTerm
      };
      
      // Add entity filters if available
      if (entityFilter?.advisor_id) {
        filters.advisor_id = entityFilter.advisor_id;
      }
      if (entityFilter?.company_id) {
        filters.company_id = entityFilter.company_id;
      }
      
      // If a company is selected in the filter, add that constraint as well
      if (selectedCompanyId) {
        filters.company_id = selectedCompanyId;
      }
      
      console.log("Searching clients with filters:", filters);
      const results = await getClients(filters);
      console.log("Search results:", results);
      
      if (results && results.clients && results.clients.length > 0) {
        setSearchResults(results.clients.map(client => ({
          id: client.id,
          name: client.name || 'Sin nombre',
          email: client.email || 'Sin email',
          phone: client.phone || 'Sin teléfono',
          company_name: client.company_name
        })));
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching clients:', error);
      setError('Error al buscar clientes. Por favor intente nuevamente.');
    } finally {
      setSearchLoading(false);
    }
  };
  
  // Handler for selecting a client
  const handleSelectClient = async (client: ClientSearchResult) => {
    try {
      setLoading(true);
      // Fetch full client details
      const fullClient = await getClientById(client.id);
      if (fullClient) {
        // Fetch company to get interest rate and commission rate
        let companyInterest = 0;
        let companyName = '';
        let commissionRate = 0.05; // Default commission rate (5%)
        let ivaTax = 0.16; // Standard IVA rate in Mexico
        
        if (fullClient.company_id) {
          const company = await getCompanyById(fullClient.company_id);
          if (company) {
            companyInterest = company.interest_rate || 0;
            companyName = company.name || '';
            // Get commission rate from company if available
            commissionRate = company.commission_rate !== undefined ? company.commission_rate : 0.05;
            console.log(`Using company commission rate: ${commissionRate * 100}%`);
          }
        }
        
        // Update form with client details
        setFormData(prev => ({
          ...prev,
          client_name: fullClient.name || '',
          client_email: fullClient.email || '',
          client_phone: fullClient.phone || '',
          client_address: fullClient.address || '',
          company_id: fullClient.company_id || '',
          company_name: companyName,
          // Retain existing values for amount, term
          interest_rate: companyInterest,
          assigned_to: fullClient.advisor_id || prev.assigned_to,
          client_id: client.id,
        }));
        
        setClientSelected(true);
        // Auto-calculate payment if amount and term are already set
        const { amount, term } = formData;
        if (amount !== undefined && term !== undefined && term > 0) {
          const monthly = calculateMonthlyPayment(
            amount, 
            companyInterest / 100, 
            term, 
            commissionRate, 
            ivaTax
          );
          setFormData(prev => ({
            ...prev,
            monthly_payment: monthly
          }));
        }
        
        // Close client search panel
        setShowClientSearch(false);
      }
    } catch (error: any) {
      console.error('Error selecting client:', error);
      setError(`Error al seleccionar cliente: ${error.message || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Function to clear client selection
  const handleClearClient = () => {
    setFormData(prev => ({
      ...prev,
      client_name: '',
      client_email: '',
      client_phone: '',
      client_address: '',
      client_id: '',
    }));
    setClientSelected(false);
    setShowClientSearch(true);
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (name === 'financing_type') {
      // Ensure both financing_type and application_type are updated together
      // for dashboard compatibility
      const financingType = value as 'producto' | 'personal';
      
      // Set application_type based on financing_type
      let applicationType = 'selected_plans';
      if (financingType === 'producto') {
        applicationType = APPLICATION_TYPE.PRODUCT_SIMULATIONS;
      } else if (financingType === 'personal') {
        applicationType = APPLICATION_TYPE.PERSONAL_LOAN;
      }
      
      setFormData(prev => ({
        ...prev,
        financing_type: financingType,
        application_type: applicationType
      }));
      return;
    }
    
    // For product_price, update both the product price and auto-calculate amount
    if (name === 'product_price') {
      // If value is empty, set both product_price and amount to undefined
      if (value === '') {
        setFormData(prev => ({
          ...prev,
          product_price: undefined,
          amount: undefined
        }));
        return;
      }
      
      const productPrice = parseFloat(value);
      // Calculate amount as product_price / 0.95 (equivalent to dividing by (1 - commission))
      // Round to 2 decimal places for better display
      const amount = Math.round((productPrice / 0.95) * 100) / 100;
      
      setFormData(prev => ({
        ...prev,
        product_price: productPrice,
        amount: amount
      }));
      return;
    }
    
    if (type === 'number') {
      // If the field is empty, set the value to undefined
      if (value === '') {
      setFormData(prev => ({
        ...prev,
          [name]: undefined
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          [name]: parseFloat(value)
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validations
    if (!formData.client_name?.trim()) {
      setError('El nombre del cliente es requerido');
      return;
    }
    
    if (formData.financing_type === 'personal' && !formData.amount) {
      setError('El monto del préstamo es requerido');
        return;
      }
      
    if (formData.financing_type === 'producto' && !formData.product_price) {
      setError('El precio del producto es requerido');
      return;
    }
    
    // Clear previous errors and set saving state
    setError(null);
    setSaving(true);
    
    try {
      // Apply entity filters for permission checks
      const entityFilter = shouldFilterByEntity() ? getEntityFilter() : null;
      
      // Build application data from form
      const applicationData = {
          client_name: formData.client_name,
        client_email: formData.client_email || '',
        client_phone: formData.client_phone || '',
        client_address: formData.client_address || '',
        dni: formData.dni || '',
        amount: formData.amount || 0,
        term: formData.term || DEFAULT_TERM,
        interest_rate: formData.interest_rate || DEFAULT_INTEREST_RATE,
        monthly_payment: formData.monthly_payment || 0,
        financing_type: formData.financing_type,
        product_url: formData.product_url || '',
        product_price: formData.product_price,
          application_type: 'selected_plans',
          status: APPLICATION_STATUS.SOLICITUD,
          company_id: formData.company_id,
          company_name: formData.company_name,
          assigned_to: formData.assigned_to,
        client_id: formData.client_id || '',
        source_id: formData.client_id || uuidv4(),
          approved_by_advisor: false,
          approved_by_company: false
        };
        
      console.log('Creating application with data:', applicationData);
      const createdApplication = await createApplication(applicationData);
      
      if (createdApplication && createdApplication.id) {
        // Show success message
        setSuccessMessage(`Solicitud creada exitosamente con ID: ${createdApplication.id}`);
        
        // Navigate to the application details
        navigate(`/applications/${createdApplication.id}`);
        
        // Reset form to initial state
        setFormData({
          client_name: '',
          client_email: '',
          client_phone: '',
          client_address: '',
          dni: '',
          amount: undefined,
          term: DEFAULT_TERM,
          interest_rate: DEFAULT_INTEREST_RATE,
          monthly_payment: undefined,
          financing_type: 'personal',
          product_url: '',
          product_price: undefined,
          application_type: 'selected_plans',
          status: APPLICATION_STATUS.SOLICITUD,
          company_id: '',
          company_name: '',
          assigned_to: user?.id || '',
          client_id: undefined
        });
      }
    } catch (error) {
      console.error("Error saving application:", error);
      setError(`Error al guardar la solicitud: ${(error as Error).message}`);
    } finally {
      setSaving(false);
    }
  };
  
  // Effect to focus search input when panel is shown
  useEffect(() => {
    if (showClientSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showClientSearch]);
  
  if (!userCan(isEditMode ? PERMISSIONS.EDIT_APPLICATION : PERMISSIONS.CREATE_APPLICATION)) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-700">Acceso Restringido</h2>
            <p className="text-gray-500 mt-2">No tienes permisos para {isEditMode ? 'editar' : 'crear'} solicitudes.</p>
          </div>
        </div>
      </MainLayout>
    );
  }
  
  return (
    <MainLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">
            {isEditMode ? 'Editar Solicitud' : 'Nueva Solicitud'}
          </h1>
          <Link to={isEditMode ? `/applications/${id}` : '/applications'} className="btn btn-ghost">
            Cancelar
          </Link>
        </div>
        
        {error && (
          <Alert 
            type="error" 
            message={error}
            onClose={() => setError(null)}
            className="mb-6"
          />
        )}
        
        {successMessage && (
          <Alert 
            type="success" 
            message={successMessage}
            onClose={() => setSuccessMessage(null)}
            className="mb-6"
          />
        )}
        
        {/* Client search section for new applications */}
        {!isEditMode && showClientSearch && (
          <div className="card bg-base-100 shadow-xl mb-6">
            <div className="card-body">
              <h2 className="card-title text-lg border-b pb-2 mb-4">Seleccionar Cliente</h2>
              
              {/* Search by name, email, phone */}
              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text font-medium">Buscar por nombre, email o teléfono</span>
                </label>
                <div className="input-group">
                  <input
                    type="text"
                    placeholder="Buscar cliente"
                    className="input input-bordered w-full"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleClientSearch()}
                    ref={searchInputRef}
                  />
                  <button 
                    className="btn btn-primary"
                    onClick={() => handleClientSearch()}
                    disabled={searchLoading}
                  >
                    {searchLoading ? (
                      <span className="loading loading-spinner loading-xs"></span>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              
              {/* Filter by company */}
              <div className="form-control mb-6">
                <label className="label">
                  <span className="label-text font-medium">Filtrar por empresa</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={selectedCompanyId}
                  onChange={(e) => handleCompanyChange(e.target.value)}
                  disabled={loadingCompanies}
                >
                  <option value="">Todas las empresas</option>
                  {companies.map(company => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
                {loadingCompanies && (
                  <div className="mt-2 flex items-center">
                    <span className="loading loading-spinner loading-xs mr-2"></span>
                    <span className="text-sm text-gray-500">Cargando empresas...</span>
                  </div>
                )}
              </div>
              
              {/* Search results section */}
              {searchResults.length > 0 ? (
                <div className="mb-6">
                  <h3 className="font-medium mb-2">Resultados de búsqueda</h3>
                  <div className="overflow-x-auto">
                    <table className="table w-full">
                      <thead>
                        <tr>
                          <th>Nombre</th>
                          <th>Email</th>
                          <th>Teléfono</th>
                          <th>Empresa</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {searchResults.map(client => (
                          <tr key={client.id} className="hover">
                            <td>{client.name}</td>
                            <td>{client.email}</td>
                            <td>{client.phone}</td>
                            <td>{client.company_name || 'No asignada'}</td>
                            <td>
                              <button 
                                className="btn btn-sm btn-primary"
                                onClick={() => handleSelectClient(client)}
                              >
                                Seleccionar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : searchTerm && !searchLoading ? (
                <div className="alert alert-info mb-6">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current flex-shrink-0 w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <span>No se encontraron clientes con ese criterio de búsqueda.</span>
                </div>
              ) : null}
              
              {/* Clients from selected company */}
              {selectedCompanyId && companyClients.length > 0 ? (
                <div className="mb-6">
                  <h3 className="font-medium mb-2">Clientes de esta empresa</h3>
                  <div className="overflow-x-auto">
                    <table className="table w-full">
                      <thead>
                        <tr>
                          <th>Nombre</th>
                          <th>Email</th>
                          <th>Teléfono</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {companyClients.map(client => (
                          <tr key={client.id} className="hover">
                            <td>{client.name}</td>
                            <td>{client.email}</td>
                            <td>{client.phone}</td>
                            <td>
                              <button 
                                className="btn btn-sm btn-primary"
                                onClick={() => handleSelectClient(client)}
                              >
                                Seleccionar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : selectedCompanyId && !loadingCompanyClients ? (
                <div className="alert alert-info mb-6">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current flex-shrink-0 w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <span>Esta empresa no tiene clientes asignados.</span>
                </div>
              ) : loadingCompanyClients ? (
                <div className="flex justify-center items-center py-8">
                  <span className="loading loading-spinner loading-md"></span>
                  <span className="ml-2">Cargando clientes...</span>
                </div>
              ) : null}
              
              {/* Divider */}
              <div className="divider">O</div>
              
              {/* Option to create application manually without client */}
              <div className="text-center">
                <button 
                  className="btn btn-outline"
                  onClick={() => {
                    setClientSelected(true);
                    setShowClientSearch(false);
                  }}
                >
                  Continuar sin seleccionar cliente
                </button>
              </div>
            </div>
          </div>
        )}
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : (clientSelected || isEditMode) && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Información del cliente */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <div className="flex justify-between items-center border-b pb-2 mb-4">
                  <h2 className="card-title text-lg">Información del Cliente</h2>
                  
                  {!isEditMode && clientSelected && (
                    <button 
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={handleClearClient}
                    >
                      Cambiar Cliente
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Nombre Completo*</span>
                    </label>
                    <input
                      type="text"
                      name="client_name"
                      value={formData.client_name}
                      onChange={handleChange}
                      className="input input-bordered"
                      required
                    />
                  </div>
                  
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Email*</span>
                    </label>
                    <input
                      type="email"
                      name="client_email"
                      value={formData.client_email}
                      onChange={handleChange}
                      className="input input-bordered"
                      required
                    />
                  </div>
                  
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Teléfono*</span>
                    </label>
                    <input
                      type="tel"
                      name="client_phone"
                      value={formData.client_phone}
                      onChange={handleChange}
                      className="input input-bordered"
                      required
                    />
                  </div>
                  
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">DNI / Identificación</span>
                    </label>
                    <input
                      type="text"
                      name="dni"
                      value={formData.dni}
                      onChange={handleChange}
                      className="input input-bordered"
                    />
                  </div>
                  
                  <div className="form-control md:col-span-2">
                    <label className="label">
                      <span className="label-text">Dirección</span>
                    </label>
                    <input
                      type="text"
                      name="client_address"
                      value={formData.client_address}
                      onChange={handleChange}
                      className="input input-bordered"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Información del crédito */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title text-lg border-b pb-2 mb-4">Información del Crédito</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Tipo de Financiamiento*</span>
                    </label>
                    <select
                      name="financing_type"
                      value={formData.financing_type}
                      onChange={handleChange}
                      className="select select-bordered"
                      required
                    >
                      <option value="producto">Financiamiento de Producto</option>
                      <option value="personal">Crédito Personal</option>
                    </select>
                  </div>
                  
                  {/* Product Price field - only show for product financing */}
                  {formData.financing_type === 'producto' && (
                  <div className="form-control">
                    <label className="label">
                        <span className="label-text">Precio del Producto*</span>
                    </label>
                      <input
                        type="number"
                        name="product_price"
                        value={formData.product_price === undefined ? '' : formData.product_price}
                      onChange={handleChange}
                        className="input input-bordered"
                        min="0"
                        step="0.01"
                      required
                      />
                  </div>
                  )}
                  
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">
                        Monto{formData.financing_type === 'producto' ? ' (Calculado automáticamente)' : '*'}
                      </span>
                      {formData.financing_type === 'producto' && formData.product_price && formData.product_price > 0 && (
                        <span className="label-text-alt text-info">
                          Precio: ${typeof formData.product_price === 'number' ? formData.product_price.toFixed(2) : '0.00'} ÷ 0.95 = ${typeof formData.amount === 'number' ? formData.amount.toFixed(2) : '0.00'}
                        </span>
                      )}
                    </label>
                    <input
                      type="number"
                      name="amount"
                      value={formData.amount === undefined ? '' : formData.amount}
                      onChange={handleChange}
                      className={`input input-bordered ${formData.financing_type === 'producto' ? 'bg-gray-100' : ''}`}
                      min="0"
                      step="0.01"
                      required
                      readOnly={formData.financing_type === 'producto'}
                    />
                  </div>
                  
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Plazo (meses)</span>
                    </label>
                    <input
                      type="number"
                      name="term"
                      value={formData.term === undefined ? '' : formData.term}
                      onChange={handleChange}
                      className="input input-bordered"
                      min="1"
                    />
                  </div>
                  
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Tasa de Interés (%)</span>
                    </label>
                    <input
                      type="number"
                      name="interest_rate"
                      value={formData.interest_rate === undefined ? '' : formData.interest_rate}
                      onChange={handleChange}
                      className="input input-bordered"
                      readOnly
                      min="0"
                      step="0.01"
                    />
                  </div>
                  
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Pago Mensual</span>
                    </label>
                    <input
                      type="number"
                      name="monthly_payment"
                      value={formData.monthly_payment === undefined ? '' : formData.monthly_payment}
                      onChange={handleChange}
                      className="input input-bordered"
                      min="0"
                      readOnly
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Product URL input for financing_type producto */}
            {formData.financing_type === 'producto' && (
              <div className="form-control md:col-span-2">
                <label className="label">
                  <span className="label-text">URL del Producto (Amazon/MercadoLibre)</span>
                </label>
                <input
                  type="url"
                  name="product_url"
                  value={formData.product_url || ''}
                  onChange={handleChange}
                  className="input input-bordered"
                  placeholder="https://www.amazon.com/..."
                  required
                />
              </div>
            )}
            
            {/* Información de empresa y asesor */}
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title text-lg border-b pb-2 mb-4">Empresa y Asesor</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">ID de Empresa</span>
                    </label>
                    <input
                      type="text"
                      name="company_id"
                      value={formData.company_id}
                      onChange={handleChange}
                      className="input input-bordered"
                      readOnly
                    />
                  </div>
                  
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Nombre de Empresa</span>
                    </label>
                    <input
                      type="text"
                      name="company_name"
                      value={formData.company_name}
                      onChange={handleChange}
                      className="input input-bordered"
                      readOnly={!!formData.company_id || shouldFilterByEntity()}
                    />
                  </div>
                  
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">ID de Asesor Asignado</span>
                    </label>
                    <input
                      type="text"
                      name="assigned_to"
                      value={formData.assigned_to}
                      onChange={handleChange}
                      className="input input-bordered"
                      readOnly={shouldFilterByEntity()}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                type="submit"
                className={`btn btn-primary ${saving ? 'loading' : ''}`}
                disabled={saving}
              >
                {isEditMode ? 'Actualizar Solicitud' : 'Crear Solicitud'}
              </button>
            </div>
          </form>
        )}
      </div>
    </MainLayout>
  );
};

export default ApplicationForm; 