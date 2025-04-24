import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Client } from '../../services/clientService';
import DocumentUploader from '../documents/DocumentUploader';
import { useAuth } from '../../contexts/AuthContext';
import { executeQuery } from '../../services/mcpService';

// Interfaz para documentos
interface ClientDocument {
  id?: string;
  file: File;
  category: string;
  name: string;
}

// Props para el componente
interface ClientFormProps {
  initialData?: Partial<Client>;
  onSubmit: (data: Partial<Client>, documents: ClientDocument[]) => Promise<void>;
  onSavePartial?: (data: Partial<Client>, step: number) => Promise<Partial<Client> | null>;
  existingDocuments?: { id: string; name: string; category: string; url?: string }[];
  isSubmitting: boolean;
}

// Categorías de documentos predefinidas
const DOCUMENT_CATEGORIES = [
  { value: 'identificacion', label: 'Identificación Oficial' },
  { value: 'comprobante_domicilio', label: 'Comprobante de Domicilio' },
  { value: 'comprobante_ingresos', label: 'Comprobante de Ingresos' },
  { value: 'estados_cuenta', label: 'Estados de Cuenta Bancarios' },
  { value: 'rfc', label: 'Constancia de Situación Fiscal (RFC)' },
  { value: 'curp', label: 'CURP' },
  { value: 'otros', label: 'Otros Documentos' },
];

// Tipos de empleo
const EMPLOYMENT_TYPES = [
  { value: 'empleado', label: 'Empleado' },
  { value: 'autonomo', label: 'Autónomo / Freelance' },
  { value: 'empresario', label: 'Empresario' },
  { value: 'jubilado', label: 'Jubilado' },
  { value: 'desempleado', label: 'Desempleado' },
  { value: 'estudiante', label: 'Estudiante' },
  { value: 'otro', label: 'Otro' },
];

// Estados civiles
const MARITAL_STATUS_TYPES = [
  { value: 'soltero', label: 'Soltero/a' },
  { value: 'casado', label: 'Casado/a' },
  { value: 'divorciado', label: 'Divorciado/a' },
  { value: 'viudo', label: 'Viudo/a' },
  { value: 'union_libre', label: 'Unión Libre' },
];

// Tipos de cuenta bancaria
const BANK_ACCOUNT_TYPES = [
  { value: 'nomina', label: 'Nómina' },
  { value: 'ahorro', label: 'Ahorro' },
  { value: 'cheques', label: 'Cheques' },
  { value: 'inversiones', label: 'Inversiones' },
];

// Tipos de frecuencia de ingresos
const INCOME_FREQUENCY_TYPES = [
  { value: 'semanal', label: 'Semanal' },
  { value: 'quincenal', label: 'Quincenal' },
  { value: 'mensual', label: 'Mensual' },
  { value: 'bimestral', label: 'Bimestral' },
  { value: 'trimestral', label: 'Trimestral' },
  { value: 'semestral', label: 'Semestral' },
  { value: 'anual', label: 'Anual' },
  { value: 'irregular', label: 'Irregular' },
];

// Métodos de pago
const PAYMENT_METHOD_TYPES = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'tarjeta', label: 'Tarjeta de Crédito/Débito' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'domiciliacion', label: 'Domiciliación Bancaria' },
];

// Propósitos de crédito
const CREDIT_PURPOSE_TYPES = [
  { value: 'personal', label: 'Gastos Personales' },
  { value: 'negocio', label: 'Negocio/Inversión' },
  { value: 'vivienda', label: 'Vivienda' },
  { value: 'auto', label: 'Automóvil' },
  { value: 'educacion', label: 'Educación' },
  { value: 'salud', label: 'Salud' },
  { value: 'deudas', label: 'Consolidación de Deudas' },
  { value: 'otro', label: 'Otro' },
];

// Tipos de relación para referencias
const RELATIONSHIP_TYPES = [
  { value: 'familiar', label: 'Familiar' },
  { value: 'amigo', label: 'Amigo' },
  { value: 'companero_trabajo', label: 'Compañero de Trabajo' },
  { value: 'vecino', label: 'Vecino' },
  { value: 'otro', label: 'Otro' },
];

const ClientForm: React.FC<ClientFormProps> = ({ initialData = {}, onSubmit, onSavePartial, existingDocuments = [], isSubmitting }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Estado para los datos del formulario
  const [formData, setFormData] = useState<Partial<Client>>({
    first_name: '',
    paternal_surname: '',
    maternal_surname: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    birth_date: '',
    gender: '',
    marital_status: '',
    employment_type: '',
    employment_years: undefined,
    rfc: '',
    curp: '',
    monthly_income: undefined,
    additional_income: undefined,
    monthly_expenses: undefined,
    other_loan_balances: undefined,
    bank_name: '',
    bank_clabe: '',
    bank_account_number: '',
    bank_account_type: '',
    bank_account_origin: '',
    company_id: '',
    // Nuevos campos
    street_number_ext: '',
    street_number_int: '',
    neighborhood: '',
    home_phone: '',
    birth_state: '',
    nationality: '',
    job_position: '',
    employer_name: '',
    employer_phone: '',
    employer_address: '',
    employer_activity: '',
    mortgage_payment: undefined,
    rent_payment: undefined,
    dependent_persons: undefined,
    income_frequency: '',
    payment_method: '',
    credit_purpose: '',
    spouse_paternal_surname: '',
    spouse_maternal_surname: '',
    reference1_name: '',
    reference1_relationship: '',
    reference1_address: '',
    reference1_phone: '',
    reference2_name: '',
    reference2_relationship: '',
    reference2_address: '',
    reference2_phone: '',
    ...initialData,
  });

  // Estado para errores de validación
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Estado para documentos
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  
  // Estado para el paso actual del formulario
  const [currentStep, setCurrentStep] = useState(1);
  
  // Estado para empresas
  const [companies, setCompanies] = useState<{id: string, name: string}[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  
  // Estado para indicar si estamos guardando datos parciales
  const [savingPartialData, setSavingPartialData] = useState(false);
  
  // Calcular el progreso de llenado de formulario
  const calculateProgress = () => {
    let filledFields = 0;
    let totalFields = 0;
    
    // Paso 1: Datos Personales Básicos
    const step1Fields = ['first_name', 'paternal_surname', 'maternal_surname', 'email', 'phone', 
      'rfc', 'curp', 'birth_date', 'gender', 'marital_status', 'address', 'city', 'state', 
      'postal_code', 'company_id', 'street_number_ext', 'street_number_int', 'neighborhood', 
      'home_phone', 'birth_state', 'nationality', 'spouse_paternal_surname', 'spouse_maternal_surname',
      'dependent_persons'];
    totalFields += step1Fields.length;
    filledFields += step1Fields.filter(field => formData[field as keyof Partial<Client>]).length;
    
    // Paso 2: Detalles Financieros y Empleo
    const step2Fields = ['employment_type', 'employment_years', 'job_position', 'employer_name', 
      'employer_phone', 'employer_address', 'employer_activity', 'monthly_income', 'additional_income', 
      'monthly_expenses', 'other_loan_balances', 'mortgage_payment', 'rent_payment', 
      'income_frequency', 'payment_method', 'credit_purpose'];
    totalFields += step2Fields.length;
    filledFields += step2Fields.filter(field => formData[field as keyof Partial<Client>] !== undefined && formData[field as keyof Partial<Client>] !== '').length;
    
    // Paso 3: Datos Bancarios y Referencias
    const step3Fields = ['bank_name', 'bank_clabe', 'bank_account_number', 'bank_account_type', 
      'bank_account_origin', 'reference1_name', 'reference1_relationship', 'reference1_address', 
      'reference1_phone', 'reference2_name', 'reference2_relationship', 'reference2_address', 
      'reference2_phone'];
    totalFields += step3Fields.length;
    filledFields += step3Fields.filter(field => formData[field as keyof Partial<Client>]).length;
    
    // Calcular porcentaje
    return Math.round((filledFields / totalFields) * 100);
  };
  
  // State for section saving
  const [sectionSubmitting, setSectionSubmitting] = useState(false);

  // Use useMemo instead of useState + useEffect to calculate progress
  const progress = useMemo(() => calculateProgress(), [
    // Adding all form fields as dependencies
    formData.first_name,
    formData.paternal_surname,
    formData.maternal_surname,
    // (additional dependencies would go here)
  ]);

  // Helper function to collect fields for current step
  const collectFieldsForStep = (data: Partial<Client>, step: number): Partial<Client> => {
    let partialData: Partial<Client> = {};
    
    if (step === 1) {
      // Datos Personales Básicos
      partialData = {
        first_name: data.first_name,
        paternal_surname: data.paternal_surname,
        maternal_surname: data.maternal_surname,
        email: data.email,
        phone: data.phone,
        birth_date: data.birth_date,
        gender: data.gender,
        marital_status: data.marital_status,
        rfc: data.rfc,
        curp: data.curp,
        address: data.address,
        city: data.city,
        state: data.state,
        postal_code: data.postal_code,
        company_id: data.company_id,
        home_phone: data.home_phone,
        birth_state: data.birth_state,
        nationality: data.nationality,
        dependent_persons: data.dependent_persons,
        street_number_ext: data.street_number_ext,
        street_number_int: data.street_number_int,
        neighborhood: data.neighborhood,
        spouse_paternal_surname: data.spouse_paternal_surname,
        spouse_maternal_surname: data.spouse_maternal_surname,
      };
    } else if (step === 2) {
      // Información Laboral y Financiera
      partialData = {
        employment_type: data.employment_type,
        employment_years: data.employment_years,
        job_position: data.job_position,
        employer_name: data.employer_name,
        employer_phone: data.employer_phone,
        employer_address: data.employer_address,
        employer_activity: data.employer_activity,
        monthly_income: data.monthly_income,
        additional_income: data.additional_income,
        monthly_expenses: data.monthly_expenses,
        mortgage_payment: data.mortgage_payment,
        rent_payment: data.rent_payment,
        other_loan_balances: data.other_loan_balances,
        income_frequency: data.income_frequency,
        payment_method: data.payment_method,
        credit_purpose: data.credit_purpose,
      };
    } else if (step === 3) {
      // Datos Bancarios y Referencias
      partialData = {
        bank_name: data.bank_name,
        bank_clabe: data.bank_clabe,
        bank_account_number: data.bank_account_number,
        bank_account_type: data.bank_account_type,
        bank_account_origin: data.bank_account_origin,
        reference1_name: data.reference1_name,
        reference1_relationship: data.reference1_relationship,
        reference1_address: data.reference1_address,
        reference1_phone: data.reference1_phone,
        reference2_name: data.reference2_name,
        reference2_relationship: data.reference2_relationship,
        reference2_address: data.reference2_address,
        reference2_phone: data.reference2_phone,
      };
    }
    
    return partialData;
  };

  // Event handlers
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
      setFormData(prev => ({
        ...prev,
      [name]: type === 'number' ? (value === '' ? undefined : parseFloat(value)) : value
    }));
  };

  const handleDocumentAdded = (document: ClientDocument) => {
    setDocuments(prev => [...prev, document]);
  };
  
  const handleDocumentRemoved = (index: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
  };
  
  const handleCompanyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { value } = e.target;
    setFormData(prev => ({
      ...prev,
      company_id: value
    }));
  };

  // Step navigation
  const nextStep = async () => {
    if (currentStep < 4) {
      // Si tenemos una función onSavePartial, guardamos los datos actuales antes de avanzar
      if (onSavePartial) {
        try {
          setSavingPartialData(true);
          console.log('🔍 [ClientForm] Llamando a onSavePartial con datos:', formData);
          // Save the data for the current step
          const result = await onSavePartial(formData, currentStep);
          console.log(`🔍 [ClientForm] Datos guardados para sección ${currentStep}, resultado:`, result);
          
          // Update form data with the result to ensure consistency
          if (result) {
            setFormData(prevData => {
              const updatedData = { ...prevData, ...result };
              console.log('🔍 [ClientForm] Datos de formulario actualizados con el resultado:', updatedData);
              return updatedData;
            });
          }
        } catch (error) {
          console.error('Error al guardar datos parciales:', error);
          return; // No avanzamos si hay un error
        } finally {
          setSavingPartialData(false);
        }
      }
      
      // Avanzar al siguiente paso
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Submit form logic would go here
    try {
      await onSubmit(formData, documents);
    } catch (error: any) {
      console.error('Error submitting form:', error);
    }
  };

  // Fetch companies on component mount
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        setLoadingCompanies(true);
        const response = await executeQuery('SELECT id, name FROM companies ORDER BY name ASC');
        if (response && response.data) {
          setCompanies(response.data);
      }
    } catch (err) {
        console.error('Error fetching companies:', err);
    } finally {
        setLoadingCompanies(false);
      }
    };

    fetchCompanies();
  }, []);

  // Función para guardar y salir
  const handleSaveAndExit = async () => {
      if (onSavePartial) {
      try {
        setSavingPartialData(true);
        console.log('🔍 [ClientForm] Guardando datos antes de salir:', formData);
        await onSavePartial(formData, currentStep);
        console.log('🔍 [ClientForm] Datos guardados exitosamente');
        
        // Navegar a la lista de clientes
        navigate('/clients');
      } catch (error) {
        console.error('Error al guardar datos antes de salir:', error);
    } finally {
        setSavingPartialData(false);
      }
    }
  };

  // Render function for different steps
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold">Datos Personales</h3>
            
            {/* Company Selector */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">Empresa <span className="text-error">*</span></span>
              </label>
              <select
                name="company_id"
                value={formData.company_id || ''}
                onChange={handleCompanyChange}
                className={`select select-bordered w-full ${errors.company_id ? 'select-error' : ''}`}
                disabled={loadingCompanies}
              >
                <option value="">Seleccionar empresa</option>
                {companies.map(company => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
              {errors.company_id && <span className="text-error text-sm mt-1">{errors.company_id}</span>}
              {loadingCompanies && <span className="text-sm mt-1">Cargando empresas...</span>}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nombre y apellidos */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">Nombre(s) <span className="text-error">*</span></span>
              </label>
              <input
                type="text"
                name="first_name"
                className={`input input-bordered w-full ${errors.first_name ? 'input-error' : ''}`}
                value={formData.first_name || ''}
                onChange={handleChange}
                placeholder="Nombre(s)"
              />
              {errors.first_name && <span className="text-error text-sm mt-1">{errors.first_name}</span>}
            </div>
            
            <div className="form-control">
              <label className="label">
                <span className="label-text">Apellido Paterno <span className="text-error">*</span></span>
              </label>
              <input
                type="text"
                name="paternal_surname"
                className={`input input-bordered w-full ${errors.paternal_surname ? 'input-error' : ''}`}
                value={formData.paternal_surname || ''}
                onChange={handleChange}
                  placeholder="Apellido paterno"
              />
              {errors.paternal_surname && <span className="text-error text-sm mt-1">{errors.paternal_surname}</span>}
            </div>
            
            <div className="form-control">
              <label className="label">
                <span className="label-text">Apellido Materno</span>
              </label>
              <input
                type="text"
                name="maternal_surname"
                  className={`input input-bordered w-full ${errors.maternal_surname ? 'input-error' : ''}`}
                value={formData.maternal_surname || ''}
                onChange={handleChange}
                  placeholder="Apellido materno"
              />
                {errors.maternal_surname && <span className="text-error text-sm mt-1">{errors.maternal_surname}</span>}
            </div>
            
              {/* Email y teléfono */}
            <div className="form-control">
              <label className="label">
                  <span className="label-text">Email <span className="text-error">*</span></span>
              </label>
              <input
                type="email"
                name="email"
                className={`input input-bordered w-full ${errors.email ? 'input-error' : ''}`}
                value={formData.email || ''}
                onChange={handleChange}
                  placeholder="email@ejemplo.com"
              />
              {errors.email && <span className="text-error text-sm mt-1">{errors.email}</span>}
            </div>
            
            <div className="form-control">
              <label className="label">
                  <span className="label-text">Teléfono Móvil <span className="text-error">*</span></span>
              </label>
              <input
                type="tel"
                name="phone"
                  className={`input input-bordered w-full ${errors.phone ? 'input-error' : ''}`}
                value={formData.phone || ''}
                onChange={handleChange}
                  placeholder="55 1234 5678"
              />
                {errors.phone && <span className="text-error text-sm mt-1">{errors.phone}</span>}
            </div>
            
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Teléfono Fijo</span>
                </label>
                <input
                  type="tel"
                  name="home_phone"
                  className={`input input-bordered w-full ${errors.home_phone ? 'input-error' : ''}`}
                  value={formData.home_phone || ''}
                  onChange={handleChange}
                  placeholder="55 1234 5678"
                />
                {errors.home_phone && <span className="text-error text-sm mt-1">{errors.home_phone}</span>}
              </div>
              
              {/* Identificación */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">RFC</span>
              </label>
              <input
                type="text"
                name="rfc"
                className={`input input-bordered w-full ${errors.rfc ? 'input-error' : ''}`}
                value={formData.rfc || ''}
                onChange={handleChange}
                  placeholder="XXXX000000XXX"
              />
              {errors.rfc && <span className="text-error text-sm mt-1">{errors.rfc}</span>}
            </div>
            
            <div className="form-control">
              <label className="label">
                <span className="label-text">CURP</span>
              </label>
              <input
                type="text"
                name="curp"
                className={`input input-bordered w-full ${errors.curp ? 'input-error' : ''}`}
                value={formData.curp || ''}
                onChange={handleChange}
                  placeholder="XXXX000000XXXXXX00"
              />
              {errors.curp && <span className="text-error text-sm mt-1">{errors.curp}</span>}
            </div>
            
              {/* Datos demográficos */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">Fecha de Nacimiento</span>
              </label>
              <input
                type="date"
                name="birth_date"
                  className={`input input-bordered w-full ${errors.birth_date ? 'input-error' : ''}`}
                value={formData.birth_date || ''}
                onChange={handleChange}
              />
                {errors.birth_date && <span className="text-error text-sm mt-1">{errors.birth_date}</span>}
            </div>
            
            <div className="form-control">
              <label className="label">
                <span className="label-text">Género</span>
              </label>
              <select
                name="gender"
                  className={`select select-bordered w-full ${errors.gender ? 'select-error' : ''}`}
                value={formData.gender || ''}
                onChange={handleChange}
              >
                  <option value="">Seleccionar</option>
                <option value="masculino">Masculino</option>
                <option value="femenino">Femenino</option>
                <option value="otro">Otro</option>
                  <option value="no_especificado">Prefiero no especificar</option>
              </select>
                {errors.gender && <span className="text-error text-sm mt-1">{errors.gender}</span>}
            </div>
            
            <div className="form-control">
              <label className="label">
                <span className="label-text">Estado Civil</span>
              </label>
              <select
                name="marital_status"
                  className={`select select-bordered w-full ${errors.marital_status ? 'select-error' : ''}`}
                value={formData.marital_status || ''}
                onChange={handleChange}
              >
                  <option value="">Seleccionar</option>
                {MARITAL_STATUS_TYPES.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
                {errors.marital_status && <span className="text-error text-sm mt-1">{errors.marital_status}</span>}
            </div>
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Personas Dependientes</span>
                </label>
                <input
                  type="number"
                  name="dependent_persons"
                  className={`input input-bordered w-full ${errors.dependent_persons ? 'input-error' : ''}`}
                  value={formData.dependent_persons === undefined ? '' : formData.dependent_persons}
                  onChange={handleChange}
                  min="0"
                  placeholder="0"
                />
                {errors.dependent_persons && <span className="text-error text-sm mt-1">{errors.dependent_persons}</span>}
          </div>
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Estado de Nacimiento</span>
                </label>
                <input
                  type="text"
                  name="birth_state"
                  className={`input input-bordered w-full ${errors.birth_state ? 'input-error' : ''}`}
                  value={formData.birth_state || ''}
                  onChange={handleChange}
                  placeholder="Estado de nacimiento"
                />
                {errors.birth_state && <span className="text-error text-sm mt-1">{errors.birth_state}</span>}
              </div>
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Nacionalidad</span>
                </label>
                <input
                  type="text"
                  name="nationality"
                  className={`input input-bordered w-full ${errors.nationality ? 'input-error' : ''}`}
                  value={formData.nationality || ''}
                  onChange={handleChange}
                  placeholder="Mexicana"
                />
                {errors.nationality && <span className="text-error text-sm mt-1">{errors.nationality}</span>}
              </div>
            </div>
            
            {/* Información de cónyuge (solo si está casado) */}
            {formData.marital_status === 'casado' && (
              <div className="mt-4">
                <h4 className="text-md font-semibold mb-2">Información del Cónyuge</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Apellido Paterno del Cónyuge</span>
                    </label>
                    <input
                      type="text"
                      name="spouse_paternal_surname"
                      className="input input-bordered w-full"
                      value={formData.spouse_paternal_surname || ''}
                      onChange={handleChange}
                      placeholder="Apellido paterno del cónyuge"
                    />
                  </div>
                  
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Apellido Materno del Cónyuge</span>
                    </label>
                    <input
                      type="text"
                      name="spouse_maternal_surname"
                      className="input input-bordered w-full"
                      value={formData.spouse_maternal_surname || ''}
                      onChange={handleChange}
                      placeholder="Apellido materno del cónyuge"
                    />
                  </div>
                </div>
              </div>
            )}
            
            {/* Dirección */}
            <div className="mt-4">
              <h4 className="text-md font-semibold mb-2">Dirección</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Calle y Número</span>
                  </label>
                  <input
                    type="text"
                    name="address"
                    className={`input input-bordered w-full ${errors.address ? 'input-error' : ''}`}
                    value={formData.address || ''}
                    onChange={handleChange}
                    placeholder="Calle y número"
                  />
                  {errors.address && <span className="text-error text-sm mt-1">{errors.address}</span>}
                </div>
                
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Número Exterior</span>
                  </label>
                  <input
                    type="text"
                    name="street_number_ext"
                    className="input input-bordered w-full"
                    value={formData.street_number_ext || ''}
                    onChange={handleChange}
                    placeholder="123"
                  />
                </div>
                
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Número Interior</span>
                  </label>
                  <input
                    type="text"
                    name="street_number_int"
                    className="input input-bordered w-full"
                    value={formData.street_number_int || ''}
                    onChange={handleChange}
                    placeholder="A"
                  />
                </div>
                
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Colonia</span>
                  </label>
                  <input
                    type="text"
                    name="neighborhood"
                    className="input input-bordered w-full"
                    value={formData.neighborhood || ''}
                    onChange={handleChange}
                    placeholder="Colonia o fraccionamiento"
                  />
                </div>
                
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Ciudad</span>
                  </label>
                  <input
                    type="text"
                    name="city"
                    className={`input input-bordered w-full ${errors.city ? 'input-error' : ''}`}
                    value={formData.city || ''}
                    onChange={handleChange}
                    placeholder="Ciudad"
                  />
                  {errors.city && <span className="text-error text-sm mt-1">{errors.city}</span>}
                </div>
                
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Estado</span>
                  </label>
                  <input
                    type="text"
                    name="state"
                    className={`input input-bordered w-full ${errors.state ? 'input-error' : ''}`}
                    value={formData.state || ''}
                    onChange={handleChange}
                    placeholder="Estado"
                  />
                  {errors.state && <span className="text-error text-sm mt-1">{errors.state}</span>}
                </div>
                
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Código Postal</span>
                  </label>
                  <input
                    type="text"
                    name="postal_code"
                    className={`input input-bordered w-full ${errors.postal_code ? 'input-error' : ''}`}
                    value={formData.postal_code || ''}
                    onChange={handleChange}
                    placeholder="00000"
                  />
                  {errors.postal_code && <span className="text-error text-sm mt-1">{errors.postal_code}</span>}
                </div>
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Información Laboral</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Tipo de Empleo</span>
                </label>
                <select
                  name="employment_type"
                  value={formData.employment_type || ''}
                  onChange={handleChange}
                  className={`select select-bordered w-full ${errors.employment_type ? 'select-error' : ''}`}
                >
                  <option value="">Seleccionar</option>
                  {EMPLOYMENT_TYPES.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                {errors.employment_type && <span className="text-error text-sm mt-1">{errors.employment_type}</span>}
              </div>
              
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Años en Empleo Actual</span>
                </label>
                <input
                  type="number"
                  name="employment_years"
                  value={formData.employment_years === undefined ? '' : formData.employment_years}
                  onChange={handleChange}
                  className={`input input-bordered w-full ${errors.employment_years ? 'input-error' : ''}`}
                  placeholder="0"
                  min="0"
                  step="1"
                />
                {errors.employment_years && <span className="text-error text-sm mt-1">{errors.employment_years}</span>}
              </div>
              
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Puesto/Cargo</span>
                </label>
                <input
                  type="text"
                  name="job_position"
                  value={formData.job_position || ''}
                  onChange={handleChange}
                  className={`input input-bordered w-full ${errors.job_position ? 'input-error' : ''}`}
                  placeholder="Puesto o cargo"
                />
                {errors.job_position && <span className="text-error text-sm mt-1">{errors.job_position}</span>}
              </div>
              
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Nombre del Empleador</span>
                </label>
                <input
                  type="text"
                  name="employer_name"
                  value={formData.employer_name || ''}
                  onChange={handleChange}
                  className={`input input-bordered w-full ${errors.employer_name ? 'input-error' : ''}`}
                  placeholder="Nombre de la empresa"
                />
                {errors.employer_name && <span className="text-error text-sm mt-1">{errors.employer_name}</span>}
              </div>
              
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Teléfono del Empleador</span>
                </label>
                <input
                  type="tel"
                  name="employer_phone"
                  value={formData.employer_phone || ''}
                  onChange={handleChange}
                  className={`input input-bordered w-full ${errors.employer_phone ? 'input-error' : ''}`}
                  placeholder="55 1234 5678"
                />
                {errors.employer_phone && <span className="text-error text-sm mt-1">{errors.employer_phone}</span>}
              </div>
              
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Dirección del Empleador</span>
                </label>
                <input
                  type="text"
                  name="employer_address"
                  value={formData.employer_address || ''}
                  onChange={handleChange}
                  className={`input input-bordered w-full ${errors.employer_address ? 'input-error' : ''}`}
                  placeholder="Dirección de la empresa"
                />
                {errors.employer_address && <span className="text-error text-sm mt-1">{errors.employer_address}</span>}
              </div>
              
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Giro o Actividad</span>
                </label>
                <input
                  type="text"
                  name="employer_activity"
                  value={formData.employer_activity || ''}
                  onChange={handleChange}
                  className={`input input-bordered w-full ${errors.employer_activity ? 'input-error' : ''}`}
                  placeholder="Giro o actividad"
                />
                {errors.employer_activity && <span className="text-error text-sm mt-1">{errors.employer_activity}</span>}
              </div>
            </div>
            
            <h3 className="text-lg font-semibold mt-6">Información Financiera</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Ingreso Mensual</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2">$</span>
                <input
                  type="number"
                  name="monthly_income"
                    value={formData.monthly_income === undefined ? '' : formData.monthly_income}
                  onChange={handleChange}
                    className={`input input-bordered w-full pl-7 ${errors.monthly_income ? 'input-error' : ''}`}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
                </div>
                {errors.monthly_income && <span className="text-error text-sm mt-1">{errors.monthly_income}</span>}
              </div>
              
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Ingresos Adicionales</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2">$</span>
                <input
                  type="number"
                  name="additional_income"
                    value={formData.additional_income === undefined ? '' : formData.additional_income}
                  onChange={handleChange}
                    className={`input input-bordered w-full pl-7 ${errors.additional_income ? 'input-error' : ''}`}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
                </div>
                {errors.additional_income && <span className="text-error text-sm mt-1">{errors.additional_income}</span>}
              </div>
              
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Frecuencia de Ingresos</span>
                </label>
                <select
                  name="income_frequency"
                  value={formData.income_frequency || ''}
                  onChange={handleChange}
                  className={`select select-bordered w-full ${errors.income_frequency ? 'select-error' : ''}`}
                >
                  <option value="">Seleccionar</option>
                  {INCOME_FREQUENCY_TYPES.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                {errors.income_frequency && <span className="text-error text-sm mt-1">{errors.income_frequency}</span>}
              </div>
              
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Método de Pago Preferido</span>
                </label>
                <select
                  name="payment_method"
                  value={formData.payment_method || ''}
                  onChange={handleChange}
                  className={`select select-bordered w-full ${errors.payment_method ? 'select-error' : ''}`}
                >
                  <option value="">Seleccionar</option>
                  {PAYMENT_METHOD_TYPES.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                {errors.payment_method && <span className="text-error text-sm mt-1">{errors.payment_method}</span>}
              </div>
              
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Propósito del Crédito</span>
                </label>
                <select
                  name="credit_purpose"
                  value={formData.credit_purpose || ''}
                  onChange={handleChange}
                  className={`select select-bordered w-full ${errors.credit_purpose ? 'select-error' : ''}`}
                >
                  <option value="">Seleccionar</option>
                  {CREDIT_PURPOSE_TYPES.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                {errors.credit_purpose && <span className="text-error text-sm mt-1">{errors.credit_purpose}</span>}
              </div>
              
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Gastos Mensuales</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2">$</span>
                <input
                  type="number"
                  name="monthly_expenses"
                    value={formData.monthly_expenses === undefined ? '' : formData.monthly_expenses}
                  onChange={handleChange}
                    className={`input input-bordered w-full pl-7 ${errors.monthly_expenses ? 'input-error' : ''}`}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
                </div>
                {errors.monthly_expenses && <span className="text-error text-sm mt-1">{errors.monthly_expenses}</span>}
              </div>
              
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Pago de Hipoteca</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2">$</span>
                  <input
                    type="number"
                    name="mortgage_payment"
                    value={formData.mortgage_payment === undefined ? '' : formData.mortgage_payment}
                    onChange={handleChange}
                    className={`input input-bordered w-full pl-7 ${errors.mortgage_payment ? 'input-error' : ''}`}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
                {errors.mortgage_payment && <span className="text-error text-sm mt-1">{errors.mortgage_payment}</span>}
              </div>
              
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Pago de Renta</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2">$</span>
                  <input
                    type="number"
                    name="rent_payment"
                    value={formData.rent_payment === undefined ? '' : formData.rent_payment}
                    onChange={handleChange}
                    className={`input input-bordered w-full pl-7 ${errors.rent_payment ? 'input-error' : ''}`}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
                {errors.rent_payment && <span className="text-error text-sm mt-1">{errors.rent_payment}</span>}
              </div>
              
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Saldos de Otros Créditos</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2">$</span>
                <input
                  type="number"
                  name="other_loan_balances"
                    value={formData.other_loan_balances === undefined ? '' : formData.other_loan_balances}
                  onChange={handleChange}
                    className={`input input-bordered w-full pl-7 ${errors.other_loan_balances ? 'input-error' : ''}`}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
                </div>
                {errors.other_loan_balances && <span className="text-error text-sm mt-1">{errors.other_loan_balances}</span>}
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Datos de la Cuenta Bancaria</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Banco</span>
                </label>
                <input
                  type="text"
                  name="bank_name"
                  value={formData.bank_name || ''}
                  onChange={handleChange}
                  className={`input input-bordered w-full ${errors.bank_name ? 'input-error' : ''}`}
                  placeholder="Nombre del banco"
                />
                {errors.bank_name && <span className="text-error text-sm mt-1">{errors.bank_name}</span>}
              </div>
              
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">CLABE Interbancaria</span>
                </label>
                <input
                  type="text"
                  name="bank_clabe"
                  value={formData.bank_clabe || ''}
                  onChange={handleChange}
                  className={`input input-bordered w-full ${errors.bank_clabe ? 'input-error' : ''}`}
                  placeholder="18 dígitos"
                  maxLength={18}
                />
                {errors.bank_clabe && <span className="text-error text-sm mt-1">{errors.bank_clabe}</span>}
              </div>
              
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Número de Cuenta</span>
                </label>
                <input
                  type="text"
                  name="bank_account_number"
                  value={formData.bank_account_number || ''}
                  onChange={handleChange}
                  className={`input input-bordered w-full ${errors.bank_account_number ? 'input-error' : ''}`}
                  placeholder="Número de cuenta"
                />
                {errors.bank_account_number && <span className="text-error text-sm mt-1">{errors.bank_account_number}</span>}
              </div>
              
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Tipo de Cuenta</span>
                </label>
                <select
                  name="bank_account_type"
                  value={formData.bank_account_type || ''}
                  onChange={handleChange}
                  className={`select select-bordered w-full ${errors.bank_account_type ? 'select-error' : ''}`}
                >
                  <option value="">Seleccionar</option>
                  {BANK_ACCOUNT_TYPES.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                {errors.bank_account_type && <span className="text-error text-sm mt-1">{errors.bank_account_type}</span>}
              </div>
              
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text">Origen de la Cuenta</span>
                </label>
                <input
                  type="text"
                  name="bank_account_origin"
                  value={formData.bank_account_origin || ''}
                  onChange={handleChange}
                  className={`input input-bordered w-full ${errors.bank_account_origin ? 'input-error' : ''}`}
                  placeholder="Ej: Nómina, Personal"
                />
                {errors.bank_account_origin && <span className="text-error text-sm mt-1">{errors.bank_account_origin}</span>}
              </div>
            </div>
            
            <h3 className="text-lg font-semibold mt-6">Referencias</h3>
            
            <div>
              <h4 className="text-md font-medium mb-2">Referencia #1</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text">Nombre Completo</span>
                  </label>
                  <input
                    type="text"
                    name="reference1_name"
                    value={formData.reference1_name || ''}
                    onChange={handleChange}
                    className="input input-bordered w-full"
                    placeholder="Nombre de la referencia"
                  />
          </div>
                
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text">Relación/Parentesco</span>
                  </label>
                  <select
                    name="reference1_relationship"
                    value={formData.reference1_relationship || ''}
                    onChange={handleChange}
                    className="select select-bordered w-full"
                  >
                    <option value="">Seleccionar</option>
                    {RELATIONSHIP_TYPES.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text">Teléfono</span>
                  </label>
                  <input
                    type="tel"
                    name="reference1_phone"
                    value={formData.reference1_phone || ''}
                    onChange={handleChange}
                    className="input input-bordered w-full"
                    placeholder="55 1234 5678"
                  />
                </div>
                
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text">Dirección</span>
                  </label>
                  <input
                    type="text"
                    name="reference1_address"
                    value={formData.reference1_address || ''}
                    onChange={handleChange}
                    className="input input-bordered w-full"
                    placeholder="Dirección de la referencia"
                  />
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="text-md font-medium mb-2">Referencia #2</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text">Nombre Completo</span>
                  </label>
                  <input
                    type="text"
                    name="reference2_name"
                    value={formData.reference2_name || ''}
                    onChange={handleChange}
                    className="input input-bordered w-full"
                    placeholder="Nombre de la referencia"
                  />
                </div>
                
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text">Relación/Parentesco</span>
                  </label>
                  <select
                    name="reference2_relationship"
                    value={formData.reference2_relationship || ''}
                    onChange={handleChange}
                    className="select select-bordered w-full"
                  >
                    <option value="">Seleccionar</option>
                    {RELATIONSHIP_TYPES.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text">Teléfono</span>
                  </label>
                  <input
                    type="tel"
                    name="reference2_phone"
                    value={formData.reference2_phone || ''}
                    onChange={handleChange}
                    className="input input-bordered w-full"
                    placeholder="55 1234 5678"
                  />
                </div>
                
                <div className="form-control w-full">
                  <label className="label">
                    <span className="label-text">Dirección</span>
                  </label>
                  <input
                    type="text"
                    name="reference2_address"
                    value={formData.reference2_address || ''}
                    onChange={handleChange}
                    className="input input-bordered w-full"
                    placeholder="Dirección de la referencia"
                  />
                </div>
              </div>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Documentos</h3>
            <DocumentUploader 
              onDocumentAdded={handleDocumentAdded}
              onDocumentRemoved={handleDocumentRemoved}
              existingDocuments={documents}
              categories={DOCUMENT_CATEGORIES}
              existingServerDocuments={existingDocuments}
            />
          </div>
        );
      default:
        return null;
    }
  };
  
  return (
    <div className="p-4">
      <form onSubmit={handleSubmit}>
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-bold">
            {initialData?.id ? 'Editar Cliente' : 'Nuevo Cliente'}
          </h2>
            <div className="text-sm">
              Paso {currentStep} de 4
          </div>
        </div>
        
          <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
            <div 
              className="bg-blue-600 h-2.5 rounded-full" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
        
          {renderStep()}
          
        <div className="mt-8 flex justify-between">
              {currentStep > 1 && (
                <button 
                  type="button" 
                  onClick={prevStep}
              className="btn btn-outline"
              disabled={savingPartialData || isSubmitting}
                >
                  Anterior
                </button>
              )}
            
          <div className="flex space-x-2 ml-auto">
            {currentStep > 1 && currentStep < 4 && onSavePartial && (
              <button 
                type="button" 
                className="btn btn-outline btn-secondary"
                onClick={handleSaveAndExit}
                disabled={savingPartialData || isSubmitting}
              >
                {savingPartialData ? 'Guardando...' : 'Guardar y Salir'}
              </button>
            )}
              
              {currentStep < 4 ? (
                <button 
                  type="button" 
                onClick={nextStep}
                className="btn btn-primary"
                disabled={savingPartialData || isSubmitting}
              >
                {savingPartialData ? 'Guardando...' : 'Siguiente'}
                </button>
              ) : (
                <button 
                  type="submit" 
                className="btn btn-success"
                disabled={isSubmitting || savingPartialData}
                >
                {isSubmitting ? 'Guardando...' : 'Guardar Cliente'}
                </button>
              )}
            </div>
          </div>
        </form>
    </div>
  );
};

export default ClientForm; 