"use client";
/**
 * Portal en vivo del proyecto — 3 viewports simultáneos (desktop / mobile /
 * admin) + actividad en vivo + comentarios, con el look VForge.
 *
 * El viewport ADMIN solo se muestra a reviewer/owner. La actividad hace
 * short-polling seguro a /api/live/[id]/events (aislado por proyecto). Sin
 * dependencias extra (fetch + hooks nativos).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  IconGlobe,
  IconLayout,
  IconShield,
  IconChat,
  IconActivity,
  IconSend,
  IconLoader,
  IconExtLink,
  IconCheck,
} from "@/components/brand/VFIcons";
import type { LiveRole } from "@/lib/projects/roles";
import { InvitePanel } from "@/components/live/InvitePanel";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

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

const SEV_COLOR: Record<string, string> = {
  low: "#64748b",
  medium: "#fbbf24",
  high: "#fb923c",
  critical: "#f87171",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
}

const ROLE_LABEL: Record<LiveRole, string> = {
  owner: "Owner",
  reviewer: "Revisor",
  observer: "Observador",
};

export function LivePortal({
  project,
  me,
}: {
  project: LivePortalProject;
  me: LivePortalMe;
}) {
  const canSeeAdmin = me.role === "owner" || me.role === "reviewer";
  const isOwner = me.role === "owner";

  return (
    <div className="min-h-screen bg-[#03020a] pb-20">
      {/* Header */}
      <div className="sticky top-0 z-20 border-b border-[var(--border-1)] bg-[#03020a]/85 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 px-5 py-3.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">
              {project.name}
            </p>
            <p className="text-[11px] text-[var(--fg-muted)]">
              Portal en vivo · {me.name}
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-violet-500/25 bg-violet-500/10 px-3 py-1 text-[10px] font-medium uppercase tracking-wide text-violet-200">
            {ROLE_LABEL[me.role]}
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-[1440px] space-y-6 px-4 pt-6 md:px-6">
        {/* Viewports */}
        <section>
          <SectionTitle icon={<IconLayout size={14} />} title="Vista en vivo" />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Viewport
              kind="desktop"
              title="Escritorio"
              icon={<IconGlobe size={13} />}
              url={project.desktop_url}
            />
            <Viewport
              kind="mobile"
              title="Móvil"
              icon={<IconLayout size={13} />}
              url={project.mobile_url}
            />
            {canSeeAdmin ? (
              <Viewport
                kind="admin"
                title="Admin"
                icon={<IconShield size={13} />}
                url={project.admin_url}
              />
            ) : (
              <div className="flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border-1)] bg-[#0a0a12] p-6 text-center">
                <IconShield size={20} className="text-[var(--fg-muted)]" />
                <p className="mt-2 text-[12px] text-[var(--fg-muted)]">
                  El viewport admin es solo para revisores.
                </p>
              </div>
            )}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ActivityFeed projectId={project.id} />
          <CommentsPanel projectId={project.id} />
        </div>

        {isOwner && <InvitePanel projectId={project.id} />}
      </div>
    </div>
  );
}

function SectionTitle({
  icon,
  title,
  right,
}: {
  icon: React.ReactNode;
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <div className="flex items-center gap-2 text-violet-300">
        {icon}
        <span className="text-[13px] font-semibold text-[var(--fg-primary)]">
          {title}
        </span>
      </div>
      {right}
    </div>
  );
}

function Viewport({
  kind,
  title,
  icon,
  url,
}: {
  kind: "desktop" | "mobile" | "admin";
  title: string;
  icon: React.ReactNode;
  url: string | null;
}) {
  const frameClass =
    kind === "mobile"
      ? "aspect-[9/16] max-h-[520px]"
      : "aspect-[16/10]";
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ease: EASE }}
      className="overflow-hidden rounded-2xl border border-[var(--border-1)] bg-[#0a0a12]"
    >
      <div className="flex items-center justify-between border-b border-[var(--border-1)] px-3 py-2">
        <div className="flex items-center gap-1.5 text-[var(--fg-tertiary)]">
          {icon}
          <span className="text-[11px] font-medium">{title}</span>
        </div>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-[10px] text-violet-300 hover:text-violet-200"
          >
            <IconExtLink size={11} /> abrir
          </a>
        )}
      </div>
      {url ? (
        <div className={`relative w-full ${frameClass} bg-black`}>
          <iframe
            src={url}
            title={`${title} preview`}
            className="absolute inset-0 h-full w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        </div>
      ) : (
        <div className={`flex w-full ${frameClass} items-center justify-center bg-[#07060f] p-4 text-center`}>
          <p className="text-[11px] text-[var(--fg-muted)]">
            Sin URL configurada para {title.toLowerCase()}.
          </p>
        </div>
      )}
    </motion.div>
  );
}

function ActivityFeed({ projectId }: { projectId: string }) {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [streamState, setStreamState] = useState<"connecting" | "live" | "reconnecting">(
    "connecting",
  );
  const sinceRef = useRef<string | null>(null);

  const mergeEvents = useCallback((incoming: EventRow[]) => {
    if (incoming.length === 0) return;
    setEvents((prev) => {
      const seen = new Set(prev.map((event) => event.id));
      const fresh = incoming.filter((event) => !seen.has(event.id));
      return [...fresh.reverse(), ...prev].slice(0, 60);
    });
  }, []);

  const poll = useCallback(async () => {
    try {
      const qs = sinceRef.current ? `?since=${encodeURIComponent(sinceRef.current)}` : "";
      const res = await fetch(`/api/live/${projectId}/events${qs}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as { events: EventRow[]; serverTime?: string };
      if (data.events.length > 0) {
        sinceRef.current = data.events[0].ts;
        mergeEvents([...data.events].reverse());
      } else if (!sinceRef.current && data.serverTime) {
        sinceRef.current = data.serverTime;
      }
    } catch {
      /* silencioso */
    } finally {
      setLoaded(true);
    }
  }, [mergeEvents, projectId]);

  useEffect(() => {
    let cancelled = false;
    let source: EventSource | null = null;

    async function connect() {
      await poll();
      if (cancelled) return;

      const qs = sinceRef.current
        ? `?since=${encodeURIComponent(sinceRef.current)}`
        : "";
      source = new EventSource(`/api/live/${projectId}/events/stream${qs}`);
      source.onopen = () => setStreamState("live");
      source.onerror = () => setStreamState("reconnecting");
      source.onmessage = (message) => {
        try {
          const data = JSON.parse(message.data) as { event?: EventRow };
          if (!data.event) return;
          sinceRef.current = data.event.ts;
          mergeEvents([data.event]);
        } catch {
          /* ignora un frame inválido; EventSource sigue conectado */
        }
      };
    }

    void connect();
    const fallback = setInterval(() => void poll(), 30_000);
    return () => {
      cancelled = true;
      source?.close();
      clearInterval(fallback);
    };
  }, [mergeEvents, poll, projectId]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ease: EASE }}
      className="rounded-2xl border border-[var(--border-1)] bg-[#0a0a12] p-4"
    >
      <SectionTitle
        icon={<IconActivity size={14} />}
        title="Actividad en vivo"
        right={
          <span className="flex items-center gap-1 text-[10px] text-[var(--fg-muted)]">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                streamState === "live" ? "bg-emerald-400" : "bg-amber-400"
              }`}
            />
            {streamState === "live" ? "en vivo" : "conectando"}
          </span>
        }
      />
      {!loaded ? (
        <div className="flex justify-center py-6">
          <IconLoader size={16} className="animate-spin text-violet-400" />
        </div>
      ) : events.length === 0 ? (
        <p className="py-6 text-center text-[12px] text-[var(--fg-muted)]">
          Aún no hay actividad registrada.
        </p>
      ) : (
        <div className="max-h-[360px] space-y-2.5 overflow-y-auto pr-1">
          {events.map((e) => (
            <div key={e.id} className="flex gap-2.5">
              <span
                className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                style={{
                  background: SEV_COLOR[e.severity] ?? SEV_COLOR.low,
                  boxShadow: `0 0 6px ${SEV_COLOR[e.severity] ?? SEV_COLOR.low}80`,
                }}
              />
              <div className="min-w-0">
                <p className="text-[12px] font-medium text-[var(--fg-primary)]">
                  {e.event_type}
                </p>
                {typeof e.details?.message === "string" && (
                  <p className="truncate text-[11px] text-[var(--fg-tertiary)]">
                    {e.details.message as string}
                  </p>
                )}
                <p className="text-[10px] text-[var(--fg-muted)]">
                  {timeAgo(e.ts)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function CommentsPanel({ projectId }: { projectId: string }) {
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/live/${projectId}/comments`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as { comments: CommentRow[] };
      setComments(data.comments);
    } catch {
      /* silencioso */
    } finally {
      setLoaded(true);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 8_000);
    return () => clearInterval(timer);
  }, [load]);

  async function send() {
    const text = body.trim();
    if (!text || busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/live/${projectId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      if (res.ok) {
        setBody("");
        await load();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ease: EASE }}
      className="rounded-2xl border border-[var(--border-1)] bg-[#0a0a12] p-4"
    >
      <SectionTitle icon={<IconChat size={14} />} title="Comentarios" />
      <div className="flex gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          maxLength={4000}
          placeholder="Escribe un comentario…"
          className="w-full resize-none rounded-xl border border-[var(--border-1)] bg-[var(--surface-1)] px-3 py-2.5 text-[13px] text-white placeholder-white/25 outline-none focus:border-violet-500/50"
        />
        <button
          onClick={send}
          disabled={busy || !body.trim()}
          aria-label="Enviar comentario"
          className="flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 px-3 text-white transition active:scale-95 disabled:opacity-40"
        >
          {busy ? <IconLoader size={15} className="animate-spin" /> : <IconSend size={15} />}
        </button>
      </div>

      <div className="mt-3 max-h-[300px] space-y-2 overflow-y-auto pr-1">
        {!loaded ? (
          <div className="flex justify-center py-6">
            <IconLoader size={16} className="animate-spin text-violet-400" />
          </div>
        ) : comments.length === 0 ? (
          <p className="py-4 text-center text-[12px] text-[var(--fg-muted)]">
            Sin comentarios todavía.
          </p>
        ) : (
          comments.map((c) => (
            <div
              key={c.id}
              className="rounded-xl border border-[var(--border-1)] bg-[var(--surface-1)] p-3"
            >
              <div className="mb-1 flex items-center gap-2">
                <span className="text-[11px] font-medium text-[var(--fg-secondary)]">
                  {c.author_name ?? c.author_email}
                </span>
                <span className="text-[10px] text-[var(--fg-muted)]">
                  {timeAgo(c.created_at)}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-[13px] text-[var(--fg-primary)]">
                {c.body}
              </p>
            </div>
          ))
        )}
      </div>
      <p className="mt-2 flex items-center justify-center gap-1.5 text-[10px] text-[var(--fg-muted)]">
        <IconCheck size={10} /> Solo visible para los miembros del proyecto
      </p>
    </motion.div>
  );
}
