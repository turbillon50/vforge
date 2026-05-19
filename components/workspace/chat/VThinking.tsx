"use client";

import { motion, AnimatePresence } from "framer-motion";

export type ThinkingPhase = "thinking" | "reasoning" | "writing" | "finalizing";

const PHASE_LABEL: Record<ThinkingPhase, string> = {
  thinking: "pensando",
  reasoning: "razonando",
  writing: "escribiendo",
  finalizing: "finalizando",
};

interface VThinkingProps {
  phase?: ThinkingPhase;
}

export function VThinking({ phase = "thinking" }: VThinkingProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex items-center gap-3"
    >
      <div className="relative h-9 w-9 flex-shrink-0">
        <motion.div
          aria-hidden
          className="absolute inset-0 rounded-full"
          animate={{
            boxShadow: [
              "0 0 0 0 rgba(139,92,246,0)",
              "0 0 28px 4px rgba(139,92,246,0.45)",
              "0 0 0 0 rgba(139,92,246,0)",
            ],
          }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="relative h-9 w-9 overflow-hidden rounded-full ring-1 ring-violet-500/30"
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <motion.div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(120% 80% at 30% 20%, rgba(34,211,238,0.55) 0%, rgba(139,92,246,0.35) 50%, transparent 75%)",
            }}
            animate={{ opacity: [0.45, 0.95, 0.45] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            aria-hidden
            className="absolute inset-2 rounded-full bg-gradient-to-br from-violet-400 to-cyan-400"
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
          />
        </motion.div>
      </div>

      <div className="flex items-baseline gap-1.5 min-w-0">
        <AnimatePresence mode="wait">
          <motion.span
            key={phase}
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: 0.25 }}
            className="text-sm text-on-surface-variant"
          >
            V {PHASE_LABEL[phase]}
          </motion.span>
        </AnimatePresence>
        <ThinkingDots />
      </div>
    </motion.div>
  );
}

function ThinkingDots() {
  return (
    <span className="inline-flex gap-0.5 leading-none text-violet-300/80" aria-hidden>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="inline-block h-1 w-1 rounded-full bg-current"
          animate={{ opacity: [0.2, 1, 0.2], y: [0, -2, 0] }}
          transition={{
            duration: 1.1,
            repeat: Infinity,
            delay: i * 0.18,
            ease: "easeInOut",
          }}
        />
      ))}
    </span>
  );
}
