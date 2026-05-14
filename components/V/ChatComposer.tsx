'use client';

import { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Paperclip, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatComposerProps {
  onSubmit: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
}

export const ChatComposer = ({
  onSubmit,
  isLoading = false,
  placeholder = 'Envía un mensaje a V...',
  className,
}: ChatComposerProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const maxHeight = 200; // Max height before internal scroll
      textareaRef.current.style.height = Math.min(scrollHeight, maxHeight) + 'px';
    }
  }, [value]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim() && !isLoading) {
      onSubmit(value.trim());
      setValue('');
      // Reset height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const hasContent = value.trim().length > 0;

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        'flex-shrink-0 px-6 py-4 border-t border-vf-border bg-vf-bg-1',
        'transition-all duration-300',
        isFocused && 'bg-vf-bg-0',
        className
      )}
    >
      <motion.div
        animate={{
          borderColor: isFocused ? 'rgba(0, 255, 136, 0.3)' : 'rgba(255, 255, 255, 0.1)',
        }}
        transition={{ duration: 0.2 }}
        className={cn(
          'relative flex items-end gap-3 px-4 py-3 rounded-xl',
          'border transition-all duration-300',
          'bg-vf-bg-2',
          isFocused
            ? 'border-vf-green/50 ring-1 ring-vf-green/20'
            : 'border-vf-border hover:border-vf-border/80'
        )}
      >
        {/* Attach File Button */}
        <motion.button
          type="button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          disabled={isLoading}
          className="flex-shrink-0 p-2 text-vf-fg-2 hover:text-vf-fg-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Adjuntar archivo"
        >
          <Paperclip size={20} />
        </motion.button>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          placeholder={placeholder}
          className={cn(
            'flex-1 max-h-[200px] bg-transparent',
            'text-vf-fg-1 placeholder:text-vf-fg-3',
            'outline-none resize-none',
            'font-normal text-sm leading-relaxed',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'scrollbar-thin scrollbar-thumb-vf-border scrollbar-track-transparent'
          )}
          rows={1}
        />

        {/* Mic Button */}
        <motion.button
          type="button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          disabled={isLoading}
          className="flex-shrink-0 p-2 text-vf-fg-2 hover:text-vf-fg-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Dictar mensaje"
        >
          <Mic size={20} />
        </motion.button>

        {/* Send Button */}
        <motion.button
          type="submit"
          disabled={!hasContent || isLoading}
          whileHover={hasContent && !isLoading ? { scale: 1.05 } : {}}
          whileTap={hasContent && !isLoading ? { scale: 0.95 } : {}}
          className={cn(
            'flex-shrink-0 p-2 rounded-lg transition-all duration-300',
            hasContent && !isLoading
              ? 'bg-vf-green/20 text-vf-green hover:bg-vf-green/30 cursor-pointer'
              : 'bg-transparent text-vf-fg-3 cursor-not-allowed'
          )}
          title={hasContent ? 'Enviar mensaje (Enter)' : 'Escribe un mensaje para enviar'}
        >
          <Send size={20} />
        </motion.button>
      </motion.div>

      {/* Helper Text */}
      <p className="text-xs text-vf-fg-3 mt-2 ml-1">
        <span className="text-vf-green">Shift+Enter</span> para nueva línea •{' '}
        <span className="text-vf-green">Enter</span> para enviar
      </p>
    </form>
  );
};
