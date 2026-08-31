"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
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
}

export function VConversationPanel({
  projectId,
  canWrite,
  repository,
  onDispatchGrok,
}: {
  projectId: string;
  mode?: ConversationMode;
  canWrite: boolean;
  repositories?: Array<{ repo_full_name: string }>;
  repository?: string;
  onRepositoryChange?: (repository: string) => void;
  onUseAsTask?: (plan: string) => void;
  onPromoteToPlan?: (talk: string) => void;
  onDispatchGrok?: (order: string) => void;
  onApply?: () => void;
  canApply?: boolean;
  compact?: boolean;
  seed?: string;
}) {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
      if (!response.ok) throw new Error("No se pudo cargar el chat.");
      setMessages(Array.isArray(payload?.messages) ? payload.messages : []);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo cargar el chat.");
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

  const visibleMessages = useMemo(() => messages.slice(-80), [messages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [visibleMessages.length, busy]);

  async function sendMessage(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed || busy || !canWrite) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/live/${encodeURIComponent(projectId)}/assistant`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "talk", message: trimmed, repository }),
        },
      );
      const payload = (await response.json().catch(() => null)) as {
        messages?: AssistantMessage[];
        error?: string;
        notice?: string;
      } | null;
      if (!response.ok)
        throw new Error(payload?.notice || payload?.error || "V no pudo responder.");
      setMessages(Array.isArray(payload?.messages) ? payload.messages : []);
      setMessage("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "V no pudo responder.");
    } finally {
      setBusy(false);
    }
  }

  const lastUser =
    [...visibleMessages].reverse().find((item) => item.role === "user")?.content ?? "";

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[var(--color-background)]">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--border-1)] bg-white px-3 py-2">
        <div>
          <p className="text-[11px] font-medium">V</p>
          <p className="mt-0.5 text-[9px] text-[var(--fg-muted)]">
            Tu hermana. Siempre aquí. Recuerda.
          </p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4" aria-live="polite">
        {loading ? (
          <div className="flex h-full items-center justify-center gap-2 text-[10px] text-[var(--fg-muted)]">
            <IconLoader size={12} className="animate-spin" /> Cargando…
          </div>
        ) : visibleMessages.length ? (
          <div className="flex flex-col gap-3">
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
                    "min-w-[8rem] max-w-[92%] break-words rounded-[12px] px-4 py-3 text-[12px] leading-5",
                    item.role === "user"
                      ? "bg-[var(--color-ink)] text-[var(--color-background)]"
                      : "border border-[var(--border-1)] bg-white",
                  )}
                >
                  <p className="mb-1 font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--fg-muted)]">
                    {item.role === "user" ? "Tú" : "V"}
                  </p>
                  <p className="whitespace-pre-wrap break-words">{item.content}</p>
                </article>
              </div>
            ))}
            {busy ? (
              <div className="flex justify-start text-[10px] text-[var(--fg-muted)]">
                <IconLoader size={12} className="mr-2 animate-spin" /> V está pensando…
              </div>
            ) : null}
            <div ref={endRef} />
          </div>
        ) : (
          <div className="grid h-full place-items-center text-center">
            <div className="max-w-xs">
              <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-black text-white">
                <IconSparkles size={17} />
              </span>
              <p className="mt-3 text-[12px] font-medium">Ey hermano</p>
              <p className="mt-2 text-[10px] leading-5 text-[var(--fg-muted)]">
                Este chat no se va. Si hay que mandar a Grok, eso vive al centro.
              </p>
            </div>
          </div>
        )}
      </div>

      {error ? (
        <p className="shrink-0 bg-white px-3 py-2 text-center text-[10px] text-[var(--color-danger)]">
          {error}
        </p>
      ) : null}

      {canWrite ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void sendMessage(message);
          }}
          className="shrink-0 bg-white px-3 pb-3 pt-1"
        >
          <div className="flex items-end gap-2 rounded-[12px] border border-[var(--border-1)] px-2 py-2">
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
              placeholder="Háblale a V…"
              className="min-h-12 flex-1 resize-y border-0 bg-transparent px-2 py-1.5 text-[12px] leading-5 outline-none"
            />
            <button
              type="submit"
              disabled={busy || !message.trim()}
              className="btn-primary min-h-12 px-4 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? <IconLoader size={12} className="animate-spin" /> : <IconSend size={12} />}
              Enviar
            </button>
          </div>
          {onDispatchGrok ? (
            <button
              type="button"
              className="mt-2 text-[9px] text-[var(--fg-muted)] underline-offset-2 hover:underline"
              onClick={() => onDispatchGrok((message.trim() || lastUser).slice(0, 12000))}
              disabled={busy || !(message.trim() || lastUser)}
            >
              Mandar esto al centro → Grok
            </button>
          ) : null}
        </form>
      ) : (
        <p className="shrink-0 bg-white px-3 py-3 text-[10px] text-[var(--fg-muted)]">
          Sólo el owner habla con V.
        </p>
      )}
    </div>
  );
}
