import { supabase } from '../lib/supabaseClient';
import { TABLES } from '../utils/constants/tables';
import { ApplicationFilter } from './applicationService';

// Tipos de mensajes para clasificar la comunicación
export enum MessageType {
  GENERAL = 'general',
  APPLICATION = 'application',
  APPROVAL_REQUEST = 'approval_request',
  APPROVAL_RESPONSE = 'approval_response',
  DOCUMENT_REQUEST = 'document_request',
  PAYMENT_NOTIFICATION = 'payment_notification',
  SYSTEM = 'system'
}

// Interfaz para el objeto de mensaje
export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  message_content: string;
  related_application_id?: string;
  read_status: boolean;
  message_type: MessageType;
  created_at: string;
}

// Interfaz para el objeto de mensaje al crearlo (sin ID ni timestamp)
export interface MessageInput {
  sender_id: string;
  receiver_id: string;
  message_content: string;
  related_application_id?: string;
  message_type: MessageType;
}

/**
 * Envía un mensaje entre usuarios
 * @param messageData Datos del mensaje a enviar
 * @returns El mensaje creado
 */
export const sendMessage = async (messageData: MessageInput): Promise<Message> => {
  try {
    const { data, error } = await supabase
      .from(TABLES.MESSAGES)
      .insert([messageData])
      .select('*')
      .single();

    if (error) {
      console.error('Error al enviar mensaje:', error);
      throw new Error(`Error al enviar mensaje: ${error.message}`);
    }

    return data as Message;
  } catch (error: any) {
    console.error('Error en sendMessage:', error);
    throw new Error(`Error al enviar mensaje: ${error.message}`);
  }
};

/**
 * Obtiene todos los mensajes para un usuario específico
 * @param userId ID del usuario para el que se obtienen los mensajes
 * @param filter Filtros opcionales (aplicación relacionada, tipo de mensaje)
 * @returns Lista de mensajes
 */
export const getUserMessages = async (
  userId: string,
  filter?: {
    relatedApplicationId?: string;
    messageType?: MessageType;
    onlyUnread?: boolean;
    otherUserId?: string;
  }
): Promise<Message[]> => {
  try {
    let query = supabase
      .from(TABLES.MESSAGES)
      .select('*')
      .or(`receiver_id.eq.${userId},sender_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    // Aplicar filtros si existen
    if (filter?.relatedApplicationId) {
      query = query.eq('related_application_id', filter.relatedApplicationId);
    }

    if (filter?.messageType) {
      query = query.eq('message_type', filter.messageType);
    }

    if (filter?.onlyUnread) {
      query = query.eq('read_status', false).eq('receiver_id', userId);
    }

    if (filter?.otherUserId) {
      query = query.or(`receiver_id.eq.${filter.otherUserId},sender_id.eq.${filter.otherUserId}`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error al obtener mensajes:', error);
      throw new Error(`Error al obtener mensajes: ${error.message}`);
    }

    return data as Message[];
  } catch (error: any) {
    console.error('Error en getUserMessages:', error);
    throw new Error(`Error al obtener mensajes: ${error.message}`);
  }
};

/**
 * Obtiene las conversaciones de un usuario
 * @param userId ID del usuario
 * @returns Lista de usuarios con los que ha conversado, con el último mensaje
 */
export const getUserConversations = async (userId: string): Promise<any[]> => {
  try {
    // Primero obtenemos todos los mensajes del usuario
    const { data: messages, error } = await supabase
      .from(TABLES.MESSAGES)
      .select('*')
      .or(`receiver_id.eq.${userId},sender_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error al obtener conversaciones:', error);
      throw new Error(`Error al obtener conversaciones: ${error.message}`);
    }

    // Agrupar mensajes por usuario (conversación)
    const conversations = new Map();
    
    for (const message of messages) {
      // Identificar al otro usuario de la conversación
      const otherUserId = message.sender_id === userId 
        ? message.receiver_id 
        : message.sender_id;
      
      // Si no tenemos esta conversación aún, añadirla
      if (!conversations.has(otherUserId)) {
        conversations.set(otherUserId, {
          userId: otherUserId,
          lastMessage: message,
          unreadCount: (message.receiver_id === userId && !message.read_status) ? 1 : 0
        });
      } else if (message.receiver_id === userId && !message.read_status) {
        // Si ya tenemos la conversación, solo actualizar el contador de no leídos
        const conversation = conversations.get(otherUserId);
        conversation.unreadCount += 1;
      }
    }
    
    // Convertir el mapa en array y retornar
    return Array.from(conversations.values());
  } catch (error: any) {
    console.error('Error en getUserConversations:', error);
    throw new Error(`Error al obtener conversaciones: ${error.message}`);
  }
};

/**
 * Obtiene todos los mensajes entre dos usuarios
 * @param userId1 ID del primer usuario
 * @param userId2 ID del segundo usuario
 * @param applicationId ID opcional de una aplicación relacionada
 * @returns Lista de mensajes
 */
export const getConversation = async (
  userId1: string, 
  userId2: string,
  applicationId?: string
): Promise<Message[]> => {
  try {
    let query = supabase
      .from(TABLES.MESSAGES)
      .select('*')
      .or(`and(sender_id.eq.${userId1},receiver_id.eq.${userId2}),and(sender_id.eq.${userId2},receiver_id.eq.${userId1})`)
      .order('created_at', { ascending: true });
    
    if (applicationId) {
      query = query.eq('related_application_id', applicationId);
    }
    
    const { data, error } = await query;

    if (error) {
      console.error('Error al obtener conversación:', error);
      throw new Error(`Error al obtener conversación: ${error.message}`);
    }

    return data as Message[];
  } catch (error: any) {
    console.error('Error en getConversation:', error);
    throw new Error(`Error al obtener conversación: ${error.message}`);
  }
};

/**
 * Marca un mensaje como leído
 * @param messageId ID del mensaje a marcar
 * @returns El mensaje actualizado
 */
export const markMessageAsRead = async (messageId: string): Promise<void> => {
  try {
    const { data, error } = await supabase
      .from(TABLES.MESSAGES)
      .update({ read_status: true })
      .eq('id', messageId);

    if (error) {
      console.error('Error al marcar mensaje como leído:', error);
      throw new Error(`Error al marcar mensaje como leído: ${error.message}`);
    }

    return;
  } catch (error: any) {
    console.error('Error en markMessageAsRead:', error);
    throw new Error(`Error al marcar mensaje como leído: ${error.message}`);
  }
};

/**
 * Marca todos los mensajes de una conversación como leídos
 * @param userId ID del usuario que está marcando los mensajes
 * @param otherUserId ID del otro usuario en la conversación
 * @returns Void
 */
export const markConversationAsRead = async (userId: string, otherUserId: string): Promise<void> => {
  try {
    const { data, error } = await supabase
      .from(TABLES.MESSAGES)
      .update({ read_status: true })
      .eq('receiver_id', userId)
      .eq('sender_id', otherUserId)
      .eq('read_status', false);

    if (error) {
      console.error('Error al marcar conversación como leída:', error);
      throw new Error(`Error al marcar conversación como leída: ${error.message}`);
    }

    return;
  } catch (error: any) {
    console.error('Error en markConversationAsRead:', error);
    throw new Error(`Error al marcar conversación como leída: ${error.message}`);
  }
};

/**
 * Marca todos los mensajes relacionados con una aplicación como leídos
 * @param userId ID del usuario que está marcando los mensajes
 * @param applicationId ID de la aplicación relacionada
 * @returns Void
 */
export const markApplicationMessagesAsRead = async (userId: string, applicationId: string): Promise<void> => {
  try {
    const { data, error } = await supabase
      .from(TABLES.MESSAGES)
      .update({ read_status: true })
      .eq('receiver_id', userId)
      .eq('related_application_id', applicationId)
      .eq('read_status', false);

    if (error) {
      console.error('Error al marcar mensajes de aplicación como leídos:', error);
      throw new Error(`Error al marcar mensajes de aplicación como leídos: ${error.message}`);
    }

    return;
  } catch (error: any) {
    console.error('Error en markApplicationMessagesAsRead:', error);
    throw new Error(`Error al marcar mensajes de aplicación como leídos: ${error.message}`);
  }
};

/**
 * Cuenta los mensajes no leídos para un usuario
 * @param userId ID del usuario
 * @returns Número de mensajes no leídos
 */
export const getUnreadMessageCount = async (userId: string): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from(TABLES.MESSAGES)
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', userId)
      .eq('read_status', false);

    if (error) {
      console.error('Error al contar mensajes no leídos:', error);
      throw new Error(`Error al contar mensajes no leídos: ${error.message}`);
    }

    return count || 0;
  } catch (error: any) {
    console.error('Error en getUnreadMessageCount:', error);
    throw new Error(`Error al contar mensajes no leídos: ${error.message}`);
  }
}; 