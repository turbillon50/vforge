"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageSquare, RefreshCw, Upload } from "lucide-react";
import type { HiloChat, HiloDashboardData } from "@/lib/hilo/types";
import { cn } from "@/lib/utils";

type Props = {
  projectId: string | null;
  initialChats: HiloChat[];
  liveActive: boolean;
  className?: string;
  uploadTone?: "accent" | "ink";
  onUploaded?: (payload: { etapa_actualizada?: string | null }) => void;
};

function formatTime(value: string | null | undefined) {
  if (!value) return "sin mensajes";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "sin fecha";
  return new Intl.DateTimeFormat("es-MX", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function ProjectChats({
  projectId,
  initialChats,
  liveActive,
  className,
  uploadTone = "accent",
  onUploaded,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [chats, setChats] = useState(initialChats);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setChats(initialChats);
    setDrafts((current) => {
      const next = { ...current };
      for (const chat of initialChats) {
        if (!(chat.id in next)) next[chat.id] = chat.etiqueta ?? "";
      }
      return next;
    });
  }, [initialChats]);

  const reload = useCallback(async () => {
    if (!projectId) return;
    const response = await fetch(`/api/hilo?project=${encodeURIComponent(projectId)}`, {
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = (await response.json()) as HiloDashboardData;
    setChats(data.chats);
  }, [projectId]);

  const upload = useCallback(
    async (file: File | null | undefined) => {
      if (!file || !projectId) return;
      setBusy("upload");
      setMessage(null);
      try {
        const form = new FormData();
        form.set("file", file);
        const response = await fetch(
          `/api/hilo/projects/${encodeURIComponent(projectId)}/zip`,
          { method: "POST", body: form },
        );
        const payload = (await response.json().catch(() => null)) as
          | { error?: string; mensajes?: { nuevos: number; repetidos: number }; etapa_actualizada?: string | null }
          | null;
        if (!response.ok) throw new Error(payload?.error ?? `HTTP ${response.status}`);
        setMessage(
          `${payload?.mensajes?.nuevos ?? 0} nuevos, ${payload?.mensajes?.repetidos ?? 0} repetidos`,
        );
        if (payload) onUploaded?.(payload);
        await reload();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : String(error));
      } finally {
        setBusy(null);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [onUploaded, projectId, reload],
  );

  async function patchChat(chatId: string, body: { etiqueta?: string | null; monitorear?: boolean }) {
    setBusy(chatId);
    setMessage(null);
    try {
      const response = await fetch(`/api/hilo/chats/${encodeURIComponent(chatId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json().catch(() => null)) as
        | { error?: string; chat?: Partial<HiloChat> }
        | null;
      if (!response.ok) throw new Error(payload?.error ?? `HTTP ${response.status}`);
      setChats((current) =>
        current.map((chat) =>
          chat.id === chatId
            ? {
                ...chat,
                etiqueta:
                  typeof payload?.chat?.etiqueta === "string" || payload?.chat?.etiqueta === null
                    ? payload.chat.etiqueta
                    : chat.etiqueta,
                monitorear:
                  typeof payload?.chat?.monitorear === "boolean"
                    ? payload.chat.monitorear
                    : chat.monitorear,
              }
            : chat,
        ),
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(null);
    }
  }

  function saveEtiqueta(chat: HiloChat) {
    const next = (drafts[chat.id] ?? "").trim();
    const current = chat.etiqueta ?? "";
    if (next === current) return;
    void patchChat(chat.id, { etiqueta: next || null });
  }

  return (
    <section className={cn("border-b border-[var(--border-1)] bg-[var(--color-surface)] p-5 md:p-8", className)}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <MessageSquare size={16} />
            <h2 className="text-[20px] font-medium tracking-normal text-[var(--fg-primary)]">
              Chats del proyecto
            </h2>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[var(--border-1)] px-2 py-1 font-mono text-[11px] uppercase text-[var(--fg-muted)]">
              {chats.length} ligados
            </span>
            <span
              className={cn(
                "rounded-full border px-2 py-1 font-mono text-[11px] uppercase",
                liveActive
                  ? "border-[var(--fg-primary)] bg-[var(--fg-primary)] text-[var(--color-surface)]"
                  : "border-[var(--accent)] text-[var(--accent)]",
              )}
            >
              {liveActive ? "Hilo en vivo: activo" : "Hilo en vivo: apagado"}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept=".zip,application/zip,application/x-zip-compressed"
            hidden
            onChange={(event) => void upload(event.target.files?.[0])}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={!projectId || busy === "upload"}
            className={cn(
              "inline-flex h-11 items-center justify-center gap-2 rounded-md border px-4 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40",
              uploadTone === "accent"
                ? "border-[var(--accent)] bg-[var(--accent)]"
                : "border-black bg-black",
            )}
          >
            {busy === "upload" ? <RefreshCw size={15} className="animate-spin" /> : <Upload size={15} />}
            Subir chat (.zip)
          </button>
        </div>
      </div>

      {message ? (
        <p className="mt-4 border border-[var(--border-1)] bg-[var(--color-surface-2)] px-3 py-2 text-[12px] text-[var(--fg-primary)]">
          {message}
        </p>
      ) : null}

      {!projectId ? (
        <EmptyProjectChats text="Elige un proyecto para subir o revisar sus chats." />
      ) : chats.length === 0 ? (
        <EmptyProjectChats text="Sin chats ligados todavia." />
      ) : (
        <div className="mt-5 divide-y divide-[var(--border-1)] border-y border-[var(--border-1)]">
          {chats.map((chat) => (
            <article key={chat.id} className="grid gap-4 py-4 lg:grid-cols-[minmax(0,1fr)_180px_170px] lg:items-center">
              <div className="min-w-0">
                <p className="break-words text-[14px] font-semibold text-[var(--fg-primary)]">
                  {chat.chat_nombre}
                </p>
                <p className="mt-1 break-words text-[12px] leading-5 text-[var(--fg-muted)]">
                  {chat.ultimo_texto ?? "sin ultimo mensaje"}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge text={`${chat.mensajes_count} mensajes`} />
                  <Badge text={formatTime(chat.ultimo_ts)} />
                  <Badge text={chat.origen} />
                </div>
              </div>

              <label className="min-w-0">
                <span className="text-[11px] text-[var(--fg-muted)]">Etiqueta</span>
                <input
                  value={drafts[chat.id] ?? chat.etiqueta ?? ""}
                  placeholder="socio"
                  onChange={(event) =>
                    setDrafts((current) => ({ ...current, [chat.id]: event.target.value }))
                  }
                  onBlur={() => saveEtiqueta(chat)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") event.currentTarget.blur();
                  }}
                  className="mt-1 h-10 w-full rounded-md border border-[var(--border-1)] bg-[var(--color-surface)] px-3 text-[13px] text-[var(--fg-primary)] outline-none focus:border-[var(--fg-primary)]"
                />
              </label>

              <div className="flex items-center justify-between gap-3 lg:justify-end">
                <span className="text-[13px] font-medium text-[var(--fg-primary)]">Seguir en vivo</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={chat.monitorear}
                  disabled={busy === chat.id}
                  onClick={() => void patchChat(chat.id, { monitorear: !chat.monitorear })}
                  className={cn(
                    "relative h-7 w-12 rounded-full border transition-colors disabled:opacity-50",
                    chat.monitorear
                      ? "border-[var(--fg-primary)] bg-[var(--fg-primary)]"
                      : "border-[var(--border-1)] bg-[var(--color-surface-2)]",
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-1 h-5 w-5 rounded-full bg-[var(--color-surface)] shadow-sm transition-transform",
                      chat.monitorear ? "translate-x-5" : "translate-x-1",
                    )}
                  />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function Badge({ text }: { text: string }) {
  return (
    <span className="rounded-full border border-[var(--border-1)] px-2 py-1 font-mono text-[11px] uppercase text-[var(--fg-muted)]">
      {text}
    </span>
  );
}

function EmptyProjectChats({ text }: { text: string }) {
  return (
    <div className="mt-5 border border-dashed border-[var(--border-1)] bg-[var(--color-surface-2)] px-4 py-8 text-center">
      <p className="text-[13px] text-[var(--fg-muted)]">{text}</p>
    </div>
  );
}
