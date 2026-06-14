"use client";

// components/forja/BrainLivePanel.tsx
// Panel "Brain en Vivo" de la Forja: KPIs animados, modelos activos respirando,
// cola de jobs en tiempo real y win-rates por modelo. Consume los proxies
// owner-only /api/brain/{live,queue,models} hacia el brain-relay de Hetzner.
// Sin datos inventados: si un endpoint no responde, el bloque cae a vacío real.

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IconActivity, IconDatabase, IconZap, IconCpu } from "@/components/brand/VFIcons";

/* ── Paleta exacta VForge ──────────────────────────────────────────────── */
const C = {
  surface: "#100d1e",
  surf2: "#16112a",
  violet: "#7c3aed",
  cyan: "#22d3ee",
  gold: "#fbbf24",
  green: "#10b981",
  red: "#ef4444",
  gray: "#5a6480",
  t1: "#f0f4ff",
  t2: "#a8b4d0",
  t3: "#5a6480",
} as const;

const FONT_DISPLAY = "'Space Grotesk', system-ui, sans-serif";
const FONT_MONO = "'JetBrains Mono', ui-monospace, monospace";

/* ── Tipos ─────────────────────────────────────────────────────────────── */
interface LiveStats {
  success_rate?: number;
  tokens_saved?: number;
  brain_memories?: number;
  saved_usd?: number;
}

type JobStatus = "running" | "done" | "pending" | "failed";

interface QueueJob {
  id: number | string;
  agent?: string; // claude | grok | codex …
  task_type?: string;
  status?: JobStatus | string;
  progress_pct?: number;
}

interface ModelStat {
  task_type?: string;
  modelo: string;
  win_rate?: number; // 0..1 ó 0..100
}

/* ── Helpers ───────────────────────────────────────────────────────────── */
function modelColor(model?: string): string {
  const m = (model ?? "").toLowerCase();
  if (m.includes("claude")) return C.violet;
  if (m.includes("grok")) return C.cyan;
  if (m.includes("codex")) return C.gold;
  return C.gray;
}

function statusColor(status?: string): string {
  switch (status) {
    case "running":
      return C.violet;
    case "done":
      return C.green;
    case "failed":
      return C.red;
    default:
      return C.gray;
  }
}

/** Lee un payload {ok,data} ó data plano y devuelve el cuerpo útil. */
function unwrap<T>(raw: unknown): T | null {
  if (raw && typeof raw === "object" && "data" in raw) {
    return (raw as { data: T }).data ?? null;
  }
  return (raw as T) ?? null;
}

async function getJSON(url: string): Promise<unknown | null> {
  try {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

/* ── Hook countUp ──────────────────────────────────────────────────────── */
function useCountUp(target: number, duration = 1200): number {
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      setValue(from + (target - from) * eased);
      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return value;
}

/* ── KPI card ──────────────────────────────────────────────────────────── */
interface KpiProps {
  label: string;
  value: number;
  accent: string;
  icon: React.ReactNode;
  format: (n: number) => string;
}

function KpiCard({ label, value, accent, icon, format }: KpiProps) {
  const animated = useCountUp(value);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 18,
        border: `1px solid ${accent}22`,
        background: `linear-gradient(160deg, ${C.surf2} 0%, ${C.surface} 100%)`,
        padding: "16px 16px 18px",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -30,
          right: -30,
          width: 90,
          height: 90,
          borderRadius: "50%",
          background: accent,
          opacity: 0.12,
          filter: "blur(28px)",
        }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: accent }}>
        {icon}
        <span
          style={{
            fontFamily: FONT_MONO,
            fontSize: 10,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: C.t3,
          }}
        >
          {label}
        </span>
      </div>
      <div
        style={{
          marginTop: 10,
          fontFamily: FONT_DISPLAY,
          fontSize: 26,
          fontWeight: 700,
          color: C.t1,
          lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {format(animated)}
      </div>
    </motion.div>
  );
}

/* ── Componente principal ──────────────────────────────────────────────── */
export function BrainLivePanel() {
  const [stats, setStats] = useState<LiveStats | null>(null);
  const [jobs, setJobs] = useState<QueueJob[]>([]);
  const [models, setModels] = useState<ModelStat[]>([]);

  const loadLive = useCallback(async () => {
    const raw = await getJSON("/api/brain/live");
    const data = unwrap<LiveStats>(raw);
    if (data) setStats(data);
  }, []);

  const loadQueue = useCallback(async () => {
    const raw = await getJSON("/api/brain/queue");
    const list = (raw as { queue?: QueueJob[] } | null)?.queue;
    if (Array.isArray(list)) setJobs(list);
  }, []);

  const loadModels = useCallback(async () => {
    const raw = await getJSON("/api/brain/models");
    const list = (raw as { models?: ModelStat[] } | null)?.models;
    if (Array.isArray(list)) setModels(list);
  }, []);

  // Refresh: live 15s, queue 5s, models 30s.
  useEffect(() => {
    void loadLive();
    const id = setInterval(() => void loadLive(), 15000);
    return () => clearInterval(id);
  }, [loadLive]);

  useEffect(() => {
    void loadQueue();
    const id = setInterval(() => void loadQueue(), 5000);
    return () => clearInterval(id);
  }, [loadQueue]);

  useEffect(() => {
    void loadModels();
    const id = setInterval(() => void loadModels(), 30000);
    return () => clearInterval(id);
  }, [loadModels]);

  const runningJobs = jobs.filter((j) => j.status === "running");
  const recentJobs = jobs.slice(0, 8);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* ── BLOQUE 1 · KPIs ─────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 10,
        }}
      >
        <KpiCard
          label="Success rate"
          value={Number(stats?.success_rate ?? 0)}
          accent={C.green}
          icon={<IconActivity size={15} />}
          format={(n) => `${n.toFixed(1)}%`}
        />
        <KpiCard
          label="Tokens saved"
          value={Number(stats?.tokens_saved ?? 0)}
          accent={C.cyan}
          icon={<IconZap size={15} />}
          format={(n) =>
            n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${Math.round(n)}`
          }
        />
        <KpiCard
          label="Brain memories"
          value={Number(stats?.brain_memories ?? 0)}
          accent={C.violet}
          icon={<IconDatabase size={15} />}
          format={(n) => `${Math.round(n).toLocaleString()}`}
        />
        <KpiCard
          label="Ahorro USD"
          value={Number(stats?.saved_usd ?? 0)}
          accent={C.gold}
          icon={<IconCpu size={15} />}
          format={(n) => `$${n.toFixed(2)}`}
        />
      </div>

      {/* ── BLOQUE 2 · Modelos activos ──────────────────────────────── */}
      <div
        style={{
          borderRadius: 18,
          border: `1px solid ${C.violet}22`,
          background: `linear-gradient(160deg, ${C.surf2} 0%, ${C.surface} 100%)`,
          padding: "16px 18px",
        }}
      >
        <span
          style={{
            fontFamily: FONT_MONO,
            fontSize: 10,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: C.t3,
          }}
        >
          Modelos activos
        </span>
        <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 14 }}>
            <AnimatePresence>
              {runningJobs.length === 0 ? (
                <motion.span
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.t3 }}
                >
                  en reposo
                </motion.span>
              ) : (
                runningJobs.map((j, i) => {
                  const color = modelColor(j.agent);
                  return (
                    <motion.span
                      key={`dot-${j.id}`}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{
                        scale: [1, 1.45, 1],
                        opacity: [0.55, 1, 0.55],
                      }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{
                        duration: 1.6,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: (i % 6) * 0.22, // respiración asíncrona
                      }}
                      style={{
                        width: 11,
                        height: 11,
                        borderRadius: "50%",
                        background: color,
                        boxShadow: `0 0 12px ${color}`,
                        display: "inline-block",
                      }}
                    />
                  );
                })
              )}
            </AnimatePresence>
          </div>
          <span
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 14,
              fontWeight: 600,
              color: runningJobs.length ? C.t1 : C.t3,
            }}
          >
            {runningJobs.length} {runningJobs.length === 1 ? "agente activo" : "agentes activos"}
          </span>
        </div>
      </div>

      {/* ── BLOQUE 3 · Queue live ───────────────────────────────────── */}
      <div
        style={{
          borderRadius: 18,
          border: `1px solid ${C.cyan}22`,
          background: `linear-gradient(160deg, ${C.surf2} 0%, ${C.surface} 100%)`,
          padding: "16px 18px",
        }}
      >
        <span
          style={{
            fontFamily: FONT_MONO,
            fontSize: 10,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: C.t3,
          }}
        >
          Queue · en vivo
        </span>
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          <AnimatePresence initial={false}>
            {recentJobs.length === 0 ? (
              <motion.p
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.t3, padding: "6px 0" }}
              >
                Sin jobs en cola.
              </motion.p>
            ) : (
              recentJobs.map((job) => {
                const sColor = statusColor(job.status);
                const isRunning = job.status === "running";
                const pct = Math.max(0, Math.min(100, Number(job.progress_pct ?? 0)));
                return (
                  <motion.div
                    key={`job-${job.id}`}
                    layout
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ type: "spring", stiffness: 320, damping: 30 }}
                    style={{
                      borderRadius: 12,
                      border: `1px solid ${C.t3}1f`,
                      background: C.surface,
                      padding: "9px 11px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      {/* id */}
                      <span
                        style={{
                          fontFamily: FONT_MONO,
                          fontSize: 10,
                          color: C.t3,
                          background: `${C.gray}1f`,
                          borderRadius: 6,
                          padding: "2px 6px",
                        }}
                      >
                        #{job.id}
                      </span>
                      {/* task_type */}
                      {job.task_type && (
                        <span
                          style={{
                            fontFamily: FONT_MONO,
                            fontSize: 10,
                            color: C.cyan,
                            background: `${C.cyan}1a`,
                            borderRadius: 6,
                            padding: "2px 6px",
                          }}
                        >
                          {job.task_type}
                        </span>
                      )}
                      {/* status */}
                      <span
                        style={{
                          marginLeft: "auto",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          fontFamily: FONT_MONO,
                          fontSize: 10,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          color: sColor,
                          background: `${sColor}1a`,
                          borderRadius: 6,
                          padding: "2px 7px",
                        }}
                      >
                        {isRunning && (
                          <motion.span
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: sColor,
                              display: "inline-block",
                            }}
                          />
                        )}
                        {job.status ?? "—"}
                      </span>
                    </div>
                    {/* barra progreso */}
                    {isRunning && (
                      <div
                        style={{
                          marginTop: 8,
                          height: 4,
                          borderRadius: 99,
                          background: `${C.violet}22`,
                          overflow: "hidden",
                        }}
                      >
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                          style={{
                            height: "100%",
                            borderRadius: 99,
                            background: `linear-gradient(90deg, ${C.violet}, ${C.cyan})`,
                          }}
                        />
                      </div>
                    )}
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── BLOQUE 4 · Win rates ────────────────────────────────────── */}
      <div
        style={{
          borderRadius: 18,
          border: `1px solid ${C.gold}22`,
          background: `linear-gradient(160deg, ${C.surf2} 0%, ${C.surface} 100%)`,
          padding: "16px 18px",
        }}
      >
        <span
          style={{
            fontFamily: FONT_MONO,
            fontSize: 10,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: C.t3,
          }}
        >
          Win rates por modelo
        </span>
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
          {models.length === 0 ? (
            <p style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.t3 }}>
              Sin métricas de modelos.
            </p>
          ) : (
            models.map((m, i) => {
              const raw = Number(m.win_rate ?? 0);
              const pct = Math.max(0, Math.min(100, raw <= 1 ? raw * 100 : raw));
              const color = modelColor(m.modelo);
              const rowKey = `${m.task_type ?? "wr"}-${m.modelo}-${i}`;
              return (
                <div key={rowKey}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 5,
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: FONT_DISPLAY,
                        fontSize: 12,
                        color: C.t2,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {m.modelo}
                      {m.task_type && (
                        <span style={{ color: C.t3, fontSize: 10 }}> · {m.task_type}</span>
                      )}
                    </span>
                    <span
                      style={{
                        fontFamily: FONT_MONO,
                        fontSize: 11,
                        color,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                  <div
                    style={{
                      height: 7,
                      borderRadius: 99,
                      background: `${color}1a`,
                      overflow: "hidden",
                    }}
                  >
                    <motion.div
                      layoutId={`winbar-${rowKey}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      style={{
                        height: "100%",
                        borderRadius: 99,
                        background: color,
                        boxShadow: `0 0 10px ${color}66`,
                      }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default BrainLivePanel;
