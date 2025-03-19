import React, { useState, useEffect } from 'react';
import { Box, Flex, Heading, Text, useColorMode, Spinner } from '@chakra-ui/react';
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
  const { colorMode } = useColorMode();
  const bgColor = colorMode === 'light' ? 'white' : 'gray.800';
  const headerBgColor = colorMode === 'light' ? 'gray.100' : 'gray.700';
  const borderColor = colorMode === 'light' ? 'gray.200' : 'gray.600';

  // Cargar mensajes al iniciar
  useEffect(() => {
    fetchMessages();
    // Intervalo para actualizar los mensajes cada 10 segundos
    const interval = setInterval(fetchMessages, 10000);
    return () => clearInterval(interval);
  }, [currentUserId, otherUserId, applicationId]);

  // Marcar mensajes como leídos al visualizarlos
  useEffect(() => {
    if (messages.length > 0) {
      markMessagesAsRead();
    }
  }, [messages]);

  // Obtener mensajes de la conversación
  const fetchMessages = async () => {
    try {
      setIsLoading(true);
      const fetchedMessages = await getConversation(currentUserId, otherUserId, applicationId);
      setMessages(fetchedMessages);
    } catch (error) {
      console.error('Error al cargar mensajes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Marcar mensajes como leídos
  const markMessagesAsRead = async () => {
    try {
      await markConversationAsRead(currentUserId, otherUserId);
    } catch (error) {
      console.error('Error al marcar mensajes como leídos:', error);
    }
  };

  // Enviar un nuevo mensaje
  const handleSendMessage = async (content: string, type: MessageType) => {
    try {
      setIsSending(true);
      
      const messageData = {
        sender_id: currentUserId,
        receiver_id: otherUserId,
        message_content: content,
        message_type: type,
        related_application_id: applicationId
      };
      
      const newMessage = await sendMessage(messageData);
      
      // Actualizar el estado local para mostrar el mensaje inmediatamente
      setMessages(prevMessages => [...prevMessages, newMessage]);
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Flex 
      direction="column" 
      h="100%" 
      maxH="100%" 
      bg={bgColor} 
      borderRadius="md" 
      borderWidth="1px"
      borderColor={borderColor}
      boxShadow="md"
      overflow="hidden"
    >
      {/* Cabecera del chat */}
      <Box 
        p={3} 
        bg={headerBgColor} 
        borderBottomWidth="1px" 
        borderColor={borderColor}
      >
        <Heading size="sm">
          {applicationId 
            ? `Conversación sobre aplicación ${applicationId.slice(0, 8)}...` 
            : `Conversación con ${otherUserName}`
          }
        </Heading>
        {applicationId && (
          <Text fontSize="xs" color="gray.500">
            Entre {userName} y {otherUserName}
          </Text>
        )}
      </Box>
      
      {/* Área de mensajes */}
      <Box flex="1" overflowY="hidden" position="relative">
        {isLoading && messages.length === 0 ? (
          <Flex justify="center" align="center" h="100%">
            <Spinner size="xl" />
          </Flex>
        ) : (
          <MessageList
            messages={messages}
            currentUserId={currentUserId}
            isLoading={isLoading && messages.length > 0}
          />
        )}
      </Box>
      
      {/* Campo para escribir mensajes */}
      <MessageInput
        onSendMessage={handleSendMessage}
        isLoading={isSending}
        applicationRelated={!!applicationId}
      />
    </Flex>
  );
};

export default ChatInterface; 