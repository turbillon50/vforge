"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader } from "@/components/workspace/PageHeader";
import { EsferasNucleo } from "@/components/cockpit/EsferasNucleo";
import { Constelacion } from "@/components/cockpit/Constelacion";
import { UtilizacionPanel } from "@/components/cockpit/UtilizacionPanel";
import { IconActivity, IconCpu, IconShield, IconBoxes, IconMaximize } from "@/components/brand/VFIcons";
import { TokenRiskBanner } from "@/components/workspace/TokenHealth";
import { AGENT_LOGOS, LogoGrok } from "@/components/brand/AgentLogos";
import type {
  ActiveJob,
  EsferasPayload,
  FeedItem,
  GrokVerdict,
} from "@/components/cockpit/esferas-types";

/* Ley visual: morado SOLO como acento. Un agente trabajando se marca en morado;
   en reposo, gris. Los colores de estado (verde/ámbar/rojo) son señal, no
   decoración, y van en tono oscuro para leerse sobre blanco. */
const VIOLET = "#7c3aed";
const VIOLET_INK = "#5b21b6";
const GRAY_INK = "#55585d";

/** Color por veredicto Grok — contraste sobre blanco. */
const VERDICT_HUE: Record<GrokVerdict, string> = {
  APROBADO: "#15803d",
  RECHAZADO: "#b91c1c",
  REVISION: "#b45309",
};

const POLL_MS = 4000;

function truncate(s: string | null, n = 56): string {
  if (!s) return "";
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

/** Timestamp relativo ("ahora", "3 min", "1 h"). */
function rel(iso: string | null, now: number): string {
  if (!iso) return "";
  const ms = now - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "ahora";
  const m = Math.floor(ms / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h`;
  return `${Math.floor(h / 24)} d`;
}

const STATUS_HUE: Record<string, string> = {
  running: "#15803d",
  active: "#15803d",
  in_progress: "#15803d",
  pending: "#b45309",
  queued: "#b45309",
  done: VIOLET_INK,
  failed: "#b91c1c",
  error: "#b91c1c",
};

/** Un número grande que se desliza cada vez que cambia su valor. */
function LiveMetric({ value, label, accent }: { value: number; label: string; accent: string }) {
  return (
    <div className="vf-card overflow-hidden p-4">
      <p className="text-[12px] font-medium text-[var(--fg-muted)]">{label}</p>
      <div className="relative mt-1 h-9 overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={value}
            initial={{ y: 14, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -14, opacity: 0 }}
            transition={{ duration: 0.32, ease: "easeOut" }}
            className="absolute font-display text-3xl font-bold tabular-nums"
            style={{ color: accent }}
          >
            {value}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function TallerPage() {
  const [data, setData] = useState<EsferasPayload | null>(null);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());
  // Vista del núcleo: "constelacion" (zoom out, supervisar TODO) vs "detalle"
  // (un diagrama orbital). Por defecto arrancamos en constelación.
  const [view, setView] = useState<"constelacion" | "detalle">("constelacion");
  // Zoom-in: job al que entramos desde un mini de la constelación.
  const [focusJob, setFocusJob] = useState<ActiveJob | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/cockpit/esferas", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((j: EsferasPayload) => {
          if (alive) {
            setData(j);
            setError(false);
            setNow(Date.now());
          }
        })
        .catch(() => alive && setError(true));
    const everyMs =
      typeof window !== "undefined" && window.matchMedia && window.matchMedia("(max-width: 640px)").matches
        ? 9000
        : POLL_MS;
    const hidden = () => typeof document !== "undefined" && document.hidden;
    const safeLoad = () => {
      if (hidden()) return;
      load();
    };
    safeLoad();
    const t = setInterval(safeLoad, everyMs);
    const tick = setInterval(() => alive && !hidden() && setNow(Date.now()), 1000);
    const onVis = () => {
      if (!hidden()) safeLoad();
    };
    if (typeof document !== "undefined") document.addEventListener("visibilitychange", onVis);
    return () => {
      alive = false;
      clearInterval(t);
      clearInterval(tick);
      if (typeof document !== "undefined") document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const esferas = data?.esferas ?? [];
  const projects = data?.projects ?? [];
  const health = data?.health;

  // Jobs corriendo filtrados por proyecto.
  const jobs: ActiveJob[] = useMemo(
    () => (data?.jobs ?? []).filter((j) => !selected || j.projectKey === selected),
    [data, selected],
  );
  const pendingCount = esferas.filter(
    (e) => e.status === "pending" && (!selected || e.projectKey === selected),
  ).length;
  const proyectosActivos = projects.length;

  // Feed filtrado por proyecto.
  const feed: FeedItem[] = useMemo(
    () => (data?.feed ?? []).filter((f) => !selected || f.projectKey === selected),
    [data, selected],
  );

  // Reposo: últimos N jobs CERRADOS de las últimas 24h (restRecent del backend)
  // como minis apagados con su sello Grok. Filtrados por proyecto si hay uno
  // seleccionado. Alimenta la lista cuando no hay trabajo vivo.
  const restJobs: FeedItem[] = useMemo(
    () => (data?.restRecent ?? []).filter((f) => !selected || f.projectKey === selected),
    [data, selected],
  );

  const live = data?.source === "live";
  const idle = data && data.source === "empty";

  return (
    <div className="min-h-full">
      <PageHeader
        eyebrow="Operación en vivo"
        title="Taller"
        description="Quién trabaja en qué, ahora mismo. Los agentes Vulcano reportando desde Hetzner en tiempo real."
        actions={
          <div className="flex items-center gap-2">
            {/* Healthcheck de los procesos del daemon en el server */}
            {health && (
              <span
                className={`chip flex items-center gap-1 ${
                  health.healthy
                    ? "text-emerald-600 dark:text-emerald-300"
                    : health.relayUp
                      ? "text-amber-600 dark:text-amber-300"
                      : "text-rose-600 dark:text-rose-300"
                }`}
                title={
                  health.daemons
                    ? `claude_loop.py: ${health.daemons.claude_loop.alive ? "vivo" : "caído"} · vulcano_daemon.py: ${health.daemons.vulcano_daemon.alive ? "vivo" : "caído"}`
                    : "Sin lectura del relay"
                }
              >
                <IconCpu size={12} />
                {health.healthy ? "Daemon vivo" : health.relayUp ? "Daemon parcial" : "Relay sin señal"}
              </span>
            )}
            <span
              className={`chip ${
                error
                  ? "text-amber-600 dark:text-amber-300"
                  : live
                    ? "text-emerald-600 dark:text-emerald-300"
                    : "text-[var(--fg-muted)]"
              }`}
            >
              {error ? "Sin señal" : live ? "En vivo" : "En reposo"}
            </span>
          </div>
        }
      />

      <TokenRiskBanner />

      {/* pb amplio en móvil: la última fila del feed debe poder desplazarse por
          encima del botón flotante de V y del nav inferior. */}
      <div className="space-y-5 p-4 pb-28 sm:space-y-6 sm:p-5 sm:pb-28 md:p-8">
        {/* Resumen de la operación — texto en claro, sin imagen de fondo */}
        <div className="vf-card p-5 md:p-6">
          <p className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--fg-muted)]">
            <IconActivity size={13} /> Trabajo en curso
          </p>
          <h2 className="mt-1 font-display text-lg font-bold text-[var(--fg-primary)] md:text-xl">
            {jobs.length > 0
              ? `${jobs.length} ${jobs.length === 1 ? "agente trabajando" : "agentes trabajando"} ahora`
              : "Ningún agente trabajando ahora"}
          </h2>
          <p className="mt-1 text-[13px] text-[var(--fg-secondary)]">
            {jobs.length > 0
              ? "Cada tarjeta es una tarea real corriendo en el servidor."
              : "Cuando se despache trabajo, aparecerá aquí."}
          </p>
        </div>

        {/* Selector de proyecto — ESFERA = PROYECTO */}
        {projects.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] font-medium text-[var(--fg-muted)]">Proyecto</span>
            <button
              onClick={() => setSelected(null)}
              data-on={selected === null}
              aria-pressed={selected === null}
              className="chip min-h-[44px] px-3.5 transition active:scale-95"
            >
              Todos
            </button>
            {projects.map((p) => (
              <button
                key={p.key}
                onClick={() => setSelected(p.key === selected ? null : p.key)}
                data-on={selected === p.key}
                aria-pressed={selected === p.key}
                className="chip min-h-[44px] px-3.5 transition active:scale-95"
                title={`${p.active} tarea(s) activa(s)`}
              >
                {p.label}
                <span className="text-[var(--fg-muted)]">· {p.active}</span>
              </button>
            ))}
          </div>
        )}

        {/* Métricas vivas */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <LiveMetric value={jobs.length} label="Agentes trabajando" accent="#15803d" />
          <LiveMetric value={proyectosActivos} label="Proyectos activos" accent="#090909" />
          <LiveMetric value={data?.queue?.running ?? 0} label="Tareas corriendo" accent="#34363a" />
          <LiveMetric value={pendingCount} label="En cola" accent="#34363a" />
        </div>

        {/* Vista del trabajo: Todas las tareas (lista) vs Una tarea (detalle) */}
        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex rounded-xl border border-[var(--border-1)] bg-white p-1">
            {([
              { id: "detalle", label: "Una tarea", Icon: IconMaximize },
              { id: "constelacion", label: "Todas", Icon: IconBoxes },
            ] as const).map(({ id, label, Icon }) => {
              const on = view === id;
              return (
                <button
                  key={id}
                  onClick={() => {
                    setView(id);
                    if (id === "constelacion") setFocusJob(null);
                  }}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-3 text-[12px] font-medium transition active:scale-95"
                  style={{
                    background: on ? VIOLET : "transparent",
                    color: on ? "#ffffff" : "var(--fg-secondary)",
                  }}
                  aria-pressed={on}
                >
                  <Icon size={14} /> {label}
                </button>
              );
            })}
          </div>
          {view === "detalle" && focusJob && (
            <button
              onClick={() => {
                setFocusJob(null);
                setView("constelacion");
              }}
              className="chip inline-flex min-h-[40px] px-3 text-[var(--fg-primary)] transition active:scale-95"
            >
              <IconBoxes size={13} /> Ver todas
            </button>
          )}
        </div>

        {/* Pieza central: constelación (zoom out) o diagrama de detalle */}
        <div className="min-h-[300px] sm:min-h-[420px]">
          <AnimatePresence mode="wait" initial={false}>
            {view === "constelacion" ? (
              <motion.div
                key="constelacion"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.03 }}
                transition={{ duration: 0.32, ease: "easeOut" }}
              >
                <Constelacion
                  jobs={jobs}
                  esferas={esferas}
                  restJobs={restJobs}
                  lastJobAt={data?.lastJobAt ?? null}
                  now={now}
                  error={error}
                  daemonPaused={health?.daemonAlive === false}
                  onZoom={(job) => {
                    setFocusJob(job);
                    setSelected(job.projectKey ?? null);
                    setView("detalle");
                  }}
                />
              </motion.div>
            ) : (
              <motion.div
                key="detalle"
                initial={{ opacity: 0, scale: 1.03 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.32, ease: "easeOut" }}
              >
                <EsferasNucleo
                  data={data}
                  selectedProject={selected}
                  focusJobId={focusJob?.id ?? null}
                  error={error}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Panel de utilización: ocupación real por agente (24h) + trabajo útil */}
        <UtilizacionPanel />

        {/* Tablero: quién trabaja en qué */}
        <section className="vf-card overflow-hidden p-5">
          <p className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--fg-muted)]">
            <IconActivity size={13} /> Quién trabaja en qué
          </p>

          <div className="mt-3 space-y-2">
            <AnimatePresence mode="popLayout" initial={false}>
              {jobs.length === 0 ? (
                <motion.p
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="py-4 text-center text-[13px] text-[var(--fg-secondary)]"
                >
                  {error
                    ? "No se pudo leer el estado de los agentes."
                    : selected
                      ? "Ningún agente trabaja en este proyecto ahora mismo."
                      : idle
                        ? "Sin trabajo en curso — ningún agente está construyendo ahora mismo."
                        : "Ningún agente está construyendo ahora mismo."}
                </motion.p>
              ) : (
                jobs.map((j, i) => {
                  const Logo = j.agent ? AGENT_LOGOS[j.agent] : LogoGrok;
                  return (
                    <motion.div
                      key={j.id}
                      layout
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 12 }}
                      transition={{ duration: 0.3, delay: i * 0.07, ease: "easeOut" }}
                      className="flex items-center gap-3 rounded-xl border border-[var(--border-1)] bg-white p-3"
                    >
                      <div className="grid h-10 w-10 flex-none place-items-center rounded-xl border border-[var(--border-1)] bg-[var(--surface-1)]">
                        <Logo size={18} style={{ color: VIOLET_INK }} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-semibold text-[var(--fg-primary)]">{j.agentName}</span>
                          {j.project && (
                            <span
                              className="truncate rounded-full border px-2 py-0.5 text-[12px] font-medium"
                              style={{
                                borderColor: VIOLET,
                                color: VIOLET_INK,
                                background: "var(--vf-violet-soft)",
                              }}
                            >
                              {j.project}
                            </span>
                          )}
                          {typeof j.progress === "number" && (
                            <span className="text-[12px] text-[var(--fg-muted)]">{j.progress}%</span>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-[12px] text-[var(--fg-secondary)]">
                          {truncate(j.task) || "Tarea en curso"}
                        </p>
                      </div>

                      <span className="flex-none text-[12px] text-[var(--fg-muted)]">{rel(j.since, now)}</span>
                      <span
                        className="h-2 w-2 flex-none rounded-full"
                        style={{ background: "#15803d" }}
                        title="Trabajando"
                      />
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* Último veredicto del auditor Grok */}
        {data?.lastVerdict && (
          <section className="vf-card overflow-hidden p-5">
            <p className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--fg-muted)]">
              <LogoGrok size={13} /> Auditor Grok
            </p>
            <div className="mt-3 flex items-center gap-3">
              <span
                className="flex flex-none items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold"
                style={{
                  color: VERDICT_HUE[data.lastVerdict.verdict],
                  background: `${VERDICT_HUE[data.lastVerdict.verdict]}1a`,
                  border: `1px solid ${VERDICT_HUE[data.lastVerdict.verdict]}40`,
                }}
              >
                <IconShield size={12} /> {data.lastVerdict.verdict}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-medium text-[var(--fg-primary)]">
                    Tarea #{data.lastVerdict.id}
                  </span>
                  {data.lastVerdict.project && (
                    <span className="truncate text-[12px] text-[var(--fg-muted)]">
                      {data.lastVerdict.project}
                    </span>
                  )}
                </div>
                {data.lastVerdict.notes && (
                  <p className="mt-0.5 line-clamp-2 text-[12px] text-[var(--fg-secondary)]">
                    {truncate(data.lastVerdict.notes, 180)}
                  </p>
                )}
              </div>
              <span className="flex-none text-[12px] text-[var(--fg-muted)]">{rel(data.lastVerdict.ts, now)}</span>
            </div>
          </section>
        )}

        {/* Feed de actividad reciente con timestamps relativos */}
        {feed.length > 0 && (
          <section className="vf-card overflow-hidden p-5">
            <p className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--fg-muted)]">
              <IconActivity size={13} /> Actividad reciente
            </p>
            <div className="mt-3 space-y-1.5">
              {feed.map((f) => {
                const hue = STATUS_HUE[f.status] ?? GRAY_INK;
                return (
                  <div
                    key={f.id}
                    className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-[12px]"
                  >
                    <span
                      className="h-1.5 w-1.5 flex-none rounded-full"
                      style={{ background: hue }}
                    />
                    <span className="flex-none font-medium text-[var(--fg-primary)]">{f.agentName}</span>
                    {f.project && (
                      <span className="hidden max-w-[90px] flex-none truncate text-[12px] text-[var(--fg-muted)] sm:inline">
                        {f.project}
                      </span>
                    )}
                    <span className="min-w-0 flex-1 truncate text-[var(--fg-secondary)]">{truncate(f.task, 64)}</span>
                    {f.grokVerdict && (
                      <span
                        className="hidden flex-none items-center gap-1 rounded-full px-1.5 py-0.5 text-[12px] font-semibold sm:inline-flex"
                        style={{
                          color: VERDICT_HUE[f.grokVerdict],
                          background: `${VERDICT_HUE[f.grokVerdict]}1a`,
                          border: `1px solid ${VERDICT_HUE[f.grokVerdict]}40`,
                        }}
                        title={f.grokNotes ?? f.grokVerdict}
                      >
                        <LogoGrok size={9} /> {f.grokVerdict}
                      </span>
                    )}
                    <span
                      className="flex-none rounded-full px-1.5 py-0.5 text-[12px] font-medium"
                      style={{ color: hue, background: `${hue}14`, border: `1px solid ${hue}33` }}
                    >
                      {f.status}
                    </span>
                    <span className="flex-none text-[12px] text-[var(--fg-muted)]">{rel(f.ts, now)}</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
