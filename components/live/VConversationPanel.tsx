"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { IconLoader, IconSend } from "@/components/brand/VFIcons";

type ConversationMode = "talk" | "plan";

interface AssistantMessage {
  id: string;
  mode: ConversationMode;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

interface PendingPhoto {
  name: string;
  mime: string;
  data: string;
  preview: string;
}

function fileToPhoto(file: File): Promise<PendingPhoto | null> {
  return new Promise((resolve) => {
    if (!/^image\/(png|jpeg|jpg)$/i.test(file.type)) {
      resolve(null);
      return;
    }
    if (file.size > 1_600_000) {
      resolve(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const preview = String(reader.result || "");
      resolve({
        name: file.name.slice(0, 80),
        mime: file.type === "image/png" ? "image/png" : "image/jpeg",
        data: preview,
        preview,
      });
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

function visibleText(value: string): string {
  return value.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/`+/g, "");
}

export function VConversationPanel({
  projectId,
  canWrite,
  repository,
  onDispatchGrok,
}: {
  projectId: string;
  mode?: ConversationMode;
  canWrite: boolean;
  repositories?: Array<{ repo_full_name: string }>;
  repository?: string;
  onRepositoryChange?: (repository: string) => void;
  onUseAsTask?: (plan: string) => void;
  onPromoteToPlan?: (talk: string) => void;
  onDispatchGrok?: (order: string) => void;
  onApply?: () => void;
  canApply?: boolean;
  compact?: boolean;
  seed?: string;
}) {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [message, setMessage] = useState("");
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef(false);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (pollingRef.current) return;
    pollingRef.current = true;
    try {
      const response = await fetch(
        `/api/live/${encodeURIComponent(projectId)}/assistant`,
        { cache: "no-store" },
      );
      const payload = (await response.json().catch(() => null)) as {
        messages?: AssistantMessage[];
      } | null;
      if (!response.ok) throw new Error("No se pudo cargar el chat.");
      setMessages(Array.isArray(payload?.messages) ? payload.messages : []);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo cargar el chat.");
    } finally {
      pollingRef.current = false;
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 8000);
    return () => window.clearInterval(timer);
  }, [load]);

  const visibleMessages = useMemo(() => messages.slice(-120), [messages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [visibleMessages.length, busy]);

  async function addFiles(list: FileList | null) {
    if (!list?.length) return;
    const next: PendingPhoto[] = [];
    for (const file of Array.from(list).slice(0, 4)) {
      const photo = await fileToPhoto(file);
      if (photo) next.push(photo);
    }
    if (!next.length) {
      setError("Sólo PNG o JPG, máximo 1.5 MB.");
      return;
    }
    setPhotos((current) => [...current, ...next].slice(0, 4));
    setError(null);
  }

  async function sendMessage(raw: string) {
    const trimmed = raw.trim();
    if ((!trimmed && photos.length === 0) || busy || !canWrite) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/live/${encodeURIComponent(projectId)}/assistant`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "talk",
            message: trimmed || (photos.length ? "Mira esta foto." : ""),
            repository,
            attachments: photos.map((photo) => ({
              name: photo.name,
              mime: photo.mime,
              data: photo.data,
            })),
          }),
        },
      );
      const payload = (await response.json().catch(() => null)) as {
        messages?: AssistantMessage[];
        error?: string;
        notice?: string;
      } | null;
      if (!response.ok)
        throw new Error(payload?.notice || payload?.error || "V no pudo responder.");
      setMessages(Array.isArray(payload?.messages) ? payload.messages : []);
      setMessage("");
      setPhotos([]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "V no pudo responder.");
    } finally {
      setBusy(false);
    }
  }

  const lastUser =
    [...visibleMessages].reverse().find((item) => item.role === "user")?.content ?? "";

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#efeee8]">
      <div className="flex shrink-0 items-center gap-3 border-b border-[var(--border-1)] bg-white px-4 py-3">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-[#1c1917] text-[13px] font-semibold text-[#f6f3ec]">
          V
        </span>
        <div className="min-w-0">
          <p className="text-[14px] font-medium leading-none text-[#1c1917]">V</p>
          <p className="mt-1 text-[11px] text-[#6f6b64]">Tu hermana · en línea</p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-4" aria-live="polite">
        {loading ? (
          <div className="flex h-full items-center justify-center gap-2 text-[12px] text-[#6f6b64]">
            <IconLoader size={14} className="animate-spin" /> Cargando chat…
          </div>
        ) : visibleMessages.length ? (
          <div className="mx-auto flex w-full max-w-[560px] flex-col gap-2">
            {visibleMessages.map((item) => {
              const mine = item.role === "user";
              return (
                <div key={item.id} className={cn("flex w-full", mine ? "justify-end" : "justify-start")}>
                  <article
                    className={cn(
                      "max-w-[86%] rounded-[18px] px-3.5 py-2.5 text-[14px] leading-6",
                      mine
                        ? "rounded-br-[6px] bg-[#1c1917]"
                        : "rounded-bl-[6px] border border-[#e4e1d8] bg-white",
                    )}
                  >
                    <p
                      className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]"
                      style={{ color: mine ? "#f6f3ec" : "#1c1917" }}
                    >
                      {visibleText(item.content)}
                    </p>
                  </article>
                </div>
              );
            })}
            {busy ? (
              <div className="flex justify-start">
                <span className="inline-flex items-center gap-2 rounded-[18px] border border-[#e4e1d8] bg-white px-3.5 py-2 text-[13px] text-[#6f6b64]">
                  <IconLoader size={12} className="animate-spin" /> V está escribiendo
                </span>
              </div>
            ) : null}
            <div ref={endRef} />
          </div>
        ) : (
          <div className="grid h-full place-items-center text-center">
            <div>
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#1c1917] text-[#f6f3ec]">
                V
              </span>
              <p className="mt-3 text-[15px] font-medium text-[#1c1917]">Ey hermano</p>
              <p className="mt-1 text-[12px] text-[#6f6b64]">Mándame texto o una foto. Aquí me quedo.</p>
            </div>
          </div>
        )}
      </div>

      {error ? (
        <p className="shrink-0 bg-white px-4 py-2 text-center text-[12px] text-[var(--color-danger)]">
          {error}
        </p>
      ) : null}

      {canWrite ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void sendMessage(message);
          }}
          className="shrink-0 border-t border-[var(--border-1)] bg-white px-3 py-3"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            void addFiles(event.dataTransfer.files);
          }}
        >
          {photos.length ? (
            <div className="mb-2 flex gap-2 overflow-x-auto">
              {photos.map((photo, index) => (
                <button
                  key={`${photo.name}-${index}`}
                  type="button"
                  className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-[var(--border-1)]"
                  onClick={() => setPhotos((current) => current.filter((_, i) => i !== index))}
                  aria-label="Quitar foto"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.preview} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}
          <div className="flex items-end gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg"
              multiple
              className="hidden"
              onChange={(event) => {
                void addFiles(event.target.files);
                event.currentTarget.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[var(--border-1)] text-[18px] text-[#1c1917] hover:border-[#1c1917]"
              aria-label="Adjuntar foto"
            >
              +
            </button>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              rows={1}
              maxLength={6000}
              placeholder="Mensaje"
              className="max-h-36 min-h-11 flex-1 resize-none rounded-[22px] border border-[#e4e1d8] bg-[#f7f6f2] px-4 py-2.5 text-[14px] leading-5 text-[#1c1917] outline-none focus:border-[#1c1917]"
            />
            <button
              type="submit"
              disabled={busy || (!message.trim() && photos.length === 0)}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#1c1917] text-[#f6f3ec] disabled:opacity-30"
              aria-label="Enviar"
            >
              {busy ? <IconLoader size={14} className="animate-spin" /> : <IconSend size={14} />}
            </button>
          </div>
          {onDispatchGrok ? (
            <button
              type="button"
              className="mt-2 text-[11px] text-[#6f6b64] hover:text-[#1c1917]"
              onClick={() => onDispatchGrok((message.trim() || lastUser).slice(0, 12000))}
              disabled={busy || !(message.trim() || lastUser)}
            >
              Mandar a Hetzner → Grok
            </button>
          ) : null}
        </form>
      ) : (
        <p className="shrink-0 bg-white px-4 py-3 text-[12px] text-[#6f6b64]">
          Sólo el owner habla con V.
        </p>
      )}
    </div>
  );
}
