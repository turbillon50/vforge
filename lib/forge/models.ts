/**
 * Model registry for the Forge brain (V).
 *
 * OpenRouter was retired on 2026-10-01. This registry now recommends only
 * Cerebras/mesh model ids and keeps a small legacy normalizer so old DB rows
 * that contain provider-prefixed slugs degrade to the default Cerebras model.
 */

import { CEREBRAS_DEFAULT_MODEL } from "./llm-engine";

export type ModelTier = "cheap" | "balanced" | "premium";
export type ModelKind = "paid" | "free";

export interface ModelInfo {
  /** Model id accepted by Cerebras or the mesh router. */
  slug: string;
  /** Short human label. */
  label: string;
  /** Best-effort USD per 1M input tokens. */
  costInPer1M: number;
  /** Best-effort USD per 1M output tokens. */
  costOutPer1M: number;
  tier: ModelTier;
  kind: ModelKind;
  /** Whether the model supports OpenAI-format function/tool calling. */
  supportsTools: boolean;
  /** Max context window in tokens. */
  contextWindow: number;
  /** Hints about what this model is good at. Used by routing.ts. */
  goodFor: ReadonlyArray<TaskKind>;
  /** Ordered fallback ids for transient provider failures. */
  fallbackChain: ReadonlyArray<string>;
}

export type TaskKind =
  | "chat-main"
  | "reasoning"
  | "code-edit"
  | "classification"
  | "summarization"
  | "extraction"
  | "web-search"
  | "embedding";

export const MODELS: Record<string, ModelInfo> = {
  auto: {
    slug: "auto",
    label: "Mesh auto",
    costInPer1M: 0.7,
    costOutPer1M: 0.7,
    tier: "balanced",
    kind: "paid",
    supportsTools: true,
    contextWindow: 128_000,
    goodFor: ["chat-main", "reasoning", "classification", "summarization", "extraction"],
    fallbackChain: [CEREBRAS_DEFAULT_MODEL],
  },
  "gpt-oss-120b": {
    slug: "gpt-oss-120b",
    label: "GPT OSS 120B (Cerebras)",
    costInPer1M: 0.7,
    costOutPer1M: 0.7,
    tier: "balanced",
    kind: "paid",
    supportsTools: true,
    contextWindow: 128_000,
    goodFor: ["chat-main", "reasoning", "code-edit", "summarization"],
    fallbackChain: ["gemma-4-31b", "llama-3.3-70b"],
  },
  "gemma-4-31b": {
    slug: "gemma-4-31b",
    label: "Gemma 4 31B (Cerebras)",
    costInPer1M: 0.7,
    costOutPer1M: 0.7,
    tier: "cheap",
    kind: "paid",
    supportsTools: true,
    contextWindow: 128_000,
    goodFor: ["classification", "summarization", "extraction"],
    fallbackChain: ["gpt-oss-120b"],
  },
  "llama-3.3-70b": {
    slug: "llama-3.3-70b",
    label: "Llama 3.3 70B (Cerebras)",
    costInPer1M: 0.7,
    costOutPer1M: 0.7,
    tier: "balanced",
    kind: "paid",
    supportsTools: true,
    contextWindow: 128_000,
    goodFor: ["chat-main", "reasoning", "summarization"],
    fallbackChain: ["gpt-oss-120b"],
  },
  "qwen-3-32b": {
    slug: "qwen-3-32b",
    label: "Qwen 3 32B (Cerebras)",
    costInPer1M: 0.7,
    costOutPer1M: 0.7,
    tier: "cheap",
    kind: "paid",
    supportsTools: true,
    contextWindow: 128_000,
    goodFor: ["classification", "summarization", "extraction"],
    fallbackChain: ["gpt-oss-120b"],
  },
  "qwen-3.8-27b": {
    slug: "qwen-3.8-27b",
    label: "Qwen 3.8 27B Vision (Cerebras)",
    costInPer1M: 0.7,
    costOutPer1M: 0.7,
    tier: "balanced",
    kind: "paid",
    supportsTools: false,
    contextWindow: 128_000,
    goodFor: ["extraction", "summarization"],
    fallbackChain: ["auto"],
  },
};

export const TASK_PREFERENCES: Record<TaskKind, ReadonlyArray<string>> = {
  "chat-main": [CEREBRAS_DEFAULT_MODEL, "auto", "llama-3.3-70b"],
  reasoning: [CEREBRAS_DEFAULT_MODEL, "llama-3.3-70b", "auto"],
  "code-edit": [CEREBRAS_DEFAULT_MODEL, "llama-3.3-70b"],
  classification: ["gemma-4-31b", "qwen-3-32b", CEREBRAS_DEFAULT_MODEL],
  summarization: ["gemma-4-31b", "qwen-3-32b", CEREBRAS_DEFAULT_MODEL],
  extraction: ["qwen-3-32b", "gemma-4-31b", CEREBRAS_DEFAULT_MODEL],
  "web-search": [],
  embedding: [],
};

export function estimateCostForModel(
  slug: string,
  tokensIn: number,
  tokensOut: number,
): number {
  const normalized = normalizeSlug(slug);
  const m = MODELS[normalized] ?? MODELS[CEREBRAS_DEFAULT_MODEL] ?? MODELS["gpt-oss-120b"];
  return Number(
    (
      (tokensIn / 1_000_000) * m.costInPer1M +
      (tokensOut / 1_000_000) * m.costOutPer1M
    ).toFixed(6),
  );
}

const LEGACY_SLUG_MAP: Record<string, string> = {
  "claude-opus-4-7": CEREBRAS_DEFAULT_MODEL,
  "claude-sonnet-4-6": CEREBRAS_DEFAULT_MODEL,
  "claude-haiku-4-5": "gemma-4-31b",
  "anthropic/claude-opus-4-7": CEREBRAS_DEFAULT_MODEL,
  "anthropic/claude-sonnet-4-6": CEREBRAS_DEFAULT_MODEL,
  "anthropic/claude-sonnet-4.6": CEREBRAS_DEFAULT_MODEL,
  "anthropic/claude-sonnet-4-5": CEREBRAS_DEFAULT_MODEL,
  "anthropic/claude-sonnet-4.5": CEREBRAS_DEFAULT_MODEL,
  "anthropic/claude-haiku-4-5": "gemma-4-31b",
  "anthropic/claude-haiku-4.5": "gemma-4-31b",
  "google/gemini-2.5-flash": "gemma-4-31b",
  "google/gemini-2.5-pro": CEREBRAS_DEFAULT_MODEL,
  "openai/gpt-5": CEREBRAS_DEFAULT_MODEL,
  "moonshotai/kimi-k2.6:free": "qwen-3-32b",
  "google/gemma-4-31b-it:free": "gemma-4-31b",
};

export function normalizeSlug(slug: string): string {
  const s = slug.trim();
  if (!s) return CEREBRAS_DEFAULT_MODEL;
  if (LEGACY_SLUG_MAP[s]) return LEGACY_SLUG_MAP[s];
  if (!s.includes("/")) return s.replace(/(-\d{8}|-\d{6})$/, "");
  const last = s.split("/").pop() || s;
  if (/claude|gpt-5/i.test(last)) return CEREBRAS_DEFAULT_MODEL;
  if (/gemini|gemma/i.test(last)) return "gemma-4-31b";
  if (/llama.?3\.3.?70/i.test(last)) return "llama-3.3-70b";
  if (/qwen.?3\.?8.?27|scout|maverick|vision/i.test(last)) {
    return "qwen-3.8-27b";
  }
  if (/qwen/i.test(last)) return "qwen-3-32b";
  if (/gpt-oss|gpt.oss/i.test(last)) return "gpt-oss-120b";
  return CEREBRAS_DEFAULT_MODEL;
}
