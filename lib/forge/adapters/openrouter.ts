/**
 * OpenRouter adapter — secondary LLM gateway (ADR-005, ADR-009).
 *
 * OpenRouter exposes 300+ models behind one OpenAI-compatible endpoint.
 * In vForge it's the "cost optimization" lane: V routes cheap tasks
 * (classification, summary, routing decisions) through Gemini Flash /
 * Llama / Mistral via OpenRouter while keeping Anthropic SDK direct
 * for the primary chat loop. See ADR-005 §"OpenRouter como única capa"
 * for why this stays secondary.
 *
 * The adapter uses `fetch` directly (no SDK) to avoid pulling another
 * dependency. Streaming is intentionally NOT implemented in M3 — the
 * use case is short side-tasks, not the main chat. Add streaming in a
 * later milestone if Forge needs it.
 */
import {
  type ForgeAdapter,
  type AdapterContext,
  type AdapterHealth,
  AdapterError,
} from "./_contract";

interface OpenRouterMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OpenRouterInput {
  /** OpenRouter model slug, e.g. "google/gemini-2.5-flash" or
   *  "anthropic/claude-haiku-4.5". See https://openrouter.ai/models. */
  model: string;
  messages: OpenRouterMessage[];
  /** Default 1024 — keep callers honest about cost. */
  maxTokens?: number;
  /** 0-2, default 0.7. */
  temperature?: number;
}

export interface OpenRouterOutput {
  content: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  finishReason: string | null;
  costUsd: number;
}

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const MODELS_ENDPOINT = "https://openrouter.ai/api/v1/models";

// Rough per-1M-token USD pricing for the models we route through
// OpenRouter. Used only for cost estimation; real billing happens at
// OpenRouter. Update from https://openrouter.ai/models as needed.
const PRICING: Record<string, { input: number; output: number }> = {
  "google/gemini-2.5-flash": { input: 0.075, output: 0.3 },
  "google/gemini-2.5-pro": { input: 1.25, output: 5 },
  "anthropic/claude-haiku-4.5": { input: 0.8, output: 4 },
  "anthropic/claude-sonnet-4.6": { input: 3, output: 15 },
  "meta-llama/llama-3.3-70b-instruct": { input: 0.13, output: 0.4 },
  "mistralai/mistral-large-2411": { input: 2, output: 6 },
  // Fallback when an unknown model is invoked.
  default: { input: 1, output: 3 },
};

function priceFor(model: string): { input: number; output: number } {
  return PRICING[model] ?? PRICING.default;
}

export const openRouterAdapter: ForgeAdapter<OpenRouterInput, OpenRouterOutput> = {
  name: "openrouter-gateway",
  ring: 0,
  capabilities: ["reasoning", "classification"] as const,

  costPerCall(input) {
    const p = priceFor(input.model);
    const inTokens = input.messages.reduce(
      (sum, m) => sum + Math.ceil(m.content.length / 4),
      0,
    );
    const outBudget = input.maxTokens ?? 1024;
    return Number(
      ((inTokens / 1_000_000) * p.input + (outBudget / 1_000_000) * p.output).toFixed(6),
    );
  },

  async health(ctx): Promise<AdapterHealth> {
    const apiKey = await ctx.vault.getOperatorSecret("OPENROUTER_API_KEY");
    if (!apiKey) return { status: "missing-key", key: "OPENROUTER_API_KEY" };
    try {
      const r = await fetch(MODELS_ENDPOINT, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (r.status === 401) return { status: "error", message: "401 unauthorized" };
      if (!r.ok) return { status: "degraded", reason: `models endpoint returned ${r.status}` };
      return { status: "ok" };
    } catch (err) {
      return {
        status: "error",
        message: err instanceof Error ? err.message : String(err),
      };
    }
  },

  async execute(input, ctx: AdapterContext): Promise<OpenRouterOutput> {
    const apiKey = await ctx.vault.getOperatorSecret("OPENROUTER_API_KEY");
    if (!apiKey) {
      throw new AdapterError(this.name, "OPENROUTER_API_KEY missing in vault");
    }
    ctx.emit?.({ type: "step", label: `openrouter → ${input.model}` });

    const body = {
      model: input.model,
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
          "HTTP-Referer": "https://vforge.site",
          "X-Title": "vForge",
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

    interface ORResponse {
      model: string;
      choices: Array<{ message: { content: string }; finish_reason: string | null }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    }
    const data = (await resp.json()) as ORResponse;
    const choice = data.choices?.[0];
    if (!choice) {
      throw new AdapterError(this.name, "no choices in response");
    }

    const tokensIn = data.usage?.prompt_tokens ?? 0;
    const tokensOut = data.usage?.completion_tokens ?? 0;
    const p = priceFor(data.model ?? input.model);
    const costUsd = Number(
      ((tokensIn / 1_000_000) * p.input + (tokensOut / 1_000_000) * p.output).toFixed(6),
    );

    return {
      content: choice.message.content,
      model: data.model ?? input.model,
      tokensIn,
      tokensOut,
      finishReason: choice.finish_reason,
      costUsd,
    };
  },
};
