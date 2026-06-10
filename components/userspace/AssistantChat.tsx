"use client";
/**
 * AssistantChat — Higgsfield "Obsidian + Crystal" redesign
 * Mantiene toda la lógica de streaming. Rediseño visual únicamente.
 */
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IconLoader, IconSend, IconSparkles, IconZap } from "@/components/brand/VFIcons";
import { Markdown } from "@/components/workspace/chat/Markdown";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const QUICK_PROMPTS = [
  "¿Cuáles son las funciones clave?",
  "Explica el blueprint",
  "¿Cómo funciona VForge?",
];

export default function AssistantChat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/workspace/assistant")
      .then((r) => r.json())
      .then((data: { messages?: Msg[] }) => {
        if (alive && Array.isArray(data.messages)) setMessages(data.messages);
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, busy]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 128)}px`;
  }, [input]);

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || busy) return;
    setError(null);
    setInput("");
    setBusy(true);
    setMessages((m) => [
      ...m,
      { role: "user", content },
      { role: "assistant", content: "" },
    ]);

    try {
      const res = await fetch("/api/workspace/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content }),
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
    <div className="flex h-full min-h-0 flex-col bg-[#0a0a0f]">
      {/* Header */}
      <div className="relative flex items-center gap-3 border-b border-white/6 px-5 py-4">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />
        {/* V avatar */}
        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 shadow-glow">
          <IconSparkles size={15} className="text-white" />
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0a0a0f] bg-emerald-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-on-surface">Asistente VForge</p>
          <p className="font-mono text-[10px] text-muted">
            {busy ? (
              <span className="text-cyan-400 flex items-center gap-1">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
                escribiendo…
              </span>
            ) : (
              "en línea"
            )}
          </p>
        </div>
        <div className="ml-auto">
          <div className="flex items-center gap-1.5 rounded-full border border-white/8 bg-white/4 px-3 py-1">
            <IconZap size={10} className="text-violet-400" />
            <span className="font-mono text-[10px] text-muted">Claude Sonnet</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5"
        style={{ scrollbarWidth: "none" }}
      >
        {loading ? (
          <div className="flex h-full items-center justify-center text-muted">
            <IconLoader className="h-5 w-5 animate-spin" aria-hidden />
          </div>
        ) : messages.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="flex h-full flex-col items-center justify-center text-center"
          >
            {/* Central orb */}
            <div className="relative mb-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600/80 to-cyan-500/80 shadow-glow backdrop-blur">
                <IconSparkles className="h-7 w-7 text-white" aria-hidden />
              </div>
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-500 opacity-20 blur-xl" />
            </div>
            <p className="font-display text-xl font-semibold tracking-tight text-on-surface">
              Hola, soy tu asistente
            </p>
            <p className="mt-2 max-w-xs text-sm text-muted">
              Pregúntame sobre tu alcance, el blueprint o el método VForge.
            </p>

            {/* Quick prompts */}
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => void send(prompt)}
                  className="rounded-full border border-violet-500/25 bg-violet-500/6 px-4 py-2 text-[12px] text-violet-300 transition-all hover:border-violet-500/50 hover:bg-violet-500/12"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, ease: EASE }}
                className={m.role === "user" ? "flex justify-end" : "flex justify-start gap-3"}
              >
                {m.role === "assistant" && (
                  <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500">
                    <IconSparkles size={12} className="text-white" />
                  </div>
                )}

                {m.role === "user" ? (
                  <div className="max-w-[82%] rounded-2xl rounded-br-sm bg-gradient-to-br from-violet-600 to-violet-500 px-4 py-3 text-sm text-white shadow-glow-violet">
                    {m.content}
                  </div>
                ) : (
                  <div className="relative max-w-[88%] overflow-hidden rounded-2xl rounded-bl-sm border border-white/8 bg-white/4 px-4 py-3 text-sm text-on-surface backdrop-blur-sm">
                    {/* Crystal sheen */}
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    {m.content ? (
                      <Markdown text={m.content} streaming={busy && i === messages.length - 1} />
                    ) : (
                      <div className="flex items-center gap-1.5 py-1">
                        {[0, 1, 2].map((j) => (
                          <span
                            key={j}
                            className="h-1.5 w-1.5 rounded-full bg-violet-400"
                            style={{
                              animation: `typing-dot 1.2s ease-in-out infinite`,
                              animationDelay: `${j * 0.2}s`,
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}

        {error && (
          <p className="text-center text-xs text-red-400" role="alert">
            {error}
          </p>
        )}
      </div>

      {/* Input */}
      <div className="relative border-t border-white/6 p-4">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/6 to-transparent" />
        <div
          className={`flex items-end gap-3 overflow-hidden rounded-2xl border bg-white/4 px-4 py-3 backdrop-blur-sm transition-all duration-200 ${
            busy
              ? "border-violet-500/30"
              : "border-white/10 focus-within:border-violet-500/40 focus-within:bg-white/5"
          }`}
        >
          <textarea
            ref={textareaRef}
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
            disabled={busy}
            className="max-h-32 min-h-[24px] flex-1 resize-none bg-transparent text-sm text-on-surface outline-none placeholder:text-muted/50 disabled:opacity-50"
            style={{ scrollbarWidth: "none" }}
          />
          <button
            onClick={() => void send()}
            disabled={busy || !input.trim()}
            aria-label="Enviar"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 text-white shadow-glow transition-all hover:brightness-110 disabled:opacity-30 disabled:shadow-none"
          >
            {busy ? (
              <IconLoader className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <IconSend className="h-3.5 w-3.5" aria-hidden />
            )}
          </button>
        </div>
        <p className="mt-2 text-center font-mono text-[9px] uppercase tracking-widest text-muted/40">
          Enter para enviar · Shift+Enter nueva línea
        </p>
      </div>

      <style jsx>{`
        @keyframes typing-dot {
          0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
          30% { opacity: 1; transform: translateY(-3px); }
        }
      `}</style>
    </div>
  );
}
