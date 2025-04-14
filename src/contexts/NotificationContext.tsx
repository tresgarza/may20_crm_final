import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import NotificationPopup from '../components/ui/NotificationPopup';

// Generate a proper UUID for notification IDs
function generateUUID() {
  // Use a more standard implementation for UUID v4
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// For test notifications, use a valid UUID format - don't use app-timestamp
function getTestApplicationId() {
  // Use a small set of real UUIDs as sample application IDs
  const sampleIds = [
    '110cc76a-1762-4df4-840e-a503fea9d7aa',
    '220cc76a-1762-4df4-840e-a503fea9d7bb',
    '330cc76a-1762-4df4-840e-a503fea9d7cc',
    '440cc76a-1762-4df4-840e-a503fea9d7dd',
    '550cc76a-1762-4df4-840e-a503fea9d7ee'
  ];
  
  // Pick a random ID from the sample list
  return sampleIds[Math.floor(Math.random() * sampleIds.length)];
}

// Enum for notification types
export enum NotificationType {
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
  NEW_APPLICATION = 'new_application',
  APPROVAL_REQUIRED = 'approval_required',
  NEW_MESSAGE = 'new_message',
  APPLICATION_STATUS_UPDATED = 'application_status_updated',
  APPLICATION_COMMENT = 'application_comment',
}

// Interfaces
interface Notification {
  id: string;
  title: string;
  message: string;
  createdAt: Date;
  read: boolean;
  type: NotificationType | 'info' | 'success' | 'warning' | 'error';
  relatedItemId?: string;
  relatedItemType?: string;
  data?: any;
  timestamp?: Date;
  isRead?: boolean;
}

interface NotificationPopupConfig {
  title: string;
  message: string;
  type?: NotificationType | 'info' | 'success' | 'warning' | 'error';
  duration?: number;
  playSound?: boolean;
  soundType?: 'notification' | 'alert' | 'approval';
  customSound?: string;
  centerScreen?: boolean;
  relatedItemId?: string; // ID del elemento relacionado (como una aplicación)
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  showPopup: (config: NotificationPopupConfig) => void;
  soundEnabled: boolean;
  toggleSound: () => void;
  setSoundEnabled: (enabled: boolean) => void;
}

export const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  
  // Estado para la notificación emergente actual
  const [currentPopup, setCurrentPopup] = useState<NotificationPopupConfig | null>(null);
  
  // Referencia al ID del polling interval
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // State to keep track of already notified application IDs with timestamps
  // This helps prevent showing the same notification multiple times
  const [notifiedApplications, setNotifiedApplications] = useState<Map<string, number>>(new Map());

  // Referencia para evitar múltiples ejecuciones simultáneas
  const checkingRef = useRef<boolean>(false);
  
  // Reference to the latest known notification time
  const lastNotificationTimeRef = useRef<Date>(new Date());
  
  // Avoid duplicate notifications by ensuring we have a minimum interval between checks
  const lastCheckTimeRef = useRef<Date>(new Date());

  // Efecto para manejar la carga inicial de notificaciones y configurar el polling
  useEffect(() => {
    if (user) {
      // Cargar notificaciones al inicio
      loadNotifications();

      // Cargar aplicaciones ya notificadas desde localStorage
      try {
        const storedNotifications = localStorage.getItem('notified_application_ids');
        if (storedNotifications) {
          const parsedData = JSON.parse(storedNotifications);
          
          // Handle both old format (array) and new format (object with timestamps)
          if (Array.isArray(parsedData)) {
            // Old format - convert to new Map with current timestamp
            const notifiedMap = new Map();
            const now = Date.now();
            parsedData.forEach((id: string) => {
              notifiedMap.set(id, now);
            });
            setNotifiedApplications(notifiedMap);
            // Re-save with the new format
            saveNotifiedApplications(notifiedMap);
            console.log(`Converted ${notifiedMap.size} notified application IDs from old format to new format`);
          } else if (typeof parsedData === 'object') {
            // New format - convert object to Map
            const notifiedMap = new Map();
            Object.entries(parsedData).forEach(([id, timestamp]) => {
              notifiedMap.set(id, timestamp as number);
            });
            setNotifiedApplications(notifiedMap);
            console.log(`Loaded ${notifiedMap.size} notified application IDs from localStorage`);
          }
        } else {
          console.log('No previously notified applications found in localStorage');
        }
        
        // Limpiar notificaciones antiguas (más de 48 horas)
        cleanupOldNotifications();
      } catch (error) {
        console.error('Error loading notified applications:', error);
        // Reset if there's an error
        setNotifiedApplications(new Map());
      }
      
      // Set the initial last check time to now
      lastCheckTimeRef.current = new Date();
      // Set the initial last notification time to 10 seconds ago to avoid immediate checks
      lastNotificationTimeRef.current = new Date(Date.now() - 10000);
      
      // Wait 5 seconds before first check to ensure UI is fully loaded
      const initialCheckTimeout = setTimeout(() => {
        // Primero obtenemos la fecha de la última aplicación para inicializar el sistema
        initializeWithLastApplicationTimestamp();
        
        // Configurar polling para verificar nuevas notificaciones cada 30 seconds
        // Utilizamos un intervalo más corto para estar más atentos a nuevas solicitudes
        pollingIntervalRef.current = setInterval(() => {
          const now = new Date();
          const timeSinceLastCheck = now.getTime() - lastCheckTimeRef.current.getTime();
          const timeSinceLastNotification = now.getTime() - lastNotificationTimeRef.current.getTime();
          
          // Only check if:
          // 1. It's been at least 15 seconds since last check AND
          // 2. It's been at least 5 seconds since showing a notification
          if (timeSinceLastCheck > 15000 && timeSinceLastNotification > 5000) {
            checkForNewNotifications();
          } else {
            console.log(`Skipping notification check (last check: ${(timeSinceLastCheck/1000).toFixed(1)}s ago, last notification: ${(timeSinceLastNotification/1000).toFixed(1)}s ago)`);
          }
        }, 20000);
      }, 5000);
      
      // Limpiar el intervalo cuando el componente se desmonte
      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
        clearTimeout(initialCheckTimeout);
      };
    }
  }, [user]);

  // Inicializar con el timestamp de la última aplicación
  const initializeWithLastApplicationTimestamp = async () => {
    try {
      // Obtener la última aplicación para usarla como referencia inicial
      const response = await fetch('http://localhost:3100/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: `
            SELECT id, created_at, application_type, client_name, company_name, status, amount
            FROM applications 
            ORDER BY created_at DESC
            LIMIT 1
          `
        })
      });
      
      if (!response.ok) {
        throw new Error('Error querying most recent application');
      }
      
      const data = await response.json();
      
      if (data.data && data.data.length > 0) {
        const lastApp = data.data[0];
        const lastAppId = lastApp.id;
        const lastAppCreatedAt = new Date(lastApp.created_at);
        
        console.log(`System initialized with reference to last application: ${lastAppId} created at ${lastAppCreatedAt.toISOString()}`);
        
        // Marcar la aplicación más reciente como ya notificada para evitar duplicados al inicio
        if (!notifiedApplications.has(lastAppId)) {
          const appMetadata = {
            notifiedAt: new Date().toISOString(),
            notificationType: 'initialization',
            applicationType: lastApp.application_type,
            amount: lastApp.amount,
            clientName: lastApp.client_name,
            companyName: lastApp.company_name,
            status: lastApp.status
          };
          markApplicationAsNotified(lastAppId, lastApp.created_at, appMetadata);
        }
      }
      
      // Realizar la primera verificación de notificaciones
      checkForNewNotifications();
    } catch (error) {
      console.error('Error initializing with last application timestamp:', error);
      // Si falla, aún intentamos la primera verificación
      checkForNewNotifications();
    }
  };

  // Cálculo de notificaciones no leídas
  useEffect(() => {
    const count = notifications.filter(notification => !notification.read).length;
    setUnreadCount(count);
  }, [notifications]);

  // Cargar notificaciones del almacenamiento local o del servidor
  const loadNotifications = async () => {
    try {
      // En un escenario real, aquí se cargarían las notificaciones del servidor
      // Por ahora, usaremos el localStorage como ejemplo
      const storedNotifications = localStorage.getItem('notifications');
      if (storedNotifications) {
        const parsed = JSON.parse(storedNotifications);
        setNotifications(parsed.map((n: any) => ({
          ...n,
          createdAt: new Date(n.createdAt)
        })));
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  // Save notified applications with timestamps to localStorage
  const saveNotifiedApplications = (notifiedMap: Map<string, number>) => {
    try {
      // Convert Map to object for storage
      const notifiedObject: Record<string, number> = {};
      notifiedMap.forEach((timestamp, id) => {
        notifiedObject[id] = timestamp;
      });
      
      localStorage.setItem('notified_application_ids', JSON.stringify(notifiedObject));
      console.log(`Saved ${notifiedMap.size} notified application IDs to localStorage`);
    } catch (error) {
      console.error('Error saving notified applications:', error);
    }
  };

  // Función para limpiar notificaciones antiguas
  const cleanupOldNotifications = () => {
    try {
      const now = Date.now();
      const twentyFourHoursAgo = now - (24 * 60 * 60 * 1000); // 24 horas en milisegundos
      
      let totalCount = 0;
      let cleanedCount = 0;
      
      // Crear un nuevo mapa para guardar solo las notificaciones más recientes
      const updatedNotifications = new Map();
      
      notifiedApplications.forEach((timestamp, id) => {
        totalCount++;
        if (timestamp > twentyFourHoursAgo) {
          // Mantener solo las notificaciones de las últimas 24 horas
          updatedNotifications.set(id, timestamp);
        } else {
          cleanedCount++;
        }
      });
      
      if (cleanedCount > 0) {
        console.log(`Cleaned up ${cleanedCount} old notification records (${totalCount - cleanedCount} retained)`);
        setNotifiedApplications(updatedNotifications);
        saveNotifiedApplications(updatedNotifications);
      } else if (totalCount > 0) {
        console.log(`No old notifications to clean up (${totalCount} notifications are all within 24 hours)`);
      }
    } catch (error) {
      console.error('Error cleaning up old notifications:', error);
    }
  };

  // Marcar una aplicación como notificada
  const markApplicationAsNotified = (applicationId: string, createdTimestamp?: string, metadata?: any) => {
    // Check if already marked as notified
    if (notifiedApplications.has(applicationId)) {
      console.log(`Application ${applicationId} already marked as notified (duplicate protection)`);
      return; // Already notified, don't do anything
    }
    
    try {
      let notificationTime: number;
      
      // If createdTimestamp is provided, use it to set notification time just after creation
      if (createdTimestamp) {
        try {
          // Try to parse the creation timestamp
          const creationTime = new Date(createdTimestamp);
          // Set notification time 1 second after creation to ensure proper ordering
          notificationTime = creationTime.getTime() + 1000;
          console.log(`Using application creation time for notification: ${creationTime.toISOString()}`);
        } catch (error) {
          // If parsing fails, use current time as fallback
          console.warn(`Error parsing creation timestamp "${createdTimestamp}":`, error);
          notificationTime = Date.now();
        }
      } else {
        // If no timestamp provided, use current time
        notificationTime = Date.now();
      }
      
      // Crear un objeto de metadatos para esta aplicación si no se proporcionó uno
      const appMetadata = metadata || {
        notifiedAt: new Date(notificationTime).toISOString(),
        notificationType: 'application',
      };
      
      // Save to the notified applications map
      const updatedMap = new Map(notifiedApplications);
      updatedMap.set(applicationId, notificationTime);
      setNotifiedApplications(updatedMap);
      
      // Guardar también los metadatos si es necesario para futuras optimizaciones
      try {
        const metadataKey = `notification_metadata_${applicationId}`;
        localStorage.setItem(metadataKey, JSON.stringify(appMetadata));
      } catch (error) {
        console.warn('Error saving notification metadata:', error);
      }
      
      // Save to localStorage
      saveNotifiedApplications(updatedMap);
      
      // Update last notification time
      lastNotificationTimeRef.current = new Date();
      
      console.log(`Marked application ${applicationId} as notified at ${new Date(notificationTime).toISOString()}`);
    } catch (error) {
      console.error('Error marking application as notified:', error);
    }
  };

  // Función para obtener la consulta SQL optimizada según el tipo de aplicación más reciente
  const getOptimizedQuery = async (): Promise<string> => {
    try {
      // Primero, verificar el tipo de la aplicación más reciente para optimizar la consulta
      const typeCheckResponse = await fetch('http://localhost:3100/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: `
            SELECT application_type
            FROM applications 
            ORDER BY created_at DESC
            LIMIT 1
          `
        })
      });
      
      if (!typeCheckResponse.ok) {
        console.warn('Error checking latest application type, using default query');
        return getDefaultQuery();
      }
      
      const typeData = await typeCheckResponse.json();
      
      if (!typeData.data || typeData.data.length === 0) {
        console.log('No applications found, using default query');
        return getDefaultQuery();
      }
      
      const latestType = typeData.data[0].application_type;
      console.log(`Latest application type: ${latestType}`);
      
      // Personalizar los campos según el tipo de aplicación
      let additionalFields = '';
      
      switch(latestType) {
        case 'selected_plans':
          // Para planes seleccionados, necesitamos plazo, tasa y pago mensual
          additionalFields = '';
          break;
        case 'product_simulations':
          // Para simulaciones, podríamos necesitar campos específicos del producto
          additionalFields = '';
          break;
        case 'cash_requests':
          // Para solicitudes de efectivo
          additionalFields = '';
          break;
        case 'car_backed_loan_applications':
        case 'auto_loan_applications':
          // Para préstamos de auto, podríamos necesitar datos del vehículo
          additionalFields = '';
          break;
        default:
          additionalFields = '';
      }
      
      // Construir consulta con base en el tipo
      return `
        SELECT id, client_name, application_type, company_name, created_at, status, 
               amount, term, interest_rate, monthly_payment, client_email, client_phone ${additionalFields}
        FROM applications 
        WHERE created_at > NOW() - INTERVAL '30 seconds'
        ORDER BY created_at DESC
        LIMIT 5
      `;
      
    } catch (error) {
      console.error('Error building optimized query:', error);
      return getDefaultQuery();
    }
  };
  
  // Consulta predeterminada con campos básicos
  const getDefaultQuery = (): string => {
    return `
      SELECT id, client_name, application_type, company_name, created_at, status, 
             amount, term, interest_rate, monthly_payment, client_email, client_phone
      FROM applications 
      WHERE created_at > NOW() - INTERVAL '30 seconds'
      ORDER BY created_at DESC
      LIMIT 5
    `;
  };

  const checkForNewNotifications = async () => {
    // If already checking or user not logged in, don't start another check
    if (checkingRef.current || !user) return;
    
    checkingRef.current = true;
    lastCheckTimeRef.current = new Date();
    
    try {
      console.log('Checking for new notifications...');
      console.log(`${notifiedApplications.size} already notified application IDs: `, 
        Array.from(notifiedApplications.keys()).slice(0, 3).join(', '));
        
      // Get the optimized query based on the most recent application type
      let query = '';
      try {
        query = await getOptimizedQuery();
        console.log('Using optimized query for latest application type');
        
        const response = await fetch('http://localhost:3100/query', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ query })
        });
        
        // Process results only if the request was successful
        if (response.ok) {
          const result = await response.json();
          
          if (result.data && result.data.length > 0) {
            console.log(`Received ${result.data.length} applications from the last 30 seconds`);
            
            // Filter out any applications that have already been notified
            const newApps = result.data.filter((app: any) => {
              const isAlreadyNotified = notifiedApplications.has(app.id);
              if (isAlreadyNotified) {
                console.log(`Skipping already notified application: ${app.id}`);
                return false;
              }
              
              // Convertir el timestamp de la aplicación a Date para comparar
              const appCreatedAt = new Date(app.created_at);
              
              // Si la aplicación es de hace más de 60 segundos, no notificar
              const isTooOld = (new Date().getTime() - appCreatedAt.getTime()) > 60000;
              if (isTooOld) {
                console.log(`Skipping too old application: ${app.id} created at ${appCreatedAt.toISOString()}`);
                // Marcar como notificada para evitar mostrarla en futuras verificaciones
                const appMetadata = {
                  notifiedAt: new Date().toISOString(),
                  notificationType: 'application',
                  applicationType: app.application_type,
                  amount: app.amount,
                  clientName: app.client_name,
                  companyName: app.company_name,
                  status: app.status
                };
                markApplicationAsNotified(app.id, app.created_at, appMetadata);
                return false;
              }
              
              return true;
            });
            
            console.log(`Found ${newApps.length} new applications after filtering`);
            
            if (newApps.length === 0) {
              console.log('No truly new applications found (already notified or too old)');
              checkingRef.current = false;
              return;
            }
            
            // Take only the first new application to show
            const newApp = newApps[0];
            const appId = newApp.id;
            
            // Verificar si ya está en proceso de notificación (para evitar doble notificación)
            if (currentPopup && currentPopup.relatedItemId === appId) {
              console.log(`Already showing notification for application ${appId} - skipping`);
              checkingRef.current = false;
              return;
            }
            
            console.log(`New application detected: ${appId} (created ${new Date(newApp.created_at).toISOString()})`);
            
            // IMPORTANT: Mark as notified IMMEDIATELY to prevent duplicates
            // even if processing fails later
            const appMetadata = {
              notifiedAt: new Date().toISOString(),
              notificationType: 'application',
              applicationType: newApp.application_type,
              amount: newApp.amount,
              clientName: newApp.client_name,
              companyName: newApp.company_name,
              status: newApp.status
            };
            markApplicationAsNotified(appId, newApp.created_at, appMetadata);
              
            // Format data for notification
            const createdAt = new Date(newApp.created_at);
            const formattedDate = new Intl.DateTimeFormat('es-MX', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            }).format(createdAt);
            
            const formattedTime = new Intl.DateTimeFormat('es-MX', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            }).format(createdAt);
            
            // Format amount with thousands separator and 2 decimals
            const formattedAmount = new Intl.NumberFormat('es-MX', {
              style: 'currency',
              currency: 'MXN',
              minimumFractionDigits: 2
            }).format(Number(newApp.amount || 0));
            
            // Format interest rate with percentage
            const formattedRate = newApp.interest_rate !== null && newApp.interest_rate !== undefined 
              ? `${newApp.interest_rate}%` 
              : "N/A";
            
            // Format monthly payment
            const formattedMonthly = newApp.monthly_payment !== null && newApp.monthly_payment !== undefined
              ? new Intl.NumberFormat('es-MX', {
                  style: 'currency',
                  currency: 'MXN',
                  minimumFractionDigits: 2
                }).format(Number(newApp.monthly_payment))
              : "N/A";
            
            // Transform application type to a more readable format
            let appType = 'No especificado';
            if (newApp.application_type) {
              // Remove any trailing slash if it exists
              const cleanType = newApp.application_type.replace(/\/$/, '');
              
              if (cleanType === 'selected_plans') {
                appType = 'Planes seleccionados';
              } else if (cleanType === 'product_simulations') {
                appType = 'Simulación de producto';
              } else if (cleanType === 'cash_requests') {
                appType = 'Solicitud de efectivo';
              } else if (cleanType === 'car_backed_loan_applications') {
                appType = 'Préstamo con garantía de auto';
              } else if (cleanType === 'auto_loan_applications') {
                appType = 'Préstamo para auto';
              } else {
                appType = cleanType
                  .split('_')
                  .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(' ');
              }
            }

            // Adaptar la información según el tipo de aplicación
            const getApplicationSpecificHtml = (appType: string, app: any) => {
              // Base de los campos comunes para todos los tipos
              const commonFields = `
                <div class="font-semibold text-gray-700">Cliente:</div>
                <div class="text-gray-900">${app.client_name || 'Sin nombre'}</div>
                
                <div class="font-semibold text-gray-700">Empresa:</div>
                <div class="text-gray-900">${app.company_name || 'No especificada'}</div>
                
                <div class="font-semibold text-gray-700">Tipo:</div>
                <div class="text-gray-900">${appType}</div>
              `;

              // Campos específicos según el tipo de aplicación
              let specificFields = '';

              // Planes seleccionados - enfatizar plazo, tasa, pago mensual
              if (app.application_type === 'selected_plans') {
                specificFields = `
                  <div class="font-semibold text-gray-700">Monto:</div>
                  <div class="text-gray-900">${formattedAmount}</div>
                  
                  <div class="font-semibold text-gray-700">Plazo:</div>
                  <div class="text-gray-900">${app.term || 'N/A'} ${app.term === 1 ? 'mes' : 'meses'}</div>
                  
                  <div class="font-semibold text-gray-700">Tasa:</div>
                  <div class="text-gray-900">${formattedRate}</div>
                  
                  <div class="font-semibold text-gray-700">Pago mensual:</div>
                  <div class="text-gray-900">${formattedMonthly}</div>
                `;
              } 
              // Simulación de producto - enfatizar tipo de producto y monto total
              else if (app.application_type === 'product_simulations') {
                specificFields = `
                  <div class="font-semibold text-gray-700">Monto:</div>
                  <div class="text-gray-900 font-bold">${formattedAmount}</div>
                  
                  <div class="font-semibold text-gray-700">Plazo:</div>
                  <div class="text-gray-900">${app.term && app.term > 0 ? app.term + (app.term === 1 ? ' mes' : ' meses') : 'N/A'}</div>
                  
                  <div class="font-semibold text-gray-700">Tasa:</div>
                  <div class="text-gray-900">${formattedRate}</div>
                `;
              } 
              // Solicitudes de efectivo - enfatizar monto solicitado
              else if (app.application_type === 'cash_requests') {
                specificFields = `
                  <div class="font-semibold text-gray-700">Monto solicitado:</div>
                  <div class="text-gray-900 font-bold">${formattedAmount}</div>
                  
                  <div class="font-semibold text-gray-700">Plazo:</div>
                  <div class="text-gray-900">${app.term && app.term > 0 ? app.term + (app.term === 1 ? ' mes' : ' meses') : 'N/A'}</div>
                  
                  <div class="font-semibold text-gray-700">Tasa:</div>
                  <div class="text-gray-900">${formattedRate}</div>
                `;
              }
              // Préstamos relacionados con autos
              else if (app.application_type === 'car_backed_loan_applications' || app.application_type === 'auto_loan_applications') {
                specificFields = `
                  <div class="font-semibold text-gray-700">Monto del préstamo:</div>
                  <div class="text-gray-900 font-bold">${formattedAmount}</div>
                  
                  <div class="font-semibold text-gray-700">Plazo:</div>
                  <div class="text-gray-900">${app.term && app.term > 0 ? app.term + (app.term === 1 ? ' mes' : ' meses') : 'N/A'}</div>
                  
                  <div class="font-semibold text-gray-700">Tasa:</div>
                  <div class="text-gray-900">${formattedRate}</div>
                  
                  <div class="font-semibold text-gray-700">Pago mensual:</div>
                  <div class="text-gray-900">${formattedMonthly}</div>
                `;
              }
              // Para cualquier otro tipo
              else {
                specificFields = `
                  <div class="font-semibold text-gray-700">Monto:</div>
                  <div class="text-gray-900">${formattedAmount}</div>
                  
                  <div class="font-semibold text-gray-700">Plazo:</div>
                  <div class="text-gray-900">${app.term && app.term > 0 ? app.term + (app.term === 1 ? ' mes' : ' meses') : 'N/A'}</div>
                  
                  <div class="font-semibold text-gray-700">Tasa:</div>
                  <div class="text-gray-900">${formattedRate}</div>
                  
                  <div class="font-semibold text-gray-700">Pago mensual:</div>
                  <div class="text-gray-900">${formattedMonthly}</div>
                `;
              }

              // Contacto y fecha - comunes para todos
              const contactFields = `
                <div class="font-semibold text-gray-700">Email:</div>
                <div class="text-gray-900">${app.client_email || 'No especificado'}</div>
                
                <div class="font-semibold text-gray-700">Teléfono:</div>
                <div class="text-gray-900">${app.client_phone || 'No especificado'}</div>
                
                <div class="font-semibold text-gray-700">Fecha:</div>
                <div class="text-gray-900">${formattedDate} ${formattedTime}</div>
              `;

              return `
                <div class="grid grid-cols-2 gap-2 text-sm mt-2">
                  ${commonFields}
                  ${specificFields}
                  ${contactFields}
                </div>
              `;
            };
            
            // Obtener el HTML específico según el tipo de aplicación
            const detailedMessage = getApplicationSpecificHtml(appType, newApp);
            
            const notificationTitle = '💼 Nueva solicitud recibida';
            
            // Create the notification for the panel
            const newNotification = {
              title: notificationTitle,
              message: `Cliente: ${newApp.client_name || 'Sin nombre'} - ${newApp.company_name || 'Empresa no especificada'}`,
              type: NotificationType.NEW_APPLICATION,
              relatedItemType: 'application',
              relatedItemId: appId
            };
            
            // Add the notification to the panel
            addNotification(newNotification);
            
            // Show popup with complete details
            showPopup({
              title: notificationTitle,
              message: detailedMessage,
              type: NotificationType.NEW_APPLICATION,
              playSound: soundEnabled,
              soundType: 'notification',
              duration: 10000, // 10 seconds
              customSound: '/sounds/clean-notification.mp3',
              centerScreen: true,
              relatedItemId: appId
            });
            
            // Update last notification time to avoid duplicates
            lastNotificationTimeRef.current = new Date();
          } else {
            console.log('No new applications found in the past 30 seconds');
          }
        } else {
          console.warn('Failed to fetch notifications: server returned an error status');
        }
      } catch (fetchError) {
        // Gracefully handle connection errors
        console.warn('Connection to database failed, skipping notification check');
        // Don't rethrow the error - just log it and continue
      }
    } catch (error) {
      console.error('Error checking for new notifications:', error);
    } finally {
      // Always release the checking lock, even if there was an error
      checkingRef.current = false;
    }
  };

  // Añadir una nueva notificación
  const addNotification = (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      // Using a proper UUID for the notification ID
      id: generateUUID(),
      createdAt: new Date(),
      read: false,
      timestamp: new Date()
    };
    
    setNotifications(prev => {
      const updated = [newNotification, ...prev];
      // Guardar en localStorage (en producción esto iría al servidor)
      localStorage.setItem('notifications', JSON.stringify(updated));
      return updated;
    });
  };

  // Marcar una notificación como leída
  const markAsRead = (id: string) => {
    setNotifications(prev => {
      const updated = prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true, isRead: true } 
          : notification
      );
      
      // Guardar en localStorage
      localStorage.setItem('notifications', JSON.stringify(updated));
      return updated;
    });
  };

  // Marcar todas las notificaciones como leídas
  const markAllAsRead = () => {
    setNotifications(prev => {
      const updated = prev.map(notification => ({ ...notification, read: true, isRead: true }));
      
      // Guardar en localStorage
      localStorage.setItem('notifications', JSON.stringify(updated));
      return updated;
    });
  };

  // Limpiar todas las notificaciones
  const clearNotifications = () => {
    setNotifications([]);
    // Limpiar del localStorage
    localStorage.setItem('notifications', JSON.stringify([]));
  };

  // Mostrar una notificación emergente
  const showPopup = (config: NotificationPopupConfig) => {
    // Verificar si ya hay un popup con el mismo título y mensaje o mismo ID relacionado (posible duplicado)
    if (currentPopup && 
        ((currentPopup.title === config.title && currentPopup.message === config.message) ||
         (config.relatedItemId && currentPopup.relatedItemId === config.relatedItemId))) {
      console.log(`Ignoring duplicate popup: ${config.relatedItemId || 'unknown ID'}`);
      return;
    }

    // Clear any existing popups to prevent stacking
    clearPopups();
    
    // Log what we're showing
    console.log(`Showing popup: ${config.title} ${config.relatedItemId ? `(ID: ${config.relatedItemId})` : ''}`);
    
    // Short timeout to ensure DOM updates before showing the new popup
    setTimeout(() => {
      setCurrentPopup(config);
      
      // Automatically close popup after the specified duration
      setTimeout(() => {
        setCurrentPopup(null);
      }, config.duration || 5000);
    }, 50);
  };

  // Clear any pending popups
  const clearPopups = () => {
    if (currentPopup) {
      console.log('Clearing existing popup');
      setCurrentPopup(null);
    }
  };

  // Activar/desactivar sonidos de notificación
  const toggleSound = () => {
    const newValue = !soundEnabled;
    setSoundEnabled(newValue);
    // Guardar preferencia en localStorage
    localStorage.setItem('notification_sound_enabled', newValue.toString());
  };

  const value = {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    showPopup,
    soundEnabled,
    toggleSound,
    setSoundEnabled
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {currentPopup && (
        <NotificationPopup
          title={currentPopup.title}
          message={currentPopup.message}
          type={currentPopup.type as any}
          duration={currentPopup.duration}
          playSound={currentPopup.playSound}
          soundType={currentPopup.soundType}
          customSound={currentPopup.customSound}
          onClose={() => setCurrentPopup(null)}
          centerScreen={currentPopup.centerScreen}
        />
      )}
    </NotificationContext.Provider>
  );
}; 