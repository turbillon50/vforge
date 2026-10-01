/**
 * Motor LLM de V — Cerebras primero (cloud o endpoint dedicado a nuestras GPUs).
 * Mesh Hetzner queda como fallback OpenAI-compatible cuando no hay key directa.
 */
import OpenAI from "openai";

export type LlmEngineName = "cerebras" | "mesh" | "none";

export interface LlmEngine {
  name: LlmEngineName;
  client: OpenAI | null;
  /** Modelo canónico para chat-main si no hay override en DB/env. */
  defaultChatModel: string;
  label: string;
}

const CEREBRAS_DEFAULT_BASE = "https://api.cerebras.ai/v1";
const MESH_DEFAULT_BASE = "https://api.mindcontextia.one/mesh";
/** Modelos públicos típicos en Cerebras Inference. */
export const CEREBRAS_DEFAULT_MODEL =
  process.env.CEREBRAS_MODEL?.trim() || "gpt-oss-120b";

/**
 * Quita prefijos de gateways externos que no aplican en Cerebras.
 */
export function toCerebrasModelId(slug: string): string {
  const s = slug.trim();
  if (!s) return CEREBRAS_DEFAULT_MODEL;
  // Ya es id Cerebras
  if (!s.includes("/")) return s;
  // provider/model → última parte útil
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

  const meshKey = process.env.MESH_API_KEY?.trim();
  if (meshKey) {
    const baseURL =
      process.env.MESH_ROUTER_URL?.replace(/\/$/, "") || MESH_DEFAULT_BASE;
    return {
      name: "mesh",
      client: new OpenAI({
        apiKey: meshKey,
        baseURL: `${baseURL}/v1`,
      }),
      defaultChatModel: "auto",
      label: "Mesh Hetzner",
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
  if (engine.name === "mesh") {
    return engine.defaultChatModel;
  }
  return configured;
}
