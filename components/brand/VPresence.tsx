"use client";

/**
 * VPresence — la identidad visual de V.
 * Un orbe vivo: anillo cónico girando lento, núcleo radial respirando,
 * halo difuso. Nada de letras en cuadros. Escala por tamaño.
 *
 * La ESFERA es el símbolo central de toda la experiencia. Estados:
 *   - idle:       respira suave, gira lento. V esperando.
 *   - thinking:   gira rápido, halo más intenso. V procesando.
 *   - responding: pulso + onda expansiva. V hablando.
 *   - still:      quieta (sin animación).
 *
 * `breathing` se mantiene por compatibilidad: true → idle, false → still.
 */
type VState = "idle" | "thinking" | "responding" | "still";

const SPEEDS: Record<VState, { spin: number; pulse: number }> = {
  idle: { spin: 9, pulse: 4.5 },
  thinking: { spin: 3.2, pulse: 1.6 },
  responding: { spin: 5, pulse: 2.2 },
  still: { spin: 0, pulse: 0 },
};

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
  const cfg = SPEEDS[resolved];
  const animate = resolved !== "still";
  const intense = resolved === "thinking" || resolved === "responding";

  return (
    <span
      className={`relative inline-block shrink-0 ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {/* halo difuso — más intenso al pensar/responder */}
      <span
        className="absolute rounded-full"
        style={{
          inset: -size * 0.22,
          background: intense
            ? "radial-gradient(circle, rgba(139,92,246,0.6), rgba(34,211,238,0.22) 55%, transparent 72%)"
            : "radial-gradient(circle, rgba(139,92,246,0.4), rgba(34,211,238,0.12) 55%, transparent 72%)",
          filter: `blur(${Math.max(4, size * (intense ? 0.16 : 0.12))}px)`,
          animation: animate ? `vpresHalo ${cfg.pulse}s ease-in-out infinite` : undefined,
        }}
      />
      {/* onda expansiva — solo al responder */}
      {resolved === "responding" && (
        <span
          className="absolute inset-0 rounded-full"
          style={{
            border: "1.5px solid rgba(34,211,238,0.55)",
            animation: "vpresWave 1.4s ease-out infinite",
          }}
        />
      )}
      {/* anillo cónico girando */}
      <span
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "conic-gradient(from 0deg, #8b5cf6, #22d3ee 35%, #6d6af8 60%, #22d3ee 80%, #8b5cf6)",
          animation: cfg.spin ? `vpresSpin ${cfg.spin}s linear infinite` : undefined,
        }}
      />
      {/* separación — apenas una hairline entre anillo y núcleo */}
      <span
        className="absolute rounded-full"
        style={{ inset: Math.max(1, size * 0.018), background: "#03020a" }}
      />
      {/* núcleo — domina el orbe: bola de luz, no aro */}
      <span
        className="absolute rounded-full"
        style={{
          inset: Math.max(2, size * 0.05),
          background:
            "radial-gradient(circle at 32% 28%, #c4b5fd, #8b5cf6 45%, #4f46e5 80%, #22d3ee 130%)",
          animation: animate ? `vpresCore ${cfg.pulse}s ease-in-out infinite` : undefined,
        }}
      />
      {/* brillo superior */}
      <span
        className="absolute rounded-full"
        style={{
          inset: Math.max(2, size * 0.05),
          background:
            "radial-gradient(ellipse 70% 40% at 50% 18%, rgba(255,255,255,0.5), transparent 60%)",
        }}
      />
      <style>{`
        @keyframes vpresSpin { to { transform: rotate(360deg); } }
        @keyframes vpresHalo { 0%,100% { opacity: .75; transform: scale(1); } 50% { opacity: 1; transform: scale(1.08); } }
        @keyframes vpresCore { 0%,100% { transform: scale(1); } 50% { transform: scale(0.965); } }
        @keyframes vpresWave { 0% { transform: scale(0.92); opacity: .7; } 100% { transform: scale(1.55); opacity: 0; } }
        @media (prefers-reduced-motion: reduce) {
          [aria-hidden] > span { animation: none !important; }
        }
      `}</style>
    </span>
  );
}
