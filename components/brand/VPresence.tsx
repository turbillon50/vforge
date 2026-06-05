"use client";

/**
 * VPresence — la identidad visual de V.
 * Un orbe vivo: anillo cónico girando lento, núcleo radial respirando,
 * halo difuso. Nada de letras en cuadros. Escala por tamaño.
 */
export function VPresence({
  size = 56,
  breathing = true,
  className = "",
}: {
  size?: number;
  breathing?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`relative inline-block shrink-0 ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {/* halo difuso */}
      <span
        className="absolute rounded-full"
        style={{
          inset: -size * 0.22,
          background:
            "radial-gradient(circle, rgba(139,92,246,0.4), rgba(34,211,238,0.12) 55%, transparent 72%)",
          filter: `blur(${Math.max(4, size * 0.12)}px)`,
          animation: breathing ? "vpresHalo 4.5s ease-in-out infinite" : undefined,
        }}
      />
      {/* anillo cónico girando */}
      <span
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "conic-gradient(from 0deg, #8b5cf6, #22d3ee 35%, #6d6af8 60%, #22d3ee 80%, #8b5cf6)",
          animation: "vpresSpin 9s linear infinite",
        }}
      />
      {/* separación */}
      <span
        className="absolute rounded-full"
        style={{ inset: Math.max(1.5, size * 0.045), background: "var(--color-void)" }}
      />
      {/* núcleo */}
      <span
        className="absolute rounded-full"
        style={{
          inset: Math.max(3, size * 0.09),
          background:
            "radial-gradient(circle at 32% 28%, #c4b5fd, #8b5cf6 45%, #4f46e5 80%, #22d3ee 130%)",
          animation: breathing ? "vpresCore 4.5s ease-in-out infinite" : undefined,
        }}
      />
      {/* brillo superior */}
      <span
        className="absolute rounded-full"
        style={{
          inset: Math.max(3, size * 0.09),
          background:
            "radial-gradient(ellipse 70% 40% at 50% 18%, rgba(255,255,255,0.5), transparent 60%)",
        }}
      />
      <style>{`
        @keyframes vpresSpin { to { transform: rotate(360deg); } }
        @keyframes vpresHalo { 0%,100% { opacity: .75; transform: scale(1); } 50% { opacity: 1; transform: scale(1.08); } }
        @keyframes vpresCore { 0%,100% { transform: scale(1); } 50% { transform: scale(0.965); } }
        @media (prefers-reduced-motion: reduce) {
          [aria-hidden] > span { animation: none !important; }
        }
      `}</style>
    </span>
  );
}
