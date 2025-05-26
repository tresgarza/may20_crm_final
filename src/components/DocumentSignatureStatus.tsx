import React, { useState, useEffect } from 'react';
import { DocumentSignatureService } from '../services/documentSignatureService';

// Tipos de datos
interface SignedDocument {
  id: string;
  application_id: string;
  client_id: string;
  document_type: string;
  cincel_document_id: string;
  status: string;
  signed_at: string | null;
  file_path: string | null;
  sha256_hash: string | null;
  created_at: string;
  updated_at: string;
}

interface DocumentSignatureStatusProps {
  applicationId?: string;
  clientId?: string;
  onStatusChange?: (documents: SignedDocument[]) => void;
  showTitle?: boolean;
  refreshTrigger?: number; // Usado para forzar actualización desde el componente padre
}

const DocumentSignatureStatus: React.FC<DocumentSignatureStatusProps> = ({
  applicationId,
  clientId,
  onStatusChange,
  showTitle = true,
  refreshTrigger = 0,
}) => {
  const [documents, setDocuments] = useState<SignedDocument[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadUrls, setDownloadUrls] = useState<Record<string, string>>({});
  const [serviceInitialized, setServiceInitialized] = useState<boolean>(false);

  // Función para cargar documentos
  const loadDocuments = async () => {
    try {
      if (!serviceInitialized) {
        console.log('DocumentSignatureService not initialized yet, waiting...');
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);
      
      let data: SignedDocument[] = [];
      
      if (applicationId) {
        data = await DocumentSignatureService.getDocumentsByApplication(applicationId);
      } else if (clientId) {
        data = await DocumentSignatureService.getDocumentsByClient(clientId);
      } else {
        throw new Error('Se requiere applicationId o clientId');
      }
      
      setDocuments(data);
      
      // Notificar al componente padre si existe la función
      if (onStatusChange) {
        onStatusChange(data);
      }
    } catch (err: any) {
      console.error('Error cargando documentos:', err);
      setError(err.message || 'Error al cargar documentos');
    } finally {
      setLoading(false);
    }
  };

  // Check for service initialization
  useEffect(() => {
    // Simple check to see if service is defined
    if (typeof DocumentSignatureService !== 'undefined' && 
        DocumentSignatureService !== null &&
        typeof DocumentSignatureService.getDocumentsByApplication === 'function') {
      setServiceInitialized(true);
    } else {
      // Retry after a short delay
      const timer = setTimeout(() => {
        if (typeof DocumentSignatureService !== 'undefined' && 
            DocumentSignatureService !== null &&
            typeof DocumentSignatureService.getDocumentsByApplication === 'function') {
          setServiceInitialized(true);
        } else {
          setError('Error: No se pudo inicializar DocumentSignatureService');
        }
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  // Cargar documentos al montar o cuando cambian las props
  useEffect(() => {
    if (serviceInitialized) {
      loadDocuments();
    }
  }, [applicationId, clientId, refreshTrigger, serviceInitialized]);

  // Obtener URLs de descarga para documentos firmados
  const getDownloadUrl = async (document: SignedDocument) => {
    if (!document.file_path || !serviceInitialized) return;
    
    try {
      // Verificar si ya tenemos la URL en caché
      if (downloadUrls[document.id]) return;
      
      const url = await DocumentSignatureService.getSignedDocumentUrl(document.file_path);
      
      setDownloadUrls(prev => ({
        ...prev,
        [document.id]: url
      }));
    } catch (err) {
      console.error('Error obteniendo URL de descarga:', err);
    }
  };

  // Mapeo de status a textos descriptivos en español
  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendiente de firma';
      case 'signed':
        return 'Firmado';
      case 'expired':
        return 'Expirado';
      case 'rejected':
        return 'Rechazado';
      default:
        return status;
    }
  };

  // Renderizar cargando
  if (loading && documents.length === 0) {
    return <div className="py-4 text-center text-gray-500">Cargando documentos...</div>;
  }

  // Renderizar error de inicialización
  if (error) {
    return (
      <div className="py-4 text-center text-red-500">
        <p>Error: {error}</p>
        <button 
          onClick={() => {
            setServiceInitialized(false);
            // Check again after clicking
            if (typeof DocumentSignatureService !== 'undefined' && 
                DocumentSignatureService !== null) {
              setServiceInitialized(true);
              loadDocuments();
            }
          }}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Reintentar
        </button>
      </div>
    );
  }

  // Renderizar sin documentos
  if (!loading && documents.length === 0) {
    return (
      <div className="py-4 text-center text-gray-500">
        No hay documentos de firma asociados
      </div>
    );
  }

  return (
    <div className="mt-4">
      {showTitle && (
        <h3 className="text-lg font-medium mb-3">
          Documentos para firma electrónica
        </h3>
      )}
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Documento
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha de solicitud
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha de firma
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {documents.map(doc => {
              // Solicitar URL de descarga para documentos firmados
              if (doc.status === 'signed' && doc.file_path && !downloadUrls[doc.id]) {
                getDownloadUrl(doc);
              }
              
              return (
                <tr key={doc.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-medium">
                      {doc.document_type
                        .replace(/_/g, ' ')
                        .split(' ')
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span 
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        doc.status === 'signed' 
                          ? 'bg-green-100 text-green-800' 
                          : doc.status === 'pending' 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {getStatusText(doc.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(doc.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {doc.signed_at 
                      ? new Date(doc.signed_at).toLocaleString() 
                      : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {doc.status === 'signed' && doc.file_path ? (
                      <a
                        href={downloadUrls[doc.id] || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`text-blue-600 hover:text-blue-900 ${!downloadUrls[doc.id] ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onClick={(e) => !downloadUrls[doc.id] && e.preventDefault()}
                      >
                        {downloadUrls[doc.id] ? 'Descargar' : 'Cargando...'}
                      </a>
                    ) : (
                      <span className="text-gray-400">No disponible</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DocumentSignatureStatus; 