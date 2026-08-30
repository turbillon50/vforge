/**
 * V's self-config layer.
 *
 * Cascade: agent_config (Neon) → env → defaults.
 * Default chat-main: Cerebras (llama-3.3-70b), no OpenRouter.
 */
import { sql } from "@/lib/db/client";
import { MODELS, normalizeSlug, type TaskKind } from "./models";
import { isValidOpenRouterSlug } from "./openrouter-catalog";
import { CEREBRAS_DEFAULT_MODEL } from "./llm-engine";

interface ConfigRow {
  task_kind: TaskKind;
  model: string;
}

let CACHE: { entries: Map<string, string>; expiresAt: number } | null = null;
const CACHE_TTL_MS = 60 * 1000;

export function clearAgentConfigCache(): void {
  CACHE = null;
}

export async function getModelForTask(task: TaskKind): Promise<string> {
  const cfg = await loadConfig();
  const fromDb = cfg.get(task);
  if (fromDb) return fromDb;

  const envVar = ENV_BY_TASK[task];
  const fromEnv = envVar ? process.env[envVar] : undefined;
  if (fromEnv) return fromEnv;

  return DEFAULT_BY_TASK[task];
}

export async function listAgentConfig(): Promise<ConfigRow[]> {
  const rows = (await sql`
    SELECT task_kind, model
    FROM agent_config
    ORDER BY task_kind
  `) as ConfigRow[];
  return rows;
}

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
  if (!isKnown) {
    const looksLikeSlug = normalized.includes("/") || !normalized.includes(" ");
    if (!looksLikeSlug) {
      throw new Error(
        `Model '${model}' doesn't look like a valid id.`,
      );
    }
    // Cerebras ids (llama-3.3-70b) no pasan por catálogo OpenRouter
    if (normalized.includes("/")) {
      try {
        const found = await isValidOpenRouterSlug(normalized);
        if (!found) {
          throw new Error(
            `Model '${normalized}' not found in OpenRouter catalog.`,
          );
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.startsWith("Model '")) throw err;
        console.warn(
          `[agent-config] catalog check skipped for '${normalized}': ${msg}`,
        );
      }
    }
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
    // pre-migration
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
]);

const ENV_BY_TASK: Partial<Record<TaskKind, string>> = {
  "chat-main": "MODEL_CHAT_MAIN",
  "code-edit": "MODEL_CODE",
  classification: "MODEL_CLASSIFY",
};

/** Defaults: Cerebras, no OpenRouter/Claude. */
const DEFAULT_BY_TASK: Record<TaskKind, string> = {
  "chat-main": CEREBRAS_DEFAULT_MODEL,
  reasoning: CEREBRAS_DEFAULT_MODEL,
  "code-edit": CEREBRAS_DEFAULT_MODEL,
  classification: "llama3.1-8b",
  summarization: "llama3.1-8b",
  extraction: "llama3.1-8b",
  "web-search": "llama3.1-8b",
  embedding: "llama3.1-8b",
};
