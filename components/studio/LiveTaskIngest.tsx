"use client";

import { useEffect, useRef } from "react";
import {
  clearPendingPrompt,
  readPendingPrompt,
} from "@/lib/live/pending-prompt";

/**
 * Al abrir el Estudio con ?projectId=&task= o sessionStorage de sala live,
 * rellena el composer y selecciona el proyecto.
 * Montar una sola vez dentro de ForgeStudio.
 */
export function LiveTaskIngest({
  onProject,
  onDraft,
  onBanner,
}: {
  onProject: (projectId: string) => void;
  onDraft: (text: string) => void;
  onBanner?: (text: string | null) => void;
}) {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const params = new URLSearchParams(window.location.search);
    const projectId = params.get("projectId") || params.get("project");
    const taskId = params.get("task");

    if (projectId) onProject(projectId);

    const pending = readPendingPrompt();
    if (pending?.prompt) {
      if (pending.projectId) onProject(pending.projectId);
      onDraft(pending.prompt);
      onBanner?.(
        `Tarea ${pending.taskId.slice(0, 8)} desde la sala live · revisa y envía`,
      );
      clearPendingPrompt();
      return;
    }

    if (taskId && projectId) {
      void fetch(
        `/api/live/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(taskId)}`,
        { cache: "no-store" },
      )
        .then(async (res) => {
          if (!res.ok) return;
          const data = (await res.json()) as {
            task?: { prompt?: string; status?: string };
          };
          if (data.task?.prompt) {
            onDraft(data.task.prompt);
            onBanner?.(
              `Tarea ${taskId.slice(0, 8)} · ${data.task.status ?? "queued"} · revisa y envía`,
            );
          }
        })
        .catch(() => undefined);
    }
  }, [onBanner, onDraft, onProject]);

  return null;
}
