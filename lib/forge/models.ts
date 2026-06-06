/**
 * Model registry for the Forge brain (V).
 *
 * Source of truth for every LLM V can route to via OpenRouter. The
 * routing policy in lib/forge/routing.ts consumes this catalog to
 * decide which model to invoke for a given task, and the fallback
 * chain in /api/forge/run uses the `fallback_chain` field to recover
 * from provider failures.
 *
 * Pricing per 1M tokens (USD) — sourced from https://openrouter.ai/models.
 * Update when adding/removing models or when OpenRouter publishes a
 * price change. The estimateCost path in /api/forge/run reads from
 * here so the audit log stays accurate.
 */

export type ModelTier = "cheap" | "balanced" | "premium";
export type ModelKind = "paid" | "free";

export interface ModelInfo {
  /** OpenRouter slug as used in API requests. */
  slug: string;
  /** Short human label. */
  label: string;
  /** USD per 1M input tokens. 0 for :free models (subject to OR's 50/day cap). */
  costInPer1M: number;
  /** USD per 1M output tokens. */
  costOutPer1M: number;
  tier: ModelTier;
  kind: ModelKind;
  /** Whether the model supports OpenAI-format function/tool calling. */
  supportsTools: boolean;
  /** Max context window in tokens. */
  contextWindow: number;
  /** Hints about what this model is good at. Used by routing.ts. */
  goodFor: ReadonlyArray<TaskKind>;
  /**
   * Ordered list of slugs to try if THIS model fails (402/429/5xx).
   * Convention: cascade from same-tier → cheaper-tier → free.
   */
  fallbackChain: ReadonlyArray<string>;
}

export type TaskKind =
  | "chat-main" // primary conversation with V
  | "reasoning" // multi-step plans, code review, debugging
  | "code-edit" // editing existing code
  | "classification" // categorize a repo, score a file
  | "summarization" // condense a chat / dump / doc
  | "extraction" // pull structured data from text
  | "web-search" // not used directly — anthropic-web-search handles
  | "embedding"; // text-embedding-3-small etc.

export const MODELS: Record<string, ModelInfo> = {
  // ─── Anthropic via OpenRouter (paid premium) ─────────────────────
  "anthropic/claude-opus-4.7": {
    slug: "anthropic/claude-opus-4.7",
    label: "Claude Opus 4.7",
    costInPer1M: 15,
    costOutPer1M: 75,
    tier: "premium",
    kind: "paid",
    supportsTools: true,
    contextWindow: 200_000,
    goodFor: ["reasoning", "code-edit"],
    fallbackChain: [
      "anthropic/claude-sonnet-4.6",
      "openai/gpt-5",
      "anthropic/claude-haiku-4.5",
    ],
  },
  "anthropic/claude-sonnet-4.6": {
    slug: "anthropic/claude-sonnet-4.6",
    label: "Claude Sonnet 4.6",
    costInPer1M: 3,
    costOutPer1M: 15,
    tier: "balanced",
    kind: "paid",
    supportsTools: true,
    contextWindow: 200_000,
    goodFor: ["chat-main", "reasoning", "code-edit", "extraction"],
    fallbackChain: [
      "anthropic/claude-sonnet-4.5",
      "anthropic/claude-haiku-4.5",
      "google/gemini-2.5-pro",
      "openai/gpt-5",
      "moonshotai/kimi-k2.6:free",
    ],
  },
  "anthropic/claude-sonnet-4.5": {
    slug: "anthropic/claude-sonnet-4.5",
    label: "Claude Sonnet 4.5",
    costInPer1M: 3,
    costOutPer1M: 15,
    tier: "balanced",
    kind: "paid",
    supportsTools: true,
    contextWindow: 200_000,
    goodFor: ["chat-main", "reasoning", "code-edit", "extraction"],
    fallbackChain: [
      "anthropic/claude-haiku-4.5",
      "google/gemini-2.5-pro",
      "openai/gpt-5",
      "moonshotai/kimi-k2.6:free",
    ],
  },
  "anthropic/claude-haiku-4.5": {
    slug: "anthropic/claude-haiku-4.5",
    label: "Claude Haiku 4.5",
    costInPer1M: 0.8,
    costOutPer1M: 4,
    tier: "cheap",
    kind: "paid",
    supportsTools: true,
    contextWindow: 200_000,
    goodFor: ["classification", "summarization", "extraction"],
    fallbackChain: [
      "google/gemini-2.5-flash",
      "moonshotai/kimi-k2.6:free",
      "google/gemma-4-31b-it:free",
    ],
  },

  // ─── Google via OpenRouter (paid) ────────────────────────────────
  "google/gemini-2.5-pro": {
    slug: "google/gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    costInPer1M: 1.25,
    costOutPer1M: 5,
    tier: "balanced",
    kind: "paid",
    supportsTools: true,
    contextWindow: 1_048_576,
    goodFor: ["reasoning", "extraction", "summarization"],
    fallbackChain: [
      "anthropic/claude-sonnet-4.6",
      "google/gemini-2.5-flash",
    ],
  },
  "google/gemini-2.5-flash": {
    slug: "google/gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    costInPer1M: 0.075,
    costOutPer1M: 0.3,
    tier: "cheap",
    kind: "paid",
    supportsTools: true,
    contextWindow: 1_048_576,
    goodFor: ["classification", "summarization", "extraction"],
    fallbackChain: [
      "anthropic/claude-haiku-4.5",
      "moonshotai/kimi-k2.6:free",
      "google/gemma-4-31b-it:free",
    ],
  },

  // ─── OpenAI via OpenRouter (paid) ────────────────────────────────
  "openai/gpt-5": {
    slug: "openai/gpt-5",
    label: "GPT-5",
    costInPer1M: 1.25,
    costOutPer1M: 10,
    tier: "balanced",
    kind: "paid",
    supportsTools: true,
    contextWindow: 200_000,
    goodFor: ["reasoning", "code-edit"],
    fallbackChain: [
      "anthropic/claude-sonnet-4.6",
      "anthropic/claude-haiku-4.5",
    ],
  },

  // ─── Free models (subject to 50/day cap; 1000/day if account has $10 loaded) ───
  // Kimi K2.6 free es el motor gratis primario de V: existe en OpenRouter,
  // soporta tool-calling y maneja 262k de contexto. El slug DEBE llevar el
  // prefijo `moonshotai/` — sin él OpenRouter responde 404 (lo que el chat
  // traducía a "Recurso no encontrado" y mataba el tool-calling).
  "moonshotai/kimi-k2.6:free": {
    slug: "moonshotai/kimi-k2.6:free",
    label: "Kimi K2.6 (free)",
    costInPer1M: 0,
    costOutPer1M: 0,
    tier: "cheap",
    kind: "free",
    supportsTools: true,
    contextWindow: 262_144,
    goodFor: ["chat-main", "classification", "summarization"],
    fallbackChain: [
      "google/gemma-4-31b-it:free",
      "google/gemini-2.5-flash",
    ],
  },
  "google/gemma-4-31b-it:free": {
    slug: "google/gemma-4-31b-it:free",
    label: "Gemma 4 31B (free)",
    costInPer1M: 0,
    costOutPer1M: 0,
    tier: "cheap",
    kind: "free",
    supportsTools: true,
    contextWindow: 262_144,
    goodFor: ["classification", "summarization", "extraction"],
    fallbackChain: ["moonshotai/kimi-k2.6:free", "google/gemini-2.5-flash"],
  },
};

/**
 * Models indexed by TaskKind, sorted by recommended preference for that
 * task. routing.ts picks from here.
 */
export const TASK_PREFERENCES: Record<TaskKind, ReadonlyArray<string>> = {
  "chat-main": [
    "anthropic/claude-sonnet-4.6",
    "google/gemini-2.5-pro",
    "anthropic/claude-haiku-4.5",
    "moonshotai/kimi-k2.6:free",
  ],
  reasoning: [
    "anthropic/claude-opus-4.7",
    "anthropic/claude-sonnet-4.6",
    "openai/gpt-5",
    "google/gemini-2.5-pro",
  ],
  "code-edit": [
    "anthropic/claude-sonnet-4.6",
    "anthropic/claude-opus-4.7",
    "openai/gpt-5",
  ],
  classification: [
    "google/gemini-2.5-flash",
    "anthropic/claude-haiku-4.5",
    "moonshotai/kimi-k2.6:free",
    "google/gemma-4-31b-it:free",
  ],
  summarization: [
    "google/gemini-2.5-flash",
    "anthropic/claude-haiku-4.5",
    "moonshotai/kimi-k2.6:free",
  ],
  extraction: [
    "anthropic/claude-haiku-4.5",
    "google/gemini-2.5-flash",
    "anthropic/claude-sonnet-4.6",
  ],
  "web-search": [],
  embedding: [],
};

/**
 * Estimate cost for a given model + token counts. Falls back to Sonnet
 * pricing if the model isn't in the registry (defensive — OpenRouter
 * sometimes returns versioned slugs like 'anthropic/claude-4.6-sonnet-20260217').
 */
export function estimateCostForModel(
  slug: string,
  tokensIn: number,
  tokensOut: number,
): number {
  const normalized = normalizeSlug(slug);
  const m = MODELS[normalized] ?? MODELS["anthropic/claude-sonnet-4.6"];
  return Number(
    (
      (tokensIn / 1_000_000) * m.costInPer1M +
      (tokensOut / 1_000_000) * m.costOutPer1M
    ).toFixed(6),
  );
}

/**
 * Legacy short-name slugs (Anthropic SDK era) → OpenRouter slugs.
 * Some installs still have system_config.default_model = 'claude-sonnet-4-6'
 * from the seed migration. Without this map the cascade was starting
 * with an invalid OR slug and the first call returned a non-recoverable
 * 4xx, aborting the whole turn (Codex P0).
 */
const LEGACY_SLUG_MAP: Record<string, string> = {
  // Pre-OpenRouter short names (without 'anthropic/' prefix).
  "claude-opus-4-7": "anthropic/claude-opus-4.7",
  "claude-sonnet-4-6": "anthropic/claude-sonnet-4.6",
  "claude-haiku-4-5": "anthropic/claude-haiku-4.5",
  // Same variants WITH the 'anthropic/' prefix and dash instead of dot
  // (some seeds/clients emit this hybrid form).
  "anthropic/claude-opus-4-7": "anthropic/claude-opus-4.7",
  "anthropic/claude-sonnet-4-6": "anthropic/claude-sonnet-4.6",
  "anthropic/claude-sonnet-4-5": "anthropic/claude-sonnet-4.5",
  "anthropic/claude-haiku-4-5": "anthropic/claude-haiku-4.5",
  // Slug "pelón" sin proveedor: si agent_config quedó con el id corto, lo
  // resolvemos al slug válido de OpenRouter (si no, 404 → "Recurso no
  // encontrado" y muere el tool-calling).
  "kimi-k2.6:free": "moonshotai/kimi-k2.6:free",
  "kimi-k2.6": "moonshotai/kimi-k2.6",
};

/**
 * Strip OpenRouter's versioned date suffix so registry lookups hit
 * even when the response shape is "anthropic/claude-4.6-sonnet-20260217".
 * Also maps legacy Anthropic-SDK short names to OR slugs.
 */
export function normalizeSlug(slug: string): string {
  // Legacy short names from pre-OpenRouter era.
  if (LEGACY_SLUG_MAP[slug]) return LEGACY_SLUG_MAP[slug];
  // Versioned OR responses: "claude-4.6-sonnet-20260217" → "claude-sonnet-4.6"
  const m = slug.match(/^anthropic\/claude-(\d+\.\d+)-(opus|sonnet|haiku)/);
  if (m) return `anthropic/claude-${m[2]}-${m[1]}`;
  return slug.replace(/(-\d{8}|-\d{6})$/, "");
}
