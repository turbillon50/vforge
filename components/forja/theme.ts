// Paleta obsidian de la Forja — nivel Prada/Linear. Un solo lugar de verdad.
export const F = {
  void: "#03020a",
  bg: "#0a0814",
  surface: "#100d1e",
  surfaceHi: "#171331",
  violet: "#7c3aed",
  cyan: "#22d3ee",
  silver: "#e7ebf6",
  red: "#f2506e",
  amber: "#fbbf24",
  fg: "#e7ebf6",
  fg2: "rgba(231,235,246,0.62)",
  fg3: "rgba(231,235,246,0.40)",
  border: "rgba(231,235,246,0.08)",
  border2: "rgba(231,235,246,0.14)",
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
