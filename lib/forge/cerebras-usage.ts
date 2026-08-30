export interface CerebrasUsage {
  promptTokens: number;
  completionTokens: number;
}

export function usageFromCompletion(value: unknown): CerebrasUsage | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as {
    prompt_tokens?: unknown;
    completion_tokens?: unknown;
    promptTokens?: unknown;
    completionTokens?: unknown;
  };
  const prompt =
    typeof raw.prompt_tokens === "number"
      ? raw.prompt_tokens
      : typeof raw.promptTokens === "number"
        ? raw.promptTokens
        : null;
  const completion =
    typeof raw.completion_tokens === "number"
      ? raw.completion_tokens
      : typeof raw.completionTokens === "number"
        ? raw.completionTokens
        : null;
  if (
    prompt == null ||
    completion == null ||
    !Number.isFinite(prompt) ||
    !Number.isFinite(completion) ||
    prompt < 0 ||
    completion < 0
  ) {
    return null;
  }
  return {
    promptTokens: Math.round(prompt),
    completionTokens: Math.round(completion),
  };
}

export function isRetryableCerebrasCause(cause: string): boolean {
  return cause === "rate_limit" || cause === "timeout" || cause === "unavailable";
}
