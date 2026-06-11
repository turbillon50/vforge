// lib/forge/token-health.ts
// Tipos + lógica de tono del indicador de salud del token OAuth de Claude.
// Fuente real: /root/agents/refresh_token.sh publica
// /home/brain-files/token-health.json en Hetzner, servido por el brain-relay.
// CERO MOCK — si no hay lectura, el tono es "unknown" y la UI calla.

export type TokenHealth = {
  hours_left: number | null;
  status: string | null; // "ok" | "critico"
  checked_at: string | null; // ISO
};

export type TokenTone = "green" | "amber" | "red" | "unknown";

/**
 * Verde >3h · Ámbar 1–3h · Rojo <1h o status "critico".
 * Sin dato numérico => "unknown" (no pintamos un estado falso).
 */
export function tokenTone(h: TokenHealth | null): TokenTone {
  if (!h || typeof h.hours_left !== "number" || !Number.isFinite(h.hours_left)) {
    // Un status "critico" sin horas todavía es rojo.
    return h?.status === "critico" ? "red" : "unknown";
  }
  if (h.status === "critico" || h.hours_left < 1) return "red";
  if (h.hours_left <= 3) return "amber";
  return "green";
}

export const TONE_COLOR: Record<TokenTone, string> = {
  green: "#34d399",
  amber: "#fbbf24",
  red: "#f87171",
  unknown: "#94a3b8",
};

/** "6.3h" / "12h" / "—" para etiquetas compactas. */
export function hoursLabel(h: TokenHealth | null): string {
  if (!h || typeof h.hours_left !== "number" || !Number.isFinite(h.hours_left)) {
    return "—";
  }
  const v = h.hours_left;
  if (v <= 0) return "0h";
  if (v >= 10) return `${Math.round(v)}h`;
  return `${v.toFixed(1)}h`;
}

/** Texto del tooltip: "Conexión Claude: expira en 6.3 h". */
export function tooltipText(h: TokenHealth | null): string {
  if (!h || typeof h.hours_left !== "number" || !Number.isFinite(h.hours_left)) {
    return "Conexión Claude: sin lectura del relay";
  }
  if (h.status === "critico") {
    return `Conexión Claude en riesgo — expira en ${h.hours_left.toFixed(1)} h`;
  }
  return `Conexión Claude: expira en ${h.hours_left.toFixed(1)} h`;
}
