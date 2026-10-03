"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUp,
  Bot,
  Brain,
  Github,
  Loader2,
  Menu,
  Mic,
  Paperclip,
  Plug,
  Plus,
  Search,
  Triangle,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const starter: ChatMessage = {
  id: "starter",
  role: "assistant",
  content:
    "Cuéntame qué quieres construir. Puedo ayudarte a convertir una conversación, una idea o un cliente en una propuesta clara de app.",
};

const quickActions = [
  { id: "github", label: "GitHub", caption: "Repos", icon: Github },
  { id: "vercel", label: "Vercel", caption: "Deploys", icon: Triangle },
  { id: "mind", label: "Mind Context", caption: "Fuentes", icon: Brain },
  { id: "mcps", label: "MCPs", caption: "Fábrica", icon: Plug },
];

const menuItems = ["Nuevo chat", "Proyectos", "Marketplace", "Documentación"];

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getSessionId() {
  const key = "vf-public-chat-session";
  try {
    const current = localStorage.getItem(key);
    if (current) return current;
    const next = `guest-${makeId()}`;
    localStorage.setItem(key, next);
    return next;
  } catch {
    return `guest-${makeId()}`;
  }
}

function normalizeError(status: number) {
  if (status === 429) return "Demasiados mensajes seguidos. Espera un momento y seguimos.";
  if (status === 503) return "El chat no está disponible ahorita. Lo reviso y volvemos a intentar.";
  return "No pude responder bien. Intenta de nuevo.";
}

export function PublicVForgeChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([starter]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [connectorsOpen, setConnectorsOpen] = useState(false);
  const [sessionId, setSessionId] = useState("guest");
  const scrollerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setSessionId(getSessionId());
  }, []);

  useEffect(() => {
    scrollerRef.current?.scrollTo({
      top: scrollerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, busy]);

  const history = useMemo(
    () =>
      messages
        .filter((message) => message.id !== "starter")
        .slice(-12)
        .map(({ role, content }) => ({ role, content })),
    [messages],
  );

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    const userMessage: ChatMessage = {
      id: makeId(),
      role: "user",
      content: trimmed,
    };
    setMessages((current) => [...current, userMessage]);
    setInput("");
    setBusy(true);

    try {
      const response = await fetch("/api/public/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, history, session_id: sessionId }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        reply?: string;
      };
      if (!response.ok || !data.ok) throw new Error(normalizeError(response.status));

      setMessages((current) => [
        ...current,
        {
          id: makeId(),
          role: "assistant",
          content: data.reply || "Aquí estoy. Dime un poco más y lo armamos.",
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: makeId(),
          role: "assistant",
          content: error instanceof Error ? error.message : "No pude responder bien. Intenta de nuevo.",
        },
      ]);
    } finally {
      setBusy(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void send(input);
  }

  function handleAction(label: string) {
    const text =
      label === "Mind Context"
        ? "Quiero agregar fuentes reales para entrenar el contexto de mi app."
        : `Quiero revisar ${label} para este proyecto.`;
    void send(text);
  }

  function newChat() {
    setMessages([starter]);
    setInput("");
    setMenuOpen(false);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  return (
    <main className="vf-mobile-stable min-h-dvh overflow-hidden bg-[#080808] text-white">
      <div className="mx-auto flex h-dvh max-w-5xl flex-col">
        <header className="flex h-[76px] shrink-0 items-center justify-between px-4 pt-[env(safe-area-inset-top)] sm:px-6">
          <button
            type="button"
            aria-label="Abrir menú"
            onClick={() => setMenuOpen(true)}
            className="grid size-11 place-items-center rounded-full border border-white/12 bg-white/[0.03] text-white shadow-[0_10px_35px_rgba(0,0,0,.28)]"
          >
            <Menu className="size-5" />
          </button>

          <div className="flex min-w-0 flex-col items-center">
            <div className="flex items-center gap-3">
              <Triangle className="size-5 fill-white text-white" />
              <span className="text-[13px] font-medium uppercase tracking-[0.42em]">VFORGE</span>
            </div>
            <span className="mt-1 text-xs text-white/45">chat público</span>
          </div>

          <button
            type="button"
            aria-label="Conectores"
            onClick={() => setConnectorsOpen(true)}
            className="grid size-11 place-items-center rounded-full border border-white/12 bg-white/[0.03] text-white shadow-[0_10px_35px_rgba(0,0,0,.28)]"
          >
            <Plug className="size-5" />
          </button>
        </header>

        <section
          ref={scrollerRef}
          className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-2 sm:px-6"
          aria-label="Mensajes"
        >
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 pb-4">
            {messages.map((message) => (
              <article
                key={message.id}
                className={cn(
                  "flex gap-3",
                  message.role === "user" ? "justify-end" : "justify-start",
                )}
              >
                {message.role === "assistant" ? (
                  <div className="mt-1 grid size-8 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-white/80">
                    <Bot className="size-4" />
                  </div>
                ) : null}
                <div
                  className={cn(
                    "max-w-[86%] whitespace-pre-wrap rounded-[24px] px-4 py-3 text-[15px] leading-6 shadow-[0_18px_55px_rgba(0,0,0,.25)]",
                    message.role === "user"
                      ? "bg-white text-black"
                      : "border border-white/10 bg-white/[0.055] text-white/88",
                  )}
                >
                  {message.content}
                </div>
              </article>
            ))}

            {busy ? (
              <div className="flex items-center gap-3 text-sm text-white/55">
                <div className="grid size-8 place-items-center rounded-full border border-white/10 bg-white/[0.04]">
                  <Loader2 className="size-4 animate-spin" />
                </div>
                Pensando...
              </div>
            ) : null}
          </div>
        </section>

        <footer className="shrink-0 border-t border-white/8 bg-[#080808]/92 px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl sm:px-6">
          <div className="mx-auto w-full max-w-3xl">
            <div className="mb-3 grid grid-cols-4 gap-2">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.id}
                    type="button"
                    onClick={() => handleAction(action.label)}
                    className="relative flex h-[74px] min-w-0 flex-col items-center justify-center gap-1 rounded-[22px] border border-white/10 bg-white/[0.045] px-1 text-center shadow-[0_15px_40px_rgba(0,0,0,.22)] transition active:scale-[.98]"
                  >
                    <Icon className="size-5 text-white" />
                    <span className="max-w-full truncate text-[11px] font-semibold leading-none text-white">
                      {action.label}
                    </span>
                    <span className="max-w-full truncate text-[10px] leading-none text-white/45">
                      {action.caption}
                    </span>
                    <span className="absolute bottom-2 right-3 size-1.5 rounded-full bg-[#FF5A1F]" />
                  </button>
                );
              })}
            </div>

            <form onSubmit={handleSubmit} className="flex items-end gap-2">
              <button
                type="button"
                aria-label="Agregar"
                className="grid size-12 shrink-0 place-items-center rounded-full bg-[#FF5A1F] text-white shadow-[0_18px_45px_rgba(255,90,31,.34)]"
              >
                <Plus className="size-6" />
              </button>

              <div className="flex min-h-14 flex-1 items-end rounded-[28px] border border-white/10 bg-white/[0.055] px-4 py-2 shadow-[0_16px_45px_rgba(0,0,0,.22)]">
                <button type="button" aria-label="Adjuntar" className="mb-2 mr-2 text-white/55">
                  <Paperclip className="size-5" />
                </button>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void send(input);
                    }
                  }}
                  rows={1}
                  placeholder="Pregunta lo que quieras..."
                  className="max-h-32 min-h-9 flex-1 resize-none bg-transparent py-2 text-[16px] leading-5 text-white placeholder:text-white/32"
                />
              </div>

              <button
                type="button"
                aria-label="Voz"
                className="grid size-12 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.055] text-white"
              >
                <Mic className="size-5" />
              </button>
              <button
                type="submit"
                aria-label="Enviar"
                disabled={busy || !input.trim()}
                className="grid size-12 shrink-0 place-items-center rounded-full bg-white text-black disabled:bg-white/20 disabled:text-white/35"
              >
                {busy ? <Loader2 className="size-5 animate-spin" /> : <ArrowUp className="size-5" />}
              </button>
            </form>
          </div>
        </footer>
      </div>

      {menuOpen ? (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm" onClick={() => setMenuOpen(false)}>
          <aside
            className="h-full w-[86vw] max-w-[360px] border-r border-white/10 bg-[#0b0b0b] p-5 pt-[max(24px,env(safe-area-inset-top))] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-8 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Triangle className="size-5 fill-white text-white" />
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.36em]">VFORGE</div>
                  <div className="mt-1 text-xs text-white/45">Chat público</div>
                </div>
              </div>
              <button type="button" aria-label="Cerrar" onClick={() => setMenuOpen(false)} className="grid size-10 place-items-center rounded-full border border-white/10">
                <X className="size-4" />
              </button>
            </div>

            <nav className="flex flex-col gap-3">
              {menuItems.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={item === "Nuevo chat" ? newChat : undefined}
                  className="flex min-h-14 items-center gap-3 rounded-[18px] border border-white/10 bg-white/[0.035] px-4 text-left text-sm text-white/86"
                >
                  {item === "Marketplace" ? <Search className="size-4" /> : <Plus className="size-4" />}
                  {item}
                </button>
              ))}
            </nav>
          </aside>
        </div>
      ) : null}

      {connectorsOpen ? (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm" onClick={() => setConnectorsOpen(false)}>
          <aside
            className="ml-auto h-full w-[86vw] max-w-[380px] border-l border-white/10 bg-[#0b0b0b] p-5 pt-[max(24px,env(safe-area-inset-top))] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Conectores</h2>
                <p className="mt-1 text-sm text-white/48">Disponibles después, sin cortar este chat.</p>
              </div>
              <button type="button" aria-label="Cerrar" onClick={() => setConnectorsOpen(false)} className="grid size-10 place-items-center rounded-full border border-white/10">
                <X className="size-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.id}
                    type="button"
                    onClick={() => {
                      setConnectorsOpen(false);
                      handleAction(action.label);
                    }}
                    className="flex min-h-20 items-center gap-4 rounded-[22px] border border-white/10 bg-white/[0.04] px-4 text-left"
                  >
                    <span className="grid size-12 place-items-center rounded-full bg-white text-black">
                      <Icon className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-white">{action.label}</span>
                      <span className="mt-1 block text-sm text-white/48">{action.caption}</span>
                    </span>
                    <span className="size-2 rounded-full bg-[#FF5A1F]" />
                  </button>
                );
              })}
            </div>
          </aside>
        </div>
      ) : null}
    </main>
  );
}
