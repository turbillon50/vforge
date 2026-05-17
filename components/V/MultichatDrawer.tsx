"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Database, Github, Cpu } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  sender: "sister" | "user";
  text: string;
  timestamp: string;
}

interface MultichatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

// Singleton AudioContext, lazily created on first user gesture.
// Creating one per keystroke (the previous behaviour) caused visible
// input lag on mobile because AudioContext init is heavy and iOS
// aggressively suspends contexts. We only "pop" on send now.
let sharedAudioCtx: AudioContext | null = null;
const playPop = () => {
  if (typeof window === "undefined") return;
  try {
    if (!sharedAudioCtx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      sharedAudioCtx = new AC();
    }
    const ctx = sharedAudioCtx;
    if (ctx.state === "suspended") void ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.04);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.04);
    osc.start();
    osc.stop(ctx.currentTime + 0.04);
  } catch {
    // Audio unavailable; silently degrade.
  }
};

const SESSION_KEY = "v_drawer_session_id";
function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return `vdrawer_${Date.now()}`;
  let id = window.localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = `vdrawer_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    try {
      window.localStorage.setItem(SESSION_KEY, id);
    } catch {
      // private mode / quota — fall back to in-memory.
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

export function MultichatDrawer({ isOpen, onClose }: MultichatDrawerProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "sister",
      text: "Hola Luis. Estoy contigo — ¿qué construimos?",
      timestamp: "Ahora",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sessionIdRef = useRef<string>(`vdrawer_${Date.now()}`);
  const abortRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<Message[]>(messages);

  useEffect(() => {
    sessionIdRef.current = getOrCreateSessionId();
    const ctrl = abortRef;
    return () => {
      ctrl.current?.abort();
    };
  }, []);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping]);

  const handleSend = useCallback(async () => {
    const text = inputValue.trim();
    if (!text || isTyping) return;
    playPop();

    const userMsg: Message = {
      id: `u_${Date.now()}`,
      sender: "user",
      text,
      timestamp: "Ahora",
    };
    const assistantId = `s_${Date.now()}`;
    const assistantMsg: Message = {
      id: assistantId,
      sender: "sister",
      text: "",
      timestamp: "Ahora",
    };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInputValue("");
    setIsTyping(true);

    const history = messagesRef.current
      .filter((m) => m.id !== "welcome")
      .map((m) => ({
        role: m.sender === "sister" ? ("assistant" as const) : ("user" as const),
        content: m.text,
      }));
    history.push({ role: "user", content: text });

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/forge/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history,
          sessionId: sessionIdRef.current,
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const err = await res.text().catch(() => "");
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, text: `⚠ Error (${res.status}): ${err.slice(0, 200)}` }
              : m,
          ),
        );
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let firstTextChunk = true;

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
              if (firstTextChunk) {
                setIsTyping(false);
                firstTextChunk = false;
              }
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, text: m.text + evt.value } : m,
                ),
              );
            } else if (evt.type === "error") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, text: m.text + `\n\n⚠ ${evt.message}` }
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
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, text: `⚠ Error de red: ${msg}` } : m,
        ),
      );
    } finally {
      setIsTyping(false);
    }
  }, [inputValue, isTyping]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 260 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full md:w-[450px] bg-neutral-950/95 backdrop-blur-3xl border-l border-white/10 shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
              <div className="flex items-center gap-3">
                <div className="relative w-11 h-11 rounded-full flex items-center justify-center border border-vf-green/30 bg-black">
                  <div className="absolute inset-0 rounded-full bg-vf-green/10 blur-[8px] animate-pulse" />
                  <span className="w-1.5 h-6 bg-vf-green rounded-full animate-bounce mx-[1px]" style={{ animationDelay: "0.1s" }} />
                  <span className="w-1.5 h-8 bg-vf-green rounded-full animate-bounce mx-[1px]" style={{ animationDelay: "0.3s" }} />
                  <span className="w-1.5 h-5 bg-vf-green rounded-full animate-bounce mx-[1px]" style={{ animationDelay: "0.5s" }} />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-white tracking-wide">Hermana V</h2>
                    <span className="w-2 h-2 rounded-full bg-vf-green animate-pulse" />
                  </div>
                  <p className="text-[10px] uppercase font-bold text-white/30 tracking-widest">ASISTENTE NEURAL CENTRAL</p>
                </div>
              </div>

              <button
                onClick={onClose}
                aria-label="Cerrar"
                className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white/60 hover:text-white transition-all active:scale-95"
                style={{ touchAction: "manipulation" }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex flex-col max-w-[85%] rounded-2xl p-4 shadow-lg text-sm border",
                    msg.sender === "sister"
                      ? "bg-white/[0.02] border-white/5 text-white/90 mr-auto rounded-tl-sm"
                      : "bg-vf-green text-black border-vf-green/20 ml-auto rounded-tr-sm font-medium"
                  )}
                >
                  <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                  <span className={cn(
                    "text-[8px] mt-2 block",
                    msg.sender === "sister" ? "text-white/30" : "text-black/50"
                  )}>
                    {msg.timestamp}
                  </span>
                </div>
              ))}

              {isTyping && (
                <div className="bg-white/[0.02] border-white/5 text-white/90 mr-auto rounded-2xl rounded-tl-sm p-4 max-w-[85%] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-vf-green animate-bounce" style={{ animationDelay: "0.1s" }} />
                  <span className="w-2 h-2 rounded-full bg-vf-green animate-bounce" style={{ animationDelay: "0.3s" }} />
                  <span className="w-2 h-2 rounded-full bg-vf-green animate-bounce" style={{ animationDelay: "0.5s" }} />
                </div>
              )}

              <div ref={scrollRef} />
            </div>

            {/* Micro-System status display */}
            <div className="px-6 py-2 bg-white/[0.01] border-y border-white/5 flex justify-around text-[10px] text-white/40 font-mono">
              <div className="flex items-center gap-1">
                <Cpu className="w-3 h-3 text-vf-green" />
                <span>CPU: OK</span>
              </div>
              <div className="flex items-center gap-1">
                <Database className="w-3 h-3 text-blue-400" />
                <span>DB: 100%</span>
              </div>
              <div className="flex items-center gap-1">
                <Github className="w-3 h-3 text-purple-400" />
                <span>GIT: CONNECTED</span>
              </div>
            </div>

            {/* Input Form — mobile-tuned */}
            <div className="p-6 border-t border-white/5 bg-neutral-950 flex items-center gap-3">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void handleSend();
                  }
                }}
                placeholder="Escribe un mensaje a tu hermana V..."
                autoComplete="off"
                autoCorrect="on"
                autoCapitalize="sentences"
                spellCheck
                enterKeyHint="send"
                inputMode="text"
                disabled={isTyping}
                className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-base text-white placeholder-white/20 focus:outline-none focus:border-vf-green transition-colors disabled:opacity-60"
                style={{ touchAction: "manipulation", fontSize: 16 }}
              />
              <button
                onClick={() => void handleSend()}
                disabled={!inputValue.trim() || isTyping}
                aria-label="Enviar"
                className="p-3.5 rounded-2xl bg-vf-green hover:bg-vf-green-quiet text-black transition-colors active:scale-95 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ touchAction: "manipulation" }}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
