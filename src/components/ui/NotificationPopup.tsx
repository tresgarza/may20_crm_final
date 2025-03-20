import React, { useEffect, useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

// Map NotificationType to basic types
const mapNotificationTypeToBasic = (type: string): 'info' | 'success' | 'warning' | 'error' => {
  switch (type) {
    case 'info':
    case 'new_application':
    case 'new_message':
      return 'info';
    case 'success':
    case 'approval_required':
    case 'application_status_updated':
      return 'success';
    case 'warning':
      return 'warning';
    case 'error':
    case 'application_comment':
      return 'error';
    default:
      return 'info';
  }
};

// Preload sounds to avoid playback issues
const preloadedSounds: { [key: string]: HTMLAudioElement } = {};

// List of sounds to preload on app initialization
const soundsToPreload = [
  '/sounds/clean-notification.mp3',
  '/sounds/notification-simple.mp3',
  '/sounds/triple-tone.mp3',
  '/sounds/beep.mp3',
  '/sounds/alert.mp3',
  '/sounds/approval.mp3'
];

// Preload sounds on app initialization
if (typeof window !== 'undefined') {
  // Function to preload a sound with retry
  const preloadSound = (soundPath: string, retryCount = 0): void => {
    try {
      const audio = new Audio(soundPath);
      audio.volume = 0.2; // Set low volume by default
      
      // Set up event listeners
      audio.addEventListener('canplaythrough', () => {
        preloadedSounds[soundPath] = audio;
        console.log(`Successfully preloaded sound: ${soundPath}`);
      });
      
      audio.addEventListener('error', (err) => {
        console.warn(`Error preloading sound ${soundPath}:`, err);
        if (retryCount < 2) {
          // Retry loading after a short delay
          setTimeout(() => preloadSound(soundPath, retryCount + 1), 1000);
        }
      });
      
      // Start loading the audio file
      audio.load();
    } catch (err) {
      console.error(`Failed to preload sound ${soundPath}:`, err);
    }
  };
  
  // Preload all sounds
  soundsToPreload.forEach(soundPath => preloadSound(soundPath));
}

// Add a global listener for user interaction to enable audio
if (typeof window !== 'undefined' && !document.documentElement.hasAttribute('data-listeners-added')) {
  document.documentElement.setAttribute('data-listeners-added', 'true');
  
  const userInteractionEvents = ['click', 'touchstart', 'keydown'];
  
  const handleUserInteraction = () => {
    document.documentElement.setAttribute('data-user-interacted', 'true');
    
    // Remove listeners after first interaction
    userInteractionEvents.forEach(event => {
      document.removeEventListener(event, handleUserInteraction);
    });
    
    // Play a silent sound to unlock audio on iOS
    try {
      const silentSound = new Audio();
      silentSound.volume = 0.01;
      silentSound.play().catch(() => {/* Ignore errors */});
    } catch (e) {
      // Ignore errors
    }
  };
  
  // Add listeners for all interaction types
  userInteractionEvents.forEach(event => {
    document.addEventListener(event, handleUserInteraction);
  });
  
  console.log('User interaction listeners added for sound enablement');
}

interface NotificationPopupProps {
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error' | string;
  duration?: number; // Duración en milisegundos
  onClose?: () => void;
  playSound?: boolean;
  soundType?: 'notification' | 'alert' | 'approval'; // Diferentes tipos de sonido
  customSound?: string; // Ruta personalizada para el sonido
  centerScreen?: boolean; // Opción para centrar en la pantalla
  relatedItemId?: string; // ID del elemento relacionado (como una aplicación)
}

const NotificationPopup: React.FC<NotificationPopupProps> = ({
  title,
  message,
  type = 'info',
  duration = 5000, // Por defecto, 5 segundos
  onClose,
  playSound = true,
  soundType = 'notification',
  customSound,
  centerScreen = false,
  relatedItemId
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [exiting, setExiting] = useState(false);
  const [soundPlayed, setSoundPlayed] = useState(false);

  // Define closeNotification function before it's used in useEffect
  const closeNotification = () => {
    setExiting(true);
    // Agregar un pequeño retraso para la animación de salida
    setTimeout(() => {
      setIsVisible(false);
      if (onClose) onClose();
    }, 300);
  };

  // Configurar el auto-cierre
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        closeNotification();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration]);

  // Reproducir sonido de notificación una sola vez
  useEffect(() => {
    if (playSound && !soundPlayed) {
      // Prevent playing the sound more than once for the same notification
      setSoundPlayed(true);
      
      // Intentar reproducir el sonido con diferentes enfoques
      playNotificationSound();
    }
  }, [playSound, customSound, soundType, soundPlayed]);

  const playNotificationSound = () => {
    try {
      // Priority list of sounds to try - primary options first
      const soundOptions = [
        customSound || '/sounds/clean-notification.mp3', // New reliable sound
        '/sounds/notification-simple.mp3', // Simple backup sound
        '/sounds/triple-tone.mp3',
        '/sounds/beep.mp3',
        '/sounds/alert.mp3'
      ];

      // Function to play a sound with proper error handling
      const tryPlaySound = (soundPath: string): Promise<void> => {
        return new Promise((resolve, reject) => {
          try {
            // Try using a preloaded sound first
            if (preloadedSounds[soundPath]) {
              const preloadedAudio = preloadedSounds[soundPath];
              preloadedAudio.currentTime = 0; // Reset playback position
              
              preloadedAudio.play()
                .then(() => {
                  console.log(`Successfully played preloaded sound: ${soundPath}`);
                  resolve();
                })
                .catch(err => {
                  console.warn(`Failed to play preloaded sound ${soundPath}:`, err);
                  reject(err);
                });
              return;
            }
            
            // Fallback to creating a new audio instance
            const audio = new Audio(soundPath);
            audio.volume = 0.2; // Subtle volume
            
            // Setup success handlers
            audio.oncanplaythrough = () => {
              audio.play()
                .then(() => {
                  console.log(`Successfully played sound: ${soundPath}`);
                  resolve();
                })
                .catch(err => {
                  console.warn(`Failed to play sound ${soundPath}:`, err);
                  reject(err);
                });
            };
            
            // Setup error handlers
            audio.onerror = (err) => {
              console.warn(`Error loading sound ${soundPath}:`, err);
              reject(err);
            };
            
            // Start loading the audio
            audio.load();
            
            // Set timeout to avoid hanging
            setTimeout(() => {
              reject(new Error(`Timeout loading sound ${soundPath}`));
            }, 1500);
          } catch (err) {
            console.warn(`Exception while trying to play ${soundPath}:`, err);
            reject(err);
          }
        });
      };

      // Try each sound in sequence until one works
      const tryNextSound = (index: number) => {
        if (index >= soundOptions.length) {
          console.error('All sound playback attempts failed');
          return;
        }
        
        const soundPath = soundOptions[index];
        
        tryPlaySound(soundPath)
          .catch(() => {
            // If this sound failed, try the next one
            tryNextSound(index + 1);
          });
      };
      
      // Start with the first sound
      tryNextSound(0);
        
    } catch (error) {
      console.error('Failed to play notification sound:', error);
    }
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

  // Map complex notification types to the basic ones
  const basicType = mapNotificationTypeToBasic(type);
  
  // Use the mapped type to get styles
  const styles = typeStyles[basicType] || typeStyles.info;

  // Estilos de posición según si debe estar centrado o no
  const positionClasses = centerScreen 
    ? "fixed inset-0 flex items-center justify-center z-50"
    : "fixed top-5 right-5 z-50 max-w-md w-full";

  // Ancho según si debe estar centrado o no
  const widthClasses = centerScreen 
    ? "w-full max-w-xl mx-4" // Más ancho cuando está centrado
    : "w-full";

  // Determinar si el mensaje es HTML, renderizarlo de manera segura
  const isHtmlMessage = message && message.trim().startsWith('<');

  // Renderizar el contenido de la notificación
  const renderContent = () => {
    if (!isHtmlMessage) {
      return <div className="mt-1 text-sm">{message}</div>;
    }

    // Si el mensaje es HTML, creamos un div contenedor con styles
    const parser = new DOMParser();
    const doc = parser.parseFromString(message, 'text/html');
    const body = doc.body;

    // Aplicar clase de estilo al primer div si es una grid
    const firstDiv = body.querySelector('div');
    if (firstDiv && firstDiv.className.includes('grid')) {
      firstDiv.className = 'grid grid-cols-2 gap-2 text-sm mt-2';
    }

    // Dar estilos a los elementos semibold
    const semiboldElements = body.querySelectorAll('.font-semibold');
    semiboldElements.forEach(el => {
      el.className = 'font-semibold text-gray-700';
    });

    // Buscar el tipo de aplicación para aplicar estilos específicos
    const typeLabel = Array.from(body.querySelectorAll('.text-gray-900')).find(el => 
      el.previousElementSibling?.textContent?.includes('Tipo:')
    );
    
    if (typeLabel) {
      const applicationType = typeLabel.textContent?.trim().toLowerCase();
      
      // Aplicar estilos específicos según el tipo de aplicación
      if (applicationType) {
        // Personalizar los elementos según el tipo
        if (applicationType.includes('planes seleccionados')) {
          // Destacar monto de pago mensual para planes seleccionados
          const monthlyPaymentElem = Array.from(body.querySelectorAll('.text-gray-900')).find(el => 
            el.previousElementSibling?.textContent?.includes('Pago mensual:')
          );
          if (monthlyPaymentElem) {
            monthlyPaymentElem.className = 'text-gray-900 font-bold text-blue-600';
          }
        }
        else if (applicationType.includes('solicitud de efectivo')) {
          // Destacar monto solicitado para solicitudes de efectivo
          const amountElem = Array.from(body.querySelectorAll('.text-gray-900')).find(el => 
            el.previousElementSibling?.textContent?.includes('Monto solicitado:')
          );
          if (amountElem) {
            amountElem.className = 'text-gray-900 font-bold text-green-600';
          }
        }
        else if (applicationType.includes('simulación de producto')) {
          // Destacar monto para simulaciones de producto
          const amountElem = Array.from(body.querySelectorAll('.text-gray-900')).find(el => 
            el.previousElementSibling?.textContent?.includes('Monto:')
          );
          if (amountElem) {
            amountElem.className = 'text-gray-900 font-bold text-purple-600';
          }
        }
        else if (applicationType.includes('préstamo')) {
          // Destacar monto para préstamos
          const amountElem = Array.from(body.querySelectorAll('.text-gray-900')).find(el => 
            el.previousElementSibling?.textContent?.includes('Monto del préstamo:')
          );
          if (amountElem) {
            amountElem.className = 'text-gray-900 font-bold text-orange-600';
          }
        }
      }
    }

    // Estilizar los valores
    const valueElements = Array.from(body.querySelectorAll('div')).filter(el => 
      el.previousElementSibling && el.previousElementSibling.className.includes('font-semibold')
    );
    valueElements.forEach(el => {
      // Si no tiene una clase personalizada ya asignada, aplicar la predeterminada
      if (!el.className.includes('font-bold')) {
        el.className = 'text-gray-900';
      }
    });

    return (
      <div 
        className="mt-2 notification-content prose prose-sm max-w-none" 
        dangerouslySetInnerHTML={{ __html: body.innerHTML }}
      />
    );
  };

  return (
    <div className={positionClasses}>
      <div
        className={`${styles.bg} ${styles.border} ${styles.text} rounded-lg shadow-lg p-4 border ${
          exiting ? 'animate-popup-exit' : 'animate-popup-entry'
        } ${widthClasses}`}
      >
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h3 className={`text-base font-semibold ${styles.title}`}>{title}</h3>
            {renderContent()}
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