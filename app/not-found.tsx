"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  MessagesSquare,
  Workflow,
  ShieldCheck,
  Activity,
  GitBranch,
  Sparkles,
  Home,
} from "lucide-react";
import { VWordmark } from "@/components/brand/VMark";
import { useT } from "@/i18n/AppProviders";

const SHORTCUTS = [
  { href: "/app/chat", label: "Chat con V", icon: MessagesSquare },
  { href: "/app/projects", label: "Proyectos", icon: Workflow },
  { href: "/app/secrets", label: "Bóveda", icon: ShieldCheck },
  { href: "/app/activity", label: "Actividad", icon: Activity },
  { href: "/app/repovision", label: "Repos", icon: GitBranch },
];

export default function NotFound() {
  const t = useT();
  return (
    <div className="relative isolate flex min-h-dvh flex-col bg-void">
      {/* Atmospheric backdrop */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[70vh] bg-violet-aura opacity-60" />
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-30" />

      {/* Brand minimal */}
      <header className="relative z-10 flex items-center justify-between px-6 py-6 md:px-10">
        <Link href="/">
          <VWordmark />
        </Link>
        <Link
          href="/app/chat"
          className="hidden items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-cyber-cyan hover:text-cyan-400 sm:flex"
        >
          Abrir workspace <ArrowRight size={12} />
        </Link>
      </header>

      {/* Hero 404 */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center"
        >
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-cyber-cyan">
            {t.not_found.code}
          </p>
          <h1 className="mt-4 font-display text-[44px] font-semibold leading-[1.05] tracking-tight md:text-[64px]">
            {t.not_found.title}
          </h1>
          <p className="mt-4 max-w-md text-sm text-on-surface-variant md:text-base">
            {t.not_found.body}
          </p>

          {/* V invite card */}
          <div className="mt-8 w-full max-w-md rounded-2xl border border-violet-500/20 bg-violet-500/[0.05] p-5 text-left backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="relative h-9 w-9 rounded-full bg-violet-500/15 ring-1 ring-violet-500/30">
                <div className="absolute inset-2 rounded-full bg-gradient-to-br from-violet-400 to-cyan-400" />
              </div>
              <div>
                <p className="font-display text-sm font-semibold text-on-surface">V</p>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyber-cyan">
                  operadora · lista
                </p>
              </div>
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-on-surface-variant">
              ¿Buscabas algo concreto? Dile a V — ella te lleva o lo crea.
            </p>
            <Link
              href="/app/chat"
              className="btn-primary mt-4 inline-flex !px-3 !py-2 text-[12px]"
            >
              <Sparkles size={12} /> Preguntarle a V
            </Link>
          </div>

          {/* Quick shortcuts */}
          <div className="mt-8 w-full max-w-xl">
            <p className="label-caps mb-3 text-muted">Atajos</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
              {SHORTCUTS.map((s) => (
                <Link
                  key={s.href}
                  href={s.href}
                  className="group flex flex-col items-center gap-1.5 rounded-xl border border-app bg-tint-1 px-3 py-3 transition hover:border-violet-500/30 hover:bg-violet-500/[0.04]"
                >
                  <s.icon size={16} className="text-on-surface-variant group-hover:text-violet-300" />
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-on-surface-variant group-hover:text-on-surface">
                    {s.label}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Bottom row */}
          <div className="mt-10 flex items-center gap-3">
            <Link href="/" className="btn-ghost !px-4 !py-2">
              <Home size={13} /> {t.not_found.back}
            </Link>
            <Link href="/app/chat" className="btn-primary !px-4 !py-2">
              {t.not_found.open_workspace} <ArrowRight size={13} />
            </Link>
          </div>
        </motion.div>
      </main>

      {/* Footer minimal */}
      <footer className="relative z-10 border-t border-app/40 px-6 py-4 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
        vforge · operada por V · build deploy evolve
      </footer>
    </div>
  );
}
