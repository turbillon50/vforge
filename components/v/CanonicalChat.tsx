"use client";
import { ChartResult } from "./ChartResult";
import type { ChartArtifact } from "@/lib/v-canonical/charts";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IconHistory, IconPlus, IconX } from "@/components/brand/VFIcons";

interface Message {
  id?: string;
  artifacts?: ChartArtifact[];
  role: "user" | "assistant";
  content: string;
  model?: string | null;
}

interface SessionRow {
  id: string;
  titulo: string;
  created_at: string;
  last_at: string;
  count: number;
}

type Mode = "text" | "voice";

const INTRO: Message = {
  role: "assistant",
  content: "Hola, soy V. ¿En qué te ayudo hoy?",
};
const STORAGE_KEY = "v_chat_session";

function makeSessionId(): string {
  return `vs_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** "hace 5 min" / "hace 3 h" / "ayer" / "12 jun" para la lista de hilos. */
function whenLabel(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const ms = Date.now() - t;
  const min = Math.floor(ms / 60_000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `hace ${hrs} h`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "ayer";
  if (days < 7) return `hace ${days} d`;
  return new Date(t).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
  });
}

export default function VCanonicalChat() {
  const [mode] = useState<Mode>("text");
  const [messages, setMessages] = useState<Message[]>([INTRO]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hydrating, setHydrating] = useState(true);
  const [historyReady, setHistoryReady] = useState(false);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const pendingRef = useRef<{ sid: string; text: string; id: string } | null>(
    null,
  );
  const sessionIdRef = useRef<string>("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/v/sessions?limit=40", {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error("sessions");
      if (Array.isArray(data?.sessions)) setSessions(data.sessions);
    } catch {
      setNotice(
        "No pude cargar la lista de conversaciones. Abre Hilos para reintentar.",
      );
    }
  }, []);

  const loadHistory = useCallback(async (sid: string) => {
    setHydrating(true);
    setHistoryReady(false);
    setMessages([INTRO]);
    try {
      const res = await fetch(
        `/api/v/canonical/messages?sessionId=${encodeURIComponent(sid)}&limit=200`,
        { cache: "no-store" },
      );
      const data = await res.json();
      if (!res.ok) throw new Error("history");
      if (sessionIdRef.current !== sid) return;
      const hist: Message[] = Array.isArray(data?.messages)
        ? data.messages
            .filter(
              (m: Message) =>
                m && (m.role === "user" || m.role === "assistant"),
            )
            .map((m: Message) => ({
              role: m.role,
              content: m.content,
              model: typeof m.model === "string" ? m.model : null,
              id: typeof m.id === "string" ? m.id : undefined,
              artifacts: Array.isArray(m.artifacts) ? m.artifacts : [],
            }))
        : [];
      // Sólo mostramos this session's turns; si está vacío, el saludo de V.
      setMessages(hist.length ? hist : [INTRO]);
      setHistoryReady(true);
    } catch {
      if (sessionIdRef.current === sid)
        setNotice(
          "No pude recuperar el historial. Vuelve a abrir este hilo para reintentar.",
        );
    } finally {
      if (sessionIdRef.current === sid) setHydrating(false);
    }
  }, []);

  // Al entrar: restaura el hilo previo (localStorage) y carga su historial; si
  // no hay, arranca un hilo nuevo (alta perezosa al primer mensaje).
  useEffect(() => {
    let stored = "";
    try {
      stored = localStorage.getItem(STORAGE_KEY) ?? "";
    } catch {
      /* SSR / privado */
    }
    const sid = stored || makeSessionId();
    sessionIdRef.current = sid;
    try {
      localStorage.setItem(STORAGE_KEY, sid);
    } catch {
      /* noop */
    }
    void loadSessions();
    if (stored) {
      void loadHistory(stored);
    } else {
      setHydrating(false);
      setHistoryReady(true);
    }
  }, [loadSessions, loadHistory]);

  function switchSession(sid: string) {
    if (loading) return;
    setNotice("");
    if (sid === sessionIdRef.current) {
      setDrawerOpen(false);
      void loadHistory(sid);
      return;
    }
    sessionIdRef.current = sid;
    setInput("");
    pendingRef.current = null;
    try {
      localStorage.setItem(STORAGE_KEY, sid);
    } catch {
      /* noop */
    }
    setDrawerOpen(false);
    void loadHistory(sid);
  }

  function newSession() {
    if (loading) return;
    setNotice("");
    setInput("");
    pendingRef.current = null;
    const sid = makeSessionId();
    sessionIdRef.current = sid;
    try {
      localStorage.setItem(STORAGE_KEY, sid);
    } catch {
      /* noop */
    }
    setMessages([INTRO]);
    setDrawerOpen(false);
    setHydrating(false);
    setHistoryReady(true);
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading || hydrating || !historyReady) return;
    setNotice("");
    const sid = sessionIdRef.current;
    if (
      !pendingRef.current ||
      pendingRef.current.sid !== sid ||
      pendingRef.current.text !== text
    ) {
      pendingRef.current = { sid, text, id: crypto.randomUUID() };
    }

    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: text },
    ];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/v/canonical/chat", {
        signal: AbortSignal.timeout(100000),
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          session_id: sid,
          turn_id: pendingRef.current.id,
          history: newMessages
            .slice(0, -1)
            .filter((m) => m.content !== INTRO.content)
            .map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.persisted || typeof data.reply !== "string") {
        setMessages(messages);
        setInput(text);
        setNotice(
          data.error || "No pude confirmar el guardado. Reintenta el envío.",
        );
        return;
      }
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: data.reply,
          id: data.assistant_id,
          artifacts: data.artifacts,
          model: typeof data.model === "string" ? data.model : null,
        },
      ]);
      pendingRef.current = null;
      setNotice(
        data.memory?.status === "partial" ||
          data.memory?.status === "unavailable"
          ? "Conversación guardada. Parte de la memoria histórica no estuvo disponible."
          : `Conversación guardada${data.memory?.sources?.length ? ` · ${data.memory.sources.length} recuerdos consultados` : ""}.`,
      );
      void loadSessions();
    } catch {
      setMessages(messages);
      setInput(text);
      setNotice(
        "Se interrumpió la conexión. Tu mensaje sigue aquí; puedes volver a enviarlo.",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="relative mx-auto flex h-full min-h-0 w-full max-w-3xl flex-col px-4 py-4">
      <div className="mb-3 flex shrink-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold">Conversación</h2>
          <p className="text-sm text-muted-foreground">
            Habla con V, consulta su memoria y usa sus conexiones.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {/* Hilos: abre el panel de conversaciones guardadas */}
          <button
            onClick={() => {
              void loadSessions();
              setDrawerOpen(true);
            }}
            aria-label="Conversaciones guardadas"
            className="flex min-h-11 items-center gap-1.5 rounded-full border border-[var(--border-1)] bg-white px-3 py-2 text-xs font-medium text-[var(--fg-secondary)] transition hover:text-black active:scale-95"
          >
            <IconHistory size={14} />{" "}
            <span className="hidden sm:inline">Hilos</span>
          </button>
        </div>
      </div>

      {mode === "voice" ? (
        <p className="text-sm">
          La voz sigue disponible en el chat de V original. Esta casa usa
          conversación escrita y conexiones.
        </p>
      ) : (
        <>
          {/* Messages */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain space-y-4 pr-1">
            {hydrating ? (
              <div className="flex justify-start">
                <div className="border border-[var(--border-1)] bg-white rounded-2xl px-4 py-3 text-sm text-black animate-pulse">
                  Cargando conversación…
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-black text-white"
                        : "border border-[var(--border-1)] bg-white text-black"
                    }`}
                  >
                    {msg.content}
                    {msg.artifacts?.map((a, j) => (
                      <ChartResult key={j} value={a} />
                    ))}
                    {msg.role === "assistant" && msg.model && (
                      <p className="mt-2 border-t border-[var(--border-1)] pt-2 text-xs text-black/65">
                        {msg.model === "v-plugin"
                          ? "Respuesta de herramienta"
                          : msg.model === "v-capability-boundary"
                            ? "Aviso de capacidades"
                            : `Motor reportado: ${msg.model.replace(":", " · ")}`}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div className="flex justify-start">
                <div className="border border-[var(--border-1)] bg-white rounded-2xl px-4 py-3 text-sm text-black animate-pulse">
                  V está pensando…
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {notice && (
            <p
              role="status"
              aria-live="polite"
              className="mt-3 text-sm text-[var(--fg-secondary)]"
            >
              {notice}
            </p>
          )}
          {/* Input */}
          <div className="mt-4 flex shrink-0 gap-2">
            <textarea
              className="flex-1 resize-none rounded-xl border bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              rows={2}
              placeholder="Escribe un mensaje… (Enter para enviar)"
              aria-label="Mensaje para V"
              maxLength={16000}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              disabled={loading || hydrating || !historyReady}
            />
            <button
              onClick={sendMessage}
              disabled={loading || hydrating || !historyReady || !input.trim()}
              className="self-end rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)] disabled:opacity-50"
            >
              Enviar
            </button>
          </div>
        </>
      )}

      {/* ── Panel de hilos (mobile-first): sheet deslizable desde la izquierda ── */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            className="fixed inset-0 z-[90] flex"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <button
              aria-label="Cerrar"
              onClick={() => setDrawerOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.aside
              role="dialog"
              aria-modal="true"
              initial={{ x: -360 }}
              animate={{ x: 0 }}
              exit={{ x: -360 }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="glass relative z-10 flex h-full w-[86%] max-w-[340px] flex-col border-r border-[var(--border-1)] bg-white pb-[max(env(safe-area-inset-bottom),1rem)]"
            >
              <div className="flex items-center justify-between px-4 pb-3 pt-5">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-black">
                  <IconHistory size={16} className="text-black" />{" "}
                  Conversaciones
                </h2>
                <button
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Cerrar"
                  className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--border-1)] text-[var(--fg-secondary)] transition hover:text-black active:scale-95"
                >
                  <IconX size={15} />
                </button>
              </div>

              <div className="px-4 pb-3">
                <button
                  onClick={newSession}
                  disabled={loading}
                  className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[var(--border-1)] bg-white px-3 py-2.5 text-sm font-medium text-black transition hover:border-black active:scale-[0.98]"
                >
                  <IconPlus size={15} /> Nueva conversación
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-2 pb-4">
                {sessions.length === 0 ? (
                  <p className="px-3 py-6 text-center text-[12px] text-[var(--fg-muted)]">
                    Aún no hay conversaciones guardadas. Escríbele a V y este
                    hilo aparecerá aquí.
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {sessions.map((s) => {
                      const active = s.id === sessionIdRef.current;
                      return (
                        <li key={s.id}>
                          <button
                            onClick={() => switchSession(s.id)}
                            disabled={loading}
                            className={`w-full rounded-xl border px-3 py-2.5 text-left transition active:scale-[0.99] ${
                              active
                                ? "border-black bg-white"
                                : "border-transparent hover:border-[var(--border-1)] hover:bg-[var(--surface-1)]"
                            }`}
                          >
                            <p className="truncate text-[13px] font-medium text-[var(--fg-primary)]">
                              {s.titulo}
                            </p>
                            <p className="mt-0.5 flex items-center gap-2 text-[11px] text-[var(--fg-tertiary)]">
                              <span>{whenLabel(s.last_at)}</span>
                              <span className="text-[var(--fg-muted)]">·</span>
                              <span>
                                {s.count}{" "}
                                {s.count === 1 ? "mensaje" : "mensajes"}
                              </span>
                            </p>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
