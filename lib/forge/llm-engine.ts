/**
 * Motor LLM de V — Cerebras primero (cloud o endpoint dedicado a nuestras GPUs).
 * OpenRouter queda como fallback opcional, no como default.
 */
import OpenAI from "openai";

export type LlmEngineName = "cerebras" | "openrouter" | "none";

export interface LlmEngine {
  name: LlmEngineName;
  client: OpenAI | null;
  /** Modelo canónico para chat-main si no hay override en DB/env. */
  defaultChatModel: string;
  label: string;
}

const CEREBRAS_DEFAULT_BASE = "https://api.cerebras.ai/v1";
/** Modelos públicos típicos en Cerebras Inference. */
export const CEREBRAS_DEFAULT_MODEL =
  process.env.CEREBRAS_MODEL?.trim() || "llama-3.3-70b";

/**
 * Quita prefijos tipo anthropic/ o openrouter que no aplican en Cerebras.
 */
export function toCerebrasModelId(slug: string): string {
  const s = slug.trim();
  if (!s) return CEREBRAS_DEFAULT_MODEL;
  // Ya es id Cerebras
  if (!s.includes("/")) return s;
  // openrouter-style → última parte útil
  const last = s.split("/").pop() || s;
  // anthropic/claude-* no existe en Cerebras → default nuestro
  if (s.startsWith("anthropic/") || last.startsWith("claude")) {
    return CEREBRAS_DEFAULT_MODEL;
  }
  // meta-llama/Llama-3.3-70B-Instruct → llama-3.3-70b heurística
  if (/llama.?3\.3.?70/i.test(last)) return "llama-3.3-70b";
  if (/qwen.?3.?32/i.test(last)) return "qwen-3-32b";
  if (/gpt-oss|gpt.oss/i.test(last)) return "gpt-oss-120b";
  return last;
}

export function resolveLlmEngine(): LlmEngine {
  const cerebrasKey = process.env.CEREBRAS_API_KEY?.trim();
  if (cerebrasKey) {
    const baseURL =
      process.env.CEREBRAS_BASE_URL?.trim() || CEREBRAS_DEFAULT_BASE;
    return {
      name: "cerebras",
      client: new OpenAI({
        apiKey: cerebrasKey,
        baseURL,
      }),
      defaultChatModel: CEREBRAS_DEFAULT_MODEL,
      label: baseURL.includes("cerebras.ai")
        ? "Cerebras Inference"
        : "Cerebras · GPU dedicada",
    };
  }

  const orKey =
    process.env.OPENROUTER_API_KEY?.trim() ||
    process.env.ANTHROPIC_API_KEY?.trim();
  if (orKey) {
    return {
      name: "openrouter",
      client: new OpenAI({
        apiKey: orKey,
        baseURL: "https://openrouter.ai/api/v1",
        defaultHeaders: {
          "HTTP-Referer": "https://vforge.site",
          "X-Title": "vForge",
        },
      }),
      defaultChatModel: "anthropic/claude-sonnet-4.6",
      label: "OpenRouter (fallback)",
    };
  }

  return {
    name: "none",
    client: null,
    defaultChatModel: CEREBRAS_DEFAULT_MODEL,
    label: "sin motor",
  };
}

/** Normaliza el slug configurado al id que entiende el motor activo. */
export function modelForEngine(engine: LlmEngine, configured: string): string {
  if (engine.name === "cerebras") return toCerebrasModelId(configured);
  return configured;
}
