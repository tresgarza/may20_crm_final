import * as React from 'react';
import MainLayout from '../components/layout/MainLayout';
import { useNotifications } from '../contexts/NotificationContext';

const Notifications: React.FC = () => {
  const { 
    notifications, 
    markAsRead, 
    markAllAsRead, 
    clearNotifications 
  } = useNotifications();

  return (
    <MainLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Notificaciones</h1>
          
          <div className="flex gap-2">
            <button 
              onClick={markAllAsRead}
              className="btn btn-sm btn-outline"
            >
              Marcar todas como leídas
            </button>
            <button 
              onClick={clearNotifications}
              className="btn btn-sm btn-outline btn-error"
            >
              Limpiar notificaciones
            </button>
          </div>
        </div>
        
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            {notifications.length === 0 ? (
              <p className="text-center py-10 text-gray-500">
                No tienes notificaciones.
              </p>
            ) : (
              <div className="space-y-4">
                {notifications.map(notification => (
                  <div 
                    key={notification.id}
                    className={`border-b border-base-200 p-4 ${!notification.read ? 'bg-base-200' : ''}`}
                  >
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold">{notification.title}</h3>
                      <span className="text-xs text-gray-500">
                        {new Date(notification.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-2">{notification.message}</p>
                    {!notification.read && (
                      <button 
                        onClick={() => markAsRead(notification.id)}
                        className="btn btn-xs btn-ghost mt-2"
                      >
                        Marcar como leída
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Notifications; 