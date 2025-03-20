import React, { useState, useEffect } from 'react';
import { getUserConversations } from '../../../services/messageService';

interface UserConversation {
  userId: string;
  userName?: string;
  lastMessage: any;
  unreadCount: number;
}

interface ConversationListProps {
  currentUserId: string;
  onSelectConversation: (userId: string, userName?: string) => void;
  selectedUserId?: string;
}

const ConversationList: React.FC<ConversationListProps> = ({
  currentUserId,
  onSelectConversation,
  selectedUserId
}) => {
  const [conversations, setConversations] = useState<UserConversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Cargar conversaciones del usuario
  useEffect(() => {
    fetchConversations();
    // Actualizar cada 30 segundos
    const interval = setInterval(fetchConversations, 30000);
    return () => clearInterval(interval);
  }, [currentUserId]);
  
  // Obtener la lista de conversaciones del usuario
  const fetchConversations = async () => {
    if (!currentUserId) return;
    
    try {
      setIsLoading(true);
      const fetchedConversations = await getUserConversations(currentUserId);
      setConversations(fetchedConversations);
    } catch (error) {
      console.error('Error al cargar conversaciones:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Función auxiliar para formatear fecha en formato relativo
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'hace unos minutos';
    } else if (diffInHours < 24) {
      return `hace ${diffInHours} ${diffInHours === 1 ? 'hora' : 'horas'}`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `hace ${diffInDays} ${diffInDays === 1 ? 'día' : 'días'}`;
    }
  };
  
  // Formatear el texto para ser mostrado como vista previa del mensaje
  const formatMessagePreview = (content: string) => {
    const maxLength = 30;
    if (!content) return '';
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };
  
  if (isLoading && conversations.length === 0) {
    return (
      <div className="p-4 text-center">
        <div className="loading loading-spinner loading-md mx-auto"></div>
        <p className="mt-2">Cargando conversaciones...</p>
      </div>
    );
  }
  
  if (conversations.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        No hay conversaciones disponibles
      </div>
    );
  }
  
  return (
    <div className="border rounded-lg overflow-hidden">
      <h3 className="font-bold p-3 border-b bg-base-200">Conversaciones</h3>
      
      <div className="divide-y">
        {conversations.map((conversation) => (
          <div 
            key={conversation.userId}
            className={`p-3 cursor-pointer hover:bg-base-200 ${
              selectedUserId === conversation.userId ? 'bg-base-200' : ''
            }`}
            onClick={() => onSelectConversation(conversation.userId, conversation.userName)}
          >
            <div className="flex items-center space-x-3">
              <div className="avatar placeholder">
                <div className="bg-neutral-focus text-neutral-content rounded-full w-10">
                  <span>{(conversation.userName || 'U')[0].toUpperCase()}</span>
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <p className="font-medium text-sm truncate">
                    {conversation.userName || `Usuario ${conversation.userId.slice(0, 6)}`}
                  </p>
                  {conversation.lastMessage?.created_at && (
                    <span className="text-xs text-gray-500">
                      {formatRelativeTime(conversation.lastMessage.created_at)}
                    </span>
                  )}
                </div>
                
                <div className="flex justify-between items-center mt-1">
                  <p className="text-xs text-gray-600 truncate">
                    {formatMessagePreview(conversation.lastMessage?.message_content)}
                  </p>
                  
                  {conversation.unreadCount > 0 && (
                    <span className="badge badge-sm badge-error ml-2">
                      {conversation.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ConversationList; 