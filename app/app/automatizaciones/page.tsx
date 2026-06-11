"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader } from "@/components/workspace/PageHeader";
import { ObsidianLoader } from "@/components/ui/ObsidianLoader";
import {
  IconCpu,
  IconClock,
  IconCheck,
  IconActivity,
  IconBrain,
  IconCode,
  IconRocket,
} from "@/components/brand/VFIcons";
import type { EsferaId, EsferaState, EsferasPayload } from "@/components/cockpit/esferas-types";

type IconComp = (p: { size?: number; className?: string; style?: React.CSSProperties }) => ReactNode;

interface Automation {
  id?: string;
  name: string;
  type?: "daemon" | "cron" | string;
  status?: string;
  detail?: string;
}

interface AutomationsData {
  automations?: Automation[];
}

const ESFERA_ICON: Record<EsferaId, IconComp> = {
  claude: IconBrain,
  codex: IconCode,
  grok: IconActivity,
  shell: IconCpu,
  browser: IconRocket,
};

/** Tiempo relativo compacto en español a partir de un ISO/timestamp. */
function timeAgo(iso: string | null): string | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  const secs = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (secs < 60) return "hace unos segundos";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs} h`;
  const days = Math.floor(hrs / 24);
  return `hace ${days} d`;
}

/* ------------------------------------------------------------------ */
/* Sección 1 — Esferas                                                 */
/* ------------------------------------------------------------------ */

function WorkingDot() {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <motion.span
        className="absolute inline-flex h-full w-full rounded-full"
        style={{ background: "rgba(16,185,129,0.55)" }}
        animate={{ scale: [1, 2.4, 1], opacity: [0.6, 0, 0.6] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
      />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
    </span>
  );
}

function EsferaCard({ e, i }: { e: EsferaState; i: number }) {
  const Icon = ESFERA_ICON[e.id] ?? IconCpu;
  const working = e.status === "working";
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.06, type: "spring", stiffness: 220, damping: 26 }}
      className={
        "relative overflow-hidden rounded-2xl border p-4 backdrop-blur-md transition-colors " +
        (working
          ? "border-emerald-500/25 bg-emerald-500/[0.04]"
          : "border-white/[0.06] bg-white/[0.02]")
      }
    >
      {working && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent, rgba(16,185,129,0.7), transparent)" }}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      <div className="flex items-start justify-between gap-3">
        <span
          className={
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border " +
            (working ? "border-emerald-500/30 text-emerald-300" : "border-white/[0.06] text-violet-400")
          }
          style={{ background: "var(--color-surface)" }}
        >
          <Icon size={20} />
        </span>
        <span
          className={
            "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider " +
            (working ? "bg-emerald-500/10 text-emerald-300" : "bg-white/[0.04] text-white/40")
          }
        >
          {working ? <WorkingDot /> : null}
          {working ? "trabajando" : "en espera"}
        </span>
      </div>

      <h3 className="mt-3 truncate font-display text-[15px] font-semibold text-white/90">{e.name}</h3>
      <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.15em] text-white/30">{e.role}</p>

      {e.project && (
        <p className="mt-3 truncate text-[12px] text-cyan-400/80">
          <span className="text-white/30">proyecto · </span>
          {e.project}
        </p>
      )}
      {e.task && <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-white/55">{e.task}</p>}
      {working && e.since && (
        <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-white/25">{timeAgo(e.since)}</p>
      )}
    </motion.article>
  );
}

/* ------------------------------------------------------------------ */
/* Sección 2 — Procesos pm2                                            */
/* ------------------------------------------------------------------ */

function ProcessCard({ a, i }: { a: Automation; i: number }) {
  const isCron = a.type === "cron";
  const Icon: IconComp = isCron ? IconClock : IconCpu;
  const active = (a.status ?? "").toLowerCase() === "active" || (a.status ?? "").toLowerCase() === "online";
  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.05 }}
      className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 backdrop-blur-md transition-colors hover:border-violet-500/30 hover:bg-white/[0.04]"
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] text-violet-400"
          style={{ background: "var(--color-surface)" }}
        >
          <Icon size={20} />
        </span>
        <span
          className={
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider " +
            (active ? "bg-emerald-500/10 text-emerald-400" : "bg-white/[0.04] text-white/40")
          }
        >
          {active && <IconCheck size={11} />}
          {a.status ?? "idle"}
        </span>
      </div>
      <h3 className="mt-3 truncate font-display text-[15px] font-semibold text-white/90">{a.name}</h3>
      <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.15em] text-white/30">
        {isCron ? "cron" : "daemon"}
      </p>
      {a.detail && <p className="mt-2 text-[13px] leading-relaxed text-white/45">{a.detail}</p>}
    </motion.article>
  );
}

/* ------------------------------------------------------------------ */
/* Página                                                              */
/* ------------------------------------------------------------------ */

export default function AutomatizacionesPage() {
  const [esferas, setEsferas] = useState<EsferasPayload | null>(null);
  const [procs, setProcs] = useState<AutomationsData | null>(null);

  // Esferas — refresco rápido (10s)
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/cockpit/esferas", { cache: "no-store" });
        const json = (await res.json()) as EsferasPayload;
        if (alive) setEsferas(json);
      } catch {
        if (alive) setEsferas((prev) => prev ?? null);
      }
    };
    load();
    const id = setInterval(load, 10_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  // Procesos pm2 — refresco moderado (30s)
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/automatizaciones", { cache: "no-store" });
        const json = (await res.json()) as AutomationsData;
        if (alive) setProcs(json);
      } catch {
        if (alive) setProcs((prev) => prev ?? { automations: [] });
      }
    };
    load();
    const id = setInterval(load, 30_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const list = useMemo(() => esferas?.esferas ?? [], [esferas]);
  const working = useMemo(() => list.filter((e) => e.status === "working"), [list]);
  const idle = useMemo(() => list.filter((e) => e.status !== "working"), [list]);
  const ordered = useMemo(() => [...working, ...idle], [working, idle]);
  const automations = procs?.automations ?? [];

  // Actividad reciente: tareas reales con timestamp, más nuevas primero.
  const activity = useMemo(
    () =>
      list
        .filter((e) => e.task && e.since)
        .sort((a, b) => new Date(b.since!).getTime() - new Date(a.since!).getTime()),
    [list],
  );

  const initialLoading = esferas === null && procs === null;

  return (
    <div className="min-h-full">
      <PageHeader title="Automatizaciones" eyebrow="El ecosistema trabajando solo" />

      <div className="px-5 py-6 md:px-8">
        {/* Header visual con asset del taller */}
        <div
          className="reveal-up relative mb-8 h-[200px] overflow-hidden rounded-2xl border border-white/[0.06]"
          style={{ backgroundImage: "url(/taller/automatizacion.png)", backgroundSize: "cover", backgroundPosition: "center" }}
        >
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.15) 0%, var(--color-void) 100%)" }}
          />
          <div className="relative flex h-full flex-col justify-end p-5 md:p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-violet-400/80">
              Esferas &amp; daemons en vivo
            </p>
            <h2 className="mt-1 flex items-center gap-3 font-display text-lg font-bold text-white/90 md:text-xl">
              {working.length > 0 && <WorkingDot />}
              <span>
                {working.length} {working.length === 1 ? "esfera trabajando" : "esferas trabajando"}
                <span className="text-white/40"> · {automations.length} {automations.length === 1 ? "proceso" : "procesos"}</span>
              </span>
            </h2>
          </div>
        </div>

        {initialLoading ? (
          <div className="flex min-h-[240px] items-center justify-center">
            <ObsidianLoader label="Cargando automatizaciones" />
          </div>
        ) : (
          <div className="space-y-10">
            {/* ── Sección 1 — Esferas ─────────────────────────────── */}
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display text-base font-semibold text-white/85">Esferas trabajando ahora</h3>
                <span className="font-mono text-[10px] uppercase tracking-wider text-white/30">
                  {esferas?.source === "mock" ? "demo" : "en vivo"} · refresco 10s
                </span>
              </div>
              {list.length === 0 ? (
                <div className="flex min-h-[120px] items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.02] text-[13px] text-white/40">
                  Sin esferas reportando.
                </div>
              ) : (
                <motion.div layout className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <AnimatePresence mode="popLayout">
                    {ordered.map((e, i) => (
                      <EsferaCard key={e.id} e={e} i={i} />
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}
            </section>

            {/* ── Sección 2 — Procesos del ecosistema ─────────────── */}
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display text-base font-semibold text-white/85">Procesos del ecosistema</h3>
                <span className="font-mono text-[10px] uppercase tracking-wider text-white/30">
                  pm2 · Hetzner · refresco 30s
                </span>
              </div>
              {automations.length === 0 ? (
                <div className="flex min-h-[120px] items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.02] text-[13px] text-white/40">
                  No hay procesos activos.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {automations.map((a, i) => (
                    <ProcessCard key={a.id ?? a.name ?? i} a={a} i={i} />
                  ))}
                </div>
              )}
            </section>

            {/* ── Sección 3 — Actividad reciente ──────────────────── */}
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display text-base font-semibold text-white/85">Actividad reciente</h3>
                <span className="font-mono text-[10px] uppercase tracking-wider text-white/30">
                  {activity.length} {activity.length === 1 ? "tarea" : "tareas"}
                </span>
              </div>
              {activity.length === 0 ? (
                <div className="flex min-h-[100px] items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.02] text-[13px] text-white/40">
                  Aún no hay actividad registrada.
                </div>
              ) : (
                <ol className="relative ml-2 border-l border-white/[0.08]">
                  {activity.map((e, i) => {
                    const Icon = ESFERA_ICON[e.id] ?? IconActivity;
                    return (
                      <motion.li
                        key={`${e.id}-${e.since}`}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.08, type: "spring", stiffness: 240, damping: 28 }}
                        className="relative mb-5 pl-6 last:mb-0"
                      >
                        <span
                          className="absolute -left-[9px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-violet-500/40 text-violet-300"
                          style={{ background: "var(--color-surface)" }}
                        >
                          <Icon size={10} />
                        </span>
                        <div className="flex flex-wrap items-baseline gap-x-2">
                          <span className="font-display text-[13px] font-semibold text-white/85">{e.name}</span>
                          {e.project && <span className="text-[12px] text-cyan-400/80">{e.project}</span>}
                          <span className="font-mono text-[10px] uppercase tracking-wider text-white/25">
                            {timeAgo(e.since)}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[13px] leading-relaxed text-white/55">{e.task}</p>
                      </motion.li>
                    );
                  })}
                </ol>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
