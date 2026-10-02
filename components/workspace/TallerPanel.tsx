"use client";
import type React from "react";

import { motion } from "framer-motion";
import {
  IconActivity, IconBranch, IconCheck, IconCpu as _IconCpu, IconDatabase,
  IconGlobe, IconLayers, IconRocket, IconShield, IconSparkles,
} from "@/components/brand/VFIcons";
import { ObsidianLoader } from "@/components/ui/ObsidianLoader";
import { Skeleton } from "@/components/ui/Skeleton";

// ---------------------------------------------------------------------------
// Tipos de datos que el panel recibe por props (vienen de /api/taller).
// ---------------------------------------------------------------------------

export type TallerService = { name: string; status: string };

export type TallerMetrics = {
  servicesOnline?: number | null;
  servicesTotal?: number | null;
  latencyMs?: number | null;
  deploys?: number | null;
  build?: string | null;
  integrations?: number | null;
  secrets?: number | null;
};

export type TallerEvent = {
  label: string;
  tone?: "violet" | "cyan" | "emerald";
  icon?: (props: { size?: number; className?: string; [key: string]: unknown }) => React.ReactElement | null;
};

type Props = {
  live?: boolean;
  loading?: boolean;
  services?: TallerService[];
  metrics?: TallerMetrics;
  events?: TallerEvent[];
};

// Riel de navegación del taller — presentacional, refleja el interior real.
const NAV_ITEMS = [
  { icon: IconSparkles, label: "Conversación", active: true },
  { icon: IconBranch, label: "RepoVisión" },
  { icon: IconRocket, label: "Despliegues" },
  { icon: IconGlobe, label: "Navegador" },
  { icon: IconLayers, label: "Proyectos" },
  { icon: IconShield, label: "Secrets" },
  { icon: IconDatabase, label: "Baúl" },
];

function isOnline(status: string): boolean {
  return /online|active|run|up/i.test(status);
}

export function TallerPanel({
  live = false,
  loading = false,
  services = [],
  metrics = {},
  events = [],
}: Props) {
  const hasServices = services.length > 0;

  return (
    <div className="relative mx-auto w-full max-w-5xl">
      <div className="overflow-hidden rounded-xl border border-[var(--border-1)] bg-white sm:rounded-2xl">
        {/* ---- Barra del panel: blanca, borde gris, sin imagen de fondo ---- */}
        <div className="border-b border-[var(--border-1)] bg-[var(--surface-1)]">
          <div className="flex items-center justify-between gap-2 px-3 py-2.5 sm:px-5 sm:py-3">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="h-2 w-2 rounded-full bg-[#b91c1c] sm:h-2.5 sm:w-2.5" />
              <span className="h-2 w-2 rounded-full bg-[#b45309] sm:h-2.5 sm:w-2.5" />
              <span className="h-2 w-2 rounded-full bg-[#15803d] sm:h-2.5 sm:w-2.5" />
            </div>
            <div className="hidden truncate font-mono text-[12px] text-[var(--fg-muted)] sm:block">
              vforge://workspace/taller
            </div>
            <div
              className="flex items-center gap-1.5 font-mono text-[12px] font-semibold uppercase"
              style={{ color: live ? "#15803d" : "#b45309" }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: live ? "#15803d" : "#b45309" }}
              />
              {live ? "EN VIVO" : "SIN SEÑAL"}
            </div>
          </div>
        </div>

        {/* ---- Cuerpo: 3 columnas ---- */}
        <div className="grid grid-cols-12 gap-0">
          {/* Columna 1 — nav lateral */}
          <div className="col-span-3 hidden border-r border-[var(--border-1)] bg-[var(--surface-1)] p-4 md:block">
            <p className="mb-3 text-[12px] font-medium text-[var(--fg-muted)]">Taller</p>
            {NAV_ITEMS.map((i) => (
              <div
                key={i.label}
                className="mb-1 flex items-center gap-3 rounded-md border px-3 py-2 text-sm"
                style={
                  i.active
                    ? {
                        borderColor: "var(--vf-violet)",
                        background: "var(--vf-violet-soft)",
                        color: "var(--vf-violet-ink)",
                        fontWeight: 550,
                      }
                    : { borderColor: "transparent", color: "var(--fg-secondary)" }
                }
              >
                <i.icon size={14} />
                {i.label}
              </div>
            ))}
          </div>

          {/* Columna 2 — actividad / conversación en vivo */}
          <div className="col-span-12 p-4 sm:p-5 md:col-span-6 md:p-7">
            <p className="mb-4 text-[12px] font-medium text-[var(--fg-muted)]">V · Operación en vivo</p>

            {loading ? (
              <div className="flex flex-col items-center justify-center gap-5 py-10">
                <ObsidianLoader size="md" label="Conectando con Hetzner…" />
                <div className="w-full space-y-3">
                  <Skeleton className="h-12 w-[80%]" />
                  <Skeleton className="ml-auto h-12 w-[70%]" />
                  <Skeleton className="h-12 w-[85%]" />
                </div>
              </div>
            ) : (
              <>
                <Bubble role="user">Reporta el estado del taller y los servicios en Hetzner.</Bubble>
                <Bubble role="b" delay={0.15}>
                  {live
                    ? "Relay en línea. Te dejo el estado vivo de los procesos y la actividad reciente del host."
                    : "No alcanzo el relay de Hetzner ahora mismo. Muestro lo último que tengo; reintentando en segundo plano."}
                  <ul className="mt-3 space-y-1.5 text-[13px]">
                    <li className="flex items-center gap-2 text-[var(--fg-primary)]">
                      <IconCheck size={14} style={{ color: live ? "#15803d" : "var(--fg-muted)" }} />
                      <span className={live ? "" : "text-[var(--fg-secondary)]"}>
                        Relay {live ? "respondiendo" : "sin respuesta"}
                      </span>
                    </li>
                    <li className="flex items-center gap-2 text-[var(--fg-primary)]">
                      {hasServices ? (
                        <IconCheck size={14} style={{ color: "#15803d" }} />
                      ) : (
                        <IconActivity size={14} className="animate-pulse" style={{ color: "var(--vf-violet)" }} />
                      )}
                      <span className={hasServices ? "" : "text-[var(--fg-secondary)]"}>
                        {hasServices
                          ? `${metrics.servicesOnline ?? 0}/${metrics.servicesTotal ?? services.length} procesos activos`
                          : "Leyendo procesos pm2…"}
                      </span>
                    </li>
                  </ul>
                </Bubble>

                {/* Feed de actividad reciente */}
                <div className="mt-5 rounded-lg border border-[var(--border-1)] bg-[var(--surface-1)] p-3">
                  <p className="mb-2 text-[12px] font-medium text-[var(--fg-muted)]">Actividad reciente</p>
                  {events.length === 0 ? (
                    <p className="py-2 text-[13px] text-[var(--fg-secondary)]">
                      Sin eventos recientes registrados.
                    </p>
                  ) : (
                    events.map((e, idx) => (
                      <ActivityItem
                        key={`${e.label}-${idx}`}
                        icon={e.icon ?? IconActivity}
                        label={e.label}
                        tone={e.tone ?? "cyan"}
                      />
                    ))
                  )}
                </div>
              </>
            )}
          </div>

          {/* Columna 3 — métricas de operación */}
          <div className="col-span-12 border-t border-[var(--border-1)] p-4 sm:p-5 md:col-span-3 md:border-l md:border-t-0 md:p-6">
            <p className="mb-4 text-[12px] font-medium text-[var(--fg-muted)]">Métricas</p>

            {loading ? (
              <div className="space-y-3">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-[58px] w-full rounded-md" />
                ))}
              </div>
            ) : (
              <>
                <Stat
                  label="Servicios"
                  value={
                    metrics.servicesTotal != null
                      ? `${metrics.servicesOnline ?? 0}/${metrics.servicesTotal}`
                      : "—"
                  }
                  hint={live ? "Hetzner" : "sin relay"}
                />
                <Stat
                  label="Latencia"
                  value={metrics.latencyMs != null ? `${metrics.latencyMs}ms` : "—"}
                  hint="relay"
                  tone="cyan"
                />
                {metrics.deploys != null && (
                  <Stat label="Despliegues" value={String(metrics.deploys)} hint="recientes" tone="violet" />
                )}
                {metrics.integrations != null && (
                  <Stat label="Integraciones" value={String(metrics.integrations)} hint="conectadas" tone="violet" />
                )}
                {metrics.secrets != null && (
                  <Stat label="Secrets" value={String(metrics.secrets)} hint="AES-256" />
                )}

                {/* Lista de procesos en vivo */}
                <div className="mt-5 rounded-md border border-[var(--border-1)] bg-[var(--surface-1)] p-3">
                  <p className="mb-2 text-[12px] font-medium text-[var(--fg-muted)]">Procesos</p>
                  {!hasServices ? (
                    <div className="space-y-2 py-1">
                      <Skeleton className="h-3.5 w-full" />
                      <Skeleton className="h-3.5 w-3/4" />
                    </div>
                  ) : (
                    services.slice(0, 8).map((s) => {
                      const on = isOnline(s.status);
                      return (
                        <div key={s.name} className="flex items-center gap-2 py-1 text-[12px]">
                          <span
                            className="h-1.5 w-1.5 flex-none rounded-full"
                            style={{ background: on ? "#15803d" : "#b45309" }}
                          />
                          <span className="truncate font-mono text-[var(--fg-secondary)]">{s.name}</span>
                          <span
                            className="ml-auto font-mono text-[12px] font-semibold uppercase"
                            style={{ color: on ? "#15803d" : "#b45309" }}
                          >
                            {on ? "on" : s.status || "off"}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Subcomponentes del panel.
// ---------------------------------------------------------------------------

function Bubble({
  role,
  children,
  delay = 0,
}: {
  role: "user" | "b";
  children: React.ReactNode;
  delay?: number;
}) {
  const isB = role === "b";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="mb-3 max-w-[90%] rounded-xl border px-4 py-3 text-[14px] leading-relaxed"
      style={
        isB
          ? {
              marginLeft: 0,
              borderColor: "var(--vf-violet)",
              background: "var(--vf-violet-soft)",
              color: "var(--fg-primary)",
            }
          : {
              marginLeft: "auto",
              borderColor: "var(--border-1)",
              background: "var(--surface-1)",
              color: "var(--fg-secondary)",
            }
      }
    >
      {isB && (
        <p className="mb-1 font-mono text-[12px] font-semibold uppercase" style={{ color: "var(--vf-violet-ink)" }}>
          V
        </p>
      )}
      {children}
    </motion.div>
  );
}

function Stat({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "default" | "cyan" | "violet";
}) {
  const dotColor = tone === "default" ? "#15803d" : "var(--vf-violet)";
  return (
    <div className="mb-3 flex items-center justify-between rounded-md border border-[var(--border-1)] bg-[var(--surface-1)] px-3 py-2.5">
      <div>
        <p className="text-[12px] font-medium text-[var(--fg-muted)]">{label}</p>
        <p className="font-display text-lg font-semibold text-[var(--fg-primary)]">{value}</p>
      </div>
      <div className="flex items-center gap-2 text-[12px] text-[var(--fg-secondary)]">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: dotColor }} />
        {hint}
      </div>
    </div>
  );
}

function ActivityItem({
  icon: Icon,
  label,
  tone,
}: {
  icon: (props: { size?: number; className?: string; [key: string]: unknown }) => React.ReactElement | null;
  label: string;
  tone: "violet" | "cyan" | "emerald";
}) {
  const c = tone === "emerald" ? "#15803d" : "var(--vf-violet-ink)";
  return (
    <div className="flex items-center gap-2 py-1.5 text-[12px] text-[var(--fg-secondary)]">
      <Icon size={12} style={{ color: c }} />
      <span className="truncate font-mono">{label}</span>
    </div>
  );
}

export default TallerPanel;
