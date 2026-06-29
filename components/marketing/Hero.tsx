"use client";
import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/* ─────────────────────────────────────────────────────────────────────────────
   VForge Hero — sketch de Luis: VForge → GitHub → Vercel
   "Start to End — Secrets — Code — Deploy"
   Logo cromado oficial como centro de identidad.
───────────────────────────────────────────────────────────────────────────── */

const FLOW = [
  {
    id: "vforge",
    label: "VForge",
    sub: "Secrets & Vault",
    logo: null, // usa el logo cromado
    bg: "#0a0a0f",
    border: "rgba(255,255,255,0.15)",
    glow: "rgba(200,200,220,0.12)",
    accent: "#e8e4ff",
  },
  {
    id: "github",
    label: "GitHub",
    sub: "Code",
    logo: "/logos/github.svg",
    bg: "#0d1117",
    border: "rgba(255,255,255,0.1)",
    glow: "rgba(255,255,255,0.08)",
    accent: "#e5e5e5",
  },
  {
    id: "vercel",
    label: "Vercel",
    sub: "Deploy",
    logo: "/logos/vercel.svg",
    bg: "#0a0a0f",
    border: "rgba(255,255,255,0.1)",
    glow: "rgba(255,255,255,0.08)",
    accent: "#e5e5e5",
  },
];

/* Flecha animada entre íconos */
function Arrow({ delay }: { delay: number }) {
  return (
    <motion.div
      className="flex items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay, duration: 0.4 }}
    >
      <motion.div
        animate={{ x: [0, 6, 0] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut", delay }}
        className="flex items-center gap-0.5"
      >
        <div className="h-px w-8 sm:w-12" style={{ background: "linear-gradient(90deg, rgba(139,92,246,0.3), rgba(139,92,246,0.7))" }} />
        <svg width="8" height="12" viewBox="0 0 8 12" fill="none">
          <path d="M1 1l6 5-6 5" stroke="rgba(139,92,246,0.8)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </motion.div>
    </motion.div>
  );
}

/* Ícono app-style — rounded square con logo */
function AppIcon({ item, index }: { item: typeof FLOW[0]; index: number }) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, delay: 0.3 + index * 0.15, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center gap-3"
    >
      {/* El ícono */}
      <motion.div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        animate={hovered ? { scale: 1.06, y: -4 } : { scale: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="relative flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center overflow-hidden"
        style={{
          borderRadius: "22%",
          background: item.bg,
          border: `1px solid ${hovered ? "rgba(255,255,255,0.2)" : item.border}`,
          boxShadow: hovered
            ? `0 0 0 1px rgba(139,92,246,0.3), 0 20px 48px rgba(0,0,0,0.6), 0 0 32px ${item.glow}`
            : `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)`,
          transition: "box-shadow 0.3s ease, border-color 0.3s ease",
        }}
      >
        {/* Reflejo superior — efecto de vidrio */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-1/3"
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 100%)",
            borderRadius: "22% 22% 0 0",
          }}
        />

        {item.id === "vforge" ? (
          <Image
            src="/v-logo-chrome.png"
            alt="VForge"
            width={56}
            height={56}
            className="object-contain"
            style={{ filter: "drop-shadow(0 2px 12px rgba(255,255,255,0.15))" }}
          />
        ) : (
          <Image
            src={item.logo!}
            alt={item.label}
            width={44}
            height={44}
            className="object-contain"
            style={{
              filter: item.id === "vercel"
                ? "brightness(10)"
                : "brightness(10)",
              opacity: 0.9,
            }}
          />
        )}
      </motion.div>

      {/* Label y sub */}
      <div className="text-center">
        <p className="text-[13px] font-semibold" style={{ color: item.accent }}>{item.label}</p>
        <p className="font-mono text-[10px] uppercase tracking-wider mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>
          {item.sub}
        </p>
      </div>
    </motion.div>
  );
}

/* Canvas de malla animada */
function MeshCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) return;
    const canvas = ref.current;
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

    const draw = () => {
      const W = canvas.offsetWidth;
      const H = canvas.offsetHeight;
      ctx.clearRect(0, 0, W, H);
      t += 0.0025;
      const COLS = 16, ROWS = 9;
      const cw = W / COLS, ch = H / ROWS;

      for (let r = 0; r <= ROWS; r++) {
        for (let c = 0; c <= COLS; c++) {
          const wave = Math.sin(t + c * 0.45 + r * 0.7) * 5;
          const x = c * cw + wave;
          const y = r * ch + wave * 0.4;
          const cx2 = (c - COLS / 2) / COLS;
          const cy2 = (r - ROWS / 2) / ROWS;
          const dist = Math.sqrt(cx2 * cx2 + cy2 * cy2);

          if (c < COLS) {
            const nx = (c + 1) * cw + Math.sin(t + (c + 1) * 0.45 + r * 0.7) * 5;
            const ny = r * ch + Math.sin(t + (c + 1) * 0.45 + r * 0.7) * 0.4 * 5;
            const a = Math.max(0, 0.055 - dist * 0.055);
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(nx, ny);
            ctx.strokeStyle = `rgba(139,92,246,${a})`; ctx.lineWidth = 0.5; ctx.stroke();
          }
          if (r < ROWS) {
            const bx = c * cw + Math.sin(t + c * 0.45 + (r + 1) * 0.7) * 5;
            const by = (r + 1) * ch + Math.sin(t + c * 0.45 + (r + 1) * 0.7) * 0.4 * 5;
            const a = Math.max(0, 0.04 - dist * 0.04);
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(bx, by);
            ctx.strokeStyle = `rgba(34,211,238,${a})`; ctx.lineWidth = 0.5; ctx.stroke();
          }
          const da = Math.max(0, 0.2 - dist * 0.35);
          ctx.beginPath(); ctx.arc(x, y, 0.8, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(139,92,246,${da})`; ctx.fill();
        }
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { window.removeEventListener("resize", resize); cancelAnimationFrame(animId); };
  }, [reduce]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}

export function Hero() {
  return (
    <section
      className="relative isolate flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-5 pb-24 pt-28"
      style={{ background: "var(--color-void, #03020a)" }}
    >
      <MeshCanvas />

      {/* Glow central */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 90% 50% at 50% 0%, rgba(124,58,237,0.15) 0%, transparent 65%), " +
            "radial-gradient(ellipse 40% 30% at 50% 100%, rgba(34,211,238,0.06) 0%, transparent 70%)",
        }}
      />

      {/* Noise texture */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.022]"
        style={{
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundSize: "180px 180px",
        }}
      />

      {/* ── Eyebrow ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 mb-10 flex items-center gap-2 rounded-full border px-4 py-1.5"
        style={{ borderColor: "rgba(139,92,246,0.25)", background: "rgba(139,92,246,0.07)", backdropFilter: "blur(12px)" }}
      >
        <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: "#22c55e", boxShadow: "0 0 6px #22c55e" }} />
        <span className="font-mono text-[11px] uppercase tracking-widest text-violet-300">Plataforma para desarrolladores</span>
      </motion.div>

      {/* ── Headline ── */}
      <motion.h1
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 max-w-3xl text-center font-display font-bold leading-[1.05] tracking-[-0.03em]"
        style={{ fontSize: "clamp(2.4rem, 6vw, 4.5rem)" }}
      >
        <span style={{ color: "#f0ecff" }}>Tu estudio de desarrollo,</span>
        <br />
        <span style={{
          background: "linear-gradient(135deg, #c4b5fd 0%, #7c3aed 45%, #22d3ee 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          filter: "drop-shadow(0 0 40px rgba(139,92,246,0.35))",
        }}>
          potenciado por IA.
        </span>
      </motion.h1>

      {/* ── Subline ── */}
      <motion.p
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 mt-5 max-w-[480px] text-center leading-relaxed"
        style={{ fontSize: "clamp(0.95rem, 2vw, 1.1rem)", color: "var(--color-on-surface-variant, #b8b0e0)" }}
      >
        Baúl cifrado de secrets, chat con V y deploy a producción —
        todo conectado de principio a fin.
      </motion.p>

      {/* ── FLUJO: VForge → GitHub → Vercel ── */}
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 mt-14 flex items-center justify-center gap-2 sm:gap-4"
      >
        {FLOW.map((item, i) => (
          <div key={item.id} className="flex items-center gap-2 sm:gap-4">
            <AppIcon item={item} index={i} />
            {i < FLOW.length - 1 && <Arrow delay={0.5 + i * 0.2} />}
          </div>
        ))}
      </motion.div>

      {/* ── Caption del flujo ── */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.9 }}
        className="relative z-10 mt-6 font-mono text-[11px] uppercase tracking-[0.2em]"
        style={{ color: "rgba(255,255,255,0.2)" }}
      >
        Start to End &nbsp;·&nbsp; Secrets &nbsp;·&nbsp; Code &nbsp;·&nbsp; Deploy
      </motion.p>

      {/* ── CTAs ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 mt-10 flex flex-wrap items-center justify-center gap-3"
      >
        <Link
          href="/sign-up"
          className="group flex items-center gap-2 rounded-xl px-7 py-3 text-[14px] font-semibold text-white transition-all"
          style={{
            background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)",
            boxShadow: "0 0 0 1px rgba(139,92,246,0.4), 0 4px 24px rgba(124,58,237,0.4), inset 0 1px 0 rgba(255,255,255,0.1)",
          }}
        >
          Empieza gratis
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </Link>
        <Link
          href="/#metodo"
          className="rounded-xl border px-7 py-3 text-[14px] font-medium transition-all"
          style={{
            borderColor: "rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.03)",
            color: "rgba(255,255,255,0.6)",
            backdropFilter: "blur(8px)",
          }}
        >
          Ver el método
        </Link>
      </motion.div>

      {/* Fade inferior */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-28"
        style={{ background: "linear-gradient(to bottom, transparent, var(--color-void, #03020a))" }}
      />
    </section>
  );
}
