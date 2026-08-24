"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { VWordmark } from "@/components/brand/VMark";
import {
  IconChat,
  IconExtLink,
  IconLayout,
  IconLoader,
  IconRefresh,
  IconSend,
  IconShield,
  IconX,
} from "@/components/brand/VFIcons";

type Project = {
  id: string;
  name: string;
  status: string;
  desktop_url: string | null;
  mobile_url: string | null;
  admin_url: string | null;
  vercel_url: string | null;
  domain: string | null;
};

type TabId = "desktop" | "mobile" | "admin" | "chat";

interface CommentRow {
  id: string;
  author_email: string;
  author_name: string | null;
  body: string;
  created_at: string;
}

function normalizeUrl(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    return u.protocol === "http:" || u.protocol === "https:" ? u.href : null;
  } catch {
    return null;
  }
}

function timeAgo(iso: string) {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const m = Math.max(0, Math.floor((Date.now() - t) / 60_000));
  if (m < 1) return "ahora";
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
}

export function PublicLiveRoom({
  project,
  shareToken,
}: {
  project: Project;
  shareToken: string;
}) {
  const [tab, setTab] = useState<TabId>("mobile");
  const [refreshKey, setRefreshKey] = useState(0);
  const [showInstall, setShowInstall] = useState(false);

  const urls = useMemo(() => {
    const fallback =
      normalizeUrl(project.domain) || normalizeUrl(project.vercel_url);
    return {
      desktop: normalizeUrl(project.desktop_url) || fallback,
      mobile:
        normalizeUrl(project.mobile_url) ||
        normalizeUrl(project.desktop_url) ||
        fallback,
      admin: normalizeUrl(project.admin_url),
    };
  }, [project]);

  const activeUrl =
    tab === "desktop"
      ? urls.desktop
      : tab === "mobile"
        ? urls.mobile
        : tab === "admin"
          ? urls.admin
          : null;

  const tabs: { id: TabId; label: string }[] = [
    { id: "mobile", label: "App" },
    { id: "desktop", label: "Web" },
    { id: "admin", label: "Admin" },
    { id: "chat", label: "Chat" },
  ];

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-white text-black">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--border-1)] px-4">
        <VWordmark />
        <p className="truncate text-[13px] font-medium">{project.name}</p>
      </header>

      {tab !== "chat" && activeUrl ? (
        <div className="flex h-10 shrink-0 items-center justify-end gap-1 border-b border-[var(--border-1)] px-2">
          <button
            type="button"
            onClick={() => setRefreshKey((k) => k + 1)}
            className="grid h-9 w-9 place-items-center rounded-md"
            aria-label="Actualizar"
          >
            <IconRefresh size={14} />
          </button>
          <a
            href={activeUrl}
            target="_blank"
            rel="noreferrer"
            className="grid h-9 w-9 place-items-center rounded-md"
            aria-label="Abrir"
          >
            <IconExtLink size={14} />
          </a>
        </div>
      ) : null}

      <main className="relative min-h-0 flex-1 overflow-hidden bg-[#f7f7f5]">
        {tab === "chat" ? (
          <ShareChat
            token={shareToken}
            projectName={project.name}
            onInstall={() => setShowInstall(true)}
            showInstall={showInstall}
          />
        ) : activeUrl ? (
          <iframe
            key={`${tab}-${refreshKey}`}
            src={activeUrl}
            title={`${project.name} ${tab}`}
            className="absolute inset-0 h-full w-full border-0 bg-white"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        ) : (
          <div className="grid h-full place-items-center px-6 text-center">
            <div>
              <IconLayout size={22} className="mx-auto" />
              <p className="mt-3 text-[14px] font-medium">Sin URL en esta vista</p>
              <p className="mt-2 text-[12px] text-[var(--fg-muted)]">
                Cuando el builder configure la URL, aparecerá aquí.
              </p>
            </div>
          </div>
        )}
      </main>

      <nav className="shrink-0 border-t border-[var(--border-1)] bg-white pb-[env(safe-area-inset-bottom,0px)]">
        <div className="grid h-14 grid-cols-4">
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
              >
                {item.id === "chat" ? (
                  <IconChat size={18} />
                ) : item.id === "admin" ? (
                  <IconShield size={18} />
                ) : (
                  <IconLayout size={18} />
                )}
                <span className="font-mono text-[8px] uppercase tracking-[0.06em]">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function ShareChat({
  token,
  projectName,
  showInstall,
  onInstall,
}: {
  token: string;
  projectName: string;
  showInstall: boolean;
  onInstall: () => void;
}) {
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [body, setBody] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/s/${encodeURIComponent(token)}/comments`, {
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
  }, [token]);

  useEffect(() => {
    void load();
    const t = window.setInterval(() => void load(), 15_000);
    return () => window.clearInterval(t);
  }, [load]);

  async function send() {
    const text = body.trim();
    if (!text || busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/s/${encodeURIComponent(token)}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text, name: name.trim() || undefined }),
      });
      if (!res.ok) {
        setError(res.status === 429 ? "Espera un momento y reintenta." : "No se pudo enviar.");
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

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-[var(--border-1)] bg-white px-4 py-3">
        <p className="text-[14px] font-medium">Mensajes · {projectName}</p>
        <p className="mt-1 text-[12px] text-[var(--fg-muted)]">
          Tu builder los ve en tiempo real en VForge. Sin login.
        </p>
        <div className="mt-2 flex gap-2">
          <Link href="/sign-up" className="text-[12px] font-medium underline">
            Crear cuenta
          </Link>
          <button type="button" onClick={onInstall} className="text-[12px] underline text-[var(--fg-muted)]">
            Instalar en el teléfono
          </button>
        </div>
        {showInstall ? (
          <div className="mt-2 rounded-lg border border-[var(--border-1)] bg-[#f7f7f5] p-3 text-[12px] leading-4 text-[var(--fg-secondary)]">
            <p className="font-medium text-black">iPhone · Safari</p>
            <p>Compartir → Añadir a pantalla de inicio.</p>
            <p className="mt-2 font-medium text-black">Android · Chrome</p>
            <p>Menú ⋮ → Instalar app.</p>
          </div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {!loaded ? (
          <div className="grid min-h-24 place-items-center">
            <IconLoader size={18} className="animate-spin" />
          </div>
        ) : comments.length === 0 ? (
          <p className="pt-8 text-center text-[13px] text-[var(--fg-muted)]">
            Aún no hay mensajes. Escribe el primero.
          </p>
        ) : (
          comments.map((c) => (
            <article
              key={c.id}
              className="rounded-xl border border-[var(--border-1)] bg-white p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-[12px] font-medium">
                  {c.author_name ?? "Cliente"}
                </p>
                <span className="shrink-0 font-mono text-[8px] text-[var(--fg-muted)]">
                  {timeAgo(c.created_at)}
                </span>
              </div>
              <p className="mt-1 whitespace-pre-wrap break-words text-[13px] leading-5 text-[var(--fg-secondary)]">
                {c.body}
              </p>
            </article>
          ))
        )}
        {error ? <p className="text-[12px] text-red-600">{error}</p> : null}
      </div>

      <div className="shrink-0 border-t border-[var(--border-1)] bg-white p-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tu nombre (opcional)"
          maxLength={80}
          className="mb-2 w-full rounded-xl border border-[var(--border-1)] bg-[#f7f7f5] px-3 py-2 text-[13px]"
        />
        <div className="flex items-end gap-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={2}
            maxLength={4000}
            placeholder="Escribe un mensaje al builder…"
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
