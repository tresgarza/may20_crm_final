import React, { useEffect, useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface NotificationPopupProps {
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  duration?: number; // Duración en milisegundos
  onClose?: () => void;
  playSound?: boolean;
  soundType?: 'notification' | 'alert' | 'approval'; // Diferentes tipos de sonido
}

const NotificationPopup: React.FC<NotificationPopupProps> = ({
  title,
  message,
  type = 'info',
  duration = 5000, // Por defecto, 5 segundos
  onClose,
  playSound = true,
  soundType = 'notification'
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [exiting, setExiting] = useState(false);

  // Configurar el auto-cierre
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        closeNotification();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration]);

  // Reproducir sonido de notificación
  useEffect(() => {
    if (playSound) {
      const audio = new Audio();
      
      switch (soundType) {
        case 'notification':
          audio.src = '/sounds/notification.mp3';
          break;
        case 'alert':
          audio.src = '/sounds/alert.mp3';
          break;
        case 'approval':
          audio.src = '/sounds/approval.mp3';
          break;
        default:
          audio.src = '/sounds/notification.mp3';
      }
      
      audio.play().catch(err => {
        console.error('Error al reproducir sonido:', err);
      });
    }
  }, [playSound, soundType]);

  const closeNotification = () => {
    setExiting(true);
    // Agregar un pequeño retraso para la animación de salida
    setTimeout(() => {
      setIsVisible(false);
      if (onClose) onClose();
    }, 300);
  };

  if (!isVisible) return null;

  // Mapeo de estilos según el tipo
  const typeStyles = {
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      title: 'text-blue-900'
    },
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-800',
      title: 'text-green-900'
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
      title: 'text-yellow-900'
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      title: 'text-red-900'
    }
  };

  const styles = typeStyles[type];

  return (
    <div className="fixed top-5 right-5 z-50 max-w-md w-full animate-popup">
      <div
        className={`${styles.bg} ${styles.border} ${styles.text} rounded-lg shadow-lg p-4 border ${
          exiting ? 'animate-popup-exit' : 'animate-popup-entry'
        }`}
      >
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h3 className={`text-base font-semibold ${styles.title}`}>{title}</h3>
            <div className="mt-1 text-sm">{message}</div>
          </div>
          <button
            onClick={closeNotification}
            className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-500 focus:outline-none"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationPopup; 