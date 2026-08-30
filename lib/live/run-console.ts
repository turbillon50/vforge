/** Copy honesta cuando el runner aún no escribe log. No finge voz de Grok. */
export function runnerWaitCopy(elapsedMs: number, hasLog: boolean): string | null {
  if (hasLog) return null;
  if (elapsedMs < 8_000) return "En cola de Vulcano. Grok aún no escribe.";
  if (elapsedMs < 25_000) return "Sigue en cola. El daemon no ha soltado log.";
  return "El runner no ha escrito nada. Si pasa de un minuto, Grok no tomó el job.";
}

export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  if (minutes <= 0) return `${seconds}s`;
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

export function canApplyRun(status: string): boolean {
  return (
    status === "awaiting_preview" ||
    status === "awaiting_approval" ||
    status === "preview_ready"
  );
}

export function isLiveRunStatus(status: string): boolean {
  return (
    status === "preparing" ||
    status === "queued" ||
    status === "running" ||
    status === "awaiting_preview"
  );
}
