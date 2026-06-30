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
      style={{ background: "linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.015))", border: "1px solid rgba(255,255,255,0.09)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.07), 0 1px 2px rgba(0,0,0,0.45), 0 4px 10px -2px rgba(0,0,0,0.4), 0 16px 40px -12px rgba(0,0,0,0.55)" }}
    >
      <div className="mb-4 flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: "rgba(255,255,255,0.46)" }}>{title}</p>
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
  return { Icon: IconActivity, color: "rgba(255,255,255,0.46)" };
}


/* ── Primeros pasos (cálido, se auto-oculta al completar) ── */
function FirstSteps({ connected, projects, loading }: { connected: string[]; projects: Project[]; loading: boolean }) {
  if (loading) return null;
  const steps = [
    { done: connected.includes("github") && connected.includes("vercel"), title: "Conecta tus herramientas", desc: "GitHub y Vercel en un clic.", cta: "Conectar", href: "/workspace/conexiones", vq: "¿Cómo conecto mis herramientas, GitHub y Vercel?" },
    { done: projects.length > 0, title: "Crea tu primera app", desc: "Ármala por módulos con preview en vivo.", cta: "Crear", href: "/configurador.html", vq: "¿Cómo creo mi primera app?" },
    { done: projects.some(p => !!p.vercel_url), title: "Publícala en producción", desc: "Deploy en segundos, sin salir de aquí.", cta: "Publicar", href: "/workspace#crear", vq: "¿Cómo publico mi app en producción?" },
  ];
  const doneCount = steps.filter(s => s.done).length;
  if (doneCount === 3) return null;
  return (
    <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
      className="mb-8 rounded-2xl p-5 md:p-6"
      style={{ background: "linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.015))", border: "1px solid rgba(255,255,255,0.09)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.07), 0 1px 2px rgba(0,0,0,0.45), 0 4px 10px -2px rgba(0,0,0,0.4), 0 16px 40px -12px rgba(0,0,0,0.55)" }}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="font-display text-[15px] font-semibold" style={{ color: "#fff" }}>Empieza aquí</p>
          <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.58)" }}>Tres pasos para tener tu primera app viva.</p>
        </div>
        <span className="font-mono text-[11px]" style={{ color: "rgba(255,255,255,0.58)" }}>{doneCount}/3</span>
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
            <p className="mt-0.5 text-[11.5px] leading-snug" style={{ color: "rgba(255,255,255,0.58)" }}>{st.desc}</p>
            {!st.done
              ? <Link href={st.href} className="mt-3 inline-block rounded-full px-4 py-1.5 text-[12px] font-medium" style={{ background: "linear-gradient(180deg,#ffffff,#ededf2)", color: "#0a0810", boxShadow: "0 6px 16px -6px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.7)" }}>{st.cta} →</Link>
              : <p className="mt-3 flex items-center gap-1 text-[11px] font-medium" style={{ color: "#9aa0aa" }}><IconCheck size={12} /> Listo</p>}
            <button onClick={() => window.dispatchEvent(new CustomEvent("vforge:open-v", { detail: { prompt: st.vq } }))} className="mt-2 text-[11px] transition-colors" style={{ color: "rgba(167,139,250,0.85)" }}>Pregúntale a V &rarr;</button>
          </div>
        ))}
      </div>
    </motion.section>
  );
}

/* ── Vitrina "Qué puedes hacer" (con hueco de imagen para Higgsfield) ── */
function Showcase() {
  const cards = [
    { icon: IconSparkles, title: "Construye hablando con V", desc: "Describe tu idea y V la vuelve una app real.", href: "/workspace#crear", g: "linear-gradient(135deg,#1a1530,#0d0b1a)" },
    { icon: IconBranch, title: "Configurador visual", desc: "Arma tu app por módulos con preview en vivo.", href: "/configurador.html", g: "linear-gradient(135deg,#161421,#0c0b16)" },
    { icon: IconKey, title: "200+ integraciones", desc: "GitHub, Vercel, Stripe, Neon y más en un clic.", href: "/workspace/conexiones", g: "linear-gradient(135deg,#1a1525,#0d0b16)" },
    { icon: IconRocket, title: "Deploy en segundos", desc: "Publica a producción sin salir de aquí.", href: "/workspace#crear", g: "linear-gradient(135deg,#171327,#0c0b18)" },
  ];
  return (
    <section className="mb-8">
      <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: "rgba(255,255,255,0.46)" }}>Qué puedes hacer</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <Link key={i} href={c.href} className="block overflow-hidden rounded-2xl" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
              {/* IMG-SLOT: mañana cambiar este div por <img src={...} /> de Higgsfield */}
              <div className="flex h-24 items-center justify-center" style={{ background: c.g }}>
                <Icon size={24} style={{ color: "rgba(255,255,255,0.85)" }} />
              </div>
              <div className="p-4" style={{ background: "rgba(255,255,255,0.02)" }}>
                <p className="text-[13px] font-semibold" style={{ color: "#fff" }}>{c.title}</p>
                <p className="mt-1 text-[11.5px] leading-snug" style={{ color: "rgba(255,255,255,0.58)" }}>{c.desc}</p>
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
  const [tpl, setTpl] = useState("landing");
  const [desc, setDesc] = useState("");
  const [mods, setMods] = useState<string[]>([]);
  const [priv, setPriv] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [res, setRes] = useState<{ repo?: { url: string }; deploy?: { url: string | null } } | null>(null);

  const run = async () => {
    if (!name.trim() || busy) return;
    setBusy(true); setErr(null); setRes(null);
    try {
      const r = await fetch("/api/forja/ship", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), template: tpl, description: desc, modules: mods, isPrivate: priv }),
      });
      const d = await r.json();
      if (!d.ok) {
        setErr(d.error === "connect_github" ? "Conecta tu GitHub primero." : d.error === "connect_vercel" ? "Conecta tu Vercel primero." : "No se pudo: " + (d.error || "error"));
      } else setRes(d);
    } catch (e) { setErr(e instanceof Error ? e.message : "error"); }
    finally { setBusy(false); }
  };

  return (
    <div id="crear" className="mb-8 rounded-2xl p-5 md:p-6" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.09)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.07), 0 1px 2px rgba(0,0,0,0.45), 0 4px 10px -2px rgba(0,0,0,0.4), 0 16px 40px -12px rgba(0,0,0,0.55)" }}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-display text-[15px] font-semibold" style={{ color: "#fff" }}>Crea tu app y publícala</p>
          <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.6)" }}>Un nombre y listo: repo en GitHub + deploy en Vercel, en segundos.</p>
        </div>
        {!open && (
          <button onClick={() => setOpen(true)} className="rounded-full px-5 py-2.5 text-[13px] font-semibold" style={{ background: "linear-gradient(180deg,#ffffff,#ededf2)", color: "#0a0810", boxShadow: "0 6px 16px -6px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.7)" }}>Crear app →</button>
        )}
      </div>
      {open && (
        <div className="mt-4">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.58)" }}>Elige una plantilla</p>
          <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[["landing","Landing","Cuenta qué haces","#7c3aed"],["tienda","Tienda","Vende con Stripe","#16a34a"],["portafolio","Portafolio","Muestra tu trabajo","#0ea5e9"],["blanco","En blanco","Lienzo libre","#a78bfa"]].map(([id,t,d,c]) => (
              <button key={id} type="button" onClick={() => setTpl(id)} className="rounded-xl p-3 text-left transition" style={{ background: tpl===id ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.02)", border: tpl===id ? `1px solid ${c}` : "1px solid rgba(255,255,255,0.09)", boxShadow: tpl===id ? `0 0 0 1px ${c}, inset 0 1px 0 rgba(255,255,255,0.06)` : "none" }}>
                <span className="block h-7 w-7 rounded-lg" style={{ background: `radial-gradient(120% 120% at 30% 25%, ${c}, transparent 70%)`, border: `1px solid ${c}` }} />
                <span className="mt-2 block text-[12.5px] font-semibold" style={{ color: "#fff" }}>{t}</span>
                <span className="block text-[10.5px]" style={{ color: "rgba(255,255,255,0.58)" }}>{d}</span>
              </button>
            ))}
          </div>
          <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="¿Qué hace tu app? (objetivo, 1-2 líneas)" rows={2} className="mb-3 w-full rounded-full px-4 py-2.5 text-[14px] outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff", resize: "vertical" }} />
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.46)" }}>Capacidades</p>
          <div className="mb-3 flex flex-wrap gap-2">
            {["Autenticación", "Pagos", "Base de datos", "IA / V", "Dominio", "Panel admin", "Notificaciones", "Multi-idioma"].map((m) => {
              const on = mods.includes(m);
              return (
                <button key={m} type="button" onClick={() => setMods((pp) => (on ? pp.filter((x) => x !== m) : [...pp, m]))} className="rounded-full px-3 py-1.5 text-[12px] transition" style={{ background: on ? "rgba(124,58,237,0.16)" : "rgba(255,255,255,0.04)", border: `1px solid ${on ? "rgba(124,58,237,0.4)" : "rgba(255,255,255,0.12)"}`, color: on ? "#c4b5fd" : "rgba(255,255,255,0.7)" }}>{m}</button>
              );
            })}
          </div>
          <label className="mb-3 flex cursor-pointer items-center gap-2 text-[12.5px]" style={{ color: "rgba(255,255,255,0.6)" }}>
            <input type="checkbox" checked={priv} onChange={(e) => setPriv(e.target.checked)} /> Repositorio privado
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && run()} placeholder="Nombre de tu app" autoFocus
              className="flex-1 rounded-full px-4 py-2.5 text-[14px] outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff" }} />
            <button onClick={run} disabled={busy || !name.trim()} className="rounded-full px-5 py-2.5 text-[13px] font-semibold disabled:opacity-50" style={{ background: "#7c3aed", color: "#fff" }}>
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
              {res.deploy?.url && (
                <iframe title="preview" src={res.deploy.url} className="mt-3 h-72 w-full rounded-lg" style={{ border: "1px solid rgba(255,255,255,0.12)", background: "#fff" }} />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


/* ── Cobrar (MOTOR DE COBROS): nombre + monto -> link de pago Stripe ── */
function CobroApp() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);

  const run = async () => {
    if (!name.trim() || !amount || busy) return;
    setBusy(true); setErr(null); setUrl(null);
    try {
      const r = await fetch("/api/forja/cobro", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), amount: Number(amount) }),
      });
      const d = await r.json();
      if (!d.ok) {
        setErr(d.error === "connect_stripe" ? "Conecta tu Stripe primero." : d.error === "monto_minimo" ? "Monto mínimo $10." : "No se pudo: " + (d.error || "error"));
      } else setUrl(d.url);
    } catch (e) { setErr(e instanceof Error ? e.message : "error"); }
    finally { setBusy(false); }
  };

  return (
    <div id="cobros" className="mb-8 rounded-2xl p-5 md:p-6" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.09)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.07), 0 1px 2px rgba(0,0,0,0.45), 0 4px 10px -2px rgba(0,0,0,0.4), 0 16px 40px -12px rgba(0,0,0,0.55)" }}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-display text-[15px] font-semibold" style={{ color: "#fff" }}>Cobra en segundos</p>
          <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.6)" }}>Crea un producto y un link de pago con tu Stripe. El dinero llega a tu cuenta.</p>
        </div>
        {!open && <button onClick={() => setOpen(true)} className="rounded-full px-5 py-2.5 text-[13px] font-semibold" style={{ background: "linear-gradient(180deg,#ffffff,#ededf2)", color: "#0a0810", boxShadow: "0 6px 16px -6px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.7)" }}>Crear cobro →</button>}
      </div>
      {open && (
        <div className="mt-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Qué cobras (ej. Asesoría)" className="flex-1 rounded-full px-4 py-2.5 text-[14px] outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff" }} />
            <input value={amount} onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} inputMode="decimal" placeholder="Monto MXN" className="w-full rounded-full px-4 py-2.5 text-[14px] outline-none sm:w-40" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff" }} />
            <button onClick={run} disabled={busy || !name.trim() || !amount} className="rounded-full px-5 py-2.5 text-[13px] font-semibold disabled:opacity-50" style={{ background: "#7c3aed", color: "#fff" }}>{busy ? "Creando…" : "Generar link"}</button>
          </div>
          {err && <p className="mt-3 text-[12.5px]" style={{ color: "#fca5a5" }}>{err}</p>}
          {url && (
            <div className="mt-3 rounded-xl p-3" style={{ background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.25)" }}>
              <p className="text-[12.5px] font-medium" style={{ color: "#86efac" }}>Link de pago listo.</p>
              <a href={url} target="_blank" rel="noreferrer" className="mt-1 block break-all text-[12.5px]" style={{ color: "#a78bfa" }}>{url}</a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


/* ── Conecta tu IA (BYO-key, opcional): Anthropic / OpenAI / Gemini ── */
function ConnectLLM() {
  const [provider, setProvider] = useState("anthropic");
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const save = async () => {
    if (!key.trim() || busy) return;
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/forja/connect-llm", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, key: key.trim() }),
      });
      const d = await r.json();
      if (d.ok) { setDone(true); setMsg("Conectado. V correrá con tu " + provider + "."); setKey(""); }
      else setMsg(d.error || "No se pudo validar la key.");
    } catch (e) { setMsg(e instanceof Error ? e.message : "error"); }
    finally { setBusy(false); }
  };

  const opts = [["anthropic", "Anthropic"], ["openai", "OpenAI"], ["gemini", "Gemini"]];
  return (
    <div className="mb-8 rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.09)" }}>
      <p className="font-display text-[15px] font-semibold" style={{ color: "#fff" }}>Conecta tu IA <span className="text-[12px] font-normal" style={{ color: "rgba(255,255,255,0.58)" }}>(opcional)</span></p>
      <p className="mb-3 text-[12px]" style={{ color: "rgba(255,255,255,0.6)" }}>Trae tu propia key y V corre con tu modelo. Sin key, usa el V de la casa gratis.</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <select value={provider} onChange={e => setProvider(e.target.value)} className="rounded-lg px-3 py-2.5 text-[13px] outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff" }}>
          {opts.map(([v, l]) => <option key={v} value={v} style={{ color: "#000" }}>{l}</option>)}
        </select>
        <input value={key} onChange={e => setKey(e.target.value)} type="password" placeholder="Tu API key" className="flex-1 rounded-full px-4 py-2.5 text-[13px] outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff" }} />
        <button onClick={save} disabled={busy || !key.trim()} className="rounded-full px-5 py-2.5 text-[13px] font-semibold disabled:opacity-50" style={{ background: done ? "#16a34a" : "#fff", color: done ? "#fff" : "#000" }}>{busy ? "Validando…" : done ? "Conectado ✓" : "Conectar"}</button>
      </div>
      {msg && <p className="mt-2 text-[12px]" style={{ color: done ? "#86efac" : "#fca5a5" }}>{msg}</p>}
    </div>
  );
}


/* ── Comprar dominio (Vercel del usuario; compra con confirmación explícita) ── */
function DomainBuyer() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<{ available: boolean; price: number | null } | null>(null);
  const [bought, setBought] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const check = async () => {
    const n = name.trim().toLowerCase();
    if (!n || busy) return;
    setBusy(true); setErr(null); setInfo(null); setBought(false);
    try {
      const r = await fetch("/api/forja/domain?name=" + encodeURIComponent(n));
      const d = await r.json();
      if (!d.ok) setErr(d.error === "connect_vercel" ? "Conecta tu Vercel primero." : "No se pudo consultar.");
      else setInfo({ available: d.available, price: d.price });
    } catch { setErr("Error de red."); } finally { setBusy(false); }
  };
  const buy = async () => {
    if (!info?.price || busy) return;
    setBusy(true); setErr(null);
    try {
      const r = await fetch("/api/forja/domain", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim().toLowerCase(), expectedPrice: info.price }) });
      const d = await r.json();
      if (d.ok) setBought(true); else setErr("No se pudo comprar (revisa tu método de pago en Vercel).");
    } catch { setErr("Error de red."); } finally { setBusy(false); }
  };

  return (
    <div id="dominio" className="mb-8 rounded-2xl p-5 md:p-6" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.09)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.07), 0 1px 2px rgba(0,0,0,0.45), 0 4px 10px -2px rgba(0,0,0,0.4), 0 16px 40px -12px rgba(0,0,0,0.55)" }}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-display text-[15px] font-semibold" style={{ color: "#fff" }}>Tu dominio propio</p>
          <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.6)" }}>Busca y compra un dominio para tu app, desde tu Vercel.</p>
        </div>
        {!open && <button onClick={() => setOpen(true)} className="rounded-full px-5 py-2.5 text-[13px] font-semibold" style={{ background: "linear-gradient(180deg,#ffffff,#ededf2)", color: "#0a0810", boxShadow: "0 6px 16px -6px rgba(0,0,0,0.5)" }}>Buscar dominio →</button>}
      </div>
      {open && (
        <div className="mt-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input value={name} onChange={e => { setName(e.target.value); setInfo(null); setBought(false); }} onKeyDown={e => e.key === "Enter" && check()} placeholder="tudominio.com" className="flex-1 rounded-full px-4 py-2.5 text-[14px] outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", color: "#fff" }} />
            <button onClick={check} disabled={busy || !name.trim()} className="rounded-full px-5 py-2.5 text-[13px] font-semibold disabled:opacity-50" style={{ background: "#7c3aed", color: "#fff" }}>{busy ? "Buscando…" : "Buscar"}</button>
          </div>
          {err && <p className="mt-3 text-[12.5px]" style={{ color: "#fca5a5" }}>{err}</p>}
          {info && !bought && (
            <div className="mt-3 rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.09)" }}>
              {info.available
                ? <div className="flex items-center justify-between gap-3">
                    <span className="text-[13px]" style={{ color: "#86efac" }}>{name.trim().toLowerCase()} está disponible{info.price ? ` · $${info.price} USD/año` : ""}</span>
                    {info.price && <button onClick={buy} disabled={busy} className="rounded-full px-4 py-2 text-[12.5px] font-semibold disabled:opacity-50" style={{ background: "#7c3aed", color: "#fff" }}>{busy ? "Comprando…" : `Comprar por $${info.price}`}</button>}
                  </div>
                : <span className="text-[13px]" style={{ color: "#fca5a5" }}>No disponible. Prueba otro.</span>}
            </div>
          )}
          {bought && <div className="mt-3 rounded-xl p-3" style={{ background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.25)" }}><p className="text-[12.5px] font-medium" style={{ color: "#86efac" }}>¡Dominio comprado! Conéctalo a tu app desde Vercel.</p></div>}
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
      <div className="mb-16 mt-4">
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="font-mono text-[11px] uppercase" style={{ color: "rgba(255,255,255,0.46)", letterSpacing: "0.22em" }}>
          {greeting()}, {name}
        </motion.p>
        <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.05, ease: [0.22,1,0.36,1] }}
          className="font-display"
          style={{ fontSize: "clamp(2.8rem, 6.5vw, 4.4rem)", lineHeight: 1.0,
                   letterSpacing: "-0.05em", color: "#f4f4f6", marginTop: 16, fontWeight: 600 }}>
          Tu fábrica está{" "}
          <span style={{ color: "#fff", fontWeight: 500 }}>despierta.</span>
        </motion.h1>
      </div>

      <FirstSteps connected={connected} projects={projects} loading={loading} />
      <CreateApp />
      <CobroApp />
      <DomainBuyer />
      <ConnectLLM />
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
            style={{ background: "linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.015))", border: "1px solid rgba(255,255,255,0.09)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.07), 0 1px 2px rgba(0,0,0,0.45), 0 4px 10px -2px rgba(0,0,0,0.4), 0 16px 40px -12px rgba(0,0,0,0.55)" }}>
            <Icon size={14} style={{ color: "rgba(124,58,237,0.8)", marginBottom: 8 }} />
            <p className="text-[1.4rem] font-bold tabular-nums" style={{ color: "#fff" }}>{value}</p>
            <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.46)" }}>{label}</p>
          </div>
        ))}
      </motion.div>

      {/* ── Grid principal ── */}
      <div className="grid gap-5 lg:grid-cols-2">

        {/* Proyectos recientes */}
        <Widget title="Proyectos recientes" href="/app/projects">
          {loading ? <div className="space-y-2">{[0,1,2].map(i => <Skel key={i} h="h-[48px]" />)}</div>
          : projects.length === 0
            ? <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.46)" }}>
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
            ? <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.46)" }}>Sin actividad registrada aún.</p>
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
              style={{ background: "linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.015))", border: "1px solid rgba(255,255,255,0.09)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.07), 0 1px 2px rgba(0,0,0,0.45), 0 4px 10px -2px rgba(0,0,0,0.4), 0 16px 40px -12px rgba(0,0,0,0.55)" }}
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
            style={{ background: "linear-gradient(180deg,#ffffff,#ededf2)", color: "#0a0810", boxShadow: "0 6px 16px -6px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.7)" }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.88)")}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "#fff")}>
            Ver planes →
          </a>
        </motion.div>
      )}

    </main>
  );
}
