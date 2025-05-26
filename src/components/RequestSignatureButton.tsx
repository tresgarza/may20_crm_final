import React, { useState, useEffect } from 'react';
import { DocumentSignatureService, CreateSignatureDocumentParams } from '../services/documentSignatureService';

interface RequestSignatureButtonProps {
  applicationId: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  documentType: string;
  documentName?: string;
  documentDescription?: string;
  message?: string;
  onSuccess?: (response: any) => void;
  onError?: (error: Error) => void;
  className?: string;
  disabled?: boolean;
}

/**
 * Botón para solicitar firma digital de un documento
 */
const RequestSignatureButton: React.FC<RequestSignatureButtonProps> = ({
  applicationId,
  clientId,
  clientName,
  clientEmail,
  documentType,
  documentName,
  documentDescription,
  message,
  onSuccess,
  onError,
  className = '',
  disabled = false
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileInput, setFileInput] = useState<File | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [serviceInitialized, setServiceInitialized] = useState<boolean>(false);

  // Debug information
  useEffect(() => {
    console.log(`[RequestSignatureButton] Props:`, {
      applicationId,
      clientId,
      clientName,
      clientEmail,
      documentType
    });
  }, [applicationId, clientId, clientName, clientEmail, documentType]);

  // Check for service initialization
  useEffect(() => {
    console.log('[RequestSignatureButton] Checking service initialization...');
    
    // Simple check to see if service is defined
    if (typeof DocumentSignatureService !== 'undefined' && 
        DocumentSignatureService !== null &&
        typeof DocumentSignatureService.requestSignature === 'function') {
      console.log('[RequestSignatureButton] Service initialized successfully');
      setServiceInitialized(true);
    } else {
      console.warn('[RequestSignatureButton] Service not initialized, will retry...');
      // Retry after a short delay
      const timer = setTimeout(() => {
        if (typeof DocumentSignatureService !== 'undefined' && 
            DocumentSignatureService !== null &&
            typeof DocumentSignatureService.requestSignature === 'function') {
          console.log('[RequestSignatureButton] Service initialized on retry');
          setServiceInitialized(true);
        } else {
          console.error('[RequestSignatureButton] Service initialization failed after retry');
        }
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  /**
   * Maneja la selección de archivo PDF
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('[RequestSignatureButton] File selected', e.target.files);
    const file = e.target.files?.[0] || null;
    
    if (file && file.type !== 'application/pdf') {
      setError('El archivo debe ser un PDF');
      setFileInput(null);
      return;
    }
    
    setFileInput(file);
    setError(null);
  };

  /**
   * Convierte un archivo a Base64
   */
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  /**
   * Envía la solicitud de firma
   */
  const requestSignature = async () => {
    console.log('[RequestSignatureButton] Requesting signature...');
    if (!fileInput) {
      setError('Seleccione un archivo PDF para enviar a firma');
      return;
    }

    if (!serviceInitialized) {
      setError('El servicio de firma digital no está disponible en este momento. Por favor, inténtelo más tarde.');
      console.error('[RequestSignatureButton] Service not initialized when trying to request signature');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Convertir archivo a base64
      console.log('[RequestSignatureButton] Converting file to base64...');
      const base64File = await fileToBase64(fileInput);
      
      // Preparar datos para la solicitud
      const params: CreateSignatureDocumentParams = {
        applicationId,
        clientId,
        clientName,
        clientEmail,
        documentType,
        documentName: documentName || `${documentType.toUpperCase()} - ${clientName}`,
        documentDescription: documentDescription || `${documentType} para solicitud ${applicationId}`,
        message: message || 'Por favor firme este documento para continuar con su solicitud',
        base64File
      };

      console.log('[RequestSignatureButton] Sending request to service...', {
        documentType, 
        clientName, 
        clientEmail
      });
      
      // Enviar solicitud
      const response = await DocumentSignatureService.requestSignature(params);
      console.log('[RequestSignatureButton] Signature request successful:', response);
      
      // Cerrar modal y notificar éxito
      setShowModal(false);
      if (onSuccess) onSuccess(response);
      
    } catch (err: any) {
      console.error('[RequestSignatureButton] Error requesting signature:', err);
      setError(err.message || 'Error al solicitar firma');
      if (onError) onError(err);
    } finally {
      setLoading(false);
    }
  };

  // Handler for the dropdown button click
  const handleDropdownButtonClick = () => {
    console.log('[RequestSignatureButton] Dropdown button clicked for document type:', documentType);
    
    if (!serviceInitialized) {
      console.error('[RequestSignatureButton] Service not initialized. Cannot proceed.');
      if (onError) {
        onError(new Error('El servicio de firma digital no está inicializado'));
      }
      return;
    }
    
    console.log('[RequestSignatureButton] Opening modal...');
    setShowModal(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleDropdownButtonClick}
        disabled={disabled || loading || !serviceInitialized}
        className={`flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
          (disabled || loading || !serviceInitialized) ? 'opacity-50 cursor-not-allowed' : ''
        } ${className}`}
      >
        {loading ? (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : null}
        Solicitar firma digital
      </button>

      {/* Modal de selección de archivo - with fixed z-index */}
      {showModal && (
        <div className="fixed z-50 inset-0 overflow-y-auto" style={{ zIndex: 9999 }}>
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                      Solicitar firma digital - {documentType.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Seleccione el archivo PDF para enviar a firma a {clientName} ({clientEmail}).
                      </p>
                      
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700">
                          Archivo PDF
                        </label>
                        <div className="mt-1 flex items-center">
                          <input
                            type="file"
                            accept=".pdf,application/pdf"
                            onChange={handleFileChange}
                            className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          />
                        </div>
                      </div>

                      {error && (
                        <div className="mt-2 text-sm text-red-600">
                          {error}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  disabled={loading || !fileInput}
                  onClick={requestSignature}
                  className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm ${
                    (loading || !fileInput) ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {loading ? 'Enviando...' : 'Enviar a firma'}
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setShowModal(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RequestSignatureButton; 