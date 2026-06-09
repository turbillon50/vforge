"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

const EASE = [0.22, 1, 0.36, 1];

const CATEGORIES = [
  { label: "App Web", icon: "⬡" },
  { label: "API REST", icon: "⚡" },
  { label: "Dashboard", icon: "◈" },
  { label: "E-commerce", icon: "◎" },
  { label: "App Móvil", icon: "◻" },
  { label: "Automatización", icon: "◈" },
];

const FEATURES = [
  { name: "Forge", desc: "Genera código full-stack con contexto real", color: "#a78bfa" },
  { name: "Proyectos", desc: "Organiza, sigue y opera cada cliente", color: "#67e8f9" },
  { name: "Secrets", desc: "Vault AES-256 para tus credenciales", color: "#86efac" },
  { name: "Integraciones", desc: "17+ servicios conectados desde el día uno", color: "#fbbf24" },
  { name: "V Chat", desc: "Tu agente coordina, ejecuta y reporta", color: "#f9a8d4" },
];

export function Hero() {
  const [active, setActive] = useState<string | null>(null);

  return (
    <section className="relative bg-[#0a0a0f] px-5 pt-32 pb-24 lg:pt-36 lg:pb-32">
      {/* Subtle grid background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: "linear-gradient(rgba(139,92,246,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.6) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
      {/* Glow */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-violet-600/10 blur-[120px]" />

      <div className="relative mx-auto max-w-5xl">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="mb-7 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3.5 py-1.5"
        >
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
          <span className="font-mono text-[11px] tracking-widest text-violet-300/80 uppercase">
            V · Momentum — VForge está vivo
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05, ease: EASE }}
          className="max-w-3xl text-[clamp(2.4rem,5.5vw,4rem)] font-bold leading-[1.05] tracking-[-0.03em] text-white"
        >
          La plataforma backend para{" "}
          <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
            apps y agentes
          </span>{" "}
          que operan.
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
          className="mt-5 max-w-xl text-[1.05rem] font-light leading-relaxed text-white/55"
        >
          V conoce tu stack, tus repos y tus clientes.
          Hablas — ella forja el código, despliega y coordina cada servicio.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: EASE }}
          className="mt-8 flex flex-wrap items-center gap-3"
        >
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-[0.95rem] font-semibold text-white shadow-[0_4px_24px_rgba(124,58,237,0.4)] transition-all hover:bg-violet-500 hover:shadow-[0_6px_32px_rgba(124,58,237,0.55)] active:scale-[0.98]"
          >
            Empieza gratis
          </Link>
          <Link
            href="/developers"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-6 py-3 text-[0.95rem] font-medium text-white/70 transition-all hover:border-violet-400/25 hover:bg-white/[0.08] hover:text-white"
          >
            Ver documentación →
          </Link>
        </motion.div>

        {/* CLI hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2, ease: EASE }}
          className="mt-5 flex items-center gap-2"
        >
          <code className="rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 font-mono text-[12px] text-white/40">
            <span className="text-violet-400/70">$</span> curl -X POST https://vforge.site/api/projects
          </code>
          <span className="font-mono text-[11px] text-white/20">← empieza desde cero en segundos</span>
        </motion.div>

        {/* Feature chips */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25, ease: EASE }}
          className="mt-14 flex flex-wrap gap-2"
        >
          {FEATURES.map((f) => (
            <div
              key={f.name}
              className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-2.5 transition-all hover:border-white/15 hover:bg-white/[0.06] cursor-default"
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: f.color, boxShadow: `0 0 6px ${f.color}` }} />
              <span className="text-[13px] font-medium text-white/75">{f.name}</span>
              <span className="hidden text-[12px] text-white/35 sm:block">— {f.desc}</span>
            </div>
          ))}
        </motion.div>

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.35, ease: EASE }}
          className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/[0.06] pt-6"
        >
          {[
            { n: "17+", label: "apps en producción" },
            { n: "< 60s", label: "de conversación a deploy" },
            { n: "AES-256", label: "vault de credenciales" },
            { n: "V", label: "agente siempre activo" },
          ].map((s) => (
            <div key={s.label} className="flex items-baseline gap-2">
              <span className="font-mono text-[1rem] font-semibold text-white/80">{s.n}</span>
              <span className="text-[12px] text-white/30">{s.label}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
