"use client";

import { motion } from "framer-motion";
import { useLiteMotion } from "@/components/cockpit/use-lite-motion";

/**
 * VulcanoCore — núcleo/orbe Vulcano animado y reutilizable.
 * Capas: halo que respira, anillo cónico que gira, esfera de cristal,
 * reflejo especular, núcleo que pulsa y dos partículas en órbita.
 * `driving` acelera el pulso (IA operando) vs ritmo calmo (tu turno).
 *
 * MODO LITE (móvil / reduce-motion): apaga el giro del anillo, las partículas
 * en órbita, el respiro del halo y el pulso del núcleo. Queda la esfera de
 * cristal estática con su glow — se ve igual de premium pero sin repintar cada
 * frame, que es lo que trababa el scroll/touch en celular.
 */
export function VulcanoCore({
  size = 120,
  accent = "#8b5cf6",
  driving = true,
}: {
  size?: number;
  accent?: string;
  driving?: boolean;
}) {
  const lite = useLiteMotion();
  const pulse = driving ? 2.4 : 3.6;
  const r = size / 2;

  return (
    <div style={{ position: "relative", width: size, height: size }} aria-hidden>
      {/* Halo exterior que respira (estático en lite) */}
      <motion.span
        animate={lite ? { scale: 1, opacity: 0.5 } : { scale: [1, 1.18, 1], opacity: [0.35, 0.7, 0.35] }}
        transition={lite ? { duration: 0 } : { duration: pulse * 1.3, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute",
          inset: -size * 0.22,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${accent}66 0%, ${accent}22 45%, transparent 70%)`,
          filter: `blur(${size * (lite ? 0.03 : 0.06)}px)`,
          pointerEvents: "none",
        }}
      />

      {/* Anillo cónico (giratorio en desktop, estático en lite) */}
      <motion.span
        animate={lite ? { rotate: 0 } : { rotate: 360 }}
        transition={lite ? { duration: 0 } : { duration: driving ? 6 : 11, repeat: Infinity, ease: "linear" }}
        style={{
          position: "absolute",
          inset: -2,
          borderRadius: "50%",
          background: `conic-gradient(from 0deg, ${accent}, #a78bfa, ${accent}00, ${accent}, #7c3aed, ${accent})`,
          WebkitMask: "radial-gradient(circle, transparent 86%, #000 92%)",
          mask: "radial-gradient(circle, transparent 86%, #000 92%)",
          opacity: lite ? 0.7 : 1,
        }}
      />

      {/* Esfera de cristal */}
      <span
        style={{
          position: "absolute",
          inset: size * 0.07,
          borderRadius: "50%",
          background: `radial-gradient(circle at 50% 45%, ${accent}33 0%, #140a2e 58%, #05030f 100%)`,
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: `inset 0 0 ${size * 0.2}px ${accent}55, inset 0 ${size * 0.04}px ${size * 0.08}px rgba(255,255,255,0.12)`,
          overflow: "hidden",
        }}
      >
        {/* Núcleo interno que pulsa (estático en lite) */}
        <motion.span
          animate={lite ? { scale: 0.95, opacity: 0.9 } : { scale: [0.82, 1.06, 0.82], opacity: [0.65, 1, 0.65] }}
          transition={lite ? { duration: 0 } : { duration: pulse, repeat: Infinity, ease: "easeInOut" }}
          style={{
            position: "absolute",
            inset: "26%",
            borderRadius: "50%",
            background: `radial-gradient(circle at 50% 50%, #ffffff 0%, ${accent} 38%, ${accent}00 72%)`,
            mixBlendMode: "screen",
          }}
        />
        {/* Reflejo especular */}
        <span
          style={{
            position: "absolute",
            top: "12%",
            left: "20%",
            width: "42%",
            height: "32%",
            borderRadius: "50%",
            background:
              "radial-gradient(ellipse at 30% 30%, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.18) 40%, transparent 70%)",
            filter: "blur(1px)",
          }}
        />
      </span>

      {/* Partículas en órbita — solo desktop (en lite se omiten) */}
      {!lite &&
        [0, 1].map((i) => (
          <motion.span
            key={i}
            animate={{ rotate: 360 }}
            transition={{
              duration: i === 0 ? 7 : 10,
              repeat: Infinity,
              ease: "linear",
              delay: i * 0.4,
            }}
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              pointerEvents: "none",
            }}
          >
            <span
              style={{
                position: "absolute",
                top: i === 0 ? -2 : "auto",
                bottom: i === 0 ? "auto" : -2,
                left: r - 2,
                width: 4,
                height: 4,
                borderRadius: "50%",
                background: i === 0 ? "#fff" : accent,
                boxShadow: `0 0 8px ${accent}, 0 0 14px ${accent}aa`,
              }}
            />
          </motion.span>
        ))}
    </div>
  );
}
