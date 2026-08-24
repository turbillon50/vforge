/** Clave compartida sala live ↔ Estudio para prompt de tarea aceptada. */
export const PENDING_PROMPT_KEY = "vforge:pending-live-prompt";

export type PendingLivePrompt = {
  projectId: string;
  taskId: string;
  prompt: string;
  at: number;
};

export function readPendingPrompt(): PendingLivePrompt | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(PENDING_PROMPT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingLivePrompt;
    if (
      !parsed ||
      typeof parsed.prompt !== "string" ||
      typeof parsed.projectId !== "string"
    ) {
      return null;
    }
    // Caduca a las 2h
    if (Date.now() - (parsed.at || 0) > 2 * 60 * 60 * 1000) {
      sessionStorage.removeItem(PENDING_PROMPT_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingPrompt(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(PENDING_PROMPT_KEY);
  } catch {
    /* ignore */
  }
}

export function writePendingPrompt(data: PendingLivePrompt): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(PENDING_PROMPT_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}
