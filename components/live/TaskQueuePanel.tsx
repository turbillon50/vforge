"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { IconLoader, IconCheck, IconSparkles } from "@/components/brand/VFIcons";
import { writePendingPrompt } from "@/lib/live/pending-prompt";

interface QueueTask {
  id: string;
  project_id: string;
  comment_id: string;
  status: string;
  created_at: string;
  result_summary: string | null;
  project_name: string | null;
  source_preview: string | null;
}

function timeAgo(iso: string) {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "?";
  const m = Math.max(0, Math.floor((Date.now() - t) / 60_000));
  if (m < 1) return "ahora";
  if (m < 60) return `hace ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  return `hace ${Math.floor(h / 24)}d`;
}

/** Cola global de tareas live (solo owner). Muestra queued/running de todos los proyectos. */
export function TaskQueuePanel({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [tasks, setTasks] = useState<QueueTask[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/live/tasks", { cache: "no-store" });
      if (res.status === 403) {
        setError(null);
        setTasks([]);
        setLoaded(true);
        return;
      }
      if (!res.ok) {
        setError("No se pudo cargar la cola");
        return;
      }
      const data = (await res.json()) as { tasks?: QueueTask[] };
      setTasks(Array.isArray(data.tasks) ? data.tasks : []);
      setError(null);
    } catch {
      setError("Cola no disponible");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 12_000);
    return () => window.clearInterval(timer);
  }, [load]);

  async function openInStudio(task: QueueTask) {
    if (busyId) return;
    setBusyId(task.id);
    try {
      const res = await fetch(
        `/api/live/${encodeURIComponent(task.project_id)}/tasks/${encodeURIComponent(task.id)}`,
        { cache: "no-store" },
      );
      if (!res.ok) {
        setError("No se pudo leer la tarea");
        return;
      }
      const data = (await res.json()) as { task?: { id: string; prompt?: string } };
      if (!data.task?.prompt) {
        setError("La tarea no tiene prompt");
        return;
      }
      writePendingPrompt({
        projectId: task.project_id,
        taskId: data.task.id || task.id,
        prompt: data.task.prompt,
        at: Date.now(),
      });
      router.push(
        `/app/chat?projectId=${encodeURIComponent(task.project_id)}&task=${encodeURIComponent(task.id)}`,
      );
    } catch {
      setError("Error al abrir en Estudio");
    } finally {
      setBusyId(null);
    }
  }

  async function cancelTask(task: QueueTask) {
    if (busyId) return;
    setBusyId(task.id);
    try {
      await fetch(
        `/api/live/${encodeURIComponent(task.project_id)}/tasks/${encodeURIComponent(task.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "cancelled",
            result_summary: "Cancelada desde cola global",
          }),
        },
      );
      await load();
    } catch {
      setError("No se pudo cancelar");
    } finally {
      setBusyId(null);
    }
  }

  if (!loaded) {
    return (
      <div className={cn("flex items-center gap-2 p-3 text-[11px]", className)}>
        <IconLoader size={12} className="animate-spin" /> Cargando cola…
      </div>
    );
  }

  // Si 403 o vacío y no owner, no mostrar nada ruidoso
  if (tasks.length === 0 && !error) {
    return compact ? null : (
      <div className={cn("rounded-md border border-[var(--border-1)] bg-white p-3", className)}>
        <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-[var(--fg-muted)]">
          Cola global
        </p>
        <p className="mt-1 text-[11px] text-[var(--fg-muted)]">Sin tareas en cola.</p>
      </div>
    );
  }

  return (
    <section
      className={cn(
        "rounded-md border border-black/20 bg-[#f7f7f5]",
        compact ? "p-2" : "p-3",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[9px] uppercase tracking-[0.12em]">
          Cola global · {tasks.length} activa{tasks.length === 1 ? "" : "s"}
        </p>
        <button
          type="button"
          onClick={() => void load()}
          className="font-mono text-[8px] uppercase tracking-[0.08em] text-[var(--fg-muted)] hover:text-black"
        >
          Refresh
        </button>
      </div>

      {error ? <p className="mt-2 text-[10px] text-black">{error}</p> : null}

      <div className={cn("mt-2 space-y-2", compact ? "max-h-40" : "max-h-72", "overflow-y-auto")}>
        {tasks.map((t) => (
          <article
            key={t.id}
            className="rounded border border-[var(--border-1)] bg-white p-2.5"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-[11px] font-medium">
                  {t.project_name || t.project_id}
                </p>
                <p className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.08em] text-[var(--fg-muted)]">
                  {t.status} · {timeAgo(t.created_at)} · {t.id.slice(0, 8)}
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded px-1.5 py-0.5 font-mono text-[8px] uppercase",
                  t.status === "running"
                    ? "bg-black text-white"
                    : "border border-black/30",
                )}
              >
                {t.status}
              </span>
            </div>
            {t.source_preview ? (
              <p className="mt-1.5 line-clamp-2 text-[10px] leading-4 text-[var(--fg-secondary)]">
                {t.source_preview}
              </p>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-1.5">
              <button
                type="button"
                disabled={!!busyId}
                onClick={() => void openInStudio(t)}
                className="inline-flex h-7 items-center gap-1 rounded-md bg-black px-2 font-mono text-[8px] uppercase tracking-[0.08em] text-white disabled:opacity-40"
              >
                {busyId === t.id ? (
                  <IconLoader size={10} className="animate-spin" />
                ) : (
                  <IconSparkles size={10} />
                )}
                Abrir en Estudio
              </button>
              <button
                type="button"
                disabled={!!busyId}
                onClick={() => void cancelTask(t)}
                className="inline-flex h-7 items-center gap-1 rounded-md border border-[var(--border-1)] px-2 font-mono text-[8px] uppercase tracking-[0.08em] disabled:opacity-40"
              >
                <IconCheck size={10} /> Cancelar
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
