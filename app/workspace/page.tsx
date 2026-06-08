"use client";

import { motion } from "framer-motion";
import { useUser } from "@clerk/nextjs";
import { CheckCircle, Clock, GitBranch, Globe, Lock, Zap, Share2, MessageSquare } from "lucide-react";

const EASE = [0.22, 1, 0.36, 1] as const;

const HF_SPHERE = "https://d8j0ntlcm91z4.cloudfront.net/user_3DDb66hXpSaWG4DmoX3Ae5V2dqt/hf_20260608_082007_063c8411-35b1-4eb4-a5b3-bc7c5bd62f50.png";

// Milestones del proyecto — en producción vendrían de la DB
const MILESTONES = [
  { id: 1, label: "Kickoff & diseño", status: "done", date: "May 2026" },
  { id: 2, label: "Infraestructura base", status: "done", date: "May 2026" },
  { id: 3, label: "Frontend & flujos", status: "active", date: "Jun 2026" },
  { id: 4, label: "Integraciones de pago", status: "pending", date: "Jun 2026" },
  { id: 5, label: "QA & entrega final", status: "pending", date: "Jul 2026" },
];

const UPDATES = [
  { date: "Hoy", msg: "V completó el panel de administración y lo publicó en staging." },
  { date: "Ayer", msg: "Integración Stripe activada — modo live configurado." },
  { date: "3 jun", msg: "Primera versión del dashboard cliente en producción." },
];

export default function ClientWorkspacePage() {
  const { user } = useUser();

  const shareUrl = typeof window !== "undefined" ? window.location.origin : "https://vforge.site";

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: "Mi proyecto en VForge", text: "Mira el progreso de mi app.", url: shareUrl });
    } else {
      navigator.clipboard?.writeText(shareUrl);
    }
  };

  return (
    <div className="min-h-screen bg-[#03020a] pb-24">
      {/* Header cristal */}
      <div className="sticky top-0 z-10 border-b border-white/[0.06] bg-[#03020a]/80 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="relative h-9 w-9 overflow-hidden rounded-full" style={{ boxShadow: "0 0 20px rgba(124,58,237,0.5)" }}>
              <img src={HF_SPHERE} alt="V" className="h-full w-full object-cover" style={{ objectPosition: "40% 30%" }} />
              <div className="absolute inset-0 rounded-full border border-white/15" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Tu espacio en VForge</p>
              <p className="text-[11px] text-white/35">Cliente · {user?.firstName ?? "Bienvenido"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleShare} className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-medium text-white/60 transition hover:text-white/90">
              <Share2 size={12} /> Compartir
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl space-y-5 px-5 pt-8">

        {/* Hero del proyecto */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ease: EASE }}
          className="relative overflow-hidden rounded-3xl border border-violet-400/20 bg-gradient-to-br from-violet-600/12 to-[#080614] p-6"
        >
          <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-violet-600/15 blur-3xl" />
          <p className="text-[11px] font-semibold tracking-widest text-violet-400/60 uppercase">Tu app</p>
          <h1 className="mt-1 text-2xl font-bold text-white">Mi Proyecto</h1>
          <p className="mt-1 text-sm font-light text-white/40">PWA completa · Next.js + Clerk + Neon + Stripe</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a href="#" className="flex items-center gap-1.5 rounded-xl bg-white/[0.06] px-3 py-2 text-xs font-medium text-white/70 transition hover:bg-white/[0.12]">
              <Globe size={12} className="text-cyan-400" /> Ver en vivo
            </a>
            <a href="#" className="flex items-center gap-1.5 rounded-xl bg-white/[0.06] px-3 py-2 text-xs font-medium text-white/70 transition hover:bg-white/[0.12]">
              <GitBranch size={12} className="text-violet-300" /> Ver repositorio
            </a>
            <a href="#" className="flex items-center gap-1.5 rounded-xl bg-white/[0.06] px-3 py-2 text-xs font-medium text-white/70 transition hover:bg-white/[0.12]">
              <MessageSquare size={12} className="text-emerald-400" /> Hablar con V
            </a>
          </div>
        </motion.div>

        {/* Timeline de progreso */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, ease: EASE }}
          className="rounded-3xl border border-white/[0.07] bg-white/[0.02] p-6"
        >
          <p className="mb-4 text-sm font-semibold text-white">Progreso del proyecto</p>
          <div className="space-y-3">
            {MILESTONES.map((m, i) => (
              <div key={m.id} className="flex items-center gap-3">
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs ${
                  m.status === "done" ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-400"
                  : m.status === "active" ? "border-violet-400/50 bg-violet-400/15 text-violet-300"
                  : "border-white/10 bg-white/[0.03] text-white/25"
                }`}>
                  {m.status === "done" ? <CheckCircle size={13} /> : m.status === "active" ? <Zap size={11} /> : <Clock size={11} />}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${m.status === "pending" ? "text-white/30" : "text-white"}`}>{m.label}</p>
                  <p className="text-[11px] text-white/25">{m.date}</p>
                </div>
                {m.status === "active" && (
                  <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-semibold text-violet-300 animate-pulse">En progreso</span>
                )}
              </div>
            ))}
          </div>
          {/* Progress bar */}
          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "48%" }}
              transition={{ delay: 0.5, duration: 1, ease: EASE }}
              className="h-full rounded-full bg-gradient-to-r from-violet-600 to-cyan-400"
            />
          </div>
          <p className="mt-1 text-right text-[11px] text-white/25">48% completado</p>
        </motion.div>

        {/* Actualizaciones recientes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, ease: EASE }}
          className="rounded-3xl border border-white/[0.07] bg-white/[0.02] p-6"
        >
          <p className="mb-4 text-sm font-semibold text-white">Últimas actualizaciones</p>
          <div className="space-y-3">
            {UPDATES.map((u, i) => (
              <div key={i} className="flex gap-3">
                <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400/60" />
                <div>
                  <p className="text-sm font-light text-white/70 leading-relaxed">{u.msg}</p>
                  <p className="mt-0.5 text-[11px] text-white/25">{u.date}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Scope info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, ease: EASE }}
          className="flex items-center gap-3 rounded-2xl border border-white/[0.05] bg-white/[0.02] px-4 py-3"
        >
          <Lock size={13} className="shrink-0 text-white/20" />
          <p className="text-xs text-white/25 font-light">Tu acceso está limitado a los recursos de este proyecto. Gestionado por tu proveedor VForge.</p>
        </motion.div>
      </div>
    </div>
  );
}
