"use client";

import { AppCanvas } from "@/components/studio/AppCanvas";
import { BarraVivo } from "@/components/studio/vivo/BarraVivo";
import { useMotorVivo } from "@/components/studio/vivo/useMotorVivo";
import { PanelInspector } from "@/components/studio/vivo/PanelInspector";
import { PanelControl } from "@/components/studio/vivo/PanelControl";
import { useCapaEdicion } from "@/components/studio/vivo/useCapaEdicion";
import { useEncargos } from "@/components/studio/vivo/useEncargos";
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
  IconChat,
  IconClip,
  IconDatabase,
  IconExtLink,
  IconGithub,
  IconGlobe,
  IconLayout,
  IconLoader,
  IconMenu,
  IconMic,
  IconPlus,
  IconPlug,
  IconRefresh,
  IconSearch,
  IconSend,
  IconShield,
  IconTriangle,
  IconUsers,
  IconWifi,
  IconX,
} from "@/components/brand/VFIcons";

type PreviewMode = "triple" | "par" | "desktop" | "mobile" | "admin" | "canvas";
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

/** El nombre del motor, o `null` si todavía no se sabe cuál es.
 *  Antes devolvía "Motor por resolver", que es una nota interna: al usuario se
 *  le muestra el motor real o no se le muestra nada. */
function modelLabel(value: string | null): string | null {
  if (!value) return null;
  const compact = value.split("/").at(-1)?.replaceAll("-", " ") ?? value;
  return compact.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function toolLabel(value: string) {
  return TOOL_LABELS[value] ?? value.replaceAll("_", " ");
}

function fallbackSessionId(scope: string) {
  const normalized = slugify(scope || "general") || "general";
  const key = `vforge.chat.session.${normalized}`;
  try {
    const saved = window.sessionStorage.getItem(key);
    if (saved) return saved;
    const next = `local_${normalized}_${newId("session")}`;
    window.sessionStorage.setItem(key, next);
    return next;
  } catch {
    return `local_${normalized}_${newId("session")}`;
  }
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
  const [chatShare] = useState(() => {
    if (typeof window === "undefined") return 58;
    const n = Number(localStorage.getItem("vf-chat-share"));
    return n >= 32 && n <= 70 ? n : 58;
  });
  const [previewKey, setPreviewKey] = useState(0);
  const [dataRefresh, setDataRefresh] = useState(0);
  const [mobilePane, setMobilePane] = useState<MobilePane>("build");
  const [leftPanelOpen, setLeftPanelOpen] = useState(false);
  const [connectorsOpen, setConnectorsOpen] = useState(false);
  const [widgetsOpen, setWidgetsOpen] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
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
      // Se recuerda el proyecto con el que Luis estaba trabajando (o el que llega
      // por ?project=), para que Construir y la Sala hablen del mismo.
      let recordado = "";
      try {
        recordado =
          new URLSearchParams(window.location.search).get("project") ??
          window.localStorage.getItem("vforge.activeProject") ??
          "";
      } catch {
        recordado = "";
      }
      setActiveProjectId((current) => {
        const candidate = preferredId || current || recordado;
        if (candidate && next.some((item) => item.id === candidate)) return candidate;
        return "";
      });
    } catch {
      setProjects([]);
      setActiveProjectId("");
      setProject(null);
      setLive(null);
      setProjectError(null);
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
          setSessionId(fallbackSessionId(scope));
          setMessages([]);
          setComposerError(null);
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

  const vivo = useMotorVivo();

  // Enlaces viejos de la Sala llegan con ?pide= ya escrito.
  useEffect(() => {
    try {
      const pide = new URLSearchParams(window.location.search).get("pide");
      if (pide) setDraft(pide);
    } catch {
      /* sin parámetros */
    }
  }, []);
  const [editando, setEditando] = useState(false);
  const [verControl, setVerControl] = useState(false);
  // Cada edición commitea sola: esto le dice al panel de control que recargue.
  const [pulsoControl, setPulsoControl] = useState(0);
  const capa = useCapaEdicion({
    proyecto: vivo.proyecto,
    activa: editando && vivo.fase === "vivo",
  });
  // Encargos de V: al cerrar uno con commit, el preview recarga solo (HMR) y el control se refresca.
  const encargos = useEncargos(vivo.fase === "vivo" ? vivo.proyecto : null, () =>
    setPulsoControl((n) => n + 1),
  );

  // El modo edición y el control sólo existen sobre el preview vivo.
  useEffect(() => {
    if (vivo.fase !== "vivo") {
      if (editando) setEditando(false);
      if (verControl) setVerControl(false);
    }
  }, [vivo.fase, editando, verControl]);

  // Cuando la capa escribe un cambio, el historial se entera.
  useEffect(() => {
    if (capa.ultimoCambio) setPulsoControl((n) => n + 1);
  }, [capa.ultimoCambio]);

  const fallbackPreviewUrl = useMemo(
    () => normalizeExternalUrl(project?.domain || project?.vercel_url),
    [project?.domain, project?.vercel_url],
  );

  // Con el motor vivo encendido las vistas dejan de apuntar al deploy y apuntan
  // al dev server del Hetzner. La URL de entrada cambia el token por la galleta
  // de sesión y de ahí sigue a la ruta que pidamos.
  const urlVivo = useCallback(
    (ruta: string) => {
      if (!vivo.urlEntrada) return null;
      const separador = vivo.urlEntrada.includes("?") ? "&" : "?";
      return `${vivo.urlEntrada}${separador}to=${encodeURIComponent(ruta)}`;
    },
    [vivo.urlEntrada],
  );

  const viewports = useMemo(() => {
    if (vivo.fase === "vivo" && vivo.urlEntrada) {
      return {
        desktop: urlVivo("/"),
        mobile: urlVivo("/"),
        admin: urlVivo("/admin"),
      };
    }
    return {
      desktop: normalizeExternalUrl(live?.project.desktop_url) || fallbackPreviewUrl,
      mobile: normalizeExternalUrl(live?.project.mobile_url) || fallbackPreviewUrl,
      admin: normalizeExternalUrl(live?.project.admin_url),
    };
  }, [fallbackPreviewUrl, live, urlVivo, vivo.fase, vivo.urlEntrada]);

  const previewUrlActual =
    vivo.fase === "vivo" && vivo.urlBase ? vivo.urlBase : fallbackPreviewUrl;

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
    } catch {
      setSessionId(fallbackSessionId(activeProjectId || "general"));
      setMessages([]);
      setCurrentModel(null);
      setComposerError(null);
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

  const activeProjectName = project?.name ?? projects.find((item) => item.id === activeProjectId)?.name ?? "VForge";
  const assistantLabel = modelLabel(currentModel);
  const userInitials =
    live?.me.name
      ?.split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "LU";
  const anyPanelOpen = leftPanelOpen || connectorsOpen || widgetsOpen || workspaceOpen;
  const closePanels = useCallback(() => {
    setLeftPanelOpen(false);
    setConnectorsOpen(false);
    setWidgetsOpen(false);
    setWorkspaceOpen(false);
  }, []);
  useEffect(() => {
    if (!anyPanelOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePanels();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [anyPanelOpen, closePanels]);
  const ask = (text: string) => {
    closePanels();
    setMobilePane("build");
    void sendPrompt(text);
  };
  const connectionPill = (active: boolean) =>
    active ? "bg-[#ff5a1f] text-white" : "bg-[#f2f2ef] text-[#71717a]";
  const connectorRows = [
    {
      id: "github",
      label: "GitHub",
      detail: project?.github_repo || (system.connections.has("github") ? "Conectado" : "Pendiente"),
      active: Boolean(project?.github_repo || system.connections.has("github")),
      Icon: IconGithub,
      action: () =>
        system.connections.has("github") || project?.github_repo
          ? ask("Muéstrame mis repos de GitHub, separa los que ya tienen proyecto en VForge y dime cuál conviene abrir primero.")
          : (window.location.href = "/app/integrations"),
    },
    {
      id: "vercel",
      label: "Vercel",
      detail: project?.domain || project?.vercel_url || (system.connections.has("vercel") ? "Conectado" : "Pendiente"),
      active: Boolean(project?.domain || project?.vercel_url || system.connections.has("vercel")),
      Icon: IconTriangle,
      action: () =>
        system.connections.has("vercel") || project?.vercel_url
          ? ask("Revisa mis proyectos de Vercel y dime qué está desplegado, qué está roto y qué falta por conectar.")
          : (window.location.href = "/app/integrations"),
    },
    {
      id: "mind",
      label: "Mind Context",
      detail: system.modelCount ? `${system.modelCount} fuentes/modelos` : "Fuentes",
      active: Boolean(system.modelCount || system.fabric?.models.configured),
      Icon: IconBrain,
      action: () =>
        ask("Abre Mind Context: dime qué fuentes reales tiene este chat y qué fuente falta conectar para vender mejor."),
    },
    {
      id: "mcps",
      label: "MCPs",
      detail:
        system.ojoOnline === true
          ? "MetaMCP listo"
          : system.fabric?.mcp.configured
            ? "MCP activo"
            : "Pendiente",
      active: system.ojoOnline === true || system.fabric?.mcp.configured === true,
      Icon: IconPlug,
      action: () =>
        ask("Abre la fábrica de MCPs: dime qué MCPs están disponibles, cuáles faltan y cuál conviene conectar para este cliente."),
    },
  ];
  const widgetRows = [
    ["Castores", "Porta-widgets", IconPlus, () => ask("Abre Castores como porta-widgets y dime qué apps puedo montar aquí.")],
    ["Trama", "WhatsApp", IconChat, () => ask("Prepara Trama: necesito conectar una conversación de WhatsApp como fuente real.")],
    ["SIP", "Ingreso", IconDatabase, () => ask("Prepara SIP como fuente de entrada y dime qué datos mínimos necesita.")],
    ["Lutor", "Contratos", IconShield, () => ask("Abre Lutor para preparar contrato, alcance y firma del cliente.")],
    ["Gossip", "Mensajes", IconUsers, () => ask("Revisa Gossip: qué mensajes/notificaciones necesita este proyecto.")],
    ["Marketplace", "Apps", IconLayout, () => (window.location.href = "/app/marketplace")],
  ] as const;

  return (
    <div
      className="vf-mobile-stable relative flex h-dvh min-h-0 w-full min-w-0 max-w-full flex-1 overflow-hidden overscroll-none bg-[#fbfaf7] text-[var(--vf-fg)]"
      data-chat-share={Math.round(chatShare)}
      data-mobile-pane={mobilePane}
    >
      {anyPanelOpen ? (
        <button
          type="button"
          aria-label="Cerrar paneles"
          onClick={closePanels}
          className="fixed inset-0 z-30 bg-black/10 backdrop-blur-[2px]"
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[min(86vw,340px)] flex-col border-r border-[#deded8] bg-white pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] shadow-[24px_0_80px_rgba(0,0,0,0.12)] transition-transform duration-300",
          leftPanelOpen ? "translate-x-0" : "-translate-x-full",
        )}
        aria-label="Historial y proyectos"
      >
        <div className="flex h-16 items-center justify-between border-b border-[#ededeb] px-5">
          <div className="flex min-w-0 items-center gap-3">
            <VMark size={18} />
            <div className="min-w-0">
              <p className="truncate text-[12px] font-semibold tracking-[0.28em]">VFORGE</p>
              <p className="truncate text-[11px] text-[#71717a]">Chat profesional</p>
            </div>
          </div>
          <button type="button" onClick={() => setLeftPanelOpen(false)} className="grid h-9 w-9 place-items-center rounded-full border border-[#deded8]" aria-label="Cerrar">
            <IconX size={14} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <button
            type="button"
            onClick={() => {
              setLeftPanelOpen(false);
              void newConversation();
            }}
            disabled={sending || conversationLoading}
            className="mb-4 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-black px-4 text-[13px] font-medium text-white disabled:opacity-40"
          >
            <IconPlus size={14} /> Nuevo chat
          </button>
          <label className="mb-4 block">
            <span className="mb-2 block font-mono text-[10px] uppercase tracking-[0.18em] text-[#71717a]">Proyecto activo</span>
            <span className="relative block">
              <select
                value={activeProjectId}
                onChange={(event) => {
                  setActiveProjectId(event.target.value);
                  setLeftPanelOpen(false);
                }}
                disabled={sending || projectsLoading || projectLoading}
                className="h-12 w-full appearance-none rounded-xl border border-[#deded8] bg-[#fbfaf7] pl-3 pr-9 text-[13px] font-medium disabled:opacity-50"
              >
                <option value="">{projects.length === 0 ? "Sin proyectos" : "Sin proyecto fijo"}</option>
                {projects.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
              <IconChevD size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#71717a]" />
            </span>
          </label>
          <div className="space-y-2">
            <button type="button" onClick={() => setShowCreate(true)} className="flex h-11 w-full items-center gap-3 rounded-xl border border-[#deded8] px-3 text-left text-[13px]">
              <IconPlus size={15} /> Crear proyecto
            </button>
            <Link href="/app/projects" className="flex h-11 w-full items-center gap-3 rounded-xl border border-[#deded8] px-3 text-[13px]">
              <IconLayout size={15} /> Proyectos
            </Link>
            <Link href="/app/marketplace" className="flex h-11 w-full items-center gap-3 rounded-xl border border-[#deded8] px-3 text-[13px]">
              <IconSearch size={15} /> Marketplace
            </Link>
          </div>
        </div>
      </aside>

      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-40 flex w-[min(88vw,380px)] flex-col border-l border-[#deded8] bg-white pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] shadow-[-24px_0_80px_rgba(0,0,0,0.12)] transition-transform duration-300",
          connectorsOpen ? "translate-x-0" : "translate-x-full",
        )}
        aria-label="Conectores"
      >
        <div className="flex h-16 items-center justify-between border-b border-[#ededeb] px-5">
          <div>
            <p className="text-[14px] font-semibold">Conectores</p>
            <p className="text-[11px] text-[#71717a]">{activeProjectName}</p>
          </div>
          <button type="button" onClick={() => setConnectorsOpen(false)} className="grid h-9 w-9 place-items-center rounded-full border border-[#deded8]" aria-label="Cerrar">
            <IconX size={14} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <div className="space-y-2">
            {connectorRows.map(({ id, label, detail, active, Icon, action }) => (
              <button
                key={id}
                type="button"
                onClick={action}
                className="flex min-h-16 w-full items-center gap-3 rounded-2xl border border-[#deded8] bg-[#fbfaf7] px-3 text-left"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white">
                  <Icon size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-[13px]">{label}</b>
                  <small className="block truncate text-[11px] text-[#71717a]">{detail}</small>
                </span>
                <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", connectionPill(active))} aria-hidden />
              </button>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button type="button" onClick={requestDeploy} disabled={!project || sending || !sessionId} className="min-h-12 rounded-xl bg-black px-3 text-[12px] font-medium text-white disabled:opacity-35">
              Desplegar
            </button>
            <button type="button" onClick={() => setWorkspaceOpen(true)} className="min-h-12 rounded-xl border border-[#deded8] px-3 text-[12px] font-medium">
              Ver proyecto
            </button>
          </div>
        </div>
        <div className="hidden sm:block">
          <SystemStrip project={project} system={system} currentModel={currentModel} />
        </div>
      </aside>

      {widgetsOpen ? (
        <section className="fixed inset-x-3 bottom-[calc(98px+env(safe-area-inset-bottom))] z-50 mx-auto max-w-[560px] rounded-[28px] border border-[#deded8] bg-white p-4 shadow-[0_28px_90px_rgba(0,0,0,0.18)] sm:bottom-28" aria-label="Castores widgets">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[14px] font-semibold">Castores</p>
              <p className="text-[11px] text-[#71717a]">Widgets y apps conectables</p>
            </div>
            <button type="button" onClick={() => setWidgetsOpen(false)} className="grid h-9 w-9 place-items-center rounded-full border border-[#deded8]" aria-label="Cerrar Castores">
              <IconX size={14} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {widgetRows.map(([label, caption, Icon, action]) => (
              <button key={label} type="button" onClick={action} className="min-h-[74px] rounded-2xl border border-[#deded8] bg-[#fbfaf7] px-3 py-3 text-left">
                <Icon size={17} />
                <b className="mt-2 block text-[12px]">{label}</b>
                <span className="block text-[10px] text-[#71717a]">{caption}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {workspaceOpen ? (
        <section className="fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-[#deded8] bg-[#fbfaf7] shadow-[-28px_0_90px_rgba(0,0,0,0.16)] lg:w-[min(76vw,1180px)]" aria-label="Preview del proyecto">
          <div className="flex h-14 items-center justify-between border-b border-[#deded8] bg-white px-4">
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold">{activeProjectName}</p>
              <p className="truncate text-[11px] text-[#71717a]">Proyecto y vista previa</p>
            </div>
            <button type="button" onClick={() => setWorkspaceOpen(false)} className="grid h-9 w-9 place-items-center rounded-full border border-[#deded8]" aria-label="Cerrar preview">
              <IconX size={14} />
            </button>
          </div>
          <PreviewHeader
            mode={previewMode}
            setMode={setPreviewMode}
            previewUrl={previewUrlActual}
            onRefresh={() => {
              setPreviewKey((value) => value + 1);
              setDataRefresh((value) => value + 1);
            }}
          />
          <BarraVivo
            encendido={vivo.encendido}
            fase={vivo.fase}
            proyecto={vivo.proyecto}
            setProyecto={vivo.setProyecto}
            motor={vivo.motor}
            error={vivo.error}
            disponible={vivo.disponible}
            onEncender={(nombre) => void vivo.encender(nombre)}
            onApagar={() => void vivo.apagar()}
            editando={editando}
            onEditando={setEditando}
            marcados={capa.marcados}
            verControl={verControl}
            onVerControl={setVerControl}
          />
          <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-page-sm md:p-page-md">
              {previewMode === "canvas" ? (
                <AppCanvas projectId={activeProjectId} projectName={project?.name ?? "Proyecto"} src={previewUrlActual} frameKey={previewKey} />
              ) : !activeProjectId && vivo.fase !== "vivo" ? (
                <NoProject onCreate={() => setShowCreate(true)} />
              ) : activeProjectId && projectLoading && !project ? (
                <div className="grid h-full min-h-[360px] place-items-center border border-[var(--vf-border)] bg-[var(--vf-bg-1)]">
                  <IconLoader size={18} className="animate-spin" />
                </div>
              ) : activeProjectId && projectError && !project ? (
                <div className="grid h-full min-h-[360px] place-items-center border border-[var(--vf-fg)] bg-[var(--vf-bg-1)] p-8 text-center">
                  <div>
                    <p className="text-[13px] font-medium">{projectError}</p>
                    <button type="button" onClick={() => setDataRefresh((value) => value + 1)} className="mt-4 text-[11px] underline underline-offset-4">
                      Volver a intentar
                    </button>
                  </div>
                </div>
              ) : previewMode === "triple" ? (
                <TriplePreview projectName={vivo.fase === "vivo" ? vivo.proyecto : (project?.name ?? "Proyecto")} urls={viewports} frameKey={previewKey} />
              ) : previewMode === "par" ? (
                <ParPreview projectName={vivo.fase === "vivo" ? vivo.proyecto : (project?.name ?? "Proyecto")} urls={{ desktop: viewports.desktop, mobile: viewports.mobile }} frameKey={previewKey} />
              ) : previewMode === "desktop" || previewMode === "mobile" || previewMode === "admin" ? (
                <SinglePreview projectName={vivo.fase === "vivo" ? vivo.proyecto : (project?.name ?? "Proyecto")} mode={previewMode} url={viewports[previewMode]} frameKey={previewKey} />
              ) : null}
            </div>
            {editando && capa.seleccion ? (
              <PanelInspector
                elemento={capa.seleccion}
                guardando={capa.guardando}
                aviso={capa.aviso}
                ultimoCambio={capa.ultimoCambio}
                onEditar={(operacion) => void capa.editar(operacion)}
                onCerrar={capa.limpiar}
                onEncargar={(peticion) => capa.seleccion ? encargos.encargar(peticion, capa.seleccion) : Promise.resolve("Selecciona un elemento.")}
                encargos={encargos.encargos}
                enviando={encargos.enviando}
              />
            ) : null}
            {verControl && vivo.fase === "vivo" ? (
              <PanelControl
                proyecto={vivo.proyecto}
                refrescar={pulsoControl}
                onCerrar={() => setVerControl(false)}
                onCambio={() => {
                  setPreviewKey((value) => value + 1);
                  capa.limpiar();
                }}
              />
            ) : null}
          </div>
        </section>
      ) : null}

      <main className="relative z-10 mx-auto flex h-full min-h-0 w-full min-w-0 max-w-full flex-col px-0 pb-[max(10px,env(safe-area-inset-bottom))] pt-[max(10px,env(safe-area-inset-top))] sm:max-w-[960px] sm:px-5 sm:pt-4">
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 px-3 sm:px-0">
          <button type="button" onClick={() => setLeftPanelOpen(true)} className="grid h-11 w-11 place-items-center rounded-full border border-[#deded8] bg-white shadow-[0_6px_24px_rgba(0,0,0,0.04)]" aria-label="Abrir chats y proyectos">
            <IconMenu size={18} />
          </button>
          <div className="min-w-0 text-center">
            <p className="truncate text-[12px] font-semibold tracking-[0.28em]">VFORGE</p>
            <p className="truncate text-[11px] text-[#71717a]">{assistantLabel ?? activeProjectName}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={() => setConnectorsOpen(true)} className="grid h-11 w-11 place-items-center rounded-full border border-[#deded8] bg-white shadow-[0_6px_24px_rgba(0,0,0,0.04)]" aria-label="Abrir conectores">
              <IconPlug size={17} />
            </button>
            <Link href="/app/perfil" className="grid h-11 w-11 place-items-center rounded-full border border-[#ff5a1f]/35 bg-white text-[12px] font-semibold text-[#ff5a1f]" aria-label="Perfil, usuarios y pagos">
              {userInitials}
            </Link>
          </div>
        </header>

        <section className="mt-2 flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden bg-white sm:rounded-[28px] sm:border sm:border-[#deded8] sm:shadow-[0_22px_80px_rgba(0,0,0,0.08)]">
          <div className="flex min-h-12 shrink-0 items-center justify-between gap-3 border-b border-[#ededeb] px-4">
            <button type="button" onClick={() => setLeftPanelOpen(true)} className="hidden min-w-0 items-center gap-2 text-left text-[12px] text-[#71717a] sm:flex">
              <IconChat size={14} />
              <span className="truncate">{activeProjectName}</span>
            </button>
            <span className="sm:hidden" aria-hidden />
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setWorkspaceOpen(true)} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[#deded8] px-3 text-[11px]">
                <IconLayout size={12} /> Proyecto
              </button>
              <button type="button" onClick={() => void newConversation()} disabled={sending || conversationLoading} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[#deded8] px-3 text-[11px] disabled:opacity-40">
                <IconPlus size={12} /> Nuevo
              </button>
            </div>
          </div>

          <div ref={conversationViewportRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
            {conversationLoading ? (
              <div className="grid h-full min-h-[260px] place-items-center">
                <div className="text-center">
                  <IconLoader size={17} className="mx-auto animate-spin" />
                  <p className="mt-3 font-mono text-label-caps uppercase text-[#71717a]">Recuperando contexto</p>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <EmptyConversation hasProject={Boolean(project)} onSuggestion={(text) => void sendPrompt(text)} />
            ) : (
              <div className="space-y-6">
                {messages.map((message) => <Message key={message.id} message={message} />)}
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-[#ededeb] bg-[#fbfaf7] px-3 py-3 sm:px-4">
            {attachment ? (
              <div className="mb-2 flex items-center justify-between gap-3 rounded-2xl border border-[#deded8] bg-white px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-medium">{attachment.name}</p>
                  <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#71717a]">Imagen adjunta</p>
                </div>
                <button type="button" onClick={() => setAttachment(null)} aria-label="Quitar imagen" className="grid h-8 w-8 place-items-center rounded-full border border-[#deded8]">
                  <IconX size={12} />
                </button>
              </div>
            ) : null}

            <div className="mb-2 grid grid-cols-4 gap-2">
              {connectorRows.map(({ id, label, Icon, action, active }) => (
                <button key={id} type="button" onClick={action} className="relative flex min-h-[66px] min-w-0 flex-col items-center justify-center gap-1 rounded-2xl border border-[#deded8] bg-white px-1 text-center shadow-[0_5px_18px_rgba(0,0,0,0.04)]">
                  <Icon size={17} />
                  <span className="max-w-full whitespace-normal break-words text-[10px] font-semibold leading-[1.05]">{label}</span>
                  <i className={cn("absolute bottom-2 right-2 h-1.5 w-1.5 rounded-full", connectionPill(active))} aria-hidden />
                </button>
              ))}
            </div>

            <form
              onSubmit={(event: FormEvent<HTMLFormElement>) => {
                event.preventDefault();
                void sendPrompt();
              }}
              className="flex min-w-0 items-end gap-2"
            >
              <button type="button" onClick={() => setWidgetsOpen(true)} className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#ff5a1f] text-white shadow-[0_10px_28px_rgba(255,90,31,0.25)]" aria-label="Abrir Castores">
                <IconPlus size={18} />
              </button>
              <div className="min-w-0 flex-1 rounded-[24px] border border-[#deded8] bg-white px-4 py-2 focus-within:border-black">
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void sendPrompt();
                    }
                  }}
                  rows={1}
                  disabled={sending || !sessionId}
                  placeholder={project ? `Trabajar en ${project.name}` : "Trabajar en VForge"}
                  className="max-h-28 min-h-[28px] w-full resize-none bg-transparent py-1 text-[14px] leading-5 outline-none placeholder:text-[#9a9a9a] disabled:opacity-55"
                />
                <div className="flex items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-1">
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
                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={sending} className="grid h-7 w-7 place-items-center rounded-full hover:bg-[#f2f2ef]" aria-label="Adjuntar imagen">
                      <IconClip size={13} />
                    </button>
                  </div>
                  {composerError ? <p className="truncate text-[10px] text-[#71717a]">{composerError}</p> : null}
                </div>
              </div>
              <button type="button" className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-[#deded8] bg-white" aria-label="Dictar">
                <IconMic size={17} />
              </button>
              <button type="submit" disabled={!draft.trim() || sending || !sessionId} className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-black text-white disabled:opacity-25" aria-label="Enviar">
                {sending ? <IconLoader size={15} className="animate-spin" /> : <IconSend size={15} />}
              </button>
            </form>
          </div>
        </section>
      </main>

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

function EmptyConversation({
  hasProject,
  onSuggestion,
}: {
  hasProject: boolean;
  onSuggestion: (text: string) => void;
}) {
  return (
    <div className="flex flex-col py-1">
      <p className="max-w-md text-[13px] leading-5 text-[var(--vf-fg-1)]">
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
      <article className="ml-auto max-w-[88%] rounded-2xl bg-black px-4 py-3 text-white shadow-[0_10px_24px_rgba(0,0,0,0.12)]">
        {message.attachmentName ? (
          <p className="mb-2 flex items-center gap-1.5 font-mono text-label-caps uppercase text-[var(--vf-bg-3)]">
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
          <span className="font-mono text-label-caps uppercase text-[var(--vf-fg-2)]">
            {modelLabel(message.model ?? null) ? `V · ${modelLabel(message.model ?? null)}` : "V"}
          </span>
        </div>
        {message.streaming ? (
          <span className="inline-flex items-center gap-1.5 font-mono text-label-caps uppercase text-[var(--vf-fg-2)]">
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
    { id: "par", label: "Escritorio + móvil" },
    { id: "desktop", label: "Escritorio" },
    { id: "mobile", label: "Móvil" },
    { id: "admin", label: "Admin" },
    { id: "canvas", label: "Canvas" },
  ];
  return (
    <header className="flex min-h-14 shrink-0 items-center justify-between gap-3 border-b border-[var(--vf-border)] bg-[var(--vf-bg-1)] px-page-sm md:px-page-md">
      <div className="flex min-w-0 gap-1 overflow-x-auto py-1">
        {modes.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setMode(item.id)}
            className={cn(
              "h-8 whitespace-nowrap rounded-md px-3 text-[13px] font-medium transition duration-200 ease-out",
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
    <div className="grid h-full min-h-0 grid-cols-3 items-stretch gap-2">
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

/**
 * Escritorio y móvil lado a lado, con el móvil a 390 de verdad (no una columna
 * estrecha): es como Luis revisa que un cambio no rompa el teléfono.
 */
function ParPreview({
  projectName,
  urls,
  frameKey,
}: {
  projectName: string;
  urls: { desktop: string | null; mobile: string | null };
  frameKey: number;
}) {
  if (!urls.desktop && !urls.mobile) return <NoPreview projectName={projectName} />;
  return (
    <div className="flex h-full min-h-0 flex-col items-stretch gap-2 lg:flex-row">
      <div className="min-h-[320px] min-w-0 flex-1">
        <FrameCard
          title="Escritorio"
          kind="desktop"
          url={urls.desktop}
          frameKey={frameKey}
          projectName={projectName}
          single
        />
      </div>
      <div className="min-h-[420px] w-full shrink-0 lg:w-[390px]">
        <FrameCard
          title="Móvil 390"
          kind="mobile"
          url={urls.mobile}
          frameKey={frameKey}
          projectName={projectName}
          single
        />
      </div>
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
  mode: "desktop" | "mobile" | "admin";
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
        "flex min-h-[300px] min-w-0 flex-col overflow-hidden rounded-xl border border-[var(--vf-border)] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.05)]",
        single && "h-full min-h-[440px]",
        kind === "mobile" && single && "mx-auto w-full max-w-[390px]",
      )}
    >
      <header className="flex h-9 shrink-0 items-center justify-between border-b border-[var(--vf-border)] px-3">
        <div className="flex items-center gap-2">
          {kind === "admin" ? <IconShield size={11} /> : <IconLayout size={11} />}
          <span className="font-mono text-label-caps uppercase text-[var(--vf-fg-2)]">
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
            // data-vf-vista: por aquí la capa de edición encuentra las vistas
            // para encender el resaltado en escritorio y móvil a la vez.
            data-vf-vista={kind}
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
    <div className="grid h-full min-h-full place-items-center rounded-xl border border-[var(--vf-border)] bg-white p-8 text-center shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
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
    <div className="grid h-full min-h-full place-items-center rounded-xl border border-[var(--vf-border)] bg-white p-8 text-center shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
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


function GithubMark() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

function VercelMark() {
  return (
    <svg viewBox="0 0 76 65" width="12" height="10" aria-hidden="true">
      <path fill="currentColor" d="M37.5274 0L75.0548 65H0L37.5274 0Z" />
    </svg>
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
    <footer className="flex h-7 shrink-0 items-center gap-3 overflow-hidden border-t border-[var(--vf-border)] bg-[var(--vf-bg)] px-3 text-[11px]">
      {items.map(({ label, detail, active, Icon }) => (
        <Link
          key={label}
          href="/app/integrations"
          className="flex shrink-0 items-center gap-2 text-[var(--vf-fg-1)] transition-colors duration-200 hover:text-[var(--vf-fg)]"
        >
          {label === "GitHub" ? <GithubMark /> : label === "Vercel" ? <VercelMark /> : <Icon size={14} />}
          <span className="text-[12px] text-[var(--vf-fg-2)]">{label}</span>
          <span className="max-w-[140px] truncate text-[12px] text-black">{detail}</span>
          <span className="status-shape shrink-0" data-active={active} />
        </Link>
      ))}
    </footer>
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
              rows={2}
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
