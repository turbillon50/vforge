"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink, GitBranch, LoaderCircle, RefreshCw, Rocket, TriangleAlert } from "lucide-react";

interface Deployment {
  id: string;
  name: string;
  url: string | null;
  state: "BUILDING" | "READY" | "ERROR" | "CANCELED" | "QUEUED";
  branch: string | null;
  created_at: number;
  project_name?: string;
}

const STATE_META: Record<string, { label: string; dot: string; surface: string }> = {
  READY: { label: "Producción", dot: "#4ca873", surface: "#e4f1e8" },
  BUILDING: { label: "Construyendo", dot: "#d68733", surface: "#f7ead6" },
  QUEUED: { label: "En cola", dot: "#d68733", surface: "#f7ead6" },
  ERROR: { label: "Error", dot: "#bd4b38", surface: "#fae5df" },
  CANCELED: { label: "Cancelado", dot: "#918b82", surface: "#ebe7df" },
};

function timeAgo(milliseconds: number) {
  const seconds = Math.floor((Date.now() - milliseconds) / 1000);
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

function deploymentUrl(value: string) {
  return value.startsWith("http://") || value.startsWith("https://") ? value : `https://${value}`;
}

function DeploymentRow({ deployment, onRefresh }: { deployment: Deployment; onRefresh: () => void }) {
  const meta = STATE_META[deployment.state] ?? STATE_META.CANCELED;
  const building = deployment.state === "BUILDING" || deployment.state === "QUEUED";
  return (
    <article className="grid gap-4 border-b border-[#eeeae3] px-5 py-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_150px_120px] sm:items-center">
      <div className="min-w-0"><div className="flex items-center gap-2"><span className="truncate text-sm font-semibold text-[#1b1a17]">{deployment.project_name || deployment.name || deployment.id.slice(0, 18)}</span>{building ? <LoaderCircle className="h-3.5 w-3.5 animate-spin text-[#d68733]" /> : null}</div><p className="mt-1 truncate text-xs text-[#8a847a]">{deployment.name || deployment.id}</p>{deployment.state === "ERROR" ? <p className="mt-2 flex items-center gap-1.5 text-xs text-[#a33925]"><TriangleAlert className="h-3.5 w-3.5" />El build necesita revisión en Vercel.</p> : null}</div>
      <div><span className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-medium text-[#514c45]" style={{ backgroundColor: meta.surface }}><span className="h-2 w-2 rounded-full" style={{ backgroundColor: meta.dot }} />{meta.label}</span><p className="mt-1.5 flex items-center gap-1 text-[10px] text-[#aaa49b]"><GitBranch className="h-3 w-3" />{deployment.branch || "main"} · {timeAgo(deployment.created_at)}</p></div>
      <div className="flex justify-start gap-2 sm:justify-end">
        {building ? <button onClick={onRefresh} aria-label="Actualizar despliegue" className="flex h-9 w-9 items-center justify-center rounded-full border border-[#d9d4c9] text-[#625e56] hover:bg-[#f0ede6]"><RefreshCw className="h-3.5 w-3.5" /></button> : null}
        {deployment.url && deployment.state === "READY" ? <a href={deploymentUrl(deployment.url)} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#1b1a17] px-3 text-xs font-medium text-white hover:bg-[#ff5c35]">Abrir<ExternalLink className="h-3.5 w-3.5" /></a> : null}
      </div>
    </article>
  );
}

export default function DeploymentsPage() {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastPoll, setLastPoll] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/deployments", { cache: "no-store" });
      const data = response.ok ? await response.json() : {};
      const next: Deployment[] = data.deployments ?? [];
      setDeployments(next);
      setLastPoll(new Date());
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
      if (next.some((deployment) => deployment.state === "BUILDING" || deployment.state === "QUEUED")) {
        timerRef.current = setTimeout(() => void load(true), 8000);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const interval = setInterval(() => void load(true), 30_000);
    return () => { clearInterval(interval); if (timerRef.current) clearTimeout(timerRef.current); };
  }, [load]);

  const activeCount = deployments.filter((deployment) => deployment.state === "BUILDING" || deployment.state === "QUEUED").length;
  const productionCount = deployments.filter((deployment) => deployment.state === "READY").length;

  return (
    <div className="px-5 py-8 sm:px-7 lg:px-9 lg:py-10">
      <div className="mx-auto max-w-[1080px]">
        <header className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div><p className="text-sm font-medium text-[#ff5c35]">Vercel</p><h2 className="mt-2 text-4xl font-semibold tracking-[-0.055em] text-[#1b1a17] sm:text-5xl">Despliegues</h2><p className="mt-3 max-w-xl text-sm leading-6 text-[#777168]">Qué está construyéndose, qué ya está en producción y qué necesita atención.</p></div>
          <button onClick={() => void load(false)} className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#cfc9be] bg-white/65 px-4 text-sm font-medium text-[#1b1a17] hover:bg-white"><RefreshCw className="h-4 w-4" />Actualizar</button>
        </header>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {[{ label: "Total", value: deployments.length }, { label: "En curso", value: activeCount }, { label: "Producción", value: productionCount }].map((item) => <div key={item.label} className="rounded-[18px] border border-[#d9d4c9] bg-[#fbfaf7] p-4"><p className="text-xs text-[#8a847a]">{item.label}</p><p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#1b1a17]">{item.value}</p></div>)}
        </div>

        {error ? <div className="mt-4 rounded-[16px] border border-[#e7aaa0] bg-[#fff3f0] px-4 py-3 text-sm text-[#9f2d1b]">No pudimos actualizar Vercel: {error}</div> : null}

        <section className="mt-4 overflow-hidden rounded-[22px] border border-[#d9d4c9] bg-white">
          <div className="flex items-center justify-between border-b border-[#e3dfd6] bg-[#f7f5ef] px-5 py-3"><p className="text-xs font-medium text-[#625e56]">Historial reciente</p>{lastPoll ? <p className="text-[10px] text-[#aaa49b]">Actualizado hace {timeAgo(lastPoll.getTime())}</p> : null}</div>
          {loading ? Array.from({ length: 4 }, (_, index) => <div key={index} className="h-[84px] border-b border-[#eeeae3] bg-[#fbfaf7] last:border-b-0" />) : null}
          {!loading && deployments.length === 0 ? <div className="flex flex-col items-center py-20 text-center"><span className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-[#ebe7df] text-[#777168]"><Rocket className="h-6 w-6" /></span><p className="mt-4 text-lg font-semibold text-[#1b1a17]">Todavía no hay despliegues</p><p className="mt-2 max-w-sm text-sm leading-6 text-[#777168]">Conecta Vercel para reunir previews y producción en esta vista.</p></div> : null}
          {!loading ? deployments.map((deployment) => <DeploymentRow key={deployment.id} deployment={deployment} onRefresh={() => void load(true)} />) : null}
        </section>
      </div>
    </div>
  );
}
