import React, { useState, useEffect } from 'react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { Message, MessageType, getConversation, sendMessage, markConversationAsRead } from '../../../services/messageService';

interface ChatInterfaceProps {
  currentUserId: string;
  otherUserId: string;
  applicationId?: string;
  userName?: string;
  otherUserName?: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  currentUserId,
  otherUserId,
  applicationId,
  userName = 'Usuario',
  otherUserName = 'Destinatario'
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  // Cargar mensajes al iniciar
  useEffect(() => {
    fetchMessages();
    // Intervalo para actualizar los mensajes cada 10 segundos
    const interval = setInterval(fetchMessages, 10000);
    return () => clearInterval(interval);
  }, [currentUserId, otherUserId]);

  // Función para cargar mensajes
  const fetchMessages = async () => {
    try {
      setIsLoading(true);
      const fetchedMessages = await getConversation(currentUserId, otherUserId);
      setMessages(fetchedMessages);
      
      // Marcar mensajes como leídos
      await markConversationAsRead(currentUserId, otherUserId);
    } catch (error) {
      console.error('Error al cargar mensajes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Enviar un nuevo mensaje
  const handleSendMessage = async (content: string, type: MessageType = MessageType.GENERAL) => {
    if (!content.trim()) return;
    
    try {
      setIsSending(true);
      
      // Crear un mensaje optimista para UI instantánea
      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        sender_id: currentUserId,
        receiver_id: otherUserId,
        message_content: content,
        message_type: type,
        created_at: new Date().toISOString(),
        read_status: false,
        related_application_id: applicationId
      };
      
      // Añadir a la lista de mensajes inmediatamente
      setMessages(prev => [...prev, optimisticMessage]);
      
      // Enviar el mensaje real
      await sendMessage({
        sender_id: currentUserId,
        receiver_id: otherUserId,
        message_content: content,
        message_type: type,
        related_application_id: applicationId
      });
      
      // Recargar mensajes para obtener el ID real
      fetchMessages();
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      // Eliminar el mensaje optimista en caso de error
      setMessages(prev => prev.filter(msg => msg.id !== `temp-${Date.now()}`));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-base-200 p-4 border-b border-base-300">
        <h2 className="text-lg font-bold">{otherUserName}</h2>
      </div>
      
      {/* Message list */}
      <div className="flex-grow overflow-y-auto p-4">
        {isLoading && messages.length === 0 ? (
          <div className="flex justify-center items-center h-full">
            <div className="loading loading-spinner loading-lg"></div>
          </div>
        ) : (
          <MessageList 
            messages={messages} 
            currentUserId={currentUserId} 
          />
        )}
      </div>
      
      {/* Message input */}
      <div className="border-t border-base-300 p-4">
        <MessageInput 
          onSendMessage={handleSendMessage} 
          isSending={isSending} 
        />
      </div>
    </div>
  );
};

export default ChatInterface; 