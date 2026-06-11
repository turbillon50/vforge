"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { VulcanoCore } from "@/components/vulcano/VulcanoCore";
import { IconActivity } from "@/components/brand/VFIcons";
import { AGENT_LOGOS } from "@/components/brand/AgentLogos";
import type {
  ActiveJob,
  EsferaId,
  EsferasPayload,
  EsferaState,
} from "@/components/cockpit/esferas-types";

const ACCENT = "#22d3ee";

/** Color de acento por esfera para diferenciar nodos cuando trabajan. */
const HUE: Record<string, string> = {
  claude: "#a78bfa", // violet
  codex: "#22d3ee", // cyan
  grok: "#f472b6", // pink
  shell: "#34d399", // emerald
  browser: "#38bdf8", // sky
};

// Geometría: lienzo cuadrado 100×100, agentes en órbita, jobs en el centro.
const CENTER = 50;

/**
 * Radio orbital RESPONSIVE. Los nodos de agente son px FIJOS (~48px), así que en
 * un lienzo chico ocupan una fracción mayor: con radio fijo 40 los nodos del
 * perímetro (Browser/Code/Shell/Grok) chocan con el borde y sus etiquetas se
 * recortan en pantalla vertical. Encogemos el radio en móvil para meter las 5
 * esferas hacia adentro con aire suficiente; en desktop volvemos al radio amplio.
 */
function radiusForBox(boxW: number): number {
  if (boxW < 360) return 32;
  if (boxW < 440) return 36;
  return 40;
}

/** Posición de un AGENTE en la órbita perimetral. */
function agentPos(i: number, total: number, radius: number) {
  const angle = (-90 + (360 / total) * i) * (Math.PI / 180);
  return {
    x: CENTER + radius * Math.cos(angle),
    y: CENTER + radius * Math.sin(angle),
  };
}

/**
 * Posición de un JOB en el centro. Órbitas dinámicas según cuántos haya:
 * 1 → centrada · 2-4 → distribuidas en anillo chico · 5+ → anillo más amplio.
 * `compact` (viewport angosto) aprieta el anillo para que las esferas de job y
 * sus etiquetas NO colisionen con los agentes del perímetro en móvil.
 */
function jobPos(i: number, total: number, compact: boolean) {
  if (total <= 1) return { x: CENTER, y: CENTER };
  const jr = (total <= 4 ? 13 : 16) * (compact ? 0.7 : 1);
  const angle = (-90 + (360 / total) * i) * (Math.PI / 180);
  return {
    x: CENTER + jr * Math.cos(angle),
    y: CENTER + jr * Math.sin(angle),
  };
}

/** "hace N días/h" para el rótulo sutil de un agente en reposo. */
function agoLabel(iso: string | null): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  const ms = Date.now() - t;
  const days = Math.floor(ms / 86_400_000);
  if (days >= 1) return `hace ${days}d`;
  const hrs = Math.floor(ms / 3_600_000);
  return hrs >= 1 ? `hace ${hrs}h` : "hace minutos";
}

/** Haz de energía con partículas que viajan de un job hacia SU agente. */
function EnergyBeam({
  from,
  to,
  hue,
}: {
  from: { x: number; y: number };
  to: { x: number; y: number };
  hue: string;
}) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return (
    <g>
      <line
        x1={from.x}
        y1={from.y}
        x2={to.x}
        y2={to.y}
        stroke={hue}
        strokeWidth={0.7}
        strokeOpacity={0.85}
        strokeLinecap="round"
      />
      <motion.line
        x1={from.x}
        y1={from.y}
        x2={to.x}
        y2={to.y}
        stroke={hue}
        strokeWidth={1}
        strokeLinecap="round"
        strokeDasharray="2 6"
        initial={{ strokeDashoffset: 0 }}
        animate={{ strokeDashoffset: [-8, 0] }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      />
      {[0, 1, 2].map((i) => (
        <motion.circle
          key={i}
          r={0.9}
          fill={hue}
          initial={{ cx: from.x, cy: from.y, opacity: 0 }}
          animate={{
            cx: [from.x, to.x],
            cy: [from.y, to.y],
            opacity: [0, 1, 1, 0],
          }}
          transition={{
            duration: 1.6,
            repeat: Infinity,
            ease: "easeIn",
            delay: i * 0.53,
          }}
          style={{ filter: `drop-shadow(0 0 1.4px ${hue})` }}
        />
      ))}
    </g>
  );
}

/** Nodo de un AGENTE en la órbita — con su logo oficial monocromo. */
function AgentNode({
  esfera,
  pos,
  working,
  dim,
  compact,
}: {
  esfera: EsferaState;
  pos: { x: number; y: number };
  working: boolean;
  dim: boolean;
  compact: boolean;
}) {
  const Logo = AGENT_LOGOS[esfera.id];
  const pending = !working && esfera.status === "pending";
  const hue = HUE[esfera.id] ?? ACCENT;

  return (
    <motion.div
      animate={{ opacity: dim ? 0.28 : 1, scale: dim ? 0.92 : 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
    >
      <div className="flex flex-col items-center gap-1.5">
        <motion.div
          animate={
            working
              ? { boxShadow: [`0 0 0px ${hue}00`, `0 0 24px ${hue}cc`, `0 0 0px ${hue}00`] }
              : {}
          }
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          className="relative grid h-12 w-12 place-items-center rounded-2xl border backdrop-blur-md md:h-14 md:w-14"
          style={{
            borderColor: working ? `${hue}66` : pending ? `${hue}33` : "rgba(255,255,255,0.10)",
            background: working
              ? `radial-gradient(circle at 50% 35%, ${hue}33, rgba(10,10,15,0.85))`
              : "rgba(255,255,255,0.04)",
          }}
        >
          {/* Logo oficial: hereda el color del estado vía currentColor */}
          <Logo
            size={22}
            style={{ color: working ? hue : pending ? `${hue}aa` : "rgba(255,255,255,0.42)" }}
          />
          <span
            className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-[#0a0a0f]"
            style={{
              background: working ? hue : pending ? `${hue}88` : "#6b7280",
              boxShadow: working ? `0 0 8px ${hue}` : "none",
            }}
          />
          {pending && (
            <motion.span
              className="absolute inset-0 rounded-2xl border"
              style={{ borderColor: `${hue}55` }}
              animate={{ opacity: [0.2, 0.7, 0.2] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            />
          )}
        </motion.div>

        <div className="text-center leading-tight">
          <p
            className="text-[11px] font-semibold md:text-xs"
            style={{ color: working ? "#fff" : "rgba(255,255,255,0.55)" }}
          >
            {esfera.name}
          </p>
          {/* ANTI-STALE: en reposo NO se pinta tag de trabajo presente; solo un
              rastro sutil del último job ya cerrado, si lo hubo. En móvil
              angosto (compact) se omite: colisiona con las esferas del centro. */}
          {!compact && !working && !pending && esfera.lastProject && (
            <p
              className="mt-0.5 max-w-[88px] truncate text-[8px] text-white/30 md:max-w-[104px]"
              title={`último: ${esfera.lastProject}`}
            >
              último: {esfera.lastProject}
              {agoLabel(esfera.lastSince) ? ` · ${agoLabel(esfera.lastSince)}` : ""}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/** Esfera de un JOB activo en el centro — orbe Vulcano + tag de proyecto. */
function JobSphere({
  job,
  pos,
  size,
  dim,
  compact,
  showTag,
}: {
  job: ActiveJob;
  pos: { x: number; y: number };
  size: number;
  dim: boolean;
  compact: boolean;
  /** En móvil con 3+ jobs el tag de proyecto se omite (colisiona en el anillo);
      el detalle completo vive en la lista "Quién trabaja en qué" justo debajo. */
  showTag: boolean;
}) {
  const hue = (job.agent && HUE[job.agent]) || ACCENT;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: dim ? 0.3 : 1, scale: dim ? 0.9 : 1 }}
      exit={{ opacity: 0, scale: 0.6 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
    >
      <div className="flex flex-col items-center">
        <VulcanoCore size={size} accent={hue} driving />
        {((job.project && showTag) || typeof job.progress === "number") && (
          <div className="mt-1 flex flex-col items-center gap-0.5 text-center">
            {job.project && showTag && (
              <span
                className={`${compact ? "max-w-[72px] text-[8px]" : "max-w-[110px] text-[9px] md:max-w-[130px]"} truncate rounded-full border px-1.5 py-0.5 font-medium`}
                style={{ borderColor: `${hue}40`, color: hue, background: `${hue}14` }}
                title={`${job.agentName} · ${job.project}${job.task ? ` · ${job.task}` : ""}`}
              >
                {job.project}
              </span>
            )}
            {typeof job.progress === "number" && (
              <span className="text-[9px] font-medium text-white/55">{job.progress}%</span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function EsferasNucleo({
  data,
  selectedProject = null,
  error = false,
}: {
  /** Controlado: el padre (Taller) pasa el payload. Omitido: auto-fetch (cockpit). */
  data?: EsferasPayload | null;
  selectedProject?: string | null;
  error?: boolean;
}) {
  // Modo controlado vs autónomo (retrocompat con el cockpit que lo usa sin props).
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

  // Jobs visibles según el proyecto seleccionado.
  const jobs = useMemo(
    () =>
      selectedProject
        ? allJobs.filter((j) => j.projectKey === selectedProject)
        : allJobs,
    [allJobs, selectedProject],
  );

  // El núcleo/jobs/órbita deben ESCALAR con el lienzo para no colisionar en
  // móvil. Medimos el ancho real del cuadro y derivamos el radio responsive.
  const boxRef = useRef<HTMLDivElement>(null);
  const [boxW, setBoxW] = useState(360);
  useEffect(() => {
    const el = boxRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setBoxW(Math.round(w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const radius = radiusForBox(boxW);
  // Viewport angosto (≈360–390px): el lienzo real ronda 290px, así que el
  // anillo central de jobs y el perímetro de agentes están muy juntos. En
  // compact apretamos el centro, achicamos esferas/tags y ocultamos sublíneas.
  const compact = boxW < 380;

  // Posiciones de los agentes en la órbita (orden estable de la API).
  const agentPositions = useMemo(
    () => esferas.map((_, i) => agentPos(i, esferas.length || 1, radius)),
    [esferas, radius],
  );
  const agentPosById = useMemo(() => {
    const m = new Map<EsferaId, { x: number; y: number }>();
    esferas.forEach((e, i) => agentPositions[i] && m.set(e.id, agentPositions[i]));
    return m;
  }, [esferas, agentPositions]);

  // ¿Qué agentes están encendidos? Los que ejecutan algún job visible.
  const activeAgents = useMemo(() => {
    const s = new Set<EsferaId>();
    for (const j of jobs) if (j.agent) s.add(j.agent);
    return s;
  }, [jobs]);

  const isWorking = (e: EsferaState) => activeAgents.has(e.id);
  const isDim = (e: EsferaState) =>
    Boolean(selectedProject) && !activeAgents.has(e.id) && e.status !== "pending";

  const activos = jobs.length;
  const totalWorking = allJobs.length;

  // Glow ambiental proporcional a la actividad.
  const glowOpacity = Math.min(0.25 + activos * 0.14, 0.78);

  const n = jobs.length;
  const jobSize =
    n <= 1
      ? Math.max(72, Math.min(132, Math.round(boxW * (compact ? 0.22 : 0.24))))
      : n <= 4
        ? Math.max(46, Math.min(98, Math.round(boxW * (compact ? 0.13 : 0.16))))
        : Math.max(38, Math.min(78, Math.round(boxW * (compact ? 0.1 : 0.12))));
  const idleSize = Math.max(64, Math.min(140, Math.round(boxW * 0.26)));

  return (
    <section className="glass relative overflow-hidden rounded-2xl border border-white/10 p-4 sm:p-5">
      <motion.div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[130%] w-[130%] -translate-x-1/2 -translate-y-1/2"
        animate={{ opacity: [glowOpacity * 0.7, glowOpacity, glowOpacity * 0.7] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        style={{
          background: `radial-gradient(circle at 50% 45%, ${ACCENT}1f 0%, #a78bfa12 35%, transparent 60%)`,
        }}
      />

      <div className="relative mb-1 flex items-center justify-between">
        <p className="label-caps flex items-center gap-1.5 text-cyber-cyan">
          <IconActivity size={13} /> Núcleo de operaciones
        </p>
        <span className="chip text-[10px] text-emerald-600 dark:text-emerald-300">
          {activos} {activos === 1 ? "esfera" : "esferas"}
        </span>
      </div>
      <p className="relative mb-2 text-[12px] text-muted">
        Una esfera por job corriendo ahora mismo — cada haz conecta el job con su agente.
      </p>

      {/* Lienzo orbital — escala mobile-first: cuadro fluido que nunca desborda */}
      <div
        ref={boxRef}
        className="relative mx-auto aspect-square w-full max-w-[340px] sm:max-w-[440px] lg:max-w-[520px]"
      >
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" fill="none" aria-hidden>
          {/* Anillo orbital sutil */}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={radius}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={0.3}
            strokeDasharray="1.5 2.5"
          />
          {/* Líneas base hacia agentes en reposo */}
          {esferas.map((e, i) => {
            const p = agentPositions[i];
            if (!p || isWorking(e)) return null;
            return (
              <line
                key={`base-${e.id}`}
                x1={CENTER}
                y1={CENTER}
                x2={p.x}
                y2={p.y}
                stroke="rgba(255,255,255,0.08)"
                strokeWidth={0.35}
                strokeOpacity={isDim(e) ? 0.25 : 0.5}
              />
            );
          })}
          {/* Haces de energía: cada job conectado con SU agente */}
          {jobs.map((j, i) => {
            const from = jobPos(i, n, compact);
            const to = j.agent ? agentPosById.get(j.agent) : undefined;
            if (!to) return null;
            return (
              <EnergyBeam
                key={`beam-${j.id}`}
                from={from}
                to={to}
                hue={(j.agent && HUE[j.agent]) || ACCENT}
              />
            );
          })}
        </svg>

        {/* Centro: idle core cuando no hay jobs; si no, una esfera por job */}
        {n === 0 ? (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <VulcanoCore size={idleSize} accent={ACCENT} driving={false} />
          </div>
        ) : (
          jobs.map((j, i) => (
            <JobSphere
              key={`job-${j.id}`}
              job={j}
              pos={jobPos(i, n, compact)}
              size={jobSize}
              dim={false}
              compact={compact}
              showTag={!compact || n <= 2}
            />
          ))
        )}

        {/* Nodos de agentes en la órbita */}
        {esferas.map((e, i) =>
          agentPositions[i] ? (
            <AgentNode
              key={e.id}
              esfera={e}
              pos={agentPositions[i]}
              working={isWorking(e)}
              dim={isDim(e)}
              compact={compact}
            />
          ) : null,
        )}

        {/* Estado vacío / error */}
        {esferas.length === 0 && (
          <div className="absolute inset-0 grid place-items-center">
            <p className="text-sm text-muted">
              {err ? "No se pudo leer el estado de las esferas." : "Cargando núcleo…"}
            </p>
          </div>
        )}
      </div>

      {totalWorking === 0 && esferas.length > 0 && (
        <p className="relative mt-2 text-center text-[11px] text-white/35">
          Esferas en reposo — ningún job corriendo ahora mismo.
        </p>
      )}
    </section>
  );
}
