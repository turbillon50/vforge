'use client';

import { useState, useCallback } from 'react';
import { ChatContainer, Message } from './ChatContainer';
import { ChatComposer } from './ChatComposer';

export const ChatPage = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = useCallback(
    async (content: string) => {
      // Add user message
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      // Simulate V response (replace with actual API call)
      setTimeout(() => {
        const vMessage: Message = {
          id: `v-${Date.now()}`,
          role: 'v',
          content: `## Entendido\n\nRecibí tu mensaje:\n\n> "${content}"\n\n**Status:** 🟢 Activa y funcionando\n\n- ✅ Conectada a bases de datos\n- ✅ Skills listos\n- ✅ Esperando instrucciones\n\nEsta es V hablando contigo de forma elegante, sin verbosidad innecesaria.`,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, vMessage]);
        setIsLoading(false);
      }, 1500);
    },
    []
  );

  return (
    <div className="flex flex-col h-screen bg-vf-bg-0">
      <ChatContainer messages={messages} isLoading={isLoading} className="flex-1" />
      <ChatComposer onSubmit={handleSubmit} isLoading={isLoading} />
    </div>
  );
};
