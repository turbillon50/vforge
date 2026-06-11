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
import type { EsferasPayload, EsferaState } from "@/components/cockpit/esferas-types";

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

function truncate(s: string | null, n = 48): string {
  if (!s) return "";
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

/** Un número grande que late suavemente cada vez que cambia su valor. */
function LiveMetric({
  value,
  label,
  accent,
}: {
  value: number;
  label: string;
  accent: string;
}) {
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

  const esferas: EsferaState[] = data?.esferas ?? [];
  const working = esferas.filter((e) => e.status === "working");
  const proyectosActivos = useMemo(
    () => new Set(working.map((e) => e.project).filter(Boolean) as string[]).size,
    [working],
  );

  const live = data?.source === "live";

  return (
    <div className="min-h-full">
      <PageHeader
        eyebrow="Operación en vivo"
        title="Taller"
        description="Quién trabaja en qué, ahora mismo. Las esferas Vulcano reportando desde Hetzner en tiempo real."
        actions={
          <span
            className={`chip ${
              error
                ? "text-amber-600 dark:text-amber-300"
                : live
                  ? "text-emerald-600 dark:text-emerald-300"
                  : "text-cyan-600 dark:text-cyan-300"
            }`}
          >
            {error ? "Sin señal" : live ? "En vivo" : "Demo"}
          </span>
        }
      />

      <div className="space-y-6 p-5 md:p-8">
        {/* Hero con asset Higgsfield + overlay obsidian */}
        <div
          className="relative overflow-hidden rounded-2xl border border-white/10"
          style={{ height: 180 }}
        >
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

        {/* Métricas vivas */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <LiveMetric value={working.length} label="Esferas activas" accent="#34d399" />
          <LiveMetric value={proyectosActivos} label="Proyectos activos" accent="#a78bfa" />
          <LiveMetric value={esferas.length} label="Esferas totales" accent="#22d3ee" />
          <LiveMetric
            value={(data?.queue?.pending ?? 0) + working.length}
            label="En cola + activas"
            accent="#f472b6"
          />
        </div>

        {/* Pieza central: animación orbital de las esferas en tiempo real */}
        <div style={{ minHeight: 420 }}>
          <EsferasNucleo />
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
                          boxShadow: [
                            `0 0 0px ${hue}00`,
                            `0 0 16px ${hue}aa`,
                            `0 0 0px ${hue}00`,
                          ],
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
                          <span className="text-[13px] font-semibold text-on-surface">
                            {e.name}
                          </span>
                          {e.project && (
                            <span
                              className="truncate rounded-full border px-2 py-0.5 text-[10px] font-medium"
                              style={{
                                borderColor: `${hue}40`,
                                color: hue,
                                background: `${hue}14`,
                              }}
                            >
                              {e.project}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-[12px] text-muted">
                          {truncate(e.task) || "Tarea en curso"}
                        </p>
                      </div>

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
      </div>
    </div>
  );
}
