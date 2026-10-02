"use client";

import { ForgeMark } from "@/components/brand/ForgeMark";

/**
 * VPresence — la identidad visual de V dentro de la app.
 *
 * Ley visual 2-oct-2026 (corrección de Luis al PR #215): la esfera de cristal
 * con halo, anillo cónico y núcleo radial era de la teoría vieja y NO se
 * rescata. Queda la marca aprobada: el triángulo invertido sobre una pastilla
 * morada plana. Fondo blanco, borde fino, cero glow.
 *
 * Los estados se conservan porque el chat los usa para decir qué hace V, pero
 * ahora se expresan con un punto de estado discreto, no con efectos:
 *   - idle:       V esperando (sin punto).
 *   - thinking:   V procesando (punto morado latiendo).
 *   - responding: V hablando (punto verde latiendo).
 *   - still:      quieta, sin animación.
 */
type VState = "idle" | "thinking" | "responding" | "still";

export function VPresence({
  size = 56,
  breathing = true,
  state,
  className = "",
}: {
  size?: number;
  breathing?: boolean;
  state?: Exclude<VState, "still">;
  className?: string;
}) {
  const resolved: VState = state ?? (breathing ? "idle" : "still");
  const activo = resolved === "thinking" || resolved === "responding";
  const puntoColor = resolved === "responding" ? "#15803d" : "#7c3aed";
  const dot = Math.max(5, Math.round(size * 0.22));

  return (
    <span
      className={`relative inline-grid shrink-0 place-items-center rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        background: "var(--vf-violet)",
        border: "1px solid var(--vf-violet-strong)",
      }}
      aria-hidden
    >
      <ForgeMark size={Math.max(8, Math.round(size * 0.42))} className="text-white" />

      {/* Punto de estado: solo cuando V está pensando o respondiendo. */}
      {activo && (
        <span
          className="absolute rounded-full border-2 border-white"
          style={{
            width: dot,
            height: dot,
            right: -1,
            bottom: -1,
            background: puntoColor,
            animation: "vpresPunto 1.4s ease-in-out infinite",
          }}
        />
      )}

      <style>{`
        @keyframes vpresPunto { 0%,100% { opacity: 1; } 50% { opacity: .45; } }
        @media (prefers-reduced-motion: reduce) {
          [aria-hidden] > span { animation: none !important; }
        }
      `}</style>
    </span>
  );
}
