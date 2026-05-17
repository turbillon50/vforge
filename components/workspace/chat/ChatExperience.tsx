"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUp,
  CheckCircle2,
  CircleDot,
  Paperclip,
  Sparkles,
  Wand2,
  ShieldCheck,
  Globe2,
  Square,
  ChevronDown,
  Plus,
  GitBranch,
  MessageSquare,
} from "lucide-react";
import { useT } from "@/i18n/AppProviders";

type Action = { label: string; status: "done" | "running" | "queued" };
type Msg = {
  id: string;
  role: "user" | "b";
  text: string;
  actions?: Action[];
};

const SCOPE_KEY = "vforge_chat_scope";

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

interface Project {
  id: string;
  name: string;
  category: string;
  github_repo: string | null;
}

interface ScopeOption {
  id: string;
  label: string;
  repo?: string;
}

export function ChatExperience() {
  const t = useT();
  const intro: Msg = { id: "intro", role: "b", text: t.chat.intro };
  const [messages, setMessages] = useState<Msg[]>([intro]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [isHydrating, setIsHydrating] = useState(true);
  const [scope, setScope] = useState<string>("general");
  const [projects, setProjects] = useState<Project[]>([]);
  const [scopeMenuOpen, setScopeMenuOpen] = useState(false);
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

  // Autoscroll
  useEffect(() => {
    scrollerRef.current?.scrollTo({
      top: scrollerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  // Load projects + initial scope
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(SCOPE_KEY) ?? "general";
    setScope(saved);
    fetch("/api/projects", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { projects: [] }))
      .then((d: { projects: Project[] }) => setProjects(d.projects ?? []))
      .catch(() => undefined);
  }, []);

  // Resolve session + rehydrate whenever scope changes
  useEffect(() => {
    if (!scope) return;
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(SCOPE_KEY, scope);
      } catch {
        // ignore
      }
    }

    const ctrl = new AbortController();
    setIsHydrating(true);

    async function init(s: string) {
      let sid = "";
      try {
        const res = await fetch(
          `/api/forge/active-session?scope=${encodeURIComponent(s)}`,
          { cache: "no-store", signal: ctrl.signal },
        );
        if (res.ok) {
          const data = (await res.json()) as { sessionId?: string };
          if (data?.sessionId) sid = data.sessionId;
        }
      } catch {
        // ignore
      }
      if (!sid) {
        sid = `s_${s}_${Date.now().toString(36)}`;
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
          } else {
            setMessages([{ id: "intro", role: "b", text: t.chat.intro }]);
          }
        }
      } catch {
        // keep current
      } finally {
        setIsHydrating(false);
      }
    }
    void init(scope);
    return () => {
      ctrl.abort();
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || pending) return;

      const userMsg: Msg = { id: `u_${Date.now()}`, role: "user", text: trimmed };
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
            projectId: scope === "general" ? null : scope,
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
              // skip
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
    [pending, scope],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setPending(false);
  }, []);

  // Start fresh chat for current scope
  const newChat = useCallback(async () => {
    if (pending) return;
    try {
      const res = await fetch("/api/forge/active-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope }),
      });
      if (res.ok) {
        const data = (await res.json()) as { sessionId?: string };
        if (data?.sessionId) {
          sessionIdRef.current = data.sessionId;
          setMessages([{ id: "intro", role: "b", text: t.chat.intro }]);
        }
      }
    } catch {
      // ignore
    }
  }, [pending, scope, t.chat.intro]);

  const scopeOptions: ScopeOption[] = [
    { id: "general", label: "General" },
    ...projects.map((p) => ({ id: p.id, label: p.name, repo: p.github_repo ?? undefined })),
  ];
  const currentScope = scopeOptions.find((o) => o.id === scope) ?? scopeOptions[0];

  const quickPrompts = t.chat.quick_prompts.map((label, i) => ({
    icon: [Sparkles, Wand2, ShieldCheck, Globe2][i],
    label,
  }));

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Chat scope bar — sticky top, no scroll mueve esto */}
      <div className="flex-shrink-0 border-b border-app bg-void/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-2.5 md:px-10">
          {/* Scope selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setScopeMenuOpen((v) => !v)}
              className="flex items-center gap-2 rounded-md border border-app bg-tint-1 px-3 py-1.5 text-sm text-on-surface hover:border-app-strong"
              style={{ touchAction: "manipulation" }}
            >
              {scope === "general" ? (
                <MessageSquare size={13} className="text-violet-300" />
              ) : (
                <GitBranch size={13} className="text-cyber-cyan" />
              )}
              <span className="font-medium">{currentScope.label}</span>
              <ChevronDown size={12} className="text-muted" />
            </button>
            {scopeMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setScopeMenuOpen(false)}
                />
                <div className="absolute left-0 top-full z-40 mt-1 max-h-[60vh] w-[260px] overflow-y-auto rounded-md border border-app bg-ink shadow-elev">
                  {scopeOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setScope(opt.id);
                        setScopeMenuOpen(false);
                      }}
                      className={`flex w-full items-start gap-2 border-b border-app/40 px-3 py-2.5 text-left text-sm last:border-0 hover:bg-tint-1 ${
                        opt.id === scope ? "bg-tint-1 text-violet-300" : "text-on-surface"
                      }`}
                    >
                      {opt.id === "general" ? (
                        <MessageSquare size={13} className="mt-0.5 shrink-0 text-violet-300" />
                      ) : (
                        <GitBranch size={13} className="mt-0.5 shrink-0 text-cyber-cyan" />
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-medium">{opt.label}</p>
                        {opt.repo && (
                          <p className="truncate font-mono text-[10px] uppercase tracking-widest text-muted">
                            {opt.repo}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* New chat */}
          <button
            type="button"
            onClick={newChat}
            disabled={pending}
            title="Nueva sesión en este scope"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-app bg-tint-1 text-on-surface-variant hover:border-app-strong hover:text-on-surface disabled:opacity-50"
            style={{ touchAction: "manipulation" }}
          >
            <Plus size={14} />
          </button>

          <div className="ml-auto flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
            <span className="hidden sm:inline">V</span>
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success-emerald" />
          </div>
        </div>
      </div>

      {/* Messages scroller — el ÚNICO que scrollea */}
      <div ref={scrollerRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-6 md:px-10">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 flex items-center gap-3">
            <div className="relative h-9 w-9 rounded-full bg-violet-500/10 ring-1 ring-violet-500/30">
              <div className="absolute inset-0 animate-pulse-soft rounded-full bg-violet-500/20" />
              <div className="absolute inset-2 rounded-full bg-gradient-to-br from-violet-400 to-cyan-400" />
            </div>
            <div>
              <p className="font-display text-lg font-semibold tracking-tight">
                {t.common.label_b}
              </p>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
                {t.chat.operator_label} · {currentScope.label}
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

      {/* Composer FIJO — flex-shrink-0 + safe-area + mobile-nav clearance */}
      <div
        className="flex-shrink-0 border-t border-app bg-void/95 backdrop-blur-xl"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 88px)" }}
      >
        <div className="mx-auto max-w-3xl px-3 pt-3 sm:px-4 sm:pt-4 md:px-10 md:pb-2">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {quickPrompts.map((q) => (
              <button
                key={q.label}
                onClick={() => send(q.label)}
                disabled={pending}
                className="group inline-flex items-center gap-1.5 rounded-full border border-app bg-tint-1 px-3 py-1 text-[11px] text-on-surface-variant transition hover:border-violet-500/30 hover:bg-violet-500/[0.05] hover:text-violet-300 disabled:opacity-50"
                style={{ touchAction: "manipulation" }}
              >
                {q.icon && <q.icon size={11} />}
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
              rows={2}
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
