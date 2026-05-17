"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Sparkles, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ComposerV3 } from "./composer";

interface Message {
  id: string;
  role: "user" | "v";
  content: string;
  ts: number;
}

interface ChatV3Props {
  /** Optional pre-loaded system context label shown above the composer. */
  contextLabel?: string | null;
}

const SESSION_KEY = "v_chat_session_id";

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return `v_${Date.now()}`;
  let id = window.localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = `v_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    try {
      window.localStorage.setItem(SESSION_KEY, id);
    } catch {
      // ignore
    }
  }
  return id;
}

type SSEEvent =
  | { type: "text"; value: string }
  | { type: "tool_use_start"; id: string; name: string }
  | { type: "tool_use_result"; id: string; ok: boolean; summary: string }
  | { type: "model_fallback"; from: string; to: string; status: number | null; reason: string }
  | { type: "done"; tokensIn: number; tokensOut: number; model: string }
  | { type: "error"; message: string };

interface HistoryTurn {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  created_at: string;
}

/**
 * ChatV3 — V's voice. Connected to /api/forge/run (the real brain:
 * system-prompt v2 + 22+ tools + skills + memory). On mount it
 * rehydrates the conversation from /api/forge/conversations so V
 * never looks like she's "starting from zero" — her server-side
 * memory was always there, the UI just used to forget how to show it.
 */
export function ChatV3({ contextLabel = null }: ChatV3Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isHydrating, setIsHydrating] = useState(true);
  const [hydrateError, setHydrateError] = useState<string | null>(null);
  const sessionIdRef = useRef<string>(`v_${Date.now()}`);
  const abortRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<Message[]>(messages);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Mount: hydrate session id + history from server.
  useEffect(() => {
    const sid = getOrCreateSessionId();
    sessionIdRef.current = sid;

    const ctrl = new AbortController();
    fetch(
      `/api/forge/conversations?sessionId=${encodeURIComponent(sid)}&limit=100`,
      { cache: "no-store", signal: ctrl.signal },
    )
      .then((r) => (r.ok ? r.json() : { turns: [] }))
      .then((data: { turns: HistoryTurn[] }) => {
        const hydrated: Message[] = (data.turns ?? [])
          .filter((t) => t.role === "user" || t.role === "assistant")
          .map((t) => ({
            id: t.id,
            role: t.role === "assistant" ? "v" : "user",
            content: t.content,
            ts: new Date(t.created_at).getTime(),
          }));
        setMessages(hydrated);
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
        setHydrateError(
          "No pude cargar tu historial con V (memoria server-side intacta — solo es la vista).",
        );
      })
      .finally(() => {
        setIsHydrating(false);
      });

    return () => {
      ctrl.abort();
      abortRef.current?.abort();
    };
  }, []);

  // Autoscroll on new messages while at-bottom.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < 200;
    if (nearBottom) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [messages.length, isStreaming]);

  const handleSubmit = useCallback(
    async (content: string) => {
      const userMsg: Message = {
        id: `u_${Date.now()}`,
        role: "user",
        content,
        ts: Date.now(),
      };
      const aId = `v_${Date.now()}`;
      const aMsg: Message = { id: aId, role: "v", content: "", ts: Date.now() };
      setMessages((prev) => [...prev, userMsg, aMsg]);
      setIsStreaming(true);

      const history = messagesRef.current.map((m) => ({
        role: m.role === "v" ? ("assistant" as const) : ("user" as const),
        content: m.content,
      }));
      history.push({ role: "user", content });

      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      try {
        const res = await fetch("/api/forge/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: history,
            sessionId: sessionIdRef.current,
          }),
          signal: ctrl.signal,
        });
        if (!res.ok || !res.body) {
          const err = await res.text().catch(() => "");
          setMessages((p) =>
            p.map((m) =>
              m.id === aId
                ? {
                    ...m,
                    content: `⚠ Error del servidor (${res.status}): ${err.slice(0, 200)}`,
                  }
                : m,
            ),
          );
          return;
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const evt = JSON.parse(line.slice(6)) as SSEEvent;
              if (evt.type === "text") {
                setMessages((p) =>
                  p.map((m) =>
                    m.id === aId ? { ...m, content: m.content + evt.value } : m,
                  ),
                );
              } else if (evt.type === "error") {
                setMessages((p) =>
                  p.map((m) =>
                    m.id === aId
                      ? { ...m, content: m.content + `\n\n⚠ ${evt.message}` }
                      : m,
                  ),
                );
              }
            } catch {
              // skip malformed event
            }
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        const msg = err instanceof Error ? err.message : String(err);
        setMessages((p) =>
          p.map((m) =>
            m.id === aId ? { ...m, content: `⚠ Error de red: ${msg}` } : m,
          ),
        );
      } finally {
        setIsStreaming(false);
      }
    },
    [],
  );

  function handleStop() {
    abortRef.current?.abort();
    setIsStreaming(false);
  }

  const isEmpty = !isHydrating && messages.length === 0;

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Messages region */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 md:px-6 py-6 space-y-6">
          {isHydrating && (
            <div className="text-center py-12">
              <div className="inline-flex items-center gap-2 text-xs font-mono text-vf-fg-2">
                <span className="w-1.5 h-1.5 rounded-full bg-vf-fg-2 animate-pulse" />
                Cargando memoria de V…
              </div>
            </div>
          )}

          {hydrateError && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-xs text-amber-200/90 flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span>{hydrateError}</span>
            </div>
          )}

          {isEmpty && <EmptyHero />}

          {messages.map((m, i) => (
            <MessageBubble
              key={m.id}
              message={m}
              isLast={i === messages.length - 1}
              isStreaming={isStreaming && i === messages.length - 1 && m.role === "v"}
            />
          ))}
        </div>
      </div>

      {/* Composer */}
      <div className="border-t border-vf-border bg-vf-bg flex-shrink-0">
        <div className="mx-auto max-w-3xl px-4 md:px-6 py-3 md:py-4">
          {contextLabel && (
            <div className="mb-2 text-[10px] font-mono uppercase tracking-wider text-vf-fg-2 flex items-center gap-1.5">
              <Sparkles className="w-2.5 h-2.5" />
              {contextLabel}
            </div>
          )}
          <ComposerV3
            onSubmit={handleSubmit}
            onStop={handleStop}
            isStreaming={isStreaming}
            autofocusDesktop
          />
        </div>
      </div>
    </div>
  );
}

function EmptyHero() {
  return (
    <div className="py-16 md:py-24 text-center space-y-4">
      <div className="inline-flex w-12 h-12 rounded-xl bg-vf-green/10 border border-vf-green/30 items-center justify-center">
        <Sparkles className="w-5 h-5 text-vf-green" />
      </div>
      <div className="space-y-1.5">
        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-vf-fg">
          ¿Qué construimos hoy?
        </h2>
        <p className="text-sm text-vf-fg-1 max-w-md mx-auto leading-relaxed">
          V tiene tu memoria, tus skills y tus tools. Háblale como a una
          camarada técnica — ella se encarga.
        </p>
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  isLast,
  isStreaming,
}: {
  message: Message;
  isLast: boolean;
  isStreaming: boolean;
}) {
  const isV = message.role === "v";
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        {isV ? (
          <>
            <div className="w-5 h-5 rounded bg-vf-green/15 border border-vf-green/40 flex items-center justify-center">
              <span className="text-[10px] font-bold text-vf-green leading-none">
                V
              </span>
            </div>
            <span className="text-xs font-semibold text-vf-fg">V</span>
            {isStreaming && (
              <span className="w-1.5 h-1.5 rounded-full bg-vf-green animate-pulse ml-1" />
            )}
          </>
        ) : (
          <>
            <div className="w-5 h-5 rounded bg-vf-bg-2 border border-vf-border flex items-center justify-center">
              <span className="text-[10px] font-bold text-vf-fg-1 leading-none">
                L
              </span>
            </div>
            <span className="text-xs font-semibold text-vf-fg">Luis</span>
          </>
        )}
      </div>
      <div
        className={cn(
          "text-sm leading-relaxed whitespace-pre-wrap break-words",
          "pl-7", // align with avatar
          isV ? "text-vf-fg" : "text-vf-fg-1",
        )}
      >
        {message.content ||
          (isStreaming ? (
            <span className="inline-flex items-center gap-1.5 text-vf-fg-2">
              <span
                className="w-1 h-1 rounded-full bg-vf-fg-2 animate-bounce"
                style={{ animationDelay: "0ms" }}
              />
              <span
                className="w-1 h-1 rounded-full bg-vf-fg-2 animate-bounce"
                style={{ animationDelay: "120ms" }}
              />
              <span
                className="w-1 h-1 rounded-full bg-vf-fg-2 animate-bounce"
                style={{ animationDelay: "240ms" }}
              />
            </span>
          ) : (
            <span className="text-vf-fg-3 italic">(sin contenido)</span>
          ))}
      </div>
    </div>
  );
}

// Avoid unused import warning when `isLast` is reserved for future logic.
export type { Message };
