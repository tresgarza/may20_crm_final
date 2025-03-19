import React, { useState, useRef, useEffect } from 'react';
import { 
  Box, 
  Flex, 
  IconButton, 
  Textarea,
  Button,
  TooltipProps,
  Text,
  useColorMode
} from '@chakra-ui/react';
import { FiSend } from 'react-icons/fi';
import { MessageType } from '../../../services/messageService';

interface MessageInputProps {
  onSendMessage: (content: string, type: MessageType) => void;
  isLoading?: boolean;
  placeholder?: string;
  applicationRelated?: boolean;
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  isLoading = false,
  placeholder = 'Escribe tu mensaje aquí...',
  applicationRelated = false
}) => {
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<MessageType>(
    applicationRelated ? MessageType.APPLICATION : MessageType.GENERAL
  );
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { colorMode } = useColorMode();
  const inputBg = colorMode === 'light' ? 'white' : 'gray.700';
  const borderColor = colorMode === 'light' ? 'gray.200' : 'gray.600';

  // Focus en el input al cargar el componente
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Manejar el envío del mensaje
  const handleSendMessage = () => {
    if (message.trim() === '' || isLoading) return;
    
    onSendMessage(message.trim(), messageType);
    setMessage('');
    
    // Devolver el focus al input después de enviar
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Manejar tecla Enter para enviar (con Shift+Enter para nueva línea)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Cambiar el tipo de mensaje
  const handleTypeChange = (type: MessageType) => {
    setMessageType(type);
  };

  return (
    <Box borderTopWidth="1px" borderColor={borderColor} p={3}>
      {applicationRelated && (
        <Flex mb={2} wrap="wrap" gap={1}>
          <Button 
            size="xs" 
            colorScheme={messageType === MessageType.APPLICATION ? 'teal' : 'gray'} 
            onClick={() => handleTypeChange(MessageType.APPLICATION)}
            title="Mensaje general"
          >
            Aplicación
          </Button>
          <Button 
            size="xs" 
            colorScheme={messageType === MessageType.APPROVAL_REQUEST ? 'orange' : 'gray'} 
            onClick={() => handleTypeChange(MessageType.APPROVAL_REQUEST)}
            title="Solicitud de aprobación"
          >
            Solicitar aprobación
          </Button>
          <Button 
            size="xs" 
            colorScheme={messageType === MessageType.APPROVAL_RESPONSE ? 'green' : 'gray'} 
            onClick={() => handleTypeChange(MessageType.APPROVAL_RESPONSE)}
            title="Respuesta a una solicitud"
          >
            Responder solicitud
          </Button>
          <Button 
            size="xs" 
            colorScheme={messageType === MessageType.DOCUMENT_REQUEST ? 'purple' : 'gray'} 
            onClick={() => handleTypeChange(MessageType.DOCUMENT_REQUEST)}
            title="Solicitud de documentos"
          >
            Solicitar documentos
          </Button>
        </Flex>
      )}
      
      <Flex>
        <Textarea
          ref={inputRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          bg={inputBg}
          borderRadius="md"
          resize="none"
          rows={2}
          disabled={isLoading}
          mr={2}
          borderColor={borderColor}
          _focus={{
            borderColor: 'blue.400',
            boxShadow: '0 0 0 1px var(--chakra-colors-blue-400)'
          }}
        />
        
        <Flex direction="column" justifyContent="flex-end">
          <IconButton
            aria-label="Enviar mensaje"
            colorScheme="blue"
            onClick={handleSendMessage}
            isLoading={isLoading}
            isDisabled={message.trim() === ''}
            size="md"
          >
            <FiSend />
          </IconButton>
        </Flex>
      </Flex>
      
      <Text fontSize="xs" color="gray.500" mt={1}>
        Presiona Enter para enviar. Shift+Enter para nueva línea.
      </Text>
    </Box>
  );
};

export default MessageInput; 