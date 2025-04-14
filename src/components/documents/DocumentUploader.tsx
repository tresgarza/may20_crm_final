import React, { useState, useRef, useEffect } from 'react';
import { FiFile, FiUpload, FiX, FiCheck, FiPaperclip } from 'react-icons/fi';

interface DocumentCategory {
  value: string;
  label: string;
}

interface DocumentFile {
  id?: string;
  file: File;
  category: string;
  name: string;
}

interface DocumentUploaderProps {
  categories: DocumentCategory[];
  onDocumentAdded: (document: DocumentFile) => void;
  onDocumentRemoved: (index: number) => void;
  existingDocuments: DocumentFile[];
  clientId?: string;
}

const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  categories,
  onDocumentAdded,
  onDocumentRemoved,
  existingDocuments,
  clientId
}) => {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [documentName, setDocumentName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Log component props on mount to debug
  useEffect(() => {
    console.log('DocumentUploader montado con clientId:', clientId);
    console.log('Documentos existentes:', existingDocuments);
    
    return () => {
      // Clean up any resources on component unmount
      if (selectedFile) {
        setSelectedFile(null);
      }
    };
  }, [clientId, existingDocuments]);
  
  // Safely handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (e.target && e.target.files && e.target.files.length > 0) {
        const file = e.target.files[0];
        
        // Verify file is valid
        if (!file) {
          setError('El archivo seleccionado no es válido');
          return;
        }
        
        // Check file size (limit to 10MB)
        if (file.size > 10 * 1024 * 1024) {
          setError('El archivo es demasiado grande. El tamaño máximo es 10MB');
          return;
        }
        
        setSelectedFile(file);
        
        // If no document name, use the file name
        if (!documentName) {
          try {
            const fileName = file.name.split('.')[0];
            setDocumentName(fileName);
          } catch (err) {
            console.error('Error extracting filename:', err);
            setDocumentName(`Documento-${new Date().toISOString().substring(0, 10)}`);
          }
        }
        
        setError(null);
      }
    } catch (err) {
      console.error('Error al seleccionar el archivo:', err);
      setError('Hubo un problema al procesar el archivo seleccionado');
    }
  };
  
  // Safely handle document upload
  const handleUpload = () => {
    if (isProcessing) return;
    
    try {
      setIsProcessing(true);
      
      // Validate all fields are complete
      if (!selectedCategory) {
        setError('Selecciona una categoría para el documento');
        setIsProcessing(false);
        return;
      }
      
      if (!documentName || !documentName.trim()) {
        setError('Ingresa un nombre para el documento');
        setIsProcessing(false);
        return;
      }
      
      if (!selectedFile) {
        setError('Selecciona un archivo para subir');
        setIsProcessing(false);
        return;
      }
      
      // Advise if clientId is missing - this is not blocking, as documents will be stored in memory
      // and associated with the client later
      if (!clientId) {
        console.log('Advertencia: clientId no está definido, el documento se guardará pero solo se asociará al guardar el cliente');
      }
      
      // Create document object with defensive cloning to avoid reference issues
      const document: DocumentFile = {
        file: selectedFile,
        category: selectedCategory,
        name: documentName.trim()
      };
      
      // Call function to add document
      onDocumentAdded(document);
      
      // Reset form after short delay to ensure state updates properly
      setTimeout(() => {
        setSelectedCategory('');
        setDocumentName('');
        setSelectedFile(null);
        setError(null);
        
        // Reset file input safely
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        setIsProcessing(false);
      }, 100);
      
    } catch (err) {
      console.error('Error al procesar el documento:', err);
      setError('Hubo un problema al agregar el documento. Por favor, intente de nuevo.');
      setIsProcessing(false);
    }
  };
  
  // Obtener el nombre de la categoría a partir del valor
  const getCategoryLabel = (value: string) => {
    const category = categories.find(cat => cat.value === value);
    return category ? category.label : value;
  };
  
  // Formatear tamaño de archivo
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  // Manejar eventos de arrastrar y soltar
  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    try {
      e.preventDefault();
      e.stopPropagation();
      if (e.type === 'dragenter' || e.type === 'dragover') {
        setDragActive(true);
      } else if (e.type === 'dragleave') {
        setDragActive(false);
      }
    } catch (err) {
      console.error('Error en evento de arrastre:', err);
      setDragActive(false);
      setError('Hubo un problema al procesar el evento de arrastre');
    }
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    try {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        setSelectedFile(e.dataTransfer.files[0]);
        
        // Si no hay nombre de documento, usar el nombre del archivo
        if (!documentName) {
          const fileName = e.dataTransfer.files[0].name.split('.')[0];
          setDocumentName(fileName);
        }
        
        setError(null);
      }
    } catch (err) {
      console.error('Error al soltar el archivo:', err);
      setError('Hubo un problema al procesar el archivo soltado');
    }
  };
  
  // Abrir selector de archivos al hacer clic
  const openFileSelector = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Selector de documentos */}
      <div className="card bg-base-100 border border-gray-200">
        <div className="card-body">
          <h3 className="card-title text-base mb-4">Agregar Documento</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">Categoría</span>
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className={`select select-bordered w-full ${error && !selectedCategory ? 'select-error' : ''}`}
              >
                <option value="">Seleccionar categoría</option>
                {categories.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">Nombre del Documento</span>
              </label>
              <input
                type="text"
                value={documentName}
                onChange={(e) => setDocumentName(e.target.value)}
                className={`input input-bordered w-full ${error && !documentName ? 'input-error' : ''}`}
                placeholder="Ingresa un nombre descriptivo"
              />
            </div>
          </div>
          
          {/* Área de arrastrar y soltar */}
          <div
            className={`mt-4 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              dragActive
                ? 'border-primary bg-primary/10'
                : selectedFile
                ? 'border-success bg-success/10'
                : 'border-gray-300 hover:border-primary hover:bg-primary/5'
            }`}
            onClick={openFileSelector}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileChange}
              accept="*/*"
            />
            
            {selectedFile ? (
              <div className="flex flex-col items-center">
                <FiCheck className="w-10 h-10 text-success mb-2" />
                <p className="font-semibold">{selectedFile.name}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <FiUpload className="w-10 h-10 text-gray-400 mb-2" />
                <p className="font-semibold">
                  Arrastra archivos aquí o haz clic para seleccionar
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Se acepta cualquier formato de archivo
                </p>
              </div>
            )}
          </div>
          
          {error && (
            <div className="alert alert-error mt-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}
          
          {!clientId && (
            <div className="alert alert-info mt-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Los documentos se guardarán temporalmente y se asociarán al cliente cuando complete el registro.</span>
            </div>
          )}
          
          <div className="card-actions justify-end mt-4">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleUpload}
              disabled={!selectedFile || !selectedCategory || !documentName}
            >
              <FiPaperclip className="mr-2" />
              Agregar Documento
            </button>
          </div>
        </div>
      </div>
      
      {/* Lista de documentos agregados */}
      {existingDocuments.length > 0 && (
        <div className="card bg-base-100 border border-gray-200">
          <div className="card-body">
            <h3 className="card-title text-base mb-4">Documentos ({existingDocuments.length})</h3>
            
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Categoría</th>
                    <th>Tamaño</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {existingDocuments.map((doc, index) => (
                    <tr key={index}>
                      <td className="flex items-center">
                        <FiFile className="mr-2" />
                        {doc.name}
                      </td>
                      <td>{getCategoryLabel(doc.category)}</td>
                      <td>{formatFileSize(doc.file.size)}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-error btn-sm"
                          onClick={() => onDocumentRemoved(index)}
                        >
                          <FiX />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentUploader; 