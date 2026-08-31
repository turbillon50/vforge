"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { VConversationPanel } from "@/components/live/VConversationPanel";
import { IconX } from "@/components/brand/VFIcons";

interface Repository {
  repo_full_name: string;
  is_primary: boolean;
  default_branch: string | null;
}

export function VControlPanel({
  projectId,
  onClose,
}: {
  projectId: string;
  onClose: () => void;
}) {
  const [canWrite, setCanWrite] = useState(false);
  const [repository, setRepository] = useState("");
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef(false);

  const load = useCallback(async () => {
    if (pollingRef.current) return;
    pollingRef.current = true;
    try {
      const response = await fetch(`/api/live/${encodeURIComponent(projectId)}/runs`, {
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as {
        repositories?: Repository[];
        canWrite?: boolean;
      } | null;
      if (!response.ok) throw new Error("No se pudo leer la sala.");
      const nextRepos = Array.isArray(payload?.repositories) ? payload.repositories : [];
      setCanWrite(Boolean(payload?.canWrite));
      setRepository(
        (current) =>
          current ||
          nextRepos.find((repo) => repo.is_primary)?.repo_full_name ||
          nextRepos[0]?.repo_full_name ||
          "",
      );
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo leer la sala.");
    } finally {
      pollingRef.current = false;
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[8px] border border-[var(--border-1)] bg-white">
      <header className="flex h-10 shrink-0 items-center justify-between gap-3 border-b border-[var(--border-1)] px-3">
        <p className="truncate text-[11px] text-[var(--fg-muted)]">V</p>
        <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-md hover:bg-[var(--color-background)]" aria-label="Cerrar V">
          <IconX size={11} />
        </button>
      </header>
      {error ? (
        <p className="shrink-0 px-3 py-2 text-[12px] text-[var(--color-danger)]">{error}</p>
      ) : null}
      <div className="flex min-h-0 flex-1 flex-col">
        <VConversationPanel projectId={projectId} canWrite={canWrite} repository={repository} />
      </div>
    </section>
  );
}
