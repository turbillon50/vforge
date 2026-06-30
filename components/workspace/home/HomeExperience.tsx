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
      style={{ background: "linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.015))", border: "1px solid rgba(255,255,255,0.09)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.07), 0 10px 30px -16px rgba(0,0,0,0.6)" }}
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


/* ── Primeros pasos (cálido, se auto-oculta al completar) ── */
function FirstSteps({ connected, projects, loading }: { connected: string[]; projects: Project[]; loading: boolean }) {
  if (loading) return null;
  const steps = [
    { done: connected.includes("github") && connected.includes("vercel"), title: "Conecta tus herramientas", desc: "GitHub y Vercel en un clic.", cta: "Conectar", href: "/onboarding" },
    { done: projects.length > 0, title: "Crea tu primera app", desc: "Ármala por módulos con preview en vivo.", cta: "Crear", href: "/configurador.html" },
    { done: projects.some(p => !!p.vercel_url), title: "Publícala en producción", desc: "Deploy en segundos, sin salir de aquí.", cta: "Publicar", href: "/app/deployments" },
  ];
  const doneCount = steps.filter(s => s.done).length;
  if (doneCount === 3) return null;
  return (
    <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
      className="mb-8 rounded-2xl p-5 md:p-6"
      style={{ background: "linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.015))", border: "1px solid rgba(255,255,255,0.09)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.07), 0 10px 30px -16px rgba(0,0,0,0.6)" }}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="font-display text-[15px] font-semibold" style={{ color: "#fff" }}>Empieza aquí</p>
          <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.4)" }}>Tres pasos para tener tu primera app viva.</p>
        </div>
        <span className="font-mono text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>{doneCount}/3</span>
      </div>
      <div className="mb-5 h-1 w-full overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div className="h-full rounded-full" style={{ width: `${(doneCount / 3) * 100}%`, background: "linear-gradient(90deg,#7c3aed,#a78bfa)", transition: "width .6s ease" }} />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {steps.map((st, i) => (
          <div key={i} className="rounded-xl p-4"
            style={{ background: st.done ? "rgba(124,58,237,0.06)" : "rgba(255,255,255,0.02)", border: `1px solid ${st.done ? "rgba(124,58,237,0.25)" : "rgba(255,255,255,0.08)"}` }}>
            <div className="mb-2 flex h-6 w-6 items-center justify-center rounded-full"
              style={{ background: st.done ? "rgba(124,58,237,0.9)" : "rgba(255,255,255,0.06)", color: "#fff" }}>
              {st.done ? <IconCheck size={13} /> : <span className="text-[11px] font-semibold">{i + 1}</span>}
            </div>
            <p className="text-[13px] font-medium" style={{ color: "#fff" }}>{st.title}</p>
            <p className="mt-0.5 text-[11.5px] leading-snug" style={{ color: "rgba(255,255,255,0.4)" }}>{st.desc}</p>
            {!st.done
              ? <Link href={st.href} className="mt-3 inline-block rounded-lg px-3 py-1.5 text-[12px] font-medium" style={{ background: "#fff", color: "#000" }}>{st.cta} →</Link>
              : <p className="mt-3 flex items-center gap-1 text-[11px] font-medium" style={{ color: "#a78bfa" }}><IconCheck size={12} /> Listo</p>}
          </div>
        ))}
      </div>
    </motion.section>
  );
}

/* ── Vitrina "Qué puedes hacer" (con hueco de imagen para Higgsfield) ── */
function Showcase() {
  const cards = [
    { icon: IconSparkles, title: "Construye hablando con V", desc: "Describe tu idea y V la vuelve una app real.", href: "/app/forge", g: "linear-gradient(135deg,#1a1530,#0d0b1a)" },
    { icon: IconBranch, title: "Configurador visual", desc: "Arma tu app por módulos con preview en vivo.", href: "/configurador.html", g: "linear-gradient(135deg,#161421,#0c0b16)" },
    { icon: IconKey, title: "200+ integraciones", desc: "GitHub, Vercel, Stripe, Neon y más en un clic.", href: "/app/integrations", g: "linear-gradient(135deg,#1a1525,#0d0b16)" },
    { icon: IconRocket, title: "Deploy en segundos", desc: "Publica a producción sin salir de aquí.", href: "/app/deployments", g: "linear-gradient(135deg,#171327,#0c0b18)" },
  ];
  return (
    <section className="mb-8">
      <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: "rgba(255,255,255,0.3)" }}>Qué puedes hacer</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <Link key={i} href={c.href} className="block overflow-hidden rounded-2xl" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
              {/* IMG-SLOT: mañana cambiar este div por <img src={...} /> de Higgsfield */}
              <div className="flex h-24 items-center justify-center" style={{ background: c.g }}>
                <Icon size={26} style={{ color: "rgba(167,139,250,0.9)" }} />
              </div>
              <div className="p-4" style={{ background: "rgba(255,255,255,0.02)" }}>
                <p className="text-[13px] font-semibold" style={{ color: "#fff" }}>{c.title}</p>
                <p className="mt-1 text-[11.5px] leading-snug" style={{ color: "rgba(255,255,255,0.42)" }}>{c.desc}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}


/* ── Crear app (EL MOTOR): nombre -> repo + deploy en vivo ── */
function CreateApp() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [res, setRes] = useState<{ repo?: { url: string }; deploy?: { url: string | null } } | null>(null);

  const run = async () => {
    if (!name.trim() || busy) return;
    setBusy(true); setErr(null); setRes(null);
    try {
      const r = await fetch("/api/forja/ship", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const d = await r.json();
      if (!d.ok) {
        setErr(d.error === "connect_github" ? "Conecta tu GitHub primero." : d.error === "connect_vercel" ? "Conecta tu Vercel primero." : "No se pudo: " + (d.error || "error"));
      } else setRes(d);
    } catch (e) { setErr(e instanceof Error ? e.message : "error"); }
    finally { setBusy(false); }
  };

  return (
    <div className="mb-8 rounded-2xl p-5 md:p-6" style={{ background: "linear-gradient(180deg,rgba(124,58,237,0.10),rgba(255,255,255,0.015))", border: "1px solid rgba(124,58,237,0.28)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.07), 0 10px 30px -16px rgba(0,0,0,0.6)" }}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-display text-[15px] font-semibold" style={{ color: "#fff" }}>Crea tu app y publícala</p>
          <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.45)" }}>Un nombre y listo: repo en GitHub + deploy en Vercel, en segundos.</p>
        </div>
        {!open && (
          <button onClick={() => setOpen(true)} className="rounded-lg px-4 py-2 text-[13px] font-semibold" style={{ background: "#fff", color: "#000" }}>Crear app →</button>
        )}
      </div>
      {open && (
        <div className="mt-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && run()} placeholder="Nombre de tu app" autoFocus
              className="flex-1 rounded-lg px-3.5 py-2.5 text-[14px] outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff" }} />
            <button onClick={run} disabled={busy || !name.trim()} className="rounded-lg px-4 py-2.5 text-[13px] font-semibold disabled:opacity-50" style={{ background: "#7c3aed", color: "#fff" }}>
              {busy ? "Creando y publicando…" : "Crear y publicar"}
            </button>
          </div>
          {err && <p className="mt-3 text-[12.5px]" style={{ color: "#fca5a5" }}>{err}</p>}
          {res && (
            <div className="mt-3 rounded-xl p-3" style={{ background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.25)" }}>
              <p className="text-[12.5px] font-medium" style={{ color: "#86efac" }}>Tu app está viva.</p>
              <div className="mt-1.5 flex flex-wrap gap-3 text-[12.5px]">
                {res.deploy?.url && <a href={res.deploy.url} target="_blank" rel="noreferrer" style={{ color: "#a78bfa" }}>Ver en vivo →</a>}
                {res.repo?.url && <a href={res.repo.url} target="_blank" rel="noreferrer" style={{ color: "rgba(255,255,255,0.6)" }}>Ver repo →</a>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ══ MAIN ════════════════════════════════════════════════════════════ */
export function HomeExperience({ name }: { name: string }) {
  const [projects,  setProjects]  = useState<Project[]>([]);
  const [events,    setEvents]    = useState<AuditEvent[]>([]);
  const [billing,   setBilling]   = useState<BillingMe | null>(null);
  const [secretCnt, setSecretCnt] = useState<number | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [connected, setConnected] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/projects",       { cache: "no-store" }).then(r => r.ok ? r.json() : { projects: [] }),
      fetch("/api/forge/activity?limit=8", { cache: "no-store" }).then(r => r.ok ? r.json() : { events: [] }),
      fetch("/api/billing/me",     { cache: "no-store" }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch("/api/vault/operator-secrets", { cache: "no-store" }).then(r => r.ok ? r.json() : { secrets: [] }).catch(() => ({ secrets: [] })),
      fetch("/api/onboarding/status", { cache: "no-store" }).then(r => r.ok ? r.json() : { connected: [] }).catch(() => ({ connected: [] })),
    ]).then(([p, a, b, v, c]) => {
      setProjects((p.projects ?? []).slice(0, 5));
      setEvents(a.events ?? []);
      setBilling(b);
      setSecretCnt((v.secrets ?? []).length);
      setConnected(c.connected ?? []);
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

      <FirstSteps connected={connected} projects={projects} loading={loading} />
      <CreateApp />
      <Showcase />

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
            style={{ background: "linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.015))", border: "1px solid rgba(255,255,255,0.09)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.07), 0 10px 30px -16px rgba(0,0,0,0.6)" }}>
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
              style={{ background: "linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.015))", border: "1px solid rgba(255,255,255,0.09)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.07), 0 10px 30px -16px rgba(0,0,0,0.6)" }}
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
          <a href="/pricing"
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
