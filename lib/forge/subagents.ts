/**
 * Subagents — in-process parallel sub-tasks (M18 light).
 *
 * V can spawn one or many subagents in a single tool round; the
 * dispatcher already runs tool calls via Promise.all, so N spawn_subagent
 * calls execute concurrently. No background jobs, no durability: if the
 * SSE stream is closed before all subagents return, results are lost.
 * For long durable workflows, upgrade to Trigger.dev (M9 of ADR-009).
 *
 * Roles are predefined system prompts paired with a default model. The
 * caller can override the model. Subagents do NOT have tool access by
 * default — V is responsible for fetching data with its own tools and
 * passing it to the subagent as context in the task string.
 *
 * Output goes back to V's conversation as a tool_result; V synthesizes
 * the final answer for Luis.
 */
import { openRouterAdapter } from "./adapters/openrouter";
import { getOperatorSecret } from "@/lib/vault/get-secret";
import { sql } from "@/lib/db/client";

export type SubagentRole =
  | "researcher"
  | "reviewer"
  | "coder"
  | "tester"
  | "categorizer"
  | "summarizer"
  | "extractor"
  | "translator";

interface RoleSpec {
  systemPrompt: string;
  defaultModel: string;
  defaultMaxTokens: number;
}

const ROLES: Record<SubagentRole, RoleSpec> = {
  researcher: {
    systemPrompt:
      "Eres un investigador. Sintetizas información dada en la tarea. Respondes en bullets concisos, citando los datos exactos. Si la información es insuficiente para concluir, lo dices explícito. NO inventes datos.",
    defaultModel: "google/gemini-2.5-flash",
    defaultMaxTokens: 800,
  },
  reviewer: {
    systemPrompt:
      "Eres un code reviewer senior. Evalúas el código provisto según: bugs > security > performance > style. Reportas findings ordenados por severidad con file:line si aplica. Cada finding: 1-2 oraciones + propuesta de fix mínimo. NO propongas refactors innecesarios.",
    defaultModel: "anthropic/claude-sonnet-4.6",
    defaultMaxTokens: 1200,
  },
  coder: {
    systemPrompt:
      "Eres un coder senior. Recibes una spec corta y devuelves el código solicitado en el lenguaje pedido. Sin explicación verbosa — solo el código en un bloque, con comentarios mínimos solo donde el QUÉ no sea obvio. Si la spec es ambigua, pides UNA aclaración antes de codear.",
    defaultModel: "anthropic/claude-sonnet-4.6",
    defaultMaxTokens: 1500,
  },
  tester: {
    systemPrompt:
      "Eres un tester. Recibes código + casos de prueba. Predices qué retorna cada caso. Si encuentras un bug o caso no manejado, lo señalas. Output: tabla con caso/expected/actual/status (pass|fail|unknown).",
    defaultModel: "anthropic/claude-haiku-4.5",
    defaultMaxTokens: 600,
  },
  categorizer: {
    systemPrompt:
      'Eres un clasificador. Recibes un texto (README, descripción, etc.) y devuelves UN JSON estricto: {"category": <enum del task>, "score": 1-10, "reason": "<una línea>"}. NADA fuera del JSON. Si dudas, score bajo + reason explica.',
    defaultModel: "google/gemini-2.5-flash",
    defaultMaxTokens: 200,
  },
  summarizer: {
    systemPrompt:
      "Eres un sumarizador. Recibes texto largo y devuelves resumen en 3-5 bullets, máximo 80 palabras totales. Sin preámbulo, solo los bullets.",
    defaultModel: "anthropic/claude-haiku-4.5",
    defaultMaxTokens: 300,
  },
  extractor: {
    systemPrompt:
      'Eres un extractor de datos estructurados. Recibes texto + schema descrito en el task. Devuelves SOLO el JSON que cumple el schema. Si un campo no se puede inferir, usa null. NADA fuera del JSON.',
    defaultModel: "anthropic/claude-haiku-4.5",
    defaultMaxTokens: 800,
  },
  translator: {
    systemPrompt:
      "Eres un traductor. Recibes texto + idioma destino. Devuelves SOLO la traducción, sin notas ni explicación.",
    defaultModel: "google/gemini-2.5-flash",
    defaultMaxTokens: 1000,
  },
};

export interface SubagentResult {
  role: SubagentRole;
  model: string;
  content: string;
  tokens_in: number;
  tokens_out: number;
  cost_usd: number;
  duration_ms: number;
  finish_reason: string | null;
}

/**
 * Run a single subagent. Pure function — no DB writes, no audit. The
 * caller (the tool dispatcher) is responsible for any audit/persistence.
 */
export async function runSubagent(input: {
  role: SubagentRole;
  task: string;
  model?: string;
  maxTokens?: number;
  userId?: string;
  sessionId?: string;
  signal?: AbortSignal;
}): Promise<SubagentResult> {
  const spec = ROLES[input.role];
  if (!spec) {
    throw new Error(`Unknown subagent role: ${input.role}`);
  }
  const model = input.model ?? spec.defaultModel;
  const maxTokens = input.maxTokens ?? spec.defaultMaxTokens;
  const startedAt = Date.now();

  const vault = {
    async getOperatorSecret(name: string) {
      return getOperatorSecret(name, {
        auditUserId: input.userId ?? "subagent",
      });
    },
    async getProjectSecret(projectId: string, name: string) {
      return getOperatorSecret(name, {
        auditUserId: input.userId ?? "subagent",
        projectId,
      });
    },
  };

  const out = await openRouterAdapter.execute(
    {
      model,
      messages: [
        { role: "system", content: spec.systemPrompt },
        { role: "user", content: input.task },
      ],
      maxTokens,
    },
    {
      userId: input.userId ?? "operator_luis",
      sessionId: input.sessionId ?? "subagent",
      signal: input.signal ?? AbortSignal.timeout(60_000),
      vault,
    },
  );

  return {
    role: input.role,
    model: out.model,
    content: out.content,
    tokens_in: out.tokensIn,
    tokens_out: out.tokensOut,
    cost_usd: out.costUsd,
    duration_ms: Date.now() - startedAt,
    finish_reason: out.finishReason,
  };
}

/**
 * Persist a subagent run to conversations + audit_events so it counts
 * toward the cost dashboard. Called by the tool dispatcher AFTER
 * runSubagent succeeds.
 */
export async function recordSubagentRun(
  result: SubagentResult,
  ctx: { userId: string; sessionId: string; task: string },
): Promise<void> {
  try {
    await sql`
      INSERT INTO conversations (
        user_id, session_id, role, content, model,
        tokens_in, tokens_out, cost_usd
      )
      VALUES (
        ${ctx.userId},
        ${ctx.sessionId + ":subagent:" + result.role},
        'assistant',
        ${`[subagent:${result.role}] ${result.content.slice(0, 4000)}`},
        ${result.model},
        ${result.tokens_in},
        ${result.tokens_out},
        ${result.cost_usd}
      )
    `;
  } catch {
    /* non-blocking */
  }
  try {
    await sql`
      INSERT INTO audit_events (
        user_id, action, resource_type, resource_id, ring, payload
      )
      VALUES (
        ${ctx.userId},
        'forge.subagent.run',
        'subagent',
        ${result.role},
        0,
        ${JSON.stringify({
          role: result.role,
          model: result.model,
          tokens_in: result.tokens_in,
          tokens_out: result.tokens_out,
          cost_usd: result.cost_usd,
          duration_ms: result.duration_ms,
          parent_session: ctx.sessionId,
          task_preview: ctx.task.slice(0, 200),
        })}::jsonb
      )
    `;
  } catch {
    /* non-blocking */
  }
}

export function listSubagentRoles(): Array<{
  role: SubagentRole;
  default_model: string;
  default_max_tokens: number;
  description: string;
}> {
  return (Object.keys(ROLES) as SubagentRole[]).map((r) => ({
    role: r,
    default_model: ROLES[r].defaultModel,
    default_max_tokens: ROLES[r].defaultMaxTokens,
    description: ROLES[r].systemPrompt.slice(0, 120) + "…",
  }));
}
