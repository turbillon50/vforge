"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { RoomTask } from "@/lib/live/room-tasks";
import {
  IconArrowL,
  IconCamera,
  IconLoader,
  IconSend,
  IconX,
} from "@/components/brand/VFIcons";

type ConversationMode = "talk" | "plan";
type Variant = "desktop" | "mobile";

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

/** Paleta de la sala de V. Papel cálido, tinta casi negra. */
const INK = "#1c1917";
const PAPER = "#efeee8";
const CARD = "#ffffff";
const LINE = "#e4e1d8";
/** 7.0:1 sobre el papel — el #6f6b64 anterior se perdía en móvil. */
const MUTED = "#57534e";

const THINKING = ["Pensando", "Leyendo la sala", "Revisando el expediente", "Escribiendo"];

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
  const steps = useMemo(
    () => (hasPhotos ? ["Viendo la foto", ...THINKING] : THINKING),
    [hasPhotos],
  );
  const [index, setIndex] = useState(0);
  useEffect(() => {
    setIndex(0);
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % steps.length);
    }, 1600);
    return () => window.clearInterval(timer);
  }, [steps]);
  return (
    <div className="flex items-center gap-2 pl-1 pt-1">
      <span className="relative grid h-3.5 w-3.5 place-items-center">
        <span className="absolute inset-0 rounded-full bg-[#1c1917]/15 animate-ping" />
        <span className="h-1.5 w-1.5 rounded-full bg-[#1c1917]" />
      </span>
      <p className="text-[13px] tracking-[-0.01em]" style={{ color: MUTED }}>
        {steps[index]}
      </p>
    </div>
  );
}

function Thumbs({ srcs, size }: { srcs: string[]; size: string }) {
  return (
    <div className="mb-2 flex flex-wrap gap-1.5">
      {srcs.map((src, index) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={`${index}-${src.slice(-24)}`}
          src={src}
          alt="Foto que le mandaste a V"
          className={cn("rounded-md object-cover", size)}
        />
      ))}
    </div>
  );
}

/**
 * Chat de V en la sala live.
 *
 * Dos diseños, no uno encogido: `desktop` vive dentro del panel de la fábrica,
 * `mobile` es pantalla completa con área segura y objetivos de dedo.
 * No depende de Hetzner: habla, ve el expediente y recuerda con lo que hay.
 */
export function VConversationPanel({
  projectId,
  variant = "desktop",
  canWrite: canWriteProp,
  repository: repositoryProp,
  onClose,
}: {
  projectId: string;
  variant?: Variant;
  /** Override opcional. Si no viene, se resuelve con el propio GET del chat. */
  canWrite?: boolean;
  repository?: string;
  onClose?: () => void;
}) {
  const mobile = variant === "mobile";
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [tasks, setTasks] = useState<RoomTask[]>([]);
  const [pending, setPending] = useState<AssistantMessage | null>(null);
  const [pendingPhotos, setPendingPhotos] = useState<string[]>([]);
  const [album, setAlbum] = useState<Record<string, string[]>>({});
  const [message, setMessage] = useState("");
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canWrite, setCanWrite] = useState(canWriteProp ?? false);
  const [repository, setRepository] = useState(repositoryProp ?? "");
  const pollingRef = useRef(false);
  const busyRef = useRef(false);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const load = useCallback(async () => {
    if (pollingRef.current || busyRef.current) return;
    pollingRef.current = true;
    try {
      const response = await fetch(
        `/api/live/${encodeURIComponent(projectId)}/assistant`,
        { cache: "no-store" },
      );
      const payload = (await response.json().catch(() => null)) as {
        messages?: AssistantMessage[];
        tasks?: RoomTask[];
        canWrite?: boolean;
        repositories?: Array<{ repo_full_name: string; is_primary: boolean }>;
      } | null;
      if (!response.ok) throw new Error("No se pudo cargar el chat.");
      setMessages(Array.isArray(payload?.messages) ? payload.messages : []);
      setTasks(Array.isArray(payload?.tasks) ? payload.tasks : []);
      // El permiso sale de aquí, no del endpoint de runs: si Hetzner se cae,
      // el composer sigue vivo.
      if (canWriteProp === undefined) setCanWrite(Boolean(payload?.canWrite));
      if (!repositoryProp) {
        const repos = Array.isArray(payload?.repositories) ? payload.repositories : [];
        setRepository(
          (current) =>
            current ||
            repos.find((repo) => repo.is_primary)?.repo_full_name ||
            repos[0]?.repo_full_name ||
            "",
        );
      }
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo cargar el chat.");
    } finally {
      pollingRef.current = false;
      setLoading(false);
    }
  }, [projectId, canWriteProp, repositoryProp]);

  useEffect(() => {
    if (canWriteProp !== undefined) setCanWrite(canWriteProp);
  }, [canWriteProp]);

  useEffect(() => {
    if (repositoryProp) setRepository(repositoryProp);
  }, [repositoryProp]);

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

  const growTextarea = useCallback(() => {
    const node = textRef.current;
    if (!node) return;
    node.style.height = "auto";
    node.style.height = `${Math.min(node.scrollHeight, mobile ? 132 : 112)}px`;
  }, [mobile]);

  useEffect(() => {
    growTextarea();
  }, [message, growTextarea]);

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
    busyRef.current = true;
    setError(null);
    if (textRef.current) {
      textRef.current.style.height = "auto";
    }
    try {
      const response = await fetch(
        `/api/live/${encodeURIComponent(projectId)}/assistant`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "talk",
            message: spoken,
            repository: repository || undefined,
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
      const list = Array.isArray(payload?.messages) ? payload.messages : [];
      setMessages(list);
      // Las fotos enviadas se quedan pegadas a su mensaje: antes se
      // evaporaban en cuanto V contestaba.
      if (shot.length) {
        const mine = [...list]
          .reverse()
          .find((item) => item.role === "user" && item.content === spoken);
        if (mine) {
          setAlbum((current) => ({
            ...current,
            [mine.id]: shot.map((photo) => photo.preview),
          }));
        }
      }
      setPending(null);
      setPendingPhotos([]);
      window.setTimeout(() => void load(), 600);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "V no pudo responder.");
      setMessage(trimmed);
      setPhotos(shot);
      setPending(null);
      setPendingPhotos([]);
    } finally {
      setBusy(false);
      busyRef.current = false;
    }
  }

  const shownTasks = useMemo(() => {
    const live = tasks.filter((task) => task.live);
    return (live.length ? live : tasks.slice(0, 1)).slice(0, 3);
  }, [tasks]);

  const bubble = mobile ? "max-w-[86%] text-[16px] leading-6" : "max-w-[78%] text-[15px] leading-6";
  const status = error
    ? "no contestó · reintenta"
    : busy
      ? "escribiendo…"
      : "tu hermana · lee el expediente de la sala";

  return (
    <div
      className="flex h-full min-h-0 flex-1 flex-col"
      style={{ backgroundColor: PAPER }}
    >
      <header
        className={cn(
          "flex shrink-0 items-center gap-3 border-b px-4",
          mobile ? "min-h-14 pt-[env(safe-area-inset-top,0px)]" : "h-12",
        )}
        style={{ borderColor: LINE, backgroundColor: CARD }}
      >
        {mobile && onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="-ml-2 grid h-10 w-10 shrink-0 place-items-center rounded-full"
            style={{ color: INK }}
            aria-label="Volver a la sala"
          >
            <IconArrowL size={18} />
          </button>
        ) : null}
        <span
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[12px] font-semibold"
          style={{ backgroundColor: INK, color: "#f6f3ec" }}
        >
          V
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-medium leading-none" style={{ color: INK }}>
            V
          </p>
          <p className="mt-1 truncate text-[11px] leading-none" style={{ color: MUTED }}>
            {status}
          </p>
        </div>
        {!mobile && onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full hover:bg-[#efeee8]"
            style={{ color: INK }}
            aria-label="Cerrar V"
          >
            <IconX size={14} />
          </button>
        ) : null}
      </header>

      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto overscroll-contain",
          mobile ? "px-4 py-4" : "px-5 py-5",
        )}
      >
        {loading ? (
          <p className="text-[14px]" style={{ color: MUTED }}>
            Cargando chat…
          </p>
        ) : visibleMessages.length ? (
          <div className="flex flex-col gap-3">
            {visibleMessages.map((item) => {
              const mine = item.role === "user";
              const thumbs =
                pending?.id === item.id ? pendingPhotos : album[item.id] ?? [];
              return (
                <div key={item.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                  <article
                    className={cn(
                      "rounded-2xl px-4 py-3",
                      bubble,
                      mine ? "rounded-br-md" : "rounded-bl-md",
                    )}
                    style={{
                      backgroundColor: mine ? INK : CARD,
                      color: mine ? "#f6f3ec" : INK,
                    }}
                  >
                    {mine && thumbs.length ? (
                      <Thumbs srcs={thumbs} size={mobile ? "h-16 w-16" : "h-12 w-12"} />
                    ) : null}
                    <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
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
          <div className="pt-2">
            <p className="text-[15px]" style={{ color: INK }}>
              Ey hermano. Aquí ando.
            </p>
            <p className="mt-1 text-[13px] leading-5" style={{ color: MUTED }}>
              Mándame texto o una foto de la pantalla. Leo el expediente, los
              comentarios y las referencias de esta sala.
            </p>
          </div>
        )}
      </div>

      {shownTasks.length ? (
        <div
          className={cn("shrink-0 border-t", mobile ? "px-3 py-2" : "px-4 py-2")}
          style={{ borderColor: LINE, backgroundColor: CARD }}
        >
          <div className="flex gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {shownTasks.map((task) => {
              const failed = task.status === "failed" || task.status === "cancelled";
              const body = (
                <>
                  <span
                    className={cn(
                      "h-1.5 w-1.5 shrink-0 rounded-full",
                      task.live && "animate-pulse",
                    )}
                    style={{
                      backgroundColor: failed ? "var(--color-danger)" : INK,
                    }}
                  />
                  <span className="truncate">
                    {task.agentLabel} · {task.statusLabel}
                  </span>
                  <span className="shrink-0 font-mono text-[10px]" style={{ color: MUTED }}>
                    {task.shortId}
                  </span>
                </>
              );
              const shell = cn(
                "flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-[12px]",
              );
              return canWrite ? (
                <button
                  key={task.id}
                  type="button"
                  disabled={busy}
                  onClick={() => void sendMessage(`¿Cómo va el run ${task.shortId}?`)}
                  className={cn(shell, "disabled:opacity-40")}
                  style={{ borderColor: LINE, color: INK }}
                  title="Preguntarle a V cómo va"
                >
                  {body}
                </button>
              ) : (
                <span
                  key={task.id}
                  className={shell}
                  style={{ borderColor: LINE, color: INK }}
                >
                  {body}
                </span>
              );
            })}
          </div>
        </div>
      ) : null}

      {error ? (
        <div
          className={cn("flex shrink-0 items-center gap-3 border-t px-4 py-2", mobile && "px-4")}
          style={{ borderColor: LINE, backgroundColor: CARD }}
          role="status"
        >
          <p className="min-w-0 flex-1 text-[12px] leading-4" style={{ color: "var(--color-danger)" }}>
            {error}
          </p>
          <button
            type="button"
            onClick={() => setError(null)}
            className="shrink-0 rounded-full border px-3 py-1 text-[11px]"
            style={{ borderColor: LINE, color: INK }}
          >
            Entendido
          </button>
        </div>
      ) : null}

      {canWrite ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void sendMessage(message);
          }}
          className={cn(
            "shrink-0 border-t",
            mobile ? "px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-3" : "px-4 py-3",
          )}
          style={{ borderColor: LINE, backgroundColor: CARD }}
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
                  className="relative h-16 w-16 overflow-hidden rounded-lg border"
                  style={{ borderColor: LINE }}
                  aria-label={`Quitar ${photo.name}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.preview} alt="" className="h-full w-full object-cover" />
                  <span
                    className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full"
                    style={{ backgroundColor: INK, color: "#f6f3ec" }}
                  >
                    <IconX size={10} />
                  </span>
                </button>
              ))}
            </div>
          ) : null}
          <div className="flex items-end gap-2">
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
              className={cn(
                "grid shrink-0 place-items-center rounded-full border",
                mobile ? "h-12 w-12" : "h-10 w-10",
              )}
              style={{ borderColor: LINE, color: INK }}
              aria-label="Adjuntar foto"
            >
              <IconCamera size={mobile ? 20 : 17} />
            </button>
            <textarea
              ref={textRef}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey && !mobile) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              rows={1}
              maxLength={6000}
              placeholder="Escríbele a V"
              enterKeyHint={mobile ? "enter" : "send"}
              className={cn(
                "flex-1 resize-none rounded-2xl border px-4 outline-none",
                mobile
                  ? "min-h-12 max-h-[132px] py-3 text-[16px] leading-6"
                  : "min-h-10 max-h-28 py-2.5 text-[15px] leading-5",
              )}
              style={{ borderColor: LINE, backgroundColor: "#f7f6f2", color: INK }}
            />
            <button
              type="submit"
              disabled={busy || (!message.trim() && photos.length === 0)}
              className={cn(
                "grid shrink-0 place-items-center rounded-full disabled:opacity-30",
                mobile ? "h-12 w-12" : "h-10 w-10",
              )}
              style={{ backgroundColor: INK, color: "#f6f3ec" }}
              aria-label="Enviar"
            >
              {busy ? (
                <IconLoader size={mobile ? 18 : 16} className="animate-spin" />
              ) : (
                <IconSend size={mobile ? 18 : 16} />
              )}
            </button>
          </div>
        </form>
      ) : (
        <p
          className={cn("shrink-0 border-t px-4 py-3 text-[12px]", mobile && "pb-safe")}
          style={{ borderColor: LINE, backgroundColor: CARD, color: MUTED }}
        >
          Sólo el owner escribe en el chat de V. Puedes leer la conversación.
        </p>
      )}
    </div>
  );
}
