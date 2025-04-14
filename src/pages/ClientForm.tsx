import React, { useState, useEffect, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { getClientById, createClient, updateClient, Client } from '../services/clientService';
import { getCompanies, Company } from '../services/companyService';
import { useAuth } from '../contexts/AuthContext';

// Interfaz para los datos del formulario
interface ClientFormData {
  // Replace name with name components
  first_name: string;
  paternal_surname: string;
  maternal_surname: string;
  email: string;
  phone: string;
  birth_date: string;
  company_id?: string;
  rfc: string;
  curp: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  advisor_id?: string;
  // Datos adicionales
  gender: string;
  marital_status: string;
  employment_type: string;
  employment_years: string;
  monthly_income: string;
  additional_income: string;
  monthly_expenses: string;
  other_loan_balances: string;
  bank_name: string;
  bank_clabe: string;
  bank_account_number: string;
  bank_account_type: string;
  bank_account_origin: string;
}

// Secciones del formulario
enum FormSection {
  PERSONAL_INFO = 'Información Personal',
  ADDRESS = 'Dirección',
  EMPLOYMENT = 'Empleo',
  FINANCIAL = 'Finanzas',
  BANK_INFO = 'Datos Bancarios'
}

// Componente de formulario
const ClientForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEditMode = !!id;
  
  // Estado para los datos del formulario
  const [formData, setFormData] = useState<ClientFormData>({
    // Initialize with empty strings
    first_name: '',
    paternal_surname: '',
    maternal_surname: '',
    email: '',
    phone: '',
    rfc: '',
    curp: '',
    birth_date: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    gender: '',
    marital_status: '',
    employment_type: '',
    employment_years: '',
    monthly_income: '',
    additional_income: '',
    monthly_expenses: '',
    other_loan_balances: '',
    bank_name: '',
    bank_clabe: '',
    bank_account_number: '',
    bank_account_type: '',
    bank_account_origin: ''
  });

  // Estado para el manejo de secciones
  const [currentSection, setCurrentSection] = useState<FormSection>(FormSection.PERSONAL_INFO);
  
  // Estado para empresas disponibles
  const [companies, setCompanies] = useState<Company[]>([]);
  
  // Estados de error, loading
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [fetchingData, setFetchingData] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [partialSave, setPartialSave] = useState<boolean>(false);
  
  // Cargar datos del cliente en modo edición
  useEffect(() => {
    if (isEditMode && id) {
      fetchClientData(id);
    }
    
    // Cargar empresas
    fetchCompanies();
  }, [isEditMode, id]);
  
  const fetchCompanies = async () => {
    try {
      const companiesData = await getCompanies();
      setCompanies(companiesData);
    } catch (err) {
      console.error('Error cargando empresas:', err);
    }
  };
  
  const fetchClientData = async (clientId: string) => {
    try {
      setFetchingData(true);
      const clientData = await getClientById(clientId);
      
      // Check if clientData exists before using it
      if (!clientData) {
        setError('No se encontraron los datos del cliente o la tabla de clientes no existe.');
        return;
      }
      
      // Convertir las fechas a formato YYYY-MM-DD para el input date
      setFormData({
        first_name: clientData.first_name || '',
        paternal_surname: clientData.paternal_surname || '',
        maternal_surname: clientData.maternal_surname || '',
        email: clientData.email,
        phone: clientData.phone,
        rfc: clientData.rfc || '',
        curp: clientData.curp || '',
        birth_date: clientData.birth_date ? new Date(clientData.birth_date).toISOString().split('T')[0] : '',
        address: clientData.address || '',
        city: clientData.city || '',
        state: clientData.state || '',
        postal_code: clientData.postal_code || '',
        company_id: clientData.company_id,
        advisor_id: clientData.advisor_id,
        gender: clientData.gender || '',
        marital_status: clientData.marital_status || '',
        employment_type: clientData.employment_type || '',
        employment_years: clientData.employment_years ? clientData.employment_years.toString() : '',
        monthly_income: clientData.monthly_income ? clientData.monthly_income.toString() : '',
        additional_income: clientData.additional_income ? clientData.additional_income.toString() : '',
        monthly_expenses: clientData.monthly_expenses ? clientData.monthly_expenses.toString() : '',
        other_loan_balances: clientData.other_loan_balances ? clientData.other_loan_balances.toString() : '',
        bank_name: clientData.bank_name || '',
        bank_clabe: clientData.bank_clabe || '',
        bank_account_number: clientData.bank_account_number || '',
        bank_account_type: clientData.bank_account_type || '',
        bank_account_origin: clientData.bank_account_origin || ''
      });
      
      setError(null);
    } catch (err) {
      console.error('Error fetching client data:', err);
      setError('No se pudieron cargar los datos del cliente. Por favor intente nuevamente.');
    } finally {
      setFetchingData(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Si está seleccionando una empresa, autocompletar información empresarial
    if (name === 'company_id' && value) {
      const selectedCompany = companies.find(company => company.id === value);
      if (selectedCompany && selectedCompany.advisor_id) {
        setFormData(prev => ({
          ...prev,
          company_id: value,
          advisor_id: selectedCompany.advisor_id
        }));
      }
    }
  };

  // Función para calcular el progreso de llenado por sección
  const calculateSectionProgress = (section: FormSection): number => {
    let filledFields = 0;
    let totalFields = 0;
    
    switch (section) {
      case FormSection.PERSONAL_INFO:
        const personalFields = ['first_name', 'paternal_surname', 'email', 'phone', 'rfc', 'curp', 'birth_date', 'gender', 'marital_status', 'company_id'];
        totalFields = personalFields.length;
        filledFields = personalFields.filter(field => formData[field as keyof ClientFormData]).length;
        break;
      case FormSection.ADDRESS:
        const addressFields = ['address', 'city', 'state', 'postal_code'];
        totalFields = addressFields.length;
        filledFields = addressFields.filter(field => formData[field as keyof ClientFormData]).length;
        break;
      case FormSection.EMPLOYMENT:
        const employmentFields = ['employment_type', 'employment_years'];
        totalFields = employmentFields.length;
        filledFields = employmentFields.filter(field => formData[field as keyof ClientFormData]).length;
        break;
      case FormSection.FINANCIAL:
        const financialFields = ['monthly_income', 'additional_income', 'monthly_expenses', 'other_loan_balances'];
        totalFields = financialFields.length;
        filledFields = financialFields.filter(field => formData[field as keyof ClientFormData]).length;
        break;
      case FormSection.BANK_INFO:
        const bankFields = ['bank_name', 'bank_clabe', 'bank_account_number', 'bank_account_type', 'bank_account_origin'];
        totalFields = bankFields.length;
        filledFields = bankFields.filter(field => formData[field as keyof ClientFormData]).length;
        break;
    }
    
    return totalFields > 0 ? (filledFields / totalFields) * 100 : 0;
  };
  
  // Función para obtener el color según el progreso
  const getProgressColor = (progress: number): string => {
    if (progress < 30) return 'bg-red-500';
    if (progress < 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  // Guardar todo el formulario
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      // Validaciones básicas
      if (!formData.first_name.trim()) {
        setError('El nombre es obligatorio');
        return;
      }
      
      if (!formData.paternal_surname.trim()) {
        setError('El apellido paterno es obligatorio');
        return;
      }
      
      if (!formData.email.trim()) {
        setError('El correo electrónico es obligatorio');
        return;
      }
      
      if (!formData.phone.trim()) {
        setError('El teléfono es obligatorio');
        return;
      }
      
      // Convertir valores numéricos
      const clientData: Partial<Client> = {
        ...formData,
        employment_years: formData.employment_years ? parseInt(formData.employment_years) : undefined,
        monthly_income: formData.monthly_income ? parseFloat(formData.monthly_income) : undefined,
        additional_income: formData.additional_income ? parseFloat(formData.additional_income) : undefined,
        monthly_expenses: formData.monthly_expenses ? parseFloat(formData.monthly_expenses) : undefined,
        other_loan_balances: formData.other_loan_balances ? parseFloat(formData.other_loan_balances) : undefined,
      };
      
      // Crear o actualizar cliente
      if (isEditMode && id) {
        await updateClient(id, clientData);
        setSaveSuccess(true);
        setTimeout(() => {
          navigate(`/clients/${id}`);
        }, 1500);
      } else {
        const newClient = await createClient(clientData as Omit<Client, 'id' | 'created_at'>);
        setSaveSuccess(true);
        setTimeout(() => {
          navigate(`/clients/${newClient.id}`);
        }, 1500);
      }
    } catch (err) {
      console.error('Error saving client:', err);
      setError('Ocurrió un error al guardar los datos. Por favor intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };
  
  // Guardar parcialmente el formulario
  const handlePartialSave = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Convertir valores numéricos
      const clientData: Partial<Client> = {
        ...formData,
        employment_years: formData.employment_years ? parseInt(formData.employment_years) : undefined,
        monthly_income: formData.monthly_income ? parseFloat(formData.monthly_income) : undefined,
        additional_income: formData.additional_income ? parseFloat(formData.additional_income) : undefined,
        monthly_expenses: formData.monthly_expenses ? parseFloat(formData.monthly_expenses) : undefined,
        other_loan_balances: formData.other_loan_balances ? parseFloat(formData.other_loan_balances) : undefined,
      };
      
      if (isEditMode && id) {
        await updateClient(id, clientData);
        setPartialSave(true);
        setTimeout(() => setPartialSave(false), 3000);
      } else if (formData.email && formData.first_name) {
        // Solo guarda si al menos tiene correo y nombre
        const newClient = await createClient(clientData as Omit<Client, 'id' | 'created_at'>);
        // Actualizar modo a edición y actualizar ID
        window.history.replaceState(null, '', `/clients/edit/${newClient.id}`);
        setPartialSave(true);
        setTimeout(() => setPartialSave(false), 3000);
      } else {
        setError('Debes completar al menos el nombre y correo electrónico para guardar');
      }
    } catch (err) {
      console.error('Error saving client:', err);
      setError('Ocurrió un error al guardar los datos. Por favor intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // Renderizar sección actual
  const renderSection = () => {
    switch (currentSection) {
      case FormSection.PERSONAL_INFO:
        return (
          <div className="space-y-4 md:col-span-2">
            <h2 className="text-xl font-bold">Información Personal</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Nombre(s)*</span>
                </label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  placeholder="Nombre(s)"
                  className="input input-bordered w-full"
                  required
                />
              </div>
              
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Apellido Paterno*</span>
                </label>
                <input
                  type="text"
                  name="paternal_surname"
                  value={formData.paternal_surname}
                  onChange={handleChange}
                  placeholder="Apellido Paterno"
                  className="input input-bordered w-full"
                  required
                />
              </div>
              
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Apellido Materno</span>
                </label>
                <input
                  type="text"
                  name="maternal_surname"
                  value={formData.maternal_surname}
                  onChange={handleChange}
                  placeholder="Apellido Materno"
                  className="input input-bordered w-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Correo Electrónico*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="correo@ejemplo.com"
                  className="input input-bordered w-full"
                  required
                />
              </div>

              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Teléfono*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="(123) 456-7890"
                  className="input input-bordered w-full"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">RFC</span>
                </label>
                <input
                  type="text"
                  name="rfc"
                  value={formData.rfc}
                  onChange={handleChange}
                  placeholder="RFC"
                  className="input input-bordered w-full"
                />
              </div>

              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">CURP</span>
                </label>
                <input
                  type="text"
                  name="curp"
                  value={formData.curp}
                  onChange={handleChange}
                  placeholder="CURP"
                  className="input input-bordered w-full"
                />
              </div>

              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Fecha de Nacimiento</span>
                </label>
                <input
                  type="date"
                  name="birth_date"
                  value={formData.birth_date}
                  onChange={handleChange}
                  className="input input-bordered w-full"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Género</span>
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="select select-bordered w-full"
                >
                  <option value="">Seleccionar...</option>
                  <option value="masculino">Masculino</option>
                  <option value="femenino">Femenino</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Estado Civil</span>
                </label>
                <select
                  name="marital_status"
                  value={formData.marital_status}
                  onChange={handleChange}
                  className="select select-bordered w-full"
                >
                  <option value="">Seleccionar...</option>
                  <option value="soltero">Soltero/a</option>
                  <option value="casado">Casado/a</option>
                  <option value="divorciado">Divorciado/a</option>
                  <option value="viudo">Viudo/a</option>
                  <option value="union_libre">Unión Libre</option>
                </select>
              </div>
              
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Empresa</span>
                </label>
                <select
                  name="company_id"
                  value={formData.company_id || ''}
                  onChange={handleChange}
                  className="select select-bordered w-full"
                >
                  <option value="">Seleccionar empresa...</option>
                  {companies.map(company => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        );
        
      case FormSection.ADDRESS:
        return (
          <div className="space-y-4 md:col-span-2">
            <h2 className="text-xl font-bold">Dirección</h2>
            
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">Dirección</span>
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Calle, número, colonia"
                className="input input-bordered w-full"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Ciudad</span>
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="Ciudad"
                  className="input input-bordered w-full"
                />
              </div>

              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Estado</span>
                </label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="Estado"
                  className="input input-bordered w-full"
                />
              </div>

              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Código Postal</span>
                </label>
                <input
                  type="text"
                  name="postal_code"
                  value={formData.postal_code}
                  onChange={handleChange}
                  placeholder="Código Postal"
                  className="input input-bordered w-full"
                />
              </div>
            </div>
          </div>
        );
        
      case FormSection.EMPLOYMENT:
        return (
          <div className="space-y-4 md:col-span-2">
            <h2 className="text-xl font-bold">Empleo</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Tipo de Empleo</span>
                </label>
                <select
                  name="employment_type"
                  value={formData.employment_type}
                  onChange={handleChange}
                  className="select select-bordered w-full"
                >
                  <option value="">Seleccionar...</option>
                  <option value="empleado">Empleado</option>
                  <option value="independiente">Trabajador Independiente</option>
                  <option value="empresario">Empresario</option>
                  <option value="jubilado">Jubilado/Pensionado</option>
                  <option value="desempleado">Desempleado</option>
                </select>
              </div>
              
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Años en Empleo Actual</span>
                </label>
                <input
                  type="number"
                  name="employment_years"
                  value={formData.employment_years}
                  onChange={handleChange}
                  placeholder="Años"
                  className="input input-bordered w-full"
                  min="0"
                />
              </div>
            </div>
          </div>
        );
        
      case FormSection.FINANCIAL:
        return (
          <div className="space-y-4 md:col-span-2">
            <h2 className="text-xl font-bold">Finanzas</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Ingreso Mensual</span>
                </label>
                <input
                  type="number"
                  name="monthly_income"
                  value={formData.monthly_income}
                  onChange={handleChange}
                  placeholder="Ingreso Mensual"
                  className="input input-bordered w-full"
                  min="0"
                />
              </div>
              
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Ingresos Adicionales</span>
                </label>
                <input
                  type="number"
                  name="additional_income"
                  value={formData.additional_income}
                  onChange={handleChange}
                  placeholder="Ingresos Adicionales"
                  className="input input-bordered w-full"
                  min="0"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Gastos Mensuales</span>
                </label>
                <input
                  type="number"
                  name="monthly_expenses"
                  value={formData.monthly_expenses}
                  onChange={handleChange}
                  placeholder="Gastos Mensuales"
                  className="input input-bordered w-full"
                  min="0"
                />
              </div>
              
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Saldo de Otros Préstamos</span>
                </label>
                <input
                  type="number"
                  name="other_loan_balances"
                  value={formData.other_loan_balances}
                  onChange={handleChange}
                  placeholder="Saldo de Otros Préstamos"
                  className="input input-bordered w-full"
                  min="0"
                />
              </div>
            </div>
          </div>
        );
        
      case FormSection.BANK_INFO:
        return (
          <div className="space-y-4 md:col-span-2">
            <h2 className="text-xl font-bold">Datos Bancarios</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Nombre del Banco</span>
                </label>
                <input
                  type="text"
                  name="bank_name"
                  value={formData.bank_name}
                  onChange={handleChange}
                  placeholder="Nombre del Banco"
                  className="input input-bordered w-full"
                />
              </div>
              
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">CLABE Interbancaria</span>
                </label>
                <input
                  type="text"
                  name="bank_clabe"
                  value={formData.bank_clabe}
                  onChange={handleChange}
                  placeholder="CLABE"
                  className="input input-bordered w-full"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Número de Cuenta</span>
                </label>
                <input
                  type="text"
                  name="bank_account_number"
                  value={formData.bank_account_number}
                  onChange={handleChange}
                  placeholder="Número de Cuenta"
                  className="input input-bordered w-full"
                />
              </div>
              
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Tipo de Cuenta</span>
                </label>
                <select
                  name="bank_account_type"
                  value={formData.bank_account_type}
                  onChange={handleChange}
                  className="select select-bordered w-full"
                >
                  <option value="">Seleccionar...</option>
                  <option value="debito">Débito</option>
                  <option value="nomina">Nómina</option>
                  <option value="ahorro">Ahorro</option>
                  <option value="cheques">Cheques</option>
                </select>
              </div>
              
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Origen de la Cuenta</span>
                </label>
                <select
                  name="bank_account_origin"
                  value={formData.bank_account_origin}
                  onChange={handleChange}
                  className="select select-bordered w-full"
                >
                  <option value="">Seleccionar...</option>
                  <option value="personal">Personal</option>
                  <option value="empresa">Empresa</option>
                  <option value="terceros">Terceros</option>
                </select>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <MainLayout>
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <button 
            onClick={() => navigate(-1)} 
            className="btn btn-ghost btn-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Volver
          </button>
          <h1 className="text-2xl font-bold">
            {isEditMode ? 'Editar Cliente' : 'Nuevo Cliente'}
          </h1>
        </div>

        {fetchingData ? (
          <div className="flex justify-center items-center py-12">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              {error && (
                <div className="alert alert-error mb-6">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}
              
              {saveSuccess && (
                <div className="alert alert-success mb-6">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Datos guardados correctamente. Redirigiendo...</span>
                </div>
              )}
              
              {partialSave && (
                <div className="alert alert-success mb-6">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Sección guardada correctamente.</span>
                </div>
              )}

              {/* Navegación de secciones */}
              <div className="flex flex-wrap gap-2 mb-6">
                {Object.values(FormSection).map(section => {
                  const progress = calculateSectionProgress(section);
                  const progressColor = getProgressColor(progress);
                  
                  return (
                    <div key={section} className="flex flex-col items-center">
                      <button 
                        className={`btn ${currentSection === section ? 'btn-primary' : 'btn-outline'} mb-2`}
                        onClick={() => setCurrentSection(section)}
                      >
                        {section}
                      </button>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div 
                          className={`h-2.5 rounded-full ${progressColor}`} 
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                      <span className="text-xs mt-1">{Math.round(progress)}%</span>
                    </div>
                  );
                })}
              </div>

              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {renderSection()}
                </div>

                <div className="mt-8 flex justify-end gap-4">
                  <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="btn btn-ghost"
                    disabled={loading}
                  >
                    Cancelar
                  </button>
                  
                  <button
                    type="button"
                    onClick={handlePartialSave}
                    className="btn btn-secondary"
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="loading loading-spinner loading-sm"></span>
                    ) : 'Guardar Sección'}
                  </button>
                  
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="loading loading-spinner loading-sm"></span>
                    ) : isEditMode ? 'Actualizar Cliente' : 'Crear Cliente'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default ClientForm; 