"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

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
      className="flex items-center gap-2.5 py-1"
      aria-live="polite"
      aria-label="V está procesando"
    >
      <div className="relative h-5 w-5">
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "conic-gradient(from 0deg, rgba(139,92,246,0.95), rgba(34,211,238,0.95), rgba(139,92,246,0.95))",
            filter: "blur(0.5px)",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 2.6, ease: "linear", repeat: Infinity }}
        />
        <div className="absolute inset-[3px] rounded-full bg-void" />
        <motion.div
          className="absolute inset-[5px] rounded-full bg-gradient-to-br from-violet-400 to-cyan-400"
          animate={{ scale: [0.85, 1.05, 0.85], opacity: [0.85, 1, 0.85] }}
          transition={{ duration: 1.4, ease: "easeInOut", repeat: Infinity }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-2 rounded-full"
          style={{
            background:
              "radial-gradient(circle at center, rgba(139,92,246,0.25), transparent 65%)",
            filter: "blur(4px)",
          }}
        />
      </div>
      <div className="relative h-5 min-w-[140px] overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.span
            key={phase}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.32, ease: "easeOut" }}
            className="absolute inset-0 bg-gradient-to-r from-violet-300 via-on-surface to-cyan-300 bg-clip-text font-mono text-[12px] uppercase tracking-[0.18em] text-transparent"
          >
            {PHASES[phase]}
          </motion.span>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/** Subtle gradient orb used as the assistant avatar in message bubbles. */
export function VOrb({ size = 24 }: { size?: number }) {
  return (
    <div
      className="relative shrink-0 rounded-full"
      style={{ width: size, height: size }}
    >
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "conic-gradient(from 140deg, #8b5cf6, #22d3ee, #8b5cf6)",
        }}
      />
      <div className="absolute inset-[2px] rounded-full bg-void" />
      <div className="absolute inset-[4px] rounded-full bg-gradient-to-br from-violet-400 to-cyan-400" />
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-1 rounded-full opacity-60"
        style={{
          background:
            "radial-gradient(circle, rgba(139,92,246,0.35), transparent 70%)",
          filter: "blur(3px)",
        }}
      />
    </div>
  );
}
