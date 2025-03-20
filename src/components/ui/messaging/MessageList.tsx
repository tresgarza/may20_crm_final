import React, { useRef, useEffect } from 'react';
import { Message } from '../../../services/messageService';

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
}

const MessageList: React.FC<MessageListProps> = ({ messages, currentUserId }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Format timestamp to a readable format
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-4">
      {messages.map((message) => {
        const isCurrentUser = message.sender_id === currentUserId;
        
        return (
          <div 
            key={message.id}
            className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-[70%] rounded-lg px-4 py-2 ${
                isCurrentUser 
                  ? 'bg-primary text-primary-content' 
                  : 'bg-base-200 text-base-content'
              }`}
            >
              <div className="text-sm">
                {message.message_content}
              </div>
              <div className={`text-xs mt-1 ${isCurrentUser ? 'text-primary-content/70' : 'text-base-content/70'}`}>
                {formatTime(message.created_at)}
                {isCurrentUser && (
                  <span className="ml-2">
                    {message.read_status ? '✓✓' : '✓'}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList; 