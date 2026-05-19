'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export type ThinkingPhase = 'thinking' | 'reasoning' | 'writing' | 'finalizing';

const PHASE_LABEL: Record<ThinkingPhase, string> = {
  thinking: 'pensando',
  reasoning: 'razonando',
  writing: 'escribiendo',
  finalizing: 'finalizando',
};

interface VThinkingProps {
  phase?: ThinkingPhase;
  className?: string;
}

export function VThinking({ phase = 'thinking', className }: VThinkingProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={cn('flex items-center gap-3', className)}
    >
      <div className="relative flex-shrink-0">
        <motion.div
          aria-hidden
          className="absolute inset-0 rounded-2xl"
          animate={{
            boxShadow: [
              '0 0 0 0 rgba(0, 255, 136, 0.0)',
              '0 0 32px 4px rgba(0, 255, 136, 0.45)',
              '0 0 0 0 rgba(0, 255, 136, 0.0)',
            ],
          }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className={cn(
            'relative w-10 h-10 rounded-2xl overflow-hidden',
            'bg-gradient-to-br from-vf-green/30 via-vf-green/10 to-transparent',
            'border border-vf-green/40',
            'flex items-center justify-center',
          )}
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        >
          <motion.div
            aria-hidden
            className="absolute inset-0 opacity-60"
            style={{
              background:
                'radial-gradient(120% 80% at 30% 20%, rgba(0,255,136,0.35) 0%, rgba(0,255,136,0) 60%)',
            }}
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.span
            className="relative text-vf-green font-mono text-lg leading-none tracking-tight select-none"
            animate={{ y: [0, -1, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          >
            V
          </motion.span>
        </motion.div>
      </div>

      <div className="flex items-baseline gap-1.5 min-w-0">
        <AnimatePresence mode="wait">
          <motion.span
            key={phase}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
            className="text-sm text-vf-fg-2"
          >
            {PHASE_LABEL[phase]}
          </motion.span>
        </AnimatePresence>
        <ThinkingDots />
      </div>
    </motion.div>
  );
}

function ThinkingDots() {
  return (
    <span className="inline-flex gap-0.5 text-vf-green/80 leading-none" aria-hidden>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="inline-block w-1 h-1 rounded-full bg-current"
          animate={{ opacity: [0.2, 1, 0.2], y: [0, -2, 0] }}
          transition={{
            duration: 1.1,
            repeat: Infinity,
            delay: i * 0.18,
            ease: 'easeInOut',
          }}
        />
      ))}
    </span>
  );
}
