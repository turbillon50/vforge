"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

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
  mime: "image/jpeg";
  data: string;
  preview: string;
}

const THINKING = [
  "Pensando",
  "Leyendo la sala",
  "Revisando el expediente",
  "Escribiendo",
];

function compressPhoto(file: File): Promise<PendingPhoto | null> {
  return new Promise((resolve) => {
    if (!file.type.startsWith("image/")) {
      resolve(null);
      return;
    }
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const side = Math.max(image.width, image.height) || 1;
      const scale = Math.min(1, 960 / side);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        resolve(null);
        return;
      }
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      const data = canvas.toDataURL("image/jpeg", 0.72);
      URL.revokeObjectURL(url);
      if (data.length > 1_200_000) {
        resolve(null);
        return;
      }
      resolve({
        name: file.name.slice(0, 80) || "foto.jpg",
        mime: "image/jpeg",
        data,
        preview: data,
      });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    image.src = url;
  });
}

function visibleText(value: string): string {
  return value.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/`+/g, "");
}

function ThinkingLine({ hasPhotos }: { hasPhotos: boolean }) {
  const steps = hasPhotos ? ["Viendo la foto", ...THINKING] : THINKING;
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % steps.length);
    }, 1600);
    return () => window.clearInterval(timer);
  }, [steps.length]);
  return (
    <div className="flex items-center gap-2 pl-1 pt-1">
      <span className="relative grid h-3.5 w-3.5 place-items-center">
        <span className="absolute inset-0 rounded-full bg-[#1c1917]/15 animate-ping" />
        <span className="h-1.5 w-1.5 rounded-full bg-[#1c1917]" />
      </span>
      <p className="text-[13px] tracking-[-0.01em] text-[#6f6b64]">{steps[index]}</p>
    </div>
  );
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
  const [pending, setPending] = useState<AssistantMessage | null>(null);
  const [pendingPhotos, setPendingPhotos] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef(false);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (pollingRef.current || busy) return;
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
  }, [projectId, busy]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 8000);
    return () => window.clearInterval(timer);
  }, [load]);

  const visibleMessages = useMemo(() => {
    const list = messages.slice(-120);
    if (!pending) return list;
    if (list.some((item) => item.content === pending.content && item.role === "user")) {
      return list;
    }
    return [...list, pending];
  }, [messages, pending]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [visibleMessages.length, busy, pendingPhotos.length]);

  async function addFiles(list: FileList | null) {
    if (!list?.length) return;
    const next: PendingPhoto[] = [];
    for (const file of Array.from(list).slice(0, 4)) {
      const photo = await compressPhoto(file);
      if (photo) next.push(photo);
    }
    if (!next.length) {
      setError("No pude leer esa imagen. Prueba JPG o PNG.");
      return;
    }
    setPhotos((current) => [...current, ...next].slice(0, 4));
    setError(null);
  }

  async function sendMessage(raw: string) {
    const trimmed = raw.trim();
    const shot = photos.slice();
    if ((!trimmed && shot.length === 0) || busy || !canWrite) return;
    const spoken = trimmed || `Mira ${shot.length} foto(s).`;
    setPending({
      id: `local-${Date.now()}`,
      mode: "talk",
      role: "user",
      content: spoken,
      created_at: new Date().toISOString(),
    });
    setPendingPhotos(shot.map((photo) => photo.preview));
    setMessage("");
    setPhotos([]);
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
            message: spoken,
            repository,
            attachments: shot.map((photo) => ({
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
      setPending(null);
      setPendingPhotos([]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "V no pudo responder.");
    } finally {
      setBusy(false);
    }
  }

  const lastUser =
    [...visibleMessages].reverse().find((item) => item.role === "user")?.content ?? "";

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-[#efeee8]">
      <div className="flex h-12 shrink-0 items-center gap-3 border-b border-[#e4e1d8] bg-white px-4">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-[#1c1917] text-[11px] font-semibold text-[#f6f3ec]">
          V
        </span>
        <div className="min-w-0">
          <p className="text-[13px] font-medium leading-none text-[#1c1917]">V</p>
          <p className="mt-0.5 text-[10px] text-[#6f6b64]">Tu hermana · en línea</p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5" aria-live="polite">
        {loading ? (
          <p className="text-[13px] text-[#6f6b64]">Cargando chat…</p>
        ) : visibleMessages.length ? (
          <div className="flex flex-col gap-3">
            {visibleMessages.map((item) => {
              const mine = item.role === "user";
              const showThumbs = mine && pending?.id === item.id && pendingPhotos.length > 0;
              return (
                <div key={item.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                  <article
                    className={cn(
                      "max-w-[78%] rounded-2xl px-4 py-3 text-[15px] leading-6",
                      mine ? "rounded-br-md bg-[#1c1917]" : "rounded-bl-md bg-white",
                    )}
                  >
                    {showThumbs ? (
                      <div className="mb-2 flex gap-1.5">
                        {pendingPhotos.map((src) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={src.slice(-24)} src={src} alt="" className="h-12 w-12 rounded-md object-cover" />
                        ))}
                      </div>
                    ) : null}
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
            {busy ? <ThinkingLine hasPhotos={pendingPhotos.length > 0} /> : null}
            <div ref={endRef} />
          </div>
        ) : (
          <p className="text-[14px] text-[#6f6b64]">Mándame texto o una foto.</p>
        )}
      </div>

      {error ? (
        <p className="shrink-0 px-5 py-2 text-[12px] text-[var(--color-danger)]">{error}</p>
      ) : null}

      {canWrite ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void sendMessage(message);
          }}
          className="shrink-0 border-t border-[#e4e1d8] bg-white px-4 py-3"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            void addFiles(event.dataTransfer.files);
          }}
        >
          {photos.length ? (
            <div className="mb-3 flex gap-2">
              {photos.map((photo, index) => (
                <button
                  key={`${photo.name}-${index}`}
                  type="button"
                  onClick={() => setPhotos((current) => current.filter((_, i) => i !== index))}
                  className="h-16 w-16 overflow-hidden rounded-lg border border-[#e4e1d8]"
                  aria-label="Quitar foto"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.preview} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
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
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#e4e1d8] text-[16px] text-[#1c1917]"
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
              rows={2}
              maxLength={6000}
              placeholder="Mensaje"
              className="max-h-28 min-h-10 flex-1 resize-none rounded-2xl border border-[#e4e1d8] bg-[#f7f6f2] px-4 py-2.5 text-[15px] leading-5 text-[#1c1917] outline-none focus:border-[#1c1917]"
            />
            <button
              type="submit"
              disabled={busy || (!message.trim() && photos.length === 0)}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#1c1917] text-[13px] text-[#f6f3ec] disabled:opacity-30"
              aria-label="Enviar"
            >
              ↑
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
        <p className="shrink-0 px-4 py-3 text-[12px] text-[#6f6b64]">Sólo el owner habla con V.</p>
      )}
    </div>
  );
}
