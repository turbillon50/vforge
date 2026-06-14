"use client";
import { motion } from "framer-motion";
import { useUser } from "@clerk/nextjs";
import { hasClerkPublishableKey } from "@/lib/auth/clerk-key";
import { IconCheck, IconClock, IconZap, IconGlobe, IconBranch, IconChat, IconShield, IconShare } from "@/components/brand/VFIcons";

const EASE = [0.22, 1, 0.36, 1] as const;
const HF_SPHERE = "https://d8j0ntlcm91z4.cloudfront.net/user_3DDb66hXpSaWG4DmoX3Ae5V2dqt/hf_20260608_082007_063c8411-35b1-4eb4-a5b3-bc7c5bd62f50.png";
const MILESTONES = [
  { id:1, label:"Kickoff & diseño",         status:"done",    date:"May 2026" },
  { id:2, label:"Infraestructura base",      status:"done",    date:"May 2026" },
  { id:3, label:"Frontend & flujos",         status:"active",  date:"Jun 2026" },
  { id:4, label:"Integraciones de pago",     status:"pending", date:"Jun 2026" },
  { id:5, label:"QA & entrega final",        status:"pending", date:"Jul 2026" },
];
const UPDATES = [
  { date:"Hoy",   msg:"V completó el panel de administración y lo publicó en staging." },
  { date:"Ayer",  msg:"Integración Stripe activada — modo live configurado." },
  { date:"3 jun", msg:"Primera versión del dashboard cliente en producción." },
];

export function ClientWorkspacePage() {
  const clerkEnabled = hasClerkPublishableKey();
  const shareUrl = typeof window !== "undefined" ? window.location.origin : "https://vforge.site";
  const handleShare = () => {
    if (typeof navigator !== "undefined" && navigator.share) navigator.share({ title:"Mi proyecto en VForge", url:shareUrl });
    else if (typeof navigator !== "undefined") navigator.clipboard?.writeText(shareUrl);
  };
  return (
    <div className="min-h-screen bg-[#03020a] pb-24">
      <div className="sticky top-0 z-10 border-b border-[var(--border-1)] bg-[#03020a]/80 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="relative h-9 w-9 overflow-hidden rounded-full" style={{boxShadow:"0 0 20px rgba(124,58,237,0.5)"}}>
              <img src={HF_SPHERE} alt="V" className="h-full w-full object-cover" style={{objectPosition:"40% 30%"}}/>
              <div className="absolute inset-0 rounded-full border border-[var(--border-1)]"/>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Tu espacio en VForge</p>
              <p className="text-[11px] text-[var(--fg-muted)]">
                Cliente · {clerkEnabled ? <WorkspaceUserName /> : "Bienvenido"}
              </p>
            </div>
          </div>
          <button onClick={handleShare} className="flex items-center gap-1.5 rounded-xl border border-[var(--border-1)] bg-[var(--surface-1)] px-3 py-2 text-xs font-medium text-[var(--fg-secondary)] transition hover:text-[var(--fg-primary)]">
            <IconShare size={12}/> Compartir
          </button>
        </div>
      </div>
      <div className="mx-auto max-w-2xl space-y-5 px-5 pt-8">
        <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{ease:EASE}}
          className="relative overflow-hidden rounded-3xl border border-violet-400/20 bg-gradient-to-br from-violet-600/12 to-[#080614] p-6">
          <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-violet-600/15 blur-3xl"/>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-violet-400/60">Tu app</p>
          <h1 className="mt-1 text-2xl font-bold text-white">Mi Proyecto</h1>
          <p className="mt-1 text-sm font-light text-[var(--fg-tertiary)]">PWA completa · Next.js + Clerk + Neon + Stripe</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a href="/app/deployments" className="flex items-center gap-1.5 rounded-xl bg-white/[0.06] px-3 py-2 text-xs font-medium text-[var(--fg-secondary)] transition hover:bg-white/[0.12]">
              <IconGlobe size={12} className="text-cyan-400"/> Ver en vivo
            </a>
            <a href="/app/repovision" className="flex items-center gap-1.5 rounded-xl bg-white/[0.06] px-3 py-2 text-xs font-medium text-[var(--fg-secondary)] transition hover:bg-white/[0.12]">
              <IconBranch size={12} className="text-violet-300"/> Repositorio
            </a>
            <a href="/app/chat" className="flex items-center gap-1.5 rounded-xl bg-white/[0.06] px-3 py-2 text-xs font-medium text-[var(--fg-secondary)] transition hover:bg-white/[0.12]">
              <IconChat size={12} className="text-emerald-400"/> Hablar con V
            </a>
          </div>
        </motion.div>
        <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.1,ease:EASE}}
          className="rounded-3xl border border-[var(--border-1)] bg-[var(--surface-1)] p-6">
          <p className="mb-4 text-sm font-semibold text-white">Progreso del proyecto</p>
          <div className="space-y-3">
            {MILESTONES.map(m=>(
              <div key={m.id} className="flex items-center gap-3">
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs ${m.status==="done"?"border-emerald-400/40 bg-emerald-400/10 text-emerald-400":m.status==="active"?"border-violet-400/50 bg-violet-400/15 text-violet-300":"border-[var(--border-1)] bg-[var(--surface-1)] text-[var(--fg-muted)]"}`}>
                  {m.status==="done"?<IconCheck size={12}/>:m.status==="active"?<IconZap size={11}/>:<IconClock size={11}/>}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${m.status==="pending"?"text-[var(--fg-muted)]":"text-white"}`}>{m.label}</p>
                  <p className="text-[11px] text-[var(--fg-muted)]">{m.date}</p>
                </div>
                {m.status==="active"&&<span className="animate-pulse rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-semibold text-violet-300">En progreso</span>}
              </div>
            ))}
          </div>
          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <motion.div initial={{width:0}} animate={{width:"48%"}} transition={{delay:0.5,duration:1,ease:EASE}}
              className="h-full rounded-full bg-gradient-to-r from-violet-600 to-cyan-400"/>
          </div>
          <p className="mt-1 text-right text-[11px] text-[var(--fg-muted)]">48% completado</p>
        </motion.div>
        <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.2,ease:EASE}}
          className="rounded-3xl border border-[var(--border-1)] bg-[var(--surface-1)] p-6">
          <p className="mb-4 text-sm font-semibold text-white">Últimas actualizaciones</p>
          <div className="space-y-3">
            {UPDATES.map((u,i)=>(
              <div key={i} className="flex gap-3">
                <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400/60"/>
                <div>
                  <p className="text-sm font-light leading-relaxed text-[var(--fg-secondary)]">{u.msg}</p>
                  <p className="mt-0.5 text-[11px] text-[var(--fg-muted)]">{u.date}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
        <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.3,ease:EASE}}
          className="flex items-center gap-3 rounded-2xl border border-[var(--border-1)] bg-[var(--surface-1)] px-4 py-3">
          <IconShield size={13} className="shrink-0 text-[var(--fg-muted)]"/>
          <p className="text-xs font-light text-[var(--fg-muted)]">Tu acceso está limitado a los recursos de este proyecto.</p>
        </motion.div>
      </div>
    </div>
  );
}

function WorkspaceUserName() {
  const { user } = useUser();
  return <>{user?.firstName ?? "Bienvenido"}</>;
}
