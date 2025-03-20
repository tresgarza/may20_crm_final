import React, { useState } from 'react';
import { MessageType } from '../../../services/messageService';

interface MessageInputProps {
  onSendMessage: (content: string, type: MessageType) => void;
  isSending: boolean;
}

const MessageInput: React.FC<MessageInputProps> = ({ 
  onSendMessage, 
  isSending
}) => {
  const [message, setMessage] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isSending) {
      onSendMessage(message, MessageType.GENERAL);
      setMessage('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <div className="flex-1">
        <input
          type="text"
          placeholder="Escribe un mensaje..."
          className="input input-bordered w-full"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={isSending}
        />
      </div>
      
      <button
        type="submit"
        className="btn btn-primary"
        disabled={!message.trim() || isSending}
      >
        {isSending ? (
          <span className="loading loading-spinner loading-xs"></span>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
          </svg>
        )}
      </button>
    </form>
  );
};

export default MessageInput; 