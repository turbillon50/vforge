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
  return <div className={`${h} animate-pulse rounded-xl`} style={{ background: "var(--surface-1)", border: "1px solid var(--border-1)" }} />;
}

/* ── widget card ── */
function Widget({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl p-5"
      style={{ background: "#ffffff", border: "1px solid var(--border-1)" }}
    >
      <div className="mb-4 flex items-center justify-between">
        <p className="font-mono text-[12px] uppercase tracking-[0.14em]" style={{ color: "var(--fg-muted)" }}>{title}</p>
        <Link href={href} className="text-[12px] font-medium transition-colors hover:underline" style={{ color: "var(--vf-violet-ink)" }}>
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
  if (action.includes("deploy") || action.includes("vercel")) return { Icon: IconRocket, color: "#5b21b6" };
  if (action.includes("secret") || action.includes("vault"))  return { Icon: IconKey,    color: "#5b21b6" };
  if (action.includes("forge") || action.includes("chat"))    return { Icon: IconSparkles,color: "#5b21b6" };
  if (action.includes("error") || action.includes("fail"))    return { Icon: IconWarn,   color: "#b91c1c" };
  if (action.includes("ok")   || action.includes("complete")) return { Icon: IconCheck,  color: "#15803d" };
  return { Icon: IconActivity, color: "var(--fg-muted)" };
}


/* ── Primeros pasos (cálido, se auto-oculta al completar) ── */
function FirstSteps({ connected, projects, loading }: { connected: string[]; projects: Project[]; loading: boolean }) {
  if (loading) return null;
  const steps = [
    { done: connected.includes("github") && connected.includes("vercel"), title: "Conecta tus herramientas", desc: "GitHub y Vercel en un clic.", cta: "Conectar", href: "/workspace/conexiones", vq: "¿Cómo conecto mis herramientas, GitHub y Vercel?" },
    { done: projects.length > 0, title: "Crea tu primera app", desc: "Ármala por módulos con preview en vivo.", cta: "Crear", href: "/workspace#crear", vq: "¿Cómo creo mi primera app?" },
    { done: projects.some(p => !!p.vercel_url), title: "Publícala en producción", desc: "Deploy en segundos, sin salir de aquí.", cta: "Publicar", href: "/workspace#crear", vq: "¿Cómo publico mi app en producción?" },
  ];
  const doneCount = steps.filter(s => s.done).length;
  if (doneCount === 3) return null;
  return (
    <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
      className="mb-8 rounded-2xl p-5 md:p-6"
      style={{ background: "#ffffff", border: "1px solid var(--border-1)" }}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="font-display text-[15px] font-semibold" style={{ color: "var(--fg-primary)" }}>Empieza aquí</p>
          <p className="text-[12px]" style={{ color: "var(--fg-secondary)" }}>Tres pasos para tener tu primera app viva.</p>
        </div>
        <span className="font-mono text-[12px]" style={{ color: "var(--fg-secondary)" }}>{doneCount}/3</span>
      </div>
      <div className="mb-5 h-1 w-full overflow-hidden rounded-full" style={{ background: "var(--surface-2)" }}>
        <div className="h-full rounded-full" style={{ width: `${(doneCount / 3) * 100}%`, background: "var(--vf-violet)", transition: "width .6s ease" }} />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {steps.map((st, i) => (
          <div key={i} className="rounded-xl p-4"
            style={{ background: st.done ? "var(--vf-violet-soft)" : "#ffffff", border: `1px solid ${st.done ? "var(--vf-violet)" : "var(--border-1)"}` }}>
            <div className="mb-2 flex h-6 w-6 items-center justify-center rounded-full"
              style={{ background: st.done ? "var(--vf-violet)" : "var(--surface-2)", color: st.done ? "#ffffff" : "var(--fg-secondary)" }}>
              {st.done ? <IconCheck size={13} /> : <span className="text-[12px] font-semibold">{i + 1}</span>}
            </div>
            <p className="text-[13px] font-medium" style={{ color: "var(--fg-primary)" }}>{st.title}</p>
            <p className="mt-0.5 text-[12.5px] leading-snug" style={{ color: "var(--fg-secondary)" }}>{st.desc}</p>
            {!st.done
              ? <Link href={st.href} className="mt-3 inline-block rounded-full px-4 py-1.5 text-[12px] font-medium" style={{ background: "var(--vf-violet)", color: "#ffffff" }}>{st.cta} →</Link>
              : <p className="mt-3 flex items-center gap-1 text-[12px] font-medium" style={{ color: "var(--fg-muted)" }}><IconCheck size={12} /> Listo</p>}
            <button onClick={() => window.dispatchEvent(new CustomEvent("vforge:open-v", { detail: { prompt: st.vq } }))} className="mt-2 text-[12px] transition-colors" style={{ color: "var(--vf-violet-ink)" }}>Pregúntale a V &rarr;</button>
          </div>
        ))}
      </div>
    </motion.section>
  );
}

/* ── Vitrina "Qué puedes hacer" ── */
function Showcase() {
  const cards = [
    { icon: IconSparkles, title: "Construye hablando con V", desc: "Describe tu idea y V la vuelve una app real.", href: "/workspace#crear" },
    { icon: IconBranch, title: "Configurador visual", desc: "Arma tu app por módulos con preview en vivo.", href: "/workspace#crear" },
    { icon: IconKey, title: "200+ integraciones", desc: "GitHub, Vercel, Stripe, Neon y más en un clic.", href: "/workspace/conexiones" },
    { icon: IconRocket, title: "Deploy en segundos", desc: "Publica a producción sin salir de aquí.", href: "/workspace#crear" },
  ];
  return (
    <section className="mb-8">
      <p className="mb-3 font-mono text-[12px] uppercase tracking-[0.14em]" style={{ color: "var(--fg-muted)" }}>Qué puedes hacer</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c, i) => {
          const Icon = c.icon;
          return (
            <Link key={i} href={c.href} className="block overflow-hidden rounded-xl transition-colors hover:border-[var(--vf-violet)]" style={{ border: "1px solid var(--border-1)", background: "#ffffff" }}>
              <div className="flex h-24 items-center justify-center" style={{ background: "var(--surface-1)", borderBottom: "1px solid var(--border-1)" }}>
                <Icon size={24} style={{ color: "var(--vf-violet-ink)" }} />
              </div>
              <div className="p-4">
                <p className="text-[13px] font-semibold" style={{ color: "var(--fg-primary)" }}>{c.title}</p>
                <p className="mt-1 text-[12.5px] leading-snug" style={{ color: "var(--fg-secondary)" }}>{c.desc}</p>
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
    <div id="crear" className="mb-8 rounded-2xl p-5 md:p-6" style={{ background: "#ffffff", border: "1px solid var(--border-1)" }}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-display text-[15px] font-semibold" style={{ color: "var(--fg-primary)" }}>Crea tu app y publícala</p>
          <p className="text-[12px]" style={{ color: "var(--fg-secondary)" }}>Un nombre y listo: repo en GitHub + deploy en Vercel, en segundos.</p>
        </div>
        {!open && (
          <button onClick={() => setOpen(true)} className="vf-btn rounded-full px-5 py-2.5 text-[13px] font-semibold text-white">Crear app →</button>
        )}
      </div>
      {open && (
        <div className="mt-4">
          <p className="mb-2 text-[12px] font-medium uppercase tracking-wide" style={{ color: "var(--fg-secondary)" }}>Elige una plantilla</p>
          <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[["landing","Landing","Cuenta qué haces"],["tienda","Tienda","Vende con Stripe"],["portafolio","Portafolio","Muestra tu trabajo"],["blanco","En blanco","Lienzo libre"]].map(([id,t,d]) => (
              <button key={id} type="button" onClick={() => setTpl(id)} className="rounded-xl p-3 text-left transition" style={{ background: tpl===id ? "var(--vf-violet-soft)" : "#ffffff", border: tpl===id ? "1px solid var(--vf-violet)" : "1px solid var(--border-1)" }}>
                <span className="block h-7 w-7 rounded-lg" style={{ background: "var(--surface-1)", border: "1px solid var(--border-1)" }} />
                <span className="mt-2 block text-[13px] font-semibold" style={{ color: "var(--fg-primary)" }}>{t}</span>
                <span className="block text-[12px]" style={{ color: "var(--fg-secondary)" }}>{d}</span>
              </button>
            ))}
          </div>
          <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="¿Qué hace tu app? (objetivo, 1-2 líneas)" rows={2} className="mb-3 w-full rounded-full px-4 py-2.5 text-[14px] outline-none" style={{ background: "#ffffff", border: "1px solid var(--border-1)", color: "var(--fg-primary)", resize: "vertical" }} />
          <p className="mb-2 text-[12px] font-medium uppercase tracking-wide" style={{ color: "var(--fg-muted)" }}>Capacidades</p>
          <div className="mb-3 flex flex-wrap gap-2">
            {["Autenticación", "Pagos", "Base de datos", "IA / V", "Dominio", "Panel admin", "Notificaciones", "Multi-idioma"].map((m) => {
              const on = mods.includes(m);
              return (
                <button key={m} type="button" onClick={() => setMods((pp) => (on ? pp.filter((x) => x !== m) : [...pp, m]))} className="rounded-full px-3 py-1.5 text-[12px] transition" style={{ background: on ? "var(--vf-violet-soft)" : "#ffffff", border: `1px solid ${on ? "var(--vf-violet)" : "var(--border-1)"}`, color: on ? "var(--vf-violet-ink)" : "var(--fg-secondary)" }}>{m}</button>
              );
            })}
          </div>
          <label className="mb-3 flex cursor-pointer items-center gap-2 text-[12.5px]" style={{ color: "var(--fg-secondary)" }}>
            <input type="checkbox" checked={priv} onChange={(e) => setPriv(e.target.checked)} /> Repositorio privado
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && run()} placeholder="Nombre de tu app" autoFocus
              className="flex-1 rounded-full px-4 py-2.5 text-[14px] outline-none" style={{ background: "#ffffff", border: "1px solid var(--border-1)", color: "var(--fg-primary)" }} />
            <button onClick={run} disabled={busy || !name.trim()} className="rounded-full px-5 py-2.5 text-[13px] font-semibold disabled:opacity-50" style={{ background: "var(--vf-violet)", color: "#ffffff" }}>
              {busy ? "Creando y publicando…" : "Crear y publicar"}
            </button>
          </div>
          {err && <p className="mt-3 text-[12.5px]" style={{ color: "#b91c1c" }}>{err}</p>}
          {res && (
            <div className="mt-3 rounded-xl p-3" style={{ background: "#f0fdf4", border: "1px solid #15803d" }}>
              <p className="text-[12.5px] font-medium" style={{ color: "#166534" }}>Tu app está viva.</p>
              <div className="mt-1.5 flex flex-wrap gap-3 text-[12.5px]">
                {res.deploy?.url && <a href={res.deploy.url} target="_blank" rel="noreferrer" style={{ color: "var(--vf-violet-ink)" }}>Ver en vivo →</a>}
                {res.repo?.url && <a href={res.repo.url} target="_blank" rel="noreferrer" style={{ color: "var(--fg-secondary)" }}>Ver repo →</a>}
              </div>
              {res.deploy?.url && (
                <iframe title="preview" src={res.deploy.url} className="mt-3 h-72 w-full rounded-lg" style={{ border: "1px solid var(--border-1)", background: "#ffffff" }} />
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
    <div id="cobros" className="mb-8 rounded-2xl p-5 md:p-6" style={{ background: "#ffffff", border: "1px solid var(--border-1)" }}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-display text-[15px] font-semibold" style={{ color: "var(--fg-primary)" }}>Cobra en segundos</p>
          <p className="text-[12px]" style={{ color: "var(--fg-secondary)" }}>Crea un producto y un link de pago con tu Stripe. El dinero llega a tu cuenta.</p>
        </div>
        {!open && <button onClick={() => setOpen(true)} className="vf-btn rounded-full px-5 py-2.5 text-[13px] font-semibold text-white">Crear cobro →</button>}
      </div>
      {open && (
        <div className="mt-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Qué cobras (ej. Asesoría)" className="flex-1 rounded-full px-4 py-2.5 text-[14px] outline-none" style={{ background: "#ffffff", border: "1px solid var(--border-1)", color: "var(--fg-primary)" }} />
            <input value={amount} onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} inputMode="decimal" placeholder="Monto MXN" className="w-full rounded-full px-4 py-2.5 text-[14px] outline-none sm:w-40" style={{ background: "#ffffff", border: "1px solid var(--border-1)", color: "var(--fg-primary)" }} />
            <button onClick={run} disabled={busy || !name.trim() || !amount} className="rounded-full px-5 py-2.5 text-[13px] font-semibold disabled:opacity-50" style={{ background: "var(--vf-violet)", color: "#ffffff" }}>{busy ? "Creando…" : "Generar link"}</button>
          </div>
          {err && <p className="mt-3 text-[12.5px]" style={{ color: "#b91c1c" }}>{err}</p>}
          {url && (
            <div className="mt-3 rounded-xl p-3" style={{ background: "#f0fdf4", border: "1px solid #15803d" }}>
              <p className="text-[12.5px] font-medium" style={{ color: "#166534" }}>Link de pago listo.</p>
              <a href={url} target="_blank" rel="noreferrer" className="mt-1 block break-all text-[12.5px]" style={{ color: "var(--vf-violet-ink)" }}>{url}</a>
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
    <div className="mb-8 rounded-2xl p-5" style={{ background: "#ffffff", border: "1px solid var(--border-1)" }}>
      <p className="font-display text-[15px] font-semibold" style={{ color: "var(--fg-primary)" }}>Conecta tu IA <span className="text-[12px] font-normal" style={{ color: "var(--fg-secondary)" }}>(opcional)</span></p>
      <p className="mb-3 text-[12px]" style={{ color: "var(--fg-secondary)" }}>Trae tu propia key y V corre con tu modelo. Sin key, usa el V de la casa gratis.</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <select value={provider} onChange={e => setProvider(e.target.value)} className="rounded-lg px-3 py-2.5 text-[13px] outline-none" style={{ background: "#ffffff", border: "1px solid var(--border-1)", color: "var(--fg-primary)" }}>
          {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <input value={key} onChange={e => setKey(e.target.value)} type="password" placeholder="Tu API key" className="flex-1 rounded-full px-4 py-2.5 text-[13px] outline-none" style={{ background: "#ffffff", border: "1px solid var(--border-1)", color: "var(--fg-primary)" }} />
        <button onClick={save} disabled={busy || !key.trim()} className="rounded-full px-5 py-2.5 text-[13px] font-semibold disabled:opacity-50" style={{ background: done ? "#15803d" : "var(--vf-violet)", color: "#ffffff" }}>{busy ? "Validando…" : done ? "Conectado ✓" : "Conectar"}</button>
      </div>
      {msg && <p className="mt-2 text-[12px]" style={{ color: done ? "#166534" : "#b91c1c" }}>{msg}</p>}
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
    <div id="dominio" className="mb-8 rounded-2xl p-5 md:p-6" style={{ background: "#ffffff", border: "1px solid var(--border-1)" }}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-display text-[15px] font-semibold" style={{ color: "var(--fg-primary)" }}>Tu dominio propio</p>
          <p className="text-[12px]" style={{ color: "var(--fg-secondary)" }}>Busca y compra un dominio para tu app, desde tu Vercel.</p>
        </div>
        {!open && <button onClick={() => setOpen(true)} className="rounded-full px-5 py-2.5 text-[13px] font-semibold" style={{ background: "var(--vf-violet)", color: "#ffffff" }}>Buscar dominio →</button>}
      </div>
      {open && (
        <div className="mt-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input value={name} onChange={e => { setName(e.target.value); setInfo(null); setBought(false); }} onKeyDown={e => e.key === "Enter" && check()} placeholder="tudominio.com" className="flex-1 rounded-full px-4 py-2.5 text-[14px] outline-none" style={{ background: "#ffffff", border: "1px solid var(--border-1)", color: "var(--fg-primary)" }} />
            <button onClick={check} disabled={busy || !name.trim()} className="rounded-full px-5 py-2.5 text-[13px] font-semibold disabled:opacity-50" style={{ background: "var(--vf-violet)", color: "#ffffff" }}>{busy ? "Buscando…" : "Buscar"}</button>
          </div>
          {err && <p className="mt-3 text-[12.5px]" style={{ color: "#b91c1c" }}>{err}</p>}
          {info && !bought && (
            <div className="mt-3 rounded-xl p-3" style={{ background: "var(--surface-1)", border: "1px solid var(--border-1)" }}>
              {info.available
                ? <div className="flex items-center justify-between gap-3">
                    <span className="text-[13px]" style={{ color: "#166534" }}>{name.trim().toLowerCase()} está disponible{info.price ? ` · $${info.price} USD/año` : ""}</span>
                    {info.price && <button onClick={buy} disabled={busy} className="rounded-full px-4 py-2 text-[12.5px] font-semibold disabled:opacity-50" style={{ background: "var(--vf-violet)", color: "#ffffff" }}>{busy ? "Comprando…" : `Comprar por $${info.price}`}</button>}
                  </div>
                : <span className="text-[13px]" style={{ color: "#b91c1c" }}>No disponible. Prueba otro.</span>}
            </div>
          )}
          {bought && <div className="mt-3 rounded-xl p-3" style={{ background: "#f0fdf4", border: "1px solid #15803d" }}><p className="text-[12.5px] font-medium" style={{ color: "#166534" }}>¡Dominio comprado! Conéctalo a tu app desde Vercel.</p></div>}
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
          className="font-mono text-[12px] uppercase" style={{ color: "var(--fg-muted)", letterSpacing: "0.22em" }}>
          {greeting()}, {name}
        </motion.p>
        <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.05, ease: [0.22,1,0.36,1] }}
          className="vf-hgrad font-display"
          style={{ fontSize: "clamp(2.8rem, 6.5vw, 4.4rem)", lineHeight: 1.0,
                   letterSpacing: "-0.05em", marginTop: 16, fontWeight: 600 }}>
          Tu fábrica está{" "}
          <span style={{ color: "var(--vf-violet)", fontWeight: 500 }}>despierta.</span>
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
            style={{ background: "#ffffff", border: "1px solid var(--border-1)" }}>
            <Icon size={14} style={{ color: "var(--vf-violet-ink)", marginBottom: 8 }} />
            <p className="text-[1.4rem] font-bold tabular-nums" style={{ color: "var(--fg-primary)" }}>{value}</p>
            <p className="text-[12px]" style={{ color: "var(--fg-muted)" }}>{label}</p>
          </div>
        ))}
      </motion.div>

      {/* ── Grid principal ── */}
      <div className="grid gap-5 lg:grid-cols-2">

        {/* Proyectos recientes */}
        <Widget title="Proyectos recientes" href="/app/projects">
          {loading ? <div className="space-y-2">{[0,1,2].map(i => <Skel key={i} h="h-[48px]" />)}</div>
          : projects.length === 0
            ? <p className="text-[13px]" style={{ color: "var(--fg-muted)" }}>
                Sin proyectos.{" "}
                <Link href="/app/projects" style={{ color: "var(--vf-violet-ink)" }}>Crea uno →</Link>
              </p>
            : <div className="space-y-1">
                {projects.map(p => (
                  <Link key={p.id} href={`/app/projects`}
                    className="flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors"
                    style={{ background: "transparent" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-1)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <div className="flex items-center gap-2.5">
                      <span className="h-2 w-2 rounded-full flex-shrink-0"
                        style={{ background: p.vercel_url ? "#15803d" : "var(--border-2)" }} />
                      <span className="text-[13px]" style={{ color: "var(--fg-primary)" }}>{p.name}</span>
                    </div>
                    {p.vercel_url && (
                      <span className="font-mono text-[12px]" style={{ color: "var(--fg-muted)" }}>live</span>
                    )}
                  </Link>
                ))}
              </div>}
        </Widget>

        {/* Actividad reciente */}
        <Widget title="Actividad reciente" href="/app/activity">
          {loading ? <div className="space-y-2">{[0,1,2].map(i => <Skel key={i} h="h-[44px]" />)}</div>
          : events.length === 0
            ? <p className="text-[13px]" style={{ color: "var(--fg-muted)" }}>Sin actividad registrada aún.</p>
            : <div className="space-y-1">
                {events.slice(0, 6).map(ev => {
                  const { Icon, color } = eventIcon(ev.action);
                  return (
                    <div key={ev.id} className="flex items-center gap-3 rounded-lg px-2 py-2">
                      <Icon size={13} style={{ color, flexShrink: 0 }} />
                      <span className="flex-1 truncate text-[12px]" style={{ color: "var(--fg-secondary)" }}>
                        {ev.action}
                      </span>
                      <span className="font-mono text-[12px] tabular-nums flex-shrink-0"
                        style={{ color: "var(--fg-muted)" }}>
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
        <p className="mb-4 font-mono text-[12px] uppercase tracking-[0.14em]"
          style={{ color: "var(--fg-muted)" }}>Acceso rápido</p>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {ACTIONS.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}
              className="flex flex-col items-center gap-2 rounded-xl py-4 px-2 transition-all text-center"
              style={{ background: "#ffffff", border: "1px solid var(--border-1)" }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = "var(--vf-violet-soft)";
                el.style.borderColor = "var(--vf-violet)";
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = "#ffffff";
                el.style.borderColor = "var(--border-1)";
              }}>
              <Icon size={18} style={{ color: "var(--vf-violet-ink)" }} />
              <span className="text-[12px] leading-tight" style={{ color: "var(--fg-secondary)" }}>{label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Plan / upgrade CTA ── */}
      {!loading && billing?.plan === "free" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          className="mt-8 flex items-center justify-between rounded-2xl p-5"
          style={{ background: "var(--vf-violet-soft)", border: "1px solid var(--vf-violet)" }}>
          <div>
            <p className="text-[13px] font-semibold" style={{ color: "var(--fg-primary)" }}>Estás en el plan Free</p>
            <p className="text-[12px]" style={{ color: "var(--fg-muted)" }}>
              Sube a Forge Pro para MCP ilimitado, +200 skills y deploy sin límites.
            </p>
          </div>
          <a href="/pricing"
            className="flex-shrink-0 rounded-xl px-4 py-2 text-[13px] font-semibold transition-colors"
            style={{ background: "var(--vf-violet)", color: "#ffffff" }}>
            Ver planes →
          </a>
        </motion.div>
      )}

    </main>
  );
}
