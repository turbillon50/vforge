/**
 * Señales de fallo de proveedor. Nunca deben persistirse como voz de V.
 */

export type ProviderCause =
  | "quota"
  | "rate_limit"
  | "timeout"
  | "empty"
  | "exit"
  | "unavailable"
  | "unknown";

export class ProviderUnavailable extends Error {
  readonly code = "ProviderUnavailable" as const;

  constructor(
    readonly provider: string,
    readonly cause: ProviderCause,
    message: string,
    readonly durationMs: number,
  ) {
    super(message);
    this.name = "ProviderUnavailable";
  }
}

const SIGNAL_RULES: Array<{ cause: ProviderCause; pattern: RegExp }> = [
  { cause: "quota", pattern: /weekly\s+limit|usage\s+limit|hit your (?:weekly|monthly|usage) limit/i },
  { cause: "rate_limit", pattern: /rate\s*limit|too many requests|429\b/i },
  { cause: "timeout", pattern: /\btimeout\b|timed?\s*out|aborted|abort(?:ed)?\b/i },
  { cause: "exit", pattern: /c[oó]digo\s*1\b|code\s*1\b|termin[oó] con c[oó]digo|command failed|WARNING:\s*claude/i },
  { cause: "unavailable", pattern: /provider unavailable|service unavailable|binario de claude no encontrado/i },
];

export function classifyProviderText(text: string): ProviderCause | null {
  const trimmed = text.trim();
  if (!trimmed) return "empty";
  for (const rule of SIGNAL_RULES) {
    if (rule.pattern.test(trimmed)) return rule.cause;
  }
  return null;
}

export function isInvalidModelOutput(text: string): boolean {
  return classifyProviderText(text) !== null;
}

export function dropInvalidAssistantTurns<
  T extends { id: string; role: string; mode?: string; content: string },
>(rows: T[]): T[] {
  const drop = new Set<string>();
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    if (row.role !== "assistant" || !isInvalidModelOutput(row.content)) continue;
    drop.add(row.id);
    const prev = rows[i - 1];
    if (
      prev &&
      prev.role === "user" &&
      (prev.mode ?? "") === (row.mode ?? "")
    ) {
      drop.add(prev.id);
    }
  }
  return rows.filter((row) => !drop.has(row.id));
}

export function assertValidModelOutput(
  text: string,
  provider: string,
  durationMs: number,
): string {
  const trimmed = text.trim();
  const cause = classifyProviderText(trimmed);
  if (cause) {
    throw new ProviderUnavailable(
      provider,
      cause,
      trimmed.slice(0, 240) || "respuesta vacía",
      durationMs,
    );
  }
  return trimmed;
}

export function providerUnavailableFromUnknown(
  provider: string,
  caught: unknown,
  durationMs: number,
): ProviderUnavailable {
  if (caught instanceof ProviderUnavailable) return caught;
  const message =
    caught instanceof Error ? caught.message : String(caught ?? "unknown");
  const cause = classifyProviderText(message) ?? inferCauseFromError(caught);
  return new ProviderUnavailable(provider, cause, message.slice(0, 240), durationMs);
}

function inferCauseFromError(caught: unknown): ProviderCause {
  if (!caught || typeof caught !== "object") return "unknown";
  const status =
    "status" in caught && typeof caught.status === "number"
      ? caught.status
      : "statusCode" in caught && typeof caught.statusCode === "number"
        ? caught.statusCode
        : null;
  if (status === 429) return "rate_limit";
  if (status === 402) return "quota";
  if (status === 408 || status === 504) return "timeout";
  if (status !== null && status >= 500) return "unavailable";
  const name = "name" in caught && typeof caught.name === "string" ? caught.name : "";
  if (name === "AbortError" || name === "TimeoutError") return "timeout";
  return "unknown";
}

export function humanProviderLabel(provider: string): string {
  switch (provider) {
    case "cerebras":
      return "GPT OSS";
    case "mesh":
      return "Mesh";
    case "hetzner-claude":
      return "Claude";
    default:
      return provider;
  }
}
