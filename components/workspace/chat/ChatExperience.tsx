"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { IconActivity, IconArrowUp, IconBranch, IconChat, IconCheck, IconChevD, IconChevL, IconCopy, IconGlobe, IconHistory, IconHome, IconMic, IconPaperclip, IconPlus, IconRefresh, IconRocket, IconShield, IconSparkles, IconStop, IconThumb, IconThumbDown, IconWand, IconX } from "@/components/brand/VFIcons";
import Link from "next/link";
import { useT } from "@/i18n/AppProviders";
import { VPresence } from "@/components/brand/VPresence";
import { Markdown } from "./Markdown";

/** Sanitiza output corrupto del modelo antes de renderizar */
function sanitizeModelOutput(text: string): string {
  if (!text) return text;
  // Detectar loop de caracteres CJK (額額額... etc)
  if (/(.){40,}/.test(text)) {
    const match = text.match(/(.){40,}/);
    const truncated = text.substring(0, text.indexOf(match![0]));
    return truncated.trim() + (truncated.length > 0 ? "\n\n⚠ _Respuesta truncada — el modelo generó contenido corrupto._" : "⚠ _El modelo generó una respuesta corrupta. Intenta de nuevo._");
  }
  // Detectar repetición de secuencias (BCBCBC... LCBCLCBCLo...)
  if (/([A-Z]{2,6}){20,}/.test(text)) {
    const match = text.match(/([A-Z]{2,6}){20,}/);
    const truncated = text.substring(0, text.indexOf(match![0]));
    return truncated.trim() + (truncated.length > 0 ? "\n\n⚠ _Respuesta truncada — output repetitivo detectado._" : "⚠ _Output repetitivo detectado. Intenta de nuevo._");
  }
  // Detectar tokens de relleno de LLM (LLLyLLL, nuLnuLnu...)
  if (/(?:LLL|nuL|doL){6,}/.test(text)) {
    const match = text.match(/(?:LLL|nuL|doL){6,}/);
    const truncated = text.substring(0, text.indexOf(match![0]));
    return truncated.trim() + (truncated.length > 0 ? "\n\n⚠ _Respuesta truncada — modelo colapsó. Reduce el contexto o cambia el modelo._" : "⚠ _El modelo colapsó. Intenta de nuevo con menos contexto._");
  }
  return text;
}
import VersionCard from "./VersionCard";
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
  /** referencia a una versión del builder: pinta <VersionCard/> */
  versionRef?: { buildId: string; versionId: string; n: number; summary: string };
};

const SCOPE_KEY = "vforge_chat_scope";

const LOCAL_SESSION_KEY = "vforge_local_session";

function rememberLocalSession(scope: string, sid: string) {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(LOCAL_SESSION_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, { sid: string; at: number }>) : {};
    map[scope] = { sid, at: Date.now() };
    window.localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

function recallLocalSession(scope: string): { sid: string; at: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_SESSION_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, { sid: string; at: number }>) : {};
    return map[scope] ?? null;
  } catch {
    return null;
  }
}

/** Anthropic-style content blocks that /api/forge/run accepts for vision. */
type StructuredBlock =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } };


function friendlyModel(slug: string): string {
  // Quita el sufijo de variante (:free/:nitro/...) para no mostrar el id
  // crudo "barato" en el header. V se ve premium aunque corra en gratis.
  const base = slug.replace(/:(free|nitro|beta|extended|thinking|online)$/i, "");
  const map: Array<[RegExp, string]> = [
    [/anthropic\/claude-opus-([\d.]+)/, "Claude Opus $1"],
    [/anthropic\/claude-sonnet-([\d.]+)/, "Claude Sonnet $1"],
    [/anthropic\/claude-haiku-([\d.]+)/, "Claude Haiku $1"],
    [/anthropic\/claude-3\.5-sonnet/, "Claude 3.5 Sonnet"],
    [/google\/gemini-([\w.-]+)/, "Gemini $1"],
    [/google\/gemma-([\w.-]+)/, "Gemma $1"],
    [/moonshotai\/kimi-([\w.-]+)/, "Kimi $1"],
    [/minimax\/minimax-([\w.-]+)/, "MiniMax $1"],
    [/meta-llama\/llama-([\w.-]+)/, "Llama $1"],
    [/deepseek\//, "DeepSeek"],
  ];
  for (const [re, name] of map) {
    const m = base.match(re);
    if (m) return name.replace("$1", m[1] ?? "");
  }
  // Último recurso: nombre sin proveedor ni sufijo de variante.
  return base.split("/").pop() ?? base;
}

type SSEEvent =
  | { type: "text"; value: string }
  | { type: "tool_use_start"; id: string; name: string }
  | { type: "tool_use_result"; id: string; ok: boolean; summary: string }
  | { type: "model_fallback"; from: string; to: string; status: number | null; reason: string }
  | { type: "done"; tokensIn: number; tokensOut: number; model: string }
  | { type: "meta"; model: string; fallback?: boolean }
  | { type: "version"; buildId: string; versionId: string; n: number; summary: string }
  | { type: "error"; message: string };

interface ChatSession {
  session_id: string;
  title: string;
  last_at: string;
  count: number;
}

interface IconHistory {
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

/**
 * Re-escribe los mensajes de error que llegan del backend a algo amigable
 * para el usuario, ocultando nombres de proveedores (OpenRouter, Anthropic,
 * etc.) y mapeando códigos HTTP comunes a frases en español.
 */
function sanitizeError(raw: string, status?: number): string {
  const r = (raw || "").toString();
  const s = r.toLowerCase();
  const code = status ?? (r.match(/\b(4\d\d|5\d\d)\b/)?.[1] ? Number(r.match(/\b(4\d\d|5\d\d)\b/)![1]) : undefined);

  if (code === 429 || /rate.?limit|too many requests|saturad/.test(s)) {
    return "Servicio temporalmente saturado. Espera un momento y reintenta.";
  }
  if (code === 402 || /insufficient|credit|saldo|payment required|balance/.test(s)) {
    return "Saldo agotado. Recarga el balance para seguir.";
  }
  if (code === 401 || code === 403 || /unauthor|forbidden|api key/.test(s)) {
    return "Problema de autenticación. Revisa la configuración.";
  }
  if (code === 404) {
    return "Recurso no encontrado.";
  }
  if (code === 408 || /timeout|timed out|deadline/.test(s)) {
    return "Se acabó el tiempo de respuesta. Reintenta.";
  }
  if ((code && code >= 500) || /server error|internal error|bad gateway|unavailable/.test(s)) {
    return "V tuvo un hipo del lado del servidor. Reintenta en un momento.";
  }
  if (/provider returned|upstream|model error/.test(s)) {
    return "El modelo no respondió. Reintenta.";
  }
  // Fallback: limpia nombres de proveedores y devuelve el resto recortado.
  const cleaned = r
    .replace(/openrouter/gi, "el proveedor")
    .replace(/anthropic/gi, "el proveedor")
    .replace(/openai/gi, "el proveedor")
    .trim();
  return cleaned.length > 0 ? cleaned : "Algo salió mal. Reintenta.";
}

export function ChatExperience() {
  const t = useT();
  const intro: Msg = { id: "intro", role: "b", text: t.chat.intro };
  const [messages, setMessages] = useState<Msg[]>([intro]);
  const [input, setInput] = useState("");
  const [composerFocusTick, setComposerFocusTick] = useState(0);
  const [pending, setPending] = useState(false);
  const [isHydrating, setIsHydrating] = useState(true);
  const [scope, setScope] = useState<string>("general");
  const [projects, setProjects] = useState<Project[]>([]);
  const [scopeMenuOpen, setScopeMenuOpen] = useState(false);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [repoMenuOpen, setRepoMenuOpen] = useState(false);
  const [deployMenuOpen, setDeployMenuOpen] = useState(false);
  const [repoFormOpen, setRepoFormOpen] = useState(false);
  const [repoName, setRepoName] = useState("");
  const [builderBusy, setBuilderBusy] = useState(false);
  const [builderNote, setBuilderNote] = useState<string | null>(null);

  const sendBuilderRequest = useCallback(
    async (action: "scaffold-request" | "deploy-request", name?: string) => {
      setBuilderBusy(true);
      setBuilderNote(null);
      try {
        const res = await fetch("/api/builder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, name: name ?? null, scope }),
        });
        const data = (await res.json().catch(() => ({}))) as { queued?: boolean };
        setBuilderNote(
          data?.queued
            ? action === "scaffold-request"
              ? "Repositorio en cola. V lo creará en cuanto el pipeline esté listo."
              : "Despliegue en cola. V lo enviará a Vercel en cuanto el pipeline esté listo."
            : "No se pudo encolar. Reintenta.",
        );
      } catch {
        setBuilderNote("No se pudo encolar. Reintenta.");
      } finally {
        setBuilderBusy(false);
      }
    },
    [scope],
  );
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const sessionIdRef = useRef<string>("");
  const abortRef = useRef<AbortController | null>(null);
  const lastSendAtRef = useRef<number>(0);
  const stallTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesRef = useRef<Msg[]>(messages);
  const scrollerRef = useRef<HTMLDivElement>(null);
  // Persistencia de scroll por conversación (sessionStorage: vf_scroll_<sid>).
  const scrollKeyRef = useRef<string>("");
  const restorePendingRef = useRef<boolean>(false);
  const saveScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ID of the assistant message currently streaming; null when idle.
  // The smooth-stream hook owns the live text while this is set, and the
  // <StreamingBubble> mounts in its place inside the messages list.
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [modelLabel, setModelLabel] = useState<string | null>(null);
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

  // Autoscroll que respeta al usuario: si subió a leer (>120px del fondo),
  // NO lo yankeamos hacia abajo. Solo seguimos pegados si ya estaba al fondo.
  const stickToBottomRef = useRef(true);
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => {
      const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
      stickToBottomRef.current = dist < 120;
      // No persistir mientras estamos restaurando una posición guardada.
      if (restorePendingRef.current) return;
      if (saveScrollTimerRef.current) clearTimeout(saveScrollTimerRef.current);
      saveScrollTimerRef.current = setTimeout(() => {
        const key = scrollKeyRef.current;
        if (!key) return;
        try {
          // Si está al fondo (margen 100px) borramos la key: que abra al fondo.
          const atBottom =
            el.scrollHeight - el.scrollTop - el.clientHeight < 100;
          if (atBottom) window.sessionStorage.removeItem(key);
          else window.sessionStorage.setItem(key, String(Math.round(el.scrollTop)));
        } catch {
          // ignore (sessionStorage no disponible)
        }
      }, 200);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (saveScrollTimerRef.current) clearTimeout(saveScrollTimerRef.current);
    };
  }, []);
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    // Tras hidratar una conversación: restaurar la posición donde la dejó el
    // usuario (una sola vez), en vez de pegarnos al fondo.
    if (restorePendingRef.current) {
      restorePendingRef.current = false;
      const key = scrollKeyRef.current;
      let saved: number | null = null;
      try {
        const raw = key ? window.sessionStorage.getItem(key) : null;
        if (raw != null) {
          const n = parseInt(raw, 10);
          saved = Number.isNaN(n) ? null : n;
        }
      } catch {
        saved = null;
      }
      if (saved != null) {
        // Había una posición guardada (no estaba al fondo): restaurarla.
        stickToBottomRef.current = false;
        const restore = () => el.scrollTo({ top: saved, behavior: "auto" });
        requestAnimationFrame(() => { restore(); requestAnimationFrame(restore); });
        return;
      }
      // Sin posición guardada: estaba al fondo, seguimos pegados.
      stickToBottomRef.current = true;
    }
    if (!stickToBottomRef.current) return;
    const toBottom = () => el.scrollTo({ top: el.scrollHeight, behavior: "auto" });
    requestAnimationFrame(() => { toBottom(); requestAnimationFrame(toBottom); });
  }, [messages, smooth.displayed]);

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
      let serverLastAt = 0;
      try {
        const res = await fetch(
          `/api/forge/active-session?scope=${encodeURIComponent(s)}`,
          { cache: "no-store", signal: ctrl.signal },
        );
        if (res.ok) {
          const data = (await res.json()) as { sessionId?: string; last_at?: string };
          if (data?.sessionId) sid = data.sessionId;
          if (data?.last_at) serverLastAt = Date.parse(data.last_at) || 0;
        }
      } catch {
        // ignore
      }
      // Si el usuario abrió un hilo nuevo en este dispositivo (newChat) y el
      // server aún no lo conoce (no hay rows), gana el local más reciente.
      const local = recallLocalSession(s);
      if (local && local.sid !== sid && local.at > serverLastAt) {
        sid = local.sid;
      }
      if (!sid) {
        sid = `s_${s}_${Date.now().toString(36)}`;
      }
      sessionIdRef.current = sid;
      // Clave de scroll por conversación + marcar restauración pendiente:
      // el siguiente render con los mensajes hidratados restaurará la posición.
      scrollKeyRef.current = `vf_scroll_${sid}`;
      restorePendingRef.current = true;

      try {
        const res = await fetch(
          `/api/forge/conversations?sessionId=${encodeURIComponent(sid)}&limit=100`,
          { cache: "no-store", signal: ctrl.signal },
        );
        if (res.ok) {
          const data = (await res.json()) as { turns: IconHistory[] };
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
      if (!trimmed && !attachment) return;
      // Guard de pending atascado: si un envío previo quedó colgado >90s,
      // lo cancelamos y dejamos pasar este. Nunca tragarse un mensaje.
      if (pending) {
        const stuck = Date.now() - (lastSendAtRef.current || 0) > 90_000;
        if (!stuck) return;
        abortRef.current?.abort();
        setPending(false);
        setStreamingId(null);
      }
      lastSendAtRef.current = Date.now();

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
      let reasoningOpen = false;
      const visibleDelta = (value: string) => {
        const cleaned = stripReasoningDelta(value, {
          isOpen: reasoningOpen,
          setOpen: (next) => {
            reasoningOpen = next;
          },
        });
        return cleaned;
      };

      // Historia previa como text-only (no replay de imágenes — costo).
      const history: { role: "user" | "assistant"; content: string | StructuredBlock[] }[] =
        messagesRef.current
          .filter((m) => {
            if (m.id === "intro" || m.id === aId) return false;
            // Filtrar mensajes que parecen corruptos (alucinaciones previas)
            if (!m.text || m.text.length === 0) return false;
            const loopCheck = m.text.match(/(.{2,6})\1{8,}/);
            if (loopCheck) return false;
            const cjkRatio = (m.text.match(/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g) || []).length / Math.max(m.text.length, 1);
            if (m.text.length > 50 && cjkRatio > 0.3) return false;
            return true;
          })
          .slice(-12)
          .map((m) => ({
            role: m.role === "b" ? ("assistant" as const) : ("user" as const),
            // Truncar mensajes muy largos para no explotar el contexto
            content: typeof m.text === "string" ? m.text.slice(0, 4000) : m.text,
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
          assembled = `⚠ ${sanitizeError(err, res.status)}`;
          smooth.push(assembled);
          return;
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        const armStall = () => {
          if (stallTimerRef.current) clearTimeout(stallTimerRef.current);
          stallTimerRef.current = setTimeout(() => {
            // Solo cortamos ante un silencio LARGO de red real (no para una
            // respuesta lenta por tool-use server-side). 120s = margen amplio.
            ctrl.abort();
          }, 120_000);
        };
        armStall();
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          armStall();
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const evt = JSON.parse(line.slice(6)) as SSEEvent;
              if (evt.type === "meta") {
                setModelLabel(friendlyModel(evt.model));
              } else if (evt.type === "done" && evt.model) {
                setModelLabel(friendlyModel(evt.model));
              } else if (evt.type === "text") {
                const cleaned = sanitizeModelDelta(evt.value);
                if (!cleaned) continue;
                const visible = visibleDelta(cleaned);
                if (!visible) continue;
                assembled += visible;
                smooth.push(visible);
              } else if (evt.type === "version") {
                // V generó una versión: insertamos un mensaje especial
                // con versionRef ANTES del placeholder en streaming para
                // que la VersionCard aparezca como parte del hilo.
                const vMsg: Msg = {
                  id: `ver_${evt.versionId}`,
                  role: "b",
                  text: "",
                  versionRef: {
                    buildId: evt.buildId,
                    versionId: evt.versionId,
                    n: evt.n,
                    summary: evt.summary,
                  },
                };
                setMessages((p) => {
                  const i = p.findIndex((m) => m.id === aId);
                  if (i < 0) return [...p, vMsg];
                  return [...p.slice(0, i), vMsg, ...p.slice(i)];
                });
              } else if (evt.type === "error") {
                const tail = `\n\n⚠ ${sanitizeError(evt.message)}`;
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
          smooth.flush();
          // Si fue el watchdog (sin texto), mensaje claro + el botón de
          // regenerar de la burbuja sirve como retry.
          const fallback = assembled || "⚠ Se cortó la conexión. Toca regenerar para reintentar.";
          setMessages((p) =>
            p.map((m) => (m.id === aId ? { ...m, text: fallback } : m)),
          );
          setStreamingId(null);
          setPending(false);
          return;
        }
        const msg = err instanceof Error ? err.message : String(err);
        const friendly = sanitizeError(msg);
        const tail = assembled
          ? `\n\n⚠ ${friendly}`
          : `⚠ ${friendly}`;
        assembled += tail;
        smooth.push(tail);
      } finally {
        // Final commit: flush any remaining buffered chars, then promote the
        // assembled text into the message so it's part of the persistent list.
        smooth.flush();
        // Los bloques <memory> son internos (memoria de cuenta) — no se muestran.
        const visibleText = assembled
          .replace(/<memory\s+key="[^"]*"\s*>[\s\S]*?<\/memory>/g, "")
          .replace(/\n{3,}/g, "\n\n")
          .trimEnd();
        setMessages((p) =>
          p.map((m) => (m.id === aId ? { ...m, text: visibleText } : m)),
        );
        setStreamingId(null);
        setPending(false);
        if (stallTimerRef.current) { clearTimeout(stallTimerRef.current); stallTimerRef.current = null; }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pending, scope, attachment],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    // The send() catch will commit assembled text + clear streamingId.
  }, []);

  // Regenera la respuesta de un mensaje del asistente: encuentra el último
  // turno de usuario antes del mensaje asistente indicado, recorta esa
  // respuesta del historial y vuelve a llamar a send() con el mismo texto.
  // No toca lógica de V — solo re-ejecuta la misma request.
  const regenerate = useCallback(
    (assistantId: string) => {
      if (pending) return;
      const list = messagesRef.current;
      const idx = list.findIndex((m) => m.id === assistantId);
      if (idx < 0) return;
      // Busca el último user msg antes del asistente.
      let userIdx = -1;
      for (let i = idx - 1; i >= 0; i--) {
        if (list[i].role === "user") {
          userIdx = i;
          break;
        }
      }
      if (userIdx < 0) return;
      const userText = list[userIdx].text;
      // Quita TODO desde el user msg (inclusive) hasta el final — send()
      // volverá a empujar el user msg y un nuevo placeholder asistente.
      setMessages((p) => p.slice(0, userIdx));
      // Encola el send para el próximo tick así el slice se aplica primero.
      setTimeout(() => void send(userText), 0);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pending],
  );

  // Start fresh chat for current scope
  const newChat = useCallback(async () => {
    // Si hay un stream en curso lo cortamos: cambiar de hilo siempre responde.
    abortRef.current?.abort();
    setPending(false);
    setStreamingId(null);

    // Reset optimista INMEDIATO con un id local válido — la UI nunca se
    // queda muda aunque el server tarde o falle.
    const localSid = `s_${scope}_${Date.now().toString(36)}${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    sessionIdRef.current = localSid;
    setMessages([{ id: "intro", role: "b", text: t.chat.intro }]);
    rememberLocalSession(scope, localSid);

    try {
      const res = await fetch("/api/forge/active-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope }),
      });
      if (res.ok) {
        const data = (await res.json()) as { sessionId?: string };
        // Solo adoptamos el id del server si el usuario aún no escribió nada.
        if (data?.sessionId && sessionIdRef.current === localSid) {
          sessionIdRef.current = data.sessionId;
          rememberLocalSession(scope, data.sessionId);
        }
      }
    } catch {
      // best-effort; el id local ya funciona
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, t.chat.intro]);

  // ---- Multi-chat: lista de sesiones + cambio de sesion ----
  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const res = await fetch("/api/forge/sessions?limit=30", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { sessions: ChatSession[] };
        setSessions(data.sessions ?? []);
      }
    } catch {
      // ignore
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  const openSessions = useCallback(() => {
    setSessionsOpen(true);
    void loadSessions();
  }, [loadSessions]);

  const switchSession = useCallback(
    async (sid: string) => {
      if (pending || sid === sessionIdRef.current) {
        setSessionsOpen(false);
        return;
      }
      setSessionsOpen(false);
      setIsHydrating(true);
      sessionIdRef.current = sid;
      try {
        const res = await fetch(
          `/api/forge/conversations?sessionId=${encodeURIComponent(sid)}&limit=100`,
          { cache: "no-store" },
        );
        if (res.ok) {
          const data = (await res.json()) as { turns: IconHistory[] };
          const hydrated: Msg[] = (data.turns ?? [])
            .filter((tn) => tn.role === "user" || tn.role === "assistant")
            .map((tn) => ({
              id: tn.id,
              role: tn.role === "assistant" ? "b" : "user",
              text: tn.content,
            }));
          setMessages(
            hydrated.length > 0
              ? hydrated
              : [{ id: "intro", role: "b", text: t.chat.intro }],
          );
        }
      } catch {
        // keep current
      } finally {
        setIsHydrating(false);
      }
    },
    [pending, t.chat.intro],
  );

  const startNewSession = useCallback(() => {
    if (pending) return;
    setSessionsOpen(false);
    sessionIdRef.current = `s_${scope}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    setMessages([{ id: "intro", role: "b", text: t.chat.intro }]);
  }, [pending, scope, t.chat.intro]);

  const scopeOptions: ScopeOption[] = [
    { id: "general", label: "General" },
    ...projects.map((p) => ({ id: p.id, label: p.name, repo: p.github_repo ?? undefined })),
  ];
  const currentScope = scopeOptions.find((o) => o.id === scope) ?? scopeOptions[0];

  const quickPrompts = t.chat.quick_prompts.map((label, i) => ({
    icon: [IconSparkles, IconWand, IconShield, IconGlobe][i],
    label,
  }));

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        className="sticky top-0 z-40 flex-shrink-0 border-b border-app bg-void/70 backdrop-blur-xl"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="mx-auto flex h-12 max-w-3xl items-center gap-1 px-2 sm:px-3 md:px-8">
          {/* Volver (solo móvil) */}
          <Link href="/app/home"
            aria-label="Volver a inicio"
            className="flex h-11 w-11 items-center justify-center rounded-full text-on-surface-variant transition hover:bg-tint-2 hover:text-on-surface md:hidden"
            style={{ touchAction: "manipulation" }}
          >
            <IconChevL size={20} />
          </Link>

          {/* Centro: V + scope (tap abre el menú de scope existente) */}
          <div className="relative flex min-w-0 flex-1 justify-center">
            <button
              type="button"
              onClick={() => setScopeMenuOpen((v) => !v)}
              className="flex min-h-[44px] min-w-0 items-center gap-2 rounded-full px-2 transition hover:bg-tint-1"
              style={{ touchAction: "manipulation" }}
              aria-haspopup="menu"
              aria-expanded={scopeMenuOpen}
            >
              <VPresence size={18} breathing />
              <span className="min-w-0 text-left">
                <span className="flex items-center gap-1">
                  <span className="truncate text-sm font-medium text-on-surface">
                    {currentScope.label}
                  </span>
                  <IconChevD size={11} className="shrink-0 text-muted" />
                </span>
                {modelLabel && (
                  <span className="block truncate text-[10px] leading-tight text-muted">
                    {modelLabel}
                  </span>
                )}
              </span>
            </button>
            {scopeMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setScopeMenuOpen(false)}
                />
                <div className="absolute left-1/2 top-full z-40 mt-1 max-h-[60vh] w-[260px] -translate-x-1/2 overflow-y-auto rounded-md border border-app bg-ink shadow-elev">
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
                        <IconChat size={13} className="mt-0.5 shrink-0 text-violet-300" />
                      ) : (
                        <IconBranch size={13} className="mt-0.5 shrink-0 text-cyber-cyan" />
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

          {/* Repo (GitHub) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setRepoMenuOpen((v) => !v);
                setDeployMenuOpen(false);
                setHeaderMenuOpen(false);
              }}
              aria-label="Repositorio"
              aria-haspopup="menu"
              aria-expanded={repoMenuOpen}
              className="flex h-11 w-11 items-center justify-center rounded-full text-on-surface-variant transition hover:bg-tint-2 hover:text-on-surface"
              style={{ touchAction: "manipulation" }}
            >
              <IconBranch size={17} />
            </button>
            {repoMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => {
                    setRepoMenuOpen(false);
                    setRepoFormOpen(false);
                    setBuilderNote(null);
                  }}
                />
                <div className="absolute right-0 top-full z-40 mt-1 w-[240px] overflow-hidden rounded-xl border border-app bg-ink shadow-elev backdrop-blur-xl">
                  {!repoFormOpen ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setRepoFormOpen(true)}
                        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-on-surface hover:bg-tint-1"
                      >
                        <IconPlus size={14} className="text-violet-300" /> Crear repositorio…
                      </button>
                      {currentScope.repo && (
                        <a
                          href={`https://github.com/${currentScope.repo}`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={() => setRepoMenuOpen(false)}
                          className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-on-surface hover:bg-tint-1"
                        >
                          <IconBranch size={14} className="text-cyber-cyan" /> Ver en GitHub
                        </a>
                      )}
                    </>
                  ) : (
                    <div className="p-3">
                      <p className="mb-2 text-[12px] text-muted">Nombre del repositorio</p>
                      <input
                        type="text"
                        value={repoName}
                        onChange={(e) => setRepoName(e.target.value)}
                        placeholder="mi-proyecto"
                        className="mb-2 w-full rounded-md border border-app bg-void px-3 py-2 text-sm text-on-surface placeholder:text-muted focus:border-violet-500/40 focus:outline-none"
                        style={{ fontSize: 16, touchAction: "manipulation" }}
                      />
                      <button
                        type="button"
                        disabled={builderBusy || !repoName.trim()}
                        onClick={() => void sendBuilderRequest("scaffold-request", repoName.trim())}
                        className="w-full rounded-md bg-violet-500/20 px-3 py-2 text-sm font-medium text-violet-300 ring-1 ring-violet-500/30 transition hover:bg-violet-500/30 disabled:opacity-50"
                        style={{ minHeight: 44, touchAction: "manipulation" }}
                      >
                        {builderBusy ? "Encolando…" : "Crear"}
                      </button>
                      {builderNote && (
                        <p className="mt-2 text-[12px] text-muted">{builderNote}</p>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Deploy (Vercel) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setDeployMenuOpen((v) => !v);
                setRepoMenuOpen(false);
                setHeaderMenuOpen(false);
              }}
              aria-label="Despliegue"
              aria-haspopup="menu"
              aria-expanded={deployMenuOpen}
              className="flex h-11 w-11 items-center justify-center rounded-full text-on-surface-variant transition hover:bg-tint-2 hover:text-on-surface"
              style={{ touchAction: "manipulation" }}
            >
              <IconRocket size={17} />
            </button>
            {deployMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => {
                    setDeployMenuOpen(false);
                    setBuilderNote(null);
                  }}
                />
                <div className="absolute right-0 top-full z-40 mt-1 w-[230px] overflow-hidden rounded-xl border border-app bg-ink shadow-elev backdrop-blur-xl">
                  <button
                    type="button"
                    disabled={builderBusy}
                    onClick={() => void sendBuilderRequest("deploy-request")}
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-on-surface hover:bg-tint-1 disabled:opacity-50"
                  >
                    <IconRocket size={14} className="text-violet-300" />
                    {builderBusy ? "Encolando…" : "Deploy a Vercel…"}
                  </button>
                  <Link href="/app/deployments"
                    onClick={() => setDeployMenuOpen(false)}
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-on-surface hover:bg-tint-1"
                  >
                    <IconGlobe size={14} className="text-cyber-cyan" /> Ver deployments
                  </Link>
                  {builderNote && (
                    <p className="px-3 pb-2.5 text-[12px] text-muted">{builderNote}</p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Menú ··· */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setHeaderMenuOpen((v) => !v)}
              aria-label="Más opciones"
              aria-haspopup="menu"
              aria-expanded={headerMenuOpen}
              className="flex h-11 w-11 items-center justify-center rounded-full text-on-surface-variant transition hover:bg-tint-2 hover:text-on-surface"
              style={{ touchAction: "manipulation" }}
            >
              <IconChevD size={18} />
            </button>
            {headerMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setHeaderMenuOpen(false)}
                />
                <div className="absolute right-0 top-full z-40 mt-1 w-[180px] overflow-hidden rounded-xl border border-app bg-ink shadow-elev">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      setHeaderMenuOpen(false);
                      void newChat();
                    }}
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-on-surface hover:bg-tint-1 disabled:opacity-50"
                  >
                    <IconPlus size={14} className="text-violet-300" /> Nuevo hilo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setHeaderMenuOpen(false);
                      openSessions();
                    }}
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-on-surface hover:bg-tint-1"
                  >
                    <IconHistory size={14} className="text-cyber-cyan" /> Hilos
                  </button>
                  <Link href="/app/home"
                    onClick={() => setHeaderMenuOpen(false)}
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-on-surface hover:bg-tint-1"
                  >
                    <IconHome size={14} className="text-muted" /> Inicio
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-col min-h-0">
      <div
        ref={scrollerRef}
        className="chat-scroll flex min-h-0 flex-1 overflow-y-auto overflow-x-hidden"
      >
        <div
          className={`mx-auto flex min-h-full w-full max-w-3xl flex-col overflow-x-hidden px-3 py-4 md:px-8 md:py-6 ${
            messages.length <= 4 ? "justify-end" : ""
          }`}
        >
          {messages.length <= 1 && (
            <div className="mb-4 flex items-center gap-3 rounded-2xl border border-app bg-[var(--color-surface-low)] px-4 py-3">
              <VOrb size={34} />
              <div>
                <p className="bg-gradient-to-r from-violet-500 via-violet-400 to-cyan-400 bg-clip-text font-display text-lg font-semibold tracking-tight text-transparent">
                  Hola, soy {t.common.label_b}.
                </p>
                <p className="mt-0.5 text-[12px] text-muted">
                  En línea · {currentScope.label}
                </p>
              </div>
            </div>
          )}

          {isHydrating && (
            <div className="mb-6 text-center">
              <span className="text-[13px] italic text-muted">
                V está recordando…
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
                  <MessageBubble
                    key={m.id}
                    msg={m}
                    onRegenerate={
                      m.role === "b" && m.id !== "intro" && !pending
                        ? () => regenerate(m.id)
                        : undefined
                    }
                    onVersionChangeRequest={(prefix) => {
                      setInput(prefix);
                      setComposerFocusTick((n) => n + 1);
                    }}
                  />
                ),
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Drawer de sesiones (multi-chat) */}
      {sessionsOpen && (
        <>
          <div
            className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-[2px]"
            onClick={() => setSessionsOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 z-[71] flex w-[88vw] max-w-sm flex-col border-l border-[var(--border-1)] bg-[#0b0716]/85 shadow-[0_0_60px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border-1)] px-4 py-3">
              <p className="font-display text-sm font-semibold text-white">Tus chats</p>
              <button
                type="button"
                onClick={() => setSessionsOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--fg-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--fg-primary)]"
              >
                <IconX size={15} />
              </button>
            </div>
            <div className="px-3 pt-3">
              <button
                type="button"
                onClick={startNewSession}
                disabled={pending}
                className="flex w-full items-center gap-2 rounded-xl border border-violet-400/50 bg-violet-500/25 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-violet-500/35 disabled:opacity-50"
              >
                <IconPlus size={15} className="text-cyan-300" />
                Nuevo chat
              </button>
            </div>
            <div className="mt-2 flex-1 overflow-y-auto px-3 pb-4">
              {sessionsLoading && (
                <p className="px-2 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--fg-tertiary)]">
                  Cargando chats…
                </p>
              )}
              {!sessionsLoading && sessions.length === 0 && (
                <p className="px-2 py-3 text-sm text-[var(--fg-tertiary)]">Sin chats todavía.</p>
              )}
              {sessions.map((sess) => (
                <button
                  key={sess.session_id}
                  type="button"
                  onClick={() => void switchSession(sess.session_id)}
                  className={`mt-1.5 flex w-full flex-col gap-0.5 rounded-xl border px-3 py-2.5 text-left transition ${
                    sess.session_id === sessionIdRef.current
                      ? "border-violet-400/50 bg-violet-500/20 text-white"
                      : "border-transparent bg-[var(--surface-1)] text-[var(--fg-primary)] hover:bg-white/[0.12] hover:text-white"
                  }`}
                >
                  <span className="truncate text-sm font-medium">{sess.title}</span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--fg-tertiary)]">
                    {new Date(sess.last_at).toLocaleString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })} · {sess.count} msgs
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <div
        className="vf-composer-pad flex-shrink-0 border-t border-app bg-void/95 backdrop-blur-xl"
      >
        <div className="mx-auto max-w-3xl px-3 pb-2 pt-2 sm:px-4 md:px-8">
          {messages.length <= 1 && (
            <div className="mb-2 -mx-1 flex flex-nowrap gap-2 overflow-x-auto px-1 pb-1 no-scrollbar">
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
            focusTick={composerFocusTick}
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

      {/* Aside de previews (solo ≥xl) — aquí vivirán las tarjetas de versión del builder */}
      <aside className="hidden w-[420px] shrink-0 flex-col items-center justify-center gap-4 border-l border-app xl:flex">
        <VPresence size={32} breathing={false} />
        <p className="max-w-[220px] text-center text-sm text-muted">
          Los previews de tus builds vivirán aquí
        </p>
      </aside>
      </div>
    </div>
  );
}

interface ComposerProps {
  input: string;
  setInput: (v: string) => void;
  /** Cuando cambia, el textarea recibe focus (ej. "Cambia esto" de una VersionCard). */
  focusTick?: number;
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
  focusTick,
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

  // "Cambia esto" de una VersionCard: enfoca el composer con el prefijo
  // ya puesto y el cursor al final.
  useEffect(() => {
    if (!focusTick) return;
    const el = textareaRef.current;
    if (!el) return;
    el.focus();
    const len = el.value.length;
    el.setSelectionRange(len, len);
  }, [focusTick]);

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
                <IconX size={12} />
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
                <IconPaperclip size={14} className="text-violet-300" />
              )}
              <span className="flex-1 truncate text-[12px] text-on-surface-variant">
                {attachment.name}
              </span>
              <button
                onClick={clearAttachment}
                className="rounded p-1 text-muted hover:bg-tint-2 hover:text-on-surface"
                aria-label="Quitar adjunto"
              >
                <IconX size={12} />
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
        data-vorb-avoid
        className="group/composer relative overflow-hidden rounded-2xl border border-app bg-surface/70 shadow-[0_1px_0_rgba(255,255,255,0.06)_inset,0_12px_40px_rgba(0,0,0,0.25)] backdrop-blur-2xl transition-all duration-300 focus-within:border-violet-400/40 focus-within:shadow-[0_1px_0_rgba(255,255,255,0.08)_inset,0_0_0_1px_rgba(139,92,246,0.25),0_12px_44px_rgba(139,92,246,0.18)]"
      >
        <div className="flex items-end gap-1.5 px-2 py-2 sm:gap-2">
          <div className="flex items-center gap-0.5 pb-0.5 text-on-surface-variant sm:gap-1">
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
              className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-tint-2"
              aria-label="Adjuntar archivo"
              style={{ touchAction: "manipulation" }}
            >
              <IconPlus size={18} />
            </button>

            {/* Cámara oculta — input se conserva por si se reusa, sin botón visible */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={(e) => handleFile(e.target.files)}
            />

            {/* Micrófono — graba audio y transcribe via Whisper */}
            <button
              type="button"
              onClick={recording ? stopRecording : startRecording}
              disabled={transcribing}
              className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
                recording
                  ? "bg-error-crimson/15 text-error-crimson animate-pulse"
                  : transcribing
                    ? "text-cyber-cyan animate-pulse"
                    : "hover:bg-tint-2"
              }`}
              aria-label={recording ? "Detener grabación" : "Grabar voz"}
              style={{ touchAction: "manipulation" }}
            >
              <IconMic size={16} />
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
            className="flex-1 resize-none bg-transparent px-1.5 py-2 text-[16px] leading-6 text-on-surface placeholder:text-muted focus:outline-none"
            style={{
              touchAction: "manipulation",
              minHeight: 44,
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
              className="flex h-10 w-10 items-center justify-center rounded-full bg-vf-fg text-vf-bg hover:opacity-90"
              aria-label="Detener"
              style={{ touchAction: "manipulation" }}
            >
              <IconStop size={15} className="fill-current" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim() && !attachment}
              aria-label={sendLabel}
              className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 text-white transition-all duration-200 active:scale-90 disabled:cursor-not-allowed disabled:opacity-35 disabled:saturate-50 ${
                input.trim() || attachment
                  ? "scale-100 shadow-[0_4px_18px_rgba(139,92,246,0.55)] hover:shadow-[0_4px_24px_rgba(139,92,246,0.75)]"
                  : "scale-95"
              }`}
              style={{ touchAction: "manipulation" }}
            >
              <IconArrowUp size={17} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </form>
    </>
  );
}

function MessageBubble({
  msg,
  onRegenerate,
  onVersionChangeRequest,
}: {
  msg: Msg;
  onRegenerate?: () => void;
  onVersionChangeRequest?: (prefix: string) => void;
}) {
  const isB = msg.role === "b";
  if (isB) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="group/msg flex w-full min-w-0 items-start gap-3"
      >
        <div className="pt-1">
          <VOrb size={24} />
        </div>
        <div className="chat-bubble-forge min-w-0 max-w-[88%] overflow-hidden rounded-2xl rounded-bl-md px-5 py-4">
          {msg.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={msg.image}
              alt="adjunto"
              className="mb-2 max-h-64 w-full rounded-lg border border-app object-cover"
            />
          )}
          {msg.text && <Markdown text={sanitizeModelOutput(msg.text)} />}
          {msg.versionRef && (
            <VersionCard
              buildId={msg.versionRef.buildId}
              versionId={msg.versionRef.versionId}
              n={msg.versionRef.n}
              summary={msg.versionRef.summary}
              onChangeRequest={onVersionChangeRequest}
            />
          )}
          {msg.actions && (
            <ul className="mt-3 space-y-2 rounded-lg border border-violet-500/15 bg-violet-500/[0.04] p-3 text-[13px]">
              {msg.actions.map((a) => (
                <li key={a.label} className="flex items-center gap-2 text-on-surface">
                  {a.status === "done" ? (
                    <IconCheck size={14} className="text-success-emerald" />
                  ) : a.status === "running" ? (
                    <IconActivity size={14} className="animate-pulse text-cyber-cyan" />
                  ) : (
                    <IconActivity size={14} className="text-muted" />
                  )}
                  <span className={a.status === "queued" ? "text-on-surface-variant" : ""}>{a.label}</span>
                </li>
              ))}
            </ul>
          )}
          {msg.text && msg.id !== "intro" && (
            <AssistantActions
              messageId={msg.id}
              text={msg.text}
              onRegenerate={onRegenerate}
            />
          )}
        </div>
      </motion.div>
    );
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex w-full min-w-0 justify-end"
    >
      <div className="chat-bubble-user max-w-[82%] min-w-0 rounded-2xl rounded-br-md bg-gradient-to-br from-violet-500 to-cyan-500 px-4 py-2.5 font-sans text-[15px] font-normal leading-[1.55] text-white shadow-glow-violet sm:text-[16px]">
        {msg.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={msg.image}
            alt="adjunto"
            className="mb-2 max-h-64 w-full rounded-lg border border-[var(--border-2)] object-cover"
          />
        )}
        {msg.text && (
          <p
            className="whitespace-pre-wrap"
            style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}
          >
            {msg.text}
          </p>
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
      className="flex w-full min-w-0 items-start gap-3"
      style={{ contain: "layout style" }}
    >
      <div className="pt-1">
        <VOrb size={24} />
      </div>
      <div
        className="chat-bubble-forge min-w-0 max-w-[88%] overflow-hidden rounded-2xl rounded-bl-md px-5 py-4"
        style={{ contain:"layout style" }}
      >
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

const FEEDBACK_KEY = "vforge_chat_feedback";

function readFeedback(messageId: string): "up" | "down" | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(FEEDBACK_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, "up" | "down">) : {};
    return map[messageId] ?? null;
  } catch {
    return null;
  }
}

function writeFeedback(messageId: string, value: "up" | "down" | null) {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(FEEDBACK_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, "up" | "down">) : {};
    if (value === null) delete map[messageId];
    else map[messageId] = value;
    window.localStorage.setItem(FEEDBACK_KEY, JSON.stringify(map));
  } catch {
    // ignore quota / parse
  }
}

function stripReasoningDelta(
  value: string,
  state: { isOpen: boolean; setOpen: (next: boolean) => void },
): string {
  let text = value;
  let out = "";

  while (text.length > 0) {
    if (state.isOpen) {
      const end = text.search(/<\/(?:think|thinking|reasoning|antml:thinking)>/i);
      if (end === -1) return out; // aún dentro del bloque, descartar todo
      text = text.slice(end).replace(/^<\/(?:think|thinking|reasoning|antml:thinking)>/i, "");
      state.setOpen(false);
      continue;
    }

    const start = text.search(/<(?:think|thinking|reasoning|antml:thinking)>/i);
    if (start === -1) {
      out += text;
      break;
    }
    out += text.slice(0, start);
    text = text.slice(start).replace(/^<(?:think|thinking|reasoning|antml:thinking)>/i, "");
    state.setOpen(true);
  }

  return out
    .split("\n")
    .filter((line) => !/^\s*(pensando|proceso|razonamiento|chain of thought|thoughts?|Thinking)\s*[:\-]/i.test(line))
    .join("\n");
}

/**
 * Detecta si un delta de texto parece output corrupto del modelo:
 * loops de tokens, caracteres CJK repetitivos, tokens de relleno.
 * Si hay señales de corrupción, devuelve string vacío para silenciarlo.
 */
function sanitizeModelDelta(text: string): string {
  if (!text || text.length === 0) return text;

  // Detectar loops: más de 8 repeticiones del mismo patrón corto (2-6 chars)
  const loopMatch = text.match(/(.{2,6})\1{8,}/);
  if (loopMatch) return "";

  // Detectar avalancha de caracteres CJK (chino/japonés/coreano) fuera de contexto
  // Un delta normal puede tener 1-2 pero no 20+ seguidos
  const cjkRatio = (text.match(/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g) || []).length / text.length;
  if (text.length > 15 && cjkRatio > 0.4) return "";

  // Detectar tokens de relleno tipo "LLLL", "BCBC", "LCBC" repetidos
  if (/([A-Z]{2,4})\1{5,}/.test(text)) return "";

  // Token canal descartado
  if (text.includes("|channel|") || text.includes("<|channel")) return "";

  // Token especial stdio, nu_, etc en cantidad
  if (/(stdio_|nuLL|_stdio|LL_L|_L_L){3,}/.test(text)) return "";

  return text;
}

function AssistantActions({
  messageId,
  text,
  onRegenerate,
}: {
  messageId: string;
  text: string;
  onRegenerate?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    setFeedback(readFeedback(messageId));
  }, [messageId]);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      // ignore
    }
  }

  function setVote(value: "up" | "down") {
    const next = feedback === value ? null : value;
    setFeedback(next);
    writeFeedback(messageId, next);
  }

  const btn =
    "flex h-7 items-center gap-1 rounded-md border border-app bg-tint-1 px-2 font-mono text-[10px] uppercase tracking-widest text-on-surface-variant transition hover:border-violet-500/30 hover:text-violet-300";

  return (
    <div className="mt-2 hidden items-center gap-1 opacity-70 transition-opacity duration-200 sm:flex sm:hover:opacity-100">
      <button
        type="button"
        onClick={onCopy}
        className={btn}
        aria-label={copied ? "Copiado" : "Copiar respuesta"}
      >
        {copied ? <IconCheck size={11} /> : <IconCopy size={11} />}
        <span>{copied ? "Copiado" : "Copy"}</span>
      </button>
      {onRegenerate && (
        <button
          type="button"
          onClick={onRegenerate}
          className={btn}
          aria-label="Regenerar respuesta"
          title="Regenerar"
        >
          <IconRefresh size={11} />
          <span>Regen</span>
        </button>
      )}
      <button
        type="button"
        onClick={() => setVote("up")}
        className={
          feedback === "up"
            ? "flex h-7 items-center justify-center rounded-md border border-violet-500/40 bg-violet-500/10 px-2 text-violet-300"
            : "flex h-7 items-center justify-center rounded-md border border-app bg-tint-1 px-2 text-on-surface-variant transition hover:border-violet-500/30 hover:text-violet-300"
        }
        aria-label={feedback === "up" ? "Quitar pulgar arriba" : "Pulgar arriba"}
        aria-pressed={feedback === "up"}
      >
        <IconThumb size={11} />
      </button>
      <button
        type="button"
        onClick={() => setVote("down")}
        className={
          feedback === "down"
            ? "flex h-7 items-center justify-center rounded-md border border-error-crimson/40 bg-error-crimson/10 px-2 text-error-crimson"
            : "flex h-7 items-center justify-center rounded-md border border-app bg-tint-1 px-2 text-on-surface-variant transition hover:border-error-crimson/30 hover:text-error-crimson"
        }
        aria-label={feedback === "down" ? "Quitar pulgar abajo" : "Pulgar abajo"}
        aria-pressed={feedback === "down"}
      >
        <IconThumbDown size={11} />
      </button>
    </div>
  );
}
