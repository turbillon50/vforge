"use client";

import { useCallback, useEffect, useState } from "react";
import {
  clearPendingPrompt,
  readPendingPrompt,
  type PendingLivePrompt,
} from "@/lib/live/pending-prompt";

/** Banner + ejecución del prompt de sala live sin tocar el estado interno de ForgeStudio. */
export function PendingTaskRunner() {
  const [pending, setPending] = useState<PendingLivePrompt | null>(null);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const projectId = params.get("projectId") || params.get("project");
    const taskId = params.get("task");
    const fromStorage = readPendingPrompt();
    if (fromStorage?.prompt) {
      setPending(fromStorage);
      return;
    }
    if (taskId && projectId) {
      void fetch(
        `/api/live/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(taskId)}`,
        { cache: "no-store" },
      )
        .then(async (res) => {
          if (!res.ok) return;
          const data = (await res.json()) as { task?: { id: string; prompt?: string } };
          if (data.task?.prompt) {
            setPending({
              projectId,
              taskId: data.task.id || taskId,
              prompt: data.task.prompt,
              at: Date.now(),
            });
          }
        })
        .catch(() => undefined);
    }
  }, []);

  const dismiss = useCallback(() => {
    clearPendingPrompt();
    setPending(null);
    setLog("");
  }, []);

  const markDone = useCallback(
    async (status: "done" | "cancelled") => {
      if (!pending) return;
      await fetch(
        `/api/live/${encodeURIComponent(pending.projectId)}/tasks/${encodeURIComponent(pending.taskId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status,
            result_summary:
              status === "done" ? log.slice(0, 500) : "Cancelada desde Estudio",
          }),
        },
      ).catch(() => undefined);
      dismiss();
    },
    [dismiss, log, pending],
  );

  const run = useCallback(async () => {
    if (!pending || busy) return;
    setBusy(true);
    setError(null);
    setLog("");
    try {
      const scope = pending.projectId || "general";
      const sessRes = await fetch(
        `/api/forge/active-session?scope=${encodeURIComponent(scope)}`,
        { cache: "no-store" },
      );
      const sess = (await sessRes.json()) as { sessionId?: string };
      if (!sessRes.ok || !sess.sessionId) {
        throw new Error("No se pudo abrir sesión del Estudio");
      }

      const response = await fetch("/api/forge/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: pending.prompt }],
          sessionId: sess.sessionId,
          projectId: pending.projectId,
        }),
      });
      if (!response.ok || !response.body) {
        throw new Error(`Motor HTTP ${response.status}`);
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let text = "";
      while (true) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const block of parts) {
          const line = block
            .split("\n")
            .filter((l) => l.startsWith("data:"))
            .map((l) => l.slice(5).trimStart())
            .join("\n");
          if (!line) continue;
          try {
            const ev = JSON.parse(line) as {
              type?: string;
              value?: string;
              message?: string;
            };
            if (ev.type === "text" && typeof ev.value === "string") {
              text += ev.value;
              setLog(text);
            }
            if (ev.type === "error") {
              setError(ev.message || "Error del motor");
            }
          } catch {
            /* ignore */
          }
        }
        if (done) break;
      }
      if (text.trim()) {
        await fetch(
          `/api/live/${encodeURIComponent(pending.projectId)}/tasks/${encodeURIComponent(pending.taskId)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              status: "done",
              result_summary: text.slice(0, 500),
            }),
          },
        ).catch(() => undefined);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falló la ejecución");
    } finally {
      setBusy(false);
    }
  }, [busy, pending]);

  if (!pending) return null;

  return (
    <div className="border-b border-black bg-[#f7f7f5] px-3 py-3 text-[var(--vf-fg,#111)]">
      <div className="mx-auto flex max-w-5xl flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-mono text-[9px] uppercase tracking-[0.12em]">
            Tarea {pending.taskId.slice(0, 8)} · proyecto {pending.projectId}
          </p>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              disabled={busy}
              onClick={() => void run()}
              className="rounded-md bg-black px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-white disabled:opacity-40"
            >
              {busy ? "Ejecutando…" : "Ejecutar en motor"}
            </button>
            <button
              type="button"
              onClick={() => void navigator.clipboard.writeText(pending.prompt)}
              className="rounded-md border border-black px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.1em]"
            >
              Copiar prompt
            </button>
            <button
              type="button"
              onClick={() => void markDone("cancelled")}
              className="rounded-md border border-[var(--border-1,#ddd)] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.1em]"
            >
              Descartar
            </button>
          </div>
        </div>
        <pre className="max-h-28 overflow-auto whitespace-pre-wrap rounded border border-black/20 bg-white p-2 font-mono text-[10px] leading-4">
          {pending.prompt.slice(0, 1200)}
          {pending.prompt.length > 1200 ? "…" : ""}
        </pre>
        {error ? <p className="text-[11px] text-black">{error}</p> : null}
        {log ? (
          <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded border border-black/10 bg-white p-2 text-[11px] leading-5">
            {log}
          </pre>
        ) : null}
      </div>
    </div>
  );
}
