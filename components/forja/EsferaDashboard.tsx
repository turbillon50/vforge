"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconGithub,
  IconRocket,
  IconDatabase,
  IconCheck,
  IconX,
  IconLoader,
  IconShield,
  IconActivity,
  IconRefresh,
  IconArrowR,
  IconArrowUp,
  IconWarn,
  IconSparkles,
} from "@/components/brand/VFIcons";
import { BrainLivePanel } from "@/components/forja/BrainLivePanel";

type Service = "github" | "vercel" | "neon";
type ConnStatus = "missing" | "unverified" | "verified" | "error";

interface Connection {
  service: Service;
  status: ConnStatus;
  identity: string | null;
  lastVerifiedAt: string | null;
  lastError: string | null;
}

interface SavingsBreakdown {
  service: Service;
  verified: boolean;
  monthlyMxn: number;
}

interface Savings {
  monthlyMxn: number;
  annualMxn: number;
  breakdown: SavingsBreakdown[];
  verifiedCount: number;
}

interface EventView {
  kind: string;
  service: string | null;
  level: string;
  message: string | null;
  created_at: string;
}

interface EsferaPayload {
  sphere: {
    id: string;
    name: string;
    status: string;
    activatedAt: string | null;
    health: "active" | "degraded" | "forging";
  };
  tenant: { plan: string };
  connections: Connection[];
  savings: Savings;
  events: EventView[];
}

const SERVICE_META: Record<Service, { label: string; Icon: typeof IconGithub }> = {
  github: { label: "GitHub", Icon: IconGithub },
  vercel: { label: "Vercel", Icon: IconRocket },
  neon: { label: "Neon", Icon: IconDatabase },
};

const PLAN_LABEL: Record<string, string> = {
  forja_libre: "Forja Libre",
  herrero: "Herrero",
  maestro_forjador: "Maestro Forjador",
};

const MXN = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

export function EsferaDashboard() {
  const router = useRouter();
  const [data, setData] = useState<EsferaPayload | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/esfera", { cache: "no-store" });
      if (r.ok) setData((await r.json()) as EsferaPayload);
    } catch {
      /* estado vacío real — sin inventar datos */
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function reverify() {
    if (refreshing) return;
    setRefreshing(true);
    try {
      // /api/forja/activate re-hace ping real a cada servicio y recalcula estado.
      await fetch("/api/forja/activate", { method: "POST" });
      await load();
    } catch {
      /* deja la vista como está */
    } finally {
      setRefreshing(false);
    }
  }

  if (!loaded) {
    return (
      <div className="relative z-10 flex min-h-dvh items-center justify-center">
        <motion.span
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }}
          className="text-[var(--fg-tertiary)]"
        >
          <IconLoader size={26} />
        </motion.span>
      </div>
    );
  }

  const connections = data?.connections ?? [];
  const liveCount = connections.filter((c) => c.status === "verified").length;
  const anyConnected = connections.some((c) => c.status !== "missing");
  const health = data?.sphere.health ?? "forging";
  const savings = data?.savings;

  return (
    <div className="relative z-10 mx-auto w-full max-w-5xl px-5 py-8 md:py-12">
      {/* Encabezado */}
      <div className="mb-7 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.25em] text-violet-400/70">
            Mi Esfera
          </p>
          <h1 className="truncate font-display text-2xl font-bold text-white md:text-3xl">
            {data?.sphere.name ?? "Mi Esfera"}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <HealthPill health={health} />
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border-1)] bg-[var(--surface-1)] px-2.5 py-0.5 font-mono text-[10px] text-[var(--fg-tertiary)]">
              <IconSparkles size={10} /> {PLAN_LABEL[data?.tenant.plan ?? ""] ?? "Forja Libre"}
            </span>
          </div>
        </div>
        <button
          onClick={reverify}
          disabled={refreshing}
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-[var(--border-1)] bg-[var(--surface-1)] px-3 text-xs font-medium text-[var(--fg-secondary)] transition-colors hover:border-[var(--border-2)] hover:text-white disabled:opacity-50"
        >
          <motion.span
            animate={refreshing ? { rotate: 360 } : { rotate: 0 }}
            transition={refreshing ? { repeat: Infinity, duration: 0.9, ease: "linear" } : { duration: 0 }}
          >
            <IconRefresh size={14} />
          </motion.span>
          <span className="hidden sm:inline">Re-verificar</span>
        </button>
      </div>

      {/* Esfera sin forjar → CTA al wizard (estado vacío usa todo el ancho) */}
      {!anyConnected ? (
        <div className="grid gap-6 lg:grid-cols-5 lg:items-start">
          <div className="lg:col-span-3">
            <EmptyState onForge={() => router.push("/forja")} />
          </div>
          <section className="lg:col-span-2">
            <h2
              className="mb-3 font-mono text-[10px] uppercase tracking-widest"
              style={{ color: "#5a6480" }}
            >
              Brain — Fábrica en Vivo
            </h2>
            <BrainLivePanel />
          </section>
        </div>
      ) : (
        <>
          {/* Métrica estrella: Ahorro vs infra tradicional */}
          <SavingsCard savings={savings} liveCount={liveCount} />

          {/* Estado por conexión + actividad — 2 columnas en desktop */}
          <div className="mt-6 grid gap-6 lg:grid-cols-2 lg:items-start">
            <section>
              <SectionTitle>Conexiones</SectionTitle>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-2">
                {connections.map((c, i) => (
                  <ConnectionCard key={c.service} conn={c} index={i} />
                ))}
              </div>
            </section>

            <section>
              <SectionTitle>Actividad</SectionTitle>
              <EventsList events={data?.events ?? []} />
            </section>
          </div>

          {/* Brain — Fábrica en Vivo */}
          <section className="mt-8">
            <h2
              className="mb-3 font-mono text-[10px] uppercase tracking-widest"
              style={{ color: "#5a6480" }}
            >
              Brain — Fábrica en Vivo
            </h2>
            <BrainLivePanel />
          </section>
        </>
      )}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--fg-muted)]">
      {children}
    </h2>
  );
}

function HealthPill({ health }: { health: "active" | "degraded" | "forging" }) {
  const map = {
    active: { label: "Activa", cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300", dot: "bg-emerald-400" },
    degraded: { label: "Degradada", cls: "border-red-500/30 bg-red-500/10 text-red-300", dot: "bg-red-400" },
    forging: { label: "Forjando", cls: "border-amber-500/30 bg-amber-500/10 text-amber-300", dot: "bg-amber-400" },
  } as const;
  const s = map[health];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10px] ${s.cls}`}>
      <span className={`relative flex h-1.5 w-1.5`}>
        {health === "active" && (
          <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${s.dot} opacity-60`} />
        )}
        <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${s.dot}`} />
      </span>
      {s.label}
    </span>
  );
}

function SavingsCard({ savings, liveCount }: { savings?: Savings; liveCount: number }) {
  const monthly = savings?.monthlyMxn ?? 0;
  const annual = savings?.annualMxn ?? 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 120, damping: 20 }}
      className="relative overflow-hidden rounded-3xl border border-[var(--border-1)] bg-gradient-to-br from-[#0e0b1e]/90 to-[#0a0814]/90 p-6 backdrop-blur-xl md:p-7"
    >
      <div className="pointer-events-none absolute right-[-10%] top-[-30%] h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="relative">
        <div className="flex items-center gap-2 text-[var(--fg-tertiary)]">
          <IconArrowUp size={14} className="text-emerald-400" />
          <span className="font-mono text-[10px] uppercase tracking-[0.2em]">
            Ahorro del mes · vs infra tradicional
          </span>
        </div>
        <div className="mt-3 flex items-end gap-3">
          <span className="font-display text-4xl font-bold tabular-nums text-white md:text-5xl">
            {MXN.format(monthly)}
          </span>
          <span className="mb-1.5 font-mono text-xs text-[var(--fg-tertiary)]">/mes</span>
        </div>
        <p className="mt-2 text-xs text-[var(--fg-tertiary)]">
          {liveCount > 0 ? (
            <>
              Equivale a <span className="text-emerald-300/90">{MXN.format(annual)}</span> al año con tus
              free tiers — sin pagar infra administrada.
            </>
          ) : (
            <>Conecta tus servicios para empezar a ahorrar sobre tus propios free tiers.</>
          )}
        </p>

        {savings && savings.breakdown.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-[var(--border-1)] pt-4">
            {savings.breakdown.map((b) => {
              const m = SERVICE_META[b.service];
              return (
                <div key={b.service} className="flex flex-col gap-1">
                  <span className="flex items-center gap-1.5 text-[var(--fg-tertiary)]">
                    <m.Icon size={13} />
                    <span className="font-mono text-[10px]">{m.label}</span>
                  </span>
                  <span
                    className={`font-mono text-xs tabular-nums ${
                      b.verified ? "text-emerald-300/90" : "text-[var(--fg-muted)]"
                    }`}
                  >
                    {b.verified ? MXN.format(b.monthlyMxn) : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ConnectionCard({ conn, index }: { conn: Connection; index: number }) {
  const m = SERVICE_META[conn.service];
  const ok = conn.status === "verified";
  const err = conn.status === "error";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className={`rounded-2xl border bg-[#0c0a18]/80 p-4 backdrop-blur-xl ${
        ok ? "border-emerald-500/25" : err ? "border-red-500/25" : "border-[var(--border-1)]"
      }`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-xl border ${
            ok
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : err
                ? "border-red-500/30 bg-red-500/10 text-red-300"
                : "border-[var(--border-1)] bg-[var(--surface-1)] text-[var(--fg-secondary)]"
          }`}
        >
          <m.Icon size={17} />
        </span>
        <span
          className={`relative flex h-2.5 w-2.5 ${ok ? "" : ""}`}
          title={ok ? "Conectado" : err ? "Error" : "Sin conectar"}
        >
          {ok && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          )}
          <span
            className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
              ok ? "bg-emerald-400" : err ? "bg-red-400" : "bg-white/20"
            }`}
          />
        </span>
      </div>
      <h3 className="mt-3 font-display text-sm font-semibold text-white">{m.label}</h3>
      {ok ? (
        <p className="mt-0.5 truncate font-mono text-[11px] text-emerald-200/70">
          {conn.identity ?? "verificado"}
        </p>
      ) : err ? (
        <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-red-300/70">
          <IconWarn size={11} /> {conn.lastError ?? "error"}
        </p>
      ) : (
        <p className="mt-0.5 font-mono text-[11px] text-[var(--fg-muted)]">sin conectar</p>
      )}
    </motion.div>
  );
}

function EventsList({ events }: { events: EventView[] }) {
  if (events.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--border-1)] bg-[var(--surface-1)] px-4 py-6 text-center">
        <IconActivity size={20} className="mx-auto text-[var(--fg-muted)]" />
        <p className="mt-2 text-xs text-[var(--fg-muted)]">Sin actividad todavía.</p>
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border-1)] bg-[var(--surface-1)]">
      <AnimatePresence initial={false}>
        {events.map((e, i) => {
          const tone =
            e.level === "error"
              ? "text-red-400"
              : e.level === "warn"
                ? "text-amber-400"
                : "text-emerald-400";
          return (
            <motion.div
              key={`${e.created_at}-${i}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-start gap-3 border-b border-[var(--border-1)] px-4 py-3 last:border-0"
            >
              <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${tone.replace("text-", "bg-")}`} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs text-[var(--fg-secondary)]">{e.message ?? e.kind}</p>
                <p className="mt-0.5 font-mono text-[10px] text-[var(--fg-muted)]">
                  {e.service ? `${e.service} · ` : ""}
                  {fmtWhen(e.created_at)}
                </p>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

function EmptyState({ onForge }: { onForge: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border border-[var(--border-1)] bg-[#0c0a18]/70 p-8 text-center backdrop-blur-xl md:p-12"
    >
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-violet-500/30 bg-violet-500/10 text-violet-300">
        <IconShield size={28} />
      </div>
      <h2 className="mt-5 font-display text-xl font-bold text-white">Tu esfera aún no está forjada</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[var(--fg-tertiary)]">
        Conecta tu propia infraestructura — GitHub, Vercel y Neon — para encender tu esfera y empezar a
        ahorrar sobre tus free tiers.
      </p>
      <button
        onClick={onForge}
        className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-emerald-400 px-6 py-3 text-sm font-semibold text-black shadow-[0_0_40px_rgba(124,58,237,0.3)] transition-opacity hover:opacity-90"
      >
        Forjar mi Esfera <IconArrowR size={16} />
      </button>
    </motion.div>
  );
}

function fmtWhen(iso: string): string {
  try {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return "ahora";
    if (min < 60) return `hace ${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `hace ${h} h`;
    return d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
  } catch {
    return "";
  }
}
