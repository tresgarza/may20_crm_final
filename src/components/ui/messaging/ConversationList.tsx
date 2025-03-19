import React, { useState, useEffect } from 'react';
import { getUserConversations } from '../../../services/messageService';
import { Box, List, ListItem, Text, Flex, Badge, Avatar, Divider } from '@chakra-ui/react';

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
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  
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
      
      // Formatear las conversaciones
      const formattedConversations = fetchedConversations.map(conv => ({
        userId: conv.userId,
        userName: userNames[conv.userId] || `Usuario ${conv.userId.slice(0, 6)}`,
        lastMessage: conv.lastMessage,
        unreadCount: conv.unreadCount
      }));
      
      setConversations(formattedConversations);
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
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };
  
  return (
    <Box>
      <Text fontWeight="bold" p={3} borderBottomWidth="1px">
        Conversaciones
      </Text>
      
      {isLoading && conversations.length === 0 ? (
        <Box p={4} textAlign="center">
          <Text>Cargando...</Text>
        </Box>
      ) : conversations.length === 0 ? (
        <Box p={4} textAlign="center">
          <Text color="gray.500">No hay conversaciones</Text>
        </Box>
      ) : (
        <List spacing={0}>
          {conversations.map((conversation) => (
            <React.Fragment key={conversation.userId}>
              <ListItem 
                px={3} 
                py={2}
                bg={selectedUserId === conversation.userId ? 'blue.50' : undefined}
                _hover={{ bg: 'gray.50' }}
                cursor="pointer"
                onClick={() => onSelectConversation(conversation.userId, conversation.userName)}
              >
                <Flex alignItems="center">
                  <Avatar size="sm" name={conversation.userName} mr={3} />
                  
                  <Box flex="1">
                    <Flex alignItems="center" justifyContent="space-between">
                      <Text fontWeight="bold" fontSize="sm">
                        {conversation.userName}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        {formatRelativeTime(conversation.lastMessage.created_at)}
                      </Text>
                    </Flex>
                    
                    <Flex alignItems="center" justifyContent="space-between" mt={1}>
                      <Text fontSize="xs" color="gray.600" noOfLines={1}>
                        {formatMessagePreview(conversation.lastMessage.message_content)}
                      </Text>
                      
                      {conversation.unreadCount > 0 && (
                        <Badge colorScheme="red" borderRadius="full" ml={2}>
                          {conversation.unreadCount}
                        </Badge>
                      )}
                    </Flex>
                  </Box>
                </Flex>
              </ListItem>
              <Divider />
            </React.Fragment>
          ))}
        </List>
      )}
    </Box>
  );
};

export default ConversationList; 