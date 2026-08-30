"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  IconArrowR,
  IconLoader,
  IconSend,
  IconSparkles,
} from "@/components/brand/VFIcons";

type ConversationMode = "talk" | "plan";

interface AssistantMessage {
  id: string;
  mode: ConversationMode;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  provider?: string | null;
  model?: string | null;
}

interface Repository {
  repo_full_name: string;
  is_primary: boolean;
  default_branch: string | null;
}

export function VConversationPanel({
  projectId,
  mode,
  canWrite,
  repositories,
  repository,
  onRepositoryChange,
  onUseAsTask,
}: {
  projectId: string;
  mode: ConversationMode;
  canWrite: boolean;
  repositories: Repository[];
  repository: string;
  onRepositoryChange: (repository: string) => void;
  onUseAsTask: (plan: string) => void;
}) {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const pollingRef = useRef(false);
  const endRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (pollingRef.current) return;
    pollingRef.current = true;
    try {
      const response = await fetch(
        `/api/live/${encodeURIComponent(projectId)}/assistant`,
        { cache: "no-store" },
      );
      const payload = (await response.json().catch(() => null)) as {
        messages?: AssistantMessage[];
      } | null;
      if (!response.ok) throw new Error("No se pudo cargar la conversación.");
      setMessages(Array.isArray(payload?.messages) ? payload.messages : []);
      setError(null);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No se pudo cargar la conversación.",
      );
    } finally {
      pollingRef.current = false;
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 5000);
    return () => window.clearInterval(timer);
  }, [load]);

  const visibleMessages = useMemo(
    () => messages.filter((item) => item.mode === mode),
    [messages, mode],
  );
  const latestPlan = useMemo(
    () =>
      mode === "plan"
        ? ([...visibleMessages]
            .reverse()
            .find((item) => item.role === "assistant")?.content ?? null)
        : null,
    [mode, visibleMessages],
  );

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [visibleMessages.length, busy, mode]);

  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || busy || !canWrite) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(
        `/api/live/${encodeURIComponent(projectId)}/assistant`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode, message: trimmed, repository }),
        },
      );
      const payload = (await response.json().catch(() => null)) as {
        messages?: AssistantMessage[];
        error?: string;
        notice?: string;
      } | null;
      if (!response.ok)
        throw new Error(payload?.notice || payload?.error || "V no pudo responder.");
      if (payload?.notice) setNotice(payload.notice);
      setMessages(Array.isArray(payload?.messages) ? payload.messages : []);
      setMessage("");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "V no pudo responder.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[var(--color-background)]">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[var(--border-1)] bg-white px-3 py-2">
        <div>
          <p className="text-[11px] font-medium">
            {mode === "talk" ? "Plática con V" : "Planeación con V"}
          </p>
          <p className="mt-0.5 text-[9px] text-[var(--fg-muted)]">
            {mode === "talk"
              ? "Conversa sin crear ramas ni ejecutar agentes."
              : "Define el trabajo antes de permitir cualquier cambio."}
          </p>
        </div>
        <select
          value={repository}
          onChange={(event) => onRepositoryChange(event.target.value)}
          className="min-h-8 max-w-[280px] rounded-md border border-[var(--border-1)] bg-white px-2 text-[10px] outline-none focus:border-black"
          aria-label="Repositorio de contexto"
        >
          {repositories.map((repo) => (
            <option key={repo.repo_full_name} value={repo.repo_full_name}>
              {repo.repo_full_name}
            </option>
          ))}
        </select>
      </div>

      <div
        className="min-h-0 flex-1 overflow-y-auto px-3 py-4"
        aria-live="polite"
      >
        {loading ? (
          <div className="flex h-full items-center justify-center gap-2 text-[10px] text-[var(--fg-muted)]">
            <IconLoader size={12} className="animate-spin" /> Cargando
            conversación…
          </div>
        ) : visibleMessages.length ? (
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-3">
            {visibleMessages.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "flex w-full",
                  item.role === "user" ? "justify-end" : "justify-start",
                )}
              >
                <article
                  className={cn(
                    "min-w-[10rem] max-w-[min(86%,40rem)] break-words rounded-[12px] px-4 py-3 text-[12px] leading-5 [overflow-wrap:anywhere]",
                    item.role === "user"
                      ? "bg-[var(--color-ink)] text-[var(--color-background)] [&_p]:!text-[var(--color-background)]"
                      : "border border-[var(--border-1)] bg-white text-[var(--color-ink)] [&_p]:!text-[var(--color-ink)]",
                  )}
                >
                  <p
                    className={cn(
                      "mb-1 font-mono text-[8px] uppercase tracking-[0.1em]",
                      item.role === "user"
                        ? "text-[var(--color-background)]"
                        : "text-[var(--fg-muted)]",
                    )}
                  >
                    {item.role === "user" ? "Tú" : "V"}
                  </p>
                  <p className="whitespace-pre-wrap break-words">{item.content}</p>
                </article>
              </div>
            ))}
            {busy ? (
              <div className="flex justify-start">
                <div className="flex min-w-[10rem] items-center gap-2 rounded-[12px] border border-[var(--border-1)] bg-white px-4 py-3 text-[10px] text-[var(--fg-muted)]">
                  <IconLoader size={12} className="animate-spin" /> V está
                  pensando…
                </div>
              </div>
            ) : null}
            <div ref={endRef} />
          </div>
        ) : (
          <div className="grid h-full place-items-center text-center">
            <div className="max-w-sm">
              <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-black text-white">
                <IconSparkles size={17} />
              </span>
              <p className="mt-3 text-[12px] font-medium">
                {mode === "talk"
                  ? "Platícale a V"
                  : "Planea antes de construir"}
              </p>
              <p className="mt-2 text-[10px] leading-5 text-[var(--fg-muted)]">
                {mode === "talk"
                  ? "Pregúntale, explícale el objetivo o revisen juntos qué sigue."
                  : "Describe el resultado; V organizará alcance, pasos, riesgos y aceptación."}
              </p>
            </div>
          </div>
        )}
      </div>

      {notice ? (
        <p className="shrink-0 bg-white px-3 py-1.5 text-center font-mono text-[8px] uppercase tracking-[0.08em] text-[var(--fg-muted)]">
          {notice}
        </p>
      ) : null}

      {error ? (
        <p className="shrink-0 bg-white px-3 py-2 text-center text-[10px] text-[var(--color-danger)]">
          {error}
        </p>
      ) : null}

      {mode === "plan" && latestPlan ? (
        <div className="flex shrink-0 justify-end bg-white px-3 py-2">
          <button
            type="button"
            onClick={() => onUseAsTask(latestPlan)}
            className="btn-ghost"
          >
            Usar como tarea <IconArrowR size={11} />
          </button>
        </div>
      ) : null}

      {canWrite ? (
        <form onSubmit={send} className="shrink-0 bg-white px-3 pb-3 pt-1">
          <div className="mx-auto flex max-w-4xl items-end gap-2 rounded-[12px] border border-[var(--border-1)] px-2 py-2">
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              rows={2}
              maxLength={6000}
              placeholder={
                mode === "talk"
                  ? "Platícale a V…"
                  : "¿Qué necesitamos planear antes de ejecutar?"
              }
              className="min-h-12 flex-1 resize-y border-0 bg-transparent px-2 py-1.5 text-[12px] leading-5 outline-none"
            />
            <button
              type="submit"
              disabled={busy || !message.trim()}
              className="btn-primary min-h-12 px-4 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? (
                <IconLoader size={12} className="animate-spin" />
              ) : (
                <IconSend size={12} />
              )}
              Enviar
            </button>
          </div>
          <p className="mx-auto mt-2 max-w-4xl font-mono text-[8px] uppercase tracking-[0.08em] text-[var(--fg-muted)]">
            Enter envía · Shift + Enter agrega línea · sin cambios en GitHub
          </p>
        </form>
      ) : (
        <p className="shrink-0 bg-white px-3 py-3 text-[10px] text-[var(--fg-muted)]">
          Vista de lectura. Sólo el owner puede conversar o planear con V.
        </p>
      )}
    </div>
  );
}
