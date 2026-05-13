/**
 * V's self-config layer.
 *
 * Lets V change its own model per task kind via the `agent_config` table
 * in Neon (migration 007). The router in /api/forge/run reads from this
 * table first, then falls back to env vars, then to the registry defaults
 * in lib/forge/models.ts.
 *
 * Exposed to V through 3 tools (lib/forge/tools.ts):
 *   - agent_config_get()          → current config + which model maps to which task
 *   - agent_config_set(task, mdl) → V changes its own model for that task
 *   - model_set_default(slug)     → alias for "use this model for chat-main"
 *
 * Cache: 60s in-memory per Lambda invocation to keep the hot path fast.
 * Cache busts on any write via clearAgentConfigCache().
 */
import { sql } from "@/lib/db/client";
import { MODELS, normalizeSlug, type TaskKind } from "./models";

interface ConfigRow {
  task_kind: TaskKind;
  model: string;
}

let CACHE: { entries: Map<string, string>; expiresAt: number } | null = null;
const CACHE_TTL_MS = 60 * 1000;

export function clearAgentConfigCache(): void {
  CACHE = null;
}

/**
 * Returns the model slug V should use for a given task kind, with this
 * cascade:
 *   1. agent_config row in Neon (if exists)
 *   2. env var fallback (e.g. MODEL_CHAT_MAIN)
 *   3. registry default in lib/forge/models.ts
 */
export async function getModelForTask(task: TaskKind): Promise<string> {
  const cfg = await loadConfig();
  const fromDb = cfg.get(task);
  if (fromDb) return fromDb;

  const envVar = ENV_BY_TASK[task];
  const fromEnv = envVar ? process.env[envVar] : undefined;
  if (fromEnv) return fromEnv;

  // Registry default — first slug in TASK_PREFERENCES for that kind.
  return DEFAULT_BY_TASK[task];
}

/** Bulk-load all agent_config rows. Used by agent_config_get tool. */
export async function listAgentConfig(): Promise<ConfigRow[]> {
  const rows = (await sql`
    SELECT task_kind, model
    FROM agent_config
    ORDER BY task_kind
  `) as ConfigRow[];
  return rows;
}

/**
 * Persist a new model for a task kind. Validates that the slug
 * normalizes to something we know about (registry hit OR a free-form
 * passthrough that includes a '/'). Throws on garbage input.
 */
export async function setModelForTask(
  task: TaskKind,
  model: string,
  options: { updatedBy?: string } = {},
): Promise<{ task_kind: TaskKind; model: string }> {
  if (!ALLOWED_TASKS.has(task)) {
    throw new Error(
      `Unknown task_kind '${task}'. Allowed: ${[...ALLOWED_TASKS].join(", ")}`,
    );
  }
  const normalized = normalizeSlug(model);
  const isKnown = !!MODELS[normalized];
  const looksLikeSlug = normalized.includes("/");
  if (!isKnown && !looksLikeSlug) {
    throw new Error(
      `Model '${model}' doesn't look like a valid OpenRouter slug. Expected something like 'anthropic/claude-haiku-4.5' or 'google/gemini-2.5-flash'.`,
    );
  }
  const updatedBy = options.updatedBy ?? "operator_luis";
  const rows = (await sql`
    INSERT INTO agent_config (task_kind, model, updated_by, updated_at)
    VALUES (${task}, ${normalized}, ${updatedBy}, now())
    ON CONFLICT (task_kind) DO UPDATE SET
      model = EXCLUDED.model,
      updated_by = EXCLUDED.updated_by,
      updated_at = now()
    RETURNING task_kind, model
  `) as ConfigRow[];
  clearAgentConfigCache();
  return rows[0];
}

async function loadConfig(): Promise<Map<string, string>> {
  if (CACHE && CACHE.expiresAt > Date.now()) return CACHE.entries;
  const entries = new Map<string, string>();
  try {
    const rows = (await sql`
      SELECT task_kind, model FROM agent_config
    `) as ConfigRow[];
    for (const r of rows) entries.set(r.task_kind, r.model);
  } catch {
    // If the table doesn't exist yet (pre-migration), fall back to env/registry.
  }
  CACHE = { entries, expiresAt: Date.now() + CACHE_TTL_MS };
  return entries;
}

const ALLOWED_TASKS = new Set<TaskKind>([
  "chat-main",
  "reasoning",
  "code-edit",
  "classification",
  "summarization",
  "extraction",
  // The registry also has 'web-search' and 'embedding' but those don't
  // currently route through this code path — V doesn't pick a model for
  // them, the adapter is fixed.
]);

const ENV_BY_TASK: Partial<Record<TaskKind, string>> = {
  "chat-main": "MODEL_CHAT_MAIN",
  "code-edit": "MODEL_CODE",
  classification: "MODEL_CLASSIFY",
};

const DEFAULT_BY_TASK: Record<TaskKind, string> = {
  "chat-main": "anthropic/claude-sonnet-4.6",
  reasoning: "anthropic/claude-sonnet-4.6",
  "code-edit": "anthropic/claude-sonnet-4.6",
  classification: "google/gemini-2.5-flash",
  summarization: "anthropic/claude-haiku-4.5",
  extraction: "anthropic/claude-haiku-4.5",
  "web-search": "anthropic/claude-haiku-4.5",
  embedding: "google/gemini-2.5-flash",
};
