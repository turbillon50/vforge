"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader } from "@/components/workspace/PageHeader";
import { IconRocket, IconCheck, IconWarn, IconExtLink, IconBranch, IconLoader } from "@/components/brand/VFIcons";
import { useT } from "@/i18n/AppProviders";

interface Deployment {
  id: string;
  name: string;
  url: string | null;
  state: "BUILDING" | "READY" | "ERROR" | "CANCELED" | "QUEUED";
  branch: string | null;
  created_at: number;
  project_name?: string;
}

function timeAgo(ms: number) {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s/60)}m`;
  if (s < 86400) return `${Math.floor(s/3600)}h`;
  return `${Math.floor(s/86400)}d`;
}

const STATE_META: Record<string, { label: string; color: string; bg: string; pulse: boolean }> = {
  READY:    { label:"live",      color:"#22c55e", bg:"rgba(34,197,94,0.1)",    pulse:false },
  BUILDING: { label:"building",  color:"#a78bfa", bg:"rgba(167,139,250,0.1)",  pulse:true  },
  QUEUED:   { label:"en cola",   color:"#a78bfa", bg:"rgba(167,139,250,0.08)", pulse:true  },
  ERROR:    { label:"error",     color:"#ef4444", bg:"rgba(239,68,68,0.1)",    pulse:false },
  CANCELED: { label:"cancelado", color:"#6b7280", bg:"rgba(107,114,128,0.08)", pulse:false },
};

function StatusBadge({ state }: { state: string }) {
  const meta = STATE_META[state] ?? STATE_META.CANCELED;
  return (
    <span className="flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider"
      style={{ background: meta.bg, color: meta.color, border:`1px solid ${meta.color}22` }}>
      {meta.pulse && (
        <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: meta.color }} />
      )}
      {meta.label}
    </span>
  );
}

function DeployCard({ d, onRefresh }: { d: Deployment; onRefresh: () => void }) {
  const isBuilding = d.state === "BUILDING" || d.state === "QUEUED";
  return (
    <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
      transition={{ duration:0.4, ease:[0.22,1,0.36,1] }}
      className="rounded-2xl p-4 transition-all"
      style={{ background:"rgba(255,255,255,0.02)", border:`1px solid ${isBuilding ? "rgba(167,139,250,0.2)" : "rgba(255,255,255,0.07)"}` }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <StatusBadge state={d.state} />
            {d.project_name && (
              <span className="truncate text-[11px]" style={{ color:"rgba(255,255,255,0.3)" }}>
                {d.project_name}
              </span>
            )}
          </div>
          <p className="truncate font-mono text-[12px] font-semibold" style={{ color:"rgba(255,255,255,0.85)" }}>
            {d.name || d.id.slice(0, 20)}
          </p>
          <div className="mt-1.5 flex items-center gap-3">
            {d.branch && (
              <span className="flex items-center gap-1 text-[11px]" style={{ color:"rgba(255,255,255,0.3)" }}>
                <IconBranch size={10} /> {d.branch}
              </span>
            )}
            <span className="font-mono text-[10px]" style={{ color:"rgba(255,255,255,0.2)" }}>
              {timeAgo(d.created_at)}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {isBuilding && (
            <button onClick={onRefresh}
              className="rounded-lg p-1.5 transition-all"
              style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", color:"rgba(255,255,255,0.4)" }}
              title="Actualizar">
              <IconLoader size={13} className="animate-spin" />
            </button>
          )}
          {d.url && d.state === "READY" && (
            <a href={`https://${d.url}`} target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all"
              style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", color:"rgba(255,255,255,0.7)" }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background="rgba(255,255,255,0.09)"; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background="rgba(255,255,255,0.05)"; }}>
              <IconExtLink size={11} /> Abrir
            </a>
          )}
        </div>
      </div>
      {d.state === "ERROR" && (
        <div className="mt-3 flex items-center gap-2 rounded-lg px-3 py-2"
          style={{ background:"rgba(239,68,68,0.06)", border:"1px solid rgba(239,68,68,0.15)" }}>
          <IconWarn size={12} style={{ color:"#f87171", flexShrink:0 }} />
          <span className="text-[11px]" style={{ color:"#f87171" }}>
            Build falló — revisa los logs en{" "}
            <a href="https://vercel.com/dashboard" target="_blank" rel="noreferrer"
              className="underline">Vercel Dashboard</a>
          </span>
        </div>
      )}
    </motion.div>
  );
}

export default function DeploymentsPage() {
  const t = useT();
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [lastPoll, setLastPoll] = useState<Date | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      /* Intentar Vercel API primero; fallback a proyectos internos */
      const r = await fetch("/api/deployments", { cache:"no-store" });
      const d = r.ok ? await r.json() : {};
      const deps: Deployment[] = d.deployments ?? [];
      setDeployments(deps);
      setLastPoll(new Date());
      /* Si hay alguno building, volver a polling en 8s */
      const anyBuilding = deps.some(dep => dep.state === "BUILDING" || dep.state === "QUEUED");
      if (anyBuilding) {
        timerRef.current = setTimeout(() => load(true), 8000);
      }
    } catch(e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    /* Polling cada 30s siempre */
    const interval = setInterval(() => load(true), 30000);
    return () => {
      clearInterval(interval);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [load]);

  const building = deployments.filter(d => d.state === "BUILDING" || d.state === "QUEUED");
  const ready    = deployments.filter(d => d.state === "READY");
  const failed   = deployments.filter(d => d.state === "ERROR" || d.state === "CANCELED");

  return (
    <>
      <PageHeader eyebrow={t.deployments?.eyebrow ?? "Infraestructura"} title="Deployments"
        description="Estado en tiempo real de tus deployments en Vercel."
        actions={
          <div className="flex items-center gap-2">
            {lastPoll && (
              <span className="font-mono text-[10px]" style={{ color:"rgba(255,255,255,0.2)" }}>
                Actualizado {timeAgo(lastPoll.getTime())} ago
              </span>
            )}
            <button onClick={() => load(false)}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] transition-all"
              style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", color:"rgba(255,255,255,0.5)" }}>
              <IconLoader size={12} /> Refrescar
            </button>
            <a href="https://vercel.com/dashboard" target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all"
              style={{ background:"#fff", color:"#000" }}>
              <IconRocket size={12} /> Vercel →
            </a>
          </div>
        } />

      <div className="px-5 py-6 md:px-8">
        {error && (
          <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-[13px]" style={{ color:"#f87171" }}>
            ⚠ {error}
          </div>
        )}

        {/* Building — siempre arriba */}
        <AnimatePresence>
          {building.length > 0 && (
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} className="mb-6">
              <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.14em]"
                style={{ color:"rgba(167,139,250,0.7)" }}>
                En curso ({building.length})
              </p>
              <div className="space-y-3">
                {building.map(d => <DeployCard key={d.id} d={d} onRefresh={() => load(true)} />)}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="space-y-3">
            {[0,1,2,3].map(i => (
              <div key={i} className="h-[88px] animate-pulse rounded-2xl"
                style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.06)" }} />
            ))}
          </div>
        ) : deployments.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl"
              style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)" }}>
              <IconRocket size={28} style={{ color:"rgba(167,139,250,0.5)" }} />
            </div>
            <p className="text-[15px] font-semibold" style={{ color:"rgba(255,255,255,0.5)" }}>
              Sin deployments aún
            </p>
            <p className="max-w-xs text-[13px]" style={{ color:"rgba(255,255,255,0.25)" }}>
              Conecta Vercel en Settings → Integraciones para ver tus deploys aquí.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {ready.length > 0 && (
              <div>
                <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.14em]"
                  style={{ color:"rgba(34,197,94,0.6)" }}>
                  En producción ({ready.length})
                </p>
                <div className="space-y-3">
                  {ready.map(d => <DeployCard key={d.id} d={d} onRefresh={() => load(true)} />)}
                </div>
              </div>
            )}
            {failed.length > 0 && (
              <div>
                <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.14em]"
                  style={{ color:"rgba(239,68,68,0.6)" }}>
                  Fallidos / cancelados ({failed.length})
                </p>
                <div className="space-y-3">
                  {failed.map(d => <DeployCard key={d.id} d={d} onRefresh={() => load(true)} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
