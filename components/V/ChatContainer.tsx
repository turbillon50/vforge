'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MessageBody } from './MessageBody';
import { ProcessTrace, type TraceEntry } from './ProcessTrace';
import { VThinking, type ThinkingPhase } from './VThinking';

export interface Message {
  id: string;
  role: 'user' | 'v';
  content: string;
  timestamp: Date;
  traces?: TraceEntry[];
}

interface ChatContainerProps {
  messages: Message[];
  isLoading?: boolean;
  phase?: ThinkingPhase;
  className?: string;
}

const NEAR_BOTTOM_PX = 80;

const MessageRow = ({
  message,
  isLastAssistant,
  showCursor,
}: {
  message: Message;
  isLastAssistant: boolean;
  showCursor: boolean;
}) => {
  const isV = message.role === 'v';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={cn('flex w-full', isV ? 'justify-start' : 'justify-end')}
    >
      <div className={cn('flex gap-3 max-w-3xl w-full', isV ? '' : 'justify-end')}>
        {isV && <Avatar />}

        <div className={cn('flex flex-col min-w-0', isV ? 'flex-1' : 'items-end')}>
          {isV && message.traces && message.traces.length > 0 && (
            <div className="flex flex-col gap-0.5 mb-1 -ml-11 self-stretch">
              <AnimatePresence initial={false}>
                {message.traces.map((t) => (
                  <ProcessTrace key={t.id} entry={t} />
                ))}
              </AnimatePresence>
            </div>
          )}

          <div
            className={cn(
              'rounded-2xl px-4 py-2.5 text-sm leading-relaxed break-words',
              isV
                ? 'bg-vf-bg-2/70 border border-vf-border text-vf-fg-1 max-w-full'
                : 'bg-vf-green/15 border border-vf-green/30 text-vf-fg-1 max-w-[80%]',
            )}
          >
            {isV ? (
              message.content ? (
                <>
                  <MessageBody content={message.content} />
                  {isLastAssistant && showCursor && <Cursor />}
                </>
              ) : isLastAssistant && showCursor ? (
                <Cursor inline />
              ) : null
            ) : (
              <div className="whitespace-pre-wrap">{message.content}</div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

function Avatar() {
  return (
    <div
      aria-hidden
      className={cn(
        'flex-shrink-0 w-8 h-8 mt-0.5 rounded-xl',
        'bg-gradient-to-br from-vf-green/25 via-vf-green/10 to-transparent',
        'border border-vf-green/30',
        'flex items-center justify-center',
        'font-mono text-sm text-vf-green leading-none select-none',
      )}
    >
      V
    </div>
  );
}

function Cursor({ inline }: { inline?: boolean }) {
  return (
    <motion.span
      aria-hidden
      className={cn(
        'inline-block align-baseline w-[2px] h-[1em] bg-vf-green/80 ml-0.5 -mb-[1px] rounded-[1px]',
        inline ? '' : '',
      )}
      animate={{ opacity: [1, 0.2, 1] }}
      transition={{ duration: 1.0, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

export const ChatContainer = ({
  messages,
  isLoading = false,
  phase = 'thinking',
  className,
}: ChatContainerProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showJumpButton, setShowJumpButton] = useState(false);

  const lastAssistantId = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'v') return messages[i].id;
    }
    return null;
  })();

  // Track whether the user has scrolled away from the bottom. While they are
  // away we pause auto-scroll and surface a jump-to-bottom pill.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const distance = el.scrollHeight - el.clientHeight - el.scrollTop;
      const atBottom = distance < NEAR_BOTTOM_PX;
      setAutoScroll(atBottom);
      setShowJumpButton(!atBottom);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  // Stick to bottom on new content while user is at the bottom.
  useEffect(() => {
    if (!autoScroll) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, isLoading, autoScroll]);

  const jumpToBottom = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    setAutoScroll(true);
    setShowJumpButton(false);
  };

  return (
    <div className={cn('relative flex flex-col min-h-0 h-full bg-vf-bg-0', className)}>
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 scroll-smooth"
      >
        <div className="mx-auto w-full max-w-3xl space-y-5">
          {messages.length === 0 ? (
            <Empty />
          ) : (
            messages.map((message) => (
              <MessageRow
                key={message.id}
                message={message}
                isLastAssistant={message.id === lastAssistantId}
                showCursor={isLoading && message.id === lastAssistantId}
              />
            ))
          )}

          <AnimatePresence>
            {isLoading &&
              (() => {
                const last = lastAssistantId
                  ? messages.find((m) => m.id === lastAssistantId)
                  : null;
                if (last && last.content.length > 0) return null;
                return (
                  <div className="pl-0">
                    <VThinking phase={phase} />
                  </div>
                );
              })()}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {showJumpButton && (
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            onClick={jumpToBottom}
            className={cn(
              'absolute bottom-3 left-1/2 -translate-x-1/2',
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full',
              'bg-vf-bg-2/90 backdrop-blur border border-vf-border',
              'text-xs text-vf-fg-2 hover:text-vf-fg-1 hover:border-vf-green/40',
              'shadow-lg transition-colors',
            )}
            aria-label="Jump to latest"
          >
            <ChevronDown size={12} />
            <span>Nuevo contenido</span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

function Empty() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="flex flex-col items-center justify-center min-h-[50vh] text-center"
    >
      <div
        className={cn(
          'w-14 h-14 mb-4 rounded-2xl',
          'bg-gradient-to-br from-vf-green/25 via-vf-green/10 to-transparent',
          'border border-vf-green/40',
          'flex items-center justify-center',
          'font-mono text-2xl text-vf-green',
        )}
      >
        V
      </div>
      <h3 className="text-vf-fg-1 font-semibold mb-1.5 text-base">Lista para operar</h3>
      <p className="text-vf-fg-2 text-sm max-w-sm">
        Mándame lo que necesites — repos, deploys, dominios, código.
      </p>
    </motion.div>
  );
}
