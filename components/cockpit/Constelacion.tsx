"use client";

import { motion } from "framer-motion";
import { AGENT_LOGOS, LogoGrok } from "@/components/brand/AgentLogos";
import { IconActivity } from "@/components/brand/VFIcons";
import type {
  ActiveJob,
  EsferaState,
  FeedItem,
  GrokVerdict,
} from "@/components/cockpit/esferas-types";
import { useLiteMotion } from "@/components/cockpit/use-lite-motion";

/**
 * VISTA "TODAS LAS TAREAS": una tarjeta por tarea corriendo, para supervisar
 * todo de un vistazo. Cada tarjeta dice el proyecto, el agente que la ejecuta,
 * qué está haciendo, su avance y cuánto lleva corriendo. Tap en una tarjeta →
 * abre su detalle. Sin tareas activas → los últimos cierres (24h) con su sello
 * de veredicto Grok.
 *
 * Ley visual 2-oct-2026: fondo blanco, borde gris fino, morado solo como
 * acento. Nada de esferas decorativas ni efectos de luz.
 */

const VIOLET = "#7c3aed";
const VIOLET_INK = "#5b21b6";

const VERDICT_HUE: Record<GrokVerdict, string> = {
  APROBADO: "#15803d",
  RECHAZADO: "#b91c1c",
  REVISION: "#b45309",
};

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

/** "hace N d/h/min" para las tareas ya cerradas. */
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

/** Tarjeta de una tarea ACTIVA. */
function TareaViva({
  job,
  now,
  onZoom,
}: {
  job: ActiveJob;
  now: number;
  onZoom: () => void;
}) {
  const lite = useLiteMotion();
  const Logo = job.agent ? AGENT_LOGOS[job.agent] : LogoGrok;

  return (
    <motion.button
      type="button"
      onClick={onZoom}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="flex flex-col rounded-xl border border-[var(--border-1)] bg-white p-3.5 text-left transition-colors hover:border-[var(--vf-violet)] sm:p-4"
      aria-label={`Ver detalle de ${job.agentName}${job.project ? ` · ${job.project}` : ""}`}
    >
      {/* Proyecto + tiempo corriendo */}
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <span
          className="truncate rounded-full border px-2 py-0.5 text-[12px] font-semibold"
          style={{
            borderColor: VIOLET,
            color: VIOLET_INK,
            background: "var(--vf-violet-soft)",
          }}
          title={job.project ?? job.agentName}
        >
          {job.project || job.agentName}
        </span>
        <span className="flex flex-none items-center gap-1.5 text-[12px] font-medium tabular-nums text-[var(--fg-secondary)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#15803d]" aria-hidden />
          {elapsed(job.since, now)}
        </span>
      </div>

      {/* Agente que la ejecuta */}
      <div className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 flex-none place-items-center rounded-lg border border-[var(--border-1)] bg-[var(--surface-1)]">
          <Logo size={17} style={{ color: VIOLET_INK }} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-[13px] font-semibold text-[var(--fg-primary)]">
              {job.agentName}
            </span>
            {typeof job.progress === "number" && (
              <span className="flex-none text-[12px] tabular-nums text-[var(--fg-muted)]">
                {job.progress}%
              </span>
            )}
          </div>
          <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-[var(--fg-secondary)]">
            {job.task || "Tarea en curso"}
          </p>
        </div>
      </div>

      {/* Barra: determinada si hay avance, si no un barrido indeterminado */}
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
        {typeof job.progress === "number" ? (
          <motion.div
            className="h-full rounded-full"
            style={{ background: VIOLET }}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, Math.max(2, job.progress))}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        ) : (
          <motion.div
            className="h-full w-1/3 rounded-full"
            style={{ background: VIOLET }}
            animate={lite ? { x: "120%" } : { x: ["-120%", "320%"] }}
            transition={lite ? { duration: 0 } : { duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
      </div>
    </motion.button>
  );
}

/** Tarjeta de una tarea ya CERRADA, con su sello Grok. */
function TareaCerrada({ item, now }: { item: FeedItem; now: number }) {
  const verdict = item.grokVerdict;
  const Logo = item.agent ? AGENT_LOGOS[item.agent] : LogoGrok;
  return (
    <div className="flex flex-col rounded-xl border border-[var(--border-1)] bg-white p-3.5 sm:p-4">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <span className="truncate rounded-full border border-[var(--border-1)] bg-[var(--surface-1)] px-2 py-0.5 text-[12px] font-medium text-[var(--fg-secondary)]">
          {item.project || item.agentName}
        </span>
        {verdict ? (
          <span
            className="flex flex-none items-center gap-1 rounded-full border px-2 py-0.5 text-[12px] font-semibold"
            style={{ color: VERDICT_HUE[verdict], borderColor: VERDICT_HUE[verdict] }}
            title={item.grokNotes ?? verdict}
          >
            <LogoGrok size={10} /> {verdict}
          </span>
        ) : (
          <span
            className="flex flex-none items-center gap-1 rounded-full border border-[var(--border-1)] px-2 py-0.5 text-[12px] font-medium text-[var(--fg-muted)]"
            title="Tarea cerrada sin auditoría Grok"
          >
            <LogoGrok size={10} /> sin auditar
          </span>
        )}
      </div>

      <div className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 flex-none place-items-center rounded-lg border border-[var(--border-1)] bg-[var(--surface-1)]">
          <Logo size={17} style={{ color: "var(--fg-muted)" }} />
        </span>
        <div className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium text-[var(--fg-primary)]">
            {item.agentName}
          </span>
          <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-[var(--fg-secondary)]">
            {item.task || "Tarea finalizada"}
          </p>
        </div>
      </div>

      <p className="mt-2.5 text-[12px] text-[var(--fg-muted)]">{ago(item.ts, now)}</p>
    </div>
  );
}

/** Clases de grid responsivo según cuántas tareas activas. */
function gridFor(count: number): string {
  if (count <= 1) return "grid-cols-1 max-w-[460px]";
  if (count <= 4) return "grid-cols-1 sm:grid-cols-2";
  if (count <= 6) return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
  return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
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
  // Marca de tiempo del cierre más reciente para el header en reposo.
  const lastAgo = lastJobAt ? ago(lastJobAt, now) : null;

  return (
    <section className="vf-card overflow-hidden p-4 sm:p-5">
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--fg-muted)]">
          <IconActivity size={13} /> Todas las tareas
        </p>
        {live ? (
          <span className="chip" style={{ color: "#15803d", borderColor: "#15803d" }}>
            {jobs.length} {jobs.length === 1 ? "tarea viva" : "tareas vivas"}
          </span>
        ) : lastAgo ? (
          <span className="chip">
            Última tarea {lastAgo === "ahora" ? "ahora" : lastAgo.startsWith("hace") ? lastAgo : `hace ${lastAgo}`}
          </span>
        ) : (
          <span className="chip">Sin trabajo en curso</span>
        )}
      </div>
      <p className="mb-3 text-[13px] text-[var(--fg-secondary)]">
        {live
          ? "Una tarjeta por tarea corriendo. Toca una para ver su detalle."
          : restJobs.length > 0
            ? "Sin tareas activas — estos son los últimos cierres (24h), con su veredicto Grok."
            : "Sin tareas activas — sin cierres en las últimas 24h."}
      </p>

      {daemonPaused && (
        <div className="mb-3 flex items-start gap-2 rounded-xl border border-[#b45309] bg-[#fffbeb] px-3 py-2.5">
          <span className="mt-1.5 h-2 w-2 flex-none rounded-full bg-[#b45309]" aria-hidden />
          <p className="text-[13px] leading-relaxed text-[#7c2d12]">
            <span className="font-semibold">Despacho pausado.</span> El daemon Vulcano no está vivo
            ahora mismo — esto es el último estado conocido, no actividad en curso.
          </p>
        </div>
      )}

      {live ? (
        <div className={`grid gap-3 ${gridFor(jobs.length)}`}>
          {jobs.map((j) => (
            <TareaViva key={j.id} job={j} now={now} onZoom={() => onZoom(j)} />
          ))}
        </div>
      ) : restJobs.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {restJobs.map((f) => (
            <TareaCerrada key={f.id} item={f} now={now} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-[var(--border-2)] py-10 text-center">
          <p className="text-[13px] text-[var(--fg-secondary)]">
            {error
              ? "No se pudo leer el estado de los agentes."
              : "Sin trabajo en curso — ninguna tarea ha corrido recientemente."}
          </p>
        </div>
      )}
    </section>
  );
}
