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
  Check,
  Copy,
} from "lucide-react";
import { useT } from "@/i18n/AppProviders";
import { Markdown } from "./Markdown";
import { ThinkingIndicator, VOrb } from "./ThinkingIndicator";
import { useSmoothStream, usePrefersReducedMotion } from "./useSmoothStream";

type Action = { label: string; status: "done" | "running" | "queued" };
type Attachment = {
  /** original filename for UI */
  name: string;
  /** data URL preview (image only) */
  preview: string | null;
  /** base64 payload (without data:image/...;base64, prefix) */
  base64: string;
  /** mime-type (image/png, image/jpeg, etc.) */
  mediaType: string;
};
type Msg = {
  id: string;
  role: "user" | "b";
  text: string;
  actions?: Action[];
  /** image dataURL shown inline in the bubble for user uploads */
  image?: string;
};

const SCOPE_KEY = "vforge_chat_scope";

/** Anthropic-style content blocks that /api/forge/run accepts for vision. */
type StructuredBlock =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } };

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

/** Toggle body.keyboard-open class when the mobile soft keyboard is up. */
function useKeyboardBodyClass() {
  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;
    const vv = window.visualViewport;
    const onResize = () => {
      const open = window.innerHeight - vv.height > 150;
      document.body.classList.toggle("keyboard-open", open);
    };
    vv.addEventListener("resize", onResize);
    onResize();
    return () => {
      vv.removeEventListener("resize", onResize);
      document.body.classList.remove("keyboard-open");
    };
  }, []);
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
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const sessionIdRef = useRef<string>("");
  const abortRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<Msg[]>(messages);
  const scrollerRef = useRef<HTMLDivElement>(null);

  // ID of the assistant message currently streaming; null when idle.
  // The smooth-stream hook owns the live text while this is set, and the
  // <StreamingBubble> mounts in its place inside the messages list.
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  const smooth = useSmoothStream({ immediate: reducedMotion });

  useKeyboardBodyClass();

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
      // Permitir enviar solo con attachment (vision-only)
      if ((!trimmed && !attachment) || pending) return;

      const att = attachment;
      const userMsg: Msg = {
        id: `u_${Date.now()}`,
        role: "user",
        text: trimmed,
        image: att?.preview ?? undefined,
      };
      const aId = `b_${Date.now()}`;
      const aMsg: Msg = { id: aId, role: "b", text: "" };
      setMessages((m) => [...m, userMsg, aMsg]);
      setInput("");
      setAttachment(null);
      setPending(true);
      // Wire the smooth-stream to this assistant message.
      smooth.reset();
      setStreamingId(aId);
      let assembled = "";

      // Historia previa como text-only (no replay de imágenes — costo).
      const history: { role: "user" | "assistant"; content: string | StructuredBlock[] }[] =
        messagesRef.current
          .filter((m) => m.id !== "intro" && m.id !== aId)
          .map((m) => ({
            role: m.role === "b" ? ("assistant" as const) : ("user" as const),
            content: m.text,
          }));

      // Turno actual: si hay imagen, content es array Anthropic-style con
      // image block + text block. Si no, string plano.
      const currentContent: string | StructuredBlock[] = att
        ? [
            {
              type: "image" as const,
              source: { type: "base64" as const, media_type: att.mediaType, data: att.base64 },
            },
            ...(trimmed ? [{ type: "text" as const, text: trimmed }] : []),
          ]
        : trimmed;
      history.push({ role: "user", content: currentContent });

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
          assembled = `⚠ Error (${res.status}): ${err.slice(0, 200)}`;
          smooth.push(assembled);
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
                assembled += evt.value;
                smooth.push(evt.value);
              } else if (evt.type === "error") {
                const tail = `\n\n⚠ ${evt.message}`;
                assembled += tail;
                smooth.push(tail);
              }
            } catch {
              // skip
            }
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          // Commit whatever we've already shown so it persists in history.
          smooth.flush();
          setMessages((p) =>
            p.map((m) => (m.id === aId ? { ...m, text: assembled } : m)),
          );
          setStreamingId(null);
          return;
        }
        const msg = err instanceof Error ? err.message : String(err);
        const tail = assembled
          ? `\n\n⚠ Error de red: ${msg}`
          : `⚠ Error de red: ${msg}`;
        assembled += tail;
        smooth.push(tail);
      } finally {
        // Final commit: flush any remaining buffered chars, then promote the
        // assembled text into the message so it's part of the persistent list.
        smooth.flush();
        setMessages((p) =>
          p.map((m) => (m.id === aId ? { ...m, text: assembled } : m)),
        );
        setStreamingId(null);
        setPending(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pending, scope, attachment],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    // The send() catch will commit assembled text + clear streamingId.
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

      {/* Messages scroller — flex-col-reverse hace que el scroll empiece
          anclado al BOTTOM. Pocos mensajes → quedan pegados al composer.
          Muchos → el scroll funciona normal. El wrapper interno mantiene
          el orden cronológico real (sin invertir messages[]). Este es el
          patrón estándar de chat (WhatsApp/Claude/ChatGPT). */}
      <div
        ref={scrollerRef}
        className="flex-1 min-h-0 overflow-y-auto flex flex-col-reverse"
      >
        <div className="mx-auto w-full max-w-3xl px-3 py-3 md:px-10 md:py-5">
          {/* Operator header — solo visible cuando el chat está vacío (más
              espacio para mensajes cuando ya hay conversación). */}
          {messages.length <= 1 && (
            <div className="mb-5 flex flex-col items-center gap-3 py-4 text-center md:mb-8 md:py-8">
              <VOrb size={56} />
              <div>
                <p className="bg-gradient-to-r from-violet-300 via-violet-200 to-cyan-300 bg-clip-text font-display text-2xl font-semibold tracking-tight text-transparent md:text-3xl">
                  Hola, soy {t.common.label_b}.
                </p>
                <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
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

          <div className="space-y-4 md:space-y-5">
            <AnimatePresence initial={false}>
              {messages.map((m) =>
                m.id === streamingId ? (
                  <StreamingBubble
                    key={m.id}
                    text={smooth.displayed}
                    image={m.image}
                  />
                ) : (
                  <MessageBubble key={m.id} msg={m} />
                ),
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Composer FIJO — flex-shrink-0. El padding-bottom respeta el
          MobileNav (76px) salvo cuando el teclado mobile está abierto
          (body.keyboard-open lo reduce a la safe-area sola). */}
      <div
        className="vf-composer-pad flex-shrink-0 border-t border-app bg-void/95 backdrop-blur-xl"
      >
        <div className="mx-auto max-w-3xl px-2 pt-1 sm:px-4 sm:pt-2 md:px-10 md:pb-1">
          {/* Quick prompts: solo visibles cuando el chat está vacío para
              no comer espacio durante conversación. Mobile-only: scroll
              horizontal en 1 línea; desktop: wrap normal. */}
          {messages.length <= 1 && (
            <div className="mb-2 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:overflow-visible sm:flex-wrap sm:px-0 sm:pb-0 no-scrollbar">
              {quickPrompts.map((q) => (
                <button
                  key={q.label}
                  onClick={() => setInput(q.label)}
                  disabled={pending}
                  className="group inline-flex shrink-0 items-center gap-1.5 rounded-full border border-violet-500/20 bg-violet-500/[0.04] px-3 py-1.5 text-[12px] text-on-surface-variant transition hover:border-violet-500/40 hover:bg-violet-500/[0.08] hover:text-violet-200 active:scale-95 disabled:opacity-50"
                  style={{ touchAction: "manipulation" }}
                  aria-label={`Usar prompt: ${q.label}`}
                >
                  {q.icon && <q.icon size={12} className="text-violet-300" />}
                  {q.label}
                </button>
              ))}
            </div>
          )}

          <Composer
            input={input}
            setInput={setInput}
            pending={pending}
            onSend={() => send(input)}
            onStop={stop}
            placeholder={t.chat.placeholder}
            sendLabel={t.chat.send}
            hint={t.chat.shift_enter_hint}
            attachment={attachment}
            setAttachment={setAttachment}
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
  attachment: Attachment | null;
  setAttachment: (a: Attachment | null) => void;
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
  attachment,
  setAttachment,
}: ComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [recError, setRecError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Cuando el attachment se limpia (por send o ✕), también resetear el
  // value del <input type="file"> — sin esto, seleccionar el mismo
  // archivo no dispara onChange y el usuario no puede re-adjuntar
  // la misma imagen para reintentar (Codex P2 #r3256189940).
  useEffect(() => {
    if (!attachment) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
    }
  }, [attachment]);

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
    if (!file.type.startsWith("image/")) {
      setRecError("Por ahora solo imágenes. PDF/texto pronto.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
      if (!m) {
        setRecError("No pude leer la imagen");
        return;
      }
      setAttachment({
        name: file.name,
        preview: dataUrl,
        mediaType: m[1] || "image/jpeg",
        base64: m[2],
      });
    };
    reader.readAsDataURL(file);
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

        {/* Composer compacto WhatsApp-style: una sola fila con botones al
            lado del textarea. Padding mínimo, ingeniería alemana. */}
        <div className="flex items-end gap-0.5 px-1.5 py-1.5">
          <div className="flex items-center gap-0 pb-0.5 text-on-surface-variant">
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
              className="rounded-md p-1.5 hover:bg-tint-2"
              aria-label="Adjuntar archivo"
              style={{ touchAction: "manipulation" }}
            >
              <Paperclip size={14} />
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
              className="rounded-md p-1.5 hover:bg-tint-2"
              aria-label="Foto"
              style={{ touchAction: "manipulation" }}
            >
              <Camera size={14} />
            </button>

            {/* Micrófono — graba audio y transcribe via Whisper */}
            <button
              type="button"
              onClick={recording ? stopRecording : startRecording}
              disabled={transcribing}
              className={`rounded-md p-1.5 transition-colors ${
                recording
                  ? "bg-error-crimson/15 text-error-crimson animate-pulse"
                  : transcribing
                    ? "text-cyber-cyan animate-pulse"
                    : "hover:bg-tint-2"
              }`}
              aria-label={recording ? "Detener grabación" : "Grabar voz"}
              style={{ touchAction: "manipulation" }}
            >
              <Mic size={14} />
            </button>
          </div>

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={1}
            placeholder={
              recording ? "Grabando…" : transcribing ? "Transcribiendo…" : placeholder
            }
            className="flex-1 resize-none bg-transparent px-1.5 py-1.5 text-[16px] text-on-surface placeholder:text-muted focus:outline-none"
            style={{
              touchAction: "manipulation",
              minHeight: 36,
              maxHeight: 160,
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

          {pending ? (
            <button
              type="button"
              onClick={onStop}
              className="rounded-md bg-vf-fg p-1.5 text-vf-bg hover:opacity-90"
              aria-label="Detener"
              style={{ touchAction: "manipulation" }}
            >
              <Square size={13} className="fill-current" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim() && !attachment}
              aria-label={sendLabel}
              className="rounded-md bg-gradient-to-br from-violet-500 to-cyan-400 p-1.5 text-on-surface disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ touchAction: "manipulation" }}
            >
              <ArrowUp size={14} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </form>
    </>
  );
}

function MessageBubble({ msg }: { msg: Msg }) {
  const isB = msg.role === "b";
  if (isB) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="group/msg flex w-full gap-3"
      >
        <VOrb size={26} />
        <div className="min-w-0 flex-1">
          {msg.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={msg.image}
              alt="adjunto"
              className="mb-2 max-h-64 w-full rounded-lg border border-app object-cover"
            />
          )}
          {msg.text && <Markdown text={msg.text} />}
          {msg.actions && (
            <ul className="mt-3 space-y-2 rounded-lg border border-violet-500/15 bg-violet-500/[0.04] p-3 text-[13px]">
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
          {msg.text && msg.id !== "intro" && <AssistantActions text={msg.text} />}
        </div>
      </motion.div>
    );
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex w-full justify-end"
    >
      <div className="max-w-[85%] rounded-2xl rounded-br-md bg-gradient-to-br from-violet-500 to-cyan-500 px-4 py-2.5 text-[15px] leading-relaxed text-white shadow-glow-violet">
        {msg.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={msg.image}
            alt="adjunto"
            className="mb-2 max-h-64 w-full rounded-lg border border-white/20 object-cover"
          />
        )}
        {msg.text && (
          <p className="whitespace-pre-wrap break-words">{msg.text}</p>
        )}
      </div>
    </motion.div>
  );
}

function StreamingBubble({ text, image }: { text: string; image?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex w-full gap-3"
    >
      <VOrb size={26} />
      <div className="min-w-0 flex-1">
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt="adjunto"
            className="mb-2 max-h-64 w-full rounded-lg border border-app object-cover"
          />
        )}
        {text.length === 0 ? (
          <ThinkingIndicator />
        ) : (
          <Markdown text={text} streaming />
        )}
      </div>
    </motion.div>
  );
}

function AssistantActions({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function onCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      // ignore
    }
  }
  return (
    <div className="mt-2 hidden items-center gap-1 opacity-60 transition-opacity duration-200 sm:flex sm:hover:opacity-100">
      <button
        type="button"
        onClick={onCopy}
        className="flex items-center gap-1 rounded-md border border-app bg-tint-1 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-on-surface-variant transition hover:border-violet-500/30 hover:text-violet-300"
        aria-label={copied ? "Copiado" : "Copiar respuesta"}
      >
        {copied ? <Check size={11} /> : <Copy size={11} />}
        <span>{copied ? "Copiado" : "Copy"}</span>
      </button>
    </div>
  );
}
