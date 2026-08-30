"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconChat,
  IconCheck,
  IconExtLink,
  IconLayout,
  IconLoader,
  IconMaximize,
  IconRefresh,
  IconSend,
  IconShield,
  IconX,
} from "@/components/brand/VFIcons";
import { writePendingPrompt } from "@/lib/live/pending-prompt";

type ViewId = "mobile" | "desktop" | "admin";

export interface MobileLiveProject {
  id: string;
  name: string;
  desktop_url: string | null;
  mobile_url: string | null;
  admin_url: string | null;
}

interface CommentRow {
  id: string;
  author_email: string;
  author_name: string | null;
  body: string;
  created_at: string;
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

function timeAgo(iso: string) {
  const timestamp = new Date(iso).getTime();
  if (Number.isNaN(timestamp)) return "";
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
  if (minutes < 1) return "ahora";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  return `hace ${Math.floor(hours / 24)} d`;
}

function isSystemComment(c: CommentRow) {
  return (
    (c.author_name || "").toLowerCase().includes("sistema") ||
    c.body.startsWith("✓ Tarea") ||
    c.body.startsWith("Resuelto sin tarea") ||
    c.body.startsWith("Tarea ")
  );
}

export function MobileLiveShell({
  project,
  canSeeAdmin,
  canAccept = false,
}: {
  project: MobileLiveProject;
  canSeeAdmin: boolean;
  canAccept?: boolean;
}) {
  const [expanded, setExpanded] = useState<ViewId | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const urls = useMemo(
    () => ({
      mobile:
        normalizeUrl(project.mobile_url) || normalizeUrl(project.desktop_url),
      desktop: normalizeUrl(project.desktop_url),
      admin: normalizeUrl(project.admin_url),
    }),
    [project],
  );

  const cards = useMemo(() => {
    const list: {
      id: ViewId;
      label: string;
      subtitle: string;
      url: string | null;
      kind: "phone" | "desktop" | "admin";
    }[] = [
      {
        id: "mobile",
        label: "App",
        subtitle: "Vista móvil",
        url: urls.mobile,
        kind: "phone",
      },
      {
        id: "desktop",
        label: "Web",
        subtitle: "Escritorio",
        url: urls.desktop,
        kind: "desktop",
      },
    ];
    if (canSeeAdmin) {
      list.push({
        id: "admin",
        label: "Admin",
        subtitle: "Panel",
        url: urls.admin,
        kind: "admin",
      });
    }
    return list;
  }, [canSeeAdmin, urls]);

  if (expanded) {
    const card = cards.find((c) => c.id === expanded);
    const url = card?.url ?? null;
    return (
      <div className="flex h-full min-h-0 flex-col bg-black">
        <div className="flex h-11 shrink-0 items-center justify-between bg-black px-2 text-white">
          <button
            type="button"
            onClick={() => setExpanded(null)}
            className="flex h-9 items-center gap-1 rounded-md px-2 text-[13px]"
          >
            <IconX size={16} /> Cerrar
          </button>
          <span className="font-mono text-[9px] uppercase tracking-[0.12em] opacity-70">
            {card?.label}
          </span>
          <div className="flex items-center">
            {url ? (
              <>
                <button
                  type="button"
                  onClick={() => setRefreshKey((k) => k + 1)}
                  className="grid h-9 w-9 place-items-center"
                  aria-label="Actualizar"
                >
                  <IconRefresh size={14} />
                </button>
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="grid h-9 w-9 place-items-center"
                  aria-label="Abrir"
                >
                  <IconExtLink size={14} />
                </a>
              </>
            ) : null}
          </div>
        </div>
        <div className="relative min-h-0 flex-1 bg-white">
          {url ? (
            <iframe
              key={`${expanded}-${refreshKey}`}
              src={url}
              title={`${project.name} ${expanded}`}
              className="absolute inset-0 h-full w-full border-0"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
            />
          ) : (
            <EmptyView label={card?.label ?? "Vista"} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-[#f2f2f0]">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-24 pt-3">
        <p className="mb-3 font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--fg-muted)]">
          Vistas · desliza · toca para ampliar
        </p>

        <div className="flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {cards.map((card) => (
            <DeviceCard
              key={card.id}
              label={card.label}
              subtitle={card.subtitle}
              url={card.url}
              kind={card.kind}
              refreshKey={refreshKey}
              onExpand={() => setExpanded(card.id)}
              onOpenExternal={
                card.url ? () => window.open(card.url!, "_blank") : undefined
              }
            />
          ))}
        </div>

        <p className="mt-2 text-center text-[11px] leading-4 text-[var(--fg-muted)]">
          Ampliar = pantalla completa · Abrir = pestaña nueva sin marco VForge
        </p>
      </div>

      <div className="absolute inset-x-0 bottom-0 border-t border-[var(--border-1)] bg-white/95 backdrop-blur-md pb-[env(safe-area-inset-bottom,0px)]">
        <div className="flex h-14 items-center justify-around px-2">
          <button
            type="button"
            onClick={() => setRefreshKey((k) => k + 1)}
            className="flex flex-col items-center gap-0.5 text-[var(--fg-muted)]"
          >
            <IconRefresh size={18} />
            <span className="font-mono text-[8px] uppercase tracking-[0.08em]">Refresh</span>
          </button>
          <button
            type="button"
            onClick={() => setChatOpen(true)}
            className="flex flex-col items-center gap-0.5 text-black"
          >
            <span className="grid h-10 w-10 place-items-center rounded-full bg-black text-white">
              <IconChat size={18} />
            </span>
            <span className="font-mono text-[8px] uppercase tracking-[0.08em]">Mensajes</span>
          </button>
          <button
            type="button"
            onClick={() => setExpanded("mobile")}
            className="flex flex-col items-center gap-0.5 text-[var(--fg-muted)]"
          >
            <IconMaximize size={18} />
            <span className="font-mono text-[8px] uppercase tracking-[0.08em]">Ampliar</span>
          </button>
        </div>
      </div>

      {chatOpen ? (
        <ChatSheet
          projectId={project.id}
          projectName={project.name}
          canAccept={canAccept}
          onClose={() => setChatOpen(false)}
        />
      ) : null}
    </div>
  );
}

function DeviceCard({
  label,
  subtitle,
  url,
  kind,
  refreshKey,
  onExpand,
  onOpenExternal,
}: {
  label: string;
  subtitle: string;
  url: string | null;
  kind: "phone" | "desktop" | "admin";
  refreshKey: number;
  onExpand: () => void;
  onOpenExternal?: () => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  const isPhone = kind === "phone";
  const designW = isPhone ? 390 : 1280;
  const designH = isPhone ? 844 : 800;
  const frameH = isPhone ? 480 : 260;

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      if (w > 0) setScale(w / designW);
    });
    ro.observe(el);
    setScale(el.clientWidth / designW);
    return () => ro.disconnect();
  }, [designW]);

  return (
    <div className="w-[min(78vw,300px)] shrink-0 snap-center">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <p className="text-[13px] font-medium">{label}</p>
          <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--fg-muted)]">
            {subtitle}
          </p>
        </div>
        <div className="flex gap-1">
          {onOpenExternal ? (
            <button
              type="button"
              onClick={onOpenExternal}
              className="grid h-8 w-8 place-items-center rounded-md border border-[var(--border-1)] bg-white"
              aria-label="Abrir en nueva pestaña"
            >
              <IconExtLink size={12} />
            </button>
          ) : null}
          <button
            type="button"
            onClick={onExpand}
            className="grid h-8 w-8 place-items-center rounded-md border border-black bg-black text-white"
            aria-label="Ampliar"
          >
            <IconMaximize size={12} />
          </button>
        </div>
      </div>

      <div
        ref={frameRef}
        role="button"
        tabIndex={0}
        onClick={onExpand}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onExpand();
          }
        }}
        className={
          isPhone
            ? "relative w-full cursor-pointer overflow-hidden rounded-[28px] border-[3px] border-black bg-white shadow-[0_12px_40px_rgba(0,0,0,0.12)]"
            : "relative w-full cursor-pointer overflow-hidden rounded-xl border border-black bg-white shadow-[0_12px_40px_rgba(0,0,0,0.08)]"
        }
        style={{ height: frameH }}
      >
        {isPhone ? (
          <span className="pointer-events-none absolute left-1/2 top-2 z-20 h-1.5 w-16 -translate-x-1/2 rounded-full bg-black/25" />
        ) : null}

        {url ? (
          <div
            className="absolute left-0 top-0 origin-top-left"
            style={{
              width: designW,
              height: designH,
              transform: `scale(${scale})`,
            }}
          >
            <iframe
              key={`${label}-${refreshKey}`}
              src={url}
              title={label}
              className="pointer-events-none h-full w-full border-0"
              sandbox="allow-scripts allow-same-origin"
              loading="lazy"
              tabIndex={-1}
            />
          </div>
        ) : (
          <div className="grid h-full place-items-center px-4 text-center">
            {kind === "admin" ? (
              <IconShield size={20} className="mx-auto text-[var(--fg-muted)]" />
            ) : (
              <IconLayout size={20} className="mx-auto text-[var(--fg-muted)]" />
            )}
            <p className="mt-2 text-[12px] text-[var(--fg-muted)]">Sin URL aún</p>
            <p className="mt-1 text-[10px] text-[var(--fg-muted)]">
              Se genera cuando haya URL
            </p>
          </div>
        )}

        <span className="absolute inset-0 z-10" aria-hidden />
      </div>
    </div>
  );
}

function EmptyView({ label }: { label: string }) {
  return (
    <div className="grid h-full place-items-center px-6 text-center">
      <div>
        <IconLayout size={22} className="mx-auto" />
        <p className="mt-3 text-[14px] font-medium">Sin URL · {label}</p>
        <p className="mt-2 text-[12px] text-[var(--fg-muted)]">
          Aparecerá cuando el proyecto tenga la URL configurada.
        </p>
      </div>
    </div>
  );
}

function ChatSheet({
  projectId,
  projectName,
  canAccept,
  onClose,
}: {
  projectId: string;
  projectName: string;
  canAccept: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const encoded = encodeURIComponent(projectId);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [acceptedMap, setAcceptedMap] = useState<Record<string, string>>({});
  const [lastAcceptAt, setLastAcceptAt] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/live/${encoded}/comments`, {
        cache: "no-store",
      });
      if (!res.ok) {
        setError("No se pudieron cargar los mensajes.");
        return;
      }
      const data = (await res.json()) as { comments?: CommentRow[] };
      setComments(Array.isArray(data.comments) ? data.comments : []);
      setError(null);
    } catch {
      setError("Mensajes no disponibles.");
    } finally {
      setLoaded(true);
    }
  }, [encoded]);

  useEffect(() => {
    void load();
    const t = window.setInterval(() => void load(), 12_000);
    return () => window.clearInterval(t);
  }, [load]);

  async function send() {
    const text = body.trim();
    if (!text || busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/live/${encoded}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      if (!res.ok) {
        setError("No se pudo enviar.");
        return;
      }
      setBody("");
      await load();
    } catch {
      setError("No se pudo enviar.");
    } finally {
      setBusy(false);
    }
  }

  async function acceptOne(comment: CommentRow, openStudio: boolean) {
    if (!canAccept || acceptingId) return;
    if (Date.now() - lastAcceptAt < 3000) {
      setError("Espera un momento antes de encolar otra tarea.");
      return;
    }
    setAcceptingId(comment.id);
    setError(null);
    try {
      const response = await fetch(
        `/api/live/${encoded}/comments/${encodeURIComponent(comment.id)}/accept`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        },
      );
      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        task?: { id: string; prompt: string };
        estudioPath?: string;
      };
      if (!response.ok || !payload.ok || !payload.task) {
        setError(
          payload.error === "forbidden"
            ? "Solo el owner puede aceptar."
            : "No se pudo encolar.",
        );
        return;
      }
      setLastAcceptAt(Date.now());
      setAcceptedMap((m) => ({ ...m, [comment.id]: payload.task!.id }));
      writePendingPrompt({
        projectId,
        taskId: payload.task.id,
        prompt: payload.task.prompt,
        at: Date.now(),
      });
      await load();
      if (openStudio) {
        onClose();
        router.push(payload.estudioPath || `/app/chat?projectId=${encoded}`);
      }
    } catch {
      setError("No se pudo encolar.");
    } finally {
      setAcceptingId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-label="Cerrar chat"
      />
      <div className="absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom,0px)] shadow-2xl">
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--border-1)] px-4">
          <div>
            <p className="text-[14px] font-medium">Mensajes</p>
            {canAccept ? (
              <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--fg-muted)]">
                Owner · aceptar → cola
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-md border border-[var(--border-1)]"
          >
            <IconX size={14} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
          {!loaded ? (
            <div className="grid min-h-24 place-items-center">
              <IconLoader size={18} className="animate-spin" />
            </div>
          ) : comments.length === 0 ? (
            <p className="pt-6 text-center text-[13px] text-[var(--fg-muted)]">
              Aún no hay mensajes. Escribe el primero.
            </p>
          ) : (
            comments.map((c) => {
              const system = isSystemComment(c);
              const taskId = acceptedMap[c.id];
              return (
                <article
                  key={c.id}
                  className={
                    system
                      ? "rounded-xl border border-black/20 bg-[#eef6ee] p-3"
                      : "rounded-xl border border-[var(--border-1)] bg-[#f7f7f5] p-3"
                  }
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[12px] font-medium">
                      {system
                        ? "Sistema"
                        : c.author_name ?? c.author_email}
                    </p>
                    <span className="shrink-0 font-mono text-[8px] text-[var(--fg-muted)]">
                      {timeAgo(c.created_at)}
                    </span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap break-words text-[13px] leading-5 text-[var(--fg-secondary)]">
                    {c.body}
                  </p>
                  {!system && canAccept ? (
                    <div className="mt-3 flex flex-col gap-2">
                      <button
                        type="button"
                        disabled={!!acceptingId || !!taskId}
                        onClick={() => void acceptOne(c, false)}
                        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-black bg-white text-[13px] font-medium disabled:opacity-40"
                      >
                        {acceptingId === c.id ? (
                          <IconLoader size={16} className="animate-spin" />
                        ) : (
                          <IconCheck size={16} />
                        )}
                        {taskId ? "En cola" : "Aceptar → cola"}
                      </button>
                      <button
                        type="button"
                        disabled={!!acceptingId || !!taskId}
                        onClick={() => void acceptOne(c, true)}
                        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-black text-[13px] font-medium text-white disabled:opacity-40"
                      >
                        Aceptar → Estudio
                      </button>
                    </div>
                  ) : null}
                </article>
              );
            })
          )}
          {error ? <p className="text-[12px] text-black">{error}</p> : null}
        </div>

        <div className="shrink-0 border-t border-[var(--border-1)] p-3">
          <div className="flex items-end gap-2">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={2}
              maxLength={4000}
              placeholder="Escribe un mensaje…"
              className="min-h-[44px] flex-1 resize-none rounded-xl border border-[var(--border-1)] bg-[#f7f7f5] px-3 py-2.5 text-[14px]"
            />
            <button
              type="button"
              onClick={() => void send()}
              disabled={busy || !body.trim()}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-black text-white disabled:opacity-40"
              aria-label="Enviar"
            >
              {busy ? (
                <IconLoader size={16} className="animate-spin" />
              ) : (
                <IconSend size={16} />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
