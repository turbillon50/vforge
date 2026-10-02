"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IconActivity } from "@/components/brand/VFIcons";
import { AGENT_LOGOS } from "@/components/brand/AgentLogos";
import { EsferaDetail, type DetailTarget } from "@/components/cockpit/EsferaDetail";
import type {
  ActiveJob,
  EsferaId,
  EsferasPayload,
  EsferaState,
} from "@/components/cockpit/esferas-types";

/**
 * VISTA "UNA TAREA" / detalle del taller: quién es cada agente, en qué estado
 * está y qué tarea tiene en la mano ahora mismo. Tap en un agente o en una
 * tarea → abre su ficha con los datos reales de dispatch_queue.
 *
 * Ley visual 2-oct-2026: fondo blanco, borde gris fino, morado solo como
 * acento del estado activo. Nada de esferas, órbitas ni haces de energía.
 */

const VIOLET = "#7c3aed";
const VIOLET_INK = "#5b21b6";
const GREEN_INK = "#15803d";
const AMBER_INK = "#b45309";

/** "hace N días/h" para el rótulo del último trabajo de un agente en reposo. */
function agoLabel(iso: string | null): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  const ms = Date.now() - t;
  const days = Math.floor(ms / 86_400_000);
  if (days >= 1) return `hace ${days} d`;
  const hrs = Math.floor(ms / 3_600_000);
  return hrs >= 1 ? `hace ${hrs} h` : "hace minutos";
}

type EstadoVisual = {
  label: string;
  color: string;
  border: string;
  background: string;
};

function estadoVisual(working: boolean, pending: boolean): EstadoVisual {
  if (working) {
    return {
      label: "Trabajando",
      color: GREEN_INK,
      border: GREEN_INK,
      background: "#f0fdf4",
    };
  }
  if (pending) {
    return {
      label: "En cola",
      color: AMBER_INK,
      border: AMBER_INK,
      background: "#fffbeb",
    };
  }
  return {
    label: "En reposo",
    color: "var(--fg-muted)",
    border: "var(--border-1)",
    background: "var(--surface-1)",
  };
}

/** Tarjeta de un AGENTE: nombre, rol, estado y lo que trae en la mano. */
function AgentCard({
  esfera,
  working,
  dim,
  onSelect,
}: {
  esfera: EsferaState;
  working: boolean;
  dim: boolean;
  onSelect: () => void;
}) {
  const Logo = AGENT_LOGOS[esfera.id];
  const pending = !working && esfera.status === "pending";
  const est = estadoVisual(working, pending);
  const ultimo = agoLabel(esfera.lastSince);

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileTap={{ scale: 0.98 }}
      animate={{ opacity: dim ? 0.5 : 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      aria-label={`Ver detalle del agente ${esfera.name}`}
      className="flex flex-col rounded-xl border border-[var(--border-1)] bg-white p-3.5 text-left transition-colors hover:border-[var(--vf-violet)]"
      style={working ? { borderColor: VIOLET } : undefined}
    >
      <div className="flex items-start gap-2.5">
        <span className="grid h-9 w-9 flex-none place-items-center rounded-lg border border-[var(--border-1)] bg-[var(--surface-1)]">
          <Logo size={17} style={{ color: working ? VIOLET_INK : "var(--fg-muted)" }} />
        </span>
        <div className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold text-[var(--fg-primary)]">
            {esfera.name}
          </span>
          <span className="block truncate text-[12px] text-[var(--fg-muted)]">{esfera.role}</span>
        </div>
        <span
          className="flex-none rounded-full border px-2 py-0.5 text-[12px] font-semibold"
          style={{ color: est.color, borderColor: est.border, background: est.background }}
        >
          {est.label}
        </span>
      </div>

      {working && esfera.project ? (
        <p className="mt-2.5 truncate text-[12px] font-medium" style={{ color: VIOLET_INK }}>
          {esfera.project}
        </p>
      ) : null}

      {working && esfera.task ? (
        <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-[var(--fg-secondary)]">
          {esfera.task}
        </p>
      ) : null}

      {/* ANTI-STALE: en reposo NO se pinta tarea presente; solo el rastro del
          último trabajo ya cerrado, si lo hubo. */}
      {!working && !pending && esfera.lastProject ? (
        <p className="mt-2.5 truncate text-[12px] text-[var(--fg-muted)]">
          Último: {esfera.lastProject}
          {ultimo ? ` · ${ultimo}` : ""}
        </p>
      ) : null}
    </motion.button>
  );
}

/** Fila de una TAREA corriendo. */
function JobRow({ job, onSelect }: { job: ActiveJob; onSelect: () => void }) {
  const Logo = job.agent ? AGENT_LOGOS[job.agent] : null;
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      layout
      whileTap={{ scale: 0.99 }}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.26, ease: "easeOut" }}
      aria-label={`Ver detalle de ${job.agentName}${job.project ? ` · ${job.project}` : ""}`}
      className="flex w-full items-center gap-3 rounded-xl border border-[var(--border-1)] bg-white p-3 text-left transition-colors hover:border-[var(--vf-violet)]"
    >
      {Logo && (
        <span className="grid h-9 w-9 flex-none place-items-center rounded-lg border border-[var(--border-1)] bg-[var(--surface-1)]">
          <Logo size={17} style={{ color: VIOLET_INK }} />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[13px] font-semibold text-[var(--fg-primary)]">
            {job.agentName}
          </span>
          {job.project && (
            <span
              className="truncate rounded-full border px-2 py-0.5 text-[12px] font-medium"
              style={{
                borderColor: VIOLET,
                color: VIOLET_INK,
                background: "var(--vf-violet-soft)",
              }}
            >
              {job.project}
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-[12px] text-[var(--fg-secondary)]">
          {job.task || "Tarea en curso"}
        </p>
      </div>
      {typeof job.progress === "number" && (
        <span className="flex-none text-[12px] font-medium tabular-nums text-[var(--fg-muted)]">
          {job.progress}%
        </span>
      )}
    </motion.button>
  );
}

export function EsferasNucleo({
  data,
  selectedProject = null,
  focusJobId = null,
  error = false,
}: {
  /** Controlado: el padre (Taller) pasa el payload. Omitido: auto-fetch. */
  data?: EsferasPayload | null;
  selectedProject?: string | null;
  /** Zoom-in desde la vista de todas: aísla UNA tarea y abre su ficha. */
  focusJobId?: number | null;
  error?: boolean;
}) {
  // Modo controlado vs autónomo (retrocompat con quien lo usa sin props).
  const controlled = data !== undefined;
  const [internal, setInternal] = useState<EsferasPayload | null>(null);
  const [internalError, setInternalError] = useState(false);

  useEffect(() => {
    if (controlled) return;
    let alive = true;
    const load = () =>
      fetch("/api/cockpit/esferas", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((j: EsferasPayload) => {
          if (alive) {
            setInternal(j);
            setInternalError(false);
          }
        })
        .catch(() => alive && setInternalError(true));
    load();
    const t = setInterval(load, 4000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [controlled]);

  const payload = controlled ? data : internal;
  const err = controlled ? error : internalError;
  const esferas = useMemo(() => payload?.esferas ?? [], [payload]);
  const allJobs = useMemo(() => payload?.jobs ?? [], [payload]);

  // Tareas visibles según el proyecto seleccionado, y opcionalmente aisladas a
  // una única tarea cuando venimos por zoom-in desde la vista de todas.
  const jobs = useMemo(() => {
    let list = selectedProject
      ? allJobs.filter((j) => j.projectKey === selectedProject)
      : allJobs;
    if (focusJobId != null) list = list.filter((j) => j.id === focusJobId);
    return list;
  }, [allJobs, selectedProject, focusJobId]);

  // Ficha de detalle: tarea o agente seleccionado (datos reales del payload).
  const [detail, setDetail] = useState<DetailTarget | null>(null);

  // Zoom-in: abre la ficha de la tarea enfocada en cuanto llega/cambia su id.
  useEffect(() => {
    if (focusJobId == null) return;
    const j = allJobs.find((x) => x.id === focusJobId);
    if (j) setDetail({ kind: "job", job: j });
  }, [focusJobId, allJobs]);

  // ¿Qué agentes están encendidos? Los que ejecutan alguna tarea visible.
  const activeAgents = useMemo(() => {
    const s = new Set<EsferaId>();
    for (const j of jobs) if (j.agent) s.add(j.agent);
    return s;
  }, [jobs]);

  const isWorking = (e: EsferaState) => activeAgents.has(e.id);
  const isDim = (e: EsferaState) =>
    (Boolean(selectedProject) || focusJobId != null) &&
    !activeAgents.has(e.id) &&
    e.status !== "pending";

  const activos = jobs.length;
  const totalWorking = allJobs.length;
  // Healthcheck honesto: si el proceso del daemon Vulcano NO está vivo, lo
  // decimos sin rodeos. `daemonAlive===false` es caído confirmado (no "sin
  // lectura"). Lo que siga pintado es el último estado conocido.
  const daemonPaused = payload?.health?.daemonAlive === false;

  return (
    <section className="vf-card overflow-hidden p-4 sm:p-5">
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--fg-muted)]">
          <IconActivity size={13} /> Agentes y su tarea
        </p>
        <span
          className="chip"
          style={activos > 0 ? { color: GREEN_INK, borderColor: GREEN_INK } : undefined}
        >
          {activos} {activos === 1 ? "tarea" : "tareas"}
        </span>
      </div>
      <p className="mb-3 text-[13px] text-[var(--fg-secondary)]">
        Cada agente con el trabajo que trae en la mano. Toca uno para ver su ficha.
      </p>

      {/* Banner honesto: daemon Vulcano caído → despacho pausado */}
      {daemonPaused && (
        <div className="mb-3 flex items-start gap-2 rounded-xl border border-[#b45309] bg-[#fffbeb] px-3 py-2.5">
          <span className="mt-1.5 h-2 w-2 flex-none rounded-full bg-[#b45309]" aria-hidden />
          <p className="text-[13px] leading-relaxed text-[#7c2d12]">
            <span className="font-semibold">Despacho pausado.</span> El daemon Vulcano no está vivo
            ahora mismo — no se está repartiendo trabajo. Lo que ves es el último estado conocido,
            no actividad en curso.
          </p>
        </div>
      )}

      {/* Tareas corriendo (o la tarea aislada por zoom-in) */}
      {jobs.length > 0 && (
        <div className="mb-4 space-y-2">
          <p className="text-[12px] font-medium text-[var(--fg-muted)]">
            {jobs.length === 1 ? "Tarea en curso" : "Tareas en curso"}
          </p>
          <AnimatePresence mode="popLayout" initial={false}>
            {jobs.map((j) => (
              <JobRow key={j.id} job={j} onSelect={() => setDetail({ kind: "job", job: j })} />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Roster de agentes */}
      {esferas.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {esferas.map((e) => (
            <AgentCard
              key={e.id}
              esfera={e}
              working={isWorking(e)}
              dim={isDim(e)}
              onSelect={() => setDetail({ kind: "agent", esfera: e })}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-[var(--border-2)] py-10 text-center">
          <p className="text-[13px] text-[var(--fg-secondary)]">
            {err ? "No se pudo leer el estado de los agentes." : "Cargando agentes…"}
          </p>
        </div>
      )}

      {totalWorking === 0 && esferas.length > 0 && (
        <p className="mt-3 text-center text-[12px] text-[var(--fg-muted)]">
          Todos en reposo — ninguna tarea corriendo ahora mismo.
        </p>
      )}

      {/* Ficha de detalle con datos reales de la tarea/agente seleccionado */}
      <AnimatePresence>
        {detail && (
          <EsferaDetail
            key={detail.kind === "job" ? `job-${detail.job.id}` : `agent-${detail.esfera.id}`}
            target={detail}
            onClose={() => setDetail(null)}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
