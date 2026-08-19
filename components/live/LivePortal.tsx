"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  Check,
  ExternalLink,
  LayoutDashboard,
  LoaderCircle,
  MessageCircle,
  Monitor,
  Send,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
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

const SEVERITY_COLOR: Record<string, string> = {
  low: "#8e887f",
  medium: "#d19a35",
  high: "#e17642",
  critical: "#c64b3b",
};

const ROLE_LABEL: Record<LiveRole, string> = {
  owner: "Propietario",
  reviewer: "Revisor",
  observer: "Observador",
};

function timeAgo(iso: string) {
  const difference = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(difference / 60000);
  if (minutes < 1) return "ahora";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  return `hace ${Math.floor(hours / 24)} d`;
}

export function LivePortal({ project, me }: { project: LivePortalProject; me: LivePortalMe }) {
  const canSeeAdmin = me.role === "owner" || me.role === "reviewer";
  const isOwner = me.role === "owner";

  return (
    <div className="min-h-dvh bg-[#efede6] pb-12 text-[#1b1a17]">
      <header className="sticky top-0 z-30 border-b border-[#d9d4c9] bg-[#f4f1ea]/94 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 max-w-[1580px] items-center justify-between gap-4 px-5 py-3 sm:px-7 lg:px-9">
          <div className="min-w-0">
            <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#54aa77]" /><p className="truncate text-sm font-semibold text-[#1b1a17]">{project.name}</p></div>
            <p className="mt-1 text-xs text-[#777168]">Sala en vivo · {me.name}</p>
          </div>
          <span className="shrink-0 rounded-full border border-[#cfc9be] bg-white/65 px-3 py-1.5 text-xs font-medium text-[#625e56]">{ROLE_LABEL[me.role]}</span>
        </div>
      </header>

      <div className="mx-auto max-w-[1580px] space-y-6 px-4 pt-6 sm:px-6 lg:px-8">
        <section aria-labelledby="live-views-title">
          <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
            <div><p className="text-xs font-medium text-[#ff5c35]">Ahora mismo</p><h1 id="live-views-title" className="mt-1 text-2xl font-semibold tracking-[-0.045em] text-[#1b1a17]">Las tres vistas</h1></div>
            <p className="text-xs text-[#777168]">Cada pantalla se actualiza desde su URL configurada.</p>
          </div>

          <div className="grid items-start gap-4 xl:grid-cols-[minmax(520px,1.6fr)_minmax(220px,.56fr)_minmax(320px,.84fr)]">
            <Viewport kind="desktop" title="Escritorio" icon={<Monitor className="h-4 w-4" />} url={project.desktop_url} />
            <Viewport kind="mobile" title="Móvil" icon={<Smartphone className="h-4 w-4" />} url={project.mobile_url} />
            {canSeeAdmin ? (
              <Viewport kind="admin" title="Administración" icon={<LayoutDashboard className="h-4 w-4" />} url={project.admin_url} />
            ) : (
              <div className="flex min-h-[260px] flex-col items-center justify-center rounded-[20px] border border-dashed border-[#cfc9be] bg-[#f7f5ef] p-7 text-center">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#ebe7df] text-[#777168]"><ShieldCheck className="h-5 w-5" /></span>
                <p className="mt-4 text-sm font-semibold text-[#1b1a17]">Vista protegida</p>
                <p className="mt-1 max-w-[230px] text-xs leading-5 text-[#777168]">La administración solo está disponible para propietarios y revisores.</p>
              </div>
            )}
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <ActivityFeed projectId={project.id} />
          <CommentsPanel projectId={project.id} />
        </div>

        {isOwner ? <InvitePanel projectId={project.id} /> : null}
      </div>
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
  const frameClass = kind === "mobile" ? "aspect-[9/16] max-h-[620px]" : "aspect-[16/10]";
  return (
    <article className="overflow-hidden rounded-[20px] border border-[#d4cfc5] bg-[#1b1a17] shadow-[0_12px_32px_rgba(38,33,27,.08)]">
      <div className="flex h-11 items-center justify-between border-b border-white/10 px-3.5 text-[#d7d2c9]">
        <div className="flex items-center gap-2">{icon}<span className="text-xs font-medium">{title}</span></div>
        {url ? <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] text-[#aaa49b] transition hover:bg-white/10 hover:text-white"><ExternalLink className="h-3 w-3" />Abrir</a> : null}
      </div>
      {url ? (
        <div className={`relative w-full ${frameClass} bg-white`}>
          <iframe src={url} title={`${title} preview`} className="absolute inset-0 h-full w-full border-0" loading="lazy" referrerPolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-forms allow-popups" />
        </div>
      ) : (
        <div className={`flex w-full ${frameClass} items-center justify-center bg-[#24221f] p-5 text-center`}><p className="max-w-[220px] text-xs leading-5 text-[#aaa49b]">Agrega la URL de {title.toLowerCase()} para verla aquí.</p></div>
      )}
    </article>
  );
}

function PanelTitle({ icon, title, right }: { icon: React.ReactNode; title: string; right?: React.ReactNode }) {
  return <div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-2 text-[#1b1a17]">{icon}<h2 className="text-sm font-semibold tracking-[-0.02em]">{title}</h2></div>{right}</div>;
}

function ActivityFeed({ projectId }: { projectId: string }) {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [streamState, setStreamState] = useState<"connecting" | "live" | "reconnecting">("connecting");
  const sinceRef = useRef<string | null>(null);

  const mergeEvents = useCallback((incoming: EventRow[]) => {
    if (!incoming.length) return;
    setEvents((current) => {
      const seen = new Set(current.map((event) => event.id));
      const fresh = incoming.filter((event) => !seen.has(event.id));
      return [...fresh.reverse(), ...current].slice(0, 60);
    });
  }, []);

  const poll = useCallback(async () => {
    try {
      const query = sinceRef.current ? `?since=${encodeURIComponent(sinceRef.current)}` : "";
      const response = await fetch(`/api/live/${projectId}/events${query}`, { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as { events: EventRow[]; serverTime?: string };
      if (data.events.length) {
        sinceRef.current = data.events[0].ts;
        mergeEvents([...data.events].reverse());
      } else if (!sinceRef.current && data.serverTime) sinceRef.current = data.serverTime;
    } catch {
      // El fallback de polling mantiene el panel disponible.
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
      const query = sinceRef.current ? `?since=${encodeURIComponent(sinceRef.current)}` : "";
      source = new EventSource(`/api/live/${projectId}/events/stream${query}`);
      source.onopen = () => setStreamState("live");
      source.onerror = () => setStreamState("reconnecting");
      source.onmessage = (message) => {
        try {
          const data = JSON.parse(message.data) as { event?: EventRow };
          if (!data.event) return;
          sinceRef.current = data.event.ts;
          mergeEvents([data.event]);
        } catch {
          // Un frame inválido no debe cerrar EventSource.
        }
      };
    }
    void connect();
    const fallback = setInterval(() => void poll(), 30_000);
    return () => { cancelled = true; source?.close(); clearInterval(fallback); };
  }, [mergeEvents, poll, projectId]);

  return (
    <section className="rounded-[20px] border border-[#d9d4c9] bg-[#fbfaf7] p-5">
      <PanelTitle icon={<Activity className="h-4 w-4" />} title="Actividad" right={<span className="flex items-center gap-2 text-[10px] text-[#777168]"><span className={`h-2 w-2 rounded-full ${streamState === "live" ? "bg-[#54aa77]" : "bg-[#d19a35]"}`} />{streamState === "live" ? "En vivo" : "Conectando"}</span>} />
      {!loaded ? <div className="flex justify-center py-10"><LoaderCircle className="h-5 w-5 animate-spin text-[#ff5c35]" /></div> : events.length === 0 ? <p className="py-10 text-center text-sm text-[#777168]">La actividad aparecerá aquí cuando el proyecto cambie.</p> : (
        <div className="max-h-[340px] space-y-1 overflow-y-auto">
          {events.map((event) => (
            <div key={event.id} className="flex gap-3 rounded-[12px] px-2 py-2.5 hover:bg-[#f0ede6]">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: SEVERITY_COLOR[event.severity] ?? SEVERITY_COLOR.low }} />
              <div className="min-w-0"><p className="text-sm font-medium text-[#1b1a17]">{event.event_type}</p>{typeof event.details?.message === "string" ? <p className="mt-0.5 truncate text-xs text-[#777168]">{event.details.message as string}</p> : null}<p className="mt-1 text-[10px] text-[#aaa49b]">{timeAgo(event.ts)}</p></div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function CommentsPanel({ projectId }: { projectId: string }) {
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/live/${projectId}/comments`, { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as { comments: CommentRow[] };
      setComments(data.comments);
    } catch {
      // El panel mantiene el último estado conocido.
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
      const response = await fetch(`/api/live/${projectId}/comments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: text }) });
      if (response.ok) { setBody(""); await load(); }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-[20px] border border-[#d9d4c9] bg-[#fbfaf7] p-5">
      <PanelTitle icon={<MessageCircle className="h-4 w-4" />} title="Comentarios" />
      <div className="flex gap-2">
        <textarea value={body} onChange={(event) => setBody(event.target.value)} rows={2} maxLength={4000} placeholder="Deja una observación para el equipo…" className="min-h-[74px] w-full resize-none rounded-[14px] border border-[#d9d4c9] bg-white px-3 py-2.5 text-sm text-[#1b1a17] outline-none placeholder:text-[#aaa49b] focus:border-[#ff5c35]" />
        <button onClick={send} disabled={busy || !body.trim()} aria-label="Enviar comentario" className="flex w-12 shrink-0 items-center justify-center rounded-[14px] bg-[#ff5c35] text-white transition hover:bg-[#e84a27] disabled:cursor-not-allowed disabled:opacity-40">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</button>
      </div>
      <div className="mt-3 max-h-[290px] space-y-2 overflow-y-auto">
        {!loaded ? <div className="flex justify-center py-8"><LoaderCircle className="h-5 w-5 animate-spin text-[#ff5c35]" /></div> : comments.length === 0 ? <p className="py-8 text-center text-sm text-[#777168]">Todavía no hay comentarios.</p> : comments.map((comment) => (
          <div key={comment.id} className="rounded-[14px] border border-[#e3dfd6] bg-white p-3">
            <div className="flex items-center gap-2"><span className="text-xs font-semibold text-[#1b1a17]">{comment.author_name ?? comment.author_email}</span><span className="text-[10px] text-[#aaa49b]">{timeAgo(comment.created_at)}</span></div>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-5 text-[#625e56]">{comment.body}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-[#8a847a]"><Check className="h-3 w-3" />Solo los miembros del proyecto pueden verlos</p>
    </section>
  );
}
