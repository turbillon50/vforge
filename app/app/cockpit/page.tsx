"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/workspace/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  GitBranch, Workflow, Boxes, CircleCheck, Plus, Cpu, ArrowUpRight,
  Flame, Banknote, Hammer, CalendarClock,
} from "lucide-react";

type Item = { id: number; kind: string; text: string; done?: boolean };
type Data = { services?: Record<string, string>; pending?: any[]; items?: Item[] };
type PortfolioProject = {
  project_id: string; client_name: string; status: string;
  total_mxn: number; paid_mxn: number; debe: number;
  next_milestone: string | null; updated_at: string;
  last_activity: { title: string; created_at: string } | null;
};
type Portfolio = { projects: PortfolioProject[]; totals: { total: number; paid: number; debe: number } };

const mxn = (n: number) => n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });
const fecha = (s: string) => new Date(s).toLocaleDateString("es-MX", { day: "numeric", month: "short" });

const NICE: Record<string, string> = {
  "vmomentum-hub": "Hub IA", "stitch-worker": "Stitch worker",
  "brain-relay": "Brain", "vmomentum-engine": "Motor", n8n: "n8n flujos",
};

// ---- Cubetas y semaforo de salud -----------------------------------------

type Bucket = "urgentes" | "lana" | "obra";
type Health = "vivo" | "atento" | "roto";

function daysSince(iso?: string | null): number {
  if (!iso) return 999;
  const d = (Date.now() - new Date(iso).getTime()) / 86400000;
  return Number.isFinite(d) ? Math.floor(d) : 999;
}

function healthOf(p: PortfolioProject): Health {
  const s = (p.status || "").toLowerCase();
  if (/roto|bloq|caido|error|stuck/.test(s)) return "roto";
  const days = daysSince(p.last_activity?.created_at ?? p.updated_at);
  if (days <= 7) return "vivo";
  if (days <= 21) return "atento";
  return "roto";
}

function bucketOf(p: PortfolioProject): Bucket {
  const s = (p.status || "").toLowerCase();
  if (/urgen|roto|bloq|riesgo|atras|caido/.test(s)) return "urgentes";
  if (healthOf(p) === "roto" && p.debe > 0) return "urgentes";
  if (p.debe > 0 && /entreg|cobr|listo|produc|activo|termin|final|lanzad|live/.test(s)) return "lana";
  return "obra";
}

const HEALTH_UI: Record<Health, { dot: string; label: string; text: string }> = {
  vivo:   { dot: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]", label: "Vivo",   text: "text-emerald-600 dark:text-emerald-300" },
  atento: { dot: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.7)]",   label: "Atento", text: "text-amber-600 dark:text-amber-300" },
  roto:   { dot: "bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.8)]",    label: "Roto",   text: "text-red-600 dark:text-red-300" },
};

const BUCKET_UI: Record<Bucket, {
  title: string; Icon: typeof Flame; accent: string; chip: string; hint: string;
}> = {
  urgentes: { title: "Urgentes", Icon: Flame, accent: "text-red-600 dark:text-red-300", chip: "border-red-400/30 bg-red-500/10", hint: "Atiende hoy" },
  lana:     { title: "Lana", Icon: Banknote, accent: "text-emerald-600 dark:text-emerald-300", chip: "border-emerald-400/30 bg-emerald-500/10", hint: "Cobrables ya" },
  obra:     { title: "En obra", Icon: Hammer, accent: "text-cyber-cyan", chip: "border-cyan-400/25 bg-cyan-500/10", hint: "Avanzando" },
};

function ProjectCard({ p }: { p: PortfolioProject }) {
  const pct = p.total_mxn > 0 ? Math.min(100, Math.round((p.paid_mxn / p.total_mxn) * 100)) : 0;
  const h = HEALTH_UI[healthOf(p)];
  return (
    <div className="group rounded-xl border border-white/10 bg-white/5 p-4 transition hover:border-violet-400/40 hover:bg-white/[0.07]">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className={`h-2 w-2 flex-none rounded-full ${h.dot}`} title={h.label} />
          <p className="truncate text-sm font-medium text-on-surface">{p.client_name}</p>
        </div>
        <span className="chip flex-none text-[10px] text-violet-600 dark:text-violet-300">{p.status}</span>
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-2">
        <span className={`text-lg font-semibold tabular-nums ${p.debe > 0 ? "text-amber-600 dark:text-amber-300" : "text-emerald-600 dark:text-emerald-300"}`}>
          {p.debe > 0 ? mxn(p.debe) : "Pagado"}
        </span>
        <span className="text-[11px] text-muted tabular-nums">{mxn(p.paid_mxn)} / {mxn(p.total_mxn)}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-[width] duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      {p.next_milestone && (
        <p className="mt-3 flex items-center gap-1.5 text-[12px] text-muted">
          <CalendarClock size={12} className="flex-none text-violet-600 dark:text-violet-300" />
          <span className="truncate">Siguiente: <span className="text-on-surface">{p.next_milestone}</span></span>
        </p>
      )}
      <div className="mt-1 flex items-center justify-between text-[11px] text-muted">
        {p.last_activity
          ? <span className="truncate">{p.last_activity.title} · {fecha(p.last_activity.created_at)}</span>
          : <span>Sin actividad registrada</span>}
        <span className={`ml-2 flex-none font-medium ${h.text}`}>{h.label}</span>
      </div>
    </div>
  );
}

function CarteraSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="glass rounded-2xl border border-white/10 p-5">
          <Skeleton className="mb-4 h-4 w-28" />
          <div className="space-y-3">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------

export default function CockpitPage() {
  const [d, setD] = useState<Data>({});
  const [val, setVal] = useState("");
  const [cartera, setCartera] = useState<Portfolio | null>(null);
  const [carteraError, setCarteraError] = useState(false);
  const [note, setNote] = useState("");

  const load = () =>
    fetch("/api/cockpit", { cache: "no-store" }).then((r) => r.json()).then(setD).catch(() => {});
  const loadCartera = () =>
    fetch("/api/forge/portfolio", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => { if (j && Array.isArray(j.projects)) setCartera(j); else setCarteraError(true); })
      .catch(() => setCarteraError(true));
  useEffect(() => {
    load();
    loadCartera();
    const t = setInterval(load, 15000);
    const c = setInterval(loadCartera, 60000);
    return () => { clearInterval(t); clearInterval(c); };
  }, []);

  const items = d.items || [];
  const tasks = items.filter((x) => x.kind === "task");
  const notes = items.filter((x) => x.kind === "note");
  const open = tasks.filter((t) => !t.done).length;
  const svc = d.services || {};
  const pending = d.pending || [];
  const paused = svc["stitch-worker"] !== "active" || svc["n8n"] !== "active";

  const buckets = useMemo(() => {
    const b: Record<Bucket, PortfolioProject[]> = { urgentes: [], lana: [], obra: [] };
    for (const p of cartera?.projects ?? []) b[bucketOf(p)].push(p);
    b.urgentes.sort((a, z) => z.debe - a.debe);
    b.lana.sort((a, z) => z.debe - a.debe);
    b.obra.sort((a, z) => daysSince(a.updated_at) - daysSince(z.updated_at));
    return b;
  }, [cartera]);

  const vivos = (cartera?.projects ?? []).filter((p) => healthOf(p) === "vivo").length;
  const rotos = (cartera?.projects ?? []).filter((p) => healthOf(p) === "roto").length;

  const add = async (kind: string, text: string) => {
    if (!text.trim()) return;
    await fetch("/api/cockpit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "add", kind, text }) });
    load();
  };
  const toggle = async (id: number) => {
    await fetch("/api/cockpit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "toggle", id }) });
    load();
  };

  const shortcuts = [
    { href: "/app/repovision", label: "RepoVision", desc: "Grafo 3D de proyectos", icon: GitBranch },
    { href: "/app/blueprint", label: "Blueprint", desc: "Flujo de la fabrica", icon: Workflow },
    { href: "/app/projects", label: "Proyectos", desc: "Tu portfolio", icon: Boxes },
    { href: "/app/integrations", label: "Integraciones", desc: "Conectores MCP", icon: Cpu },
  ];

  return (
    <div className="min-h-full">
      <PageHeader
        eyebrow="vForge"
        title="Centro de Mando"
        description="Tu tablero diario: qué cobrar, qué urge y qué está en obra — con datos vivos de la cartera."
        actions={
          <span className={`chip ${paused ? "text-amber-600 dark:text-amber-300" : "text-emerald-600 dark:text-emerald-300"}`}>
            {paused ? "Fabrica pausada" : "Fabrica activa"}
          </span>
        }
      />

      <div className="space-y-5 p-5 md:p-8">
        {/* KPIs de cartera */}
        {!cartera && !carteraError ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[76px] w-full rounded-2xl" />)}
          </div>
        ) : cartera ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="glass rounded-2xl border border-amber-500/40 dark:border-amber-400/25 p-4">
              <p className="label-caps text-amber-600 dark:text-amber-300">Por cobrar</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-amber-600 dark:text-amber-300 md:text-2xl">{mxn(cartera.totals.debe)}</p>
            </div>
            <div className="glass rounded-2xl border border-white/10 p-4">
              <p className="label-caps text-emerald-600 dark:text-emerald-300">Pagado</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-on-surface md:text-2xl">{mxn(cartera.totals.paid)}</p>
            </div>
            <div className="glass rounded-2xl border border-white/10 p-4">
              <p className="label-caps text-cyber-cyan">Cartera total</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-on-surface md:text-2xl">{mxn(cartera.totals.total)}</p>
            </div>
            <div className="glass rounded-2xl border border-white/10 p-4">
              <p className="label-caps text-muted">Salud</p>
              <p className="mt-1 text-sm md:text-base">
                <span className="font-semibold text-emerald-600 dark:text-emerald-300">{vivos} vivos</span>
                <span className="text-muted"> · </span>
                <span className={`font-semibold ${rotos > 0 ? "text-red-600 dark:text-red-300" : "text-muted"}`}>{rotos} rotos</span>
              </p>
            </div>
          </div>
        ) : (
          <div className="glass rounded-2xl border border-red-400/25 p-4 text-sm text-red-600 dark:text-red-300">
            No se pudo cargar la cartera. <button onClick={() => { setCarteraError(false); loadCartera(); }} className="underline">Reintentar</button>
          </div>
        )}

        {/* Las 3 cubetas */}
        {!cartera && !carteraError ? (
          <CarteraSkeleton />
        ) : cartera ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {(Object.keys(BUCKET_UI) as Bucket[]).map((key) => {
              const ui = BUCKET_UI[key];
              const list = buckets[key];
              return (
                <section key={key} className={`glass rounded-2xl border p-5 ${key === "urgentes" && list.length > 0 ? "border-red-400/30" : "border-white/10"}`}>
                  <div className="mb-3 flex items-center justify-between">
                    <p className={`label-caps flex items-center gap-1.5 ${ui.accent}`}>
                      <ui.Icon size={13} /> {ui.title} · {list.length}
                    </p>
                    <span className={`chip text-[10px] ${ui.accent} ${ui.chip}`}>{ui.hint}</span>
                  </div>
                  {list.length === 0 ? (
                    <p className="py-3 text-sm text-muted">
                      {key === "urgentes" ? "Nada urgente. Respira." : key === "lana" ? "Nada cobrable por ahora." : "Sin proyectos en obra."}
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {list.map((p) => <ProjectCard key={p.project_id} p={p} />)}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        ) : null}

        {/* Operacion diaria */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="glass rounded-2xl border border-white/10 p-5 md:col-span-2">
            <p className="label-caps mb-3 text-cyber-cyan">Pendientes · {open} abiertos</p>
            <div className="space-y-1">
              {tasks.length === 0 && <p className="py-2 text-sm text-muted">Sin pendientes</p>}
              {tasks.map((t) => (
                <button key={t.id} onClick={() => toggle(t.id)} className="flex w-full items-start gap-3 rounded-lg px-2 py-2 text-left text-sm transition hover:bg-white/5">
                  <span className={`mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-md border-2 transition ${t.done ? "border-emerald-400 bg-emerald-400 text-black" : "border-white/20"}`}>
                    {t.done && <CircleCheck size={12} />}
                  </span>
                  <span className={t.done ? "text-muted line-through" : "text-on-surface"}>{t.text}</span>
                </button>
              ))}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); add("task", val); setVal(""); }} className="mt-3 flex gap-2">
              <input value={val} onChange={(e) => setVal(e.target.value)} placeholder="Agregar pendiente..." className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-on-surface outline-none transition focus:border-violet-400" />
              <button type="submit" className="flex w-11 items-center justify-center rounded-xl bg-violet-500 text-white transition active:scale-95"><Plus size={18} /></button>
            </form>
          </div>

          <div className="space-y-4">
            <div className="glass rounded-2xl border border-white/10 p-5">
              <p className="label-caps mb-3 text-cyber-cyan">Servicios en vivo</p>
              <div className="space-y-1">
                {Object.keys(svc).length === 0 && (
                  <div className="space-y-2 py-1">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                )}
                {Object.entries(svc).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-2.5 border-t border-white/5 py-2 text-sm first:border-0">
                    <span className={`h-2 w-2 flex-none rounded-full ${v === "active" ? "bg-emerald-400" : "bg-amber-400"}`} />
                    <span className="text-on-surface">{NICE[k] || k}</span>
                    <span className={`ml-auto text-[11px] font-medium ${v === "active" ? "text-emerald-600 dark:text-emerald-300" : "text-amber-600 dark:text-amber-300"}`}>{v === "active" ? "VIVO" : "PAUSA"}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass rounded-2xl border border-white/10 p-5">
              <p className="label-caps mb-3 text-cyber-cyan">Aprobaciones · {pending.length}</p>
              {pending.length === 0 && <p className="py-2 text-sm text-muted">Sin demos pendientes</p>}
              {pending.map((p: any, i: number) => (
                <div key={i} className="border-t border-white/5 py-2 text-sm text-on-surface first:border-0">{p.title || p.idea || "lead"}</div>
              ))}
            </div>
          </div>
        </div>

        <div className="glass rounded-2xl border border-white/10 p-5">
          <p className="label-caps mb-3 text-cyber-cyan">Notas</p>
          <div className="space-y-2">
            {notes.map((n) => (
              <div key={n.id} className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-on-surface">{n.text}</div>
            ))}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); add("note", note); setNote(""); }} className="mt-3 flex gap-2">
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Escribe una nota..." className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-on-surface outline-none transition focus:border-violet-400" />
            <button type="submit" className="flex w-11 items-center justify-center rounded-xl bg-violet-500 text-white transition active:scale-95"><Plus size={18} /></button>
          </form>
        </div>

        <div>
          <p className="label-caps mb-3 text-muted">Atajos</p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {shortcuts.map((sc) => (
              <Link key={sc.href} href={sc.href} className="group glass flex flex-col gap-2 rounded-2xl border border-white/10 p-4 transition hover:border-violet-400/40">
                <div className="flex items-center justify-between">
                  <sc.icon size={20} className="text-violet-600 dark:text-violet-300" />
                  <ArrowUpRight size={16} className="text-muted transition group-hover:text-violet-600 dark:text-violet-300" />
                </div>
                <div>
                  <p className="text-sm font-medium text-on-surface">{sc.label}</p>
                  <p className="text-[12px] text-muted">{sc.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
