"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { cn } from "@/lib/utils";
import { VMark } from "@/components/brand/VMark";
import { Markdown } from "@/components/workspace/chat/Markdown";
import {
  IconBrain,
  IconCheck,
  IconChevD,
  IconClip,
  IconExtLink,
  IconGithub,
  IconGlobe,
  IconLayout,
  IconLoader,
  IconPlus,
  IconRefresh,
  IconRocket,
  IconSend,
  IconShield,
  IconWifi,
  IconX,
} from "@/components/brand/VFIcons";

type PreviewMode = "triple" | "desktop" | "mobile" | "admin";
type MobilePane = "build" | "preview";

interface ProjectSummary {
  id: string;
  name: string;
  category: string;
  status: string;
  github_repo: string | null;
  vercel_url: string | null;
  domain?: string | null;
}

interface ProjectDetail extends ProjectSummary {
  description: string | null;
  github_url: string | null;
  github_default_branch: string;
  vercel_project_id: string | null;
}

interface LivePayload {
  project: {
    id: string;
    name: string;
    status: string;
    desktop_url: string | null;
    mobile_url: string | null;
    admin_url: string | null;
  };
  me: {
    name: string;
    role: "owner" | "reviewer" | "observer";
    isPlatformOwner: boolean;
  };
}

interface ToolStep {
  id: string;
  name: string;
  state: "running" | "done" | "error";
  summary?: string;
}

interface StudioMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
  model?: string;
  streaming?: boolean;
  error?: string;
  tools?: ToolStep[];
  attachmentName?: string;
}

interface Attachment {
  name: string;
  mediaType: string;
  dataUrl: string;
}

interface FabricStatus {
  mcp: { configured: boolean };
  metamcp: { configured: boolean };
  composio: { configured: boolean };
  models: { configured: boolean };
}

interface SystemState {
  connections: Set<string>;
  ojoOnline: boolean | null;
  modelCount: number;
  fabric: FabricStatus | null;
}

type RunContent =
  | string
  | Array<
      | { type: "text"; text: string }
      | {
          type: "image";
          source: { type: "base64"; media_type: string; data: string };
        }
    >;

interface RunTurn {
  role: "user" | "assistant";
  content: RunContent;
}

const SUGGESTIONS = [
  "Audita este proyecto y dime qué falta para poder publicarlo.",
  "Construye la siguiente pantalla manteniendo el sistema visual actual.",
  "Revisa GitHub, despliega en Vercel y verifica el resultado.",
];

const TOOL_LABELS: Record<string, string> = {
  github_create_repo: "Crear repositorio",
  github_create_file: "Crear archivo en GitHub",
  github_update_file: "Actualizar archivo en GitHub",
  github_create_branch: "Crear rama en GitHub",
  github_create_pull_request: "Abrir pull request",
  github_commit_files: "Escribir cambios en GitHub",
  github_read_file: "Leer archivo",
  vercel_create_project: "Crear proyecto en Vercel",
  vercel_trigger_deployment: "Desplegar en Vercel",
  vercel_check_url: "Verificar URL desplegada",
  vercel_get_deployment_logs: "Leer logs de Vercel",
  design_version: "Generar versión visual",
  project_update: "Actualizar proyecto",
};

function newId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeExternalUrl(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  try {
    const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const url = new URL(candidate);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function modelLabel(value: string | null) {
  if (!value) return "Motor por resolver";
  const compact = value.split("/").at(-1)?.replaceAll("-", " ") ?? value;
  return compact.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function toolLabel(value: string) {
  return TOOL_LABELS[value] ?? value.replaceAll("_", " ");
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

async function responseJson(response: Response): Promise<unknown> {
  return response.json().catch(() => null);
}

function isLivePayload(value: unknown): value is LivePayload {
  if (!isObject(value) || !isObject(value.project) || !isObject(value.me)) {
    return false;
  }
  return (
    typeof value.project.id === "string" &&
    typeof value.project.name === "string" &&
    typeof value.project.status === "string" &&
    typeof value.me.role === "string"
  );
}

function parseSseBlock(block: string): Record<string, unknown> | null {
  const data = block
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trimStart())
    .join("\n");
  if (!data) return null;
  try {
    const parsed: unknown = JSON.parse(data);
    return isObject(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function ForgeStudio() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [activeProjectId, setActiveProjectId] = useState("");
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [live, setLive] = useState<LivePayload | null>(null);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectLoading, setProjectLoading] = useState(false);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const [sessionId, setSessionId] = useState("");
  const [messages, setMessages] = useState<StudioMessage[]>([]);
  const [conversationLoading, setConversationLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [composerError, setComposerError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [currentModel, setCurrentModel] = useState<string | null>(null);

  const [previewMode, setPreviewMode] = useState<PreviewMode>("triple");
  const [previewKey, setPreviewKey] = useState(0);
  const [dataRefresh, setDataRefresh] = useState(0);
  const [mobilePane, setMobilePane] = useState<MobilePane>("build");
  const [system, setSystem] = useState<SystemState>({
    connections: new Set(),
    ojoOnline: null,
    modelCount: 0,
    fabric: null,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const conversationViewportRef = useRef<HTMLDivElement>(null);

  const loadProjects = useCallback(async (preferredId?: string) => {
    setProjectsLoading(true);
    try {
      const response = await fetch("/api/projects", { cache: "no-store" });
      const payload = await responseJson(response);
      if (!response.ok || !isObject(payload) || !Array.isArray(payload.projects)) {
        throw new Error(`No se pudo cargar proyectos (HTTP ${response.status}).`);
      }
      const next = payload.projects.filter((item): item is ProjectSummary => {
        return isObject(item) && typeof item.id === "string" && typeof item.name === "string";
      });
      setProjects(next);
      // No seleccionar proyecto por defecto: el usuario elige o crea uno.
      // preferredId solo aplica tras "Crear proyecto".
      setActiveProjectId((current) => {
        const candidate = preferredId || current;
        if (candidate && next.some((item) => item.id === candidate)) return candidate;
        return "";
      });
    } catch (caught) {
      setProjectError(
        caught instanceof Error ? caught.message : "No se pudo leer el catálogo.",
      );
    } finally {
      setProjectsLoading(false);
    }
  }, []);

  const loadSystem = useCallback(async () => {
    const [connectionsResult, ojoResult, modelsResult, fabricResult] =
      await Promise.allSettled([
        fetch("/api/onboarding/status", { cache: "no-store" }),
        fetch("/api/forja/estado", { cache: "no-store" }),
        fetch("/api/brain/models", { cache: "no-store" }),
        fetch("/api/integrations/fabric", { cache: "no-store" }),
      ]);

    const nextConnections = new Set<string>();
    if (connectionsResult.status === "fulfilled" && connectionsResult.value.ok) {
      const payload = await responseJson(connectionsResult.value);
      if (isObject(payload) && Array.isArray(payload.connected)) {
        payload.connected.forEach((item) => {
          if (typeof item === "string") nextConnections.add(item.toLowerCase());
        });
      }
    }

    let ojoOnline: boolean | null = null;
    if (ojoResult.status === "fulfilled") {
      const payload = await responseJson(ojoResult.value);
      ojoOnline = ojoResult.value.ok && !(isObject(payload) && payload.error);
    }

    let modelCount = 0;
    if (modelsResult.status === "fulfilled" && modelsResult.value.ok) {
      const payload = await responseJson(modelsResult.value);
      if (isObject(payload) && Array.isArray(payload.models)) {
        modelCount = new Set(
          payload.models
            .map((item) => (isObject(item) && typeof item.modelo === "string" ? item.modelo : null))
            .filter((item): item is string => Boolean(item)),
        ).size;
      }
    }

    let fabric: FabricStatus | null = null;
    if (fabricResult.status === "fulfilled" && fabricResult.value.ok) {
      const payload = await responseJson(fabricResult.value);
      if (
        isObject(payload) &&
        isObject(payload.mcp) &&
        isObject(payload.metamcp) &&
        isObject(payload.composio) &&
        isObject(payload.models)
      ) {
        fabric = {
          mcp: { configured: payload.mcp.configured === true },
          metamcp: { configured: payload.metamcp.configured === true },
          composio: { configured: payload.composio.configured === true },
          models: { configured: payload.models.configured === true },
        };
      }
    }

    setSystem({ connections: nextConnections, ojoOnline, modelCount, fabric });
  }, []);

  useEffect(() => {
    void Promise.all([loadProjects(), loadSystem()]);
  }, [loadProjects, loadSystem]);

  useEffect(() => {
    if (!activeProjectId) {
      setProject(null);
      setLive(null);
      setProjectLoading(false);
      return;
    }

    // Solo persiste si el usuario eligió un proyecto (no forzar al entrar)
    if (activeProjectId) {
      window.localStorage.setItem("vforge.activeProject", activeProjectId);
    } else {
      window.localStorage.removeItem("vforge.activeProject");
    }
    const controller = new AbortController();
    let cancelled = false;
    setProjectLoading(true);
    setProjectError(null);

    async function loadProject() {
      const encoded = encodeURIComponent(activeProjectId);
      const [detailResult, liveResult] = await Promise.allSettled([
        fetch(`/api/projects/${encoded}`, {
          cache: "no-store",
          signal: controller.signal,
        }),
        fetch(`/api/live/${encoded}`, {
          cache: "no-store",
          signal: controller.signal,
        }),
      ]);

      if (cancelled) return;

      if (detailResult.status === "fulfilled") {
        const payload = await responseJson(detailResult.value);
        if (detailResult.value.ok && isObject(payload) && isObject(payload.project)) {
          setProject(payload.project as unknown as ProjectDetail);
        } else {
          setProject(null);
          setProjectError("El proyecto existe en el catálogo, pero su detalle no respondió.");
        }
      } else if (detailResult.reason?.name !== "AbortError") {
        setProjectError("No se pudo leer el detalle del proyecto.");
      }

      if (liveResult.status === "fulfilled") {
        const payload = await responseJson(liveResult.value);
        setLive(liveResult.value.ok && isLivePayload(payload) ? payload : null);
      } else {
        setLive(null);
      }
      setProjectLoading(false);
    }

    void loadProject();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [activeProjectId, dataRefresh]);

  useEffect(() => {
    const scope = activeProjectId || "general";
    const controller = new AbortController();
    let cancelled = false;
    setConversationLoading(true);
    setMessages([]);
    setSessionId("");

    async function hydrateConversation() {
      try {
        const sessionResponse = await fetch(
          `/api/forge/active-session?scope=${encodeURIComponent(scope)}`,
          { cache: "no-store", signal: controller.signal },
        );
        const sessionPayload = await responseJson(sessionResponse);
        if (
          !sessionResponse.ok ||
          !isObject(sessionPayload) ||
          typeof sessionPayload.sessionId !== "string"
        ) {
          throw new Error("No se pudo resolver la sesión del proyecto.");
        }
        if (cancelled) return;
        setSessionId(sessionPayload.sessionId);

        const conversationResponse = await fetch(
          `/api/forge/conversations?sessionId=${encodeURIComponent(sessionPayload.sessionId)}&limit=120`,
          { cache: "no-store", signal: controller.signal },
        );
        const conversationPayload = await responseJson(conversationResponse);
        if (
          conversationResponse.ok &&
          isObject(conversationPayload) &&
          Array.isArray(conversationPayload.turns)
        ) {
          const hydrated = conversationPayload.turns.flatMap((turn): StudioMessage[] => {
            if (!isObject(turn)) return [];
            if (turn.role !== "user" && turn.role !== "assistant") return [];
            if (typeof turn.content !== "string") return [];
            return [
              {
                id: typeof turn.id === "string" ? turn.id : newId("history"),
                role: turn.role,
                content: turn.content,
                createdAt: typeof turn.created_at === "string" ? turn.created_at : undefined,
              },
            ];
          });
          if (!cancelled) setMessages(hydrated);
        }
      } catch (caught) {
        if (!cancelled && !(caught instanceof DOMException && caught.name === "AbortError")) {
          setComposerError(
            caught instanceof Error ? caught.message : "No se pudo recuperar la conversación.",
          );
        }
      } finally {
        if (!cancelled) setConversationLoading(false);
      }
    }

    void hydrateConversation();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [activeProjectId]);

  useEffect(() => {
    const viewport = conversationViewportRef.current;
    if (!viewport) return;
    const frame = window.requestAnimationFrame(() => {
      viewport.scrollTop = viewport.scrollHeight;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [messages, sending]);

  const fallbackPreviewUrl = useMemo(
    () => normalizeExternalUrl(project?.domain || project?.vercel_url),
    [project?.domain, project?.vercel_url],
  );

  const viewports = useMemo(
    () => ({
      desktop: normalizeExternalUrl(live?.project.desktop_url) || fallbackPreviewUrl,
      mobile: normalizeExternalUrl(live?.project.mobile_url) || fallbackPreviewUrl,
      admin: normalizeExternalUrl(live?.project.admin_url),
    }),
    [fallbackPreviewUrl, live],
  );

  const githubUrl =
    normalizeExternalUrl(project?.github_url) ||
    (project?.github_repo
      ? `https://github.com/${project.github_repo.replace(/^\/+/, "")}`
      : null);

  async function newConversation() {
    if (sending) return;
    setComposerError(null);
    try {
      const response = await fetch("/api/forge/active-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: activeProjectId || "general" }),
      });
      const payload = await responseJson(response);
      if (!response.ok || !isObject(payload) || typeof payload.sessionId !== "string") {
        throw new Error("No se pudo abrir una conversación nueva.");
      }
      setSessionId(payload.sessionId);
      setMessages([]);
      setCurrentModel(null);
    } catch (caught) {
      setComposerError(
        caught instanceof Error ? caught.message : "No se pudo abrir una conversación nueva.",
      );
    }
  }

  async function sendPrompt(override?: string) {
    const text = (override ?? draft).trim();
    if (!text || sending || !sessionId) return;

    const previousTurns: RunTurn[] = messages
      .filter((message) => message.content.trim() && !message.error)
      .map((message) => ({ role: message.role, content: message.content }));
    let content: RunContent = text;
    if (attachment) {
      const match = attachment.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        content = [
          { type: "text", text },
          {
            type: "image",
            source: { type: "base64", media_type: match[1], data: match[2] },
          },
        ];
      }
    }

    const userMessage: StudioMessage = {
      id: newId("user"),
      role: "user",
      content: text,
      attachmentName: attachment?.name,
    };
    const assistantId = newId("assistant");
    const assistantMessage: StudioMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      streaming: true,
      tools: [],
    };

    setMessages((current) => [...current, userMessage, assistantMessage]);
    setDraft("");
    setAttachment(null);
    setComposerError(null);
    setSending(true);

    const updateAssistant = (updater: (message: StudioMessage) => StudioMessage) => {
      setMessages((current) =>
        current.map((message) => (message.id === assistantId ? updater(message) : message)),
      );
    };

    try {
      const response = await fetch("/api/forge/run", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({
          messages: [...previousTurns, { role: "user", content } satisfies RunTurn],
          sessionId,
          projectId: activeProjectId || null,
        }),
      });

      if (!response.ok || !response.body) {
        const payload = await responseJson(response);
        const detail = isObject(payload) && typeof payload.error === "string" ? payload.error : null;
        throw new Error(detail || `El motor respondió HTTP ${response.status}.`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let completed = false;

      const applyEvent = (event: Record<string, unknown>) => {
        const type = typeof event.type === "string" ? event.type : "";
        if (type === "meta" && typeof event.model === "string") {
          setCurrentModel(event.model);
          updateAssistant((message) => ({ ...message, model: event.model as string }));
          return;
        }
        if (type === "text" && typeof event.value === "string") {
          updateAssistant((message) => ({
            ...message,
            content: message.content + event.value,
          }));
          return;
        }
        if (type === "tool_use_start" && typeof event.id === "string") {
          const name = typeof event.name === "string" ? event.name : "tool";
          updateAssistant((message) => ({
            ...message,
            tools: [
              ...(message.tools ?? []).filter((tool) => tool.id !== event.id),
              { id: event.id as string, name, state: "running" },
            ],
          }));
          return;
        }
        if (type === "tool_use_result" && typeof event.id === "string") {
          const ok = event.ok === true;
          updateAssistant((message) => ({
            ...message,
            tools: (message.tools ?? []).map((tool) =>
              tool.id === event.id
                ? {
                    ...tool,
                    state: ok ? "done" : "error",
                    summary: typeof event.summary === "string" ? event.summary : undefined,
                  }
                : tool,
            ),
          }));
          return;
        }
        if (type === "model_fallback") {
          const to = typeof event.to === "string" ? event.to : "otro motor";
          updateAssistant((message) => ({
            ...message,
            tools: [
              ...(message.tools ?? []),
              {
                id: newId("fallback"),
                name: `Cambio de motor → ${modelLabel(to)}`,
                state: "done",
              },
            ],
          }));
          return;
        }
        if (type === "version") {
          updateAssistant((message) => ({
            ...message,
            tools: [
              ...(message.tools ?? []),
              {
                id: newId("version"),
                name: "Nueva versión disponible",
                state: "done",
                summary: typeof event.summary === "string" ? event.summary : undefined,
              },
            ],
          }));
          setDataRefresh((value) => value + 1);
          setPreviewKey((value) => value + 1);
          return;
        }
        if (type === "error") {
          const error = typeof event.message === "string" ? event.message : "El motor no pudo terminar.";
          updateAssistant((message) => ({ ...message, streaming: false, error }));
          completed = true;
          return;
        }
        if (type === "done") {
          if (typeof event.model === "string") setCurrentModel(event.model);
          updateAssistant((message) => ({ ...message, streaming: false }));
          completed = true;
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        const blocks = buffer.split("\n\n");
        buffer = blocks.pop() ?? "";
        blocks.forEach((block) => {
          const event = parseSseBlock(block);
          if (event) applyEvent(event);
        });
        if (done) break;
      }
      if (buffer.trim()) {
        const event = parseSseBlock(buffer);
        if (event) applyEvent(event);
      }
      if (!completed) {
        updateAssistant((message) => ({ ...message, streaming: false }));
      }

      setDataRefresh((value) => value + 1);
    } catch (caught) {
      const error = caught instanceof Error ? caught.message : "No se pudo contactar al motor.";
      updateAssistant((message) => ({ ...message, streaming: false, error }));
    } finally {
      setSending(false);
    }
  }

  function attachFile(file: File | undefined) {
    if (!file) return;
    setComposerError(null);
    if (!file.type.startsWith("image/")) {
      setComposerError("Por ahora el motor visual acepta imágenes; otros archivos llegarán después.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setComposerError("La imagen debe pesar menos de 5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      setAttachment({ name: file.name, mediaType: file.type, dataUrl: reader.result });
    };
    reader.onerror = () => setComposerError("No se pudo leer la imagen.");
    reader.readAsDataURL(file);
  }

  function requestDeploy() {
    if (!project) return;
    void sendPrompt(
      `Revisa el estado real de ${project.name}, despliega la versión actual en Vercel y verifica la URL final. Si falta una conexión o un dato, dime exactamente cuál; no simules el deploy.`,
    );
    setMobilePane("build");
  }

  return (
    <div className="vf-mobile-stable flex h-full min-h-0 flex-col overflow-hidden overscroll-none bg-[var(--vf-bg)] text-[var(--vf-fg)]">
      <StudioToolbar
        projects={projects}
        activeProjectId={activeProjectId}
        project={project}
        loading={projectsLoading || projectLoading}
        sending={sending}
        canPrompt={Boolean(sessionId)}
        githubUrl={githubUrl}
        previewUrl={fallbackPreviewUrl}
        onProjectChange={setActiveProjectId}
        onCreate={() => setShowCreate(true)}
        onDeploy={requestDeploy}
      />

      <div className="grid grid-cols-2 border-b border-[var(--vf-border)] bg-[var(--vf-bg-1)] p-1 lg:hidden">
        <MobilePaneButton active={mobilePane === "build"} onClick={() => setMobilePane("build")}>
          Construir
        </MobilePaneButton>
        <MobilePaneButton active={mobilePane === "preview"} onClick={() => setMobilePane("preview")}>
          Ver proyecto
        </MobilePaneButton>
      </div>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(360px,0.88fr)_minmax(500px,1.12fr)]">
        <section
          className={cn(
            "min-h-0 flex-col border-r border-[var(--vf-border)] bg-[var(--vf-bg-1)]",
            mobilePane === "build" ? "flex" : "hidden lg:flex",
          )}
        >
          <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-[var(--vf-border)] px-4">
            <div className="min-w-0">
              <p className="font-mono text-[8px] uppercase tracking-[0.15em] text-[var(--vf-fg-2)]">
                Conversación de trabajo
              </p>
              <p className="mt-0.5 truncate text-[11px] text-[var(--vf-fg-1)]">
                {modelLabel(currentModel)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void newConversation()}
              disabled={sending || conversationLoading}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[var(--vf-border-1)] px-2.5 text-[10px] hover:border-[var(--vf-fg)] disabled:opacity-45"
            >
              <IconPlus size={11} /> Nueva
            </button>
          </header>

          <div
            ref={conversationViewportRef}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 md:px-5"
          >
            {conversationLoading ? (
              <div className="grid h-full min-h-[260px] place-items-center">
                <div className="text-center">
                  <IconLoader size={17} className="mx-auto animate-spin" />
                  <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--vf-fg-2)]">
                    Recuperando contexto
                  </p>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <EmptyConversation
                hasProject={Boolean(project)}
                onSuggestion={(text) => void sendPrompt(text)}
              />
            ) : (
              <div className="space-y-6">
                {messages.map((message) => (
                  <Message key={message.id} message={message} />
                ))}
              </div>
            )}
          </div>

          <div className="vf-studio-composer shrink-0 border-t border-[var(--vf-border)] bg-[var(--vf-bg-1)] p-3 md:p-4">
            {attachment ? (
              <div className="mb-2 flex items-center justify-between gap-3 rounded-md border border-[var(--vf-border)] bg-[var(--vf-bg-2)] px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-[10px] font-medium">{attachment.name}</p>
                  <p className="font-mono text-[8px] uppercase tracking-[0.11em] text-[var(--vf-fg-2)]">
                    Imagen adjunta
                  </p>
                </div>
                <button type="button" onClick={() => setAttachment(null)} aria-label="Quitar imagen">
                  <IconX size={12} />
                </button>
              </div>
            ) : null}

            <div className="rounded-lg border border-[var(--vf-border-1)] bg-[var(--vf-bg-1)] p-2 focus-within:border-[var(--vf-fg)]">
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void sendPrompt();
                  }
                }}
                rows={3}
                disabled={sending || !sessionId}
                placeholder={
                  project
                    ? `Dile a V qué construir, revisar o desplegar en ${project.name}…`
                    : "Crea o selecciona un proyecto para trabajar con contexto…"
                }
                className="max-h-40 min-h-[70px] w-full resize-none bg-transparent px-1.5 py-1 text-[13px] leading-5 text-[var(--vf-fg)] placeholder:text-[var(--vf-fg-2)] disabled:opacity-55"
              />
              <div className="flex items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      attachFile(event.target.files?.[0]);
                      event.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={sending}
                    className="grid h-8 w-8 place-items-center rounded-md border border-transparent hover:border-[var(--vf-border)] hover:bg-[var(--vf-bg-2)]"
                    aria-label="Adjuntar imagen"
                  >
                    <IconClip size={13} />
                  </button>
                  <span className="hidden font-mono text-[8px] uppercase tracking-[0.11em] text-[var(--vf-fg-2)] sm:inline">
                    Enter envía · Shift + Enter separa
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => void sendPrompt()}
                  disabled={!draft.trim() || sending || !sessionId}
                  className="grid h-9 w-9 place-items-center rounded-md bg-[var(--vf-fg)] text-[var(--vf-bg-1)] disabled:cursor-not-allowed disabled:opacity-25"
                  aria-label="Enviar instrucción"
                >
                  {sending ? <IconLoader size={13} className="animate-spin" /> : <IconSend size={13} />}
                </button>
              </div>
            </div>
            {composerError ? (
              <p className="mt-2 text-[10px] leading-4 text-[var(--vf-fg-1)]">{composerError}</p>
            ) : null}
          </div>
        </section>

        <section
          className={cn(
            "min-h-0 flex-col bg-[var(--vf-bg)]",
            mobilePane === "preview" ? "flex" : "hidden lg:flex",
          )}
        >
          <PreviewHeader
            mode={previewMode}
            setMode={setPreviewMode}
            previewUrl={fallbackPreviewUrl}
            onRefresh={() => {
              setPreviewKey((value) => value + 1);
              setDataRefresh((value) => value + 1);
            }}
          />

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 md:p-4">
            {!activeProjectId ? (
              <NoProject onCreate={() => setShowCreate(true)} />
            ) : projectLoading && !project ? (
              <div className="grid h-full min-h-[360px] place-items-center border border-[var(--vf-border)] bg-[var(--vf-bg-1)]">
                <IconLoader size={18} className="animate-spin" />
              </div>
            ) : projectError && !project ? (
              <div className="grid h-full min-h-[360px] place-items-center border border-[var(--vf-fg)] bg-[var(--vf-bg-1)] p-8 text-center">
                <div>
                  <p className="text-[13px] font-medium">{projectError}</p>
                  <button
                    type="button"
                    onClick={() => setDataRefresh((value) => value + 1)}
                    className="mt-4 text-[11px] underline underline-offset-4"
                  >
                    Volver a intentar
                  </button>
                </div>
              </div>
            ) : previewMode === "triple" ? (
              <TriplePreview
                projectName={project?.name ?? "Proyecto"}
                urls={viewports}
                frameKey={previewKey}
              />
            ) : (
              <SinglePreview
                projectName={project?.name ?? "Proyecto"}
                mode={previewMode}
                url={viewports[previewMode]}
                frameKey={previewKey}
              />
            )}
          </div>

          <SystemStrip
            project={project}
            system={system}
            currentModel={currentModel}
          />
        </section>
      </div>

      {showCreate ? (
        <CreateProjectDialog
          githubConnected={system.connections.has("github")}
          onClose={() => setShowCreate(false)}
          onCreated={async (id) => {
            await loadProjects(id);
            setShowCreate(false);
            setMobilePane("build");
          }}
        />
      ) : null}
    </div>
  );
}

function StudioToolbar({
  projects,
  activeProjectId,
  project,
  loading,
  sending,
  canPrompt,
  githubUrl,
  previewUrl,
  onProjectChange,
  onCreate,
  onDeploy,
}: {
  projects: ProjectSummary[];
  activeProjectId: string;
  project: ProjectDetail | null;
  loading: boolean;
  sending: boolean;
  canPrompt: boolean;
  githubUrl: string | null;
  previewUrl: string | null;
  onProjectChange: (id: string) => void;
  onCreate: () => void;
  onDeploy: () => void;
}) {
  return (
    <div className="flex min-h-[62px] shrink-0 items-center justify-between gap-3 border-b border-[var(--vf-border)] bg-[var(--vf-bg-1)] px-3 py-2 md:px-4">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <label className="relative min-w-0 flex-1 sm:max-w-[310px]">
          <span className="sr-only">Proyecto activo</span>
          <select
            value={activeProjectId}
            onChange={(event) => onProjectChange(event.target.value)}
            disabled={sending || loading}
            className="h-10 w-full appearance-none rounded-md border border-[var(--vf-border-1)] bg-[var(--vf-bg-1)] pl-3 pr-8 text-[11px] font-medium text-[var(--vf-fg)] disabled:opacity-55"
          >
            <option value="">
              {projects.length === 0 ? "Sin proyectos" : "Selecciona un proyecto"}
            </option>
            {projects.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <IconChevD
            size={11}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
          />
        </label>
        <button
          type="button"
          onClick={onCreate}
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-md border border-[var(--vf-border-1)] px-3 text-[10px] hover:border-[var(--vf-fg)]"
        >
          <IconPlus size={12} /> <span className="hidden sm:inline">Nuevo proyecto</span>
        </button>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {githubUrl ? (
          <a
            href={githubUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-[var(--vf-border-1)] px-2.5 text-[10px] hover:border-[var(--vf-fg)]"
          >
            <IconGithub size={12} /> <span className="hidden xl:inline">GitHub</span>
          </a>
        ) : (
          <Link
            href="/app/integrations"
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-[var(--vf-border-1)] px-2.5 text-[10px] hover:border-[var(--vf-fg)]"
          >
            <IconGithub size={12} /> <span className="hidden xl:inline">Conectar</span>
          </Link>
        )}
        <button
          type="button"
          onClick={onDeploy}
          disabled={!project || sending || !canPrompt}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[var(--vf-fg)] px-3 text-[10px] font-medium text-[var(--vf-bg-1)] disabled:opacity-30"
        >
          {sending ? <IconLoader size={12} className="animate-spin" /> : <IconRocket size={12} />}
          <span className="hidden sm:inline">Desplegar</span>
        </button>
        {project ? (
          <Link
            href={`/app/live/${encodeURIComponent(project.id)}`}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-[var(--vf-border-1)] px-2.5 text-[10px] hover:border-[var(--vf-fg)]"
          >
            <IconLayout size={12} /> <span className="hidden xl:inline">Sala completa</span>
          </Link>
        ) : null}
        {previewUrl ? (
          <a
            href={previewUrl}
            target="_blank"
            rel="noreferrer"
            className="grid h-9 w-9 place-items-center rounded-md border border-[var(--vf-border-1)] hover:border-[var(--vf-fg)]"
            aria-label="Abrir proyecto"
          >
            <IconExtLink size={12} />
          </a>
        ) : null}
      </div>
    </div>
  );
}

function MobilePaneButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-9 rounded-md font-mono text-[9px] uppercase tracking-[0.12em]",
        active
          ? "bg-[var(--vf-fg)] text-[var(--vf-bg-1)]"
          : "text-[var(--vf-fg-2)]",
      )}
    >
      {children}
    </button>
  );
}

function EmptyConversation({
  hasProject,
  onSuggestion,
}: {
  hasProject: boolean;
  onSuggestion: (text: string) => void;
}) {
  return (
    <div className="flex min-h-full flex-col justify-center py-8">
      <VMark size={34} />
      <h2 className="mt-6 max-w-md text-[clamp(2.1rem,5vw,4.2rem)] font-semibold leading-[0.91] tracking-[-0.065em]">
        Construye en conversación.
      </h2>
      <p className="mt-5 max-w-md text-[12px] leading-5 text-[var(--vf-fg-1)]">
        {hasProject
          ? "V recibe el proyecto activo, conserva su historia y puede usar las herramientas reales disponibles."
          : "Crea un proyecto para darle contexto, repositorio, despliegue y sala de revisión."}
      </p>
      {hasProject ? (
        <div className="mt-8 space-y-2">
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => onSuggestion(suggestion)}
              className="flex w-full items-start justify-between gap-4 rounded-md border border-[var(--vf-border)] bg-[var(--vf-bg-1)] px-3 py-3 text-left text-[11px] leading-5 hover:border-[var(--vf-fg)]"
            >
              <span>{suggestion}</span>
              <IconSend size={11} className="mt-1 shrink-0" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Message({ message }: { message: StudioMessage }) {
  if (message.role === "user") {
    return (
      <article className="ml-auto max-w-[88%] rounded-lg bg-[var(--vf-fg)] px-4 py-3 text-[var(--vf-bg-1)]">
        {message.attachmentName ? (
          <p className="mb-2 flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.11em] text-[var(--vf-bg-3)]">
            <IconClip size={10} /> {message.attachmentName}
          </p>
        ) : null}
        <p className="whitespace-pre-wrap text-[12px] leading-5 text-inherit">{message.content}</p>
      </article>
    );
  }

  return (
    <article className="max-w-full">
      <header className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-full border border-[var(--vf-fg)]">
            <VMark size={11} />
          </span>
          <span className="font-mono text-[8px] uppercase tracking-[0.15em] text-[var(--vf-fg-2)]">
            V · {modelLabel(message.model ?? null)}
          </span>
        </div>
        {message.streaming ? (
          <span className="inline-flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.11em] text-[var(--vf-fg-2)]">
            <IconLoader size={10} className="animate-spin" /> Trabajando
          </span>
        ) : null}
      </header>

      {message.tools && message.tools.length > 0 ? (
        <div className="mb-3 divide-y divide-[var(--vf-border)] rounded-md border border-[var(--vf-border)] bg-[var(--vf-bg-2)]">
          {message.tools.map((tool) => (
            <div key={tool.id} className="flex items-start gap-2.5 px-3 py-2.5">
              {tool.state === "running" ? (
                <IconLoader size={11} className="mt-0.5 shrink-0 animate-spin" />
              ) : tool.state === "done" ? (
                <IconCheck size={11} className="mt-0.5 shrink-0" />
              ) : (
                <IconX size={11} className="mt-0.5 shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-[10px] font-medium capitalize">{toolLabel(tool.name)}</p>
                {tool.summary ? (
                  <p className="mt-0.5 break-words text-[9px] leading-4 text-[var(--vf-fg-2)]">
                    {tool.summary}
                  </p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {message.content ? <Markdown text={message.content} streaming={message.streaming} /> : null}
      {message.error ? (
        <div className="mt-2 border-l-2 border-[var(--vf-fg)] bg-[var(--vf-bg-2)] px-3 py-2">
          <p className="text-[10px] leading-4 text-[var(--vf-fg-1)]">{message.error}</p>
        </div>
      ) : null}
    </article>
  );
}

function PreviewHeader({
  mode,
  setMode,
  previewUrl,
  onRefresh,
}: {
  mode: PreviewMode;
  setMode: (mode: PreviewMode) => void;
  previewUrl: string | null;
  onRefresh: () => void;
}) {
  const modes: Array<{ id: PreviewMode; label: string }> = [
    { id: "triple", label: "Tres vistas" },
    { id: "desktop", label: "Escritorio" },
    { id: "mobile", label: "Móvil" },
    { id: "admin", label: "Admin" },
  ];
  return (
    <header className="flex min-h-12 shrink-0 items-center justify-between gap-3 border-b border-[var(--vf-border)] bg-[var(--vf-bg-1)] px-3">
      <div className="flex min-w-0 gap-1 overflow-x-auto py-1">
        {modes.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setMode(item.id)}
            className={cn(
              "h-8 whitespace-nowrap rounded-md px-2.5 font-mono text-[8px] uppercase tracking-[0.1em]",
              mode === item.id
                ? "bg-[var(--vf-fg)] text-[var(--vf-bg-1)]"
                : "text-[var(--vf-fg-2)] hover:bg-[var(--vf-bg-2)] hover:text-[var(--vf-fg)]",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={onRefresh}
          className="grid h-8 w-8 place-items-center rounded-md hover:bg-[var(--vf-bg-2)]"
          aria-label="Actualizar vistas"
        >
          <IconRefresh size={11} />
        </button>
        {previewUrl ? (
          <a
            href={previewUrl}
            target="_blank"
            rel="noreferrer"
            className="grid h-8 w-8 place-items-center rounded-md hover:bg-[var(--vf-bg-2)]"
            aria-label="Abrir preview"
          >
            <IconExtLink size={11} />
          </a>
        ) : null}
      </div>
    </header>
  );
}

function TriplePreview({
  projectName,
  urls,
  frameKey,
}: {
  projectName: string;
  urls: { desktop: string | null; mobile: string | null; admin: string | null };
  frameKey: number;
}) {
  const hasAny = Boolean(urls.desktop || urls.mobile || urls.admin);
  if (!hasAny) return <NoPreview projectName={projectName} />;

  return (
    <div className="grid min-h-full items-stretch gap-3 xl:grid-cols-[minmax(260px,1.18fr)_minmax(150px,.5fr)_minmax(240px,.92fr)]">
      <FrameCard
        title="Escritorio"
        kind="desktop"
        url={urls.desktop}
        frameKey={frameKey}
        projectName={projectName}
      />
      <FrameCard
        title="Móvil"
        kind="mobile"
        url={urls.mobile}
        frameKey={frameKey}
        projectName={projectName}
      />
      <FrameCard
        title="Administración"
        kind="admin"
        url={urls.admin}
        frameKey={frameKey}
        projectName={projectName}
      />
    </div>
  );
}

function SinglePreview({
  projectName,
  mode,
  url,
  frameKey,
}: {
  projectName: string;
  mode: Exclude<PreviewMode, "triple">;
  url: string | null;
  frameKey: number;
}) {
  return (
    <FrameCard
      title={mode === "desktop" ? "Escritorio" : mode === "mobile" ? "Móvil" : "Administración"}
      kind={mode}
      url={url}
      frameKey={frameKey}
      projectName={projectName}
      single
    />
  );
}

function FrameCard({
  title,
  kind,
  url,
  frameKey,
  projectName,
  single = false,
}: {
  title: string;
  kind: "desktop" | "mobile" | "admin";
  url: string | null;
  frameKey: number;
  projectName: string;
  single?: boolean;
}) {
  return (
    <article
      className={cn(
        "flex min-h-[300px] min-w-0 flex-col overflow-hidden rounded-lg border border-[var(--vf-border)] bg-[var(--vf-bg-1)]",
        single && "h-full min-h-[440px]",
        kind === "mobile" && single && "mx-auto w-full max-w-[390px]",
      )}
    >
      <header className="flex h-9 shrink-0 items-center justify-between border-b border-[var(--vf-border)] px-3">
        <div className="flex items-center gap-2">
          {kind === "admin" ? <IconShield size={11} /> : <IconLayout size={11} />}
          <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-[var(--vf-fg-2)]">
            {title}
          </span>
        </div>
        {url ? (
          <a href={url} target="_blank" rel="noreferrer" aria-label={`Abrir ${title}`}>
            <IconExtLink size={10} />
          </a>
        ) : null}
      </header>
      <div className="relative min-h-[300px] flex-1 bg-[var(--vf-bg-1)]">
        {url ? (
          <iframe
            key={`${frameKey}-${kind}`}
            src={url}
            title={`${title} de ${projectName}`}
            className="absolute inset-0 h-full w-full border-0 bg-[var(--vf-bg-1)]"
            loading="lazy"
            referrerPolicy="no-referrer"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        ) : (
          <div className="grid h-full min-h-[300px] place-items-center p-6 text-center">
            <div>
              {kind === "admin" ? <IconShield size={17} className="mx-auto" /> : <IconLayout size={17} className="mx-auto" />}
              <p className="mt-3 text-[11px] font-medium">Sin URL de {title.toLowerCase()}</p>
              <p className="mx-auto mt-1 max-w-[220px] text-[9px] leading-4 text-[var(--vf-fg-2)]">
                {kind === "admin"
                  ? "La API sólo entrega esta vista a owner o revisor cuando el proyecto la publica."
                  : "Esta vista aparecerá cuando el proyecto publique una URL real."}
              </p>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

function NoProject({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="grid h-full min-h-[420px] place-items-center border border-dashed border-[var(--vf-border-1)] bg-[var(--vf-bg-1)] p-8 text-center">
      <div>
        <IconPlus size={20} className="mx-auto" />
        <p className="mt-4 text-[13px] font-medium">Todavía no hay un proyecto activo.</p>
        <p className="mx-auto mt-2 max-w-sm text-[11px] leading-5 text-[var(--vf-fg-2)]">
          Crea el proyecto y VForge abrirá una conversación, un catálogo y una sala con el mismo identificador.
        </p>
        <button type="button" onClick={onCreate} className="btn-primary mt-5">
          <IconPlus size={12} /> Crear proyecto
        </button>
      </div>
    </div>
  );
}

function NoPreview({ projectName }: { projectName: string }) {
  return (
    <div className="grid h-full min-h-[420px] place-items-center border border-dashed border-[var(--vf-border-1)] bg-[var(--vf-bg-1)] p-8 text-center">
      <div>
        <IconLayout size={20} className="mx-auto" />
        <p className="mt-4 text-[13px] font-medium">{projectName} aún no publica una vista.</p>
        <p className="mx-auto mt-2 max-w-md text-[11px] leading-5 text-[var(--vf-fg-2)]">
          Pídele a V que construya o despliegue. Este espacio no inventa previews: se activa cuando existe una URL real.
        </p>
      </div>
    </div>
  );
}

function SystemStrip({
  project,
  system,
  currentModel,
}: {
  project: ProjectDetail | null;
  system: SystemState;
  currentModel: string | null;
}) {
  const items = [
    {
      label: "GitHub",
      detail: project?.github_repo || (system.connections.has("github") ? "Conectado" : "Pendiente"),
      active: Boolean(project?.github_repo || system.connections.has("github")),
      Icon: IconGithub,
    },
    {
      label: "Vercel",
      detail: project?.domain || project?.vercel_url || (system.connections.has("vercel") ? "Conectado" : "Pendiente"),
      active: Boolean(project?.domain || project?.vercel_url || system.connections.has("vercel")),
      Icon: IconGlobe,
    },
    {
      label: "MCP / Ojo",
      detail:
        system.ojoOnline === null
          ? "Comprobando"
          : system.ojoOnline
            ? "VForge + MetaMCP"
            : system.fabric?.mcp.configured
              ? "VForge MCP activo"
              : "Sin respuesta",
      active: system.ojoOnline === true || system.fabric?.mcp.configured === true,
      Icon: IconWifi,
    },
    {
      label: "Modelos",
      detail: currentModel ? modelLabel(currentModel) : system.modelCount ? `${system.modelCount} disponibles` : "Router",
      active: Boolean(currentModel || system.fabric?.models.configured),
      Icon: IconBrain,
    },
    {
      label: "Composio",
      detail: system.fabric?.composio.configured ? "Configurado" : "Por conectar",
      active: system.fabric?.composio.configured === true,
      Icon: IconLayout,
    },
  ];

  return (
    <div className="grid shrink-0 grid-cols-2 border-t border-[var(--vf-border)] bg-[var(--vf-bg-1)] sm:grid-cols-5">
      {items.map(({ label, detail, active, Icon }) => (
        <Link
          key={label}
          href="/app/integrations"
          className="min-w-0 border-r border-[var(--vf-border)] px-3 py-2.5 last:border-r-0 hover:bg-[var(--vf-bg-2)]"
        >
          <div className="flex items-center gap-1.5">
            <Icon size={10} className="shrink-0" />
            <span className="font-mono text-[7px] uppercase tracking-[0.12em] text-[var(--vf-fg-2)]">
              {label}
            </span>
            <span className="status-shape ml-auto shrink-0" data-active={active} />
          </div>
          <p className="mt-1 truncate text-[8px] text-[var(--vf-fg-1)]">{detail}</p>
        </Link>
      ))}
    </div>
  );
}

function CreateProjectDialog({
  githubConnected,
  onClose,
  onCreated,
}: {
  githubConnected: boolean;
  onClose: () => void;
  onCreated: (id: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [id, setId] = useState("");
  const [idTouched, setIdTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [createRepo, setCreateRepo] = useState(githubConnected);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanId = slugify(id || name);
    if (!cleanId || !name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: cleanId,
          name: name.trim(),
          description: description.trim() || null,
          category: "en_revision",
          create_repo: createRepo,
        }),
      });
      const payload = await responseJson(response);
      if (!response.ok) {
        const detail = isObject(payload) && typeof payload.error === "string" ? payload.error : null;
        throw new Error(detail || `No se pudo crear el proyecto (HTTP ${response.status}).`);
      }
      await onCreated(cleanId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo crear el proyecto.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-[rgba(0,0,0,.34)] p-4" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0" onClick={onClose} aria-label="Cerrar" />
      <form
        onSubmit={submit}
        className="relative z-10 w-full max-w-[520px] border border-[var(--vf-fg)] bg-[var(--vf-bg-1)] p-5 text-[var(--vf-fg)] shadow-[var(--shadow-elev)] md:p-7"
      >
        <header className="flex items-start justify-between gap-4 border-b border-[var(--vf-border)] pb-5">
          <div>
            <p className="mono-label">Nuevo contexto de trabajo</p>
            <h2 className="mt-2 text-[28px] font-semibold tracking-[-0.05em]">Crear proyecto</h2>
          </div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-md border border-[var(--vf-border)]">
            <IconX size={13} />
          </button>
        </header>

        <div className="space-y-4 py-5">
          <label className="block">
            <span className="mono-label">Nombre</span>
            <input
              autoFocus
              required
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (!idTouched) setId(slugify(event.target.value));
              }}
              placeholder="Nombre del proyecto"
              className="input-base mt-2"
            />
          </label>
          <label className="block">
            <span className="mono-label">Identificador</span>
            <input
              required
              pattern="[a-z0-9][a-z0-9_-]*"
              value={id}
              onChange={(event) => {
                setIdTouched(true);
                setId(slugify(event.target.value));
              }}
              placeholder="mi-proyecto"
              className="input-base mt-2 font-mono text-[11px]"
            />
          </label>
          <label className="block">
            <span className="mono-label">Propósito</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              placeholder="Qué debe resolver y para quién."
              className="input-base mt-2 resize-none"
            />
          </label>
          <label className="flex items-start gap-3 rounded-md border border-[var(--vf-border)] bg-[var(--vf-bg-2)] p-3">
            <input
              type="checkbox"
              checked={createRepo}
              onChange={(event) => setCreateRepo(event.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[var(--vf-fg)]"
            />
            <span>
              <span className="block text-[11px] font-medium">Crear repositorio privado en GitHub</span>
              <span className="mt-1 block text-[9px] leading-4 text-[var(--vf-fg-2)]">
                {githubConnected
                  ? "Usará la conexión autorizada de tu cuenta."
                  : "Si no existe una credencial válida, el proyecto se crea y reporta el fallo de GitHub sin fingir éxito."}
              </span>
            </span>
          </label>
        </div>

        {error ? <p className="mb-4 text-[10px] leading-4 text-[var(--vf-fg-1)]">{error}</p> : null}

        <div className="flex justify-end gap-2 border-t border-[var(--vf-border)] pt-5">
          <button type="button" onClick={onClose} className="btn-ghost" disabled={saving}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary" disabled={saving || !name.trim() || !id}>
            {saving ? <IconLoader size={12} className="animate-spin" /> : <IconPlus size={12} />}
            Crear y abrir
          </button>
        </div>
      </form>
    </div>
  );
}
