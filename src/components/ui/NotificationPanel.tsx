import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useNotifications, NotificationType } from '../../contexts/NotificationContext';

const NotificationPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    clearNotifications,
    soundEnabled,
    toggleSound
  } = useNotifications();

  const togglePanel = () => {
    setIsOpen(!isOpen);
    if (!isOpen && unreadCount > 0) {
      // Al abrir el panel, marcar como leídas todas las notificaciones
      markAllAsRead();
    }
  };

  const getNotificationIcon = (type: NotificationType | string) => {
    switch (type) {
      case NotificationType.SUCCESS:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-success" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case NotificationType.ERROR:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-error" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      case NotificationType.WARNING:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-warning" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case NotificationType.NEW_APPLICATION:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-info" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
          </svg>
        );
      case NotificationType.APPROVAL_REQUIRED:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-info" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    
    // Si es menos de 24 horas, mostrar "hace X horas/minutos"
    if (diff < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(diff / (60 * 60 * 1000));
      
      if (hours < 1) {
        const minutes = Math.floor(diff / (60 * 1000));
        return minutes <= 0 ? 'Ahora' : `Hace ${minutes} min`;
      }
      
      return `Hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
    }
    
    // Si es más de 24 horas pero menos de 7 días, mostrar el día de la semana
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      const dayOfWeek = days[new Date(date).getDay()];
      
      return dayOfWeek;
    }
    
    // En cualquier otro caso, mostrar la fecha
    const dateObj = new Date(date);
    const day = dateObj.getDate();
    const month = dateObj.getMonth() + 1;
    
    return `${day}/${month}`;
  };

  return (
    <div className="relative">
      {/* Botón que abre el panel */}
      <div className="dropdown dropdown-end">
        <button 
          onClick={togglePanel} 
          className="btn btn-ghost btn-circle"
          aria-label="Notificaciones"
        >
          <div className="indicator">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-5 w-5" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth="2" 
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" 
              />
            </svg>
            {unreadCount > 0 && (
              <span className="badge badge-xs badge-primary indicator-item">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
        </button>
        
        {/* Panel de notificaciones */}
        {isOpen && (
          <div 
            className="dropdown-content bg-base-100 shadow-xl rounded-box mt-4"
            style={{ 
              width: '350px', 
              maxHeight: 'calc(100vh - 200px)',
              overflowY: 'auto',
              position: 'absolute',
              right: 0,
              zIndex: 50
            }}
          >
            <div className="p-3 border-b border-base-200">
              <div className="flex justify-between items-center">
                <h3 className="font-bold">Notificaciones</h3>
                <div className="flex gap-2">
                  <button 
                    onClick={toggleSound}
                    className="btn btn-xs btn-ghost"
                    aria-label={soundEnabled ? 'Desactivar sonido' : 'Activar sonido'}
                  >
                    {soundEnabled ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                  {notifications.length > 0 && (
                    <button 
                      onClick={clearNotifications}
                      className="btn btn-xs btn-ghost"
                      aria-label="Limpiar notificaciones"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            <div>
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto mb-2 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  <p>No tienes notificaciones.</p>
                </div>
              ) : (
                <div>
                  {notifications.map(notification => (
                    <div 
                      key={notification.id}
                      className={`border-b border-base-200 hover:bg-base-200 transition-colors ${!notification.read ? 'bg-base-200' : ''}`}
                    >
                      {notification.type === NotificationType.APPROVAL_REQUIRED || notification.type === NotificationType.NEW_APPLICATION ? (
                        // Para notificaciones relacionadas con aplicaciones, hacer clickeable que lleve al detalle
                        notification.relatedItemId && notification.relatedItemType === 'application' ? (
                          // Only create links for valid UUIDs, not string-based IDs
                          !/^app-\d+$/.test(notification.relatedItemId) ? (
                            <Link 
                              to={`/applications/${notification.relatedItemId}`} 
                              className="flex items-start p-3 gap-3"
                              onClick={() => markAsRead(notification.id)}
                            >
                              <div className="mt-1">
                                {getNotificationIcon(notification.type)}
                              </div>
                              <div className="flex-1">
                                <div className="flex justify-between items-start">
                                  <p className="font-semibold text-sm">{notification.title}</p>
                                  <span className="text-xs text-gray-500">{formatDate(notification.timestamp || notification.createdAt)}</span>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                              </div>
                            </Link>
                          ) : (
                            // Invalid UUID format, display as non-clickable
                            <div className="flex items-start p-3 gap-3">
                              <div className="mt-1">
                                {getNotificationIcon(notification.type)}
                              </div>
                              <div className="flex-1">
                                <div className="flex justify-between items-start">
                                  <p className="font-semibold text-sm">{notification.title}</p>
                                  <span className="text-xs text-gray-500">{formatDate(notification.timestamp || notification.createdAt)}</span>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                              </div>
                            </div>
                          )
                        ) : (
                          // Si no hay ID, mostrar como notificación normal sin enlace
                          <div className="flex items-start p-3 gap-3">
                            <div className="mt-1">
                              {getNotificationIcon(notification.type)}
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-start">
                                <p className="font-semibold text-sm">{notification.title}</p>
                                <span className="text-xs text-gray-500">{formatDate(notification.timestamp || notification.createdAt)}</span>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                            </div>
                          </div>
                        )
                      ) : (
                        // Para otras notificaciones, simplemente mostrar
                        <div className="flex items-start p-3 gap-3">
                          <div className="mt-1">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <p className="font-semibold text-sm">{notification.title}</p>
                              <span className="text-xs text-gray-500">{formatDate(notification.timestamp || notification.createdAt)}</span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Overlay para cerrar el panel al hacer clic fuera */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={togglePanel}
          aria-hidden="true"
        ></div>
      )}
    </div>
  );
};

export default NotificationPanel; 