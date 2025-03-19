import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { getUserConversations, getUnreadMessageCount } from '../services/messageService';
import { AuthContext } from '../contexts/AuthContext';
import { Box, Grid, GridItem, Flex, Text, Spinner } from '@chakra-ui/react';
import { useColorMode } from '@chakra-ui/react';
import ChatInterface from '../components/ui/messaging/ChatInterface';

// This component renders the messages page with a list of conversations and a chat interface
const Messages: React.FC = () => {
  const { userId } = useParams<{ userId?: string }>();
  const navigate = useNavigate();
  const authContext = useContext(AuthContext);
  const user = authContext?.user;
  const { colorMode } = useColorMode();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(userId || null);
  const [selectedUserName, setSelectedUserName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [conversations, setConversations] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Cargar conversaciones al iniciar
  useEffect(() => {
    if (user?.id) {
      loadConversations();
      const interval = setInterval(loadConversations, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Cargar la lista de conversaciones
  const loadConversations = async () => {
    if (!user?.id) return;
    
    try {
      setIsLoading(true);
      const fetchedConversations = await getUserConversations(user.id);
      setConversations(fetchedConversations);
      
      // Contar mensajes no leídos
      const count = await getUnreadMessageCount(user.id);
      setUnreadCount(count);
    } catch (error) {
      console.error('Error al cargar conversaciones:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Manejar la selección de una conversación
  const handleSelectConversation = (userId: string, userName: string = 'Usuario') => {
    setSelectedUserId(userId);
    setSelectedUserName(userName);
    navigate(`/messages/${userId}`);
  };

  return (
    <MainLayout>
      <Box className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">Mensajes</h1>
        
        <Box 
          borderWidth="1px" 
          borderRadius="lg" 
          overflow="hidden" 
          bg={colorMode === 'light' ? 'white' : 'gray.800'}
          boxShadow="sm"
          height="calc(100vh - 200px)"
        >
          <Grid 
            templateColumns="300px 1fr" 
            height="100%"
          >
            {/* Lista de conversaciones */}
            <GridItem 
              borderRightWidth="1px" 
              height="100%" 
              overflowY="auto"
            >
              {isLoading && conversations.length === 0 ? (
                <Flex justify="center" align="center" height="100%">
                  <Spinner />
                </Flex>
              ) : conversations.length === 0 ? (
                <Flex justify="center" align="center" height="100%">
                  <Text color="gray.500">No hay conversaciones</Text>
                </Flex>
              ) : (
                <div className="divide-y">
                  {conversations.map((conv) => (
                    <Box 
                      key={conv.userId}
                      p={3}
                      cursor="pointer"
                      bg={selectedUserId === conv.userId ? (colorMode === 'light' ? 'blue.50' : 'blue.900') : undefined}
                      onClick={() => handleSelectConversation(conv.userId, conv.userName || `Usuario ${conv.userId.slice(0, 8)}`)}
                      _hover={{ bg: colorMode === 'light' ? 'gray.50' : 'gray.700' }}
                    >
                      <Flex justify="space-between" align="center">
                        <Text fontWeight="bold">{conv.userName || `Usuario ${conv.userId.slice(0, 8)}`}</Text>
                        {conv.unreadCount > 0 && (
                          <span className="badge badge-sm badge-error">{conv.unreadCount}</span>
                        )}
                      </Flex>
                      <Text fontSize="sm" color="gray.500" isTruncated>
                        {conv.lastMessage?.message_content?.slice(0, 30)}
                        {conv.lastMessage?.message_content?.length > 30 ? '...' : ''}
                      </Text>
                      <Text fontSize="xs" color="gray.400">
                        {new Date(conv.lastMessage?.created_at).toLocaleString()}
                      </Text>
                    </Box>
                  ))}
                </div>
              )}
            </GridItem>
            
            {/* Área de chat */}
            <GridItem height="100%">
              {!selectedUserId ? (
                <Flex justify="center" align="center" height="100%">
                  <Text color="gray.500">Selecciona una conversación para ver los mensajes</Text>
                </Flex>
              ) : user?.id ? (
                <ChatInterface
                  currentUserId={user.id}
                  otherUserId={selectedUserId}
                  userName={user.name || 'Usuario'}
                  otherUserName={selectedUserName}
                />
              ) : (
                <Flex justify="center" align="center" height="100%">
                  <Text color="gray.500">Error: Usuario no identificado</Text>
                </Flex>
              )}
            </GridItem>
          </Grid>
        </Box>
      </Box>
    </MainLayout>
  );
};

export default Messages; 