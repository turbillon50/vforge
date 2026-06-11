"use client";

import { useEffect, useMemo, useState } from "react";
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

function elapsed(since: string | null): string | null {
  if (!since) return null;
  const ms = Date.now() - new Date(since).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  const m = Math.floor(ms / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return `${h} h`;
}

// Geometría: lienzo cuadrado 100×100, núcleo en el centro, esferas en órbita.
const CENTER = 50;
const RADIUS = 37;

function nodePos(i: number, total: number) {
  // Arranca arriba (-90°) y reparte en círculo completo.
  const angle = (-90 + (360 / total) * i) * (Math.PI / 180);
  return {
    x: CENTER + RADIUS * Math.cos(angle),
    y: CENTER + RADIUS * Math.sin(angle),
  };
}

function EsferaNode({
  esfera,
  pos,
}: {
  esfera: EsferaState;
  pos: { x: number; y: number };
}) {
  const Icon = ICONS[esfera.id] ?? IconCpu;
  const working = esfera.status === "working";
  const hue = HUE[esfera.id] ?? ACCENT;

  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
    >
      <div className="flex flex-col items-center gap-1.5">
        <motion.div
          animate={
            working
              ? { boxShadow: [`0 0 0px ${hue}00`, `0 0 22px ${hue}cc`, `0 0 0px ${hue}00`] }
              : {}
          }
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          className="relative grid h-12 w-12 place-items-center rounded-2xl border backdrop-blur-md md:h-14 md:w-14"
          style={{
            borderColor: working ? `${hue}66` : "rgba(255,255,255,0.10)",
            background: working
              ? `radial-gradient(circle at 50% 35%, ${hue}33, rgba(10,10,15,0.85))`
              : "rgba(255,255,255,0.04)",
          }}
        >
          <Icon
            size={22}
            style={{ color: working ? hue : "rgba(255,255,255,0.42)" }}
          />
          {/* Punto de estado */}
          <span
            className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-[#0a0a0f]"
            style={{
              background: working ? hue : "#6b7280",
              boxShadow: working ? `0 0 8px ${hue}` : "none",
            }}
          />
        </motion.div>

        <div className="text-center leading-tight">
          <p
            className="text-[11px] font-semibold md:text-xs"
            style={{ color: working ? "#fff" : "rgba(255,255,255,0.55)" }}
          >
            {esfera.name}
          </p>
          {working && esfera.project ? (
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
    </div>
  );
}

export function EsferasNucleo() {
  const [data, setData] = useState<EsferasPayload | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/cockpit/esferas", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((j: EsferasPayload) => {
          if (alive) {
            setData(j);
            setError(false);
          }
        })
        .catch(() => alive && setError(true));
    load();
    const t = setInterval(load, 8000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const esferas = data?.esferas ?? [];
  const positions = useMemo(
    () => esferas.map((_, i) => nodePos(i, esferas.length || 1)),
    [esferas.length],
  );
  const activos = esferas.filter((e) => e.status === "working").length;

  return (
    <section className="glass relative overflow-hidden rounded-2xl border border-white/10 p-5">
      {/* Glow ambiental */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[120%] w-[120%] -translate-x-1/2 -translate-y-1/2 opacity-60"
        style={{
          background: `radial-gradient(circle at 50% 45%, ${ACCENT}14 0%, transparent 55%)`,
        }}
      />

      <div className="relative mb-1 flex items-center justify-between">
        <p className="label-caps flex items-center gap-1.5 text-cyber-cyan">
          <IconActivity size={13} /> Núcleo de operaciones
        </p>
        <div className="flex items-center gap-2">
          {data?.source === "mock" && (
            <span className="chip text-[10px] text-amber-600 dark:text-amber-300">demo</span>
          )}
          <span className="chip text-[10px] text-emerald-600 dark:text-emerald-300">
            {activos} activas
          </span>
        </div>
      </div>
      <p className="relative mb-2 text-[12px] text-muted">
        Cómo operan las esferas Vulcano en tiempo real — qué construye cada una ahora mismo.
      </p>

      {/* Lienzo orbital */}
      <div className="relative mx-auto aspect-square w-full max-w-[520px]">
        {/* Líneas de energía núcleo → esfera */}
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          fill="none"
          aria-hidden
        >
          <defs>
            <radialGradient id="esfera-line" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={ACCENT} stopOpacity="0.8" />
              <stop offset="100%" stopColor={ACCENT} stopOpacity="0.15" />
            </radialGradient>
          </defs>
          {esferas.map((e, i) => {
            const p = positions[i];
            if (!p) return null;
            const working = e.status === "working";
            const hue = HUE[e.id] ?? ACCENT;
            return (
              <g key={e.id}>
                {/* Anillo orbital sutil (solo una vez, en el primer índice) */}
                {i === 0 && (
                  <circle
                    cx={CENTER}
                    cy={CENTER}
                    r={RADIUS}
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth={0.3}
                    strokeDasharray="1.5 2.5"
                  />
                )}
                <line
                  x1={CENTER}
                  y1={CENTER}
                  x2={p.x}
                  y2={p.y}
                  stroke={working ? hue : "rgba(255,255,255,0.10)"}
                  strokeWidth={working ? 0.7 : 0.4}
                  strokeOpacity={working ? 0.85 : 0.5}
                />
                {working && (
                  <motion.line
                    x1={CENTER}
                    y1={CENTER}
                    x2={p.x}
                    y2={p.y}
                    stroke={hue}
                    strokeWidth={0.9}
                    strokeLinecap="round"
                    strokeDasharray="2 6"
                    initial={{ strokeDashoffset: 0 }}
                    animate={{ strokeDashoffset: [-8, 0] }}
                    transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
                  />
                )}
              </g>
            );
          })}
        </svg>

        {/* Núcleo central */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <VulcanoCore size={120} accent={ACCENT} driving={activos > 0} />
        </div>

        {/* Nodos de esferas */}
        {esferas.map((e, i) =>
          positions[i] ? <EsferaNode key={e.id} esfera={e} pos={positions[i]} /> : null,
        )}

        {/* Estado vacío / error */}
        {esferas.length === 0 && (
          <div className="absolute inset-0 grid place-items-center">
            <p className="text-sm text-muted">
              {error ? "No se pudo leer el estado de las esferas." : "Cargando núcleo…"}
            </p>
          </div>
        )}
      </div>

      {/* Detalle de trabajo activo */}
      {activos > 0 && (
        <div className="relative mt-3 space-y-1.5 border-t border-white/5 pt-3">
          {esferas
            .filter((e) => e.status === "working")
            .map((e) => {
              const hue = HUE[e.id] ?? ACCENT;
              const t = elapsed(e.since);
              return (
                <div key={e.id} className="flex items-center gap-2 text-[12px]">
                  <span
                    className="h-1.5 w-1.5 flex-none rounded-full"
                    style={{ background: hue, boxShadow: `0 0 6px ${hue}` }}
                  />
                  <span className="font-medium text-on-surface">{e.name}</span>
                  <span className="text-muted">→</span>
                  <span className="truncate text-on-surface">{e.task || e.project}</span>
                  {t && <span className="ml-auto flex-none text-muted">{t}</span>}
                </div>
              );
            })}
        </div>
      )}
    </section>
  );
}
