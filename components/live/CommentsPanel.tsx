"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  IconChat,
  IconCheck,
  IconCopy,
  IconLoader,
  IconMaximize,
  IconSend,
  IconSparkles,
  IconX,
} from "@/components/brand/VFIcons";

interface CommentRow {
  id: string;
  author_email: string;
  author_name: string | null;
  body: string;
  created_at: string;
}

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

function MinimizeButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="grid h-7 w-7 place-items-center rounded-md hover:bg-[#f2f2f0]"
      aria-label={`Minimizar ${label}`}
      title="Minimizar"
    >
      <span className="h-px w-3 bg-current" />
    </button>
  );
}

function FocusButton({
  focused,
  onClick,
  label,
}: {
  focused: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="grid h-7 w-7 place-items-center rounded-md hover:bg-[#f2f2f0]"
      aria-label={focused ? `Restaurar ${label}` : `Ampliar ${label}`}
      title={focused ? "Restaurar" : "Ampliar"}
    >
      {focused ? <IconX size={11} /> : <IconMaximize size={11} />}
    </button>
  );
}

const PENDING_PROMPT_KEY = "vforge:pending-live-prompt";

export function CommentsPanel({
  projectId,
  projectName,
  canAccept = false,
  rail = false,
  workspace = false,
  focused = false,
  onFocus,
  onMinimize,
}: {
  projectId: string;
  projectName: string;
  /** Solo owner (plataforma o live) puede aceptar → encolar. */
  canAccept?: boolean;
  rail?: boolean;
  workspace?: boolean;
  focused?: boolean;
  onFocus?: () => void;
  onMinimize?: () => void;
}) {
  const router = useRouter();
  const encodedProjectId = encodeURIComponent(projectId);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promptOpen, setPromptOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [draftPrompt, setDraftPrompt] = useState<string | null>(null);
  const [acceptedMap, setAcceptedMap] = useState<Record<string, string>>({});

  const promptText = useMemo(() => {
    if (comments.length === 0) return "";
    const elements = [...comments]
      .reverse()
      .map((comment, index) => {
        const author = comment.author_name ?? comment.author_email;
        const date = new Date(comment.created_at).toLocaleString("es-MX", {
          dateStyle: "medium",
          timeStyle: "short",
        });
        return `${index + 1}. [${date}] ${author}:\n${comment.body}`;
      })
      .join("\n\n");
    return `PROYECTO: ${projectName} (${projectId})

OBJETIVO
Analiza el feedback registrado por los miembros del proyecto y conviértelo en mejoras concretas, coherentes y verificables. Conserva la intención del producto y no inventes requisitos que no estén respaldados por los comentarios.

ELEMENTOS DE FEEDBACK (${comments.length})
${elements}

ENTREGA ESPERADA
1. Agrupa comentarios repetidos o relacionados.
2. Señala contradicciones y decisiones que necesitan confirmación.
3. Prioriza por impacto y dependencia.
4. Propón cambios específicos de producto, interfaz y funcionamiento.
5. Devuelve un plan ejecutable con criterios de aceptación y pruebas.
6. No marques nada como terminado sin evidencia.`;
  }, [comments, projectId, projectName]);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/live/" + encodedProjectId + "/comments", {
        cache: "no-store",
      });
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
      const response = await fetch("/api/live/" + encodedProjectId + "/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
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

  async function copyPrompt(text?: string) {
    const value = text ?? promptText;
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1_800);
    } catch {
      setError("No se pudo copiar el prompt.");
    }
  }

  function proposeOne(comment: CommentRow) {
    const author = comment.author_name ?? comment.author_email;
    const text = `PROYECTO: ${projectName} (${projectId})

FEEDBACK DE ${author}
${comment.body}

OBJETIVO
Convierte este feedback en un cambio concreto y verificable. No inventes requisitos extras.

ENTREGA
1. Interpretación breve.
2. Plan de cambio.
3. Criterios de aceptación (desktop/móvil si aplica).
4. Aplica el cambio si tienes herramientas; si no, deja el plan listo.`;
    setDraftPrompt(text);
    setPromptOpen(true);
  }

  async function acceptOne(comment: CommentRow, openStudio: boolean) {
    if (!canAccept || acceptingId) return;
    setAcceptingId(comment.id);
    setError(null);
    try {
      const response = await fetch(
        `/api/live/${encodedProjectId}/comments/${encodeURIComponent(comment.id)}/accept`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
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
            ? "Solo el owner puede aceptar y encolar."
            : "No se pudo encolar la tarea.",
        );
        return;
      }
      setAcceptedMap((m) => ({ ...m, [comment.id]: payload.task!.id }));
      try {
        sessionStorage.setItem(
          PENDING_PROMPT_KEY,
          JSON.stringify({
            projectId,
            taskId: payload.task.id,
            prompt: payload.task.prompt,
            at: Date.now(),
          }),
        );
      } catch {
        /* ignore */
      }
      await load();
      if (openStudio && payload.estudioPath) {
        router.push(payload.estudioPath);
      }
    } catch {
      setError("No se pudo encolar la tarea.");
    } finally {
      setAcceptingId(null);
    }
  }

  const isSystem = (c: CommentRow) =>
    (c.author_name || "").toLowerCase().includes("sistema") ||
    c.body.startsWith("✓ Tarea aceptada");

  return (
    <section
      className={cn(
        "bg-white",
        workspace
          ? "flex h-full flex-col overflow-hidden rounded-[8px] border border-[var(--border-1)] p-4"
          : rail
            ? "px-5 py-5"
            : "rounded-[8px] border border-[var(--border-1)] p-4",
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between gap-2",
          workspace &&
            "-mx-4 -mt-4 h-10 shrink-0 border-b border-[var(--border-1)] px-4",
        )}
      >
        <div className="flex items-center gap-2">
          <IconChat size={13} />
          <h2 className="text-[12px] font-medium">Comentarios</h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPromptOpen((value) => !value)}
            disabled={comments.length === 0}
            className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 font-mono text-[8px] uppercase tracking-[0.08em] hover:bg-[#f2f2f0] disabled:opacity-35"
            aria-expanded={promptOpen}
          >
            <IconSparkles size={11} /> Prompt ({comments.length})
          </button>
          {onMinimize ? <MinimizeButton onClick={onMinimize} label="comentarios" /> : null}
          {onFocus ? <FocusButton focused={focused} onClick={onFocus} label="comentarios" /> : null}
        </div>
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

      {error ? <p className="mt-3 text-[10px] leading-4 text-black">{error}</p> : null}

      {(promptOpen && (draftPrompt || promptText)) ? (
        <div className="mt-4 rounded-md border border-black bg-[#f7f7f5] p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium text-black">
                {draftPrompt ? "Prompt de este comentario" : "Prompt de mejora"}
              </p>
              <p className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--fg-muted)]">
                {draftPrompt
                  ? "Listo para copiar o aceptar"
                  : `Generado desde ${comments.length} elementos`}
              </p>
            </div>
            <div className="flex gap-1">
              {draftPrompt ? (
                <button
                  type="button"
                  onClick={() => setDraftPrompt(null)}
                  className="btn-ghost !min-h-8 !px-2.5 text-[10px]"
                >
                  Todos
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => void copyPrompt(draftPrompt ?? undefined)}
                className="btn-secondary !min-h-8 !px-2.5"
              >
                {copied ? <IconCheck size={11} /> : <IconCopy size={11} />}
                {copied ? "Copiado" : "Copiar"}
              </button>
            </div>
          </div>
          <textarea
            readOnly
            value={draftPrompt ?? promptText}
            rows={8}
            className="mt-3 w-full resize-y rounded-md border border-[var(--border-1)] bg-white px-3 py-2 font-mono text-[9px] leading-4 text-black"
            aria-label="Prompt generado"
          />
        </div>
      ) : null}

      <div
        className={cn(
          "mt-5 space-y-3 overflow-y-auto pr-1",
          workspace ? "min-h-0 flex-1" : rail ? "max-h-[360px]" : "max-h-[300px]",
        )}
      >
        {!loaded ? (
          <div className="grid min-h-20 place-items-center">
            <IconLoader size={13} className="animate-spin" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-[11px] leading-5 text-[var(--fg-muted)]">
            No hay comentarios todavía.
          </p>
        ) : (
          comments.map((comment) => {
            const system = isSystem(comment);
            const taskId = acceptedMap[comment.id];
            return (
              <article
                key={comment.id}
                className={cn(
                  "rounded-md border p-3",
                  system
                    ? "border-black/20 bg-[#eef6ee]"
                    : "border-[var(--border-1)] bg-[#f7f7f5]",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--fg-muted)]">
                      {system ? "Sistema" : "Elemento de feedback"}
                    </p>
                    <p className="truncate text-[10px] font-medium text-black">
                      {comment.author_name ?? comment.author_email}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-[8px] text-[var(--fg-muted)]">
                    {timeAgo(comment.created_at)}
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-wrap break-words text-[11px] leading-5 text-[var(--fg-secondary)]">
                  {comment.body}
                </p>
                {!system && canAccept ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => proposeOne(comment)}
                      className="inline-flex h-7 items-center gap-1 rounded-md border border-[var(--border-1)] bg-white px-2 font-mono text-[8px] uppercase tracking-[0.08em] hover:border-black"
                    >
                      <IconSparkles size={10} /> Prompt
                    </button>
                    <button
                      type="button"
                      disabled={!!acceptingId || !!taskId}
                      onClick={() => void acceptOne(comment, false)}
                      className="inline-flex h-7 items-center gap-1 rounded-md border border-black bg-white px-2 font-mono text-[8px] uppercase tracking-[0.08em] disabled:opacity-40"
                    >
                      {acceptingId === comment.id ? (
                        <IconLoader size={10} className="animate-spin" />
                      ) : (
                        <IconCheck size={10} />
                      )}
                      {taskId ? "En cola" : "Aceptar"}
                    </button>
                    <button
                      type="button"
                      disabled={!!acceptingId}
                      onClick={() => void acceptOne(comment, true)}
                      className="inline-flex h-7 items-center gap-1 rounded-md bg-black px-2 font-mono text-[8px] uppercase tracking-[0.08em] text-white disabled:opacity-40"
                    >
                      Aceptar → Estudio
                    </button>
                  </div>
                ) : null}
              </article>
            );
          })
        )}
      </div>

      <p className="mt-4 flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--fg-muted)]">
        <IconCheck size={10} />{" "}
        {canAccept
          ? "Owner puede aceptar → cola + Estudio"
          : "Sólo miembros del proyecto"}
      </p>
    </section>
  );
}
