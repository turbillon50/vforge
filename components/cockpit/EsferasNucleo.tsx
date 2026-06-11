"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { VulcanoCore } from "@/components/vulcano/VulcanoCore";
import {
  IconActivity,
  IconBrain,
  IconCode,
  IconCpu,
  IconGlobe,
} from "@/components/brand/VFIcons";
import type { EsferasPayload, EsferaState } from "@/components/cockpit/esferas-types";

const ACCENT = "#22d3ee";

const ICONS: Record<string, typeof IconBrain> = {
  claude: IconBrain,
  codex: IconCode,
  grok: IconCpu,
  shell: IconActivity,
  browser: IconGlobe,
};

/** Color de acento por esfera para diferenciar nodos cuando trabajan. */
const HUE: Record<string, string> = {
  claude: "#a78bfa", // violet
  codex: "#22d3ee", // cyan
  grok: "#f472b6", // pink
  shell: "#34d399", // emerald
  browser: "#38bdf8", // sky
};

// Geometría: lienzo cuadrado 100×100, núcleo en el centro, esferas en órbita.
const CENTER = 50;
const RADIUS = 37;

function nodePos(i: number, total: number) {
  const angle = (-90 + (360 / total) * i) * (Math.PI / 180);
  return {
    x: CENTER + RADIUS * Math.cos(angle),
    y: CENTER + RADIUS * Math.sin(angle),
  };
}

/** Haz de energía con partículas que viajan núcleo → esfera mientras trabaja. */
function EnergyBeam({
  pos,
  hue,
}: {
  pos: { x: number; y: number };
  hue: string;
}) {
  const dx = pos.x - CENTER;
  const dy = pos.y - CENTER;
  return (
    <g>
      {/* Haz base brillante */}
      <line
        x1={CENTER}
        y1={CENTER}
        x2={pos.x}
        y2={pos.y}
        stroke={hue}
        strokeWidth={0.7}
        strokeOpacity={0.85}
        strokeLinecap="round"
      />
      {/* Pulso que recorre el haz */}
      <motion.line
        x1={CENTER}
        y1={CENTER}
        x2={pos.x}
        y2={pos.y}
        stroke={hue}
        strokeWidth={1}
        strokeLinecap="round"
        strokeDasharray="2 6"
        initial={{ strokeDashoffset: 0 }}
        animate={{ strokeDashoffset: [-8, 0] }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      />
      {/* Partículas núcleo → esfera */}
      {[0, 1, 2].map((i) => (
        <motion.circle
          key={i}
          r={0.9}
          fill={hue}
          initial={{ cx: CENTER, cy: CENTER, opacity: 0 }}
          animate={{
            cx: [CENTER, CENTER + dx],
            cy: [CENTER, CENTER + dy],
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

function EsferaNode({
  esfera,
  pos,
  dim,
}: {
  esfera: EsferaState;
  pos: { x: number; y: number };
  dim: boolean;
}) {
  const Icon = ICONS[esfera.id] ?? IconCpu;
  const working = esfera.status === "working";
  const pending = esfera.status === "pending";
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
          <Icon size={22} style={{ color: working ? hue : pending ? `${hue}aa` : "rgba(255,255,255,0.42)" }} />
          {/* Punto de estado */}
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
          {(working || pending) && esfera.project ? (
            <p
              className="mt-0.5 max-w-[92px] truncate rounded-full border px-1.5 py-0.5 text-[9px] font-medium md:max-w-[110px]"
              style={{ borderColor: `${hue}40`, color: hue, background: `${hue}14` }}
              title={`${esfera.project}${esfera.task ? ` · ${esfera.task}` : ""}`}
            >
              {esfera.project}
            </p>
          ) : (
            <p className="mt-0.5 text-[9px] text-white/30">en reposo</p>
          )}
        </div>
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
  const positions = useMemo(
    () => esferas.map((_, i) => nodePos(i, esferas.length || 1)),
    [esferas],
  );

  // ¿Una esfera está "encendida" para la selección actual?
  const isOn = (e: EsferaState) =>
    e.status === "working" &&
    (!selectedProject || e.projectKey === selectedProject);
  const isDim = (e: EsferaState) =>
    Boolean(selectedProject) && e.projectKey !== selectedProject && e.status !== "idle";

  const activos = esferas.filter(isOn).length;
  const totalWorking = esferas.filter((e) => e.status === "working").length;

  // Glow ambiental proporcional a la actividad.
  const glowOpacity = Math.min(0.25 + activos * 0.14, 0.75);

  // El núcleo central debe ESCALAR con el lienzo: en móvil el cuadro encoge y un
  // orbe de px fijos se encimaba con las esferas. Medimos el ancho real y
  // derivamos un tamaño proporcional para que orbe y esferas nunca colisionen.
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
  const coreSize = Math.max(64, Math.min(140, Math.round(boxW * 0.26)));

  return (
    <section className="glass relative overflow-hidden rounded-2xl border border-white/10 p-4 sm:p-5">
      {/* Glow ambiental proporcional a la actividad */}
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
          {activos} {activos === 1 ? "activa" : "activas"}
        </span>
      </div>
      <p className="relative mb-2 text-[12px] text-muted">
        Cómo operan las esferas Vulcano en tiempo real — qué construye cada una ahora mismo.
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
            r={RADIUS}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={0.3}
            strokeDasharray="1.5 2.5"
          />
          {/* Líneas en reposo (esferas idle / fuera de selección) */}
          {esferas.map((e, i) => {
            const p = positions[i];
            if (!p || isOn(e)) return null;
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
          {/* Haces de energía con partículas (esferas encendidas) */}
          {esferas.map((e, i) => {
            const p = positions[i];
            if (!p || !isOn(e)) return null;
            return <EnergyBeam key={`beam-${e.id}`} pos={p} hue={HUE[e.id] ?? ACCENT} />;
          })}
        </svg>

        {/* Núcleo central — pulso por actividad */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <VulcanoCore size={coreSize} accent={ACCENT} driving={totalWorking > 0} />
        </div>

        {/* Nodos de esferas */}
        {esferas.map((e, i) =>
          positions[i] ? (
            <EsferaNode key={e.id} esfera={e} pos={positions[i]} dim={isDim(e)} />
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
    </section>
  );
}
