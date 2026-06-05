"use client";

/**
 * Chat con el asistente genérico de VForge (no es V).
 * Historial vía GET /api/workspace/assistant, envío con streaming SSE.
 */
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, SendHorizonal, Sparkles } from "lucide-react";
import { Markdown } from "@/components/workspace/chat/Markdown";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export default function AssistantChat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/workspace/assistant")
      .then((r) => r.json())
      .then((data: { messages?: Msg[] }) => {
        if (alive && Array.isArray(data.messages)) setMessages(data.messages);
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, busy]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setError(null);
    setInput("");
    setBusy(true);
    setMessages((m) => [
      ...m,
      { role: "user", content: text },
      { role: "assistant", content: "" },
    ]);

    try {
      const res = await fetch("/api/workspace/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Error del asistente");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const ev of events) {
          const line = ev.trim();
          if (!line.startsWith("data:")) continue;
          let parsed: { type?: string; value?: string; message?: string };
          try {
            parsed = JSON.parse(line.slice(5).trim());
          } catch {
            continue;
          }
          if (parsed.type === "text" && parsed.value) {
            setMessages((m) => {
              const next = [...m];
              const last = next[next.length - 1];
              next[next.length - 1] = {
                ...last,
                content: last.content + parsed.value,
              };
              return next;
            });
          } else if (parsed.type === "error") {
            throw new Error(parsed.message ?? "Error del asistente");
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado");
      setMessages((m) =>
        m[m.length - 1]?.role === "assistant" && m[m.length - 1].content === ""
          ? m.slice(0, -1)
          : m,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6"
      >
        {loading ? (
          <div className="flex h-full items-center justify-center text-muted">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-500 shadow-elev">
              <Sparkles className="h-5 w-5 text-white" aria-hidden />
            </span>
            <p className="mt-4 font-display text-lg font-medium text-on-surface">
              Tu asistente VForge
            </p>
            <p className="mt-1 max-w-xs text-sm text-on-surface-variant">
              Pregúntame sobre tu alcance, el blueprint o el método VForge.
            </p>
          </div>
        ) : (
          messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: EASE }}
              className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
            >
              {m.role === "user" ? (
                <div className="max-w-[85%] rounded-2xl rounded-br-md bg-gradient-to-br from-violet-600 to-violet-500 px-4 py-2.5 text-sm text-white shadow-elev">
                  {m.content}
                </div>
              ) : (
                <div className="max-w-[92%] rounded-2xl rounded-bl-md border border-app bg-tint-1 px-4 py-3 text-sm text-on-surface shadow-elev">
                  {m.content ? (
                    <Markdown text={m.content} streaming={busy && i === messages.length - 1} />
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin text-muted" aria-hidden />
                  )}
                </div>
              )}
            </motion.div>
          ))
        )}
        {error && (
          <p className="text-center text-xs text-red-400" role="alert">
            {error}
          </p>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
        className="glass border-t border-app p-3 sm:p-4"
      >
        <div className="flex items-end gap-2 rounded-2xl border border-app bg-tint-1 px-3 py-2 transition focus-within:border-violet-500/50">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            rows={1}
            placeholder="Escribe tu mensaje…"
            className="max-h-32 min-h-[28px] flex-1 resize-none bg-transparent py-1 text-sm text-on-surface outline-none placeholder:text-muted"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            aria-label="Enviar"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 text-white transition hover:brightness-110 disabled:opacity-40"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <SendHorizonal className="h-4 w-4" aria-hidden />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
