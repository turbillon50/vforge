"use client";

import { useEffect, useRef, useState } from "react";
import { ChatStream } from "@/components/vforge/chat-stream";
import { Composer } from "@/components/vforge/composer";
import type { ChatMessageData } from "@/components/vforge/chat-message";

const SCOPE_STORAGE_KEY = "vforge_chat_scope"; // 'general' | projectId
const SESSION_PREFIX = "vforge_session_id_";

const WELCOME_GENERAL: ChatMessageData = {
  id: "welcome",
  role: "forge",
  content:
    "Hola Luis. Soy V — tu asociada digital. Estamos en modo general: tengo memoria persistente, conozco los 34 proyectos, el método vForge y los ADRs. Si quieres enfocar la conversación en un proyecto específico, escógelo del selector arriba. Si no, pregúntame lo que sea.",
};

function welcomeForProject(name: string): ChatMessageData {
  return {
    id: "welcome",
    role: "forge",
    content: `Conversación enfocada en **${name}**. Cualquier pregunta que hagas la voy a interpretar respecto a este proyecto a menos que cambies de tema explícitamente. ¿Qué quieres revisar de ${name}?`,
  };
}

function makeSessionId() {
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function toolDisplayName(name: string): string {
  switch (name) {
    case "github_list_repos":
      return "Listando repos de GitHub";
    case "github_get_repo":
      return "Cargando detalle del repo";
    case "github_list_commits":
      return "Cargando commits";
    case "github_read_file":
      return "Leyendo archivo del repo";
    case "vault_list_secrets":
      return "Listando secrets del Vault";
    case "memory_save":
      return "Guardando en memoria";
    case "vercel_list_projects":
      return "Listando proyectos de Vercel";
    case "vercel_get_project":
      return "Cargando proyecto de Vercel";
    case "vercel_create_project":
      return "Creando proyecto en Vercel";
    case "vercel_list_deployments":
      return "Listando deployments";
    case "vercel_get_deployment":
      return "Cargando deployment";
    case "vercel_trigger_deployment":
      return "Disparando deployment";
    case "vercel_set_env_var":
      return "Configurando env var";
    case "vercel_add_domain":
      return "Agregando dominio a Vercel";
    case "vercel_get_domain_config":
      return "Pidiendo config DNS a Vercel";
    case "namecom_list_domains":
      return "Listando dominios de Name.com";
    case "namecom_get_domain":
      return "Cargando dominio";
    case "namecom_list_records":
      return "Listando registros DNS";
    case "namecom_upsert_record":
      return "Configurando registro DNS";
    case "namecom_delete_record":
      return "Borrando registro DNS";
    default:
      return `Ejecutando ${name}`;
  }
}

function sessionKeyFor(scope: string) {
  return SESSION_PREFIX + scope;
}

interface PersistedTurn {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  created_at: string;
}

interface ProjectOption {
  id: string;
  name: string;
  category: string;
}

export default function ForgePage() {
  const [scope, setScope] = useState<string>("general");
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [messages, setMessages] = useState<ChatMessageData[]>([WELCOME_GENERAL]);
  const [streaming, setStreaming] = useState(false);
  const [hydrating, setHydrating] = useState(true);
  const [savingMemory, setSavingMemory] = useState(false);
  const sessionIdRef = useRef<string>("");

  // Load scope from storage and project list on first mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(SCOPE_STORAGE_KEY) ?? "general";
    setScope(saved);
    void fetch("/api/projects", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { projects: [] }))
      .then((d: { projects: ProjectOption[] }) => setProjects(d.projects))
      .catch(() => undefined);
  }, []);

  // Whenever scope changes, resolve its session id and rehydrate history.
  useEffect(() => {
    if (typeof window === "undefined" || !scope) return;
    localStorage.setItem(SCOPE_STORAGE_KEY, scope);
    let sid = localStorage.getItem(sessionKeyFor(scope));
    if (!sid) {
      sid = makeSessionId();
      localStorage.setItem(sessionKeyFor(scope), sid);
    }
    sessionIdRef.current = sid;

    setHydrating(true);
    void hydrate(sid);
  }, [scope]);

  async function hydrate(sessionId: string) {
    try {
      const res = await fetch(
        `/api/forge/conversations?sessionId=${encodeURIComponent(sessionId)}&limit=100`,
        { cache: "no-store" },
      );
      if (!res.ok) {
        setMessages([welcomeFor(scope)]);
        return;
      }
      const { turns } = (await res.json()) as { turns: PersistedTurn[] };
      if (turns.length > 0) {
        setMessages(
          turns.map((t) => ({
            id: t.id,
            role: t.role === "assistant" ? "forge" : "user",
            content: t.content,
          })),
        );
      } else {
        setMessages([welcomeFor(scope)]);
      }
    } catch {
      setMessages([welcomeFor(scope)]);
    } finally {
      setHydrating(false);
    }
  }

  function welcomeFor(s: string): ChatMessageData {
    if (s === "general") return WELCOME_GENERAL;
    const p = projects.find((x) => x.id === s);
    return welcomeForProject(p?.name ?? s);
  }

  function newSession() {
    // Fire-and-forget recap on the previous session before swapping in
    // a fresh sessionId. This is what gives V cross-session memory.
    const previousSessionId = sessionIdRef.current;
    if (previousSessionId) {
      void fetch("/api/forge/recap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: previousSessionId,
          projectId: scope === "general" ? null : scope,
        }),
        keepalive: true,
      }).catch(() => undefined);
    }
    const sid = makeSessionId();
    localStorage.setItem(sessionKeyFor(scope), sid);
    sessionIdRef.current = sid;
    setMessages([welcomeFor(scope)]);
  }

  async function saveMemoryNow() {
    if (!sessionIdRef.current || streaming) return;
    setSavingMemory(true);
    try {
      const res = await fetch("/api/forge/recap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          projectId: scope === "general" ? null : scope,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        title?: string;
        reason?: string;
      };
      if (data.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: `m_${Date.now()}`,
            role: "forge",
            content: `_💾 Memoria guardada: **${data.title}**. Estará disponible en futuras sesiones._`,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `m_${Date.now()}`,
            role: "forge",
            content: `_💾 ${data.reason ?? "no se guardó"}_`,
          },
        ]);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setMessages((prev) => [
        ...prev,
        {
          id: `m_${Date.now()}`,
          role: "forge",
          content: `_⚠ Error guardando memoria: ${message}_`,
        },
      ]);
    } finally {
      setSavingMemory(false);
    }
  }

  const handleSend = async (
    content: string,
    attachments?: { id: string; kind: string; label: string; meta: string }[],
  ) => {
    if (streaming) return;
    const attachmentNote =
      attachments && attachments.length > 0
        ? `\n\n📎 ${attachments.length} adjunto${attachments.length === 1 ? "" : "s"}: ${attachments.map((a) => a.label).join(", ")}`
        : "";
    const userTurn: ChatMessageData = {
      id: `u_${Date.now()}`,
      role: "user",
      content: content + attachmentNote,
    };
    const assistantId = `a_${Date.now()}`;
    const assistantTurn: ChatMessageData = {
      id: assistantId,
      role: "forge",
      content: "",
    };
    setMessages((prev) => [...prev, userTurn, assistantTurn]);
    setStreaming(true);

    // Build the Anthropic-compatible chat history (drop UI-only welcome)
    const history = [
      ...messages
        .filter((m) => m.id !== "welcome")
        .map((m) => ({
          role: m.role === "forge" ? ("assistant" as const) : ("user" as const),
          content: m.content,
        })),
      { role: "user" as const, content: userTurn.content },
    ];

    try {
      const res = await fetch("/api/forge/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history,
          sessionId: sessionIdRef.current,
          projectId: scope === "general" ? null : scope,
        }),
      });
      if (!res.ok || !res.body) {
        const err = await res.text();
        appendError(assistantId, `Error del servidor (${res.status}): ${err.slice(0, 200)}`);
        setStreaming(false);
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
            const evt = JSON.parse(line.slice(6)) as
              | { type: "text"; value: string }
              | { type: "tool_use_start"; id: string; name: string }
              | { type: "tool_use_result"; id: string; ok: boolean; summary: string }
              | { type: "done"; tokensIn: number; tokensOut: number; model: string }
              | { type: "error"; message: string };
            if (evt.type === "text") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: m.content + evt.value }
                    : m,
                ),
              );
            } else if (evt.type === "tool_use_start") {
              const marker = `\n\n_🔧 ${toolDisplayName(evt.name)}…_\n\n`;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: m.content + marker }
                    : m,
                ),
              );
            } else if (evt.type === "tool_use_result") {
              const icon = evt.ok ? "✓" : "⚠";
              const marker = `_${icon} ${evt.summary}_\n\n`;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: m.content + marker }
                    : m,
                ),
              );
            } else if (evt.type === "error") {
              appendError(assistantId, evt.message);
            }
          } catch {
            // skip malformed event
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      appendError(assistantId, `Error de red: ${message}`);
    } finally {
      setStreaming(false);
    }
  };

  function appendError(assistantId: string, msg: string) {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === assistantId
          ? { ...m, content: m.content || `⚠ ${msg}` }
          : m,
      ),
    );
  }

  const handleAction = (action: string) => {
    void handleSend(action.toLowerCase());
  };

  const projectsByCategory = projects.reduce<Record<string, ProjectOption[]>>(
    (acc, p) => {
      (acc[p.category] ||= []).push(p);
      return acc;
    },
    {},
  );

  return (
    <div className="flex flex-col h-full -mx-4 md:-mx-6 -mt-6 -mb-6">
      <header className="sticky top-0 z-10 bg-vf-bg border-b border-vf-border px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-lg font-semibold tracking-tight-vf text-vf-fg flex-shrink-0">
            V
          </h1>
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            disabled={streaming}
            className="bg-vf-bg-2 border border-vf-border-1 rounded-md px-2 py-1.5 text-sm text-vf-fg focus:outline-none focus:border-vf-border-2 max-w-[180px] truncate"
            title="Modo de conversación"
          >
            <option value="general">🌐 General</option>
            {(["produccion", "activo", "en_revision", "en_pausa", "archivo"] as const).map((cat) => {
              const items = projectsByCategory[cat] ?? [];
              if (items.length === 0) return null;
              return (
                <optgroup
                  key={cat}
                  label={
                    cat === "produccion" ? "🟢 Producción" :
                    cat === "activo" ? "🔵 Activo" :
                    cat === "en_revision" ? "🟡 En revisión" :
                    cat === "en_pausa" ? "⏸️ En pausa" : "📦 Archivo"
                  }
                >
                  {items.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </optgroup>
              );
            })}
          </select>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={saveMemoryNow}
            disabled={streaming || savingMemory || hydrating}
            className="text-xs text-vf-fg-2 hover:text-vf-fg transition-colors disabled:opacity-40"
            title="Guardar la sesión actual en la memoria persistente de V"
          >
            {savingMemory ? "Guardando…" : "💾 Memoria"}
          </button>
          <button
            type="button"
            onClick={newSession}
            className="text-xs text-vf-fg-2 hover:text-vf-fg transition-colors"
            title="Empezar una conversación nueva (guarda recap automáticamente)"
          >
            Nueva
          </button>
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full bg-vf-green ${streaming ? "" : "dot-live"}`}
            />
            <span className="text-sm text-vf-fg-1">
              {hydrating ? "Cargando…" : streaming ? "Pensando…" : "Listo"}
            </span>
          </div>
        </div>
      </header>

      <ChatStream messages={messages} onAction={handleAction} />

      <Composer onSend={handleSend} disabled={streaming || hydrating} />
    </div>
  );
}
