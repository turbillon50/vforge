"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  IconBranch,
  IconCheck,
  IconExtLink,
  IconLoader,
  IconRocket,
  IconSend,
  IconSparkles,
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
  verdict: string | null;
}

interface AgentRun {
  id: string;
  instruction: string;
  requested_executor: Executor;
  resolved_executor: string;
  phase: string;
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

const EXECUTORS: Array<{ id: Executor; label: string; description: string }> = [
  { id: "auto", label: "Auto", description: "V elige según la tarea" },
  { id: "codex", label: "Codex", description: "Código y validación" },
  {
    id: "claude",
    label: "Claude",
    description: "Arquitectura y trabajo largo",
  },
  { id: "grok", label: "Grok", description: "Investigación y auditoría" },
  { id: "team", label: "Equipo", description: "Claude → Codex → Grok" },
];

const STATUS_LABELS: Record<RunStatus, string> = {
  preparing: "Preparando rama",
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

const ACTIVE = new Set<RunStatus>([
  "preparing",
  "queued",
  "running",
  "awaiting_preview",
]);

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
  const [instruction, setInstruction] = useState("");
  const [executor, setExecutor] = useState<Executor>("auto");
  const [repository, setRepository] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef(false);

  const load = useCallback(async () => {
    if (pollingRef.current) return;
    pollingRef.current = true;
    try {
      const response = await fetch(
        `/api/live/${encodeURIComponent(projectId)}/runs`,
        { cache: "no-store" },
      );
      const payload = (await response.json().catch(() => null)) as {
        runs?: AgentRun[];
        jobs?: QueueJob[];
        repositories?: Repository[];
        canWrite?: boolean;
      } | null;
      if (!response.ok) throw new Error("No se pudo leer la cabina V.");
      const nextRuns = Array.isArray(payload?.runs) ? payload.runs : [];
      const nextRepos = Array.isArray(payload?.repositories)
        ? payload.repositories
        : [];
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
      setError(
        caught instanceof Error
          ? caught.message
          : "No se pudo leer la cabina V.",
      );
    } finally {
      pollingRef.current = false;
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 3000);
    return () => window.clearInterval(timer);
  }, [load]);

  const selected = useMemo(
    () => runs.find((run) => run.id === selectedId) ?? runs[0] ?? null,
    [runs, selectedId],
  );
  const jobMap = useMemo(
    () => new Map(jobs.map((job) => [job.id, job])),
    [jobs],
  );

  async function startRun(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!instruction.trim() || !repository || busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/live/${encodeURIComponent(projectId)}/runs`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ instruction, executor, repository }),
        },
      );
      const payload = (await response.json().catch(() => null)) as {
        run?: AgentRun;
        error?: string;
      } | null;
      if (!response.ok || !payload?.run)
        throw new Error(payload?.error || "No se pudo iniciar el trabajo.");
      setInstruction("");
      setRuns((current) => [payload.run!, ...current]);
      setSelectedId(payload.run.id);
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No se pudo iniciar el trabajo.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function runAction(action: "approve" | "publish" | "cancel") {
    if (!selected || busy) return;
    const message =
      action === "publish"
        ? "Esto fusionará el PR y activará producción. ¿Publicar ahora?"
        : action === "cancel"
          ? "¿Cancelar este run? La rama se conservará para auditoría."
          : null;
    if (message && !window.confirm(message)) return;
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
      const payload = (await response.json().catch(() => null)) as {
        run?: AgentRun;
        error?: string;
      } | null;
      if (!response.ok)
        throw new Error(payload?.error || "La acción no pudo completarse.");
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "La acción no pudo completarse.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[8px] border border-[var(--border-1)] bg-white">
      <header className="flex min-h-12 shrink-0 items-center justify-between gap-3 border-b border-[var(--border-1)] px-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-black text-[12px] font-semibold text-white">
            V
          </span>
          <div className="min-w-0">
            <p className="font-mono text-[9px] uppercase tracking-[0.13em]">
              Control de ejecución
            </p>
            <p className="truncate text-[9px] text-[var(--fg-muted)]">
              Rama aislada · agentes · preview · aprobación · producción
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--fg-muted)] sm:flex">
            <span className="status-shape" data-active /> sincronización 3 s
          </span>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-md hover:bg-[var(--color-background)]"
            aria-label="Cerrar V"
          >
            <IconX size={11} />
          </button>
        </div>
      </header>

      {canWrite ? (
        <form
          onSubmit={startRun}
          className="shrink-0 border-b border-[var(--border-1)] bg-[var(--color-background)] p-3"
        >
          <div className="grid gap-2 lg:grid-cols-[210px_minmax(0,1fr)_auto]">
            <select
              value={repository}
              onChange={(event) => setRepository(event.target.value)}
              className="min-h-10 rounded-md border border-[var(--border-1)] bg-white px-3 text-[11px] outline-none focus:border-black"
              aria-label="Repositorio"
            >
              {repositories.map((repo) => (
                <option key={repo.repo_full_name} value={repo.repo_full_name}>
                  {repo.repo_full_name}
                </option>
              ))}
            </select>
            <textarea
              value={instruction}
              onChange={(event) => setInstruction(event.target.value)}
              maxLength={12000}
              rows={2}
              placeholder="Dile a V qué debe cambiar, investigar o construir…"
              className="min-h-14 resize-y rounded-md border border-[var(--border-1)] bg-white px-3 py-2 text-[12px] leading-5 outline-none focus:border-black"
            />
            <button
              type="submit"
              disabled={busy || !instruction.trim() || !repository}
              className="btn-primary min-h-10 self-stretch disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? (
                <IconLoader size={12} className="animate-spin" />
              ) : (
                <IconSend size={12} />
              )}{" "}
              Ejecutar
            </button>
          </div>
          <div
            className="mt-2 flex gap-1 overflow-x-auto"
            aria-label="Seleccionar ejecutor"
          >
            {EXECUTORS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setExecutor(item.id)}
                title={item.description}
                className={cn(
                  "shrink-0 rounded-md border px-2.5 py-1.5 font-mono text-[8px] uppercase tracking-[0.08em]",
                  executor === item.id
                    ? "border-black bg-black text-white"
                    : "border-[var(--border-1)] bg-white hover:border-black",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </form>
      ) : null}

      {error ? (
        <p className="shrink-0 border-b border-[var(--border-1)] px-3 py-2 text-[10px] text-[var(--color-danger)]">
          {error}
        </p>
      ) : null}

      <div className="grid min-h-0 flex-1 md:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="min-h-0 overflow-y-auto border-b border-[var(--border-1)] md:border-b-0 md:border-r">
          {loading ? (
            <div className="flex items-center gap-2 p-4 text-[11px] text-[var(--fg-muted)]">
              <IconLoader size={12} className="animate-spin" /> Cargando runs…
            </div>
          ) : runs.length ? (
            <div className="divide-y divide-[var(--border-1)]">
              {runs.map((run) => (
                <button
                  key={run.id}
                  type="button"
                  onClick={() => setSelectedId(run.id)}
                  className={cn(
                    "w-full p-3 text-left hover:bg-[var(--color-background)]",
                    selected?.id === run.id &&
                      "bg-black text-white hover:bg-black",
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <strong className="truncate text-[11px] font-medium">
                      {run.instruction}
                    </strong>
                    <span
                      className={cn(
                        "status-shape shrink-0",
                        ACTIVE.has(run.status) && "animate-pulse",
                      )}
                      data-active={
                        run.status === "preview_ready" ||
                        run.status === "approved" ||
                        run.status === "published"
                      }
                    />
                  </span>
                  <span
                    className={cn(
                      "mt-2 flex items-center justify-between font-mono text-[8px] uppercase tracking-[0.08em]",
                      selected?.id === run.id
                        ? "text-white/65"
                        : "text-[var(--fg-muted)]",
                    )}
                  >
                    <span>
                      {run.requested_executor === "team"
                        ? "Equipo"
                        : run.resolved_executor}
                    </span>
                    <span>{STATUS_LABELS[run.status]}</span>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-5 text-[11px] leading-5 text-[var(--fg-muted)]">
              Todavía no hay ejecuciones. Dale una instrucción a V para crear la
              primera rama aislada.
            </div>
          )}
        </aside>

        <div className="min-h-0 overflow-y-auto bg-[var(--color-background)]">
          {selected ? (
            <div className="grid min-h-full gap-3 p-3 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.8fr)]">
              <div className="space-y-3">
                <section className="rounded-[8px] border border-[var(--border-1)] bg-white p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="mono-label">Instrucción</p>
                      <p className="mt-2 whitespace-pre-wrap text-[12px] leading-5">
                        {selected.instruction}
                      </p>
                    </div>
                    <span className="rounded-full border border-black px-2 py-1 font-mono text-[8px] uppercase tracking-[0.08em]">
                      {STATUS_LABELS[selected.status]}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 border-t border-[var(--border-1)] pt-3 text-[9px] sm:grid-cols-2">
                    <p className="truncate">
                      <span className="text-[var(--fg-muted)]">Repo </span>
                      {selected.repo_full_name}
                    </p>
                    <p className="truncate">
                      <span className="text-[var(--fg-muted)]">Rama </span>
                      {selected.work_branch}
                    </p>
                  </div>
                </section>

                <section className="rounded-[8px] border border-[var(--border-1)] bg-white">
                  <header className="border-b border-[var(--border-1)] px-3 py-2">
                    <p className="mono-label">Circuito</p>
                  </header>
                  <div className="divide-y divide-[var(--border-1)]">
                    {selected.queue_jobs.map((jobRef, index) => {
                      const job = jobMap.get(jobRef.id);
                      const done =
                        job &&
                        ["done", "completed", "success", "succeeded"].includes(
                          job.status.toLowerCase(),
                        );
                      return (
                        <div
                          key={jobRef.id}
                          className="grid grid-cols-[26px_minmax(0,1fr)_auto] items-start gap-2 px-3 py-3"
                        >
                          <span
                            className={cn(
                              "grid h-6 w-6 place-items-center rounded-full border text-[9px]",
                              done
                                ? "border-black bg-black text-white"
                                : "border-[var(--border-1)]",
                            )}
                          >
                            {done ? <IconCheck size={10} /> : index + 1}
                          </span>
                          <div>
                            <p className="text-[11px] font-medium capitalize">
                              {jobRef.agent} · {jobRef.role}
                            </p>
                            <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-[9px] leading-4 text-[var(--fg-muted)]">
                              {job?.logTail ||
                                job?.result ||
                                "Esperando al runner…"}
                            </p>
                          </div>
                          <span className="font-mono text-[8px] uppercase text-[var(--fg-muted)]">
                            {job?.status || "queued"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {selected.summary ? (
                  <section className="rounded-[8px] border border-[var(--border-1)] bg-white p-3">
                    <p className="mono-label">Resultado más reciente</p>
                    <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-[10px] leading-5">
                      {selected.summary}
                    </pre>
                  </section>
                ) : null}
                {selected.error ? (
                  <section className="rounded-[8px] border border-black bg-white p-3 text-[10px] leading-5">
                    {selected.error}
                  </section>
                ) : null}
              </div>

              <div className="space-y-3">
                <section className="overflow-hidden rounded-[8px] border border-[var(--border-1)] bg-white">
                  <header className="flex items-center justify-between border-b border-[var(--border-1)] px-3 py-2">
                    <p className="mono-label">Preview antes de publicar</p>
                    {selected.preview_url ? (
                      <a
                        href={selected.preview_url}
                        target="_blank"
                        rel="noreferrer"
                        className="grid h-7 w-7 place-items-center rounded-md hover:bg-[var(--color-background)]"
                        aria-label="Abrir preview"
                      >
                        <IconExtLink size={10} />
                      </a>
                    ) : null}
                  </header>
                  {selected.preview_url ? (
                    <iframe
                      src={selected.preview_url}
                      title={`Preview ${selected.id}`}
                      className="h-[380px] w-full border-0 bg-white"
                      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="grid min-h-52 place-items-center p-6 text-center">
                      <div>
                        <IconSparkles size={20} className="mx-auto" />
                        <p className="mt-3 text-[11px] font-medium">
                          El preview aparecerá aquí
                        </p>
                        <p className="mt-2 max-w-xs text-[9px] leading-4 text-[var(--fg-muted)]">
                          Cuando el agente haga push a la rama, Vercel enviará
                          la URL a esta sala. Producción permanece intacta.
                        </p>
                      </div>
                    </div>
                  )}
                </section>

                <section className="rounded-[8px] border border-black bg-white p-3">
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={`https://github.com/${selected.repo_full_name}/tree/${selected.work_branch}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-ghost"
                    >
                      <IconBranch size={11} /> Rama
                    </a>
                    {selected.pr_url ? (
                      <a
                        href={selected.pr_url}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-ghost"
                      >
                        <IconExtLink size={11} /> PR
                      </a>
                    ) : null}
                    {canWrite && selected.status === "preview_ready" ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void runAction("approve")}
                        className="btn-primary"
                      >
                        <IconCheck size={11} /> Aprobar y crear PR
                      </button>
                    ) : null}
                    {canWrite && selected.status === "approved" ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void runAction("publish")}
                        className="btn-primary"
                      >
                        <IconRocket size={11} /> Publicar
                      </button>
                    ) : null}
                    {canWrite && ACTIVE.has(selected.status) ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void runAction("cancel")}
                        className="btn-ghost"
                      >
                        <IconStop size={11} /> Cancelar
                      </button>
                    ) : null}
                  </div>
                  <p className="mt-3 text-[9px] leading-4 text-[var(--fg-muted)]">
                    Aprobar crea el PR. Publicar lo fusiona a{" "}
                    {selected.base_branch} y entonces comienza producción.
                  </p>
                </section>
              </div>
            </div>
          ) : (
            <div className="grid h-full place-items-center p-8 text-center">
              <div>
                <span className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-black font-semibold text-white">
                  V
                </span>
                <p className="mt-3 text-[12px] font-medium">
                  Tu cabina de ejecución
                </p>
                <p className="mt-2 text-[10px] text-[var(--fg-muted)]">
                  Selecciona un run o inicia una tarea.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
