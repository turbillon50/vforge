"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { VWordmark } from "@/components/brand/VMark";
import {
  IconActivity,
  IconArrowL,
  IconChat,
  IconCheck,
  IconExtLink,
  IconLayout,
  IconLoader,
  IconMenu,
  IconRefresh,
  IconSend,
  IconShield,
  IconUsers,
  IconX,
} from "@/components/brand/VFIcons";
import type { LiveRole } from "@/lib/projects/roles";
import { InvitePanel } from "@/components/live/InvitePanel";

export interface LivePortalProject {
  id: string;
  name: string;
  status: string;
  desktop_url: string | null;
  mobile_url: string | null;
  admin_url: string | null;
}

export interface LivePortalMe {
  name: string;
  role: LiveRole;
  isPlatformOwner: boolean;
}

interface EventRow {
  id: string;
  event_type: string;
  details: Record<string, unknown>;
  severity: string;
  ts: string;
}

interface CommentRow {
  id: string;
  author_email: string;
  author_name: string | null;
  body: string;
  created_at: string;
}

const ROLE_LABEL: Record<LiveRole, string> = {
  owner: "Owner",
  reviewer: "Revisor",
  observer: "Observador",
};

function timeAgo(iso: string) {
  const timestamp = new Date(iso).getTime();
  if (Number.isNaN(timestamp)) return "fecha desconocida";
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
  if (minutes < 1) return "ahora";
  if (minutes < 60) return "hace " + minutes + " min";
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return "hace " + hours + " h";
  return "hace " + Math.floor(hours / 24) + " d";
}

function normalizeUrl(value: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? parsed.href
      : null;
  } catch {
    return null;
  }
}

export function LivePortal({
  project,
  me,
}: {
  project: LivePortalProject;
  me: LivePortalMe;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const canSeeAdmin = me.role === "owner" || me.role === "reviewer";
  const canInvite = me.role === "owner";

  useEffect(() => {
    if (!drawerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen]);

  return (
    <div className="flex h-dvh overflow-hidden bg-white text-black">
      <aside className="hidden h-dvh w-[208px] shrink-0 border-r border-[var(--border-1)] bg-white lg:block">
        <LiveSidebar project={project} me={me} />
      </aside>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-black/30"
            onClick={() => setDrawerOpen(false)}
            aria-label="Cerrar menú"
          />
          <aside className="absolute inset-y-0 left-0 w-[min(86vw,300px)] border-r border-black bg-white">
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-md border border-[var(--border-1)] bg-white"
              aria-label="Cerrar menú"
            >
              <IconX size={14} />
            </button>
            <LiveSidebar project={project} me={me} />
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex min-h-[74px] shrink-0 items-center justify-between gap-4 border-b border-[var(--border-1)] bg-white px-4 md:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-[var(--border-1)] lg:hidden"
              aria-label="Abrir menú"
            >
              <IconMenu size={16} />
            </button>
            <div className="min-w-0">
              <p className="mono-label flex items-center gap-2">
                <span className="status-shape" data-active="true" />
                Portal autorizado · {project.status}
              </p>
              <h1 className="mt-1 truncate text-[22px] font-medium tracking-[-0.04em] md:text-[26px]">
                {project.name}
              </h1>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden rounded-full border border-black px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.12em] sm:inline-flex">
              {ROLE_LABEL[me.role]}
            </span>
            {canInvite ? (
              <a href="#live-invitations" className="btn-primary !min-h-9 !px-3">
                <IconUsers size={12} /> <span className="hidden sm:inline">Invitar</span>
              </a>
            ) : null}
          </div>
        </header>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <main className="min-w-0 flex-1 overflow-y-auto bg-[#f7f7f5] p-3 md:p-4">
            <div className="grid items-start gap-3 xl:grid-cols-[minmax(280px,1.12fr)_minmax(150px,0.48fr)_minmax(260px,0.92fr)] 2xl:grid-cols-[minmax(360px,1.25fr)_minmax(220px,0.58fr)_minmax(320px,0.95fr)]">
              <Viewport
                kind="desktop"
                title="Escritorio"
                url={project.desktop_url}
              />
              <Viewport kind="mobile" title="Móvil" url={project.mobile_url} />
              {canSeeAdmin ? (
                <Viewport
                  kind="admin"
                  title="Administración"
                  url={project.admin_url}
                />
              ) : (
                <section className="flex min-h-[260px] flex-col items-center justify-center border border-dashed border-black bg-white p-6 text-center">
                  <IconShield size={19} />
                  <p className="mt-3 text-[12px] font-medium text-black">
                    Administración restringida
                  </p>
                  <p className="mt-1 max-w-xs text-[11px] leading-5">
                    Tu rol puede observar las vistas públicas del proyecto, pero
                    no recibió alcance administrativo.
                  </p>
                </section>
              )}
            </div>

            <div className="mt-3 grid gap-3 xl:hidden">
              <ActivityFeed projectId={project.id} />
              <CommentsPanel projectId={project.id} />
            </div>

            {canInvite ? (
              <div id="live-invitations" className="mt-3 scroll-mt-4">
                <InvitePanel projectId={project.id} />
              </div>
            ) : null}
          </main>

          <aside className="hidden h-full w-[300px] shrink-0 overflow-y-auto border-l border-[var(--border-1)] bg-white xl:block 2xl:w-[320px]">
            <ActivityFeed projectId={project.id} rail />
            <CommentsPanel projectId={project.id} rail />
          </aside>
        </div>
      </div>
    </div>
  );
}

function LiveSidebar({
  project,
  me,
}: {
  project: LivePortalProject;
  me: LivePortalMe;
}) {
  const views = [
    { label: "Escritorio", available: Boolean(normalizeUrl(project.desktop_url)) },
    { label: "Móvil", available: Boolean(normalizeUrl(project.mobile_url)) },
    {
      label: "Administración",
      available:
        (me.role === "owner" || me.role === "reviewer") &&
        Boolean(normalizeUrl(project.admin_url)),
    },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[var(--border-1)] px-5 py-5">
        <VWordmark />
        <p className="mt-2 font-mono text-[8px] uppercase tracking-[0.17em] text-[var(--fg-muted)]">
          Live control room
        </p>
      </div>

      <div className="px-4 py-5">
        <Link
          href="/app/projects"
          className="inline-flex items-center gap-2 text-[11px] text-[var(--fg-muted)] hover:text-black"
        >
          <IconArrowL size={12} /> Proyectos
        </Link>

        <div className="mt-7 border-l-2 border-black pl-3">
          <p className="text-[13px] font-medium leading-5 text-black">{project.name}</p>
          <p className="mt-1 font-mono text-[8px] uppercase tracking-[0.13em] text-[var(--fg-muted)]">
            {ROLE_LABEL[me.role]}
          </p>
        </div>
      </div>

      <nav className="border-t border-[var(--border-1)] px-4 py-5" aria-label="Vistas de la sala">
        <p className="mono-label mb-3">Viewports</p>
        <div className="space-y-1">
          {views.map((view) => (
            <div
              key={view.label}
              className="flex items-center justify-between rounded-md px-2 py-2 text-[11px]"
            >
              <span>{view.label}</span>
              <span
                className="status-shape"
                data-active={view.available}
                aria-label={view.available ? "Disponible" : "No disponible"}
              />
            </div>
          ))}
        </div>
      </nav>

      <div className="mt-auto border-t border-[var(--border-1)] px-5 py-5">
        <p className="mono-label">Estado del proyecto</p>
        <p className="mt-2 break-words text-[11px] text-black">{project.status}</p>
        <p className="mt-4 text-[9px] leading-4 text-[var(--fg-muted)]">
          La sala sólo muestra URLs y eventos autorizados para este proyecto.
        </p>
      </div>
    </div>
  );
}

function Viewport({
  kind,
  title,
  url: rawUrl,
  className,
}: {
  kind: "desktop" | "mobile" | "admin";
  title: string;
  url: string | null;
  className?: string;
}) {
  const [refreshKey, setRefreshKey] = useState(0);
  const url = useMemo(() => normalizeUrl(rawUrl), [rawUrl]);
  const frameClass =
    kind === "mobile"
      ? "min-h-[520px] aspect-[9/16] xl:min-h-[380px] 2xl:min-h-[520px]"
      : "min-h-[380px] aspect-[16/10]";

  return (
    <section
      className={cn(
        "min-w-0 overflow-hidden rounded-[8px] border border-[var(--border-1)] bg-white",
        className,
      )}
    >
      <header className="flex h-10 items-center justify-between border-b border-[var(--border-1)] px-3">
        <div className="flex items-center gap-2">
          {kind === "admin" ? <IconShield size={12} /> : <IconLayout size={12} />}
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--fg-muted)]">
            {title}
          </span>
        </div>
        {url ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setRefreshKey((value) => value + 1)}
              className="grid h-7 w-7 place-items-center rounded-md hover:bg-[#f2f2f0]"
              aria-label={"Actualizar vista " + title}
            >
              <IconRefresh size={11} />
            </button>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="grid h-7 w-7 place-items-center rounded-md hover:bg-[#f2f2f0]"
              aria-label={"Abrir vista " + title + " en otra pestaña"}
            >
              <IconExtLink size={11} />
            </a>
          </div>
        ) : null}
      </header>

      {url ? (
        <div className={cn("relative w-full overflow-hidden bg-white", frameClass)}>
          <iframe
            key={refreshKey}
            src={url}
            title={"Vista " + title + " de " + rawUrl}
            className="absolute inset-0 h-full w-full border-0 bg-white"
            loading="lazy"
            referrerPolicy="no-referrer"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        </div>
      ) : (
        <div className={cn("grid w-full place-items-center bg-white p-6 text-center", frameClass)}>
          <div>
            <p className="text-[12px] font-medium text-black">
              Sin URL para {title.toLowerCase()}
            </p>
            <p className="mt-2 max-w-xs text-[10px] leading-4 text-[var(--fg-muted)]">
              Esta vista aparecerá cuando el proyecto tenga una URL autorizada.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

function ActivityFeed({
  projectId,
  rail = false,
}: {
  projectId: string;
  rail?: boolean;
}) {
  const encodedProjectId = encodeURIComponent(projectId);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamState, setStreamState] = useState<
    "connecting" | "live" | "reconnecting"
  >("connecting");
  const sinceRef = useRef<string | null>(null);

  const mergeEvents = useCallback((incoming: EventRow[]) => {
    if (incoming.length === 0) return;
    setEvents((previous) => {
      const existing = new Set(previous.map((event) => event.id));
      const fresh = incoming.filter((event) => !existing.has(event.id));
      return [...fresh, ...previous].slice(0, 60);
    });
  }, []);

  const poll = useCallback(async () => {
    try {
      const suffix = sinceRef.current
        ? "?since=" + encodeURIComponent(sinceRef.current)
        : "";
      const response = await fetch(
        "/api/live/" + encodedProjectId + "/events" + suffix,
        { cache: "no-store" },
      );
      if (!response.ok) {
        setError("No se pudo leer la actividad.");
        return;
      }
      const payload = (await response.json()) as {
        events?: EventRow[];
        serverTime?: string;
      };
      const next = Array.isArray(payload.events) ? payload.events : [];
      if (next.length > 0) {
        sinceRef.current = next[0]?.ts ?? sinceRef.current;
        mergeEvents(next);
      } else if (!sinceRef.current && payload.serverTime) {
        sinceRef.current = payload.serverTime;
      }
      setError(null);
    } catch {
      setError("La actividad no está disponible en este momento.");
    } finally {
      setLoaded(true);
    }
  }, [encodedProjectId, mergeEvents]);

  useEffect(() => {
    let cancelled = false;
    let source: EventSource | null = null;

    async function connect() {
      await poll();
      if (cancelled) return;
      const suffix = sinceRef.current
        ? "?since=" + encodeURIComponent(sinceRef.current)
        : "";
      source = new EventSource(
        "/api/live/" + encodedProjectId + "/events/stream" + suffix,
      );
      source.onopen = () => setStreamState("live");
      source.onerror = () => setStreamState("reconnecting");
      source.onmessage = (message) => {
        try {
          const payload = JSON.parse(message.data) as { event?: EventRow };
          if (!payload.event) return;
          sinceRef.current = payload.event.ts;
          mergeEvents([payload.event]);
        } catch {
          // Un frame inválido no interrumpe el canal.
        }
      };
    }

    void connect();
    const fallback = window.setInterval(() => void poll(), 30_000);
    return () => {
      cancelled = true;
      source?.close();
      window.clearInterval(fallback);
    };
  }, [encodedProjectId, mergeEvents, poll]);

  return (
    <section
      className={cn(
        "bg-white",
        rail
          ? "border-b border-[var(--border-1)] px-5 py-5"
          : "rounded-[8px] border border-[var(--border-1)] p-4",
      )}
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <IconActivity size={13} />
          <h2 className="text-[12px] font-medium">Actividad en vivo</h2>
        </div>
        <span className="flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--fg-muted)]">
          <span
            className="status-shape"
            data-active={streamState === "live"}
          />
          {streamState === "live" ? "Conectado" : "Conectando"}
        </span>
      </div>

      {!loaded ? (
        <div className="grid min-h-28 place-items-center">
          <IconLoader size={14} className="animate-spin" />
        </div>
      ) : error ? (
        <p className="mt-5 border-l border-black pl-3 text-[11px] leading-5">{error}</p>
      ) : events.length === 0 ? (
        <p className="mt-5 border-l border-[var(--border-1)] pl-3 text-[11px] leading-5 text-[var(--fg-muted)]">
          Aún no hay eventos registrados para este proyecto.
        </p>
      ) : (
        <div className={cn("mt-5 space-y-4 overflow-y-auto pr-1", rail ? "max-h-[300px]" : "max-h-[360px]")}>
          {events.map((event) => (
            <article key={event.id} className="border-l border-black/20 pl-3">
              <div className="flex items-start justify-between gap-2">
                <p className="break-words text-[11px] font-medium text-black">
                  {event.event_type}
                </p>
                <span className="mt-1 status-shape shrink-0" data-active={event.severity === "critical"} />
              </div>
              {typeof event.details?.message === "string" ? (
                <p className="mt-1 break-words text-[10px] leading-4 text-[var(--fg-muted)]">
                  {event.details.message}
                </p>
              ) : null}
              <p className="mt-1 font-mono text-[8px] text-[var(--fg-muted)]">
                {timeAgo(event.ts)}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function CommentsPanel({
  projectId,
  rail = false,
}: {
  projectId: string;
  rail?: boolean;
}) {
  const encodedProjectId = encodeURIComponent(projectId);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch(
        "/api/live/" + encodedProjectId + "/comments",
        { cache: "no-store" },
      );
      if (!response.ok) {
        setError("No se pudieron cargar los comentarios.");
        return;
      }
      const payload = (await response.json()) as { comments?: CommentRow[] };
      setComments(Array.isArray(payload.comments) ? payload.comments : []);
      setError(null);
    } catch {
      setError("Los comentarios no están disponibles.");
    } finally {
      setLoaded(true);
    }
  }, [encodedProjectId]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 10_000);
    return () => window.clearInterval(timer);
  }, [load]);

  async function send() {
    const text = body.trim();
    if (!text || busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        "/api/live/" + encodedProjectId + "/comments",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: text }),
        },
      );
      if (!response.ok) {
        setError("No se pudo publicar el comentario.");
        return;
      }
      setBody("");
      await load();
    } catch {
      setError("No se pudo publicar el comentario.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className={cn(
        "bg-white",
        rail ? "px-5 py-5" : "rounded-[8px] border border-[var(--border-1)] p-4",
      )}
    >
      <div className="flex items-center gap-2">
        <IconChat size={13} />
        <h2 className="text-[12px] font-medium">Comentarios</h2>
      </div>

      <div className="mt-4">
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
              event.preventDefault();
              void send();
            }
          }}
          rows={3}
          maxLength={4000}
          placeholder="Deja una observación…"
          className="w-full resize-y rounded-md border border-[var(--border-1)] bg-white px-3 py-2.5 text-[12px] text-black placeholder:text-[var(--fg-muted)] focus:border-black"
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={busy || !body.trim()}
          className="btn-primary mt-2 w-full disabled:opacity-40"
        >
          {busy ? <IconLoader size={13} className="animate-spin" /> : <IconSend size={13} />}
          Comentar
        </button>
      </div>

      {error ? (
        <p className="mt-3 text-[10px] leading-4 text-black">{error}</p>
      ) : null}

      <div className={cn("mt-5 space-y-3 overflow-y-auto pr-1", rail ? "max-h-[360px]" : "max-h-[300px]")}>
        {!loaded ? (
          <div className="grid min-h-20 place-items-center">
            <IconLoader size={13} className="animate-spin" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-[11px] leading-5 text-[var(--fg-muted)]">
            No hay comentarios todavía.
          </p>
        ) : (
          comments.map((comment) => (
            <article
              key={comment.id}
              className="rounded-md border border-[var(--border-1)] bg-[#f7f7f5] p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-[10px] font-medium text-black">
                  {comment.author_name ?? comment.author_email}
                </p>
                <span className="shrink-0 font-mono text-[8px] text-[var(--fg-muted)]">
                  {timeAgo(comment.created_at)}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-wrap break-words text-[11px] leading-5 text-[var(--fg-secondary)]">
                {comment.body}
              </p>
            </article>
          ))
        )}
      </div>

      <p className="mt-4 flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--fg-muted)]">
        <IconCheck size={10} /> Sólo miembros del proyecto
      </p>
    </section>
  );
}
