/**
 * Live catalog of every model OpenRouter exposes.
 *
 * The hand-curated MODELS map in lib/forge/models.ts is intentionally
 * small (9 entries) — it's the "preferred" set the router knows how
 * to reason about. But OpenRouter serves 365+ models and V should be
 * free to pick any of them. This module fetches the full catalog at
 * runtime, caches it for 15 min, and exposes search + pricing helpers.
 *
 * Tools that expose this to V:
 *   - openrouter_list_models   → top N models by recency / by group
 *   - openrouter_get_model     → full info for one slug
 *   - openrouter_search_models → filter by free, tools, ctx, etc.
 *
 * Used internally by:
 *   - agent_config_set       → validate slugs against the live catalog
 *   - estimateCostForModel   → dynamic pricing for unknown slugs
 */
import { getOperatorSecret } from "@/lib/vault/get-secret";

const ENDPOINT = "https://openrouter.ai/api/v1/models";
const CACHE_TTL_MS = 15 * 60 * 1000;

export interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  context_length?: number;
  /** USD per token, NOT per 1M. */
  pricing: {
    prompt: number;
    completion: number;
  };
  supports_tools: boolean;
  is_free: boolean;
  /** ex. 'anthropic', 'google', 'meta-llama', 'openai', ... */
  provider: string;
  /** ex. 'instruct', 'chat', 'coder', 'thinking', ... */
  modality?: string;
  raw?: unknown;
}

let CACHE: { models: Map<string, OpenRouterModel>; fetchedAt: number } | null = null;

function deriveProvider(id: string): string {
  const slash = id.indexOf("/");
  return slash > 0 ? id.slice(0, slash) : "unknown";
}

async function fetchFromOpenRouter(): Promise<Map<string, OpenRouterModel>> {
  const apiKey = await getOperatorSecret("OPENROUTER_API_KEY", {
    auditUserId: "or-catalog",
  });
  const headers: Record<string, string> = {};
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const resp = await fetch(ENDPOINT, { headers });
  if (!resp.ok) {
    throw new Error(`OpenRouter /models returned ${resp.status}`);
  }
  interface RawModel {
    id: string;
    name?: string;
    description?: string;
    context_length?: number;
    pricing?: { prompt?: string | number; completion?: string | number };
    supported_parameters?: string[];
    architecture?: { modality?: string; instruct_type?: string };
  }
  const json = (await resp.json()) as { data: RawModel[] };
  const map = new Map<string, OpenRouterModel>();
  for (const m of json.data ?? []) {
    const promptCost = Number(m.pricing?.prompt ?? 0) || 0;
    const completionCost = Number(m.pricing?.completion ?? 0) || 0;
    const supportsTools = (m.supported_parameters ?? []).includes("tools");
    const isFree = promptCost === 0 && completionCost === 0;
    map.set(m.id, {
      id: m.id,
      name: m.name ?? m.id,
      description: m.description,
      context_length: m.context_length,
      pricing: { prompt: promptCost, completion: completionCost },
      supports_tools: supportsTools,
      is_free: isFree,
      provider: deriveProvider(m.id),
      modality: m.architecture?.instruct_type ?? m.architecture?.modality,
    });
  }
  return map;
}

async function loadCatalog(): Promise<Map<string, OpenRouterModel>> {
  if (CACHE && CACHE.fetchedAt + CACHE_TTL_MS > Date.now()) {
    return CACHE.models;
  }
  const models = await fetchFromOpenRouter();
  CACHE = { models, fetchedAt: Date.now() };
  return models;
}

export function invalidateCatalogCache(): void {
  CACHE = null;
}

/**
 * Return every model OpenRouter exposes, optionally limited or
 * provider-filtered. Pass limit=0 for the full list.
 */
export async function listAllOpenRouterModels(options: {
  limit?: number;
  provider?: string;
} = {}): Promise<OpenRouterModel[]> {
  const catalog = await loadCatalog();
  let arr = Array.from(catalog.values());
  if (options.provider) {
    const p = options.provider.toLowerCase();
    arr = arr.filter((m) => m.provider.toLowerCase() === p);
  }
  const limit = options.limit ?? 50;
  if (limit > 0) arr = arr.slice(0, limit);
  return arr;
}

export async function getOpenRouterModel(
  slug: string,
): Promise<OpenRouterModel | null> {
  const catalog = await loadCatalog();
  return catalog.get(slug) ?? null;
}

/**
 * Filter the catalog. Useful for V to find "all free models with tool
 * support" or "cheapest model > 100K context", etc.
 */
export interface ModelFilter {
  free?: boolean;
  supports_tools?: boolean;
  min_context?: number;
  max_cost_per_1m_in?: number;
  max_cost_per_1m_out?: number;
  provider?: string;
  /** Substring match on id or name. */
  query?: string;
  limit?: number;
}

export async function searchOpenRouterModels(
  filter: ModelFilter,
): Promise<OpenRouterModel[]> {
  const catalog = await loadCatalog();
  let arr = Array.from(catalog.values());
  if (filter.free === true) arr = arr.filter((m) => m.is_free);
  if (filter.free === false) arr = arr.filter((m) => !m.is_free);
  if (filter.supports_tools !== undefined) {
    arr = arr.filter((m) => m.supports_tools === filter.supports_tools);
  }
  if (filter.min_context && filter.min_context > 0) {
    const min = filter.min_context;
    arr = arr.filter((m) => (m.context_length ?? 0) >= min);
  }
  if (filter.max_cost_per_1m_in !== undefined) {
    // pricing.prompt is per-token; convert to per-1M.
    const max = filter.max_cost_per_1m_in;
    arr = arr.filter((m) => m.pricing.prompt * 1_000_000 <= max);
  }
  if (filter.max_cost_per_1m_out !== undefined) {
    const max = filter.max_cost_per_1m_out;
    arr = arr.filter((m) => m.pricing.completion * 1_000_000 <= max);
  }
  if (filter.provider) {
    const p = filter.provider.toLowerCase();
    arr = arr.filter((m) => m.provider.toLowerCase() === p);
  }
  if (filter.query) {
    const q = filter.query.toLowerCase();
    arr = arr.filter(
      (m) =>
        m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q),
    );
  }
  // Cheapest first by default.
  arr.sort(
    (a, b) =>
      a.pricing.prompt * 1_000_000 +
      a.pricing.completion * 1_000_000 -
      (b.pricing.prompt * 1_000_000 + b.pricing.completion * 1_000_000),
  );
  const limit = filter.limit ?? 25;
  if (limit > 0) arr = arr.slice(0, limit);
  return arr;
}

/**
 * Dynamic cost estimation for ANY OR slug, even ones not in the
 * hand-curated MODELS map. Used as a fallback by estimateCostForModel
 * in lib/forge/models.ts.
 */
export async function estimateCostFromCatalog(
  slug: string,
  tokensIn: number,
  tokensOut: number,
): Promise<number | null> {
  const model = await getOpenRouterModel(slug);
  if (!model) return null;
  const cost =
    tokensIn * model.pricing.prompt + tokensOut * model.pricing.completion;
  return Number(cost.toFixed(6));
}

/**
 * Quick check: does this slug exist in OpenRouter right now?
 * Used by agent_config_set so V is only blocked when she invents
 * a slug that genuinely isn't routable.
 */
export async function isValidOpenRouterSlug(slug: string): Promise<boolean> {
  const catalog = await loadCatalog();
  return catalog.has(slug);
}
