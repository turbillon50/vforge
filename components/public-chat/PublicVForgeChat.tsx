"use client";

import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUp,
  ChevronDown,
  ExternalLink,
  Loader2,
  Menu,
  Mic,
  Paperclip,
  Plus,
  Search,
  Settings2,
  UserRound,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CastoresFloatingMenu, type FloatingMenuItem } from "./CastoresFloatingMenu";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type ConnectorId = "github" | "vercel" | "mind" | "momentum";

type Connector = {
  id: ConnectorId;
  label: string;
  caption: string;
  logo?: string;
  alt: string;
  prompt: string;
  summary: string;
  logoScale?: string;
  compactLogo?: boolean;
};

const connectors: Connector[] = [
  {
    id: "github",
    label: "GitHub",
    caption: "Repos",
    logo: "/logos/github.svg",
    alt: "GitHub",
    prompt: "Quiero preparar o revisar el repositorio de GitHub de este proyecto.",
    summary: "Repositorios, ramas y entregables listos para construir.",
    logoScale: "h-[56%] w-[56%]",
  },
  {
    id: "vercel",
    label: "Vercel",
    caption: "Deploys",
    logo: "/logos/vercel.svg",
    alt: "Vercel",
    prompt: "Quiero preparar el deploy de Vercel de este proyecto.",
    summary: "Deploys, dominios y estado de producción sin salir del chat.",
    logoScale: "h-[52%] w-[52%]",
  },
  {
    id: "mind",
    label: "MindContextIA",
    caption: "Fuentes",
    logo: "/logos/mindcontext-beforge.svg",
    alt: "MindContextIA",
    prompt: "Quiero agregar fuentes reales al MindContextIA de este proyecto.",
    summary: "Fuentes, memoria y modelos para que el contexto no se pierda.",
    logoScale: "h-full w-full",
  },
  {
    id: "momentum",
    label: "Momentum",
    caption: "Anuncios",
    logo: "/logos/momentum-bw.svg",
    alt: "Momentum",
    prompt: "Quiero preparar este proyecto para publicarlo o promocionarlo en Momentum.",
    summary: "Promoción, anuncios y salida comercial cuando el proyecto esté listo.",
    logoScale: "h-full w-full",
  },
];

const sideMenuItems = ["Nuevo chat", "Proyecto activo", "Chats", "Marketplace"];

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
  if (status === 429) return "Van muchos mensajes seguidos. Dame un momento y seguimos.";
  if (status === 503) return "El chat no respondió ahorita. Lo intento de nuevo en cuanto vuelva la conexión.";
  return "No pude responder bien. Intenta otra vez.";
}

function ConnectorLogo({ connector, className = "" }: { connector: Connector; className?: string }) {
  if (!connector.logo) {
    return (
      <span className={cn("grid place-items-center overflow-hidden rounded-2xl bg-[#f4f0ff] text-[#4d38ff] ring-1 ring-[#6f5cff]/25", className)}>
        <span className="text-[13px] font-black leading-none tracking-[-0.08em]" aria-label={connector.alt}>
          IA
        </span>
      </span>
    );
  }

  return (
    <span className={cn("grid place-items-center overflow-hidden rounded-2xl bg-[#f8f8f5] ring-1 ring-white/70", className)}>
      <img src={connector.logo} alt={connector.alt} className={cn("object-contain", connector.logoScale || "h-[58%] w-[58%]")} />
    </span>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <article className={cn("flex w-full gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="mt-1 grid size-8 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.06]">
          <div className="flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-white/80" />
            <span className="size-1.5 rounded-full bg-white/50" />
          </div>
        </div>
      )}
      <div
        className={cn(
          "max-w-[88%] whitespace-pre-wrap rounded-[26px] px-4 py-3 text-[15px] leading-6 shadow-[0_18px_55px_rgba(0,0,0,.28)]",
          isUser
            ? "bg-white text-black"
            : "border border-white/10 bg-white/[0.06] text-white/90 backdrop-blur-xl",
        )}
      >
        {message.content}
      </div>
    </article>
  );
}

export function PublicVForgeChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [connectorsOpen, setConnectorsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [activeConnector, setActiveConnector] = useState<ConnectorId | null>(null);
  const [introSeen, setIntroSeen] = useState(false);
  const [sessionId, setSessionId] = useState("guest");
  const scrollerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setSessionId(getSessionId());
    try {
      setIntroSeen(localStorage.getItem("vf-public-chat-intro-seen") === "1");
    } catch {
      setIntroSeen(false);
    }
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
        .slice(-12)
        .map(({ role, content }) => ({ role, content })),
    [messages],
  );

  const widgetItems = useMemo<FloatingMenuItem[]>(
    () =>
      connectors.map((connector) => ({
        href: `vf://${connector.id}`,
        label: connector.label,
        desc: connector.caption,
        icon: <ConnectorLogo connector={connector} className="size-9 rounded-xl" />,
      })),
    [],
  );

  const showConnectorDock = messages.length === 0 && !introSeen;

  function markIntroSeen() {
    setIntroSeen(true);
    try {
      localStorage.setItem("vf-public-chat-intro-seen", "1");
    } catch {
      // La UI no depende de localStorage; solo evita repetir el onboarding.
    }
  }

  function resizeTextarea(target = inputRef.current) {
    if (!target) return;
    target.style.height = "auto";
    target.style.height = `${Math.min(target.scrollHeight, 156)}px`;
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    markIntroSeen();

    const userMessage: ChatMessage = {
      id: makeId(),
      role: "user",
      content: trimmed,
    };
    setMessages((current) => [...current, userMessage]);
    setInput("");
    setBusy(true);
    requestAnimationFrame(() => resizeTextarea());

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
          content: data.reply || "Aquí estoy. Dime un poco más y lo aterrizamos.",
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: makeId(),
          role: "assistant",
          content: error instanceof Error ? error.message : "No pude responder bien. Intenta otra vez.",
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

  function handleTextareaKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void send(input);
    }
  }

  function openConnector(connectorId: ConnectorId) {
    markIntroSeen();
    setActiveConnector(connectorId);
    setConnectorsOpen(true);
  }

  function handleConnectorPrompt(connector: Connector) {
    setConnectorsOpen(false);
    setActiveConnector(connector.id);
    void send(connector.prompt);
  }

  function handleWidgetNavigate(href: string) {
    const id = href.replace("vf://", "") as ConnectorId;
    if (connectors.some((connector) => connector.id === id)) {
      openConnector(id);
    }
  }

  function newChat() {
    setMessages([]);
    setInput("");
    setBusy(false);
    setMenuOpen(false);
    setConnectorsOpen(false);
    requestAnimationFrame(() => {
      resizeTextarea();
      inputRef.current?.focus();
    });
  }

  const activeConnectorData = connectors.find((connector) => connector.id === activeConnector) || connectors[0];

  return (
    <main className="vf-mobile-stable relative h-dvh overflow-hidden bg-[#050505] text-white">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#111_0%,#050505_44%,#000_100%)]" />
      <div className="absolute inset-x-0 top-0 h-36 bg-[linear-gradient(180deg,rgba(255,255,255,.075),transparent)]" />

      <div className="relative z-10 mx-auto flex h-dvh max-w-5xl flex-col">
        <header className="flex h-[82px] shrink-0 items-center justify-between gap-3 px-4 pt-[env(safe-area-inset-top)] sm:px-6">
          <button
            type="button"
            aria-label="Abrir menú de chats"
            onClick={() => setMenuOpen(true)}
            className="grid size-12 shrink-0 place-items-center rounded-full border border-white/15 bg-white/[0.045] text-white shadow-[0_18px_45px_rgba(0,0,0,.36)] backdrop-blur-xl transition active:scale-95"
          >
            <Menu className="size-5" />
          </button>

          <div className="flex min-w-0 flex-1 flex-col items-center">
            <span className="max-w-full truncate text-[13px] font-semibold uppercase tracking-[0.44em] text-white/90">
              VFORGE
            </span>
            <span className="mt-1 max-w-full truncate text-xs text-white/40">chat profesional</span>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              aria-label="Abrir conectores"
              onClick={() => setConnectorsOpen(true)}
              className="grid size-12 place-items-center rounded-full border border-white/15 bg-white/[0.045] text-white shadow-[0_18px_45px_rgba(0,0,0,.36)] backdrop-blur-xl transition active:scale-95"
            >
              <Settings2 className="size-5" />
            </button>
            <button
              type="button"
              aria-label="Abrir perfil"
              onClick={() => setProfileOpen(true)}
              className="grid size-12 place-items-center rounded-full border border-white/20 bg-white text-[13px] font-semibold text-black shadow-[0_18px_45px_rgba(0,0,0,.36)] transition active:scale-95"
            >
              TT
            </button>
          </div>
        </header>

        <section
          ref={scrollerRef}
          className="min-h-0 flex-1 overflow-y-auto px-4 pt-2 [-ms-overflow-style:none] [scrollbar-width:none] sm:px-6 [&::-webkit-scrollbar]:hidden"
          aria-label="Conversación"
          style={{ paddingBottom: showConnectorDock ? 246 : 170 }}
        >
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
            {messages.length === 0 ? (
              <div className="flex min-h-[calc(100dvh-300px)] flex-col items-center justify-center text-center">
                <div>
                  <div role="heading" aria-level={1} className="text-[31px] font-semibold leading-[1.08] tracking-[-0.03em] text-white">
                    Control de tu software.
                    <br />
                    Control de tu empresa.
                  </div>
                  <p className="mx-auto mt-5 max-w-[31rem] text-[15px] leading-6 text-white/65">
                    Hola. Cuéntame qué quieres construir, conectar o revisar; el chat conserva las manos
                    mientras abres repos, deploys, fuentes y Momentum.
                  </p>
                </div>
              </div>
            ) : (
              messages.map((message) => <MessageBubble key={message.id} message={message} />)
            )}

            {busy ? (
              <div className="flex items-center gap-3 text-sm text-white/60">
                <div className="grid size-8 place-items-center rounded-full border border-white/10 bg-white/[0.06]">
                  <Loader2 className="size-4 animate-spin" />
                </div>
                Pensando...
              </div>
            ) : null}
          </div>
        </section>

        <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#050505]/90 px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 shadow-[0_-24px_70px_rgba(0,0,0,.5)] backdrop-blur-2xl sm:px-6">
          <div className="mx-auto w-full max-w-3xl">
            {showConnectorDock ? (
              <div className="mb-3 grid grid-cols-4 gap-2">
                {connectors.map((connector) => (
                  <button
                    key={connector.id}
                    type="button"
                    aria-label={`Abrir ${connector.label}`}
                    onClick={() => openConnector(connector.id)}
                    className="group relative flex h-[76px] min-w-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-[24px] border border-white/15 bg-[linear-gradient(180deg,rgba(255,255,255,.125),rgba(255,255,255,.052))] px-1 text-center shadow-[inset_0_1px_0_rgba(255,255,255,.14),0_18px_42px_rgba(0,0,0,.34)] transition active:scale-[.97]"
                  >
                    <div className="pointer-events-none absolute inset-x-2 top-1 h-5 rounded-full bg-white/10 blur-md" />
                    <ConnectorLogo connector={connector} className="relative size-8 rounded-xl shadow-[0_8px_18px_rgba(0,0,0,.24)]" />
                    <span
                      className={cn(
                        "relative max-w-full truncate font-semibold leading-none text-white",
                        connector.id === "mind" ? "text-[10px] tracking-[-0.04em]" : "text-[11px]",
                      )}
                    >
                      {connector.label}
                    </span>
                    <span className="relative max-w-full truncate text-[10px] leading-none text-white/40">
                      {connector.caption}
                    </span>
                    <span className="absolute bottom-2 right-3 size-1.5 rounded-full bg-white/70 shadow-[0_0_10px_rgba(255,255,255,.55)]" />
                  </button>
                ))}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="rounded-[30px] border border-white/12 bg-[#1c1c1c] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,.08),0_18px_52px_rgba(0,0,0,.45)]">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(event) => {
                  setInput(event.target.value);
                  resizeTextarea(event.currentTarget);
                }}
                onKeyDown={handleTextareaKeyDown}
                rows={1}
                placeholder="Pregunta lo que quieras..."
                className="block max-h-[156px] min-h-12 w-full resize-none overflow-y-auto bg-transparent px-3 py-3 text-[16px] leading-6 text-white placeholder:text-white/35"
              />

              <div className="mt-1 flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <button
                    type="button"
                    aria-label="Modo de búsqueda"
                    className="flex h-10 shrink-0 items-center gap-2 rounded-full border border-white/12 bg-black px-3 text-sm font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,.08)] transition active:scale-95"
                  >
                    <Search className="size-4" />
                    Quick
                    <ChevronDown className="size-3 text-white/60" />
                  </button>
                  <button type="button" aria-label="Adjuntar archivo" className="grid size-10 shrink-0 place-items-center rounded-full text-white/60 transition hover:bg-white/[0.06]">
                    <Paperclip className="size-5" />
                  </button>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <button type="button" aria-label="Voz" className="grid size-10 place-items-center rounded-full border border-white/10 bg-white/[0.055] text-white transition active:scale-95">
                    <Mic className="size-5" />
                  </button>
                  <button
                    type="submit"
                    aria-label="Enviar"
                    disabled={busy || !input.trim()}
                    className="grid size-10 place-items-center rounded-full bg-white text-black transition active:scale-95 disabled:bg-white/[0.16] disabled:text-white/35"
                  >
                    {busy ? <Loader2 className="size-5 animate-spin" /> : <ArrowUp className="size-5" />}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </footer>
      </div>

      {!showConnectorDock ? (
        <CastoresFloatingMenu
          items={widgetItems}
          activeHref={activeConnector ? `vf://${activeConnector}` : undefined}
          onNavigate={handleWidgetNavigate}
          accent="#ffffff"
          bottomOffset="calc(env(safe-area-inset-bottom) + 118px)"
        />
      ) : null}

      {menuOpen ? (
        <div className="fixed inset-0 z-50 bg-black/58 backdrop-blur-sm" onClick={() => setMenuOpen(false)}>
          <aside
            className="h-full w-[88vw] max-w-[378px] border-r border-white/10 bg-[#080808] p-5 pt-[max(24px,env(safe-area-inset-top))] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-8 flex items-center justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="min-w-0">
                  <div className="truncate text-xs font-semibold uppercase tracking-[0.36em] text-white">VFORGE</div>
                  <div className="mt-1 truncate text-xs text-white/50">Chat profesional</div>
                </div>
              </div>
              <button type="button" aria-label="Cerrar" onClick={() => setMenuOpen(false)} className="grid size-10 place-items-center rounded-full border border-white/10 text-white">
                <X className="size-4" />
              </button>
            </div>

            <nav className="flex flex-col gap-3">
              {sideMenuItems.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={item === "Nuevo chat" ? newChat : undefined}
                  className="flex min-h-14 min-w-0 items-center gap-3 rounded-[18px] border border-white/10 bg-white/[0.035] px-4 text-left text-sm text-white/90 transition active:scale-[.99]"
                >
                  {item === "Marketplace" ? <Search className="size-4 shrink-0" /> : <Plus className="size-4 shrink-0" />}
                  <span className="truncate">{item}</span>
                </button>
              ))}
            </nav>
          </aside>
        </div>
      ) : null}

      {connectorsOpen ? (
        <div className="fixed inset-0 z-50 bg-black/58 backdrop-blur-sm" onClick={() => setConnectorsOpen(false)}>
          <aside
            className="ml-auto h-full w-[90vw] max-w-[430px] overflow-y-auto border-l border-white/10 bg-[#080808] p-5 pt-[max(24px,env(safe-area-inset-top))] shadow-2xl [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div role="heading" aria-level={2} className="truncate text-lg font-semibold text-white">Conectores</div>
                <p className="mt-1 text-sm text-white/50">Se abren sin quitarte el compose ni cortar el chat.</p>
              </div>
              <button type="button" aria-label="Cerrar" onClick={() => setConnectorsOpen(false)} className="grid size-10 shrink-0 place-items-center rounded-full border border-white/10 text-white">
                <X className="size-4" />
              </button>
            </div>

            <div className="mb-5 rounded-[24px] border border-white/10 bg-white/[0.045] p-4">
              <div className="flex items-center gap-3">
                <ConnectorLogo connector={activeConnectorData} className="size-12" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{activeConnectorData.label}</p>
                  <p className="mt-1 text-sm leading-5 text-white/50">{activeConnectorData.summary}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleConnectorPrompt(activeConnectorData)}
                className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white text-sm font-semibold text-black transition active:scale-[.99]"
              >
                Llevarlo al chat
                <ExternalLink className="size-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {connectors.map((connector) => (
                <button
                  key={connector.id}
                  type="button"
                  onClick={() => setActiveConnector(connector.id)}
                  className={cn(
                    "flex min-h-20 min-w-0 items-center gap-4 rounded-[22px] border px-4 text-left transition active:scale-[.99]",
                    activeConnector === connector.id
                      ? "border-white/25 bg-white/[0.10]"
                      : "border-white/10 bg-white/[0.04]",
                  )}
                >
                  <ConnectorLogo connector={connector} className="size-12 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-white">{connector.label}</span>
                    <span className="mt-1 block truncate text-sm text-white/50">{connector.caption}</span>
                  </span>
                  <span className="size-2 shrink-0 rounded-full bg-white/60" />
                </button>
              ))}
            </div>
          </aside>
        </div>
      ) : null}

      {profileOpen ? (
        <div className="fixed inset-0 z-50 bg-black/58 backdrop-blur-sm" onClick={() => setProfileOpen(false)}>
          <aside
            className="ml-auto h-full w-[86vw] max-w-[360px] border-l border-white/10 bg-[#080808] p-5 pt-[max(24px,env(safe-area-inset-top))] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid size-12 shrink-0 place-items-center rounded-full bg-white text-sm font-semibold text-black">
                  TT
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-white">Cuenta VForge</p>
                  <p className="mt-1 truncate text-sm text-white/50">Entrar no corta el chat</p>
                </div>
              </div>
              <button type="button" aria-label="Cerrar" onClick={() => setProfileOpen(false)} className="grid size-10 place-items-center rounded-full border border-white/10 text-white">
                <X className="size-4" />
              </button>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/[0.045] p-4">
              <div className="grid size-12 place-items-center rounded-full border border-white/10 bg-white/[0.07] text-white/80">
                <UserRound className="size-5" />
              </div>
              <p className="mt-4 text-sm leading-6 text-white/60">
                Puedes conversar sin registro. Cuando toque conectar pagos, proyectos privados o deploys,
                esta zona abre el acceso de cuenta.
              </p>
              <a
                href="/sign-in?redirect_url=/app/chat"
                className="mt-4 flex h-12 items-center justify-center rounded-full bg-white text-sm font-semibold text-black"
              >
                Entrar
              </a>
            </div>
          </aside>
        </div>
      ) : null}
    </main>
  );
}
