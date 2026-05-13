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
  /** USD per token (or per-unit for non-token fields). */
  pricing: {
    prompt: number;
    completion: number;
    /** Per-request flat fee (some providers charge a request fee). */
    request: number;
    /** Per-image fee for vision models. */
    image: number;
    /** Per web-search call (for browsing-enabled models). */
    web_search: number;
    /** Per-token surcharge for internal reasoning chains. */
    internal_reasoning: number;
  };
  supports_tools: boolean;
  /** True only if EVERY pricing component is 0 — not just prompt+completion. */
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
    pricing?: {
      prompt?: string | number;
      completion?: string | number;
      request?: string | number;
      image?: string | number;
      web_search?: string | number;
      internal_reasoning?: string | number;
    };
    supported_parameters?: string[];
    architecture?: { modality?: string; instruct_type?: string };
  }
  const json = (await resp.json()) as { data: RawModel[] };
  const map = new Map<string, OpenRouterModel>();
  // Helper: any pricing field can arrive as string or number. Coerce
  // to number and treat NaN as 0. Negative impossible, but clamp.
  const num = (v: unknown): number => {
    const n = Number(v ?? 0);
    return Number.isFinite(n) && n > 0 ? n : 0;
  };
  for (const m of json.data ?? []) {
    const pricing = {
      prompt: num(m.pricing?.prompt),
      completion: num(m.pricing?.completion),
      request: num(m.pricing?.request),
      image: num(m.pricing?.image),
      web_search: num(m.pricing?.web_search),
      internal_reasoning: num(m.pricing?.internal_reasoning),
    };
    // is_free must consider ALL pricing fields — not just prompt+completion.
    // A model with $0 tokens but $0.01 per-request is NOT free (Codex P2).
    const isFree =
      pricing.prompt === 0 &&
      pricing.completion === 0 &&
      pricing.request === 0 &&
      pricing.image === 0 &&
      pricing.web_search === 0 &&
      pricing.internal_reasoning === 0;
    const supportsTools = (m.supported_parameters ?? []).includes("tools");
    map.set(m.id, {
      id: m.id,
      name: m.name ?? m.id,
      description: m.description,
      context_length: m.context_length,
      pricing,
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
  // Cheapest first by default. Sum per-1M-token cost + a flat-fee
  // surcharge so a model with $0 tokens but $0.01/request doesn't
  // sort ahead of a genuinely cheap one (Codex P2).
  const totalUnitCost = (m: OpenRouterModel): number =>
    m.pricing.prompt * 1_000_000 +
    m.pricing.completion * 1_000_000 +
    // Amortize per-request: assume ~1 call per "unit". This is a sort
    // heuristic only; estimateCostFromCatalog computes the real number.
    m.pricing.request * 1_000_000;
  arr.sort((a, b) => totalUnitCost(a) - totalUnitCost(b));
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
  // Per-token + per-request fees. Image / web_search apply only when
  // those features are used and aren't counted here (V's chat-main
  // call neither attaches images nor browses inside this code path).
  const cost =
    tokensIn * model.pricing.prompt +
    tokensOut * model.pricing.completion +
    model.pricing.request;
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
