import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { getClientById, getClientApplications, Client, getClientFromAnySource, createMissingClient, getClientWithSync, getCanonicalClientId } from '../services/clientService';
import { getClientDocuments, getAllClientDocuments } from '../services/documentService';
import { PERMISSIONS } from '../utils/constants/permissions';
import { usePermissions } from '../contexts/PermissionsContext';
import { formatCurrency } from '../utils/formatters';
import { FiFile, FiDownload } from 'react-icons/fi';
import { supabase, getServiceClient } from '../lib/supabaseClient';
import { APPLICATION_STATUS, STATUS_LABELS } from '../utils/constants/statuses';
import { APPLICATION_TYPE_LABELS } from '../utils/constants/applications';
import { Document } from '../types/document';
import { TABLES } from '../utils/constants/tables';

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

// Helper badge color by status (same logic used in other modules)
const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case 'approved':
      return 'badge-success';
    case 'rejected':
      return 'badge-error';
    case 'pending':
    case 'in_review':
      return 'badge-warning';
    case 'por_dispersar':
      return 'badge-accent';
    case 'completed':
      return 'badge-primary';
    default:
      return 'badge-info';
  }
};

// Document interface that matches what's coming from the backend
interface Document {
  id: string;
  client_id?: string;
  application_id?: string;
  file_name: string;
  file_path: string;
  file_type?: string;
  file_size?: number;
  category?: string;
  created_at?: string;
  updated_at?: string;
  origin?: string;
}

// Document viewer component adapted from ApplicationDetail
const DocumentViewer = ({ document, onClose }: { document: Document, onClose: () => void }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const loadDocument = async () => {
      try {
        setLoading(true);
        setError(null);
        setImageError(false);
        setUrl(null); // Reset URL on new document

        if (!document.file_path) {
          throw new Error('El documento no tiene una ruta de archivo válida');
        }

        const fileExtension = document.file_path.split('.').pop()?.toLowerCase();
        console.log(`[DocViewer] Loading document. Extension: ${fileExtension}, Original file_type: ${document.file_type}, Path: ${document.file_path}`);

        const isImage = fileExtension && ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(fileExtension);
        const isPdf = fileExtension === 'pdf';

        const serviceClient = getServiceClient();
        
        let objectUrlToSet: string | null = null;

        if (isImage) {
          console.log(`[DocViewer] Document is an image. Attempting direct download and blob URL creation.`);
          const { data, error: downloadError } = await serviceClient.storage
            .from('client-documents')
            .download(document.file_path);

          if (downloadError || !data) {
            console.error('[DocViewer] Error downloading image data:', downloadError);
            throw new Error(`Error al descargar los datos de la imagen: ${downloadError?.message || 'Error desconocido'}`);
          }
          console.log(`[DocViewer] Image data downloaded successfully: ${data.size} bytes`);

          const mimeTypes: Record<string, string> = {
            'png': 'image/png', 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg',
            'gif': 'image/gif', 'webp': 'image/webp', 'bmp': 'image/bmp', 'svg': 'image/svg+xml'
          };
          const contentType = (fileExtension && mimeTypes[fileExtension]) || 'application/octet-stream';
          
          // Clean potential multipart boundaries by locating the PNG/JPEG header
          let cleanBlob: Blob;
          try {
            const arrBuffer = await data.arrayBuffer();
            const uint8 = new Uint8Array(arrBuffer);
            let startIndex = 0;
            // PNG signature
            const pngSig = [0x89, 0x50, 0x4E, 0x47];
            // JPG signature 0xFF,0xD8,0xFF
            const jpgSig = [0xFF, 0xD8, 0xFF];
            const checkSig = (sig:number[], offset:number) => sig.every((v,idx)=>uint8[offset+idx]===v);
            for(let i=0;i<uint8.length-4;i++){
              if(checkSig(pngSig,i) || checkSig(jpgSig,i)){
                startIndex=i;break;
              }
            }
            if(startIndex>0){
              console.log(`[DocViewer] Detected binary header at index ${startIndex}. Stripping multipart preamble.`);
              const slice = uint8.slice(startIndex);
              cleanBlob = new Blob([slice], {type: contentType});
            } else {
              cleanBlob = new Blob([uint8], {type: contentType});
            }
          } catch(cleanErr){
            console.error('[DocViewer] Error sanitizing image data, falling back to original blob', cleanErr);
            cleanBlob = new Blob([data], {type: contentType});
          }
          objectUrlToSet = URL.createObjectURL(cleanBlob);
          console.log(`[DocViewer] Sanitized Blob URL for image created: ${objectUrlToSet.substring(0, 50)}...`);

        } else if (isPdf) {
          console.log(`[DocViewer] Document is a PDF. Downloading for sanitation.`);
          const { data, error: downloadError } = await serviceClient.storage
            .from('client-documents')
            .download(document.file_path);

          if (downloadError || !data) {
            console.error('[DocViewer] Error downloading PDF data:', downloadError);
            throw new Error(`Error al descargar los datos del PDF: ${downloadError?.message || 'Error desconocido'}`);
          }
          console.log(`[DocViewer] PDF data downloaded successfully: ${data.size} bytes`);

          // Sanitize multipart preamble by finding '%PDF-'
          let cleanPdfBlob: Blob;
          try {
            const arrBuffer = await data.arrayBuffer();
            const uint8 = new Uint8Array(arrBuffer);
            let startIndex = 0;
            const pdfSig = [0x25, 0x50, 0x44, 0x46, 0x2D]; // '%PDF-'
            const checkSig = (offset:number) => pdfSig.every((v,idx)=>uint8[offset+idx]===v);
            for(let i=0;i<uint8.length-5;i++){
              if(checkSig(i)){startIndex=i;break;}
            }
            if(startIndex>0){
              console.log(`[DocViewer] Detected PDF header at index ${startIndex}. Stripping multipart preamble.`);
              const slice = uint8.slice(startIndex);
              cleanPdfBlob = new Blob([slice], { type: 'application/pdf' });
            } else {
              cleanPdfBlob = new Blob([uint8], { type: 'application/pdf' });
            }
          } catch(pdfSanErr){
            console.error('[DocViewer] Error sanitizing PDF, using original data', pdfSanErr);
            cleanPdfBlob = new Blob([data], { type: 'application/pdf' });
          }

          objectUrlToSet = URL.createObjectURL(cleanPdfBlob);
          console.log(`[DocViewer] Sanitized Blob URL for PDF created: ${objectUrlToSet.substring(0,50)}...`);
        } else {
          // For other file types, primarily for download. Try public URL.
          console.log(`[DocViewer] Document is other type. Trying public URL for download purposes.`);
           const { data: publicUrlData } = await serviceClient.storage
            .from('client-documents')
            .getPublicUrl(document.file_path);
          if (publicUrlData?.publicUrl) {
            objectUrlToSet = publicUrlData.publicUrl;
             console.log(`[DocViewer] Public URL for other file type: ${objectUrlToSet}`);
          } else {
            // Fallback for other types if needed for direct download link, though less common for viewing
            console.log(`[DocViewer] Public URL for other type not available. Downloading for blob URL (for download attribute).`);
            const { data, error: downloadError } = await serviceClient.storage
              .from('client-documents')
              .download(document.file_path);
            if (downloadError || !data) {
               console.error('[DocViewer] Error downloading other file data:', downloadError);
               throw new Error(`Error al descargar el archivo: ${downloadError?.message || 'Error desconocido'}`);
            }
            const contentType = document.file_type || 'application/octet-stream';
            const blob = new Blob([data], { type: contentType });
            objectUrlToSet = URL.createObjectURL(blob);
            console.log(`[DocViewer] Blob URL for other file type created: ${objectUrlToSet.substring(0,50)}...`);
          }
        }
        
        setUrl(objectUrlToSet);

      } catch (err) {
        console.error('[DocViewer] General error in loadDocument:', err);
        setError(err instanceof Error ? err.message : 'Error al cargar el documento');
      } finally {
        setLoading(false);
      }
    };

    loadDocument();

    return () => {
      if (url && url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
        console.log('[DocViewer] Blob URL revoked:', url.substring(0,50));
      }
    };
  // IMPORTANT: Add document.id to dependencies to reload when a NEW document is selected,
  // not just when the file_path of the *same* document object changes (which is less likely).
  }, [document.id, document.file_path]); // Ensuring reload for new documents

  const fileExtension = document.file_path?.split('.').pop()?.toLowerCase();
  const isImage = fileExtension && ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(fileExtension);
  const isPdf = fileExtension === 'pdf';

  const handleDownload = () => {
    if (!url) return;
    const a = window.document.createElement('a');
    a.href = url;
    a.download = document.file_name || 'documento';
    // Forcing download, even for public URLs that might try to render inline
    // For blob URLs, this is standard. For public image URLs, this ensures download.
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
    console.log(`[DocViewer] Download initiated for: ${document.file_name}, URL: ${url.substring(0,50)}`);
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.error(`[DocViewer] Error loading image in <img> tag. SRC: ${e.currentTarget.src.substring(0,100)}...`);
    setImageError(true);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                    {document.file_name}
                  </h3>
                  <div className="flex gap-2">
                    {/* Download button */}
                    <button 
                      onClick={handleDownload} 
                      className="p-2 rounded-full hover:bg-gray-100"
                      disabled={!url || url === '#'}
                      title="Descargar documento"
                    >
                      <FiDownload className="text-gray-600" />
                    </button>
                    {/* Close button */}
                    <button 
                      onClick={onClose} 
                      className="p-2 rounded-full hover:bg-gray-100"
                      title="Cerrar"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                {/* Content area */}
                <div className="w-full">
                  {loading ? (
                    <div className="flex justify-center items-center py-16">
                      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
                    </div>
                  ) : error ? (
                    <div className="text-center py-16">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <p className="text-gray-700">{error}</p>
                      <button 
                        onClick={handleDownload} 
                        className="mt-4 px-4 py-2 bg-primary text-white rounded hover:bg-blue-700"
                        disabled={!url || url === '#'}
                      >
                        Intentar descargar de todos modos
                      </button>
                    </div>
                  ) : isImage && url && !imageError ? (
                    <div className="flex justify-center items-center overflow-auto max-h-[80vh]">
                      <img 
                        src={url} 
                        alt={document.file_name || 'Documento'} 
                        className="max-w-full h-auto object-contain"
                        onError={handleImageError} 
                      />
                    </div>
                  ) : isPdf && url ? (
                    <div className="w-full h-[80vh]">
                      <iframe 
                        src={`${url}#toolbar=0`} 
                        className="w-full h-full" 
                        title={document.file_name || 'Documento PDF'}
                      />
                    </div>
                  ) : (
                    <div className="text-center py-16">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-gray-700 mb-4">Este tipo de documento no se puede previsualizar.</p>
                      {url && url !== '#' && (
                        <button 
                          onClick={handleDownload} 
                          className="px-4 py-2 bg-primary text-white rounded hover:bg-blue-700"
                        >
                          Descargar documento
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ClientDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { userCan } = usePermissions();
  
  const [client, setClient] = useState<Client | null>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loadingClient, setLoadingClient] = useState(true);
  const [loadingApplications, setLoadingApplications] = useState(true);
  const [loadingDocuments, setLoadingDocuments] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applicationError, setApplicationError] = useState<string | null>(null);
  const [documentsError, setDocumentsError] = useState<string | null>(null);
  const [warnMessage, setWarnMessage] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState('info');
  const [originFilter, setOriginFilter] = useState<'all' | 'general' | 'application'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [docSortField, setDocSortField] = useState<'file_name' | 'category' | 'origin' | 'created_at' | 'file_size'>('created_at');
  const [docSortDirection, setDocSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Estado para el visor de documentos
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  
  // Unique categories for filter dropdown
  const documentCategories = useMemo(() => {
    const set = new Set<string>();
    documents.forEach(d => { if (d.category) set.add(d.category); });
    return Array.from(set);
  }, [documents]);
  
  // Helper to filter docs
  const getFilteredDocuments = () => {
    return documents.filter(doc => {
      if (originFilter === 'general' && doc.application_id) return false;
      if (originFilter === 'application' && !doc.application_id) return false;
      if (categoryFilter !== 'all') {
        const cat = doc.category || 'sin_categoria';
        if (cat !== categoryFilter) return false;
      }
      return true;
    });
  };
  
  // Helper to sort docs
  const getSortedDocuments = () => {
    const filtered = getFilteredDocuments();
    const arr = [...filtered];
    arr.sort((a,b) => {
      let aVal: any;
      let bVal: any;
      if (docSortField === 'origin') {
        aVal = a.application_id ? 'Solicitud' : 'General';
        bVal = b.application_id ? 'Solicitud' : 'General';
      } else {
        aVal = (a as any)[docSortField];
        bVal = (b as any)[docSortField];
      }
      if (aVal === null || aVal === undefined) aVal = '';
      if (bVal === null || bVal === undefined) bVal = '';
      if (typeof aVal !== 'number') aVal = String(aVal).toLowerCase();
      if (typeof bVal !== 'number') bVal = String(bVal).toLowerCase();
      if (docSortDirection === 'asc') return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
    });
    return arr;
  };
  
  // Fetch data when component mounts
  useEffect(() => {
    fetchClientData();
  }, [id]);
  
  // Fetch client data based on the ID
  const fetchClientData = async () => {
    if (!id) {
      setError('No se proporcionó un ID de cliente válido');
      setLoadingClient(false);
      setTimeout(() => {
        navigate('/clients');
      }, 2000);
      return;
    }

    try {
      setLoadingClient(true);
      setLoadingApplications(true);
      setLoadingDocuments(true);
      setError(null);
      setWarnMessage(null);

      console.log(`[ClientDetail] Fetching data for client ID: ${id}`);
      
      // Simplificado: Cargar directamente el cliente con el ID proporcionado
      // Omitimos la verificación de ID canónico para evitar redirecciones
      const client = await getClientWithSync(id);

      if (client) {
        console.log(`[ClientDetail] Client found: ${client.id}`);
        setClient(client);
        
        // Fetch associated applications
        try {
          const apps = await getClientApplications(id);
          if (apps && apps.length > 0) {
            console.log(`[ClientDetail] Found ${apps.length} applications for client`);
            setApplications(apps);
          } else {
            console.log(`[ClientDetail] No applications found for client`);
          }
        } catch (appError) {
          console.error(`[ClientDetail] Error fetching applications: ${appError}`);
          setApplicationError(`Error al cargar las solicitudes: ${appError}`);
        } finally {
          setLoadingApplications(false);
        }
        
        // Fetch documents
        try {
          console.log(`[ClientDetail] Intentando cargar documentos para el cliente con ID: ${id}`);
          const docs = await getAllClientDocuments(id);
          console.log(`[ClientDetail] Respuesta de getAllClientDocuments:`, JSON.stringify(docs));
          if (docs && docs.length > 0) {
            console.log(`[ClientDetail] Found ${docs.length} documents for client`);
            setDocuments(docs);
          } else {
            console.log(`[ClientDetail] No documents found for client. Verificando tabla...`);
            // Verificar si hay documentos en la tabla documents para este cliente
            const serviceClient = getServiceClient();
            try {
              const { data, error } = await serviceClient
                .from(TABLES.DOCUMENTS)
                .select('count(*)')
                .eq('client_id', id);
              console.log(`[ClientDetail] Verificación directa de documentos:`, JSON.stringify(data), error);
            } catch (verifyError) {
              console.error(`[ClientDetail] Error verificando tabla documents: ${verifyError}`);
            }
          }
        } catch (docError) {
          console.error(`[ClientDetail] Error fetching documents: ${docError}`);
          setDocumentsError(`Error al cargar los documentos: ${docError}`);
        } finally {
          setLoadingDocuments(false);
        }
      } else {
        setError(`No se encontró el cliente con ID: ${id}`);
        // Redirect back to clients list after showing error for a moment
        setTimeout(() => navigate('/clients'), 3000);
      }
    } catch (error: any) {
      console.error(`[ClientDetail] Error fetching client data: ${error.message || error}`);
      setError(`Error al cargar los datos del cliente: ${error.message || 'Error desconocido'}`);
    } finally {
      setLoadingClient(false);
      // Make sure loading indicators are cleared even if there's an error
      if (setLoadingApplications) setLoadingApplications(false);
      if (setLoadingDocuments) setLoadingDocuments(false);
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

  // Función para cerrar el visor de documentos
  const handleCloseDocumentViewer = () => {
    setSelectedDocument(null);
  };

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
          
          {client && id && userCan(PERMISSIONS.EDIT_CLIENT) && (
            <Link to={`/clients/${id}/edit`} className="btn btn-primary">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
              Editar Cliente
            </Link>
          )}
        </div>

        {loadingClient ? (
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
              <SectionTab id="info" label="Información Personal" isActive={activeSection === 'info'} />
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
              {activeSection === 'info' && (
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
                    {id && userCan(PERMISSIONS.CREATE_APPLICATION) && (
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
                      {id && userCan(PERMISSIONS.CREATE_APPLICATION) && (
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
                          {applications
                              .filter(app => app.application_type === 'selected_plans')
                              .map((app, idx) => (
                            <tr key={app.id || idx} className="hover">
                              <td>{app.id ? `${String(app.id).substring(0,8)}...` : 'N/D'}</td>
                              <td>
                                {formatDate(app.created_at)}
                              </td>
                              <td>{APPLICATION_TYPE_LABELS[app.application_type] || app.application_type}</td>
                              <td>{app.amount ? formatCurrency(Number(app.amount)) : '-'}</td>
                              <td>
                                <span className={`badge ${getStatusBadgeClass(app.status)}`}>
                                  {STATUS_LABELS[app.status as keyof typeof STATUS_LABELS] || app.status}
                                </span>
                              </td>
                              <td>
                                {app.id ? (
                                  <Link to={`/applications/${String(app.id)}`} className="btn btn-xs btn-info">
                                    Ver
                                  </Link>
                                ) : (
                                  <span className="text-gray-400">N/D</span>
                                )}
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
                  </div>

                  {/* Filtro y ordenación */}
                  {documents.length > 0 && !loadingDocuments && !documentsError && (
                    <div className="flex flex-col md:flex-row gap-4 mb-4">
                      <div className="form-control w-full md:w-1/4">
                        <label className="label"><span className="label-text">Origen</span></label>
                        <select
                          className="select select-bordered"
                          value={originFilter}
                          onChange={(e) => setOriginFilter(e.target.value as any)}
                        >
                          <option value="all">Todos</option>
                          <option value="general">Generales</option>
                          <option value="application">Solicitudes</option>
                        </select>
                      </div>

                      <div className="form-control w-full md:w-1/4">
                        <label className="label"><span className="label-text">Categoría</span></label>
                        <select
                          className="select select-bordered"
                          value={categoryFilter}
                          onChange={(e) => setCategoryFilter(e.target.value)}
                        >
                          <option value="all">Todas</option>
                          {documentCategories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {loadingDocuments ? (
                    <div className="flex justify-center items-center py-8">
                      <span className="loading loading-spinner loading-md"></span>
                    </div>
                  ) : documentsError ? (
                    <div className="alert alert-error">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{documentsError}</span>
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
                            <th onClick={() => {
                              const field: any = 'file_name';
                              if (docSortField === field) {
                                setDocSortDirection(docSortDirection === 'asc' ? 'desc' : 'asc');
                              } else {
                                setDocSortField(field);
                                setDocSortDirection('asc');
                              }
                            }} className="cursor-pointer">
                              <div className="flex items-center">Nombre {docSortField === 'file_name' && <span className="ml-1">{docSortDirection === 'asc' ? '↑' : '↓'}</span>}</div>
                            </th>
                            <th onClick={() => {
                              const field: any = 'category';
                              if (docSortField === field) {
                                setDocSortDirection(docSortDirection === 'asc' ? 'desc' : 'asc');
                              } else {
                                setDocSortField(field);
                                setDocSortDirection('asc');
                              }
                            }} className="cursor-pointer">
                              <div className="flex items-center">Categoría {docSortField === 'category' && <span className="ml-1">{docSortDirection === 'asc' ? '↑' : '↓'}</span>}</div>
                            </th>
                            <th onClick={() => {
                              const field: any = 'origin';
                              if (docSortField === 'origin') {
                                setDocSortDirection(docSortDirection === 'asc' ? 'desc' : 'asc');
                              } else {
                                setDocSortField('origin');
                                setDocSortDirection('asc');
                              }
                            }} className="cursor-pointer">
                              <div className="flex items-center">Origen {docSortField === 'origin' && <span className="ml-1">{docSortDirection === 'asc' ? '↑' : '↓'}</span>}</div>
                            </th>
                            <th onClick={() => {
                              const field: any = 'created_at';
                              if (docSortField === field) {
                                setDocSortDirection(docSortDirection === 'asc' ? 'desc' : 'asc');
                              } else {
                                setDocSortField(field);
                                setDocSortDirection('asc');
                              }
                            }} className="cursor-pointer">
                              <div className="flex items-center">Fecha {docSortField === 'created_at' && <span className="ml-1">{docSortDirection === 'asc' ? '↑' : '↓'}</span>}</div>
                            </th>
                            <th onClick={() => {
                              const field: any = 'file_size';
                              if (docSortField === field) {
                                setDocSortDirection(docSortDirection === 'asc' ? 'desc' : 'asc');
                              } else {
                                setDocSortField(field);
                                setDocSortDirection('asc');
                              }
                            }} className="cursor-pointer">
                              <div className="flex items-center">Tamaño {docSortField === 'file_size' && <span className="ml-1">{docSortDirection === 'asc' ? '↑' : '↓'}</span>}</div>
                            </th>
                            <th>Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getSortedDocuments().map((doc) => (
                            <tr key={doc.id || `doc-${Math.random()}`}>
                              <td className="flex items-center gap-2">
                                <FiFile className="text-primary" />
                                {doc.file_name || 'Documento sin nombre'}
                              </td>
                              <td>{doc.category || 'No especificada'}</td>
                              <td>{doc.application_id ? 'Solicitud' : 'General'}</td>
                              <td>{formatDate(doc.created_at)}</td>
                              <td>{formatFileSize(doc.file_size || 0)}</td>
                              <td className="flex gap-2">
                                {doc.file_path ? (
                                  <>
                                    <button 
                                      onClick={() => setSelectedDocument(doc)}
                                      className="btn btn-sm btn-primary btn-outline"
                                      title="Ver documento"
                                    >
                                      Ver
                                    </button>
                                  </>
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

                  {/* Visor de documentos */}
                  {selectedDocument && (
                    <DocumentViewer 
                      document={selectedDocument} 
                      onClose={handleCloseDocumentViewer} 
                    />
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

        {warnMessage && (
          <div className="alert alert-warning shadow-lg mb-6">
            <div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="stroke-current flex-shrink-0 h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <span>{warnMessage}</span>
            </div>
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