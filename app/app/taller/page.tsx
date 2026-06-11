"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader } from "@/components/workspace/PageHeader";
import { EsferasNucleo } from "@/components/cockpit/EsferasNucleo";
import {
  IconActivity,
  IconBrain,
  IconCode,
  IconCpu,
  IconGlobe,
} from "@/components/brand/VFIcons";
import type { EsferasPayload, EsferaState, FeedItem } from "@/components/cockpit/esferas-types";

const HUE: Record<string, string> = {
  claude: "#a78bfa",
  codex: "#22d3ee",
  grok: "#f472b6",
  shell: "#34d399",
  browser: "#38bdf8",
};

const ICONS: Record<string, typeof IconBrain> = {
  claude: IconBrain,
  codex: IconCode,
  grok: IconCpu,
  shell: IconActivity,
  browser: IconGlobe,
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
  running: "#34d399",
  active: "#34d399",
  in_progress: "#34d399",
  pending: "#fbbf24",
  queued: "#fbbf24",
  done: "#22d3ee",
  failed: "#f87171",
  error: "#f87171",
};

/** Un número grande que late suavemente cada vez que cambia su valor. */
function LiveMetric({ value, label, accent }: { value: number; label: string; accent: string }) {
  return (
    <div className="glass relative overflow-hidden rounded-2xl border border-white/10 p-4">
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-50 blur-2xl"
        style={{ background: accent }}
      />
      <p className="label-caps text-[10px] text-muted">{label}</p>
      <div className="relative mt-1 h-9 overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={value}
            initial={{ y: 14, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -14, opacity: 0 }}
            transition={{ duration: 0.32, ease: "easeOut" }}
            className="absolute font-display text-3xl font-bold"
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
    load();
    const t = setInterval(load, POLL_MS);
    const tick = setInterval(() => alive && setNow(Date.now()), 1000);
    return () => {
      alive = false;
      clearInterval(t);
      clearInterval(tick);
    };
  }, []);

  const esferas: EsferaState[] = data?.esferas ?? [];
  const projects = data?.projects ?? [];
  const health = data?.health;

  // Esferas trabajando filtradas por el proyecto seleccionado.
  const working = useMemo(
    () =>
      esferas.filter(
        (e) => e.status === "working" && (!selected || e.projectKey === selected),
      ),
    [esferas, selected],
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

  const live = data?.source === "live";
  const idle = data && data.source === "empty";

  return (
    <div className="min-h-full">
      <PageHeader
        eyebrow="Operación en vivo"
        title="Taller"
        description="Quién trabaja en qué, ahora mismo. Las esferas Vulcano reportando desde Hetzner en tiempo real."
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
                    : "text-cyan-600 dark:text-cyan-300"
              }`}
            >
              {error ? "Sin señal" : live ? "En vivo" : "En reposo"}
            </span>
          </div>
        }
      />

      <div className="space-y-5 p-4 pb-10 sm:space-y-6 sm:p-5 md:p-8">
        {/* Hero con asset Higgsfield + overlay obsidian */}
        <div className="relative h-[140px] overflow-hidden rounded-2xl border border-white/10 sm:h-[180px]">
          <img
            src="/taller/taller-hero.png"
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, var(--color-void) 8%, color-mix(in oklab, var(--color-void) 55%, transparent) 60%, color-mix(in oklab, var(--color-void) 85%, transparent) 100%)",
            }}
          />
          <div className="relative flex h-full flex-col justify-end p-5 md:p-6">
            <p className="label-caps flex items-center gap-1.5 text-cyber-cyan">
              <IconActivity size={13} /> Cabina del operador
            </p>
            <h2 className="mt-1 font-display text-lg font-bold text-white/90 md:text-xl">
              {working.length > 0
                ? `${working.length} ${working.length === 1 ? "esfera construyendo" : "esferas construyendo"} ahora`
                : "Esferas en reposo"}
            </h2>
          </div>
        </div>

        {/* Selector de proyecto — ESFERA = PROYECTO */}
        {projects.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="label-caps text-[10px] text-muted">Proyecto</span>
            <button
              onClick={() => setSelected(null)}
              className="chip min-h-[44px] px-3.5 text-[11px] transition active:scale-95"
              style={{
                borderColor: selected === null ? "#22d3ee66" : undefined,
                color: selected === null ? "#22d3ee" : undefined,
                background: selected === null ? "#22d3ce14" : undefined,
              }}
            >
              Todos
            </button>
            {projects.map((p) => (
              <button
                key={p.key}
                onClick={() => setSelected(p.key === selected ? null : p.key)}
                className="chip min-h-[44px] px-3.5 text-[11px] transition active:scale-95"
                style={{
                  borderColor: selected === p.key ? "#a78bfa66" : undefined,
                  color: selected === p.key ? "#a78bfa" : undefined,
                  background: selected === p.key ? "#a78bfa14" : undefined,
                }}
                title={`${p.active} esfera(s) activa(s)`}
              >
                {p.label}
                <span className="ml-1 text-muted">· {p.active}</span>
              </button>
            ))}
          </div>
        )}

        {/* Métricas vivas */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <LiveMetric value={working.length} label="Esferas activas" accent="#34d399" />
          <LiveMetric value={proyectosActivos} label="Proyectos activos" accent="#a78bfa" />
          <LiveMetric value={data?.queue?.running ?? 0} label="Jobs corriendo" accent="#22d3ee" />
          <LiveMetric value={pendingCount} label="En cola" accent="#fbbf24" />
        </div>

        {/* Pieza central: animación orbital de las esferas en tiempo real */}
        <div className="min-h-[300px] sm:min-h-[420px]">
          <EsferasNucleo data={data} selectedProject={selected} error={error} />
        </div>

        {/* Tablero: quién trabaja en qué */}
        <section className="glass relative overflow-hidden rounded-2xl border border-white/10 p-5">
          <p className="label-caps flex items-center gap-1.5 text-cyber-cyan">
            <IconActivity size={13} /> Quién trabaja en qué
          </p>

          <div className="mt-3 space-y-2">
            <AnimatePresence mode="popLayout" initial={false}>
              {working.length === 0 ? (
                <motion.p
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="py-4 text-center text-[13px] text-muted"
                >
                  {error
                    ? "No se pudo leer el estado de las esferas."
                    : selected
                      ? "Ninguna esfera trabaja en este proyecto ahora mismo."
                      : idle
                        ? "Esferas en reposo — ninguna está construyendo ahora mismo."
                        : "Ninguna esfera está construyendo ahora mismo."}
                </motion.p>
              ) : (
                working.map((e, i) => {
                  const hue = HUE[e.id] ?? "#22d3ee";
                  const Icon = ICONS[e.id] ?? IconCpu;
                  return (
                    <motion.div
                      key={e.id}
                      layout
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 12 }}
                      transition={{ duration: 0.3, delay: i * 0.07, ease: "easeOut" }}
                      className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"
                    >
                      <motion.div
                        animate={{
                          boxShadow: [`0 0 0px ${hue}00`, `0 0 16px ${hue}aa`, `0 0 0px ${hue}00`],
                        }}
                        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                        className="grid h-10 w-10 flex-none place-items-center rounded-xl border"
                        style={{
                          borderColor: `${hue}55`,
                          background: `radial-gradient(circle at 50% 35%, ${hue}33, rgba(10,10,15,0.85))`,
                        }}
                      >
                        <Icon size={18} style={{ color: hue }} />
                      </motion.div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-semibold text-on-surface">{e.name}</span>
                          {e.project && (
                            <span
                              className="truncate rounded-full border px-2 py-0.5 text-[10px] font-medium"
                              style={{ borderColor: `${hue}40`, color: hue, background: `${hue}14` }}
                            >
                              {e.project}
                            </span>
                          )}
                          {typeof e.progress === "number" && (
                            <span className="text-[10px] text-muted">{e.progress}%</span>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-[12px] text-muted">
                          {truncate(e.task) || "Tarea en curso"}
                        </p>
                      </div>

                      <span className="flex-none text-[11px] text-muted">{rel(e.since, now)}</span>
                      <span
                        className="h-2 w-2 flex-none rounded-full"
                        style={{ background: hue, boxShadow: `0 0 8px ${hue}` }}
                      />
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* Feed de actividad reciente con timestamps relativos */}
        {feed.length > 0 && (
          <section className="glass relative overflow-hidden rounded-2xl border border-white/10 p-5">
            <p className="label-caps flex items-center gap-1.5 text-cyber-cyan">
              <IconActivity size={13} /> Actividad reciente
            </p>
            <div className="mt-3 space-y-1.5">
              {feed.map((f) => {
                const hue = STATUS_HUE[f.status] ?? "#94a3b8";
                return (
                  <div
                    key={f.id}
                    className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-[12px]"
                  >
                    <span
                      className="h-1.5 w-1.5 flex-none rounded-full"
                      style={{ background: hue, boxShadow: `0 0 6px ${hue}` }}
                    />
                    <span className="flex-none font-medium text-on-surface">{f.agentName}</span>
                    {f.project && (
                      <span className="hidden max-w-[90px] flex-none truncate text-[10px] text-cyber-cyan sm:inline">
                        {f.project}
                      </span>
                    )}
                    <span className="min-w-0 flex-1 truncate text-muted">{truncate(f.task, 64)}</span>
                    <span
                      className="flex-none rounded-full px-1.5 py-0.5 text-[9px] font-medium"
                      style={{ color: hue, background: `${hue}14`, border: `1px solid ${hue}33` }}
                    >
                      {f.status}
                    </span>
                    <span className="flex-none text-[11px] text-muted">{rel(f.ts, now)}</span>
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
