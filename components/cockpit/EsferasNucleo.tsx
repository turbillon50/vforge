"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { VulcanoCore } from "@/components/vulcano/VulcanoCore";
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
 * Sentido del haz de energía:
 *  - "dispatch" → el NÚCLEO despacha trabajo al agente (núcleo → agente).
 *  - "report"   → el agente reporta/termina hacia el núcleo (agente → núcleo).
 * Se deriva de datos REALES: un job recién despachado fluye hacia el agente;
 * cuando ya tiene veredicto Grok o avance alto, el agente reporta de vuelta.
 */
type FlowDir = "dispatch" | "report";

function flowDirection(job: ActiveJob): FlowDir {
  if (job.grokVerdict) return "report";
  if (typeof job.progress === "number" && job.progress >= 80) return "report";
  return "dispatch";
}

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

type Pt = { x: number; y: number };

/** Punto sobre una curva de Bézier cuadrática P0→C→P1 en el parámetro t∈[0,1]. */
function quadAt(p0: Pt, c: Pt, p1: Pt, t: number): Pt {
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * c.x + t * t * p1.x,
    y: u * u * p0.y + 2 * u * t * c.y + t * t * p1.y,
  };
}

/** Ángulo (grados) de la tangente de la Bézier en t — orienta la flecha al hilo. */
function quadTangentAngle(p0: Pt, c: Pt, p1: Pt, t: number): number {
  const dx = 2 * (1 - t) * (c.x - p0.x) + 2 * t * (p1.x - c.x);
  const dy = 2 * (1 - t) * (c.y - p0.y) + 2 * t * (p1.y - c.y);
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

/**
 * Geometría del haz CALIBRADA: ancla del BORDE de la esfera (origen) al BORDE
 * del icono del agente (destino), nunca a sus centros — así el hilo no cruza por
 * encima del orbe ni del logo. Devuelve los dos extremos visibles + un punto de
 * control para una curva suave (bow consistente, sentido antihorario).
 */
function beamGeometry(job: Pt, agent: Pt, sphereR: number, iconR: number, bowSign: number) {
  const dx = agent.x - job.x;
  const dy = agent.y - job.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const aJob = { x: job.x + ux * sphereR, y: job.y + uy * sphereR };
  const aAgent = { x: agent.x - ux * iconR, y: agent.y - uy * iconR };
  const sx = aAgent.x - aJob.x;
  const sy = aAgent.y - aJob.y;
  const seg = Math.hypot(sx, sy);
  // Si el orbe y el icono casi se tocan, no hay hilo que dibujar.
  if (seg < 2) return null;
  const mx = (aJob.x + aAgent.x) / 2;
  const my = (aJob.y + aAgent.y) / 2;
  // Normal 90° (CCW) para curvar; magnitud suave acotada.
  const nx = -sy / seg;
  const ny = sx / seg;
  const bow = Math.min(seg * 0.16, 7) * bowSign;
  return { aJob, aAgent, ctrl: { x: mx + nx * bow, y: my + ny * bow }, len: seg };
}

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

/**
 * Haz de energía DIRECCIONAL entre un job y SU agente, ya CALIBRADO: recibe los
 * extremos anclados a los bordes (tail = origen del flujo, head = destino) y un
 * punto de control para curvarlo suave. Las partículas siguen la curva (muestreo
 * de la Bézier), el gradiente va de cola tenue a cabeza brillante y la flecha se
 * orienta con la tangente, anclada ANTES del nodo para no taparlo.
 */
function EnergyBeam({
  id,
  tail,
  head,
  control,
  hue,
  dir,
}: {
  id: number;
  tail: Pt;
  head: Pt;
  control: Pt;
  hue: string;
  dir: FlowDir;
}) {
  const gid = `beamgrad-${id}-${dir}`;
  const d = `M ${tail.x} ${tail.y} Q ${control.x} ${control.y} ${head.x} ${head.y}`;
  // Partículas: muestreo de la curva para que viajen tail→head SOBRE el hilo.
  const ts = [0, 0.25, 0.5, 0.75, 1];
  const xs = ts.map((t) => quadAt(tail, control, head, t).x);
  const ys = ts.map((t) => quadAt(tail, control, head, t).y);
  // Flecha: punto y tangente en t≈0.86 (antes de la cabeza, ya en el borde).
  const arrowAt = quadAt(tail, control, head, 0.86);
  const arrowAng = quadTangentAngle(tail, control, head, 0.86);

  return (
    <g>
      <defs>
        <linearGradient
          id={gid}
          gradientUnits="userSpaceOnUse"
          x1={tail.x}
          y1={tail.y}
          x2={head.x}
          y2={head.y}
        >
          <stop offset="0%" stopColor={hue} stopOpacity={0.08} />
          <stop offset="100%" stopColor={hue} stopOpacity={0.95} />
        </linearGradient>
      </defs>

      {/* Riel base curvo con gradiente cola→cabeza */}
      <path d={d} fill="none" stroke={`url(#${gid})`} strokeWidth={0.8} strokeLinecap="round" />

      {/* Trazo punteado que avanza hacia la cabeza (refuerza el sentido) */}
      <motion.path
        d={d}
        fill="none"
        stroke={hue}
        strokeWidth={1}
        strokeOpacity={0.9}
        strokeLinecap="round"
        strokeDasharray="2 6"
        initial={{ strokeDashoffset: 16 }}
        animate={{ strokeDashoffset: 0 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      />

      {/* Partículas viajando tail→head a lo largo de la curva */}
      {[0, 1].map((i) => (
        <motion.circle
          key={i}
          r={0.95}
          fill={hue}
          initial={{ cx: tail.x, cy: tail.y, opacity: 0 }}
          animate={{ cx: xs, cy: ys, opacity: [0, 1, 1, 1, 0] }}
          transition={{
            duration: 1.6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.8,
          }}
          style={{ filter: `drop-shadow(0 0 1.6px ${hue})` }}
        />
      ))}

      {/* Punta de flecha sobre la curva, antes del nodo — sentido inequívoco */}
      <polygon
        points="0,0 -2.6,-1.5 -2.6,1.5"
        fill={hue}
        transform={`translate(${arrowAt.x} ${arrowAt.y}) rotate(${arrowAng})`}
        style={{ filter: `drop-shadow(0 0 1.4px ${hue})` }}
      />
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
  onSelect,
}: {
  esfera: EsferaState;
  pos: { x: number; y: number };
  working: boolean;
  dim: boolean;
  compact: boolean;
  onSelect: () => void;
}) {
  const Logo = AGENT_LOGOS[esfera.id];
  const pending = !working && esfera.status === "pending";
  const hue = HUE[esfera.id] ?? ACCENT;

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileTap={{ scale: 0.92 }}
      animate={{ opacity: dim ? 0.28 : 1, scale: dim ? 0.92 : 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      aria-label={`Ver detalle del agente ${esfera.name}`}
      className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer"
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
            borderColor: working ? `${hue}66` : pending ? `${hue}33` : "var(--border-2)",
            background: working
              ? `radial-gradient(circle at 50% 35%, ${hue}33, rgba(10,10,15,0.85))`
              : "var(--surface-2)",
          }}
        >
          {/* Logo oficial: hereda el color del estado vía currentColor */}
          <Logo
            size={22}
            style={{ color: working ? hue : pending ? `${hue}aa` : "var(--fg-muted)" }}
          />
          <span
            className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-[var(--color-surface)]"
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
            style={{ color: working ? "var(--fg-primary)" : "var(--fg-tertiary)" }}
          >
            {esfera.name}
          </p>
          {/* ANTI-STALE: en reposo NO se pinta tag de trabajo presente; solo un
              rastro sutil del último job ya cerrado, si lo hubo. En móvil
              angosto (compact) se omite: colisiona con las esferas del centro. */}
          {!compact && !working && !pending && esfera.lastProject && (
            <p
              className="mt-0.5 max-w-[88px] truncate text-[8px] text-[var(--fg-muted)] md:max-w-[104px]"
              title={`último: ${esfera.lastProject}`}
            >
              último: {esfera.lastProject}
              {agoLabel(esfera.lastSince) ? ` · ${agoLabel(esfera.lastSince)}` : ""}
            </p>
          )}
        </div>
      </div>
    </motion.button>
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
  onSelect,
}: {
  job: ActiveJob;
  pos: { x: number; y: number };
  size: number;
  dim: boolean;
  compact: boolean;
  /** En móvil con 3+ jobs el tag de proyecto se omite (colisiona en el anillo);
      el detalle completo vive en la lista "Quién trabaja en qué" justo debajo. */
  showTag: boolean;
  onSelect: () => void;
}) {
  const hue = (job.agent && HUE[job.agent]) || ACCENT;
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileTap={{ scale: 0.92 }}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: dim ? 0.3 : 1, scale: dim ? 0.9 : 1 }}
      exit={{ opacity: 0, scale: 0.6 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      aria-label={`Ver detalle de ${job.agentName}${job.project ? ` · ${job.project}` : ""}`}
      className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer"
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
              <span className="text-[9px] font-medium text-[var(--fg-tertiary)]">{job.progress}%</span>
            )}
          </div>
        )}
      </div>
    </motion.button>
  );
}

export function EsferasNucleo({
  data,
  selectedProject = null,
  focusJobId = null,
  error = false,
}: {
  /** Controlado: el padre (Taller) pasa el payload. Omitido: auto-fetch (cockpit). */
  data?: EsferasPayload | null;
  selectedProject?: string | null;
  /** Zoom-in desde la Constelación: aísla UN job y abre su popup automáticamente. */
  focusJobId?: number | null;
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

  // Jobs visibles según el proyecto seleccionado, y opcionalmente aislados a un
  // único job cuando venimos por zoom-in desde la Constelación.
  const jobs = useMemo(() => {
    let list = selectedProject
      ? allJobs.filter((j) => j.projectKey === selectedProject)
      : allJobs;
    if (focusJobId != null) list = list.filter((j) => j.id === focusJobId);
    return list;
  }, [allJobs, selectedProject, focusJobId]);

  // Popup de detalle: job o agente seleccionado (datos reales del payload).
  const [detail, setDetail] = useState<DetailTarget | null>(null);

  // Zoom-in: abre el popup del job enfocado en cuanto llega/cambia su id.
  useEffect(() => {
    if (focusJobId == null) return;
    const j = allJobs.find((x) => x.id === focusJobId);
    if (j) setDetail({ kind: "job", job: j });
  }, [focusJobId, allJobs]);

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
    (Boolean(selectedProject) || focusJobId != null) &&
    !activeAgents.has(e.id) &&
    e.status !== "pending";

  const activos = jobs.length;
  const totalWorking = allJobs.length;
  // Healthcheck honesto: si el proceso del daemon Vulcano NO está vivo, lo
  // decimos sin rodeos. `daemonAlive===false` es caído confirmado (no "sin
  // lectura"). Las esferas que sigan pintadas son el último estado conocido.
  const daemonPaused = payload?.health?.daemonAlive === false;

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

  // CALIBRACIÓN: radios reales en unidades del viewBox (px → vb = 100/boxW).
  // El haz se ancla al BORDE del orbe (sphereR) y al BORDE del icono (iconR).
  const px2vb = 100 / Math.max(boxW, 1);
  const sphereR = (jobSize / 2) * px2vb + 1.2; // borde del orbe + aire
  const iconHalfPx = boxW >= 440 ? 28 : 24; // h-14 (md) vs h-12
  const iconR = (iconHalfPx + 3) * px2vb; // borde del icono + aire
  const coreR = n === 0 ? (idleSize / 2) * px2vb + 1.2 : 4; // arranque de líneas base

  return (
    <section className="glass relative overflow-hidden rounded-2xl border border-[var(--border-1)] p-4 sm:p-5">
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

      {/* Banner honesto: daemon Vulcano caído → núcleo pausado */}
      {daemonPaused && (
        <div className="relative mb-3 flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2.5">
          <span className="mt-0.5 h-2 w-2 flex-none rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]" />
          <p className="text-[12px] leading-relaxed text-amber-200/90">
            <span className="font-semibold">Núcleo pausado.</span> El daemon
            Vulcano no está vivo ahora mismo — no se está despachando trabajo. Lo
            que ves es el último estado conocido, no actividad en curso.
          </p>
        </div>
      )}

      {/* Leyenda de dirección del flujo — qué significa cada sentido del haz */}
      {n > 0 && (
        <div className="relative mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-[var(--fg-tertiary)]">
          <span className="inline-flex items-center gap-1.5">
            <svg width="22" height="8" viewBox="0 0 22 8" aria-hidden>
              <line x1="1" y1="4" x2="16" y2="4" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.45" />
              <polygon points="21,4 15,1.4 15,6.6" fill="currentColor" />
            </svg>
            Despachando <span className="text-[var(--fg-muted)]">núcleo → agente</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <svg width="22" height="8" viewBox="0 0 22 8" aria-hidden>
              <line x1="6" y1="4" x2="21" y2="4" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.45" />
              <polygon points="1,4 7,1.4 7,6.6" fill="currentColor" />
            </svg>
            Reportando <span className="text-[var(--fg-muted)]">agente → núcleo</span>
          </span>
        </div>
      )}

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
            stroke="var(--border-2)"
            strokeWidth={0.3}
            strokeDasharray="1.5 2.5"
          />
          {/* Líneas base hacia agentes en reposo — del núcleo al BORDE del icono */}
          {esferas.map((e, i) => {
            const p = agentPositions[i];
            if (!p || isWorking(e)) return null;
            const dx = p.x - CENTER;
            const dy = p.y - CENTER;
            const len = Math.hypot(dx, dy) || 1;
            const ux = dx / len;
            const uy = dy / len;
            return (
              <line
                key={`base-${e.id}`}
                x1={CENTER + ux * coreR}
                y1={CENTER + uy * coreR}
                x2={p.x - ux * iconR}
                y2={p.y - uy * iconR}
                stroke="var(--border-2)"
                strokeWidth={0.35}
                strokeOpacity={isDim(e) ? 0.25 : 0.5}
              />
            );
          })}
          {/* Haces DIRECCIONALES CALIBRADOS: borde del orbe ↔ borde del icono */}
          {jobs.map((j, i) => {
            const from = jobPos(i, n, compact);
            const to = j.agent ? agentPosById.get(j.agent) : undefined;
            if (!to) return null;
            const geo = beamGeometry(from, to, sphereR, iconR, i % 2 === 0 ? 1 : -1);
            if (!geo) return null;
            const dir = flowDirection(j);
            // tail = origen del flujo; head = destino (donde apunta la flecha).
            const tail = dir === "dispatch" ? geo.aJob : geo.aAgent;
            const head = dir === "dispatch" ? geo.aAgent : geo.aJob;
            return (
              <EnergyBeam
                key={`beam-${j.id}`}
                id={j.id}
                tail={tail}
                head={head}
                control={geo.ctrl}
                hue={(j.agent && HUE[j.agent]) || ACCENT}
                dir={dir}
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
              onSelect={() => setDetail({ kind: "job", job: j })}
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
              onSelect={() => setDetail({ kind: "agent", esfera: e })}
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
        <p className="relative mt-2 text-center text-[11px] text-[var(--fg-muted)]">
          Esferas en reposo — ningún job corriendo ahora mismo.
        </p>
      )}

      {/* Popup de detalle con datos reales del job/agente seleccionado */}
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
