"use client";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";

/* ─────────────────────────────────────────────────────────────────────────────
   VForge Hero — Calidad premium. Referencias: Linear, Vercel, Replit 2024.
   Un solo mensaje poderoso. Sin esferas. Sin tour. Sin distracciones.
   Fondo: malla animada + glow central suave + ruido de textura.
   Tipografía: display grande con gradiente en palabra clave.
   CTA: primario sólido + secundario ghost.
   Preview: terminal/chat animado con líneas reales de V.
───────────────────────────────────────────────────────────────────────────── */

const TERMINAL_LINES = [
  { delay: 0.4,  color: "#8b5cf6", text: "$ vforge init mi-proyecto-cliente" },
  { delay: 1.0,  color: "#22d3ee", text: "✓ Vault cifrado conectado" },
  { delay: 1.6,  color: "#22d3ee", text: "✓ GitHub repo vinculado" },
  { delay: 2.2,  color: "#22d3ee", text: "✓ Vercel project creado" },
  { delay: 2.8,  color: "#22d3ee", text: "✓ Neon DB inicializada" },
  { delay: 3.4,  color: "#a78bfa", text: "V ›  ¿Qué construimos primero?" },
  { delay: 4.0,  color: "#e8e4ff", text: "  →  Panel de administración con auth" },
  { delay: 4.8,  color: "#22c55e", text: "✓ Deploy a producción — 47s" },
];

const BADGES = [
  "GitHub", "Vercel", "Neon", "Stripe",
  "MercadoPago", "Clerk", "Resend", "Twilio",
];

export function Hero() {
  const reduce = useReducedMotion();
  const [visibleLines, setVisibleLines] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  /* ── Mesh animado en canvas ── */
  useEffect(() => {
    if (reduce) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let t = 0;

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener("resize", resize);

    const COLS = 14;
    const ROWS = 8;

    const draw = () => {
      const W = canvas.offsetWidth;
      const H = canvas.offsetHeight;
      ctx.clearRect(0, 0, W, H);
      t += 0.003;

      const cellW = W / COLS;
      const cellH = H / ROWS;

      for (let r = 0; r <= ROWS; r++) {
        for (let c = 0; c <= COLS; c++) {
          const wave = Math.sin(t + c * 0.5 + r * 0.8) * 6;
          const x = c * cellW + wave;
          const y = r * cellH + wave * 0.5;

          // Líneas horizontales
          if (c < COLS) {
            const nx = (c + 1) * cellW + Math.sin(t + (c + 1) * 0.5 + r * 0.8) * 6;
            const ny = r * cellH + Math.sin(t + (c + 1) * 0.5 + r * 0.8) * 0.5 * 6;
            const dist = Math.sqrt(Math.pow((c - COLS / 2) / COLS, 2) + Math.pow((r - ROWS / 2) / ROWS, 2));
            const alpha = Math.max(0, 0.06 - dist * 0.06);
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(nx, ny);
            ctx.strokeStyle = `rgba(139,92,246,${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }

          // Líneas verticales
          if (r < ROWS) {
            const bwave = Math.sin(t + c * 0.5 + (r + 1) * 0.8) * 6;
            const bx = c * cellW + bwave;
            const by = (r + 1) * cellH + bwave * 0.5;
            const dist = Math.sqrt(Math.pow((c - COLS / 2) / COLS, 2) + Math.pow((r - ROWS / 2) / ROWS, 2));
            const alpha = Math.max(0, 0.06 - dist * 0.06);
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(bx, by);
            ctx.strokeStyle = `rgba(34,211,238,${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }

          // Puntos de intersección
          const dist2 = Math.sqrt(Math.pow((c - COLS / 2) / COLS, 2) + Math.pow((r - ROWS / 2) / ROWS, 2));
          const dotAlpha = Math.max(0, 0.25 - dist2 * 0.4);
          ctx.beginPath();
          ctx.arc(x, y, 1, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(139,92,246,${dotAlpha})`;
          ctx.fill();
        }
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animId);
    };
  }, [reduce]);

  /* ── Terminal: líneas aparecen en secuencia ── */
  useEffect(() => {
    if (reduce) { setVisibleLines(TERMINAL_LINES.length); return; }
    const timers = TERMINAL_LINES.map((l, i) =>
      setTimeout(() => setVisibleLines(i + 1), l.delay * 1000)
    );
    return () => timers.forEach(clearTimeout);
  }, [reduce]);

  return (
    <section
      className="relative isolate flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-5 pb-20 pt-28"
      style={{ background: "var(--color-void, #03020a)" }}
    >
      {/* ── Canvas mesh ── */}
      <canvas
        ref={canvasRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full opacity-100"
      />

      {/* ── Glow central — doble capa ── */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 80% 55% at 50% 0%, rgba(124,58,237,0.18) 0%, transparent 70%), " +
            "radial-gradient(ellipse 50% 40% at 50% 100%, rgba(34,211,238,0.07) 0%, transparent 70%)",
        }}
      />

      {/* ── Ruido de textura — sensación fotográfica ── */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.025]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E\")",
          backgroundSize: "200px 200px",
        }}
      />

      {/* ── Eyebrow badge ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 mb-8 flex items-center gap-2 rounded-full border px-4 py-1.5"
        style={{
          borderColor: "rgba(139,92,246,0.25)",
          background: "rgba(139,92,246,0.08)",
          backdropFilter: "blur(12px)",
        }}
      >
        <span
          className="h-1.5 w-1.5 animate-pulse rounded-full"
          style={{ background: "#22c55e", boxShadow: "0 0 6px #22c55e" }}
        />
        <span className="font-mono text-[11px] tracking-widest text-violet-300 uppercase">
          Plataforma para desarrolladores
        </span>
      </motion.div>

      {/* ── Headline ── */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 max-w-4xl text-center font-display font-bold leading-[1.05] tracking-[-0.03em]"
        style={{ fontSize: "clamp(2.6rem, 6.5vw, 5rem)" }}
      >
        <span style={{ color: "#f0ecff" }}>Tu estudio de desarrollo,</span>
        <br />
        <span
          style={{
            background: "linear-gradient(135deg, #a78bfa 0%, #7c3aed 40%, #22d3ee 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            filter: "drop-shadow(0 0 40px rgba(139,92,246,0.4))",
          }}
        >
          potenciado por IA.
        </span>
      </motion.h1>

      {/* ── Subline ── */}
      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 mt-6 max-w-[520px] text-center leading-relaxed"
        style={{
          fontSize: "clamp(1rem, 2.2vw, 1.125rem)",
          color: "var(--color-on-surface-variant, #b8b0e0)",
        }}
      >
        Baúl cifrado de API keys, chat con V que conoce todos tus proyectos,
        deployments, contratos y vault — todo en un solo workspace.
      </motion.p>

      {/* ── CTAs ── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 mt-10 flex flex-wrap items-center justify-center gap-3"
      >
        <Link
          href="/sign-up"
          className="group flex items-center gap-2 rounded-xl px-6 py-3 text-[14px] font-semibold text-white transition-all"
          style={{
            background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)",
            boxShadow: "0 0 0 1px rgba(139,92,246,0.4), 0 4px 24px rgba(124,58,237,0.45), inset 0 1px 0 rgba(255,255,255,0.1)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.boxShadow =
              "0 0 0 1px rgba(139,92,246,0.6), 0 8px 32px rgba(124,58,237,0.6), inset 0 1px 0 rgba(255,255,255,0.15)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.boxShadow =
              "0 0 0 1px rgba(139,92,246,0.4), 0 4px 24px rgba(124,58,237,0.45), inset 0 1px 0 rgba(255,255,255,0.1)";
          }}
        >
          Empieza gratis
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </Link>
        <Link
          href="/pricing"
          className="flex items-center gap-2 rounded-xl border px-6 py-3 text-[14px] font-medium transition-all"
          style={{
            borderColor: "rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.04)",
            color: "rgba(255,255,255,0.7)",
            backdropFilter: "blur(8px)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.2)";
            (e.currentTarget as HTMLElement).style.color = "#fff";
            (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.1)";
            (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.7)";
            (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
          }}
        >
          Ver precios
        </Link>
      </motion.div>

      {/* ── Badges de integraciones ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.4 }}
        className="relative z-10 mt-10 flex flex-wrap items-center justify-center gap-2"
      >
        {BADGES.map((b) => (
          <span
            key={b}
            className="rounded-lg border px-3 py-1 font-mono text-[11px]"
            style={{
              borderColor: "rgba(255,255,255,0.07)",
              background: "rgba(255,255,255,0.03)",
              color: "rgba(255,255,255,0.35)",
            }}
          >
            {b}
          </span>
        ))}
      </motion.div>

      {/* ── Terminal preview ── */}
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 mt-14 w-full max-w-2xl overflow-hidden rounded-2xl"
        style={{
          background: "rgba(6,5,15,0.85)",
          border: "1px solid rgba(139,92,246,0.2)",
          boxShadow:
            "0 0 0 1px rgba(0,0,0,0.5), 0 32px 80px rgba(0,0,0,0.6), 0 0 60px rgba(124,58,237,0.12), inset 0 1px 0 rgba(255,255,255,0.05)",
          backdropFilter: "blur(24px)",
        }}
      >
        {/* Barra de chrome del terminal */}
        <div
          className="flex items-center gap-2 border-b px-4 py-3"
          style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}
        >
          <span className="h-3 w-3 rounded-full" style={{ background: "#ff5f57" }} />
          <span className="h-3 w-3 rounded-full" style={{ background: "#febc2e" }} />
          <span className="h-3 w-3 rounded-full" style={{ background: "#28c840" }} />
          <span className="ml-3 font-mono text-[11px]" style={{ color: "rgba(255,255,255,0.25)" }}>
            vforge — terminal
          </span>
        </div>
        {/* Líneas del terminal */}
        <div className="space-y-2 p-5 font-mono text-[13px] leading-relaxed">
          {TERMINAL_LINES.slice(0, visibleLines).map((line, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              style={{ color: line.color }}
            >
              {line.text}
            </motion.div>
          ))}
          {/* Cursor parpadeante */}
          {visibleLines < TERMINAL_LINES.length && (
            <span
              className="inline-block h-4 w-2 align-middle"
              style={{
                background: "#8b5cf6",
                animation: "blink 1s step-end infinite",
              }}
            />
          )}
        </div>
      </motion.div>

      {/* ── Línea separadora con fade ── */}
      <div
        aria-hidden
        className="absolute bottom-0 inset-x-0 h-32 pointer-events-none"
        style={{
          background: "linear-gradient(to bottom, transparent, var(--color-void, #03020a))",
        }}
      />

      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
      `}</style>
    </section>
  );
}
