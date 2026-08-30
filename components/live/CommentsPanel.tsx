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
import { writePendingPrompt } from "@/lib/live/pending-prompt";
import { parseReviewAnchor, type ReviewAnchor } from "@/lib/live/review-context";
import { useReviewContext } from "@/components/live/ReviewContext";

interface CommentRow {
  id: string;
  author_email: string;
  author_name: string | null;
  body: string;
  created_at: string;
  anchor: ReviewAnchor | null;
}

type ThreadFilter = "all" | "open" | "system";

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
    <button type="button" onClick={onClick} className="grid h-7 w-7 place-items-center rounded-md hover:bg-[#f2f2f0]" aria-label={`Minimizar ${label}`} title="Minimizar">
      <span className="h-px w-3 bg-current" />
    </button>
  );
}

function FocusButton({ focused, onClick, label }: { focused: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} className="grid h-7 w-7 place-items-center rounded-md hover:bg-[#f2f2f0]" aria-label={focused ? `Restaurar ${label}` : `Ampliar ${label}`} title={focused ? "Restaurar" : "Ampliar"}>
      {focused ? <IconX size={11} /> : <IconMaximize size={11} />}
    </button>
  );
}

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
  canAccept?: boolean;
  rail?: boolean;
  workspace?: boolean;
  focused?: boolean;
  onFocus?: () => void;
  onMinimize?: () => void;
}) {
  const router = useRouter();
  const { setAnchoredComments, commentsVersion } = useReviewContext();
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
  const [resolvedIds, setResolvedIds] = useState<Record<string, true>>({});
  const [filter, setFilter] = useState<ThreadFilter>("all");
  const [lastAcceptAt, setLastAcceptAt] = useState(0);

  const isSystem = (c: CommentRow) =>
    (c.author_name || "").toLowerCase().includes("sistema") ||
    c.body.startsWith("✓ Tarea") ||
    c.body.startsWith("Resuelto sin tarea") ||
    c.body.startsWith("Tarea ");

  const promptText = useMemo(() => {
    const human = comments.filter((c) => !isSystem(c));
    if (human.length === 0) return "";
    const elements = [...human]
      .reverse()
      .map((comment, index) => {
        const author = comment.author_name ?? comment.author_email;
        const date = new Date(comment.created_at).toLocaleString("es-MX", {
          dateStyle: "medium",
          timeStyle: "short",
        });
        const location = comment.anchor
          ? `\nUbicación: ${comment.anchor.label} (${comment.anchor.viewport}, ${Math.round(comment.anchor.x * 100)}%, ${Math.round(comment.anchor.y * 100)}%)\nURL: ${comment.anchor.url}`
          : "";
        return `${index + 1}. [${date}] ${author}:${location}\n${comment.body}`;
      })
      .join("\n\n");
    return `PROYECTO: ${projectName} (${projectId})\n\nOBJETIVO\nAnaliza el feedback y conviértelo en mejoras concretas y verificables.\n\nELEMENTOS (${human.length})\n${elements}\n\nENTREGA\n1. Agrupa relacionados.\n2. Prioriza impacto.\n3. Plan ejecutable + criterios de aceptación.`;
  }, [comments, projectId, projectName]);

  const visible = useMemo(() => {
    if (filter === "system") return comments.filter(isSystem);
    if (filter === "open")
      return comments.filter(
        (c) => !isSystem(c) && !resolvedIds[c.id] && !acceptedMap[c.id],
      );
    return comments;
  }, [acceptedMap, comments, filter, resolvedIds]);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/live/" + encodedProjectId + "/comments", {
        cache: "no-store",
      });
      if (!response.ok) {
        setError("No se pudieron cargar los comentarios.");
        return;
      }
      const payload = (await response.json()) as { comments?: Array<Omit<CommentRow, "anchor"> & { anchor?: unknown }> };
      const next = Array.isArray(payload.comments)
        ? payload.comments.map((comment) => ({ ...comment, anchor: parseReviewAnchor(comment.anchor) }))
        : [];
      setComments(next);
      setAnchoredComments(
        next.flatMap((comment) => comment.anchor ? [{ id: comment.id, anchor: comment.anchor }] : []),
      );
      setError(null);
    } catch {
      setError("Los comentarios no están disponibles.");
    } finally {
      setLoaded(true);
    }
  }, [encodedProjectId, setAnchoredComments]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 10_000);
    return () => window.clearInterval(timer);
  }, [commentsVersion, load]);

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
    setDraftPrompt(
      `PROYECTO: ${projectName} (${projectId})\n\nFEEDBACK DE ${author}${comment.anchor ? `\nUBICACIÓN: ${comment.anchor.label} (${comment.anchor.viewport}, ${Math.round(comment.anchor.x * 100)}%, ${Math.round(comment.anchor.y * 100)}%)\nURL: ${comment.anchor.url}` : ""}\n${comment.body}\n\nOBJETIVO\nCambio concreto y verificable. Sin requisitos inventados.\n\nENTREGA\n1. Interpretación.\n2. Plan.\n3. Criterios de aceptación.`,
    );
    setPromptOpen(true);
  }

  async function acceptOne(comment: CommentRow, openStudio: boolean) {
    if (!canAccept || acceptingId) return;
    // rate limit cliente: 1 cada 3s
    if (Date.now() - lastAcceptAt < 3000) {
      setError("Espera un momento antes de encolar otra tarea.");
      return;
    }
    setAcceptingId(comment.id);
    setError(null);
    try {
      const response = await fetch(
        `/api/live/${encodedProjectId}/comments/${encodeURIComponent(comment.id)}/accept`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" },
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
      setLastAcceptAt(Date.now());
      setAcceptedMap((m) => ({ ...m, [comment.id]: payload.task!.id }));
      writePendingPrompt({
        projectId,
        taskId: payload.task.id,
        prompt: payload.task.prompt,
        at: Date.now(),
      });
      await load();
      if (openStudio && payload.estudioPath) router.push(payload.estudioPath);
    } catch {
      setError("No se pudo encolar la tarea.");
    } finally {
      setAcceptingId(null);
    }
  }

  async function resolveOne(comment: CommentRow) {
    if (!canAccept) return;
    try {
      const response = await fetch(
        `/api/live/${encodedProjectId}/comments/${encodeURIComponent(comment.id)}/resolve`,
        { method: "POST" },
      );
      if (!response.ok) {
        setError("No se pudo marcar resuelto.");
        return;
      }
      setResolvedIds((m) => ({ ...m, [comment.id]: true }));
      await load();
    } catch {
      setError("No se pudo marcar resuelto.");
    }
  }

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
      <div className={cn("flex items-center justify-between gap-2", workspace && "-mx-4 -mt-4 h-10 shrink-0 border-b border-[var(--border-1)] px-4")}>
        <div className="flex items-center gap-2">
          <IconChat size={13} />
          <h2 className="text-[12px] font-medium">Comentarios</h2>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setPromptOpen((v) => !v)} disabled={comments.length === 0} className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 font-mono text-[8px] uppercase tracking-[0.08em] hover:bg-[#f2f2f0] disabled:opacity-35" aria-expanded={promptOpen}>
            <IconSparkles size={11} /> Prompt
          </button>
          {onMinimize ? <MinimizeButton onClick={onMinimize} label="comentarios" /> : null}
          {onFocus ? <FocusButton focused={focused} onClick={onFocus} label="comentarios" /> : null}
        </div>
      </div>

      <div className="mt-3 flex gap-1">
        {(["all", "open", "system"] as ThreadFilter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-md border px-2 py-1 font-mono text-[8px] uppercase tracking-[0.08em]",
              filter === f ? "border-black bg-black text-white" : "border-[var(--border-1)]",
            )}
          >
            {f === "all" ? "Todos" : f === "open" ? "Abiertos" : "Sistema"}
          </button>
        ))}
      </div>

      <div className="mt-3">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              void send();
            }
          }}
          rows={3}
          maxLength={4000}
          placeholder="Deja una observación…"
          className="w-full resize-y rounded-md border border-[var(--border-1)] bg-white px-3 py-2.5 text-[12px] text-black placeholder:text-[var(--fg-muted)] focus:border-black"
        />
        <button type="button" onClick={() => void send()} disabled={busy || !body.trim()} className="btn-primary mt-2 w-full disabled:opacity-40">
          {busy ? <IconLoader size={13} className="animate-spin" /> : <IconSend size={13} />}
          Comentar
        </button>
      </div>

      {error ? <p className="mt-3 text-[10px] leading-4 text-black">{error}</p> : null}

      {promptOpen && (draftPrompt || promptText) ? (
        <div className="mt-4 rounded-md border border-black bg-[#f7f7f5] p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-medium text-black">{draftPrompt ? "Prompt de este comentario" : "Prompt de mejora"}</p>
            <button type="button" onClick={() => void copyPrompt(draftPrompt ?? undefined)} className="btn-secondary !min-h-8 !px-2.5">
              {copied ? <IconCheck size={11} /> : <IconCopy size={11} />}
              {copied ? "Copiado" : "Copiar"}
            </button>
          </div>
          <textarea readOnly value={draftPrompt ?? promptText} rows={8} className="mt-3 w-full resize-y rounded-md border border-[var(--border-1)] bg-white px-3 py-2 font-mono text-[9px] leading-4 text-black" />
        </div>
      ) : null}

      <div className={cn("mt-5 space-y-3 overflow-y-auto pr-1", workspace ? "min-h-0 flex-1" : rail ? "max-h-[360px]" : "max-h-[300px]")}>
        {!loaded ? (
          <div className="grid min-h-20 place-items-center"><IconLoader size={13} className="animate-spin" /></div>
        ) : visible.length === 0 ? (
          <p className="text-[11px] leading-5 text-[var(--fg-muted)]">No hay comentarios en este filtro.</p>
        ) : (
          visible.map((comment) => {
            const system = isSystem(comment);
            const taskId = acceptedMap[comment.id];
            const resolved = !!resolvedIds[comment.id];
            return (
              <article
                key={comment.id}
                id={`comment-${comment.id}`}
                className={cn(
                  "rounded-md border p-3",
                  system ? "border-black/20 bg-[#eef6ee]" : resolved ? "border-[var(--border-1)] bg-[#f0f0ee] opacity-70" : "border-[var(--border-1)] bg-[#f7f7f5]",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--fg-muted)]">
                      {system ? "Sistema" : resolved ? "Resuelto" : taskId ? "En cola" : "Feedback"}
                    </p>
                    <p className="truncate text-[10px] font-medium text-black">{comment.author_name ?? comment.author_email}</p>
                  </div>
                  <span className="shrink-0 font-mono text-[8px] text-[var(--fg-muted)]">{timeAgo(comment.created_at)}</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap break-words text-[11px] leading-5 text-[var(--fg-secondary)]">{comment.body}</p>
                {comment.anchor ? (
                  <a href={comment.anchor.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex max-w-full items-center rounded-md border border-black px-2 py-1 font-mono text-[8px] uppercase tracking-[0.08em] hover:bg-black hover:text-white">
                    <span className="truncate">{comment.anchor.label}</span>
                  </a>
                ) : null}
                {!system && canAccept ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <button type="button" onClick={() => proposeOne(comment)} className="inline-flex h-7 items-center gap-1 rounded-md border border-[var(--border-1)] bg-white px-2 font-mono text-[8px] uppercase tracking-[0.08em] hover:border-black">
                      <IconSparkles size={10} /> Prompt
                    </button>
                    <button type="button" disabled={!!acceptingId || !!taskId || resolved} onClick={() => void acceptOne(comment, false)} className="inline-flex h-7 items-center gap-1 rounded-md border border-black bg-white px-2 font-mono text-[8px] uppercase tracking-[0.08em] disabled:opacity-40">
                      {acceptingId === comment.id ? <IconLoader size={10} className="animate-spin" /> : <IconCheck size={10} />}
                      {taskId ? "En cola" : "Aceptar"}
                    </button>
                    <button type="button" disabled={!!acceptingId || resolved} onClick={() => void acceptOne(comment, true)} className="inline-flex h-7 items-center gap-1 rounded-md bg-black px-2 font-mono text-[8px] uppercase tracking-[0.08em] text-white disabled:opacity-40">
                      Aceptar → Estudio
                    </button>
                    <button type="button" disabled={resolved || !!taskId} onClick={() => void resolveOne(comment)} className="inline-flex h-7 items-center gap-1 rounded-md border border-[var(--border-1)] px-2 font-mono text-[8px] uppercase tracking-[0.08em] disabled:opacity-40">
                      Resuelto
                    </button>
                  </div>
                ) : null}
              </article>
            );
          })
        )}
      </div>

      <p className="mt-4 flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--fg-muted)]">
        <IconCheck size={10} /> {canAccept ? "Owner: aceptar → cola + Estudio" : "Sólo miembros del proyecto"}
      </p>
    </section>
  );
}
