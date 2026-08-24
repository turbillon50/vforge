"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  IconChat,
  IconExtLink,
  IconLayout,
  IconLoader,
  IconRefresh,
  IconSend,
  IconShield,
} from "@/components/brand/VFIcons";

type TabId = "desktop" | "mobile" | "admin" | "comments";

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

/**
 * Shell móvil de la sala: una vista a la vez + tab bar fija (PWA).
 */
export function MobileLiveShell({
  project,
  canSeeAdmin,
}: {
  project: MobileLiveProject;
  canSeeAdmin: boolean;
}) {
  const tabs = useMemo(() => {
    const list: { id: TabId; label: string }[] = [
      { id: "desktop", label: "Web" },
      { id: "mobile", label: "App" },
    ];
    if (canSeeAdmin) list.push({ id: "admin", label: "Admin" });
    list.push({ id: "comments", label: "Chat" });
    return list;
  }, [canSeeAdmin]);

  const [tab, setTab] = useState<TabId>("mobile");
  const [refreshKey, setRefreshKey] = useState(0);

  const urls = useMemo(
    () => ({
      desktop: normalizeUrl(project.desktop_url),
      mobile: normalizeUrl(project.mobile_url) || normalizeUrl(project.desktop_url),
      admin: normalizeUrl(project.admin_url),
    }),
    [project],
  );

  const activeUrl =
    tab === "desktop"
      ? urls.desktop
      : tab === "mobile"
        ? urls.mobile
        : tab === "admin"
          ? urls.admin
          : null;

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      {/* Toolbar compacta */}
      {tab !== "comments" ? (
        <div className="flex h-11 shrink-0 items-center justify-between border-b border-[var(--border-1)] px-3">
          <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--fg-muted)]">
            {tab === "desktop" ? "Escritorio" : tab === "mobile" ? "Móvil" : "Administración"}
          </span>
          <div className="flex items-center gap-1">
            {activeUrl ? (
              <>
                <button
                  type="button"
                  onClick={() => setRefreshKey((k) => k + 1)}
                  className="grid h-9 w-9 place-items-center rounded-md active:bg-[#f2f2f0]"
                  aria-label="Actualizar"
                >
                  <IconRefresh size={14} />
                </button>
                <a
                  href={activeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="grid h-9 w-9 place-items-center rounded-md active:bg-[#f2f2f0]"
                  aria-label="Abrir en nueva pestaña"
                >
                  <IconExtLink size={14} />
                </a>
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Contenido full-height */}
      <div className="relative min-h-0 flex-1 overflow-hidden bg-[#f7f7f5]">
        {tab === "comments" ? (
          <MobileComments projectId={project.id} />
        ) : activeUrl ? (
          <iframe
            key={`${tab}-${refreshKey}`}
            src={activeUrl}
            title={`${project.name} ${tab}`}
            className="absolute inset-0 h-full w-full border-0 bg-white"
            loading="eager"
            referrerPolicy="no-referrer"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
          />
        ) : (
          <div className="grid h-full place-items-center px-6 text-center">
            <div>
              {tab === "admin" ? <IconShield size={22} className="mx-auto" /> : <IconLayout size={22} className="mx-auto" />}
              <p className="mt-3 text-[14px] font-medium">Sin URL en esta vista</p>
              <p className="mt-2 text-[12px] leading-5 text-[var(--fg-muted)]">
                Aparecerá cuando el proyecto tenga la URL configurada.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Tab bar fija + safe area */}
      <nav
        className="shrink-0 border-t border-[var(--border-1)] bg-white pb-[env(safe-area-inset-bottom,0px)]"
        aria-label="Navegación de la sala"
      >
        <div className="grid h-[56px]" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}>
          {tabs.map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={
                  active
                    ? "flex flex-col items-center justify-center gap-0.5 text-black"
                    : "flex flex-col items-center justify-center gap-0.5 text-[var(--fg-muted)]"
                }
                aria-current={active ? "page" : undefined}
              >
                {item.id === "comments" ? (
                  <IconChat size={18} />
                ) : item.id === "admin" ? (
                  <IconShield size={18} />
                ) : (
                  <IconLayout size={18} />
                )}
                <span className="font-mono text-[8px] uppercase tracking-[0.08em]">{item.label}</span>
                {active ? <span className="mt-0.5 h-0.5 w-5 rounded-full bg-black" /> : <span className="mt-0.5 h-0.5 w-5" />}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function MobileComments({ projectId }: { projectId: string }) {
  const encoded = encodeURIComponent(projectId);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/live/${encoded}/comments`, { cache: "no-store" });
      if (!res.ok) {
        setError("No se pudieron cargar los comentarios.");
        return;
      }
      const data = (await res.json()) as { comments?: CommentRow[] };
      setComments(Array.isArray(data.comments) ? data.comments : []);
      setError(null);
    } catch {
      setError("Comentarios no disponibles.");
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
        setError("No se pudo publicar.");
        return;
      }
      setBody("");
      await load();
    } catch {
      setError("No se pudo publicar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4">
        {!loaded ? (
          <div className="grid min-h-32 place-items-center">
            <IconLoader size={18} className="animate-spin" />
          </div>
        ) : comments.length === 0 ? (
          <p className="pt-8 text-center text-[13px] text-[var(--fg-muted)]">
            Aún no hay comentarios. Deja el primero.
          </p>
        ) : (
          comments.map((c) => (
            <article key={c.id} className="rounded-xl border border-[var(--border-1)] bg-[#f7f7f5] p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-[12px] font-medium">
                  {c.author_name ?? c.author_email}
                </p>
                <span className="shrink-0 font-mono text-[8px] text-[var(--fg-muted)]">
                  {timeAgo(c.created_at)}
                </span>
              </div>
              <p className="mt-1.5 whitespace-pre-wrap break-words text-[13px] leading-5 text-[var(--fg-secondary)]">
                {c.body}
              </p>
            </article>
          ))
        )}
        {error ? <p className="text-[12px] text-black">{error}</p> : null}
      </div>

      <div className="shrink-0 border-t border-[var(--border-1)] bg-white p-3">
        <div className="flex items-end gap-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={2}
            maxLength={4000}
            placeholder="Escribe un comentario…"
            className="min-h-[44px] flex-1 resize-none rounded-xl border border-[var(--border-1)] bg-[#f7f7f5] px-3 py-2.5 text-[14px]"
          />
          <button
            type="button"
            onClick={() => void send()}
            disabled={busy || !body.trim()}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-black text-white disabled:opacity-40"
            aria-label="Enviar"
          >
            {busy ? <IconLoader size={16} className="animate-spin" /> : <IconSend size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
