"use client";

import { VConversationPanel } from "@/components/live/VConversationPanel";

/**
 * Pestaña V de la sala live (escritorio).
 *
 * Sólo chat. Sin terminal, sin consola, sin llamadas al endpoint de runs:
 * el permiso y el repositorio salen del propio GET del chat, así que si la
 * fábrica se cae la sala sigue sirviendo.
 */
export function VControlPanel({
  projectId,
  onClose,
}: {
  projectId: string;
  onClose: () => void;
}) {
  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[8px] border border-[var(--border-1)] bg-white">
      <VConversationPanel projectId={projectId} variant="desktop" onClose={onClose} />
    </section>
  );
}
