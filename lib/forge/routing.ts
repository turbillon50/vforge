/**
 * Routing policy v1 — picks an OpenRouter model for a given task.
 *
 * Inputs the router considers:
 *   - task kind (chat-main, classification, etc.)
 *   - cost preference (cheapest | balanced | premium)
 *   - free-tier override (e.g. when balance is low)
 *   - excluded models (e.g. previously failed in this turn)
 *
 * Output: a primary slug + its fallback_chain from the registry. The
 * caller in /api/forge/run iterates the chain when the primary errors.
 *
 * v2 (M11+) will use a classifier trained on past runs vs success. For
 * now, heuristics + the curated TASK_PREFERENCES table are enough.
 */
import { MODELS, TASK_PREFERENCES, type TaskKind, type ModelKind } from "./models";

export interface RoutingDecision {
  primary: string;
  /** All slugs to try in order: [primary, ...fallbacks]. */
  cascade: string[];
  reason: string;
}

export interface RoutingOptions {
  /**
   * 'cheapest'  → prefer cheap-tier, fall back to free
   * 'balanced'  → prefer balanced-tier (Sonnet, Gemini Pro)
   * 'premium'   → Opus first
   * 'free-only' → only kind='free'
   */
  costPreference?: "cheapest" | "balanced" | "premium" | "free-only";
  /** Slugs to skip (e.g. failed earlier in this round). */
  excludeSlugs?: ReadonlyArray<string>;
  /** Force a specific model (overrides everything else). */
  forceSlug?: string;
}

const TIER_WEIGHT: Record<"cheap" | "balanced" | "premium", number> = {
  cheap: 1,
  balanced: 2,
  premium: 3,
};

export function routeFor(
  task: TaskKind,
  options: RoutingOptions = {},
): RoutingDecision {
  if (options.forceSlug) {
    const m = MODELS[options.forceSlug];
    if (!m) {
      throw new Error(`Unknown forceSlug '${options.forceSlug}'`);
    }
    return {
      primary: m.slug,
      cascade: [m.slug, ...m.fallbackChain.filter((s) => !options.excludeSlugs?.includes(s))],
      reason: "forced by caller",
    };
  }

  const preferences = TASK_PREFERENCES[task] ?? [];
  const excluded = new Set(options.excludeSlugs ?? []);
  const pref = options.costPreference ?? "balanced";

  // Filter by costPreference and exclusion.
  const candidates = preferences
    .map((slug) => MODELS[slug])
    .filter((m): m is NonNullable<typeof m> => !!m)
    .filter((m) => !excluded.has(m.slug))
    .filter((m) => kindMatchesPreference(m.kind, m.tier, pref));

  if (candidates.length === 0) {
    // Fall back to any model in TASK_PREFERENCES not excluded, regardless of preference.
    const looser = preferences
      .map((slug) => MODELS[slug])
      .filter((m): m is NonNullable<typeof m> => !!m)
      .filter((m) => !excluded.has(m.slug));
    if (looser.length === 0) {
      throw new Error(`No model available for task='${task}' after exclusions`);
    }
    const choice = looser[0];
    return {
      primary: choice.slug,
      cascade: [choice.slug, ...choice.fallbackChain.filter((s) => !excluded.has(s))],
      reason: `loose-match (costPreference=${pref} had no eligible models)`,
    };
  }

  const choice = candidates[0];
  return {
    primary: choice.slug,
    cascade: [choice.slug, ...choice.fallbackChain.filter((s) => !excluded.has(s))],
    reason: `task=${task} pref=${pref} tier=${choice.tier} kind=${choice.kind}`,
  };
}

function kindMatchesPreference(
  kind: ModelKind,
  tier: "cheap" | "balanced" | "premium",
  pref: NonNullable<RoutingOptions["costPreference"]>,
): boolean {
  if (pref === "free-only") return kind === "free";
  if (pref === "cheapest") return tier === "cheap";
  if (pref === "premium") return tier === "premium" || tier === "balanced";
  // 'balanced': any tier OK but bias toward balanced when sorting
  return true;
}

/**
 * Heuristic to detect a low-stakes side task vs the main chat turn.
 * The caller can use this to pick costPreference automatically.
 */
export function inferTaskKind(promptHint: {
  hasTools?: boolean;
  bytesIn: number;
  isFollowUp?: boolean;
}): TaskKind {
  // Long context with tools → main chat
  if (promptHint.hasTools && promptHint.bytesIn > 4_000) return "chat-main";
  // Very short prompt → likely classification or extraction
  if (promptHint.bytesIn < 500) return "classification";
  return "chat-main";
}

/**
 * Compute the rough running-second cost cap suggestion: which tier the
 * caller should pick given a remaining monthly budget.
 *
 * Trivial table for now; v2 can use historical avg-cost-per-turn.
 */
export function suggestTierForBudget(
  budgetRemainingUsd: number,
): NonNullable<RoutingOptions["costPreference"]> {
  if (budgetRemainingUsd <= 0) return "free-only";
  if (budgetRemainingUsd < 1) return "cheapest";
  if (budgetRemainingUsd < 10) return "balanced";
  return "balanced"; // 'premium' only when caller asks explicitly
}
