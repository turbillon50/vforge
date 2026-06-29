"use client";
import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/* ─────────────────────────────────────────────────────────────────────────────
   VForge Hero — Referencia: Vercel.com
   Negro puro. Tipografía enorme. V metálica como marca de lujo.
   Sin gradientes de color. Sin ruido. Solo contraste y jerarquía.
───────────────────────────────────────────────────────────────────────────── */

const FLOW = [
  {
    id: "vforge",
    label: "VForge",
    sub: "Secrets & Vault",
    isLogo: true,
  },
  {
    id: "github",
    label: "GitHub",
    sub: "Code",
    logo: "/logos/github.svg",
  },
  {
    id: "vercel",
    label: "Vercel",
    sub: "Deploy",
    logo: "/logos/vercel.svg",
  },
];

function Arrow({ delay }: { delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scaleX: 0 }}
      animate={{ opacity: 1, scaleX: 1 }}
      transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-center pb-8"
      style={{ originX: 0 }}
    >
      <motion.div
        animate={{ x: [0, 5, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay }}
        className="flex items-center"
      >
        <div
          className="h-px"
          style={{
            width: "clamp(24px, 4vw, 48px)",
            background: "rgba(255,255,255,0.15)",
          }}
        />
        <svg width="7" height="11" viewBox="0 0 7 11" fill="none" className="shrink-0">
          <path d="M1 1l5 4.5L1 10" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </motion.div>
    </motion.div>
  );
}

function AppIcon({ item, index }: { item: typeof FLOW[0]; index: number }) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.4 + index * 0.12, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center gap-3"
    >
      <motion.div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        animate={hovered ? { y: -5, scale: 1.04 } : { y: 0, scale: 1 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="relative flex items-center justify-center overflow-hidden"
        style={{
          width: "clamp(72px, 12vw, 96px)",
          height: "clamp(72px, 12vw, 96px)",
          borderRadius: "22%",
          background: "#111",
          border: `1px solid ${hovered ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.08)"}`,
          boxShadow: hovered
            ? "0 0 0 1px rgba(255,255,255,0.1), 0 20px 48px rgba(0,0,0,0.8)"
            : "0 4px 24px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
          transition: "border-color 0.2s, box-shadow 0.2s",
        }}
      >
        {/* Reflejo superior sutil */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-2/5"
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, transparent 100%)",
            borderRadius: "22% 22% 0 0",
          }}
        />

        {item.isLogo ? (
          <Image
            src="/v-logo-chrome.png"
            alt="VForge"
            fill
            sizes="96px"
            className="object-cover"
          />
        ) : (
          <Image
            src={item.logo!}
            alt={item.label}
            width={40}
            height={40}
            className="object-contain"
            style={{ filter: "brightness(0) invert(1)", opacity: 0.85 }}
          />
        )}
      </motion.div>

      <div className="text-center">
        <p
          className="font-semibold"
          style={{
            fontSize: "13px",
            color: "rgba(255,255,255,0.9)",
            letterSpacing: "-0.01em",
          }}
        >
          {item.label}
        </p>
        <p
          className="mt-0.5 font-mono uppercase tracking-widest"
          style={{ fontSize: "9px", color: "rgba(255,255,255,0.22)" }}
        >
          {item.sub}
        </p>
      </div>
    </motion.div>
  );
}

export function Hero() {
  const reduce = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  /* Partículas muy sutiles — estilo Vercel */
  useEffect(() => {
    if (reduce) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animId: number;

    const particles: { x: number; y: number; vx: number; vy: number; r: number; a: number }[] = [];
    const COUNT = 60;

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      particles.length = 0;
      for (let i = 0; i < COUNT; i++) {
        particles.push({
          x: Math.random() * canvas.offsetWidth,
          y: Math.random() * canvas.offsetHeight,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          r: Math.random() * 1.2 + 0.3,
          a: Math.random() * 0.25 + 0.05,
        });
      }
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      const W = canvas.offsetWidth;
      const H = canvas.offsetHeight;
      ctx.clearRect(0, 0, W, H);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = W;
        if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H;
        if (p.y > H) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${p.a})`;
        ctx.fill();
      }

      // Líneas entre partículas cercanas
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 100) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(255,255,255,${0.04 * (1 - d / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { window.removeEventListener("resize", resize); cancelAnimationFrame(animId); };
  }, [reduce]);

  return (
    <section
      className="relative isolate flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-5 pb-24 pt-28"
      style={{ background: "#000" }}
    >
      {/* Canvas partículas */}
      <canvas ref={canvasRef} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" />

      {/* Glow central muy sutil — solo brillo, no color */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(255,255,255,0.04) 0%, transparent 70%)",
        }}
      />

      {/* ── Badge ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 mb-10 flex items-center gap-2.5 rounded-full border px-4 py-1.5"
        style={{
          borderColor: "rgba(255,255,255,0.1)",
          background: "rgba(255,255,255,0.04)",
          backdropFilter: "blur(8px)",
        }}
      >
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: "#fff", boxShadow: "0 0 8px rgba(255,255,255,0.8)", animation: "pulse 2s infinite" }}
        />
        <span className="font-mono text-[11px] uppercase tracking-[0.18em]" style={{ color: "rgba(255,255,255,0.5)" }}>
          Plataforma para desarrolladores
        </span>
      </motion.div>

      {/* ── Headline — estilo Vercel: enorme, blanco, sin gradiente de color ── */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.07, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 max-w-4xl text-center font-display font-bold leading-[1.04] tracking-[-0.04em]"
        style={{ fontSize: "clamp(2.8rem, 7vw, 5.5rem)", color: "#fff" }}
      >
        Tu estudio de desarrollo,
        <br />
        <span style={{ color: "rgba(255,255,255,0.45)" }}>potenciado por IA.</span>
      </motion.h1>

      {/* ── Subline ── */}
      <motion.p
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 mt-6 max-w-[440px] text-center leading-relaxed"
        style={{
          fontSize: "clamp(0.95rem, 2vw, 1.05rem)",
          color: "rgba(255,255,255,0.4)",
          letterSpacing: "-0.01em",
        }}
      >
        Baúl cifrado de secrets, chat con V y deploy a producción —
        todo conectado de principio a fin.
      </motion.p>

      {/* ── CTAs ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 mt-9 flex flex-wrap items-center justify-center gap-3"
      >
        <Link
          href="/sign-up"
          className="group flex items-center gap-2 rounded-xl px-7 py-3 text-[14px] font-semibold transition-all"
          style={{
            background: "#fff",
            color: "#000",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.1)",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.9)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#fff"; }}
        >
          Empieza gratis
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </Link>
        <Link
          href="/#metodo"
          className="rounded-xl border px-7 py-3 text-[14px] font-medium transition-all"
          style={{
            borderColor: "rgba(255,255,255,0.1)",
            background: "transparent",
            color: "rgba(255,255,255,0.5)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.25)";
            (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.8)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.1)";
            (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.5)";
          }}
        >
          Ver el método
        </Link>
      </motion.div>

      {/* ── Flujo VForge → GitHub → Vercel ── */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 mt-16 flex items-end justify-center gap-3 sm:gap-5"
      >
        {FLOW.map((item, i) => (
          <div key={item.id} className="flex items-end gap-3 sm:gap-5">
            <AppIcon item={item} index={i} />
            {i < FLOW.length - 1 && <Arrow delay={0.6 + i * 0.15} />}
          </div>
        ))}
      </motion.div>

      {/* ── Caption ── */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 1 }}
        className="relative z-10 mt-5 text-center font-mono text-[10px] uppercase tracking-[0.22em]"
        style={{ color: "rgba(255,255,255,0.18)" }}
      >
        Start to End&nbsp;&nbsp;·&nbsp;&nbsp;Secrets&nbsp;&nbsp;·&nbsp;&nbsp;Code&nbsp;&nbsp;·&nbsp;&nbsp;Deploy
      </motion.p>

      {/* Fade bottom */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-32"
        style={{ background: "linear-gradient(to bottom, transparent, #000)" }}
      />
    </section>
  );
}
