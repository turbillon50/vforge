"use client";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/* ─── Carrusel de infra ──────────────────────────────────────────────── */
const INFRA = [
  { name: "Claude Code",    logo: "/logos/claude.svg" },
  { name: "Grok",           logo: "/logos/grok.svg" },
  { name: "OpenAI Codex",   logo: "/logos/openai.svg" },
  { name: "Gemini",         logo: "/logos/gemini.svg" },
  { name: "DeepSeek",       logo: "/logos/deepseek.svg" },
  { name: "Cerebras",       logo: "/logos/openrouter.svg" },
  { name: "Hetzner GPUs",   logo: "/logos/hetzner.svg" },
  { name: "Hugging Face",   logo: "/logos/openrouter.svg" },
  { name: "E2B Sandboxes",  logo: "/logos/railway.svg" },
  { name: "Neon DB",        logo: "/logos/neon.svg" },
  { name: "Vercel Edge",    logo: "/logos/vercel.svg" },
  { name: "GitHub",         logo: "/logos/github.svg" },
];

/* ─── Íconos del flujo (SVG metálico inline) ─────────────────────────── */
function MetallicIcon({ children, label, sublabel }: { children: React.ReactNode; label: string; sublabel: string }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="flex h-[88px] w-[88px] items-center justify-center rounded-[22px]"
        style={{
          background: "linear-gradient(145deg, #2a2a2a 0%, #111 60%, #1a1a1a 100%)",
          boxShadow:
            "0 0 0 1px rgba(255,255,255,0.1), 0 8px 32px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.12)",
        }}
      >
        {children}
      </div>
      <div className="text-center">
        <p className="text-[13px] font-semibold" style={{ color: "rgba(255,255,255,0.85)" }}>{label}</p>
        <p className="font-mono text-[9px] uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>{sublabel}</p>
      </div>
    </div>
  );
}

/* V metálica cromada */
function VIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <defs>
        <linearGradient id="vm" x1="8" y1="8" x2="40" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="30%" stopColor="#c8c8d8" />
          <stop offset="60%" stopColor="#888898" />
          <stop offset="100%" stopColor="#e8e8f0" />
        </linearGradient>
        <filter id="glow-v">
          <feGaussianBlur stdDeviation="1.5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <path
        d="M8 10 L24 38 L40 10 L34 10 L24 28 L14 10 Z"
        fill="url(#vm)"
        filter="url(#glow-v)"
      />
    </svg>
  );
}

/* GitHub metálico */
function GitHubIcon() {
  return (
    <svg width="46" height="46" viewBox="0 0 98 96" fill="none">
      <defs>
        <linearGradient id="ghm" x1="10" y1="0" x2="88" y2="96" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#e8e8e8" />
          <stop offset="40%" stopColor="#aaaaaa" />
          <stop offset="100%" stopColor="#d4d4d4" />
        </linearGradient>
      </defs>
      <path
        fill="url(#ghm)"
        d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z"
      />
    </svg>
  );
}

/* Vercel metálico */
function VercelIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 116 100" fill="none">
      <defs>
        <linearGradient id="vcm" x1="0" y1="0" x2="116" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="50%" stopColor="#b0b0b8" />
          <stop offset="100%" stopColor="#e0e0e8" />
        </linearGradient>
      </defs>
      <path d="M57.5 0L115 100H0L57.5 0z" fill="url(#vcm)" />
    </svg>
  );
}

/* Flecha entre íconos */
function Arrow() {
  return (
    <div className="flex items-center pb-8" style={{ color: "rgba(255,255,255,0.2)" }}>
      <div style={{ height: "1px", width: "32px", background: "rgba(255,255,255,0.12)" }} />
      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
        <path d="M1 4h6M4 1l3 3-3 3" stroke="rgba(255,255,255,0.3)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

/* ─── Carrusel animado ───────────────────────────────────────────────── */
function InfraCarousel() {
  const track = useRef<HTMLDivElement>(null);
  const items = [...INFRA, ...INFRA]; // duplicar para loop infinito

  return (
    <div className="relative mt-16 overflow-hidden" style={{ maskImage: "linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)" }}>
      <motion.div
        ref={track}
        className="flex gap-3"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 28, ease: "linear", repeat: Infinity }}
        style={{ width: "max-content" }}
      >
        {items.map((item, i) => (
          <div
            key={i}
            className="flex shrink-0 items-center gap-2.5 rounded-lg px-4 py-2"
            style={{
              background: "rgba(255,255,255,0.025)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <div className="relative h-4 w-4 shrink-0">
              <Image
                src={item.logo}
                alt={item.name}
                fill
                sizes="16px"
                className="object-contain"
                style={{ filter: "brightness(0) invert(1)", opacity: 0.5 }}
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
            </div>
            <span className="text-[12px] whitespace-nowrap" style={{ color: "rgba(255,255,255,0.4)" }}>
              {item.name}
            </span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

/* ─── Hero principal ─────────────────────────────────────────────────── */
export function Hero() {
  return (
    <section
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-5 py-28 text-center"
      style={{ background: "#000" }}
    >
      {/* Partículas sutiles */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          opacity: 0.4,
        }}
      />
      {/* Glow central suave */}
      <div
        className="pointer-events-none absolute"
        style={{
          top: "30%", left: "50%", transform: "translate(-50%, -50%)",
          width: "600px", height: "400px",
          background: "radial-gradient(ellipse, rgba(124,58,237,0.07) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-4xl w-full">

        {/* Badge eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8 inline-flex items-center gap-2 rounded-full border px-4 py-1.5"
          style={{ border: "1px solid rgba(124,58,237,0.3)", background: "rgba(124,58,237,0.06)" }}
        >
          <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: "#7c3aed" }} />
          <span className="font-mono text-[11px] uppercase tracking-[0.14em]" style={{ color: "rgba(167,139,250,0.85)" }}>
            MCP nativo · +200 skills · IA en tu infra
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
          className="font-display font-bold leading-[1.06] tracking-tight"
          style={{ fontSize: "clamp(2.6rem, 7vw, 5.5rem)", color: "#fff" }}
        >
          El conector definitivo
          <br />
          <span style={{ color: "rgba(255,255,255,0.3)" }}>entre tu IA y tu stack.</span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto mt-7 max-w-xl text-[16px] leading-relaxed"
          style={{ color: "rgba(255,255,255,0.38)" }}
        >
          VForge es tu servidor MCP propio: secrets cifrados, más de 200 skills,
          memoria empresarial con MindContextIA — y Claude, Grok o GPT operando
          tu infraestructura sin abrir una terminal.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
          className="mt-10 flex flex-wrap items-center justify-center gap-3"
        >
          <Link
            href="/sign-up"
            className="rounded-xl px-6 py-3 text-[14px] font-semibold transition-all"
            style={{
              background: "#fff",
              color: "#000",
              boxShadow: "0 0 0 0 rgba(255,255,255,0)",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.88)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#fff"; }}
          >
            Empieza gratis →
          </Link>
          <Link
            href="#metodo"
            className="rounded-xl border px-6 py-3 text-[14px] font-medium transition-all"
            style={{
              border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.6)",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.borderColor = "rgba(255,255,255,0.24)";
              el.style.color = "rgba(255,255,255,0.85)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.borderColor = "rgba(255,255,255,0.12)";
              el.style.color = "rgba(255,255,255,0.6)";
            }}
          >
            Ver el método
          </Link>
        </motion.div>

        {/* Flujo VForge → GitHub → Vercel */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="mt-20 flex items-center justify-center gap-0"
        >
          <MetallicIcon label="VForge" sublabel="Secrets & Vault">
            <VIcon />
          </MetallicIcon>
          <Arrow />
          <MetallicIcon label="GitHub" sublabel="Code">
            <GitHubIcon />
          </MetallicIcon>
          <Arrow />
          <MetallicIcon label="Vercel" sublabel="Deploy">
            <VercelIcon />
          </MetallicIcon>
        </motion.div>

        {/* Caption */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="mt-6 font-mono text-[10px] uppercase tracking-[0.18em]"
          style={{ color: "rgba(255,255,255,0.18)" }}
        >
          Start to end · Secrets · Code · Deploy
        </motion.p>

        {/* Carrusel de infra */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="w-full"
        >
          <p className="mt-16 font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: "rgba(255,255,255,0.2)" }}>
            Construido sobre
          </p>
          <InfraCarousel />
        </motion.div>

      </div>
    </section>
  );
}
