import React, { useEffect, useRef } from 'react';
import { Message, MessageType } from '../../../services/messageService';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Avatar, Badge, Box, Flex, Text, useColorModeValue } from '@chakra-ui/react';

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  isLoading?: boolean;
}

const MessageList: React.FC<MessageListProps> = ({ messages, currentUserId, isLoading = false }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const bgColor = useColorModeValue('gray.50', 'gray.700');
  const sentMessageBg = useColorModeValue('blue.50', 'blue.800');
  const receivedMessageBg = useColorModeValue('white', 'gray.600');
  const sentMessageBorder = useColorModeValue('blue.100', 'blue.700');
  const receivedMessageBorder = useColorModeValue('gray.200', 'gray.500');

  // Desplazamiento automático al final de la lista de mensajes cuando hay nuevos mensajes
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Formatear fecha y hora para mostrar al usuario
  const formatMessageDate = (dateString: string): string => {
    const date = new Date(dateString);
    return format(date, 'dd MMM yyyy, HH:mm', { locale: es });
  };

  // Determinar si un mensaje se debe mostrar con fecha
  const shouldShowDate = (index: number, currentMsg: Message, prevMsg?: Message): boolean => {
    if (index === 0) return true;
    if (!prevMsg) return true;
    
    const currentDate = new Date(currentMsg.created_at);
    const prevDate = new Date(prevMsg.created_at);
    
    return currentDate.toDateString() !== prevDate.toDateString();
  };

  // Renderiza un indicador visual según el tipo de mensaje
  const renderMessageTypeIndicator = (type: MessageType) => {
    switch (type) {
      case MessageType.APPROVAL_REQUEST:
        return <Badge colorScheme="orange" mr={2}>Solicitud</Badge>;
      case MessageType.APPROVAL_RESPONSE:
        return <Badge colorScheme="green" mr={2}>Respuesta</Badge>;
      case MessageType.DOCUMENT_REQUEST:
        return <Badge colorScheme="purple" mr={2}>Documentos</Badge>;
      case MessageType.PAYMENT_NOTIFICATION:
        return <Badge colorScheme="blue" mr={2}>Pago</Badge>;
      case MessageType.SYSTEM:
        return <Badge colorScheme="gray" mr={2}>Sistema</Badge>;
      case MessageType.APPLICATION:
        return <Badge colorScheme="teal" mr={2}>Aplicación</Badge>;
      default:
        return null;
    }
  };

  return (
    <Box 
      h="100%" 
      overflowY="auto" 
      px={4} 
      py={2} 
      bg={bgColor} 
      rounded="md"
      boxShadow="sm"
      css={{
        '&::-webkit-scrollbar': {
          width: '8px',
        },
        '&::-webkit-scrollbar-track': {
          width: '10px',
          background: useColorModeValue('gray.100', 'gray.700'),
        },
        '&::-webkit-scrollbar-thumb': {
          background: useColorModeValue('gray.300', 'gray.500'),
          borderRadius: '24px',
        },
      }}
    >
      {isLoading ? (
        <Flex justify="center" align="center" h="100%">
          <Text>Cargando mensajes...</Text>
        </Flex>
      ) : messages.length === 0 ? (
        <Flex justify="center" align="center" h="100%">
          <Text color="gray.500">No hay mensajes en esta conversación</Text>
        </Flex>
      ) : (
        messages.map((msg, index) => {
          const isSentByMe = msg.sender_id === currentUserId;
          const showDate = shouldShowDate(index, msg, messages[index - 1]);
          
          return (
            <React.Fragment key={msg.id}>
              {showDate && (
                <Flex justify="center" my={4}>
                  <Badge px={2} py={1} borderRadius="full">
                    {format(new Date(msg.created_at), 'EEEE dd MMMM yyyy', { locale: es })}
                  </Badge>
                </Flex>
              )}
              
              <Box 
                mb={3} 
                display="flex" 
                flexDirection="column" 
                alignItems={isSentByMe ? 'flex-end' : 'flex-start'}
              >
                <Flex
                  maxW="80%"
                  bg={isSentByMe ? sentMessageBg : receivedMessageBg}
                  p={3}
                  borderRadius="lg"
                  borderWidth="1px"
                  borderColor={isSentByMe ? sentMessageBorder : receivedMessageBorder}
                  boxShadow="sm"
                  flexDirection="column"
                  position="relative"
                  _before={{
                    content: '""',
                    position: 'absolute',
                    top: '10px',
                    [isSentByMe ? 'right' : 'left']: '-8px',
                    borderWidth: '8px',
                    borderStyle: 'solid',
                    borderColor: 'transparent',
                    [isSentByMe ? 'borderRightColor' : 'borderLeftColor']: isSentByMe ? sentMessageBg : receivedMessageBg,
                    transform: isSentByMe ? 'rotate(180deg)' : 'none',
                  }}
                >
                  <Flex alignItems="center" mb={1}>
                    {renderMessageTypeIndicator(msg.message_type)}
                    <Text fontSize="xs" color="gray.500" ml="auto">
                      {format(new Date(msg.created_at), 'HH:mm', { locale: es })}
                    </Text>
                  </Flex>
                  
                  <Text whiteSpace="pre-wrap">{msg.message_content}</Text>
                  
                  {!msg.read_status && !isSentByMe && (
                    <Badge size="sm" colorScheme="red" variant="outline" alignSelf="flex-end" mt={1}>
                      No leído
                    </Badge>
                  )}
                  
                  {msg.read_status && isSentByMe && (
                    <Badge size="sm" colorScheme="green" variant="outline" alignSelf="flex-end" mt={1}>
                      Leído
                    </Badge>
                  )}
                </Flex>
              </Box>
            </React.Fragment>
          );
        })
      )}
      <div ref={messagesEndRef} />
    </Box>
  );
};

export default MessageList; 