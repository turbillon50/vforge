/**
 * Routing policy v1 — picks an OpenRouter model for a given task.
 */
import { MODELS, TASK_PREFERENCES, type TaskKind, type ModelKind } from "./models";

export interface RoutingDecision {
  primary: string;
  cascade: string[];
  reason: string;
}

export interface RoutingOptions {
  costPreference?: "cheapest" | "balanced" | "premium" | "free-only";
  excludeSlugs?: ReadonlyArray<string>;
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

  const candidates = preferences
    .map((slug) => MODELS[slug])
    .filter((m): m is NonNullable<typeof m> => !!m)
    .filter((m) => !excluded.has(m.slug))
    .filter((m) => kindMatchesPreference(m.kind, m.tier, pref));

  if (candidates.length === 0) {
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
  return true;
}

/**
 * Detecta el tipo de tarea por el contenido del mensaje.
 * Ruteamos a modelos baratos cuando no necesitamos Sonnet.
 */
export function inferTaskKind(promptHint: {
  hasTools?: boolean;
  bytesIn: number;
  isFollowUp?: boolean;
  messageText?: string;
}): TaskKind {
  const text = (promptHint.messageText ?? "").toLowerCase();

  // Código → DeepSeek
  const codeKeywords = ["fix", "bug", "error", "código", "codigo", "función", "funcion",
    "archivo", "implementa", "crea", "refactoriza", "patch", "component",
    "function", "class", "import", "export", "deploy", "build"];
  if (codeKeywords.some((k) => text.includes(k))) return "code-edit";

  // Resumen → Gemini Flash
  const summarizeKeywords = ["resume", "resumen", "explica", "describe",
    "qué hace", "que hace", "cuéntame", "cuentame", "summarize", "explain"];
  if (summarizeKeywords.some((k) => text.includes(k))) return "summarization";

  // Extracción → Gemini Flash
  const extractKeywords = ["extrae", "lista", "dame", "muéstrame", "muestrame",
    "cuáles", "cuales", "enumera", "list", "show me", "extract"];
  if (extractKeywords.some((k) => text.includes(k))) return "extraction";

  // Razonamiento → Sonnet (vale la pena)
  const reasonKeywords = ["analiza", "arquitectura", "decisión", "decision",
    "compara", "pros", "contras", "estrategia", "strategy", "analyze"];
  if (reasonKeywords.some((k) => text.includes(k))) return "reasoning";

  // Long context with tools → main chat
  if (promptHint.hasTools && promptHint.bytesIn > 4_000) return "chat-main";

  // Very short prompt → classification
  if (promptHint.bytesIn < 500) return "classification";

  return "chat-main";
}

export function suggestTierForBudget(
  budgetRemainingUsd: number,
): NonNullable<RoutingOptions["costPreference"]> {
  if (budgetRemainingUsd <= 0) return "free-only";
  if (budgetRemainingUsd < 1) return "cheapest";
  if (budgetRemainingUsd < 10) return "balanced";
  return "balanced";
}
