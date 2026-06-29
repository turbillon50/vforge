"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { VulcanoCore } from "./VulcanoCore";
import { IconGlobe } from "@/components/brand/VFIcons";

const ACCENT = "#8b5cf6";

/**
 * Splash de entrada del Navegador Vulcano. Núcleo que pulsa + texto que aparece
 * de forma escalonada y elegante. Se auto-cierra a los `holdMs`.
 */
export function VulcanoSplash({
  onDone,
  holdMs = 2200,
}: {
  onDone: () => void;
  holdMs?: number;
}) {
  useEffect(() => {
    const t = setTimeout(onDone, holdMs);
    return () => clearTimeout(t);
  }, [onDone, holdMs]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, filter: "blur(8px)" }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 30,
        background:
          "radial-gradient(circle at 50% 38%, #0c1226 0%, #07070d 60%, #04040a 100%)",
        fontFamily: "var(--font-geist-sans), Inter, system-ui, sans-serif",
      }}
    >
      {/* Grid sutil de fondo */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(139,92,246,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.05) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(circle at 50% 40%, #000 0%, transparent 72%)",
          WebkitMaskImage: "radial-gradient(circle at 50% 40%, #000 0%, transparent 72%)",
          pointerEvents: "none",
        }}
      />

      {/* Núcleo */}
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        style={{ position: "relative", zIndex: 1 }}
      >
        <VulcanoCore size={132} accent={ACCENT} driving />
      </motion.div>

      {/* Texto escalonado */}
      <div style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            padding: "5px 13px",
            borderRadius: 999,
            border: `1px solid ${ACCENT}33`,
            background: `${ACCENT}10`,
            color: ACCENT,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            marginBottom: 16,
          }}
        >
          <IconGlobe size={13} />
          IA &amp; Human · VForge
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.66, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          style={{
            margin: 0,
            fontSize: "clamp(1.7rem, 5vw, 2.6rem)",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            color: "#f0ecff",
            lineHeight: 1.05,
          }}
        >
          Navegador <span style={{ color: ACCENT }}>Vulcano</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.82, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          style={{
            margin: "12px auto 0",
            maxWidth: 340,
            fontSize: 13.5,
            lineHeight: 1.6,
            color: "#8a95a3",
          }}
        >
          Inicializando tu entorno remoto seguro…
        </motion.p>
      </div>

      {/* Barra de carga sutil */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.4 }}
        style={{
          position: "relative",
          zIndex: 1,
          width: 180,
          height: 2,
          borderRadius: 999,
          overflow: "hidden",
          background: "rgba(255,255,255,0.06)",
        }}
      >
        <motion.span
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(90deg, transparent, ${ACCENT}, transparent)`,
          }}
        />
      </motion.div>
    </motion.div>
  );
}
