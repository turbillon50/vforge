"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { IconActivity } from "@/components/brand/VFIcons";
import { AGENT_LOGOS, LogoGrok } from "@/components/brand/AgentLogos";
import type { UtilizacionPayload } from "@/lib/cockpit/utilizacion";
import type { EsferaId } from "@/components/cockpit/esferas-types";

const HUE: Record<string, string> = {
  claude: "#a78bfa",
  codex: "#22d3ee",
  grok: "#f472b6",
  shell: "#34d399",
  browser: "#38bdf8",
};

const POLL_MS = 8000;

/** Segundos → "Xh Ym" / "Ym" / "—". */
function fmtDur(secs: number): string {
  if (!secs || secs < 60) return secs > 0 ? `${Math.round(secs)}s` : "—";
  const m = Math.round(secs / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm ? `${h}h ${rm}m` : `${h}h`;
}

/**
 * Panel de utilización: barra por agente con % de ocupación de las últimas 24h
 * (de marcas started_at/completed_at REALES) y contador de trabajo útil. CERO mock:
 * si el endpoint no responde o no hay datos, lo dice honestamente.
 */
export function UtilizacionPanel() {
  const [data, setData] = useState<UtilizacionPayload | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/cockpit/utilizacion", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((j: UtilizacionPayload) => {
          if (alive) {
            setData(j);
            setError(false);
          }
        })
        .catch(() => alive && setError(true));
    load();
    const t = setInterval(load, POLL_MS);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const agents = data?.agents ?? [];
  const maxPct = Math.max(1, ...agents.map((a) => a.occupancyPct));

  return (
    <section className="glass relative overflow-hidden rounded-2xl border border-white/10 p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="label-caps flex items-center gap-1.5 text-cyber-cyan">
          <IconActivity size={13} /> Utilización · últimas 24h
        </p>
        <div className="flex items-center gap-2">
          {data?.backlog && (
            <span
              className="chip text-[10px] text-muted"
              title={`${data.backlog.activos} activos · ${data.backlog.recurrentes} recurrentes · ${data.backlog.unaVezPendientes} una-vez pendientes`}
            >
              Reserva: {data.backlog.activos}
            </span>
          )}
          <span className="text-right">
            <span className="block font-display text-2xl font-bold text-emerald-300">
              {data?.utilDone ?? 0}
            </span>
            <span className="label-caps block text-[9px] text-muted">trabajo útil</span>
          </span>
        </div>
      </div>

      <div className="mt-4 space-y-2.5">
        {agents.map((a) => {
          const hue = HUE[a.id] || "#22d3ee";
          const Logo = AGENT_LOGOS[a.id as EsferaId] ?? LogoGrok;
          // El ancho relativo escala al máximo del periodo para que las barras
          // pequeñas sean visibles; el número muestra el % absoluto real.
          const w = Math.max(a.occupancyPct > 0 ? 4 : 0, (a.occupancyPct / maxPct) * 100);
          return (
            <div key={a.id} className="flex items-center gap-3">
              <div
                className="grid h-8 w-8 flex-none place-items-center rounded-lg border"
                style={{
                  borderColor: `${hue}55`,
                  background: `radial-gradient(circle at 50% 35%, ${hue}2e, rgba(10,10,15,0.85))`,
                }}
              >
                <Logo size={15} style={{ color: hue }} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-[12px] font-semibold text-on-surface">
                    {a.name}
                    {a.runningNow && (
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: hue, boxShadow: `0 0 7px ${hue}` }}
                        title="Trabajando ahora"
                      />
                    )}
                  </span>
                  <span className="flex-none text-[11px] text-muted">
                    <span style={{ color: hue }}>{a.occupancyPct}%</span> · {a.doneCount} jobs
                    {a.failedCount > 0 && (
                      <span className="text-rose-300"> · {a.failedCount} fallo{a.failedCount > 1 ? "s" : ""}</span>
                    )}
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/[0.05]">
                  <motion.div
                    className="h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${w}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    style={{
                      background: `linear-gradient(90deg, ${hue}, ${hue}aa)`,
                      boxShadow: a.occupancyPct > 0 ? `0 0 10px ${hue}66` : "none",
                    }}
                  />
                </div>
                <p className="mt-0.5 text-[10px] text-muted">{fmtDur(a.busySeconds)} ocupado</p>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-[10px] text-muted">
        {error
          ? "Sin señal del daemon — reintentando."
          : data?.source === "empty"
            ? "Sin actividad registrada en la ventana."
            : "Ocupación calculada de marcas reales started_at/completed_at. Sin estimaciones."}
      </p>
    </section>
  );
}
