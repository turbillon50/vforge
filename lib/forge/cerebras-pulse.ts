import "server-only";

import { queryOne } from "@/lib/db/client";
import type { CerebrasUsage } from "@/lib/forge/cerebras-usage";

export async function recordCerebrasPulse(input: {
  projectId: string;
  ok: boolean;
  cause: string;
  durationMs: number;
  usage?: CerebrasUsage | null;
}): Promise<void> {
  await queryOne(
    `CREATE TABLE IF NOT EXISTS v_cerebras_usage (
      day date PRIMARY KEY,
      calls integer NOT NULL DEFAULT 0,
      prompt_tokens integer NOT NULL DEFAULT 0,
      completion_tokens integer NOT NULL DEFAULT 0,
      last_project_id text,
      last_cause text,
      updated_at timestamptz NOT NULL DEFAULT now()
    )`,
  ).catch(() => null);
  const prompt = input.usage?.promptTokens ?? 0;
  const completion = input.usage?.completionTokens ?? 0;
  await queryOne(
    `INSERT INTO v_cerebras_usage
       (day, calls, prompt_tokens, completion_tokens, last_project_id, last_cause)
     VALUES (CURRENT_DATE, 1, $1, $2, $3, $4)
     ON CONFLICT (day) DO UPDATE SET
       calls = v_cerebras_usage.calls + 1,
       prompt_tokens = v_cerebras_usage.prompt_tokens + EXCLUDED.prompt_tokens,
       completion_tokens = v_cerebras_usage.completion_tokens + EXCLUDED.completion_tokens,
       last_project_id = EXCLUDED.last_project_id,
       last_cause = EXCLUDED.last_cause,
       updated_at = now()`,
    [prompt, completion, input.projectId, input.ok ? "ok" : input.cause.slice(0, 80)],
  ).catch(() => null);
}

export async function todayCerebrasUsage(): Promise<{
  calls: number;
  promptTokens: number;
  completionTokens: number;
} | null> {
  const row = await queryOne<{
    calls: number;
    prompt_tokens: number;
    completion_tokens: number;
  }>(
    `SELECT calls, prompt_tokens, completion_tokens
       FROM v_cerebras_usage WHERE day = CURRENT_DATE LIMIT 1`,
  ).catch(() => null);
  if (!row) return null;
  return {
    calls: Number(row.calls) || 0,
    promptTokens: Number(row.prompt_tokens) || 0,
    completionTokens: Number(row.completion_tokens) || 0,
  };
}
