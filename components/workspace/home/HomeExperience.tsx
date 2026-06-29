"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  IconActivity, IconBranch, IconKey, IconRocket,
  IconShield, IconSparkles, IconCheck, IconWarn,
} from "@/components/brand/VFIcons";

/* ── helpers ── */
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 20) return "Buenas tardes";
  return "Buenas noches";
}
function timeAgo(iso: string) {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "ahora";
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  if (s < 86400) return `${Math.floor(s / 3600)} h`;
  return `${Math.floor(s / 86400)} d`;
}

/* ── tipos ── */
interface Project { id: string; name: string; vercel_url?: string | null; status?: string | null; }
interface AuditEvent { id: string; action: string; created_at: string; }
interface BillingMe { plan: string; status: string | null; }

/* ── skeleton ── */
function Skel({ h = "h-[72px]" }: { h?: string }) {
  return <div className={`${h} animate-pulse rounded-xl`} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }} />;
}

/* ── widget card ── */
function Widget({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl p-5"
      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}
    >
      <div className="mb-4 flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: "rgba(255,255,255,0.3)" }}>{title}</p>
        <Link href={href} className="text-[11px] transition-colors" style={{ color: "rgba(124,58,237,0.8)" }}
          onMouseEnter={e => (e.currentTarget.style.color = "rgba(167,139,250,1)")}
          onMouseLeave={e => (e.currentTarget.style.color = "rgba(124,58,237,0.8)")}>
          Ver todo →
        </Link>
      </div>
      {children}
    </motion.div>
  );
}

/* ── quick actions ── */
const ACTIONS = [
  { href: "/app/forge",       label: "Chat con V",       icon: IconSparkles },
  { href: "/app/secrets",     label: "Nuevo secret",     icon: IconKey },
  { href: "/app/repovision",  label: "Ver repos",        icon: IconBranch },
  { href: "/app/deployments", label: "Deployments",      icon: IconRocket },
  { href: "/app/contracts",   label: "Contratos",        icon: IconShield },
  { href: "/app/crm",         label: "CRM",              icon: IconActivity },
];

function eventIcon(action: string) {
  if (action.includes("deploy") || action.includes("vercel")) return { Icon: IconRocket, color: "#a78bfa" };
  if (action.includes("secret") || action.includes("vault"))  return { Icon: IconKey,    color: "#8b5cf6" };
  if (action.includes("forge") || action.includes("chat"))    return { Icon: IconSparkles,color: "#a78bfa" };
  if (action.includes("error") || action.includes("fail"))    return { Icon: IconWarn,   color: "#ef4444" };
  if (action.includes("ok")   || action.includes("complete")) return { Icon: IconCheck,  color: "#22c55e" };
  return { Icon: IconActivity, color: "rgba(255,255,255,0.3)" };
}

/* ══ MAIN ════════════════════════════════════════════════════════════ */
export function HomeExperience({ name }: { name: string }) {
  const [projects,  setProjects]  = useState<Project[]>([]);
  const [events,    setEvents]    = useState<AuditEvent[]>([]);
  const [billing,   setBilling]   = useState<BillingMe | null>(null);
  const [secretCnt, setSecretCnt] = useState<number | null>(null);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/projects",       { cache: "no-store" }).then(r => r.ok ? r.json() : { projects: [] }),
      fetch("/api/forge/activity?limit=8", { cache: "no-store" }).then(r => r.ok ? r.json() : { events: [] }),
      fetch("/api/billing/me",     { cache: "no-store" }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch("/api/vault/operator-secrets", { cache: "no-store" }).then(r => r.ok ? r.json() : { secrets: [] }).catch(() => ({ secrets: [] })),
    ]).then(([p, a, b, v]) => {
      setProjects((p.projects ?? []).slice(0, 5));
      setEvents(a.events ?? []);
      setBilling(b);
      setSecretCnt((v.secrets ?? []).length);
    }).finally(() => setLoading(false));
  }, []);

  const planLabel: Record<string, string> = { free: "Free", studio: "Studio", forge: "Forge Pro", payg: "Pay-as-you-go" };

  return (
    <main className="mx-auto w-full max-w-5xl px-5 pb-24 pt-10 md:px-8 md:pt-14">

      {/* ── Header ── */}
      <div className="mb-10">
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="text-[13px]" style={{ color: "rgba(255,255,255,0.35)" }}>
          {greeting()}, {name}.
        </motion.p>
        <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05, ease: [0.22,1,0.36,1] }}
          className="font-display font-bold"
          style={{ fontSize: "clamp(2rem, 5vw, 3.2rem)", lineHeight: 1.05,
                   letterSpacing: "-0.03em", color: "#fff", marginTop: 6 }}>
          Tu fábrica está{" "}
          <span style={{ background: "linear-gradient(135deg,#a78bfa,#7c3aed)",
                         WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            despierta.
          </span>
        </motion.h1>
      </div>

      {/* ── Stats rápidas ── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Proyectos", value: loading ? "—" : projects.length,    icon: IconBranch },
          { label: "Secrets",   value: loading ? "—" : (secretCnt ?? "—"), icon: IconKey },
          { label: "Plan",      value: loading ? "—" : (billing ? (planLabel[billing.plan] ?? billing.plan) : "Free"), icon: IconShield },
          { label: "Actividad", value: loading ? "—" : events.length + " eventos", icon: IconActivity },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl p-4"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <Icon size={14} style={{ color: "rgba(124,58,237,0.8)", marginBottom: 8 }} />
            <p className="text-[1.4rem] font-bold tabular-nums" style={{ color: "#fff" }}>{value}</p>
            <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>{label}</p>
          </div>
        ))}
      </motion.div>

      {/* ── Grid principal ── */}
      <div className="grid gap-5 lg:grid-cols-2">

        {/* Proyectos recientes */}
        <Widget title="Proyectos recientes" href="/app/projects">
          {loading ? <div className="space-y-2">{[0,1,2].map(i => <Skel key={i} h="h-[48px]" />)}</div>
          : projects.length === 0
            ? <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                Sin proyectos.{" "}
                <Link href="/app/projects" style={{ color: "#a78bfa" }}>Crea uno →</Link>
              </p>
            : <div className="space-y-1">
                {projects.map(p => (
                  <Link key={p.id} href={`/app/projects`}
                    className="flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors"
                    style={{ background: "transparent" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <div className="flex items-center gap-2.5">
                      <span className="h-2 w-2 rounded-full flex-shrink-0"
                        style={{ background: p.vercel_url ? "#22c55e" : "rgba(255,255,255,0.2)" }} />
                      <span className="text-[13px]" style={{ color: "rgba(255,255,255,0.8)" }}>{p.name}</span>
                    </div>
                    {p.vercel_url && (
                      <span className="font-mono text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>live</span>
                    )}
                  </Link>
                ))}
              </div>}
        </Widget>

        {/* Actividad reciente */}
        <Widget title="Actividad reciente" href="/app/activity">
          {loading ? <div className="space-y-2">{[0,1,2].map(i => <Skel key={i} h="h-[44px]" />)}</div>
          : events.length === 0
            ? <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.3)" }}>Sin actividad registrada aún.</p>
            : <div className="space-y-1">
                {events.slice(0, 6).map(ev => {
                  const { Icon, color } = eventIcon(ev.action);
                  return (
                    <div key={ev.id} className="flex items-center gap-3 rounded-lg px-2 py-2">
                      <Icon size={13} style={{ color, flexShrink: 0 }} />
                      <span className="flex-1 truncate text-[12px]" style={{ color: "rgba(255,255,255,0.6)" }}>
                        {ev.action}
                      </span>
                      <span className="font-mono text-[10px] tabular-nums flex-shrink-0"
                        style={{ color: "rgba(255,255,255,0.2)" }}>
                        {timeAgo(ev.created_at)}
                      </span>
                    </div>
                  );
                })}
              </div>}
        </Widget>
      </div>

      {/* ── Quick actions ── */}
      <div className="mt-8">
        <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.14em]"
          style={{ color: "rgba(255,255,255,0.2)" }}>Acceso rápido</p>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {ACTIONS.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}
              className="flex flex-col items-center gap-2 rounded-xl py-4 px-2 transition-all text-center"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = "rgba(124,58,237,0.08)";
                el.style.borderColor = "rgba(124,58,237,0.2)";
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = "rgba(255,255,255,0.02)";
                el.style.borderColor = "rgba(255,255,255,0.07)";
              }}>
              <Icon size={18} style={{ color: "rgba(167,139,250,0.8)" }} />
              <span className="text-[11px] leading-tight" style={{ color: "rgba(255,255,255,0.5)" }}>{label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Plan / upgrade CTA ── */}
      {!loading && billing?.plan === "free" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          className="mt-8 flex items-center justify-between rounded-2xl p-5"
          style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.18)" }}>
          <div>
            <p className="text-[13px] font-semibold" style={{ color: "#fff" }}>Estás en el plan Free</p>
            <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.35)" }}>
              Sube a Forge Pro para MCP ilimitado, +200 skills y deploy sin límites.
            </p>
          </div>
          <a href="https://vmomentum.site"
            className="flex-shrink-0 rounded-xl px-4 py-2 text-[13px] font-semibold transition-all"
            style={{ background: "#fff", color: "#000" }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.88)")}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "#fff")}>
            Ver planes →
          </a>
        </motion.div>
      )}

    </main>
  );
}
