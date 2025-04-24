import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { getClientById, getClientApplications, Client } from '../services/clientService';
import { getClientDocuments } from '../services/documentService';
import { PERMISSIONS } from '../utils/constants/permissions';
import { usePermissions } from '../contexts/PermissionsContext';
import { formatCurrency } from '../utils/formatters';
import { FiFile, FiDownload } from 'react-icons/fi';
import { supabase } from '../lib/supabaseClient';

// Constantes para mapear valores de códigos a nombres legibles
const GENDER_TYPES = [
  { value: 'masculino', label: 'Masculino' },
  { value: 'femenino', label: 'Femenino' },
  { value: 'otro', label: 'Otro' },
  { value: 'prefiero_no_decir', label: 'Prefiero no decir' },
];

const MARITAL_STATUS_TYPES = [
  { value: 'soltero', label: 'Soltero/a' },
  { value: 'casado', label: 'Casado/a' },
  { value: 'divorciado', label: 'Divorciado/a' },
  { value: 'viudo', label: 'Viudo/a' },
  { value: 'union_libre', label: 'Unión Libre' },
];

const EMPLOYMENT_TYPES = [
  { value: 'empleado', label: 'Empleado' },
  { value: 'autonomo', label: 'Autónomo / Freelance' },
  { value: 'empresario', label: 'Empresario' },
  { value: 'jubilado', label: 'Jubilado' },
  { value: 'desempleado', label: 'Desempleado' },
  { value: 'estudiante', label: 'Estudiante' },
  { value: 'otro', label: 'Otro' },
];

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

const PAYMENT_METHOD_TYPES = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'tarjeta', label: 'Tarjeta de Crédito/Débito' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'domiciliacion', label: 'Domiciliación Bancaria' },
];

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

const BANK_ACCOUNT_TYPES = [
  { value: 'nomina', label: 'Nómina' },
  { value: 'ahorro', label: 'Ahorro' },
  { value: 'cheques', label: 'Cheques' },
  { value: 'inversiones', label: 'Inversiones' },
];

const RELATIONSHIP_TYPES = [
  { value: 'familiar', label: 'Familiar' },
  { value: 'amigo', label: 'Amigo' },
  { value: 'companero_trabajo', label: 'Compañero de Trabajo' },
  { value: 'vecino', label: 'Vecino' },
  { value: 'otro', label: 'Otro' },
];

// Función auxiliar para obtener label a partir de value
const getLabelForValue = (array: { value: string, label: string }[], value?: string) => {
  if (!value) return '-';
  const item = array.find(item => item.value === value);
  return item ? item.label : value;
};

// Formatear fecha
const formatDate = (dateString?: string) => {
  if (!dateString) return '-';
  try {
    return new Date(dateString).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (e) {
    return dateString;
  }
};

const ClientDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userCan } = usePermissions();
  const [client, setClient] = useState<Client | null>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingDocuments, setLoadingDocuments] = useState<boolean>(true);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>('personal');

  useEffect(() => {
    if (id) {
      fetchClientData(id);
      fetchClientDocuments(id);
    }
  }, [id]);

  const fetchClientData = async (clientId: string) => {
    try {
      setLoading(true);
      const clientData = await getClientById(clientId);
      setClient(clientData);

      const applicationsData = await getClientApplications(clientId);
      setApplications(applicationsData);
      
      setError(null);
    } catch (err) {
      console.error('Error fetching client data:', err);
      setError('No se pudieron cargar los datos del cliente. Por favor intente nuevamente.');
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
      setDocuments(documentsData || []);
      setDocumentError(null);
    } catch (err) {
      console.error('Error fetching client documents:', err);
      setDocumentError('No se pudieron cargar los documentos del cliente.');
    } finally {
      setLoadingDocuments(false);
    }
  };

  // Helper function to get a downloadable URL for a document
  const getDocumentDownloadUrl = async (filePath: string) => {
    try {
      if (!filePath) {
        console.warn('No file path provided for document download');
        return '#';
      }
      
      // Try first with client-documents bucket
      let { data } = await supabase.storage
        .from('client-documents')
        .getPublicUrl(filePath);
      
      if (!data?.publicUrl) {
        // If not found, try the documents bucket
        ({ data } = await supabase.storage
          .from('documents')
          .getPublicUrl(filePath));
      }
      
      return data?.publicUrl || '#';
    } catch (error) {
      console.error('Error getting document URL:', error);
      return '#';
    }
  };

  // Componente para campo individual
  const FieldItem = ({ label, value }: { label: string, value: any }) => (
    <div className="mb-3">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="font-medium">{value || '-'}</p>
    </div>
  );

  // Componente para renderizar secciones
  const SectionTab = ({ id, label, isActive }: { id: string, label: string, isActive: boolean }) => (
    <button 
      onClick={() => setActiveSection(id)}
      className={`px-4 py-2 font-medium text-sm rounded-t-lg ${
        isActive 
          ? 'bg-white text-primary border-b-2 border-primary' 
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      {label}
    </button>
  );

  return (
    <MainLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/clients')} 
              className="btn btn-sm btn-outline"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              Volver a Clientes
            </button>
            {client && (
              <h1 className="text-2xl font-bold">
                {client.first_name} {client.paternal_surname} {client.maternal_surname}
              </h1>
            )}
          </div>
          
          {client && userCan(PERMISSIONS.EDIT_CLIENT) && (
            <Link to={`/clients/${id}/edit`} className="btn btn-primary">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
              Editar Cliente
            </Link>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : error ? (
          <div className="alert alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        ) : client ? (
          <div className="space-y-6">
            {/* Pestañas de navegación */}
            <div className="flex space-x-1 overflow-x-auto pb-1">
              <SectionTab id="personal" label="Información Personal" isActive={activeSection === 'personal'} />
              <SectionTab id="contact" label="Contacto y Dirección" isActive={activeSection === 'contact'} />
              <SectionTab id="employment" label="Empleo" isActive={activeSection === 'employment'} />
              <SectionTab id="financial" label="Información Financiera" isActive={activeSection === 'financial'} />
              <SectionTab id="family" label="Información Familiar" isActive={activeSection === 'family'} />
              <SectionTab id="banking" label="Datos Bancarios" isActive={activeSection === 'banking'} />
              <SectionTab id="references" label="Referencias" isActive={activeSection === 'references'} />
              <SectionTab id="applications" label="Solicitudes" isActive={activeSection === 'applications'} />
              <SectionTab id="documents" label="Documentos" isActive={activeSection === 'documents'} />
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              {/* Información personal básica */}
              {activeSection === 'personal' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Datos Básicos</h3>
                    <FieldItem label="Nombre Completo" value={`${client.first_name || ''} ${client.paternal_surname || ''} ${client.maternal_surname || ''}`} />
                    <FieldItem label="Nombre(s)" value={client.first_name} />
                    <FieldItem label="Apellido Paterno" value={client.paternal_surname} />
                    <FieldItem label="Apellido Materno" value={client.maternal_surname} />
                    <FieldItem label="Fecha de Nacimiento" value={formatDate(client.birth_date)} />
                    <FieldItem label="Estado de Nacimiento" value={client.birth_state} />
                    <FieldItem label="Nacionalidad" value={client.nationality} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Identificación</h3>
                    <FieldItem label="RFC" value={client.rfc} />
                    <FieldItem label="CURP" value={client.curp} />
                    <FieldItem label="Género" value={getLabelForValue(GENDER_TYPES, client.gender)} />
                    <FieldItem label="Estado Civil" value={getLabelForValue(MARITAL_STATUS_TYPES, client.marital_status)} />
                    <FieldItem label="Personas Dependientes" value={client.dependent_persons} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Información del Sistema</h3>
                    <FieldItem label="ID del Cliente" value={client.id} />
                    <FieldItem label="Fecha de Registro" value={formatDate(client.created_at)} />
                    <FieldItem label="Último Acceso" value={formatDate(client.last_login)} />
                    <FieldItem label="ID de Empresa" value={client.company_id} />
                    <FieldItem label="ID de Asesor" value={client.advisor_id} />
                  </div>
                </div>
              )}

              {/* Contacto y dirección */}
              {activeSection === 'contact' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Contacto</h3>
                    <FieldItem label="Email" value={client.email} />
                    <FieldItem label="Teléfono Móvil" value={client.phone} />
                    <FieldItem label="Teléfono Fijo" value={client.home_phone} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Dirección</h3>
                    <FieldItem label="Dirección" value={client.address} />
                    <FieldItem label="Número Exterior" value={client.street_number_ext} />
                    <FieldItem label="Número Interior" value={client.street_number_int} />
                    <FieldItem label="Colonia" value={client.neighborhood} />
                    <FieldItem label="Ciudad" value={client.city} />
                    <FieldItem label="Estado" value={client.state} />
                    <FieldItem label="Código Postal" value={client.postal_code} />
                  </div>
                </div>
              )}

              {/* Información de empleo */}
              {activeSection === 'employment' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Datos Laborales</h3>
                    <FieldItem label="Tipo de Empleo" value={getLabelForValue(EMPLOYMENT_TYPES, client.employment_type)} />
                    <FieldItem label="Años de Empleo" value={client.employment_years} />
                    <FieldItem label="Puesto/Cargo" value={client.job_position} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Información del Empleador</h3>
                    <FieldItem label="Nombre del Empleador" value={client.employer_name} />
                    <FieldItem label="Teléfono del Empleador" value={client.employer_phone} />
                    <FieldItem label="Dirección del Empleador" value={client.employer_address} />
                    <FieldItem label="Actividad del Empleador" value={client.employer_activity} />
                  </div>
                </div>
              )}

              {/* Información financiera */}
              {activeSection === 'financial' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Ingresos</h3>
                    <FieldItem 
                      label="Ingreso Mensual" 
                      value={client.monthly_income ? formatCurrency(client.monthly_income) : '-'} 
                    />
                    <FieldItem 
                      label="Ingreso Adicional" 
                      value={client.additional_income ? formatCurrency(client.additional_income) : '-'} 
                    />
                    <FieldItem 
                      label="Frecuencia de Ingresos" 
                      value={getLabelForValue(INCOME_FREQUENCY_TYPES, client.income_frequency)} 
                    />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Gastos</h3>
                    <FieldItem 
                      label="Gastos Mensuales" 
                      value={client.monthly_expenses ? formatCurrency(client.monthly_expenses) : '-'} 
                    />
                    <FieldItem 
                      label="Pago de Hipoteca" 
                      value={client.mortgage_payment ? formatCurrency(client.mortgage_payment) : '-'} 
                    />
                    <FieldItem 
                      label="Pago de Renta" 
                      value={client.rent_payment ? formatCurrency(client.rent_payment) : '-'} 
                    />
                    <FieldItem 
                      label="Saldo de Otros Préstamos" 
                      value={client.other_loan_balances ? formatCurrency(client.other_loan_balances) : '-'} 
                    />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Preferencias Financieras</h3>
                    <FieldItem 
                      label="Método de Pago Preferido" 
                      value={getLabelForValue(PAYMENT_METHOD_TYPES, client.payment_method)} 
                    />
                    <FieldItem 
                      label="Propósito de Crédito" 
                      value={getLabelForValue(CREDIT_PURPOSE_TYPES, client.credit_purpose)} 
                    />
                  </div>
                </div>
              )}

              {/* Información familiar */}
              {activeSection === 'family' && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Información del Cónyuge</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FieldItem label="Apellido Paterno del Cónyuge" value={client.spouse_paternal_surname} />
                    <FieldItem label="Apellido Materno del Cónyuge" value={client.spouse_maternal_surname} />
                  </div>
                </div>
              )}

              {/* Información bancaria */}
              {activeSection === 'banking' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Datos Bancarios</h3>
                    <FieldItem label="Nombre del Banco" value={client.bank_name} />
                    <FieldItem label="CLABE Interbancaria" value={client.bank_clabe} />
                    <FieldItem label="Número de Cuenta" value={client.bank_account_number} />
                    <FieldItem 
                      label="Tipo de Cuenta" 
                      value={getLabelForValue(BANK_ACCOUNT_TYPES, client.bank_account_type)} 
                    />
                    <FieldItem label="Origen de la Cuenta" value={client.bank_account_origin} />
                  </div>
                </div>
              )}

              {/* Referencias */}
              {activeSection === 'references' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Primera Referencia</h3>
                    <FieldItem label="Nombre" value={client.reference1_name} />
                    <FieldItem 
                      label="Relación" 
                      value={getLabelForValue(RELATIONSHIP_TYPES, client.reference1_relationship)} 
                    />
                    <FieldItem label="Dirección" value={client.reference1_address} />
                    <FieldItem label="Teléfono" value={client.reference1_phone} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Segunda Referencia</h3>
                    <FieldItem label="Nombre" value={client.reference2_name} />
                    <FieldItem 
                      label="Relación" 
                      value={getLabelForValue(RELATIONSHIP_TYPES, client.reference2_relationship)} 
                    />
                    <FieldItem label="Dirección" value={client.reference2_address} />
                    <FieldItem label="Teléfono" value={client.reference2_phone} />
                  </div>
                </div>
              )}

              {/* Solicitudes */}
              {activeSection === 'applications' && (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Solicitudes del Cliente</h3>
                    {userCan(PERMISSIONS.CREATE_APPLICATION) && (
                      <Link to={`/applications/new?client=${id}`} className="btn btn-sm btn-primary">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                        Nueva Solicitud
                      </Link>
                    )}
                  </div>
                  
                  {!applications || applications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-gray-500 mb-4">Este cliente no tiene solicitudes registradas.</p>
                      {userCan(PERMISSIONS.CREATE_APPLICATION) && (
                        <Link to={`/applications/new?client=${id}`} className="btn btn-primary">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                          </svg>
                          Crear Solicitud
                        </Link>
                      )}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="table w-full">
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Fecha</th>
                            <th>Tipo</th>
                            <th>Monto</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {applications.map(app => (
                            <tr key={app.id} className="hover">
                              <td>{app.id.substring(0, 8)}...</td>
                              <td>
                                {formatDate(app.created_at)}
                              </td>
                              <td>{app.application_type}</td>
                              <td>{app.amount ? formatCurrency(app.amount) : '-'}</td>
                              <td>
                                <span className={`badge ${
                                  app.status === 'approved' ? 'badge-success' :
                                  app.status === 'rejected' ? 'badge-error' :
                                  app.status === 'in_review' ? 'badge-warning' :
                                  'badge-info'
                                }`}>
                                  {app.status}
                                </span>
                              </td>
                              <td>
                                <Link to={`/applications/${app.id}`} className="btn btn-xs btn-info">
                                  Ver
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}

              {/* Documents Section */}
              {activeSection === 'documents' && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Documentos del Cliente</h3>
                    {userCan(PERMISSIONS.EDIT_CLIENT) && (
                      <Link to={`/clients/edit/${id}`} className="btn btn-sm btn-primary">
                        Gestionar Documentos
                      </Link>
                    )}
                  </div>

                  {loadingDocuments ? (
                    <div className="flex justify-center items-center py-8">
                      <span className="loading loading-spinner loading-md"></span>
                    </div>
                  ) : documentError ? (
                    <div className="alert alert-error">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{documentError}</span>
                    </div>
                  ) : documents.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">No hay documentos asociados a este cliente.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="table w-full">
                        <thead>
                          <tr>
                            <th>Nombre</th>
                            <th>Categoría</th>
                            <th>Fecha de subida</th>
                            <th>Tamaño</th>
                            <th>Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {documents.map((doc) => (
                            <tr key={doc.id || `doc-${Math.random()}`}>
                              <td className="flex items-center gap-2">
                                <FiFile className="text-primary" />
                                {doc.file_name || 'Documento sin nombre'}
                              </td>
                              <td>{doc.category || 'No especificada'}</td>
                              <td>{formatDate(doc.created_at)}</td>
                              <td>{formatFileSize(doc.file_size || 0)}</td>
                              <td>
                                {doc.file_path ? (
                                  <button 
                                    onClick={async () => {
                                      const url = await getDocumentDownloadUrl(doc.file_path);
                                      window.open(url, '_blank');
                                    }}
                                    className="btn btn-sm btn-ghost"
                                    title="Descargar documento"
                                  >
                                    <FiDownload />
                                  </button>
                                ) : (
                                  <span className="text-gray-400" title="Documento sin ruta de archivo">
                                    <FiDownload />
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="alert alert-warning">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Cliente no encontrado.</span>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

// Helper function to format file sizes
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default ClientDetail; 