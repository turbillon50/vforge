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
      className="flex items-center gap-3 rounded-xl border border-[var(--border-1)] bg-white px-3 py-2"
      aria-live="polite"
      aria-label="V está procesando"
    >
      {/* Aro de carga: una línea morada girando. Sin degradados ni luz difusa. */}
      <motion.span
        aria-hidden
        className="h-5 w-5 shrink-0 rounded-full border-2"
        style={{
          borderColor: "var(--border-2)",
          borderTopColor: "var(--vf-violet)",
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 0.9, ease: "linear", repeat: Infinity }}
      />
      <div className="relative h-[1.2rem] min-w-0 flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.span
            key={phase}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="absolute inset-0 font-sans text-[14px] font-semibold tracking-tight text-[var(--fg-primary)]"
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
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--vf-violet)]" />
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--vf-violet)]" />
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--vf-violet)]" />
      </motion.div>
    </motion.div>
  );
}

/** Avatar de V en burbujas — delega a la identidad oficial. */
export function VOrb({ size = 24 }: { size?: number }) {
  return <VPresence size={size} />;
}
