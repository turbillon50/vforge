"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { VConversationPanel } from "@/components/live/VConversationPanel";
import { RunLiveConsole } from "@/components/live/RunLiveConsole";
import { canApplyRun } from "@/lib/live/run-console";
import {
  IconBranch,
  IconCheck,
  IconExtLink,
  IconRocket,
  IconStop,
  IconX,
} from "@/components/brand/VFIcons";

type Executor = "auto" | "codex" | "claude" | "grok" | "team";
type RunStatus =
  | "preparing"
  | "queued"
  | "running"
  | "awaiting_preview"
  | "preview_ready"
  | "awaiting_approval"
  | "approved"
  | "published"
  | "failed"
  | "cancelled";

interface Repository {
  repo_full_name: string;
  is_primary: boolean;
  default_branch: string | null;
  role?: string | null;
}

interface QueueJobRef {
  id: number;
  agent: string;
  role: string;
}

interface QueueJob {
  id: number;
  agent: string | null;
  status: string;
  progress: number | null;
  result: string | null;
  logTail: string | null;
}

interface AgentRun {
  id: string;
  instruction: string;
  requested_executor: Executor;
  resolved_executor: string;
  status: RunStatus;
  repo_full_name: string;
  base_branch: string;
  work_branch: string;
  queue_jobs: QueueJobRef[];
  preview_url: string | null;
  pr_url: string | null;
  summary: string | null;
  error: string | null;
  created_at: string;
}

const STATUS_LABELS: Record<RunStatus, string> = {
  preparing: "Preparando",
  queued: "En cola",
  running: "Trabajando",
  awaiting_preview: "Esperando preview",
  preview_ready: "Preview listo",
  awaiting_approval: "Esperando aprobación",
  approved: "Aprobado",
  published: "Publicado",
  failed: "Falló",
  cancelled: "Cancelado",
};

const ACTIVE = new Set<RunStatus>(["preparing", "queued", "running", "awaiting_preview"]);

export function VControlPanel({
  projectId,
  onClose,
}: {
  projectId: string;
  onClose: () => void;
}) {
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [jobs, setJobs] = useState<QueueJob[]>([]);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [canWrite, setCanWrite] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [repository, setRepository] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef(false);

  const load = useCallback(async () => {
    if (pollingRef.current) return;
    pollingRef.current = true;
    try {
      const response = await fetch(`/api/live/${encodeURIComponent(projectId)}/runs`, {
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as {
        runs?: AgentRun[];
        jobs?: QueueJob[];
        repositories?: Repository[];
        canWrite?: boolean;
      } | null;
      if (!response.ok) throw new Error("No se pudo leer Hetzner.");
      const nextRuns = Array.isArray(payload?.runs) ? payload.runs : [];
      const nextRepos = Array.isArray(payload?.repositories) ? payload.repositories : [];
      setRuns(nextRuns);
      setJobs(Array.isArray(payload?.jobs) ? payload.jobs : []);
      setRepositories(nextRepos);
      setCanWrite(Boolean(payload?.canWrite));
      setSelectedId((current) =>
        current && nextRuns.some((run) => run.id === current)
          ? current
          : (nextRuns[0]?.id ?? null),
      );
      setRepository(
        (current) =>
          current ||
          nextRepos.find((repo) => repo.is_primary)?.repo_full_name ||
          nextRepos[0]?.repo_full_name ||
          "",
      );
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo leer Hetzner.");
    } finally {
      pollingRef.current = false;
    }
  }, [projectId]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 1500);
    return () => window.clearInterval(timer);
  }, [load]);

  const selected = useMemo(
    () => runs.find((run) => run.id === selectedId) ?? runs[0] ?? null,
    [runs, selectedId],
  );
  const jobMap = useMemo(() => new Map(jobs.map((job) => [job.id, job])), [jobs]);

  async function launchRun(nextInstruction: string) {
    const text = nextInstruction.trim().slice(0, 12000);
    if (text.length < 3 || !repository || busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/live/${encodeURIComponent(projectId)}/runs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction: text, executor: "grok", repository }),
      });
      const payload = (await response.json().catch(() => null)) as {
        run?: AgentRun;
        error?: string;
      } | null;
      if (!response.ok || !payload?.run)
        throw new Error(payload?.error || "Hetzner no tomó el trabajo.");
      setRuns((current) => [payload.run!, ...current]);
      setSelectedId(payload.run.id);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Hetzner no tomó el trabajo.");
    } finally {
      setBusy(false);
    }
  }

  async function runAction(action: "approve" | "publish" | "cancel" | "apply") {
    if (!selected || busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/live/${encodeURIComponent(projectId)}/runs/${encodeURIComponent(selected.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        },
      );
      if (!response.ok) throw new Error("La acción no pudo completarse.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "La acción no pudo completarse.");
    } finally {
      setBusy(false);
    }
  }

  async function nudgeRun(message: string) {
    if (!selected || busy) return;
    setBusy(true);
    try {
      await fetch(
        `/api/live/${encodeURIComponent(projectId)}/runs/${encodeURIComponent(selected.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "nudge", message }),
        },
      );
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[8px] border border-[var(--border-1)] bg-white">
      <header className="flex min-h-12 shrink-0 items-center justify-between gap-3 border-b border-[var(--border-1)] px-3">
        <div className="min-w-0">
          <p className="font-mono text-[9px] uppercase tracking-[0.13em]">V · tu hermana</p>
          <p className="truncate text-[9px] text-[var(--fg-muted)]">
            Habla aquí. Hetzner trabaja. El resultado cae a la derecha.
          </p>
        </div>
        <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-md hover:bg-[var(--color-background)]" aria-label="Cerrar V">
          <IconX size={11} />
        </button>
      </header>

      {error ? (
        <p className="shrink-0 border-b border-[var(--border-1)] px-3 py-2 text-[12px] text-[var(--color-danger)]">
          {error}
        </p>
      ) : null}

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.9fr)]">
        <section className="flex min-h-0 flex-col border-b border-[var(--border-1)] lg:border-b-0 lg:border-r">
          <VConversationPanel
            projectId={projectId}
            canWrite={canWrite}
            repository={repository}
            onDispatchGrok={(order) => {
              void launchRun(order);
            }}
          />
        </section>

        <section className="flex min-h-0 flex-col overflow-y-auto">
          <header className="border-b border-[var(--border-1)] px-3 py-2">
            <p className="text-[13px] font-medium">Hetzner</p>
            <p className="mt-0.5 text-[11px] text-[var(--fg-muted)]">
              Grok y Claude corren allá. Aquí sólo el resultado.
            </p>
          </header>
          {runs.length ? (
            <div className="divide-y divide-[var(--border-1)]">
              {runs.slice(0, 6).map((run) => (
                <button
                  key={run.id}
                  type="button"
                  onClick={() => setSelectedId(run.id)}
                  className={cn(
                    "w-full p-3 text-left text-[12px] hover:bg-[var(--color-background)]",
                    selected?.id === run.id && "bg-black text-white hover:bg-black",
                  )}
                >
                  <span className="line-clamp-2">{run.instruction}</span>
                  <span className={cn("mt-1 block font-mono text-[8px] uppercase", selected?.id === run.id ? "text-white/65" : "text-[var(--fg-muted)]")}>
                    {run.resolved_executor} · {STATUS_LABELS[run.status]}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="p-4 text-[12px] text-[var(--fg-muted)]">
              Todavía no hay trabajo en Hetzner para esta sala.
            </p>
          )}
          {selected ? (
            <div className="space-y-3 border-t border-[var(--border-1)] p-3">
              <RunLiveConsole
                createdAt={selected.created_at}
                status={selected.status}
                jobs={jobMap}
                jobRefs={selected.queue_jobs}
                canWrite={canWrite}
                busy={busy}
                onNudge={nudgeRun}
              />
              {selected.preview_url ? (
                <iframe
                  src={selected.preview_url}
                  title="Preview"
                  className="h-[220px] w-full rounded-[8px] border border-[var(--border-1)] bg-white"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                />
              ) : null}
              {selected.summary ? (
                <pre className="max-h-36 overflow-auto whitespace-pre-wrap text-[11px] leading-5">{selected.summary}</pre>
              ) : null}
              {selected.error ? (
                <p className="text-[11px] text-[var(--color-danger)]">{selected.error}</p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <a href={`https://github.com/${selected.repo_full_name}/tree/${selected.work_branch}`} target="_blank" rel="noreferrer" className="btn-ghost">
                  <IconBranch size={11} /> Rama
                </a>
                {selected.pr_url ? (
                  <a href={selected.pr_url} target="_blank" rel="noreferrer" className="btn-ghost">
                    <IconExtLink size={11} /> PR
                  </a>
                ) : null}
                {canWrite && canApplyRun(selected.status) ? (
                  <button type="button" disabled={busy} onClick={() => void runAction("apply")} className="btn-primary">
                    <IconRocket size={11} /> Aplicar
                  </button>
                ) : null}
                {canWrite && selected.status === "preview_ready" ? (
                  <button type="button" disabled={busy} onClick={() => void runAction("approve")} className="btn-ghost">
                    <IconCheck size={11} /> Sólo PR
                  </button>
                ) : null}
                {canWrite && ACTIVE.has(selected.status) ? (
                  <button type="button" disabled={busy} onClick={() => void runAction("cancel")} className="btn-ghost">
                    <IconStop size={11} /> Cancelar
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </section>
  );
}
