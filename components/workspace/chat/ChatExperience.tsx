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
  Mic,
  Camera,
  X,
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
      <div ref={scrollerRef} className="flex-1 min-h-0 overflow-y-auto px-3 py-3 md:px-10 md:py-5">
        <div className="mx-auto max-w-3xl">
          {/* Operator header — solo visible cuando el chat está vacío (más
              espacio para mensajes cuando ya hay conversación). */}
          {messages.length <= 1 && (
            <div className="mb-4 flex items-center gap-3 md:mb-6">
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
          )}

          {isHydrating && (
            <div className="mb-6 text-center">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
                Cargando memoria de V…
              </span>
            </div>
          )}

          <div className="space-y-3 md:space-y-4">
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
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 76px)" }}
      >
        <div className="mx-auto max-w-3xl px-3 pt-2.5 sm:px-4 sm:pt-4 md:px-10 md:pb-2">
          {/* Quick prompts: scroll horizontal en mobile (1 línea), wrap en desktop */}
          <div className="mb-2 -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 sm:overflow-visible sm:flex-wrap sm:px-0 sm:pb-0 no-scrollbar">
            {quickPrompts.map((q) => (
              <button
                key={q.label}
                onClick={() => send(q.label)}
                disabled={pending}
                className="group inline-flex shrink-0 items-center gap-1.5 rounded-full border border-app bg-tint-1 px-3 py-1 text-[11px] text-on-surface-variant transition hover:border-violet-500/30 hover:bg-violet-500/[0.05] hover:text-violet-300 disabled:opacity-50"
                style={{ touchAction: "manipulation" }}
              >
                {q.icon && <q.icon size={11} />}
                {q.label}
              </button>
            ))}
          </div>

          <Composer
            input={input}
            setInput={setInput}
            pending={pending}
            onSend={() => send(input)}
            onStop={stop}
            placeholder={t.chat.placeholder}
            sendLabel={t.chat.send}
            hint={t.chat.shift_enter_hint}
          />
        </div>
      </div>
    </div>
  );
}

interface ComposerProps {
  input: string;
  setInput: (v: string) => void;
  pending: boolean;
  onSend: () => void;
  onStop: () => void;
  placeholder: string;
  sendLabel: string;
  hint: string;
}

function Composer({
  input,
  setInput,
  pending,
  onSend,
  onStop,
  placeholder,
  sendLabel,
  hint,
}: ComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [recError, setRecError] = useState<string | null>(null);
  const [attachment, setAttachment] = useState<{ name: string; preview: string | null } | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Auto-grow textarea hasta ~50% del viewport
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const scroll = el.scrollHeight;
    const max = typeof window !== "undefined" ? Math.floor(window.innerHeight * 0.4) : 320;
    el.style.height = Math.min(scroll, max) + "px";
  }, [input]);

  async function startRecording() {
    setRecError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setRecError("Tu navegador no soporta grabación de audio");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "";
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        await transcribe(blob);
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setRecording(true);
    } catch (err) {
      setRecError(err instanceof Error ? err.message : "No pude acceder al micrófono");
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  }

  async function transcribe(blob: Blob) {
    setTranscribing(true);
    try {
      const form = new FormData();
      form.append("audio", blob, "voice.webm");
      const res = await fetch("/api/forge/transcribe", { method: "POST", body: form });
      if (!res.ok) {
        const err = await res.text().catch(() => "");
        setRecError(`Transcripción falló (${res.status}): ${err.slice(0, 120)}`);
        return;
      }
      const data = (await res.json()) as { text?: string };
      if (data?.text) {
        setInput(input ? `${input} ${data.text}` : data.text);
        textareaRef.current?.focus();
      }
    } catch (err) {
      setRecError(err instanceof Error ? err.message : "Error al transcribir");
    } finally {
      setTranscribing(false);
    }
  }

  function handleFile(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () =>
        setAttachment({ name: file.name, preview: reader.result as string });
      reader.readAsDataURL(file);
    } else {
      setAttachment({ name: file.name, preview: null });
    }
  }

  function clearAttachment() {
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  }

  return (
    <>
      {(recError || attachment) && (
        <div className="mb-2 space-y-1.5">
          {recError && (
            <div className="rounded-md border border-error-crimson/30 bg-error-crimson/5 px-3 py-2 text-[12px] text-error-crimson">
              ⚠ {recError}
              <button
                onClick={() => setRecError(null)}
                className="float-right text-error-crimson/70 hover:text-error-crimson"
                aria-label="Cerrar error"
              >
                <X size={12} />
              </button>
            </div>
          )}
          {attachment && (
            <div className="flex items-center gap-2 rounded-md border border-app bg-tint-1 px-3 py-2">
              {attachment.preview ? (
                <img
                  src={attachment.preview}
                  alt={attachment.name}
                  className="h-10 w-10 rounded object-cover"
                />
              ) : (
                <Paperclip size={14} className="text-violet-300" />
              )}
              <span className="flex-1 truncate text-[12px] text-on-surface-variant">
                {attachment.name}
              </span>
              <button
                onClick={clearAttachment}
                className="rounded p-1 text-muted hover:bg-tint-2 hover:text-on-surface"
                aria-label="Quitar adjunto"
              >
                <X size={12} />
              </button>
            </div>
          )}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!pending) onSend();
        }}
        className="glass relative overflow-hidden rounded-2xl"
      >
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-50 [background:radial-gradient(120%_60%_at_50%_0%,rgba(139,92,246,0.18),transparent_70%)]" />
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={3}
          placeholder={placeholder}
          className="w-full resize-none bg-transparent px-4 pt-4 pb-2 text-[16px] text-on-surface placeholder:text-muted focus:outline-none"
          style={{
            touchAction: "manipulation",
            minHeight: 120, // chat de primer nivel: composer grande por default
          }}
          autoComplete="off"
          autoCorrect="on"
          autoCapitalize="sentences"
          spellCheck
          enterKeyHint="send"
          inputMode="text"
          disabled={transcribing}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (!pending) onSend();
            }
          }}
        />
        <div className="flex items-center justify-between border-t border-app px-2 py-2">
          <div className="flex items-center gap-0.5 text-on-surface-variant">
            {/* Adjuntar archivo */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf,text/*"
              hidden
              onChange={(e) => handleFile(e.target.files)}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-md p-2 hover:bg-tint-2"
              aria-label="Adjuntar archivo"
              style={{ touchAction: "manipulation" }}
            >
              <Paperclip size={15} />
            </button>

            {/* Cámara — capture environment para abrir cámara directa en mobile */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={(e) => handleFile(e.target.files)}
            />
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="rounded-md p-2 hover:bg-tint-2"
              aria-label="Foto"
              style={{ touchAction: "manipulation" }}
            >
              <Camera size={15} />
            </button>

            {/* Micrófono — graba audio y transcribe via Whisper */}
            <button
              type="button"
              onClick={recording ? stopRecording : startRecording}
              disabled={transcribing}
              className={`rounded-md p-2 transition-colors ${
                recording
                  ? "bg-error-crimson/15 text-error-crimson animate-pulse"
                  : transcribing
                    ? "text-cyber-cyan animate-pulse"
                    : "hover:bg-tint-2"
              }`}
              aria-label={recording ? "Detener grabación" : "Grabar voz"}
              style={{ touchAction: "manipulation" }}
            >
              <Mic size={15} />
            </button>

            <span className="ml-2 hidden font-mono text-[11px] uppercase tracking-[0.18em] text-muted sm:inline">
              {recording ? "Grabando…" : transcribing ? "Transcribiendo…" : hint}
            </span>
          </div>

          {pending ? (
            <button
              type="button"
              onClick={onStop}
              className="btn-ghost !px-4 !py-2"
              aria-label="Detener"
            >
              <Square size={13} /> Detener
            </button>
          ) : (
            // Send disabled si no hay texto. Adjuntos hoy son solo UI
            // (preview + ✕); el envío al payload de /api/forge/run con
            // image blocks es trabajo M-next. Antes habilitar con solo
            // attachment era un no-op confuso (Codex P2).
            <button
              type="submit"
              disabled={!input.trim()}
              className="btn-primary !px-4 !py-2 disabled:opacity-50"
            >
              {sendLabel} <ArrowUp size={13} />
            </button>
          )}
        </div>
      </form>
    </>
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
