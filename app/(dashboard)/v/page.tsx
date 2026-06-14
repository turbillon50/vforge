"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { VoiceConversation } from "@/components/v/VoiceConversation";
import {
  IconMic,
  IconChat,
  IconHistory,
  IconPlus,
  IconX,
} from "@/components/brand/VFIcons";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface SessionRow {
  id: string;
  titulo: string;
  created_at: string;
  last_at: string;
  count: number;
}

type Mode = "text" | "voice";

const INTRO: Message = { role: "assistant", content: "Hola, soy V. ¿En qué te ayudo hoy?" };
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
  return new Date(t).toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

export default function VChatPage() {
  const [mode, setMode] = useState<Mode>("text");
  const [messages, setMessages] = useState<Message[]>([INTRO]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hydrating, setHydrating] = useState(true);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const sessionIdRef = useRef<string>("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/v/sessions?limit=40", { cache: "no-store" });
      const data = await res.json();
      if (Array.isArray(data?.sessions)) setSessions(data.sessions);
    } catch {
      /* lista best-effort */
    }
  }, []);

  const loadHistory = useCallback(async (sid: string) => {
    setHydrating(true);
    try {
      const res = await fetch(
        `/api/v/messages?sessionId=${encodeURIComponent(sid)}&limit=200`,
        { cache: "no-store" },
      );
      const data = await res.json();
      const hist: Message[] = Array.isArray(data?.messages)
        ? data.messages
            .filter((m: Message) => m && (m.role === "user" || m.role === "assistant"))
            .map((m: Message) => ({ role: m.role, content: m.content }))
        : [];
      // Sólo mostramos this session's turns; si está vacío, el saludo de V.
      setMessages(hist.length ? hist : [INTRO]);
    } catch {
      setMessages([INTRO]);
    } finally {
      setHydrating(false);
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
    }
  }, [loadSessions, loadHistory]);

  function switchSession(sid: string) {
    if (sid === sessionIdRef.current) {
      setDrawerOpen(false);
      return;
    }
    sessionIdRef.current = sid;
    try {
      localStorage.setItem(STORAGE_KEY, sid);
    } catch {
      /* noop */
    }
    setDrawerOpen(false);
    void loadHistory(sid);
  }

  function newSession() {
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
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    const newMessages: Message[] = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/v/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          session_id: sessionIdRef.current,
          history: newMessages
            .slice(0, -1)
            .filter((m) => m.content !== INTRO.content)
            .map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();
      const reply = data.reply || data.error || "Sin respuesta";
      setMessages([...newMessages, { role: "assistant", content: reply }]);
      // El turno ya quedó persistido server-side; refrescamos la lista de hilos
      // para que el nuevo aparezca / suba con su título.
      void loadSessions();
    } catch {
      setMessages([
        ...newMessages,
        { role: "assistant", content: "Error conectando con V. Intenta de nuevo." },
      ]);
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
    <div className="relative flex flex-col flex-1 min-h-0 max-w-3xl mx-auto w-full px-4 py-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">V — Agente Central</h1>
          <p className="text-sm text-muted-foreground">
            Pídele tareas, consulta proyectos, o platica con ella por voz.
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
            className="flex items-center gap-1.5 rounded-full border border-[var(--border-1)] bg-[var(--surface-1)] px-3 py-2 text-xs font-medium text-[var(--fg-secondary)] transition hover:text-white active:scale-95"
          >
            <IconHistory size={14} /> <span className="hidden sm:inline">Hilos</span>
          </button>
          {/* Toggle Texto | Voz */}
          <div className="flex rounded-full border border-[var(--border-1)] bg-[var(--surface-1)] p-1 text-xs">
            <button
              onClick={() => setMode("text")}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium transition ${
                mode === "text" ? "bg-violet-600/40 text-white" : "text-[var(--fg-tertiary)] hover:text-[var(--fg-primary)]"
              }`}
            >
              <IconChat size={14} /> Texto
            </button>
            <button
              onClick={() => setMode("voice")}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium transition ${
                mode === "voice" ? "bg-violet-600/40 text-white" : "text-[var(--fg-tertiary)] hover:text-[var(--fg-primary)]"
              }`}
            >
              <IconMic size={14} /> Voz
            </button>
          </div>
        </div>
      </div>

      {mode === "voice" ? (
        <VoiceConversation />
      ) : (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {hydrating ? (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl px-4 py-3 text-sm text-muted-foreground animate-pulse">
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
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl px-4 py-3 text-sm text-muted-foreground animate-pulse">
                  V está pensando…
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="mt-4 flex gap-2">
            <textarea
              className="flex-1 resize-none rounded-xl border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              rows={2}
              placeholder="Escribe un mensaje… (Enter para enviar)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              disabled={loading}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="self-end rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground disabled:opacity-50 hover:bg-primary/90 transition"
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
              className="glass relative z-10 flex h-full w-[86%] max-w-[340px] flex-col border-r border-[var(--border-1)] bg-[#0a0a0f]/95 pb-[max(env(safe-area-inset-bottom),1rem)]"
            >
              <div className="flex items-center justify-between px-4 pb-3 pt-5">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
                  <IconHistory size={16} className="text-violet-300" /> Conversaciones
                </h2>
                <button
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Cerrar"
                  className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--border-1)] text-[var(--fg-secondary)] transition hover:text-white active:scale-95"
                >
                  <IconX size={15} />
                </button>
              </div>

              <div className="px-4 pb-3">
                <button
                  onClick={newSession}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-violet-500/40 bg-violet-600/20 px-3 py-2.5 text-sm font-medium text-violet-100 transition hover:bg-violet-600/30 active:scale-[0.98]"
                >
                  <IconPlus size={15} /> Nueva conversación
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-2 pb-4">
                {sessions.length === 0 ? (
                  <p className="px-3 py-6 text-center text-[12px] text-[var(--fg-muted)]">
                    Aún no hay conversaciones guardadas. Escríbele a V y este hilo
                    aparecerá aquí.
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {sessions.map((s) => {
                      const active = s.id === sessionIdRef.current;
                      return (
                        <li key={s.id}>
                          <button
                            onClick={() => switchSession(s.id)}
                            className={`w-full rounded-xl border px-3 py-2.5 text-left transition active:scale-[0.99] ${
                              active
                                ? "border-violet-500/50 bg-violet-600/15"
                                : "border-transparent hover:border-[var(--border-1)] hover:bg-[var(--surface-1)]"
                            }`}
                          >
                            <p className="truncate text-[13px] font-medium text-[var(--fg-primary)]">
                              {s.titulo}
                            </p>
                            <p className="mt-0.5 flex items-center gap-2 text-[11px] text-[var(--fg-tertiary)]">
                              <span>{whenLabel(s.last_at)}</span>
                              <span className="text-[var(--fg-muted)]">·</span>
                              <span>{s.count} {s.count === 1 ? "mensaje" : "mensajes"}</span>
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
