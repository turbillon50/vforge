"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { VulcanoCore } from "@/components/vulcano/VulcanoCore";
import { AGENT_LOGOS, LogoGrok } from "@/components/brand/AgentLogos";
import { IconActivity } from "@/components/brand/VFIcons";
import type {
  ActiveJob,
  EsferaId,
  EsferaState,
  FeedItem,
  GrokVerdict,
} from "@/components/cockpit/esferas-types";

/**
 * VISTA CONSTELACIÓN (zoom out): un MINI-núcleo por job activo para supervisar
 * TODO en tiempo real. Cada mini = la misma idea del Taller en pequeño: la
 * esfera central pulsando, los 5 agentes a disposición del job (el que ejecuta
 * iluminado, el resto en reposo), tag del proyecto, barra de progreso y tiempo
 * corriendo. Sin jobs activos → reposo honesto con los últimos N jobs apagados
 * y su sello de veredicto Grok. Tap en un mini → zoom-in al diagrama de detalle.
 */

const ACCENT = "#22d3ee";

const HUE: Record<string, string> = {
  claude: "#a78bfa",
  codex: "#22d3ee",
  grok: "#f472b6",
  shell: "#34d399",
  browser: "#38bdf8",
};

const VERDICT_HUE: Record<GrokVerdict, string> = {
  APROBADO: "#34d399",
  RECHAZADO: "#f87171",
  REVISION: "#fbbf24",
};

/** Orden estable del roster — los 5 agentes a disposición de CADA job. */
const ROSTER: EsferaId[] = ["claude", "codex", "grok", "shell", "browser"];

/** Posición de un agente en el aro del mini (coords locales 0-100). */
function ringPos(i: number, total: number, radius: number) {
  const angle = (-90 + (360 / total) * i) * (Math.PI / 180);
  return {
    x: 50 + radius * Math.cos(angle),
    y: 50 + radius * Math.sin(angle),
  };
}

/** "12m 04s" / "1h 12m" — tiempo corriendo, vivo. */
function elapsed(iso: string | null, now: number): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "—";
  let s = Math.max(0, Math.floor((now - t) / 1000));
  const h = Math.floor(s / 3600);
  s -= h * 3600;
  const m = Math.floor(s / 60);
  s -= m * 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, "0")}s`;
  return `${s}s`;
}

/** "hace N d/h/min" para los minis en reposo. */
function ago(iso: string | null, now: number): string {
  if (!iso) return "";
  const ms = now - Date.parse(iso);
  if (!Number.isFinite(ms) || ms < 0) return "ahora";
  const m = Math.floor(ms / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
}

/** Aro de los 5 agentes alrededor del orbe del mini. */
function AgentRing({
  activeAgents,
  radius,
  dotPx,
  dim,
}: {
  activeAgents: Set<EsferaId | null>;
  radius: number;
  dotPx: number;
  dim: boolean;
}) {
  return (
    <>
      {ROSTER.map((id, i) => {
        const p = ringPos(i, ROSTER.length, radius);
        const Logo = AGENT_LOGOS[id];
        const on = activeAgents.has(id);
        const hue = HUE[id] ?? ACCENT;
        return (
          <motion.div
            key={id}
            className="absolute -translate-x-1/2 -translate-y-1/2 grid place-items-center rounded-lg border"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: dotPx,
              height: dotPx,
              borderColor: on ? `${hue}66` : "rgba(255,255,255,0.08)",
              background: on
                ? `radial-gradient(circle at 50% 35%, ${hue}33, rgba(10,10,15,0.85))`
                : "rgba(255,255,255,0.03)",
            }}
            animate={
              on && !dim
                ? { boxShadow: [`0 0 0px ${hue}00`, `0 0 12px ${hue}aa`, `0 0 0px ${hue}00`] }
                : {}
            }
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          >
            <Logo
              size={Math.round(dotPx * 0.52)}
              style={{ color: on ? hue : "rgba(255,255,255,0.28)" }}
            />
          </motion.div>
        );
      })}
    </>
  );
}

/** Un MINI-núcleo de un job ACTIVO. */
function MiniLive({
  job,
  now,
  big,
  onZoom,
}: {
  job: ActiveJob;
  now: number;
  big: boolean;
  onZoom: () => void;
}) {
  const hue = (job.agent && HUE[job.agent]) || ACCENT;
  const active = useMemo(() => new Set<EsferaId | null>([job.agent]), [job.agent]);
  const orb = big ? 96 : 60;
  const ringR = big ? 40 : 38;
  const dot = big ? 30 : 22;

  return (
    <motion.button
      type="button"
      onClick={onZoom}
      layout
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.32, ease: "easeOut" }}
      className="glass group relative flex flex-col overflow-hidden rounded-2xl border p-3 text-left sm:p-4"
      style={{ borderColor: `${hue}33` }}
      aria-label={`Abrir detalle de ${job.agentName}${job.project ? ` · ${job.project}` : ""}`}
    >
      {/* Glow del acento del agente que ejecuta */}
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-40 blur-2xl transition-opacity group-hover:opacity-60"
        style={{ background: hue }}
      />

      {/* Cabecera: proyecto + tiempo corriendo */}
      <div className="relative mb-1 flex items-center justify-between gap-2">
        <span
          className="truncate rounded-full border px-2 py-0.5 text-[10px] font-semibold"
          style={{ borderColor: `${hue}40`, color: hue, background: `${hue}14` }}
          title={job.project ?? job.agentName}
        >
          {job.project || job.agentName}
        </span>
        <span className="flex flex-none items-center gap-1 text-[10px] font-medium text-[var(--fg-tertiary)]">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: hue, boxShadow: `0 0 6px ${hue}` }} />
          {elapsed(job.since, now)}
        </span>
      </div>

      {/* Mini-órbita: orbe central pulsando + los 5 agentes del job */}
      <div className="relative mx-auto aspect-square w-full max-w-[200px]">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <VulcanoCore size={orb} accent={hue} driving />
        </div>
        <AgentRing activeAgents={active} radius={ringR} dotPx={dot} dim={false} />
      </div>

      {/* Tarea + progreso */}
      <div className="relative mt-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-[11px] font-medium text-on-surface">{job.agentName}</span>
          {typeof job.progress === "number" && (
            <span className="flex-none text-[10px] text-[var(--fg-tertiary)]">{job.progress}%</span>
          )}
        </div>
        <p className="mt-0.5 line-clamp-1 text-[10px] text-muted">{job.task || "Tarea en curso"}</p>
        {/* Barra: determinada si hay progreso, si no un barrido indeterminado */}
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.06]">
          {typeof job.progress === "number" ? (
            <motion.div
              className="h-full rounded-full"
              style={{ background: hue, boxShadow: `0 0 8px ${hue}` }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, Math.max(2, job.progress))}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          ) : (
            <motion.div
              className="h-full w-1/3 rounded-full"
              style={{ background: hue, boxShadow: `0 0 8px ${hue}` }}
              animate={{ x: ["-120%", "320%"] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            />
          )}
        </div>
      </div>
    </motion.button>
  );
}

/** Un MINI-núcleo en REPOSO — último job cerrado, gris, con sello Grok. */
function MiniRest({ item, now }: { item: FeedItem; now: number }) {
  const active = useMemo(() => new Set<EsferaId | null>([item.agent]), [item.agent]);
  const verdict = item.grokVerdict;
  return (
    <div className="glass relative flex flex-col overflow-hidden rounded-2xl border border-[var(--border-1)] p-3 opacity-90 sm:p-4">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="truncate rounded-full border border-[var(--border-1)] bg-[var(--surface-1)] px-2 py-0.5 text-[10px] font-medium text-[var(--fg-tertiary)]">
          {item.project || item.agentName}
        </span>
        {verdict ? (
          <span
            className="flex flex-none items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold"
            style={{
              color: VERDICT_HUE[verdict],
              background: `${VERDICT_HUE[verdict]}14`,
              border: `1px solid ${VERDICT_HUE[verdict]}33`,
            }}
            title={item.grokNotes ?? verdict}
          >
            <LogoGrok size={9} /> {verdict}
          </span>
        ) : (
          <span
            className="flex flex-none items-center gap-1 rounded-full border border-[var(--border-1)] bg-[var(--surface-1)] px-1.5 py-0.5 text-[9px] font-medium text-[var(--fg-muted)]"
            title="Job cerrado sin auditoría Grok"
          >
            <LogoGrok size={9} style={{ color: "#6b7280" }} /> sin auditar
          </span>
        )}
      </div>

      <div className="relative mx-auto aspect-square w-full max-w-[180px] grayscale">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <VulcanoCore size={54} accent="#6b7280" driving={false} />
        </div>
        <AgentRing activeAgents={active} radius={38} dotPx={20} dim />
      </div>

      <div className="mt-1">
        <p className="line-clamp-1 text-[10px] text-[var(--fg-tertiary)]">{item.task || "Job finalizado"}</p>
        <p className="mt-0.5 text-[10px] text-[var(--fg-muted)]">{ago(item.ts, now)}</p>
      </div>
    </div>
  );
}

/** Clases de grid responsivo según cuántos minis activos. */
function gridFor(count: number): string {
  if (count <= 1) return "grid-cols-1 max-w-[420px] mx-auto";
  if (count <= 4) return "grid-cols-2";
  if (count <= 6) return "grid-cols-2 sm:grid-cols-3";
  return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4";
}

export function Constelacion({
  jobs,
  esferas,
  restJobs,
  lastJobAt = null,
  now,
  error = false,
  daemonPaused = false,
  onZoom,
}: {
  jobs: ActiveJob[];
  esferas: EsferaState[];
  restJobs: FeedItem[];
  lastJobAt?: string | null;
  now: number;
  error?: boolean;
  daemonPaused?: boolean;
  onZoom: (job: ActiveJob) => void;
}) {
  void esferas; // roster fijo; se mantiene la firma por si el orden cambia
  const live = jobs.length > 0;
  const big = jobs.length === 1;
  // Marca de tiempo del cierre más reciente para el header en reposo.
  const lastAgo = lastJobAt ? ago(lastJobAt, now) : null;

  return (
    <section className="glass relative overflow-hidden rounded-2xl border border-[var(--border-1)] p-4 sm:p-5">
      <div className="relative mb-1 flex items-center justify-between">
        <p className="label-caps flex items-center gap-1.5 text-cyber-cyan">
          <IconActivity size={13} /> Constelación · supervisión total
        </p>
        {live ? (
          <span className="chip text-[10px] text-emerald-600 dark:text-emerald-300">
            {jobs.length} {jobs.length === 1 ? "job vivo" : "jobs vivos"}
          </span>
        ) : lastAgo ? (
          <span className="chip text-[10px] text-cyan-600 dark:text-cyan-300">
            Último job {lastAgo === "ahora" ? "ahora" : lastAgo.startsWith("hace") ? lastAgo : `hace ${lastAgo}`}
          </span>
        ) : (
          <span className="chip text-[10px] text-muted">En reposo</span>
        )}
      </div>
      <p className="relative mb-3 text-[12px] text-muted">
        {live
          ? "Un mini-núcleo por job corriendo. Toca uno para hacer zoom a su diagrama de detalle."
          : restJobs.length > 0
            ? "Sin jobs activos — los últimos cierres en reposo (24h), con su veredicto Grok."
            : "Sin jobs activos — sin cierres en las últimas 24h."}
      </p>

      {daemonPaused && (
        <div className="relative mb-3 flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2.5">
          <span className="mt-0.5 h-2 w-2 flex-none rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]" />
          <p className="text-[12px] leading-relaxed text-amber-200/90">
            <span className="font-semibold">Núcleo pausado.</span> El daemon Vulcano no está vivo
            ahora mismo — la constelación muestra el último estado conocido.
          </p>
        </div>
      )}

      {live ? (
        <div className={`relative grid gap-3 ${gridFor(jobs.length)}`}>
          {jobs.map((j) => (
            <MiniLive key={j.id} job={j} now={now} big={big} onZoom={() => onZoom(j)} />
          ))}
        </div>
      ) : restJobs.length > 0 ? (
        <div className="relative grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {restJobs.map((f) => (
            <MiniRest key={f.id} item={f} now={now} />
          ))}
        </div>
      ) : (
        <div className="relative grid place-items-center py-10 text-center">
          <VulcanoCore size={84} accent={ACCENT} driving={false} />
          <p className="mt-3 text-[13px] text-muted">
            {error
              ? "No se pudo leer el estado de las esferas."
              : "Esferas en reposo — ningún job ha corrido recientemente."}
          </p>
        </div>
      )}
    </section>
  );
}
