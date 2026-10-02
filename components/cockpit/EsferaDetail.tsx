"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AGENT_LOGOS, LogoGrok } from "@/components/brand/AgentLogos";
import { IconActivity, IconShield } from "@/components/brand/VFIcons";
import type {
  ActiveJob,
  EsferaState,
  GrokVerdict,
} from "@/components/cockpit/esferas-types";

/* Ley visual 2-oct-2026: morado solo como acento; los estados van en tono
   oscuro para leerse sobre blanco. */
const VIOLET_INK = "#5b21b6";

const VERDICT_HUE: Record<GrokVerdict, string> = {
  APROBADO: "#15803d",
  RECHAZADO: "#b91c1c",
  REVISION: "#b45309",
};

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

/** Objetivo de la ficha: una tarea corriendo, o un agente. */
export type DetailTarget =
  | { kind: "job"; job: ActiveJob }
  | { kind: "agent"; esfera: EsferaState };

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

/** "hace N días/h/min" para la última tarea cerrada. */
function agoLabel(iso: string | null, now: number): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  const ms = now - t;
  const days = Math.floor(ms / 86_400_000);
  if (days >= 1) return `hace ${days} d`;
  const hrs = Math.floor(ms / 3_600_000);
  if (hrs >= 1) return `hace ${hrs} h`;
  const min = Math.floor(ms / 60_000);
  return min >= 1 ? `hace ${min} min` : "hace instantes";
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-t border-[var(--border-1)] py-2.5">
      <span className="flex-none pt-0.5 text-[12px] font-medium text-[var(--fg-muted)]">{label}</span>
      <span className="min-w-0 text-right text-[13px] text-[var(--fg-primary)]">{value}</span>
    </div>
  );
}

/**
 * Ficha de detalle de una tarea o de un agente. Mobile-first: hoja inferior en
 * móvil, tarjeta centrada en escritorio. Datos REALES de dispatch_queue — CERO
 * mock. Cierre por fondo, botón ✕ o Esc.
 */
export function EsferaDetail({
  target,
  onClose,
}: {
  target: DetailTarget;
  onClose: () => void;
}) {
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Normaliza job/agente a un modelo común para el render.
  const agentId = target.kind === "job" ? target.job.agent : target.esfera.id;
  const Logo = agentId ? AGENT_LOGOS[agentId] : LogoGrok;

  const agentName =
    target.kind === "job" ? target.job.agentName : target.esfera.name;
  const role = target.kind === "agent" ? target.esfera.role : null;

  const working =
    target.kind === "job"
      ? true
      : target.esfera.status === "working" || target.esfera.status === "pending";

  const jobId = target.kind === "job" ? target.job.id : target.esfera.jobId;
  const project = target.kind === "job" ? target.job.project : target.esfera.project;
  const task = target.kind === "job" ? target.job.task : target.esfera.task;
  const since = target.kind === "job" ? target.job.since : target.esfera.since;
  const progress =
    target.kind === "job" ? target.job.progress : target.esfera.progress;
  const logTail =
    target.kind === "job" ? target.job.logTail : target.esfera.logTail;
  const logLines = (logTail ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(-5);
  const source = target.kind === "job" ? target.job.source : target.esfera.source;
  const gajo = target.kind === "job" ? target.job.gajo : target.esfera.gajo;
  const statusRaw =
    target.kind === "job"
      ? target.job.status_raw
      : target.esfera.status_raw ?? target.esfera.status;
  const grokVerdict =
    target.kind === "job" ? target.job.grokVerdict : target.esfera.grokVerdict;
  const grokNotes =
    target.kind === "job" ? target.job.grokNotes : target.esfera.grokNotes;

  const statusHue = STATUS_HUE[(statusRaw || "").toLowerCase()] ?? "#94a3b8";

  return (
    <motion.div
      className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Backdrop */}
      <button
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />

      {/* Panel: bottom-sheet en móvil, tarjeta centrada en desktop */}
      <motion.div
        role="dialog"
        aria-modal="true"
        initial={{ y: 40, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 40, opacity: 0, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 320, damping: 30 }}
        className="relative z-10 w-full max-w-[440px] overflow-hidden rounded-t-2xl border border-[var(--border-1)] bg-white pb-[max(env(safe-area-inset-bottom),1rem)] sm:rounded-2xl sm:pb-0"
      >
        {/* Asa de la hoja (solo móvil) */}
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-[var(--border-2)] sm:hidden" />

        <div className="relative p-5 pt-4 sm:pt-5">
          {/* Cabecera: agente + estado + cerrar */}
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 flex-none place-items-center rounded-xl border border-[var(--border-1)] bg-[var(--surface-1)]">
              <Logo size={22} style={{ color: working ? VIOLET_INK : "var(--fg-muted)" }} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="truncate font-display text-base font-bold text-[var(--fg-primary)]">
                  {agentName}
                </h3>
                <span
                  className="flex-none rounded-full border px-2 py-0.5 text-[12px] font-semibold"
                  style={{ color: statusHue, borderColor: statusHue }}
                >
                  {working ? statusRaw || "running" : "en reposo"}
                </span>
              </div>
              {role && <p className="truncate text-[12px] text-[var(--fg-muted)]">{role}</p>}
            </div>
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="grid h-9 w-9 flex-none place-items-center rounded-xl border border-[var(--border-1)] bg-white text-[var(--fg-secondary)] transition active:scale-95 hover:text-black"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Cuerpo */}
          {working ? (
            <div className="mt-4">
              {task && (
                <p className="rounded-xl border border-[var(--border-1)] bg-[var(--surface-1)] p-3 text-[13px] leading-relaxed text-[var(--fg-primary)]">
                  {task}
                </p>
              )}

              <div className="mt-1">
                {jobId != null && <Row label="Tarea" value={`#${jobId}`} />}
                {project && (
                  <Row
                    label="Proyecto"
                    value={
                      <span style={{ color: VIOLET_INK }} className="font-medium">
                        {project}
                      </span>
                    }
                  />
                )}
                {source && <Row label="Origen" value={<span className="text-[var(--fg-secondary)]">{source}</span>} />}
                {gajo && <Row label="Gajo" value={<span className="font-mono text-[12px] text-[var(--fg-muted)]">{gajo}</span>} />}
                <Row
                  label="Corriendo"
                  value={
                    <span className="font-mono tabular-nums" style={{ color: working ? "#15803d" : undefined }}>
                      {elapsed(since, now)}
                    </span>
                  }
                />
                {typeof progress === "number" && (
                  <div className="border-t border-[var(--border-1)] py-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-medium text-[var(--fg-muted)]">Avance</span>
                      <span className="text-[13px] font-medium text-[var(--fg-primary)]">{progress}%</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: "var(--vf-violet)" }}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Actividad en vivo: las últimas líneas del log_tail real del
                  daemon — QUÉ está haciendo el agente ahora mismo. CERO mock:
                  si no hay log_tail, no se pinta nada. */}
              {logLines.length > 0 && (
                <div className="mt-3">
                  <div className="mb-1.5 flex items-center gap-1.5">
                    <span
                      className="h-1.5 w-1.5 animate-pulse rounded-full"
                      style={{ background: "#15803d" }}
                    />
                    <span className="text-[12px] font-medium text-[var(--fg-muted)]">
                      Actividad en vivo
                    </span>
                  </div>
                  <div className="space-y-1 rounded-xl border border-[var(--border-1)] bg-[var(--surface-1)] p-3">
                    {logLines.map((line, i) => (
                      <p
                        key={i}
                        className={`truncate font-mono text-[12px] leading-relaxed ${
                          i === logLines.length - 1
                            ? "text-[var(--fg-primary)]"
                            : "text-[var(--fg-secondary)]"
                        }`}
                        title={line}
                      >
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Veredicto Grok si ya fue auditado */}
              {grokVerdict && (
                <div
                  className="mt-3 rounded-xl border p-3"
                  style={{ borderColor: VERDICT_HUE[grokVerdict], background: "#ffffff" }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[12px] font-semibold"
                      style={{ color: VERDICT_HUE[grokVerdict], borderColor: VERDICT_HUE[grokVerdict] }}
                    >
                      <IconShield size={12} /> {grokVerdict}
                    </span>
                    <span className="flex items-center gap-1 text-[12px] text-[var(--fg-secondary)]">
                      <LogoGrok size={11} /> Auditor Grok
                    </span>
                  </div>
                  {grokNotes && (
                    <p className="mt-2 text-[12px] leading-relaxed text-[var(--fg-secondary)]">{grokNotes}</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Agente en reposo */
            <div className="mt-4">
              <div className="flex items-center gap-2 rounded-xl border border-[var(--border-1)] bg-[var(--surface-1)] p-3 text-[13px] text-[var(--fg-secondary)]">
                <IconActivity size={14} />
                En reposo — sin tarea corriendo ahora mismo.
              </div>
              {target.kind === "agent" && target.esfera.lastProject ? (
                <div className="mt-1">
                  <Row
                    label="Última tarea"
                    value={<span className="font-medium text-[var(--fg-primary)]">{target.esfera.lastProject}</span>}
                  />
                  <Row
                    label="Cuándo"
                    value={<span className="text-[var(--fg-secondary)]">{agoLabel(target.esfera.lastSince, now) ?? "—"}</span>}
                  />
                </div>
              ) : (
                <p className="mt-3 text-center text-[12px] text-[var(--fg-muted)]">
                  Sin historial reciente para este agente.
                </p>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
