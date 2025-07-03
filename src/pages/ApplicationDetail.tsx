import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { 
  getApplicationById, 
  Application as ApplicationType, 
  getApprovalStatus, 
  approveByAdvisor, 
  approveByCompany,
  cancelCompanyApproval,
  updateApplicationStatus,
  ApplicationStatus,
  markAsDispersed,
  getApplicationHistory
} from '../services/applicationService';
import { usePermissions } from '../contexts/PermissionsContext';
import { PERMISSIONS } from '../utils/constants/permissions';
import { useAuth } from '../contexts/AuthContext';
import Alert from '../components/ui/Alert';
import { STATUS_LABELS } from '../utils/constants/statuses';
import { APPLICATION_TYPE_LABELS } from '../utils/constants/applications';
import { APPLICATION_STATUS } from '../utils/constants/statuses';
import { TABLES } from '../utils/constants/tables';
import { useNotifications, NotificationType } from '../contexts/NotificationContext';
import { formatDate } from '../utils/formatters';
import ClientProfileButton from '../components/ClientProfileButton';
import { Document, getApplicationDocuments, uploadDocument } from '../services/documentService';
import DocumentUploader from '../components/documents/DocumentUploader';
import { supabase, getServiceClient } from '../lib/supabaseClient';
import RequestSignatureButton from '../components/RequestSignatureButton';
import DocumentSignatureStatus from '../components/DocumentSignatureStatus';
import DocuSignPanel from '../components/DocuSignPanel';
import CommentSection from '../components/comments/CommentSection';

// Helper function for status badge styling - moved outside component so it's accessible to all components
const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case 'approved':
      return 'badge-success';
    case 'rejected':
      return 'badge-error';
    case 'pending':
    case 'in_review':
      return 'badge-warning';
    case 'cancelled':
      return 'badge-secondary';
    case 'completed':
      return 'badge-primary';
    case 'solicitud':
    case 'new':
      return 'badge-info';
    case 'por_dispersar':
      return 'badge-accent';
    default:
      return 'badge-secondary';
  }
};

// Helper function to check if an application is for product financing
const isProductFinancing = (application: ApplicationType | null): boolean => {
  if (!application) return false;
  
  // Check if financing_type is specifically 'producto'
  if (application.financing_type === 'producto') return true;
  
  // Additional checks for product-related fields
  if (application.product_url || application.product_title || application.product_image) return true;
  
  return false;
};

// Interfaces para estados de aprobación
interface ApprovalStatus {
  isFullyApproved: boolean;
  approvedByAdvisor: boolean;
  approvedByCompany: boolean;
  approvalDateAdvisor?: string;
  approvalDateCompany?: string;
  advisorStatus?: string;
  companyStatus?: string;
  globalStatus?: string;
}

// Define interface for history items
interface HistoryItem {
  id: string;
  application_id: string;
  status: string;
  comment: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  user_id?: string;
  user_name?: string;
  user_email?: string;
  user_role?: string;
}

// Define interfaces for document handling
interface DocumentFile {
  id?: string;
  file: File;
  category: string;
  name: string;
}

// Helper function for formatting file sizes
const formatFileSize = (bytes: number = 0): string => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Document viewer component for ApplicationDetail
const DocumentViewer = ({ document, onClose }: { document: Document, onClose: () => void }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  // const { addNotification } = useNotifications(); // Not used currently

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
    if (isImage && url.startsWith('http')) { // If it's a public URL for an image
        // To ensure download for images from public URLs that might render inline
        // We can fetch it and convert to blob, then download, or rely on 'download' attribute
        // The 'download' attribute should be sufficient for modern browsers
    }
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
    console.log(`[DocViewer] Download initiated for: ${document.file_name}, URL: ${url.substring(0,50)}`);
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.error(`[DocViewer] Error loading image in <img> tag. SRC: ${e.currentTarget.src.substring(0,100)}...`);
    setImageError(true);
    // Potentially set an error message here if needed, or rely on the generic error state
    setError("No se pudo mostrar la imagen. Intente descargarla.");
  };
  
  // Debug: Log current URL and imageError state
  console.log(`[DocViewer] Rendering. URL: ${url ? url.substring(0,50) : 'null'}, ImageError: ${imageError}, Loading: ${loading}, Error: ${error}`);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl flex flex-col h-[90vh]">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold">{document.file_name || 'Documento'}</h3>
          <div className="flex gap-2">
            <button 
              className="btn btn-sm btn-outline"
              onClick={handleDownload}
              disabled={!url || loading} // Disable if no URL or still loading
            >
              Descargar
            </button>
            <button 
              className="btn btn-sm btn-circle"
              onClick={onClose}
            >
              ✕
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto p-4 bg-gray-100">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full">
              <span className="loading loading-spinner loading-lg"></span>
              <p className="mt-4 text-gray-600">Cargando documento...</p>
            </div>
          ) : error ? ( // This 'error' is the general loading error or image specific if set by handleImageError
            <div className="flex flex-col items-center justify-center h-full bg-red-50 rounded-lg p-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h3 className="text-lg font-medium text-red-800 mt-4">Error al Cargar Documento</h3>
              <p className="text-red-600 mt-2 text-center">{error}</p>
              {url && ( // Offer download if a URL (even problematic) was generated
                <button 
                  className="btn btn-sm btn-outline btn-error mt-4"
                  onClick={handleDownload}
                >
                  Intentar Descargar
                </button>
              )}
            </div>
          ) : (
            <>
              {isImage && url && !imageError ? (
                <div className="flex items-center justify-center h-full bg-gray-800 rounded">
                  <img 
                    src={url} 
                    alt={document.file_name || 'Imagen'} 
                    className="max-w-full max-h-full object-contain"
                    onError={handleImageError} // This will set imageError and trigger re-render
                  />
                </div>
              ) : isImage && imageError ? ( // Specific UI for when <img> onError was triggered
                 <div className="flex flex-col items-center justify-center h-full bg-yellow-50 rounded-lg p-6">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <h3 className="text-lg font-medium text-yellow-800 mt-4">Error al Visualizar la Imagen</h3>
                  <p className="text-yellow-600 mt-2 text-center">No se pudo mostrar la imagen directamente.</p>
                  <div className="flex gap-2 mt-4">
                    <button 
                      className="btn btn-sm btn-warning"
                      onClick={handleDownload} // Universal download should work
                    >
                      Descargar Imagen
                    </button>
                     {url && url.startsWith('http') && ( // Offer to open public URL if it was one
                        <a 
                          className="btn btn-sm btn-outline"
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Abrir URL Directa
                        </a>
                      )}
                  </div>
                </div>
              ) : isPdf && url ? (
                <iframe 
                  src={url} 
                  className="w-full h-full border-0"
                  title={document.file_name || 'PDF'}
                ></iframe>
              ) : url ? ( // Other file types or fallback if not image/pdf but URL exists
                <div className="flex flex-col items-center justify-center h-full bg-gray-50 rounded-lg p-6">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-800 mt-4">Documento No Previsualizable</h3>
                  <p className="text-gray-600 mt-2 text-center">Este tipo de documento no se puede mostrar aquí.</p>
                  <div className="flex gap-2 mt-4">
                    <button 
                      className="btn btn-sm btn-primary"
                      onClick={handleDownload}
                    >
                      Descargar Documento
                    </button>
                     {url && url.startsWith('http') && (
                        <a 
                          className="btn btn-sm btn-outline"
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Abrir URL Directa
                        </a>
                      )}
                  </div>
                </div>
              ) : ( // Fallback if no URL could be generated at all
                <div className="flex flex-col items-center justify-center h-full">
                  <p className="text-gray-600">No se pudo generar una vista previa del documento.</p>
                   {document.file_path && // Offer direct download using Supabase path if all else fails
                    <a 
                      href={`https://ydnygntfkrleiseuciwq.supabase.co/storage/v1/object/public/client-documents/${document.file_path}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-sm btn-outline mt-2"
                    >
                      Intentar Abrir Directo (Supabase)
                    </a>
                  }
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const ApplicationDetail = () => {
  console.log('React at start', React); // Diagnostic log to check for shadowing
  
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addNotification, showPopup } = useNotifications();
  const [application, setApplication] = useState<ApplicationType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus | null>(null);
  const [approving, setApproving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { shouldFilterByEntity, getEntityFilter, userCan, isAdvisor, isCompanyAdmin } = usePermissions();
  
  // Add state for history
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  
  // Agregar estado para paginación de historial
  const [historyPage, setHistoryPage] = useState(1);
  const [historyHasMore, setHistoryHasMore] = useState(false);
  const HISTORY_ITEMS_PER_PAGE = 10; // Mostrar 10 ítems por página
  
  // Agregar estado para filtrado de historial
  const [historyFilter, setHistoryFilter] = useState('all');
  const [filteredHistory, setFilteredHistory] = useState<HistoryItem[]>([]);
  
  // Agregar estado para filtro de usuario
  const [userFilter, setUserFilter] = useState('all');
  
  // Estado para manejo de documentos
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<DocumentFile | null>(null);
  
  // State for document viewer
  const [viewingDocument, setViewingDocument] = useState<Document | null>(null);
  
  // Estado para refrescar la lista de documentos firmados
  const [refreshSignatures, setRefreshSignatures] = useState<number>(0);
  
  // Función auxiliar para construir el estado de aprobación localmente si es necesario
  const buildApprovalStatus = (app: ApplicationType): ApprovalStatus => {
    return {
      approvedByAdvisor: app.approved_by_advisor === true,
      approvedByCompany: app.approved_by_company === true,
      approvalDateAdvisor: app.approval_date_advisor,
      approvalDateCompany: app.approval_date_company,
      isFullyApproved: app.approved_by_advisor === true && app.approved_by_company === true,
      advisorStatus: app.advisor_status,
      companyStatus: app.company_status,
      globalStatus: app.global_status || app.status
    };
  };
  
  // Function to load application history
  const loadApplicationHistory = async (page = 1) => {
    if (!id) return;
    
    try {
      setLoadingHistory(true);
      setHistoryError(null);
      
      const entityFilter = shouldFilterByEntity() ? getEntityFilter() : null;
      console.log(`[ApplicationDetail] Loading history page ${page} for application ${id}`);
      const historyData = await getApplicationHistory(id, entityFilter, page, HISTORY_ITEMS_PER_PAGE);
      
      if (historyData && Array.isArray(historyData)) {
        // Los datos ya vienen filtrados por ID de aplicación desde el servicio
        console.log(`[ApplicationDetail] Loaded ${historyData.length} history items for application ${id}`);
        
        // Ordenar por fecha decreciente (más reciente primero)
        const sortedHistory = [...historyData].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        
        // Si es la primera página, reemplazar la historia; si no, añadir
        setHistory(page === 1 ? sortedHistory : [...history, ...sortedHistory]);
        
        // Hay más páginas si recibimos el número exacto de elementos por página
        setHistoryHasMore(historyData.length === HISTORY_ITEMS_PER_PAGE);
        setHistoryPage(page);
      } else {
        if (page === 1) {
          setHistory([]);
        }
        setHistoryHasMore(false);
      }
    } catch (err) {
      console.error('Error loading application history:', err);
      setHistoryError(err instanceof Error ? err.message : 'Error al cargar el historial de la solicitud');
    } finally {
      setLoadingHistory(false);
    }
  };
  
  // Cargar más entradas del historial
  const loadMoreHistory = () => {
    if (historyHasMore && !loadingHistory) {
      loadApplicationHistory(historyPage + 1);
    }
  };
  
  // Filtrar historial cuando cambia history, historyFilter o userFilter
  useEffect(() => {
    if (history.length > 0) {
      let filtered = [...history];
      
      // Aplicar filtros según el tipo seleccionado
      if (historyFilter === 'status') {
        filtered = filtered.filter(item => 
          item.comment.toLowerCase().includes('estado cambiado') || 
          item.comment.toLowerCase().includes('cambio de estado')
        );
      } else if (historyFilter === 'approval') {
        filtered = filtered.filter(item => 
          item.comment.toLowerCase().includes('aprob') || 
          item.status.toLowerCase() === 'approved' ||
          item.comment.toLowerCase().includes('por dispersar')
        );
      }
      
      // Aplicar filtro por tipo de usuario
      if (userFilter !== 'all') {
        filtered = filtered.filter(item => {
          // Detectar el tipo de usuario según el comentario o el rol explícito
          const userRole = item.user_role?.toLowerCase() || '';
          const comment = item.comment?.toLowerCase() || '';
          
          if (userFilter === 'advisor') {
            return userRole.includes('advisor') || 
                  userRole.includes('asesor') ||
                  comment.includes('por asesor');
          } else if (userFilter === 'company') {
            return userRole.includes('company') || 
                   userRole.includes('empresa') ||
                   comment.includes('por empresa') ||
                   comment.includes('por administrador de empresa');
          } else if (userFilter === 'admin') {
            return userRole.includes('admin') && 
                   !userRole.includes('company') ||
                   comment.includes('por administrador');
          }
          return false;
        });
      }
      
      setFilteredHistory(filtered);
    } else {
      setFilteredHistory([]);
    }
  }, [history, historyFilter, userFilter]);
  
  // Function to load application documents
  const loadApplicationDocuments = async () => {
    if (!id) return;
    
    try {
      setLoadingDocuments(true);
      setDocumentError(null);
      
      const docsData = await getApplicationDocuments(id);
      
      if (docsData && Array.isArray(docsData)) {
        console.log(`[ApplicationDetail] Loaded ${docsData.length} documents for application ${id}`);
        setDocuments(docsData);
      } else {
        setDocuments([]);
      }
    } catch (err) {
      console.error('Error loading application documents:', err);
      setDocumentError(err instanceof Error ? err.message : 'Error al cargar los documentos de la solicitud');
    } finally {
      setLoadingDocuments(false);
    }
  };
  
  // Function to handle document selection
  const handleDocumentSelected = (doc: DocumentFile) => {
    setSelectedDocument(doc);
    setDocumentError(null);
  };
  
  // Function to handle document upload
  const handleUploadDocument = async () => {
    if (!id || !user || !selectedDocument || !selectedDocument.file) {
      setDocumentError('Información incompleta para subir el documento');
      return;
    }
    
    try {
      setUploadingDocument(true);
      setDocumentError(null);
      
      const file = selectedDocument.file;
      
      // Get file extension to determine content type
      const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
      let contentType = file.type;
      
      if (!contentType || contentType === 'application/octet-stream') {
        const mimeTypes: Record<string, string> = {
          'pdf': 'application/pdf',
          'png': 'image/png',
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'gif': 'image/gif',
          'webp': 'image/webp',
          'doc': 'application/msword',
          'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'xls': 'application/vnd.ms-excel',
          'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'txt': 'text/plain',
          'csv': 'text/csv'
        };
        
        contentType = fileExtension in mimeTypes ? mimeTypes[fileExtension] : 'application/octet-stream';
      }
      
      console.log(`Subiendo documento: ${file.name}, tipo: ${contentType}, tamaño: ${formatFileSize(file.size)}`);
      
      const uploadedDoc = await uploadDocument({
        file,
        userId: user.id,
        documentName: selectedDocument.name || file.name,
        category: selectedDocument.category,
        application_id: id,
        client_id: application?.client_id,
        contentType
      });
      
      setSelectedDocument(null);
      setSuccessMessage(`Documento "${uploadedDoc.file_name}" subido exitosamente`);
      setIsUploadModalOpen(false);
      
      // Reload documents
      await loadApplicationDocuments();
    } catch (error) {
      console.error('Error al subir documento:', error);
      setDocumentError(error instanceof Error ? error.message : 'Error al subir el documento');
    } finally {
      setUploadingDocument(false);
    }
  };
  
  // Function to load all data
  const loadApplicationData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Validar que el ID tenga un formato válido de UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!id || !uuidRegex.test(id)) {
        throw new Error('ID de solicitud inválido');
      }
      
      const entityFilter = shouldFilterByEntity() ? getEntityFilter() : null;
      const data = await getApplicationById(id, entityFilter);
      
      // Debug log para client_id
      console.log(`[ApplicationDetail] Client ID for application ${id}:`, {
        client_id: data.client_id,
        hasClientId: !!data.client_id,
        client_name: data.client_name
      });
      
      setApplication(data);
      
      // Obtener estado de aprobación
      const approvalData = await getApprovalStatus(id, entityFilter);
      // Only set approval status if we got a valid response
      if (approvalData) {
        setApprovalStatus(approvalData);
      } else {
        setApprovalStatus(buildApprovalStatus(data));
      }
      
      // Load application history
      await loadApplicationHistory();
      
      // Load application documents
      await loadApplicationDocuments();
    } catch (err) {
      console.error('Error al cargar la solicitud:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar los datos de la solicitud');
      
      // Mostrar notificación de error
      showPopup({
        title: 'Solicitud no encontrada',
        message: 'No se pudo encontrar la solicitud especificada. Es posible que haya sido eliminada o que no tengas permisos para verla.',
        type: NotificationType.ERROR,
        playSound: true,
        soundType: 'alert'
      });
      
      // Redirigir al listado de aplicaciones después de 3 segundos
      setTimeout(() => {
        navigate('/applications');
      }, 3000);
    } finally {
      setLoading(false);
    }
  };
  
  // Reload history after status changes
  const reloadHistoryAfterStatusChange = async () => {
    await loadApplicationHistory();
  };

  useEffect(() => {
    loadApplicationData();
  }, [id, showPopup, navigate]);
  
  // Función para aprobar como asesor
  const handleAdvisorApproval = async () => {
    if (!id || !user || !application) return;
    
    try {
      setApproving(true);
      setError(null);
      
      const entityFilter = shouldFilterByEntity() ? getEntityFilter() : null;
      const result = await approveByAdvisor(
        id, 
        'Solicitud aprobada por el asesor', 
        user.id,
        entityFilter
      );
      
      // Recargar datos para asegurar que tenemos la info más actualizada
      await loadApplicationData();
      
      // Si ambos han aprobado, mostrar mensaje adicional
      if (approvalStatus?.approvedByCompany) {
        setSuccessMessage('¡Aprobación completa! La solicitud ha sido aprobada por ambas partes.');
      } else {
        setSuccessMessage('Solicitud aprobada correctamente como asesor');
      }
      
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      console.error('Error approving as advisor:', error);
      setError(`Error al aprobar: ${error.message || 'Error desconocido'}`);
    } finally {
      setApproving(false);
    }
  };
  
  // Función para aprobar como empresa
  const handleCompanyApproval = async () => {
    if (!id || !user || !application) return;
    
    try {
      setApproving(true);
      setError(null);
      
      const entityFilter = shouldFilterByEntity() ? getEntityFilter() : null;
      
      if (!entityFilter?.company_id) {
        throw new Error('No tienes una empresa asociada para realizar esta aprobación');
      }
      
      const result = await approveByCompany(
        id, 
        'Solicitud aprobada por la empresa', 
        user.id,
        entityFilter.company_id,
        entityFilter
      );
      
      // Recargar datos para asegurar que tenemos la info más actualizada
      await loadApplicationData();
      
      // Si ambos han aprobado, mostrar mensaje adicional
      if (approvalStatus?.approvedByAdvisor) {
        setSuccessMessage('¡Aprobación completa! La solicitud ha sido aprobada por ambas partes.');
      } else {
        setSuccessMessage('Solicitud aprobada correctamente como empresa');
      }
      
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      console.error('Error approving as company:', error);
      setError(`Error al aprobar: ${error.message || 'Error desconocido'}`);
    } finally {
      setApproving(false);
    }
  };
  
  // Función para deshacer la aprobación de empresa
  const handleCancelCompanyApproval = async () => {
    if (!id || !user || !application) return;
    
    try {
      setApproving(true);
      setError(null);
      
      const entityFilter = shouldFilterByEntity() ? getEntityFilter() : null;
      
      if (!entityFilter?.company_id) {
        throw new Error('No tienes una empresa asociada para realizar esta acción');
      }
      
      await cancelCompanyApproval(
        id, 
        'Aprobación cancelada por la empresa', 
        user.id,
        entityFilter.company_id,
        entityFilter
      );
      
      // Recargar datos para asegurar que tenemos la info más actualizada
      await loadApplicationData();
      
      setSuccessMessage('Aprobación de empresa cancelada correctamente');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      console.error('Error canceling approval:', error);
      setError(`Error al cancelar aprobación: ${error.message || 'Error desconocido'}`);
    } finally {
      setApproving(false);
    }
  };
  
  // Función para cambiar estado
  const handleStatusChange = async (newStatus: ApplicationStatus) => {
    if (!id || !user || !application) return;
    
    try {
      setApproving(true);
      setError(null);
      
      const entityFilter = shouldFilterByEntity() ? getEntityFilter() : null;
      const statusText = STATUS_LABELS[newStatus as keyof typeof STATUS_LABELS] || newStatus;
      
      // Si un administrador de empresa está cambiando el estado a "En revisión",
      // primero limpiamos su aprobación
      if (isCompanyAdmin() && newStatus === APPLICATION_STATUS.IN_REVIEW && approvalStatus?.approvedByCompany) {
        console.log("Quitando aprobación de empresa antes de cambiar el estado");
        
        // Ejecutar consulta SQL para quitar la aprobación
        const query = `
          UPDATE ${TABLES.APPLICATIONS}
          SET approved_by_company = false, 
              approval_date_company = NULL,
              status = '${APPLICATION_STATUS.IN_REVIEW}'
          WHERE id = '${id}' AND company_id = '${entityFilter?.company_id}'
          RETURNING *
        `;
        
        try {
          // Ejecutar la consulta directamente usando executeQuery
          const response = await fetch('http://localhost:3100/query', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query }),
          });
          
          const result = await response.json();
          console.log("Resultado de quitar aprobación:", result);
          
          if (result.error) {
            throw new Error(`Error al quitar aprobación: ${result.error}`);
          }
          
          console.log("✅ Aprobación de empresa removida correctamente");
          
          // Recargar los datos completos
          await loadApplicationData();
          
          setSuccessMessage(`Aprobación de empresa removida y solicitud actualizada a "${statusText}"`);
          setTimeout(() => setSuccessMessage(null), 3000);
          setApproving(false);
          return;
        } catch (error) {
          console.error("Error al quitar aprobación:", error);
          // Continuamos con el flujo normal si hay un error
        }
      }
      
      // Flujo normal para otros casos
      await updateApplicationStatus(
        id,
        newStatus,
        `Cambio de estado a ${statusText} desde vista detalle`,
        user.id,
        entityFilter
      );
      
      // Recargar datos completos
      await loadApplicationData();
      
      // Mostrar mensaje de éxito
      setSuccessMessage(`Solicitud actualizada correctamente a "${statusText}"`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      console.error('Error updating application status:', error);
      setError(`Error al actualizar el estado: ${error.message || 'Error desconocido'}`);
    } finally {
      setApproving(false);
    }
  };
  
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('es-MX', {
      style: 'currency',
      currency: 'MXN'
    });
  };
  
  // Devuelve etiqueta legible para frecuencia de pago
  const getPaymentFrequencyLabel = (freq: string | null | undefined): string => {
    if (!freq) return '';
    const normalized = freq.toLowerCase();
    switch (normalized) {
      case 'monthly':
        return 'meses';
      case 'biweekly':
      case 'quincenal':
      case 'fortnightly':
        return 'quincenas';
      case 'weekly':
        return 'semanas';
      default:
        return normalized; // Devuelve como está si no se reconoce
    }
  };
  
  // Obtener la etiqueta legible para el tipo de aplicación
  const getProductTypeLabel = (type: string | null | undefined): string => {
    if (!type) return 'N/A';
    
    // Normalizar el tipo a minúsculas para comparación
    const normalizedType = type.toLowerCase();
    
    // Mapeo para valores comunes
    const typeMappings: Record<string, string> = {
      'selected_plans': 'Crédito a Plazos',
      'product_simulations': 'Simulación',
      'auto_loan': 'Crédito Auto',
      'car_backed_loan': 'Crédito con Garantía',
      'personal_loan': 'Préstamo Personal',
      'cash_advance': 'Adelanto de Efectivo'
    };
    
    // Buscar una coincidencia parcial
    for (const [key, value] of Object.entries(typeMappings)) {
      if (normalizedType.includes(key) || key.includes(normalizedType)) {
        return value;
      }
    }
    
    // Si no hay coincidencia, retornar el valor original con formato
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  
  // Verificar si la solicitud está totalmente aprobada
  const isFullyApproved = approvalStatus?.approvedByAdvisor && approvalStatus?.approvedByCompany;
  
  // Helper function to get timeline badge class based on status
  const getTimelineBadgeClass = (status: string) => {
    const baseClass = 'w-4 h-4 rounded-full ring-4 ring-white dark:ring-gray-900';
    
    switch (status.toLowerCase()) {
      case 'new':
      case 'solicitud':
        return `${baseClass} bg-blue-500`;
      case 'in_review':
        return `${baseClass} bg-purple-500`;
      case 'approved':
        return `${baseClass} bg-green-500`;
      case 'rejected':
        return `${baseClass} bg-red-500`;
      case 'por_dispersar':
        return `${baseClass} bg-accent`;
      case 'completed':
        return `${baseClass} bg-primary`;
      case 'cancelled':
        return `${baseClass} bg-gray-500`;
      default:
        return `${baseClass} bg-gray-400`;
    }
  };
  
  // 1. Add state for active tab
  const [activeTab, setActiveTab] = useState('historial'); // Cambiado de 'documentos' a 'historial'
  
  if (!userCan(PERMISSIONS.VIEW_APPLICATIONS)) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-700">Acceso Restringido</h2>
            <p className="text-gray-500 mt-2">No tienes permisos para ver esta página.</p>
          </div>
        </div>
      </MainLayout>
    );
  }
  
  return (
    <MainLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Detalle de Solicitud</h1>
          <div className="space-x-2">
            <Link to="/applications" className="btn btn-ghost">
              Volver
            </Link>
            {application && userCan(PERMISSIONS.EDIT_APPLICATION) && (
              <Link to={`/applications/${id}/edit`} className="btn btn-primary">
                Editar
              </Link>
            )}
          </div>
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
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : application ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              
              {/* --- COLUMNA IZQUIERDA --- */}
              <div className="md:col-span-3 flex flex-col gap-6">
                {/* 1. Detalles de la Solicitud */}
                <div className="card bg-base-100 shadow-xl">
                  <div className="card-body">
                    <h2 className="card-title text-lg border-b pb-2 mb-4">Información de la Solicitud</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">ID de Solicitud</p>
                        <p className="font-medium">{application.id}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-500">Fecha de Creación</p>
                        <p className="font-medium">{formatDate(application.created_at, 'short')}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-500">Estado</p>
                        <p>
                          <span className={`badge ${getStatusBadgeClass(application.status)}`}>
                            {STATUS_LABELS[application.status as keyof typeof STATUS_LABELS] || application.status}
                          </span>
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-500">Monto Solicitado</p>
                        <p className="font-medium">{formatCurrency(application.credito_solicitado || application.amount || 0)}</p>
                      </div>

                      {application.term && (
                        <div>
                          <p className="text-sm text-gray-500">Plazo</p>
                          <p className="font-medium">
                            {application.term}{' '}
                            {getPaymentFrequencyLabel(application.payment_frequency) || 'periodos'}
                          </p>
                        </div>
                      )}

                      {application.interest_rate && (
                        <div>
                          <p className="text-sm text-gray-500">Tasa de Interés</p>
                          <p className="font-medium">{application.interest_rate}%</p>
                        </div>
                      )}

                      {application.monthly_payment && (
                        <div>
                          <p className="text-sm text-gray-500">Pago Mensual</p>
                          <p className="font-medium">{formatCurrency(application.monthly_payment)}</p>
                        </div>
                      )}

                      {application.financing_type && (
                        <div>
                          <p className="text-sm text-gray-500">Tipo de Financiamiento</p>
                          <p className="font-medium flex items-center">
                            {application.financing_type === 'producto' ? (
                              <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                </svg>
                                Financiamiento de Producto
                              </>
                            ) : application.financing_type === 'personal' ? (
                              <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
                                </svg>
                                Crédito Personal
                              </>
                            ) : (
                              application.financing_type
                            )}
                          </p>
                        </div>
                      )}

                      {application.product_type && (
                        <div>
                          <p className="text-sm text-gray-500">Tipo de Producto</p>
                          <p className="font-medium">{getProductTypeLabel(application.product_type)}</p>
                        </div>
                      )}

                      {application.dispersal_date && (
                        <div>
                          <p className="text-sm text-gray-500">Fecha de Dispersión</p>
                          <p className="font-medium">{formatDate(application.dispersal_date, 'short')}</p>
                        </div>
                      )}
                    </div>

                    {isProductFinancing(application) && (
                      <div className="mt-6 pt-4 border-t">
                        <h3 className="font-semibold mb-4 flex items-center">
                          <span>Detalles del Producto</span>
                          {application.financing_type === 'producto' && (
                            <span className="badge badge-primary ml-2 text-xs">Financiamiento de Producto</span>
                          )}
                        </h3>
                        {application.financing_type === 'producto' ? (
                          (!application.product_title && !application.product_url && !application.product_image) ? (
                            <div className="p-4 bg-blue-50 rounded-lg">
                              <div className="flex items-start">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mr-2 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div>
                                  <p className="text-blue-800 font-medium">Información del producto no disponible</p>
                                  <p className="text-blue-600 text-sm mt-1">Esta solicitud está marcada como financiamiento de producto pero no contiene datos específicos del producto.</p>
                                </div>
                              </div>
                              <div className="mt-4">
                                <p className="text-sm text-gray-700">Monto del Financiamiento</p>
                                <p className="font-medium text-lg">{formatCurrency(application.amount || 0)}</p>
                              </div>
                            </div>
                          ) : (
                        <div className="flex flex-col md:flex-row gap-4">
                              {application.product_image ? (
                            <div className="w-full md:w-1/3">
                              <img 
                                src={application.product_image} 
                                alt={application.product_title || "Producto"} 
                                className="rounded-lg object-cover w-full h-40"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=Sin+Imagen';
                                }}
                              />
                            </div>
                              ) : (
                                <div className="w-full md:w-1/3">
                                  <div className="bg-gray-200 rounded-lg w-full h-40 flex items-center justify-center text-gray-500">
                                    Sin imagen disponible
                                  </div>
                                </div>
                          )}
                          <div className="w-full md:w-2/3">
                                {application.product_title ? (
                              <p className="font-medium text-lg mb-2">{application.product_title}</p>
                                ) : (
                                  <p className="text-gray-500 text-lg mb-2">Título del producto no disponible</p>
                            )}
                                
                                {application.product_url ? (
                              <a 
                                href={application.product_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                    className="text-blue-500 hover:underline text-sm flex items-center"
                              >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                Ver producto en sitio web
                              </a>
                                ) : (
                                  <p className="text-gray-500 text-sm">URL del producto no disponible</p>
                            )}
                                
                                <div className="mt-4">
                                  <p className="text-sm text-gray-500">Monto del Financiamiento</p>
                                  <p className="font-medium">{formatCurrency(application.amount || 0)}</p>
                          </div>
                        </div>
                            </div>
                          )
                        ) : (
                          <div className="p-4 bg-gray-100 rounded-lg text-center">
                            <p className="text-gray-500">No aplica - Esta solicitud no es de financiamiento de producto</p>
                          </div>
                        )}
                      </div>
                    )}
                    {approvalStatus && (
                      <div className="mt-6 pt-4 border-t">
                        <h3 className="font-semibold mb-4">Estado de Aprobación</h3>
                        
                        {approvalStatus.isFullyApproved && (
                          <div className="mb-4 p-3 bg-success text-white rounded-lg">
                            <div className="flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              <span className="font-medium">Solicitud completamente aprobada</span>
                            </div>
                            <p className="text-sm mt-1">Esta solicitud ha sido aprobada tanto por el asesor como por la empresa</p>
                          </div>
                        )}
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div className="border rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <p className="font-medium">Estado Asesor</p>
                              {approvalStatus.approvedByAdvisor ? (
                                <span className="badge badge-success">Aprobado</span>
                              ) : (
                                <span className="badge badge-warning">Pendiente</span>
                              )}
                            </div>
                            {application && application.advisor_status && (
                              <div className="flex items-center mt-2">
                                <p className="text-xs text-gray-500 mr-2">Estado en vista de Asesor:</p>
                                <span className={`badge badge-sm ${getStatusBadgeClass(application.advisor_status)}`}>
                                  {STATUS_LABELS[application.advisor_status as keyof typeof STATUS_LABELS] || application.advisor_status}
                                </span>
                              </div>
                            )}
                            {approvalStatus.approvalDateAdvisor && (
                              <p className="text-xs text-gray-500 mt-1">
                                Fecha de aprobación: {formatDate(approvalStatus.approvalDateAdvisor, 'short')}
                              </p>
                            )}
                          </div>
                          
                          <div className="border rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <p className="font-medium">Estado Empresa</p>
                              {approvalStatus.approvedByCompany ? (
                                <span className="badge badge-success">Aprobado</span>
                              ) : (
                                <span className="badge badge-warning">Pendiente</span>
                              )}
                            </div>
                            {application && application.company_status && (
                              <div className="flex items-center mt-2">
                                <p className="text-xs text-gray-500 mr-2">Estado en vista de Empresa:</p>
                                <span className={`badge badge-sm ${getStatusBadgeClass(application.company_status)}`}>
                                  {STATUS_LABELS[application.company_status as keyof typeof STATUS_LABELS] || application.company_status}
                                </span>
                              </div>
                            )}
                            {approvalStatus.approvalDateCompany && (
                              <p className="text-xs text-gray-500 mt-1">
                                Fecha de aprobación: {formatDate(approvalStatus.approvalDateCompany, 'short')}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        {application && application.global_status && (
                          <div className="border rounded-lg p-3 mt-2">
                            <div className="flex items-center justify-between">
                              <p className="font-medium">Estado Global del Proceso</p>
                              <span className={`badge ${getStatusBadgeClass(application.global_status)}`}>
                                {STATUS_LABELS[application.global_status as keyof typeof STATUS_LABELS] || application.global_status}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              Este es el estado consolidado que refleja el progreso global de la solicitud en el sistema.
                            </p>
                          </div>
                        )}
                        
                        {application && (isCompanyAdmin() || isAdvisor()) && userCan(PERMISSIONS.VIEW_REPORTS) && (
                          <div className="mt-4 pt-4 border-t border-dashed">
                            <div className="bg-base-300 p-3 rounded-lg">
                              <h4 className="text-sm font-bold mb-2">Debug: Todos los estados (Solo administradores)</h4>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <span className="font-bold">Estado Principal:</span> {application.status}
                                </div>
                                <div>
                                  <span className="font-bold">Estado Asesor:</span> {application.advisor_status || 'No definido'}
                                </div>
                                <div>
                                  <span className="font-bold">Estado Empresa:</span> {application.company_status || 'No definido'}
                                </div>
                                <div>
                                  <span className="font-bold">Estado Global:</span> {application.global_status || 'No definido'}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Pestañas de Historial y Documentos */}
                <div className="card bg-base-100 shadow-xl">
                  <div className="card-body">
                    <div className="tabs tabs-boxed mb-4">
                      <a className={`tab ${activeTab === 'historial' ? 'tab-active' : ''}`} onClick={() => setActiveTab('historial')}>Historial</a>
                      <a className={`tab ${activeTab === 'documentos' ? 'tab-active' : ''}`} onClick={() => setActiveTab('documentos')}>Documentos</a>
                    </div>
                    {/* Contenido de Pestañas */}
                    {activeTab === 'historial' && (
                      <div>
                        {/* Historial de la solicitud */}
                        <div className="flex items-center justify-between border-b pb-2 mb-4">
                          <h2 className="card-title text-lg">
                            Historial de la Solicitud
                            {filteredHistory.length > 0 && (
                              <span className="text-sm font-normal badge badge-outline ml-2">
                                {filteredHistory.length} {filteredHistory.length === 1 ? 'entrada' : 'entradas'}
                              </span>
                            )}
                          </h2>
                          
                          {history.length > 0 && (
                            <div className="flex gap-2">
                              <select 
                                className="select select-sm select-bordered w-auto"
                                value={historyFilter}
                                onChange={(e) => setHistoryFilter(e.target.value)}
                              >
                                <option value="all">Todos los eventos</option>
                                <option value="status">Cambios de estado</option>
                                <option value="approval">Aprobaciones</option>
                              </select>
                              
                              <select 
                                className="select select-sm select-bordered w-auto"
                                value={userFilter}
                                onChange={(e) => setUserFilter(e.target.value)}
                              >
                                <option value="all">Todos los usuarios</option>
                                <option value="advisor">Asesores</option>
                                <option value="company">Empresa</option>
                                <option value="admin">Admin</option>
                              </select>
                        </div>
                          )}
                      </div>
                        
                        {loadingHistory && historyPage === 1 ? (
                          <div className="flex justify-center items-center h-48">
                            <span className="loading loading-spinner loading-lg"></span>
                    </div>
                        ) : historyError ? (
                          <div className="p-4 bg-error text-white text-center rounded-lg">
                            <p>{historyError}</p>
                  </div>
                        ) : filteredHistory.length === 0 ? (
                          <div className="p-4 bg-base-200 text-center rounded-lg">
                            <p>No hay historial disponible para esta solicitud específica.</p>
                          </div>
                        ) : (
                          <>
                            <ol className="relative border-s border-gray-200 dark:border-gray-700 ms-3 mt-4">
                              {filteredHistory.map((item, index) => {
                                let userType = 'Sistema';
                                let userBadgeClass = 'badge-ghost';
                                
                                if (item.user_role) {
                                  const role = item.user_role.toLowerCase();
                                  if (role.includes('advisor') || role.includes('asesor')) {
                                    userType = 'Asesor';
                                    userBadgeClass = 'badge-info';
                                  } else if (role.includes('company') || role.includes('empresa')) {
                                    userType = 'Empresa';
                                    userBadgeClass = 'badge-secondary';
                                  } else if (role.includes('admin')) {
                                    userType = 'Admin';
                                    userBadgeClass = 'badge-accent';
                                  }
                                } else if (item.comment) {
                                  const comment = item.comment.toLowerCase();
                                  if (comment.includes('por asesor')) {
                                    userType = 'Asesor';
                                    userBadgeClass = 'badge-info';
                                  } else if (comment.includes('por empresa') || comment.includes('por administrador de empresa')) {
                                    userType = 'Empresa';
                                    userBadgeClass = 'badge-secondary';
                                  } else if (comment.includes('por admin')) {
                                    userType = 'Admin';
                                    userBadgeClass = 'badge-accent';
                                  }
                                }
                                
                                return (
                                  <li className="mb-4 ms-6" key={item.id || `history-${id}-${index}`}>
                                    <span className={getTimelineBadgeClass(item.status)} />
                                    <div className="bg-base-200 rounded-lg shadow-sm p-3">
                                      <div className="flex justify-between mb-1">
                                        <div className="flex items-center gap-2">
                                          <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                              <span className="text-sm font-medium">
                                                {item.user_name || 'Sistema'}
                                              </span>
                </div>
                                            {item.user_email && (
                                              <span className="text-xs text-gray-500">{item.user_email}</span>
                                            )}
                                          </div>
                                          <span className={`badge ${getStatusBadgeClass(item.status)} ml-2`}>
                                            {STATUS_LABELS[item.status as keyof typeof STATUS_LABELS] || item.status}
                                          </span>
                                        </div>
                                        <div className="flex flex-col items-end">
                                          <time className="text-xs text-gray-500">
                                            {formatDate(item.created_at, 'long')}
                                          </time>
                                          <span className={`badge badge-sm ${userBadgeClass} mt-1`}>
                                            {userType}
                                          </span>
                                        </div>
                                      </div>
                                      <p className="text-sm mt-1">{item.comment}</p>
                                    </div>
                                  </li>
                                );
                              })}
                            </ol>
                            
                            {historyHasMore && (
                              <div className="text-center mt-4">
                      <button 
                                  className="btn btn-outline btn-sm"
                                  onClick={loadMoreHistory}
                                  disabled={loadingHistory}
                      >
                                  {loadingHistory ? (
                          <>
                                      <span className="loading loading-spinner loading-xs"></span>
                                      Cargando...
                          </>
                                  ) : 'Cargar más historial'}
                      </button>
                    </div>
                  )}
                          </>
                        )}
                      </div>
                    )}
                    {activeTab === 'documentos' && (
                      <div>
                        {/* Sección para documentos */}
                        <h2 className="card-title text-lg mb-4 border-b pb-2 flex justify-between items-center">
                          <span>
                            Documentos de la Solicitud
                            {documents.length > 0 && (
                              <span className="text-sm font-normal badge badge-outline ml-2">
                                {documents.length} {documents.length === 1 ? 'documento' : 'documentos'}
                              </span>
                            )}
                          </span>
                          
                          {userCan(PERMISSIONS.UPLOAD_DOCUMENTS) && (
                            <button 
                              className="btn btn-sm btn-primary"
                              onClick={() => setIsUploadModalOpen(true)}
                            >
                              Subir Documento
                            </button>
                          )}
                        </h2>
                        
                        {loadingDocuments ? (
                          <div className="flex justify-center items-center h-48">
                            <span className="loading loading-spinner loading-lg"></span>
                          </div>
                        ) : documentError ? (
                          <div className="p-4 bg-error text-white text-center rounded-lg">
                            <p>{documentError}</p>
                          </div>
                        ) : documents.length === 0 ? (
                          <div className="p-4 bg-base-200 text-center rounded-lg">
                            <p>No hay documentos disponibles para esta solicitud.</p>
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="table w-full">
                              <thead>
                                <tr>
                                  <th>Nombre</th>
                                  <th>Categoría</th>
                                  <th>Tamaño</th>
                                  <th>Fecha</th>
                                  <th>Acciones</th>
                                </tr>
                              </thead>
                              <tbody>
                                {documents.map((doc) => (
                                  <tr key={doc.id}>
                                    <td>{doc.file_name}</td>
                                    <td>{doc.category || 'Sin categoría'}</td>
                                    <td>{formatFileSize(doc.file_size)}</td>
                                    <td>{formatDate(doc.created_at, 'short')}</td>
                                    <td>
                                      <button 
                                        className="btn btn-sm btn-primary"
                                        onClick={() => setViewingDocument(doc)}
                                      >
                                        Ver
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {/* Panel de Firma Digital */}
                        {application && userCan(PERMISSIONS.UPLOAD_DOCUMENTS) && (
                          <div className="mt-8">
                             <DocuSignPanel
                                applicationId={application.id}
                                initialEnvelopeId={(application as any).docusign_envelope_id}
                                initialSentTo={(application as any).docusign_sent_to}
                                initialStatus={(application as any).docusign_manual_status}
                                clientEmail={application.client_email as any}
                                sandbox={false}
                                onSaved={() => {
                                  addNotification({
                                    title: 'DocuSign',
                                    message: 'Datos de DocuSign guardados correctamente',
                                    type: NotificationType.SUCCESS,
                                  });
                                }}
                              />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* --- COLUMNA DERECHA --- */}
              <div className="md:col-span-2 flex flex-col gap-6">
                {/* 1. Comentarios */}
                <div className="card bg-base-100 shadow-xl">
                  <div className="card-body">
                    <CommentSection applicationId={application.id} />
                  </div>
                </div>
                {/* 2. Información del Cliente */}
                <div className="card bg-base-100 shadow-md p-4">
                  {/* Buttons for approval */}
                  {(application && approvalStatus &&
                    ((isAdvisor() && !approvalStatus.approvedByAdvisor) ||
                      (isCompanyAdmin() && userCan(PERMISSIONS.CHANGE_APPLICATION_STATUS)))) && (
                    <div className="flex justify-center space-x-3 mb-4 pb-3 border-b">
                      {application && approvalStatus && isAdvisor() && !approvalStatus.approvedByAdvisor && userCan(PERMISSIONS.CHANGE_APPLICATION_STATUS) && (
                        <button
                          onClick={handleAdvisorApproval}
                          disabled={approving}
                          className="btn btn-primary"
                        >
                          {approving ? (
                            <>
                              <span className="loading loading-spinner loading-xs mr-1"></span>
                              Procesando...
                            </>
                          ) : 'Aprobar como Asesor'}
                        </button>
                      )}

                      {application && approvalStatus && isCompanyAdmin() && userCan(PERMISSIONS.CHANGE_APPLICATION_STATUS) && !approvalStatus.approvedByCompany && (
                        <button
                          onClick={handleCompanyApproval}
                          disabled={approving}
                          className="btn btn-primary"
                        >
                          {approving ? (
                            <>
                              <span className="loading loading-spinner loading-xs mr-1"></span>
                              Procesando...
                            </>
                          ) : 'Aprobar como Empresa'}
                        </button>
                      )}

                      {application && approvalStatus && isCompanyAdmin() && userCan(PERMISSIONS.CHANGE_APPLICATION_STATUS) && approvalStatus.approvedByCompany && (
                        <button
                          onClick={handleCancelCompanyApproval}
                          disabled={approving}
                          className="btn btn-outline btn-error"
                        >
                          {approving ? (
                            <>
                              <span className="loading loading-spinner loading-xs mr-1"></span>
                              Procesando...
                            </>
                          ) : 'Cancelar Aprobación'}
                        </button>
                      )}
                    </div>
                  )}

                  <div>
                    <h3 className="text-lg font-semibold mb-4">
                      Información del Cliente
                    </h3>
                  </div>

                  <div className="mb-4">
                    <div className="flex flex-col space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="text-sm text-gray-500">
                          Nombre:
                        </div>
                        <div className="font-semibold">
                          {application.client_name || 'No disponible'}
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <div className="text-sm text-gray-500">
                          Email:
                        </div>
                        <div>
                          {application.client_email || 'No disponible'}
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <div className="text-sm text-gray-500">
                          Teléfono:
                        </div>
                        <div>
                          {application.client_phone || 'No disponible'}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <ClientProfileButton
                        clientId={application.client_id}
                        clientName={application.client_name}
                        applicationId={application.id}
                        useSync={true}
                        className="mt-2"
                      />
                    </div>
                  </div>
                </div>
                {/* 3. Información de la Empresa */}
                {(application.company_id || application.company_name) && (
                  <div className="card bg-base-100 shadow-xl">
                    <div className="card-body">
                      <h2 className="card-title text-lg border-b pb-2 mb-4">Información de la Empresa</h2>

                      <div className="space-y-4">
                        {application.company_name && (
                          <div>
                            <p className="text-sm text-gray-500">Nombre de la Empresa</p>
                            <p className="font-medium">{application.company_name}</p>
                          </div>
                        )}

                        {application.company_id && (
                          <div>
                            <p className="text-sm text-gray-500">ID de la Empresa</p>
                            <p className="font-medium">{application.company_id}</p>
                          </div>
                        )}

                        {userCan(PERMISSIONS.VIEW_COMPANIES) && (
                          <div className="pt-2 mt-2 border-t">
                            <Link
                              to={`/companies/${application.company_id}`}
                              className="btn btn-sm btn-outline btn-primary w-full"
                            >
                              Ver Detalles de la Empresa
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {/* 4. Asesor Asignado */}
                {application.assigned_to && (
                  <div className="card bg-base-100 shadow-xl">
                    <div className="card-body">
                      <h2 className="card-title text-lg border-b pb-2 mb-4">Asesor Asignado</h2>

                      <div className="space-y-4">
                        {application.advisor_name && (
                          <div>
                            <p className="text-sm text-gray-500">Nombre del Asesor</p>
                            <p className="font-medium">{application.advisor_name}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-sm text-gray-500">ID del Asesor</p>
                          <p className="font-medium">{application.assigned_to}</p>
                        </div>

                        {userCan(PERMISSIONS.VIEW_ADVISORS) && (
                          <div className="pt-2 mt-2 border-t">
                            <Link
                              to={`/advisors/${application.assigned_to}`}
                              className="btn btn-sm btn-outline btn-primary w-full"
                            >
                              Ver Perfil del Asesor
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center p-10">
            <h3 className="text-xl text-gray-500">No se encontró la solicitud</h3>
          </div>
        )}
        
        {application && approvalStatus && (
          <>
            {application.status === APPLICATION_STATUS.APPROVED && 
              isAdvisor() && 
              approvalStatus.approvedByAdvisor && 
              approvalStatus.approvedByCompany && (
              <div className="mt-4 p-4 bg-base-200 rounded-lg">
                <h3 className="font-medium mb-2">Acciones disponibles</h3>
                <div className="flex flex-col space-y-2">
                  <button 
                    onClick={() => handleStatusChange(APPLICATION_STATUS.POR_DISPERSAR)}
                    className="btn btn-accent"
                    disabled={approving}
                  >
                    {approving ? (
                      <span className="loading loading-spinner loading-xs"></span>
                    ) : 'Marcar como Por Dispersar'}
                  </button>
                </div>
              </div>
            )}
            
            {application.status === APPLICATION_STATUS.POR_DISPERSAR && 
              isAdvisor() && (
              <div className="mt-4 p-4 bg-base-200 rounded-lg">
                <h3 className="font-medium mb-2">Acciones disponibles</h3>
                <div className="flex flex-col space-y-2">
                  <button 
                    onClick={async () => {
                      if (!id || !user || !application) return;
                      
                      try {
                        setApproving(true);
                        setError(null);
                        
                        const entityFilter = shouldFilterByEntity() ? getEntityFilter() : null;
                        await markAsDispersed(
                          id, 
                          'Solicitud marcada como dispersada',
                          user.id,
                          entityFilter
                        );
                        
                        await loadApplicationData();
                        
                        setSuccessMessage('Solicitud marcada como dispersada correctamente');
                        setTimeout(() => setSuccessMessage(null), 3000);
                      } catch (error: any) {
                        console.error('Error marking as dispersed:', error);
                        setError(`Error al marcar como dispersada: ${error.message || 'Error desconocido'}`);
                      } finally {
                        setApproving(false);
                      }
                    }}
                    className="btn btn-primary"
                    disabled={approving}
                  >
                    {approving ? (
                      <span className="loading loading-spinner loading-xs"></span>
                    ) : 'Marcar como Dispersado'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
        
        {isUploadModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-2xl">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Subir Documento</h3>
                  <button 
                    className="btn btn-sm btn-circle"
                    onClick={() => setIsUploadModalOpen(false)}
                  >
                    ✕
                  </button>
                </div>
                
                {documentError && (
                  <div className="alert alert-error mb-4">
                    <p>{documentError}</p>
                  </div>
                )}
                
                <div className="mb-4">
                  <DocumentUploader
                    categories={[
                      { value: 'identificacion', label: 'Identificación' },
                      { value: 'comprobante_ingresos', label: 'Comprobante de Ingresos' },
                      { value: 'comprobante_domicilio', label: 'Comprobante de Domicilio' },
                      { value: 'estado_cuenta', label: 'Estado de Cuenta' },
                      { value: 'contrato', label: 'Contrato' },
                      { value: 'otros', label: 'Otros Documentos' }
                    ]}
                    onDocumentAdded={handleDocumentSelected}
                    onDocumentRemoved={() => setSelectedDocument(null)}
                    existingDocuments={selectedDocument ? [selectedDocument] : []}
                    clientId={application?.client_id}
                    existingServerDocuments={[]}
                  />
                </div>
                
                <div className="flex justify-end gap-2 mt-4">
                  <button 
                    className="btn btn-outline"
                    onClick={() => setIsUploadModalOpen(false)}
                  >
                    Cancelar
                  </button>
                  <button 
                    className="btn btn-primary"
                    onClick={handleUploadDocument}
                    disabled={!selectedDocument || uploadingDocument}
                  >
                    {uploadingDocument ? (
                      <>
                        <span className="loading loading-spinner loading-xs mr-1"></span>
                        Subiendo...
                      </>
                    ) : 'Subir Documento'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {viewingDocument && (
          <DocumentViewer 
            document={viewingDocument}
            onClose={() => setViewingDocument(null)} 
          />
        )}
      </div>
    </MainLayout>
  );
};

export default ApplicationDetail; 