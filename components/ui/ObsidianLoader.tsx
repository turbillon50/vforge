"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * ObsidianLoader — loader premium con núcleo obsidian que late.
 *
 * El orbe central usa los HUD glows (var(--hud-glow-v)) y framer-motion
 * para un pulso sutil de brillo violeta/cian. Pensado como estado de carga
 * global elegante (overlay) o inline pequeño. Respeta prefers-reduced-motion
 * vía framer-motion (useReducedMotion no es necesario: el pulso es leve).
 */

type Size = "sm" | "md" | "lg";

const ORB_PX: Record<Size, number> = { sm: 28, md: 48, lg: 72 };

export function ObsidianLoader({
  size = "md",
  label,
  className,
}: {
  size?: Size;
  label?: string;
  className?: string;
}) {
  const px = ORB_PX[size];

  return (
    <div
      className={cn("flex flex-col items-center justify-center gap-4", className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div
        className="relative flex items-center justify-center"
        style={{ width: px * 2, height: px * 2 }}
      >
        {/* Halo difuso obsidian — respira en escala/opacidad */}
        <motion.span
          aria-hidden
          className="absolute rounded-full"
          style={{
            width: px * 1.9,
            height: px * 1.9,
            background:
              "radial-gradient(circle, rgba(124,58,237,0.30) 0%, rgba(34,211,238,0.10) 45%, transparent 70%)",
            filter: "blur(6px)",
          }}
          animate={{ scale: [0.85, 1.1, 0.85], opacity: [0.4, 0.75, 0.4] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Anillo orbital fino */}
        <motion.span
          aria-hidden
          className="absolute rounded-full border"
          style={{
            width: px * 1.35,
            height: px * 1.35,
            borderColor: "rgba(167,139,250,0.35)",
            borderTopColor: "rgba(34,211,238,0.6)",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
        />

        {/* Núcleo obsidian — pulso de glow con los HUD glows del tema */}
        <motion.span
          aria-hidden
          className="relative rounded-full"
          style={{
            width: px,
            height: px,
            background:
              "radial-gradient(circle at 35% 30%, var(--color-surface-high), var(--color-void))",
            border: "1px solid rgba(167,139,250,0.4)",
          }}
          animate={{
            boxShadow: [
              "var(--hud-glow-v)",
              "0 0 30px rgba(124,58,237,0.65), 0 0 80px rgba(34,211,238,0.22)",
              "var(--hud-glow-v)",
            ],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {label ? (
        <motion.p
          className="text-sm tracking-wide"
          style={{ color: "var(--color-muted)" }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          {label}
        </motion.p>
      ) : (
        <span className="sr-only">Cargando…</span>
      )}
    </div>
  );
}

/**
 * Overlay de carga a pantalla completa sobre el void obsidian.
 * Úsalo como fallback de Suspense o estado de carga global.
 */
export function ObsidianLoaderOverlay({ label = "Cargando" }: { label?: string }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(3,2,10,0.78)", backdropFilter: "blur(4px)" }}
    >
      <ObsidianLoader size="lg" label={label} />
    </div>
  );
}

export default ObsidianLoader;
