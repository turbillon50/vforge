"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { VPresence } from "@/components/brand/VPresence";

const PHASES = [
  "Pensando…",
  "Razonando…",
  "Conectando memoria…",
  "Preparando respuesta…",
];

/**
 * Gemini-style "thinking" indicator. Purely cosmetic: the phase labels
 * rotate on a fixed timer and are NOT tied to actual backend state.
 * Shown only while the assistant message is empty (before the first
 * streamed character arrives).
 */
export function ThinkingIndicator() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setPhase((p) => (p + 1) % PHASES.length);
    }, 2200);
    return () => clearInterval(id);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.25 }}
      className="flex items-center gap-3 rounded-xl border border-violet-500/20 bg-violet-500/[0.06] px-3 py-2"
      aria-live="polite"
      aria-label="V está procesando"
    >
      <div className="relative h-6 w-6 shrink-0">
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "conic-gradient(from 0deg, rgba(139,92,246,0.95), rgba(34,211,238,0.95), rgba(139,92,246,0.95))",
            filter: "blur(0.5px)",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 2.2, ease: "linear", repeat: Infinity }}
        />
        <div className="absolute inset-[3px] rounded-full bg-void" />
        <motion.div
          className="absolute inset-[5px] rounded-full bg-gradient-to-br from-violet-400 to-cyan-400"
          animate={{ scale: [0.8, 1.1, 0.8], opacity: [0.85, 1, 0.85] }}
          transition={{ duration: 1.3, ease: "easeInOut", repeat: Infinity }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-2 rounded-full"
          style={{
            background:
              "radial-gradient(circle at center, rgba(139,92,246,0.35), transparent 65%)",
            filter: "blur(5px)",
          }}
        />
      </div>
      <div className="relative h-[1.2rem] flex-1 min-w-0 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.span
            key={phase}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="absolute inset-0 bg-gradient-to-r from-violet-300 via-on-surface to-cyan-300 bg-clip-text font-sans text-[14px] font-semibold tracking-tight text-transparent"
          >
            {PHASES[phase]}
          </motion.span>
        </AnimatePresence>
      </div>
      <motion.div
        aria-hidden
        className="flex shrink-0 items-center gap-1"
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1.4, ease: "easeInOut", repeat: Infinity }}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
        <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
        <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
      </motion.div>
    </motion.div>
  );
}

/** Avatar de V en burbujas — delega a la identidad oficial. */
export function VOrb({ size = 24 }: { size?: number }) {
  return <VPresence size={size} />;
}
