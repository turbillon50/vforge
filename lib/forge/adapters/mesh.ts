/**
 * Mesh Router adapter — Luis's own AI mesh (Cerebras + propias GPUs).
 *
 * Esta es la capa de IA PREFERIDA para features nuevas a partir de junio 2026:
 * Luis decidió dejar de construir sobre OpenRouter y enrutar la inferencia por
 * su Mesh propio. El Mesh Router (Hetzner, /root/mesh-router/mesh_router.py)
 * expone un endpoint OpenAI-compatible y enruta por `policy`:
 *
 *   - "fast"  → Cerebras (gpt-oss-120b / glm) — barato y rápido
 *   - "local" → GPUs propias (Vast.ai, qwen) — privado
 *   - "v"     → cerebro de V (qwen2.5 con su system prompt/persona)
 *   - "auto"  → el router decide (default del tenant)
 *
 * Endpoint público (nginx + Certbot → 127.0.0.1:8088):
 *   https://api.mindcontextia.one/mesh/v1/chat/completions
 *
 * Auth: `Authorization: Bearer <MESH_API_KEY>` — la key es el token de tenant
 * (cada proyecto tiene el suyo; goossip ya consume el Mesh con su MESH_API_KEY).
 * El adapter la lee del vault como cualquier otro secreto; en Vercel cae al
 * env `MESH_API_KEY` vía el cascade de lib/vault/get-secret.ts.
 *
 * Igual que `openrouter.ts`, usa `fetch` directo (sin SDK) y no implementa
 * streaming: el caso de uso son side-tasks cortas (sugerir/generar copy), no
 * el chat principal.
 */
import {
  type ForgeAdapter,
  type AdapterContext,
  type AdapterHealth,
  AdapterError,
} from "./_contract";

interface MeshMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** Política de enrutamiento del Mesh — qué cuerpo atiende la inferencia. */
export type MeshPolicy = "fast" | "local" | "v" | "auto";

export interface MeshInput {
  messages: MeshMessage[];
  /**
   * A qué capa enrutar. Default "fast" (Cerebras) — barato y suficiente para
   * generación de copy. El router también respeta el `policy_default` del
   * tenant si se omite.
   */
  policy?: MeshPolicy;
  /** Default 1024 — mantener honestos a los callers sobre costo. */
  maxTokens?: number;
  /** 0-2, default 0.7. */
  temperature?: number;
}

export interface MeshOutput {
  content: string;
  /** Capa que atendió ("cerebras" | "local" | "v"), reportada por el router. */
  layer: string | null;
  /** Latencia interna del router en ms, si la reporta. */
  ms: number | null;
  tokensIn: number;
  tokensOut: number;
  finishReason: string | null;
  costUsd: number;
}

const BASE =
  process.env.MESH_ROUTER_URL?.replace(/\/$/, "") ??
  "https://api.mindcontextia.one/mesh";
const ENDPOINT = `${BASE}/v1/chat/completions`;
const HEALTH_ENDPOINT = `${BASE}/health`;

// Precios del Mesh (de /root/mesh-router/config.json). Cerebras se cobra por
// token; las GPUs propias por hora, así que para "local"/"v" el costo por
// token es ~0 (infra fija). Estimación sólo para caps + auditoría; el cobro
// real lo lleva el router por tenant.
const CEREBRAS_PER_1K_USD = 0.0007;

function estimateCost(policy: MeshPolicy | undefined, tokensOut: number): number {
  // Sólo Cerebras ("fast"/"auto") tiene costo marginal por token relevante.
  if (policy === "local" || policy === "v") return 0;
  return Number(((tokensOut / 1000) * CEREBRAS_PER_1K_USD).toFixed(6));
}

export const meshAdapter: ForgeAdapter<MeshInput, MeshOutput> = {
  name: "mesh-router",
  ring: 0,
  capabilities: ["reasoning", "classification"] as const,

  costPerCall(input) {
    const outBudget = input.maxTokens ?? 1024;
    return estimateCost(input.policy, outBudget);
  },

  async health(ctx): Promise<AdapterHealth> {
    const apiKey = await ctx.vault.getOperatorSecret("MESH_API_KEY");
    if (!apiKey) return { status: "missing-key", key: "MESH_API_KEY" };
    try {
      const r = await fetch(HEALTH_ENDPOINT, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (r.status === 401) return { status: "error", message: "401 unauthorized" };
      if (!r.ok) return { status: "degraded", reason: `health endpoint returned ${r.status}` };
      return { status: "ok" };
    } catch (err) {
      return {
        status: "error",
        message: err instanceof Error ? err.message : String(err),
      };
    }
  },

  async execute(input, ctx: AdapterContext): Promise<MeshOutput> {
    const apiKey = await ctx.vault.getOperatorSecret("MESH_API_KEY");
    if (!apiKey) {
      throw new AdapterError(this.name, "MESH_API_KEY missing in vault");
    }
    const policy = input.policy ?? "fast";
    ctx.emit?.({ type: "step", label: `mesh → ${policy}` });

    const body = {
      model: "auto",
      policy,
      messages: input.messages,
      max_tokens: input.maxTokens ?? 1024,
      temperature: input.temperature ?? 0.7,
    };

    let resp: Response;
    try {
      resp = await fetch(ENDPOINT, {
        method: "POST",
        signal: ctx.signal,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      throw new AdapterError(this.name, "network error", err);
    }

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new AdapterError(
        this.name,
        `${resp.status} ${resp.statusText}: ${text.slice(0, 200)}`,
      );
    }

    interface MeshResponse {
      choices: Array<{
        message: { content?: string; reasoning?: string };
        finish_reason: string | null;
      }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
      _mesh?: { capa?: string; ms?: number };
    }
    const data = (await resp.json()) as MeshResponse;
    const choice = data.choices?.[0];
    if (!choice) {
      throw new AdapterError(this.name, "no choices in response");
    }
    // El router puede devolver el texto en `content` o (algunos modelos de
    // razonamiento) en `reasoning`. La consola del Mesh hace el mismo fallback.
    const content = choice.message.content ?? choice.message.reasoning ?? "";

    const tokensIn = data.usage?.prompt_tokens ?? 0;
    const tokensOut = data.usage?.completion_tokens ?? 0;

    return {
      content,
      layer: data._mesh?.capa ?? null,
      ms: data._mesh?.ms ?? null,
      tokensIn,
      tokensOut,
      finishReason: choice.finish_reason,
      costUsd: estimateCost(policy, tokensOut),
    };
  },
};
