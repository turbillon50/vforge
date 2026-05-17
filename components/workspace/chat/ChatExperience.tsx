"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUp,
  Activity,
  CheckCircle2,
  CircleDot,
  Cpu,
  GitBranch,
  Globe2,
  Layers,
  Paperclip,
  Sparkles,
  Wand2,
  ShieldCheck,
  Square,
} from "lucide-react";
import { useT } from "@/i18n/AppProviders";

type Action = { label: string; status: "done" | "running" | "queued" };
type Msg = {
  id: string;
  role: "user" | "b";
  text: string;
  actions?: Action[];
};

const SCOPE = "general";

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

export function ChatExperience() {
  const t = useT();
  const intro: Msg = { id: "intro", role: "b", text: t.chat.intro };
  const [messages, setMessages] = useState<Msg[]>([intro]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [isHydrating, setIsHydrating] = useState(true);
  const sessionIdRef = useRef<string>("");
  const abortRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<Msg[]>(messages);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Reset intro when locale changes (only if no real history yet)
  useEffect(() => {
    setMessages((prev) =>
      prev.length === 1 && prev[0].id === "intro"
        ? [{ id: "intro", role: "b", text: t.chat.intro }]
        : prev,
    );
  }, [t.chat.intro]);

  useEffect(() => {
    scrollerRef.current?.scrollTo({
      top: scrollerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  // Mount: resolve canonical sessionId + rehydrate full history from V's
  // server-side memory (conversations table). This is the fix that
  // makes V stop "starting from zero" every time the UI mounts —
  // her memory was always there, the UI just used to forget how to
  // show it.
  useEffect(() => {
    const ctrl = new AbortController();
    async function init() {
      let sid = "";
      try {
        const res = await fetch(`/api/forge/active-session?scope=${SCOPE}`, {
          cache: "no-store",
          signal: ctrl.signal,
        });
        if (res.ok) {
          const data = (await res.json()) as { sessionId?: string };
          if (data?.sessionId) sid = data.sessionId;
        }
      } catch {
        // server unreachable
      }
      if (!sid) {
        sid = `s_${SCOPE}_${Date.now().toString(36)}`;
      }
      sessionIdRef.current = sid;

      try {
        const res = await fetch(
          `/api/forge/conversations?sessionId=${encodeURIComponent(sid)}&limit=100`,
          { cache: "no-store", signal: ctrl.signal },
        );
        if (res.ok) {
          const data = (await res.json()) as { turns: HistoryTurn[] };
          const hydrated: Msg[] = (data.turns ?? [])
            .filter((tn) => tn.role === "user" || tn.role === "assistant")
            .map((tn) => ({
              id: tn.id,
              role: tn.role === "assistant" ? "b" : "user",
              text: tn.content,
            }));
          if (hydrated.length > 0) {
            setMessages(hydrated);
          }
        }
      } catch {
        // ignore — keep intro
      } finally {
        setIsHydrating(false);
      }
    }
    void init();
    return () => {
      ctrl.abort();
      abortRef.current?.abort();
    };
  }, []);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || pending) return;

      const userMsg: Msg = {
        id: `u_${Date.now()}`,
        role: "user",
        text: trimmed,
      };
      const aId = `b_${Date.now()}`;
      const aMsg: Msg = { id: aId, role: "b", text: "" };
      setMessages((m) => [...m, userMsg, aMsg]);
      setInput("");
      setPending(true);

      const history = messagesRef.current
        .filter((m) => m.id !== "intro" && m.id !== aId)
        .map((m) => ({
          role: m.role === "b" ? ("assistant" as const) : ("user" as const),
          content: m.text,
        }));
      history.push({ role: "user", content: trimmed });

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
                ? { ...m, text: `⚠ Error (${res.status}): ${err.slice(0, 200)}` }
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
                    m.id === aId ? { ...m, text: m.text + evt.value } : m,
                  ),
                );
              } else if (evt.type === "error") {
                setMessages((p) =>
                  p.map((m) =>
                    m.id === aId
                      ? { ...m, text: m.text + `\n\n⚠ ${evt.message}` }
                      : m,
                  ),
                );
              }
            } catch {
              // skip malformed
            }
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        const msg = err instanceof Error ? err.message : String(err);
        setMessages((p) =>
          p.map((m) =>
            m.id === aId ? { ...m, text: `⚠ Error de red: ${msg}` } : m,
          ),
        );
      } finally {
        setPending(false);
      }
    },
    [pending],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setPending(false);
  }, []);

  const quickPrompts = t.chat.quick_prompts.map((label, i) => ({
    icon: [Sparkles, Wand2, ShieldCheck, Globe2][i],
    label,
  }));

  return (
    <div className="grid min-h-[calc(100dvh-49px)] grid-cols-1 lg:h-[calc(100dvh-49px)] lg:grid-cols-[1fr_320px]">
      <div className="flex min-w-0 flex-col">
        <div ref={scrollerRef} className="flex-1 overflow-y-auto px-4 py-8 md:px-10">
          <div className="mx-auto max-w-3xl">
            <div className="mb-8 flex items-center gap-3">
              <div className="relative h-9 w-9 rounded-full bg-violet-500/10 ring-1 ring-violet-500/30">
                <div className="absolute inset-0 animate-pulse-soft rounded-full bg-violet-500/20" />
                <div className="absolute inset-2 rounded-full bg-gradient-to-br from-violet-400 to-cyan-400" />
              </div>
              <div>
                <p className="font-display text-lg font-semibold tracking-tight">{t.common.label_b}</p>
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
                  {t.chat.operator_label}
                </p>
              </div>
            </div>

            {isHydrating && (
              <div className="mb-6 text-center">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
                  Cargando memoria de V…
                </span>
              </div>
            )}

            <div className="space-y-5">
              <AnimatePresence initial={false}>
                {messages.map((m) => (
                  <MessageBubble key={m.id} msg={m} />
                ))}
              </AnimatePresence>
              {pending && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2 text-sm text-on-surface-variant"
                >
                  <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-cyber-cyan" />
                  <span>{t.chat.thinking}</span>
                </motion.div>
              )}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 border-t border-app bg-void/90 px-3 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+88px)] backdrop-blur-xl sm:px-4 sm:pt-4 md:px-10 md:pb-4">
          <div className="mx-auto max-w-3xl">
            <div className="mb-3 flex flex-wrap gap-2">
              {quickPrompts.map((q) => (
                <button
                  key={q.label}
                  onClick={() => send(q.label)}
                  className="group inline-flex items-center gap-2 rounded-full border border-app bg-tint-1 px-3 py-1.5 text-[12px] text-on-surface-variant transition hover:border-violet-500/30 hover:bg-violet-500/[0.05] hover:text-violet-300"
                >
                  {q.icon && <q.icon size={12} />}
                  {q.label}
                </button>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="glass relative overflow-hidden rounded-2xl"
            >
              <div className="pointer-events-none absolute inset-0 -z-10 opacity-50 [background:radial-gradient(120%_60%_at_50%_0%,rgba(139,92,246,0.18),transparent_70%)]" />
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                rows={3}
                placeholder={t.chat.placeholder}
                className="w-full resize-none bg-transparent px-4 py-3 text-[16px] text-on-surface placeholder:text-muted focus:outline-none"
                style={{ touchAction: "manipulation" }}
                autoComplete="off"
                autoCorrect="on"
                autoCapitalize="sentences"
                spellCheck
                enterKeyHint="send"
                inputMode="text"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
              />
              <div className="flex items-center justify-between border-t border-app px-3 py-2">
                <div className="flex items-center gap-1 text-on-surface-variant">
                  <button type="button" className="rounded-md p-2 hover:bg-tint-2">
                    <Paperclip size={14} />
                  </button>
                  <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
                    {t.chat.shift_enter_hint}
                  </span>
                </div>
                {pending ? (
                  <button
                    type="button"
                    onClick={stop}
                    className="btn-ghost !px-4 !py-2"
                    aria-label="Detener"
                  >
                    <Square size={13} /> Detener
                  </button>
                ) : (
                  <button type="submit" className="btn-primary !px-4 !py-2">
                    {t.chat.send} <ArrowUp size={13} />
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>

      <aside className="hidden border-l border-app bg-ink lg:block">
        <OpsPanel />
      </aside>
    </div>
  );
}

function MessageBubble({ msg }: { msg: Msg }) {
  const isB = msg.role === "b";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`max-w-[88%] ${isB ? "mr-auto" : "ml-auto"}`}
    >
      {isB && (
        <p className="mb-1 ml-1 font-mono text-[10px] uppercase tracking-[0.2em] text-violet-300">V</p>
      )}
      <div
        className={`rounded-2xl border px-4 py-3 text-[14.5px] leading-relaxed whitespace-pre-wrap break-words ${
          isB
            ? "border-violet-500/20 bg-violet-500/[0.06] text-on-surface"
            : "border-app-strong bg-tint-1 text-on-surface-variant"
        }`}
      >
        <p>{msg.text}</p>
        {msg.actions && (
          <ul className="mt-3 space-y-2 rounded-lg border border-app-strong bg-tint-2 p-3 text-[13px]">
            {msg.actions.map((a) => (
              <li key={a.label} className="flex items-center gap-2 text-on-surface">
                {a.status === "done" ? (
                  <CheckCircle2 size={14} className="text-success-emerald" />
                ) : a.status === "running" ? (
                  <CircleDot size={14} className="animate-pulse text-cyber-cyan" />
                ) : (
                  <CircleDot size={14} className="text-muted" />
                )}
                <span className={a.status === "queued" ? "text-on-surface-variant" : ""}>{a.label}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </motion.div>
  );
}

function OpsPanel() {
  const t = useT();
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-app px-5 py-4">
        <p className="label-caps text-muted">{t.chat.ops.title}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 p-5">
        {[
          { k: t.chat.ops.build, v: "42s", c: "text-cyber-cyan", icon: Activity },
          { k: t.chat.ops.errors, v: "0", c: "text-success-emerald", icon: ShieldCheck },
          { k: t.chat.ops.deploys, v: "2/2", c: "text-on-surface", icon: GitBranch },
          { k: t.chat.ops.modules, v: "6", c: "text-violet-300", icon: Layers },
        ].map((m) => (
          <div key={m.k} className="rounded-lg border border-app bg-tint-1 p-3">
            <m.icon size={14} className={`${m.c} opacity-80`} />
            <p className="label-caps mt-2 text-muted">{m.k}</p>
            <p className={`font-display text-lg font-semibold ${m.c}`}>{m.v}</p>
          </div>
        ))}
      </div>

      <div className="border-t border-app px-5 py-4">
        <p className="label-caps mb-3 text-muted">{t.chat.ops.recent}</p>
        <ul className="space-y-3 text-sm">
          {[
            { icon: GitBranch, label: t.chat.ops.events[0], time: "2m", c: "text-violet-300" },
            { icon: Cpu, label: t.chat.ops.events[1], time: "9m", c: "text-cyber-cyan" },
            { icon: Globe2, label: t.chat.ops.events[2], time: "23m", c: "text-success-emerald" },
            { icon: Activity, label: t.chat.ops.events[3], time: "1h", c: "text-on-surface" },
          ].map((e) => (
            <li key={e.label} className="flex items-start gap-2">
              <e.icon size={13} className={`mt-0.5 ${e.c}`} />
              <div className="flex-1">
                <p className="text-on-surface">{e.label}</p>
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted">{e.time}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-auto border-t border-app p-5">
        <div className="rounded-lg border border-cyan-400/20 bg-cyan-400/[0.04] p-4">
          <p className="label-caps mb-1 text-cyber-cyan">{t.chat.ops.suggest_label}</p>
          <p className="text-[13px] leading-relaxed text-on-surface">{t.chat.ops.suggest_body}</p>
          <div className="mt-3 flex gap-2">
            <button className="btn-primary !px-3 !py-1.5 text-[10px]">{t.common.cta_approve}</button>
            <button className="btn-ghost !px-3 !py-1.5 text-[10px]">{t.common.cta_later}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
