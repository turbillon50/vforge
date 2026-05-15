"use client";

import { useEffect, useRef, useState } from "react";
import { ChatStream } from "@/components/vforge/chat-stream";
import { Composer, type ComposerAttachment } from "@/components/vforge/composer";
import type { ChatMessageData } from "@/components/vforge/chat-message";
import { ProjectSwitcher } from "@/components/vforge/project-switcher";

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

function makeSessionId(scope?: string) {
  const safeScope = (scope ?? "general")
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .slice(0, 40)
    .toLowerCase() || "general";
  const rand =
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  return `s_${safeScope}_${rand}`;
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
    case "project_secret_save":
      return "Guardando secret del proyecto";
    case "project_secret_list":
      return "Listando secrets del proyecto";
    case "project_secret_delete":
      return "Borrando secret del proyecto";
    case "projects_sync":
      return "Sincronizando proyectos (Vercel + GitHub)";

    // GitHub write (PR #27)
    case "github_create_file":
      return "Creando archivo en el repo";
    case "github_update_file":
      return "Actualizando archivo del repo";
    case "github_delete_file":
      return "Borrando archivo del repo";
    case "github_create_branch":
      return "Creando rama en el repo";
    case "github_create_pull_request":
      return "Abriendo Pull Request";

    // GitHub read extra (PR #32)
    case "github_list_directory":
      return "Explorando carpeta del repo";
    case "github_search_code":
      return "Buscando código en el repo";
    case "github_list_pull_requests":
      return "Listando Pull Requests";

    // Routing + cost observability (PR #28)
    case "model_recommend":
      return "Eligiendo modelo óptimo";
    case "forge_cost_report":
      return "Calculando gasto del mes";
    case "openrouter_query":
      return "Consultando OpenRouter";

    // Skills (M16)
    case "skill_search":
      return "Buscando skill aplicable";
    case "skill_install":
      return "Instalando skill";

    // Subagents (M18)
    case "spawn_subagent":
      return "Lanzando subagente en paralelo";
    case "list_subagent_roles":
      return "Revisando roles de subagente";

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
  const [newProjectName, setNewProjectName] = useState("");
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [creatingProject, setCreatingProject] = useState(false);

  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [messages, setMessages] = useState<ChatMessageData[]>([WELCOME_GENERAL]);
  const [streaming, setStreaming] = useState(false);
  const [hydrating, setHydrating] = useState(true);
  const [savingMemory, setSavingMemory] = useState(false);
  /**
   * Most recent tool V is running. Set on `tool_use_start`, cleared on
   * matching `tool_use_result` (or when the turn ends). Surfaced as a
   * live status strip above the composer so Luis can see what V is
   * doing without scrolling the message inline.
   */
  const [currentTool, setCurrentTool] = useState<string | null>(null);
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

  // Whenever scope changes, resolve its session id from the SERVER and
  // rehydrate history. Server-side resolution is what lets phone +
  // computer share the same conversation. localStorage is kept as an
  // immediate-availability cache (avoids a flash of "Cargando" on cold
  // navigation), but the server's answer wins.
  useEffect(() => {
    if (typeof window === "undefined" || !scope) return;
    localStorage.setItem(SCOPE_STORAGE_KEY, scope);

    let cancelled = false;

    const cached = localStorage.getItem(sessionKeyFor(scope));
    if (cached) {
      sessionIdRef.current = cached;
    }

    setHydrating(true);
    void (async () => {
      let sid: string;
      try {
        const res = await fetch(
          `/api/forge/active-session?scope=${encodeURIComponent(scope)}`,
          { cache: "no-store" },
        );
        if (!res.ok) throw new Error(`active-session ${res.status}`);
        const data = (await res.json()) as { sessionId: string };
        sid = data.sessionId;
      } catch {
        // Server unreachable → fall back to local-only id (offline mode).
        sid = cached ?? makeSessionId(scope);
      }
      if (cancelled) return;
      localStorage.setItem(sessionKeyFor(scope), sid);
      sessionIdRef.current = sid;
      await hydrate(sid);
    })();

    return () => {
      cancelled = true;
    };
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

  /**
   * Cross-device sync (poor man's realtime).
   * Polls /api/forge/conversations every 5s while the tab is visible
   * and we're NOT currently streaming locally (would overwrite the
   * in-flight turn). When the server has more persisted turns than we
   * have locally, we re-render from server. This makes phone and
   * laptop converge to the same conversation when both are open.
   *
   * Upgrade path: SSE 'conversation_updated' event from the server
   * (M9.5 with Trigger.dev), or Liveblocks rooms (M13).
   */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const POLL_MS = 5000;
    let cancelled = false;

    async function poll() {
      if (cancelled) return;
      if (streaming || hydrating) return;
      if (document.visibilityState !== "visible") return;
      const sid = sessionIdRef.current;
      if (!sid) return;
      try {
        const res = await fetch(
          `/api/forge/conversations?sessionId=${encodeURIComponent(sid)}&limit=100`,
          { cache: "no-store" },
        );
        if (!res.ok) return;
        const { turns } = (await res.json()) as { turns: PersistedTurn[] };
        const localPersistedCount = messages.filter(
          (m) => m.id !== "welcome",
        ).length;
        if (turns.length > localPersistedCount) {
          setMessages(
            turns.map((t) => ({
              id: t.id,
              role: t.role === "assistant" ? "forge" : "user",
              content: t.content,
            })),
          );
        }
      } catch {
        /* network blip — try again next tick */
      }
    }

    const id = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [streaming, hydrating, messages]);

  async function newSession() {
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
    let sid: string;
    try {
      const res = await fetch("/api/forge/active-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope }),
      });
      const data = (await res.json()) as { sessionId: string };
      sid = data.sessionId;
    } catch {
      sid = makeSessionId(scope);
    }
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
    attachments?: ComposerAttachment[],
  ) => {
    if (streaming) return;
    const imageAttachments = (attachments ?? []).filter(
      (a) => a.kind === "image" && a.dataUrl,
    );
    const otherAttachments = (attachments ?? []).filter(
      (a) => a.kind !== "image",
    );
    const attachmentNote =
      otherAttachments.length > 0
        ? `\n\n📎 ${otherAttachments.length} adjunto${otherAttachments.length === 1 ? "" : "s"}: ${otherAttachments.map((a) => a.label).join(", ")}`
        : "";
    const userTurn: ChatMessageData = {
      id: `u_${Date.now()}`,
      role: "user",
      content: content + attachmentNote,
      attachments: imageAttachments.map((a) => ({
        kind: "image",
        src: a.dataUrl ?? a.previewUrl ?? "",
        label: a.label,
      })),
    };
    const assistantId = `a_${Date.now()}`;
    const assistantTurn: ChatMessageData = {
      id: assistantId,
      role: "forge",
      content: "",
    };
    setMessages((prev) => [...prev, userTurn, assistantTurn]);
    setStreaming(true);

    // Build the Anthropic-compatible chat history (drop UI-only welcome).
    // Past turns are sent as plain text (no image replay — keeps tokens
    // sane). Only THIS turn includes the image blocks.
    const historyText = messages
      .filter((m) => m.id !== "welcome")
      .map((m) => ({
        role: m.role === "forge" ? ("assistant" as const) : ("user" as const),
        content: m.content,
      }));

    type StructuredBlock =
      | { type: "text"; text: string }
      | {
          type: "image";
          source: { type: "base64"; media_type: string; data: string };
        };

    const currentTurn = imageAttachments.length > 0
      ? {
          role: "user" as const,
          content: [
            ...imageAttachments.map((att): StructuredBlock => {
              const dataUrl = att.dataUrl as string;
              const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
              return {
                type: "image" as const,
                source: {
                  type: "base64" as const,
                  media_type: m?.[1] ?? att.mediaType ?? "image/jpeg",
                  data: m?.[2] ?? "",
                },
              };
            }),
            ...(content || attachmentNote
              ? [
                  {
                    type: "text" as const,
                    text: content + attachmentNote,
                  },
                ]
              : []),
          ] as StructuredBlock[],
        }
      : {
          role: "user" as const,
          content: userTurn.content,
        };

    const history = [...historyText, currentTurn];

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
              setCurrentTool(evt.name);
              // Push a new step (loading) onto the assistant message
              // instead of inlining the marker into the content. The
              // ChatMessage component renders steps with explicit icons
              // (loading orb, ✓ done, ⚠ failed).
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? {
                        ...m,
                        steps: [
                          ...(m.steps ?? []),
                          {
                            text: toolDisplayName(evt.name),
                            status: "loading",
                          },
                        ],
                      }
                    : m,
                ),
              );
            } else if (evt.type === "tool_use_result") {
              setCurrentTool(null);
              // Mark the most recent loading step as done/failed and
              // surface the summary returned by the tool.
              setMessages((prev) =>
                prev.map((m) => {
                  if (m.id !== assistantId) return m;
                  const steps = [...(m.steps ?? [])];
                  for (let i = steps.length - 1; i >= 0; i -= 1) {
                    if (steps[i].status === "loading") {
                      steps[i] = {
                        text: `${steps[i].text} — ${evt.summary}`,
                        status: evt.ok ? "done" : "failed",
                      };
                      break;
                    }
                  }
                  return { ...m, steps };
                }),
              );
            } else if (evt.type === "error") {
              setCurrentTool(null);
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
      setCurrentTool(null);
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

  async function createNewProject() {
    if (!newProjectName.trim()) return;
    try {
      setCreatingProject(true);
      const res = await fetch("/api/forge/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newProjectName }),
      });
      if (res.ok) {
        const project = await res.json();
        setScope(project.id);
        setNewProjectName("");
        setShowNewProjectModal(false);
      }
    } catch (err) {
      console.error("Failed to create project:", err);
    } finally {
      setCreatingProject(false);
    }
  }

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
      <header className="sticky top-0 z-10 bg-vf-bg border-b border-vf-border px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <h1 className="text-xl font-semibold text-vf-fg flex-shrink-0">
            V
          </h1>
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            disabled={streaming}
            className="bg-vf-bg-2 border border-vf-border rounded-md px-3 py-2 text-sm text-vf-fg focus:outline-none focus:border-vf-green focus:ring-1 focus:ring-vf-green/20 max-w-xs truncate transition-colors"
            title="Scope de conversación"
          >
            <option value="general">General</option>
            {(["produccion", "activo", "en_revision", "en_pausa", "archivo"] as const).map((cat) => {
              const items = projectsByCategory[cat] ?? [];
              if (items.length === 0) return null;
              return (
                <optgroup
                  key={cat}
                  label={
                    cat === "produccion" ? "Producción" :
                    cat === "activo" ? "Activo" :
                    cat === "en_revision" ? "En revisión" :
                    cat === "en_pausa" ? "En pausa" : "Archivo"
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
        <div className="flex items-center gap-6 flex-shrink-0">
          <button
            type="button"
            onClick={saveMemoryNow}
            disabled={streaming || savingMemory || hydrating}
            className="text-xs font-medium text-vf-fg-1 hover:text-vf-fg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Guardar sesión en memoria persistente"
          >
            {savingMemory ? "Guardando…" : "Memoria"}
          </button>
          <button
            type="button"
            onClick={newSession}
            className="text-xs font-medium text-vf-fg-1 hover:text-vf-fg transition-colors"
            title="Nueva conversación"
          >
            Nueva
          </button>
          <div className="flex items-center gap-2 pl-4 border-l border-vf-border">
            <span
              className={`w-2 h-2 rounded-full bg-vf-green flex-shrink-0 ${streaming ? "" : "dot-live"}`}
            />
            <span className="text-xs font-medium text-vf-fg-1">
              {hydrating ? "Cargando" : streaming ? "Pensando" : "Listo"}
            </span>
          </div>
        </div>
      </header>

      <ChatStream messages={messages} onAction={handleAction} />

      {/* Live activity strip */}
      {streaming && (
        <div
          role="status"
          aria-live="polite"
          className="sticky bottom-[88px] md:bottom-[80px] bg-vf-bg-2/80 backdrop-blur-md border-t border-vf-border px-6 py-3 flex items-center gap-3 text-xs"
        >
          <span className="dot-live w-2 h-2 rounded-full bg-vf-green flex-shrink-0" />
          <span className="text-vf-fg-1 font-medium truncate">
            {currentTool ? toolDisplayName(currentTool) : "V está pensando"}
          </span>
        </div>
      )}

      {showNewProjectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-vf-bg border border-vf-border rounded-lg p-6 max-w-sm w-full mx-4">
            <h2 className="text-lg font-semibold text-vf-fg mb-4">Nuevo Proyecto</h2>
            <input
              type="text"
              placeholder="Nombre del proyecto"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              className="w-full px-3 py-2 bg-vf-bg-2 border border-vf-border rounded text-vf-fg text-sm mb-4 focus:outline-none focus:border-vf-green"
              onKeyDown={(e) => e.key === "Enter" && createNewProject()}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowNewProjectModal(false)}
                className="px-4 py-2 text-sm text-vf-fg-1 hover:bg-vf-bg-2 rounded transition"
              >
                Cancelar
              </button>
              <button
                onClick={createNewProject}
                disabled={creatingProject || !newProjectName.trim()}
                className="px-4 py-2 text-sm bg-vf-green text-vf-bg rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creatingProject ? "Creando..." : "Crear"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
