"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { VConversationPanel } from "@/components/live/VConversationPanel";
import { HetznerTerminal } from "@/components/live/HetznerTerminal";
import { canApplyRun } from "@/lib/live/run-console";
import { IconRocket, IconStop, IconX } from "@/components/brand/VFIcons";

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
    const timer = window.setInterval(() => void load(), 1200);
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

  async function runAction(action: "apply" | "cancel") {
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

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[8px] border border-[var(--border-1)] bg-white">
      <header className="flex h-10 shrink-0 items-center justify-between gap-3 border-b border-[var(--border-1)] px-3">
        <p className="truncate text-[11px] text-[var(--fg-muted)]">V · terminal Hetzner</p>
        <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-md hover:bg-[var(--color-background)]" aria-label="Cerrar V">
          <IconX size={11} />
        </button>
      </header>

      {error ? (
        <p className="shrink-0 px-3 py-2 text-[12px] text-[var(--color-danger)]">{error}</p>
      ) : null}

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(420px,1.35fr)_minmax(320px,1fr)]">
        <section className="flex h-full min-h-0 flex-col lg:border-r lg:border-[var(--border-1)]">
          <VConversationPanel
            projectId={projectId}
            canWrite={canWrite}
            repository={repository}
            onDispatchGrok={(order) => {
              void launchRun(order);
            }}
          />
        </section>

        <section className="flex min-h-0 flex-col bg-[#111110]">
          {selected ? (
            <HetznerTerminal jobs={jobMap} jobRefs={selected.queue_jobs} />
          ) : (
            <pre className="flex-1 px-3 py-3 font-mono text-[12px] text-[#d7d3cb]">$ — sin job</pre>
          )}
          {selected && canWrite ? (
            <div className="flex shrink-0 gap-2 border-t border-white/10 bg-[#111110] px-3 py-2">
              {canApplyRun(selected.status) ? (
                <button type="button" disabled={busy} onClick={() => void runAction("apply")} className="btn-primary">
                  <IconRocket size={11} /> Aplicar
                </button>
              ) : null}
              {ACTIVE.has(selected.status) ? (
                <button type="button" disabled={busy} onClick={() => void runAction("cancel")} className="btn-ghost text-white">
                  <IconStop size={11} /> Cancelar
                </button>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>
    </section>
  );
}
