'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Message {
  id: string;
  role: 'user' | 'v';
  content: string;
  timestamp: Date;
}

interface ChatContainerProps {
  messages: Message[];
  isLoading?: boolean;
  className?: string;
}

const MessageBubble = ({ message }: { message: Message }) => {
  const isV = message.role === 'v';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={cn('flex gap-3 mb-4', isV ? 'justify-start' : 'justify-end')}
    >
      {/* V Avatar */}
      {isV && (
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-vf-green/20 to-vf-green/10 flex items-center justify-center border border-vf-green/30">
          <MessageCircle size={16} className="text-vf-green" />
        </div>
      )}

      {/* Message Bubble */}
      <div
        className={cn(
          'max-w-[70%] rounded-xl px-4 py-3 text-sm leading-relaxed',
          isV
            ? 'bg-vf-bg-2 border border-vf-border text-vf-fg-1'
            : 'bg-vf-green/15 text-vf-fg-1 border border-vf-green/30'
        )}
      >
        {/* Simple markdown-like rendering */}
        <div className="whitespace-pre-wrap break-words">
          {message.content.split('\n').map((line, i) => {
            // Code block detection
            if (line.startsWith('```')) {
              return null;
            }
            // Heading detection
            if (line.startsWith('##')) {
              return (
                <h3 key={i} className="font-semibold text-vf-fg-1 mt-2 mb-1">
                  {line.replace('##', '').trim()}
                </h3>
              );
            }
            // List item detection
            if (line.startsWith('-') || line.startsWith('•')) {
              return (
                <div key={i} className="ml-4 my-1">
                  • {line.replace(/^[-•]\s?/, '')}
                </div>
              );
            }
            return (
              <div key={i} className="my-1">
                {line}
              </div>
            );
          })}
        </div>
      </div>

      {/* User Avatar Space */}
      {!isV && <div className="flex-shrink-0 w-8 h-8" />}
    </motion.div>
  );
};

export const ChatContainer = ({
  messages,
  isLoading = false,
  className,
}: ChatContainerProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollHint, setShowScrollHint] = useState(false);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      const scrollHeight = scrollRef.current.scrollHeight;
      const clientHeight = scrollRef.current.clientHeight;
      const scrollTop = scrollRef.current.scrollTop;

      // Show hint if user scrolled up
      setShowScrollHint(scrollHeight - clientHeight - scrollTop > 100);

      // Auto-scroll if near bottom
      if (scrollHeight - clientHeight - scrollTop < 200) {
        setTimeout(() => {
          scrollRef.current?.scrollTo({
            top: scrollHeight,
            behavior: 'smooth',
          });
        }, 100);
      }
    }
  }, [messages]);

  return (
    <div
      className={cn(
        'flex flex-col h-full relative',
        'bg-vf-bg-0 border-l border-vf-border',
        className
      )}
    >
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-vf-border bg-vf-bg-1/50">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-vf-green animate-pulse" />
          <h2 className="font-semibold text-vf-fg-1">V - Agente Autónomo</h2>
        </div>
        <p className="text-xs text-vf-fg-2 mt-1">
          {messages.length} mensajes en esta sesión
        </p>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-6 py-4 space-y-4 scroll-smooth"
      >
        {messages.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center h-full text-center"
          >
            <MessageCircle size={48} className="text-vf-green/30 mb-4" />
            <h3 className="text-vf-fg-1 font-semibold mb-2">
              ¡Hola! Soy V
            </h3>
            <p className="text-vf-fg-2 text-sm max-w-xs">
              Tu asistente autónomo. Comenzamos una conversación cuando envíes tu primer mensaje.
            </p>
          </motion.div>
        ) : (
          <AnimatePresence>
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
          </AnimatePresence>
        )}

        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3"
          >
            <div className="w-8 h-8 rounded-lg bg-vf-green/20 flex items-center justify-center border border-vf-green/30">
              <div className="flex gap-1">
                <div
                  className="w-1.5 h-1.5 rounded-full bg-vf-green animate-bounce"
                  style={{ animationDelay: '0ms' }}
                />
                <div
                  className="w-1.5 h-1.5 rounded-full bg-vf-green animate-bounce"
                  style={{ animationDelay: '150ms' }}
                />
                <div
                  className="w-1.5 h-1.5 rounded-full bg-vf-green animate-bounce"
                  style={{ animationDelay: '300ms' }}
                />
              </div>
            </div>
            <div className="bg-vf-bg-2 border border-vf-border rounded-xl px-4 py-3">
              <p className="text-vf-fg-2 text-sm">V está pensando...</p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Scroll to bottom hint */}
      {showScrollHint && (
        <motion.button
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => {
            if (scrollRef.current) {
              scrollRef.current.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: 'smooth',
              });
            }
          }}
          className="absolute bottom-20 left-1/2 -translate-x-1/2 px-3 py-2 bg-vf-green/20 border border-vf-green/50 rounded-lg text-xs text-vf-green hover:bg-vf-green/30 transition-colors"
        >
          ↓ Nuevos mensajes
        </motion.button>
      )}
    </div>
  );
};
