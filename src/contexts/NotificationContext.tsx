import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import NotificationPopup from '../components/ui/NotificationPopup';

// Interfaces
interface Notification {
  id: string;
  title: string;
  message: string;
  createdAt: Date;
  read: boolean;
  type: 'info' | 'success' | 'warning' | 'error';
  relatedItemId?: string;
  relatedItemType?: string;
}

interface NotificationPopupConfig {
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
  playSound?: boolean;
  soundType?: 'notification' | 'alert' | 'approval';
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

  // Efecto para manejar la carga inicial de notificaciones y configurar el polling
  useEffect(() => {
    if (user) {
      // Cargar notificaciones al inicio
      loadNotifications();
      
      // Configurar polling para verificar nuevas notificaciones cada 30 segundos
      pollingIntervalRef.current = setInterval(() => {
        checkForNewNotifications();
      }, 30000);
      
      // Limpiar el intervalo cuando el componente se desmonte
      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
      };
    }
  }, [user]);

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
      console.error('Error cargando notificaciones:', error);
    }
  };

  // Verificar nuevas notificaciones en el servidor
  const checkForNewNotifications = async () => {
    // En una implementación real, esto sería una llamada a la API
    // Por ahora solo simulamos la lógica
    console.log('Verificando nuevas notificaciones...');
    
    // Ejemplo: Si hay notificaciones pendientes en la cola del servidor,
    // las añadiríamos al estado y podríamos mostrar una notificación emergente
    
    // Simulación: Ocasionalmente añadir una notificación de prueba
    if (Math.random() > 0.7) {
      const testNotification = {
        title: 'Nueva solicitud asignada',
        message: 'Se ha asignado una nueva solicitud de crédito a tu bandeja',
        type: 'info' as const,
        relatedItemType: 'application',
        relatedItemId: `app-${Date.now()}`
      };
      
      addNotification(testNotification);
      
      // También mostrar como popup con sonido
      showPopup({
        ...testNotification,
        playSound: soundEnabled,
        soundType: 'notification'
      });
    }
  };

  // Añadir una nueva notificación
  const addNotification = (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}`,
      createdAt: new Date(),
      read: false
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
          ? { ...notification, read: true } 
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
      const updated = prev.map(notification => ({ ...notification, read: true }));
      
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
    setCurrentPopup(config);
    
    // Automáticamente cerrar el popup después de la duración especificada
    setTimeout(() => {
      setCurrentPopup(null);
    }, config.duration || 5000);
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
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {currentPopup && (
        <NotificationPopup
          title={currentPopup.title}
          message={currentPopup.message}
          type={currentPopup.type}
          duration={currentPopup.duration}
          playSound={currentPopup.playSound}
          soundType={currentPopup.soundType}
          onClose={() => setCurrentPopup(null)}
        />
      )}
    </NotificationContext.Provider>
  );
}; 