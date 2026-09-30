// Paleta obsidian de la Forja — nivel Prada/Linear. Un solo lugar de verdad.
export const F = {
  void: "#f7f7f5",
  bg: "#f7f7f5",
  surface: "#ffffff",
  surfaceHi: "#f2f2f0",
  violet: "#0a0a0a",
  cyan: "#34363a",
  silver: "#0a0a0a",
  red: "#f2506e",
  amber: "#fbbf24",
  fg: "#0a0a0a",
  fg2: "#34363a",
  fg3: "#6b6e73",
  border: "#dedfdf",
  border2: "#bfc1c3",
} as const;

// Color por status de job — fuente única para orbe/barra/badges.
export function statusColor(status: string): string {
  const s = (status || "").toLowerCase();
  if (s === "running" || s === "in_progress") return F.violet;
  if (s === "done" || s === "completed") return F.cyan;
  if (s === "error" || s === "failed") return F.red;
  return "rgba(231,235,246,0.35)"; // pending / desconocido
}

export function statusLabel(status: string): string {
  const s = (status || "").toLowerCase();
  const map: Record<string, string> = {
    running: "corriendo",
    in_progress: "corriendo",
    done: "listo",
    completed: "listo",
    error: "error",
    failed: "falló",
    pending: "en espera",
    queued: "en espera",
  };
  return map[s] ?? s;
}
