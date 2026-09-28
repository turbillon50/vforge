"use client";

import { useState } from "react";
import {
  IconCheck,
  IconLoader,
  IconMap,
  IconSend,
  IconX,
} from "@/components/brand/VFIcons";
import { useReviewContext, type ReviewDraftNote } from "@/components/live/ReviewContext";

export function ReviewNotesTray({ projectId }: { projectId: string }) {
  const {
    draftNotes,
    updateDraftBody,
    removeDraftNote,
    notifyCommentsChanged,
  } = useReviewContext();
  const [collapsed, setCollapsed] = useState(false);
  const [publishing, setPublishing] = useState<string | "all" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const encodedProjectId = encodeURIComponent(projectId);

  if (draftNotes.length === 0) return null;

  async function publish(note: ReviewDraftNote) {
    const body = note.body.trim();
    if (!body) return false;
    const response = await fetch(`/api/live/${encodedProjectId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body, anchor: note.anchor }),
    });
    if (!response.ok) throw new Error("publish_failed");
    removeDraftNote(note.id);
    notifyCommentsChanged();
    return true;
  }

  async function publishOne(note: ReviewDraftNote) {
    if (publishing || !note.body.trim()) return;
    setPublishing(note.id);
    setError(null);
    try {
      await publish(note);
    } catch {
      setError("No se pudo publicar esta nota. El borrador sigue aquí.");
    } finally {
      setPublishing(null);
    }
  }

  async function publishAll() {
    if (publishing || draftNotes.some((note) => !note.body.trim())) return;
    setPublishing("all");
    setError(null);
    try {
      for (const note of draftNotes) await publish(note);
    } catch {
      setError("Una nota no pudo publicarse. Las pendientes se conservaron.");
    } finally {
      setPublishing(null);
    }
  }

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        className="fixed bottom-4 right-4 z-[80] inline-flex h-11 items-center gap-2 rounded-[8px] border border-black bg-white px-4 text-[11px] font-medium text-black shadow-[0_12px_35px_rgba(0,0,0,0.18)]"
      >
        <IconMap size={13} /> {draftNotes.length} {draftNotes.length === 1 ? "nota pendiente" : "notas pendientes"}
      </button>
    );
  }

  const allReady = draftNotes.every((note) => note.body.trim());

  return (
    <aside className="fixed bottom-4 right-4 z-[80] flex max-h-[min(680px,calc(100dvh-32px))] w-[min(400px,calc(100vw-24px))] flex-col overflow-hidden rounded-[8px] border border-black bg-white text-black shadow-[0_18px_50px_rgba(0,0,0,0.2)]" aria-label="Bandeja de notas ancladas">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-black px-4">
        <div className="flex items-center gap-2">
          <IconMap size={13} />
          <p className="text-[12px] font-medium">Notas ancladas</p>
          <span className="rounded-full bg-black px-2 py-0.5 font-mono text-[8px] text-white">{draftNotes.length}</span>
        </div>
        <button type="button" onClick={() => setCollapsed(true)} className="grid h-7 w-7 place-items-center rounded-md hover:bg-[#f2f2f0]" aria-label="Minimizar notas" title="Minimizar">
          <span className="h-px w-3 bg-current" />
        </button>
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[#f7f7f5] p-3">
        {draftNotes.map((note, index) => (
          <section key={note.id} className="rounded-[6px] border border-[var(--border-1)] bg-white p-3">
            <div className="flex items-start gap-2">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-black font-mono text-[9px]">{index + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-[8px] uppercase tracking-[0.08em]">{note.anchor.label}</p>
                <p className="mt-1 truncate text-[9px] text-[var(--fg-muted)]">{note.anchor.viewport}</p>
              </div>
              <button type="button" onClick={() => removeDraftNote(note.id)} className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-[var(--border-1)] hover:border-black" aria-label={`Eliminar nota ${index + 1}`}>
                <IconX size={10} />
              </button>
            </div>
            <textarea
              value={note.body}
              onChange={(event) => updateDraftBody(note.id, event.target.value)}
              rows={3}
              maxLength={4000}
              autoFocus={index === draftNotes.length - 1}
              placeholder="Escribe la observación para este punto…"
              className="mt-3 w-full resize-y rounded-md border border-[var(--border-1)] bg-white px-3 py-2.5 text-[11px] placeholder:text-[var(--fg-muted)] focus:border-black"
            />
            <button type="button" onClick={() => void publishOne(note)} disabled={!!publishing || !note.body.trim()} className="mt-2 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-black bg-white px-3 font-mono text-[8px] uppercase tracking-[0.08em] hover:bg-black hover:text-white disabled:opacity-35">
              {publishing === note.id ? <IconLoader size={11} className="animate-spin" /> : <IconCheck size={11} />}
              Publicar esta nota
            </button>
          </section>
        ))}
      </div>

      <footer className="shrink-0 border-t border-black bg-white p-3">
        {error ? <p className="mb-2 text-[10px] leading-4">{error}</p> : null}
        <button type="button" onClick={() => void publishAll()} disabled={!!publishing || !allReady} className="btn-primary w-full disabled:opacity-35">
          {publishing === "all" ? <IconLoader size={13} className="animate-spin" /> : <IconSend size={13} />}
          Publicar todas
        </button>
        {!allReady ? <p className="mt-2 text-center font-mono text-[8px] uppercase tracking-[0.08em] text-[var(--fg-muted)]">Escribe una nota en cada ancla</p> : null}
      </footer>
    </aside>
  );
}
