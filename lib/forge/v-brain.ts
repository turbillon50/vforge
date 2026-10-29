import { originIdentitySection } from "@/lib/v-chat/origin-identity";
/** V: identity + historical memory + interchangeable Cerebras/Mesh inference.
 * callHetznerClaude remains only for legacy callers outside V's private chat.
 */

import { V_VOICE_SYSTEM_PROMPT } from "@/lib/forge/v-voice-persona";
import { V_TEXT_SYSTEM_PROMPT } from "@/lib/forge/v-text-persona";
import { loadVMemory } from "@/lib/v-chat/memory";
import { inferV, memorySection, selectVMemory, type VProvider } from "@/lib/v-chat/continuity";
import { assertValidModelOutput } from "@/lib/forge/provider-errors";

// URL del v-server en Hetzner (via nginx /v-server/ → localhost:5000)
const HETZNER_BASE = (process.env.HETZNER_URL || "https://brain.vforge.site").replace(/\/$/, "");
const CLAUDE_ENDPOINT = `${HETZNER_BASE}/v-server/claude`;
const V_SERVER_TOKEN = process.env.HETZNER_SECRET || "";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

/**
 * Llama al v-server de Hetzner con el prompt construido.
 * Retorna la respuesta de Claude (texto plano).
 */
export async function callHetznerClaude(
  prompt: string,
  timeoutMs = 50000,
): Promise<string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (V_SERVER_TOKEN) {
    headers["X-V-Token"] = V_SERVER_TOKEN;
  }

  const res = await fetch(CLAUDE_ENDPOINT, {
    method: "POST",
    headers,
    body: JSON.stringify({ instruccion: prompt }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`v-server ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = (await res.json()) as { respuesta?: string; error?: string };
  if (data.error) throw new Error(data.error);

  return assertValidModelOutput(
    data.respuesta || "",
    "hetzner-claude",
    0,
  );
}

/** V's identity and retrieved history are shared across engines and surfaces. */
export async function answerV(
  message: string,
  history: ChatTurn[] = [],
  options: { voice?: boolean; personalUserId?: string } = {},
) {
  const memory = selectVMemory(await loadVMemory(message, options.personalUserId ?? process.env.V_MEMORY_USER_ID));
  const providers: VProvider[] = [];
  const cerebrasKey = process.env.CEREBRAS_API_KEY?.trim();
  const meshKey = process.env.MESH_API_KEY?.trim();
  if (cerebrasKey) providers.push({
    name: "cerebras", apiKey: cerebrasKey,
    endpoint: `${(process.env.CEREBRAS_BASE_URL || "https://api.cerebras.ai/v1").replace(/\/$/, "")}/chat/completions`,
    model: process.env.CEREBRAS_MODEL?.trim() || "gpt-oss-120b",
  });
  if (meshKey) providers.push({
    name: "mesh", apiKey: meshKey,
    endpoint: `${(process.env.MESH_ROUTER_URL || "https://api.mindcontextia.one/mesh").replace(/\/$/, "")}/v1/chat/completions`,
    model: "auto",
  });
  if (process.env.V_CHAT_ENGINE === "mesh") providers.sort((a) => a.name === "mesh" ? -1 : 1);
  const result = await inferV({
    system: `${options.voice ? V_VOICE_SYSTEM_PROMPT : V_TEXT_SYSTEM_PROMPT}\n\n${originIdentitySection()}\n\n${memorySection(memory)}`,
    message, history, providers, voice: options.voice,
  });
  return {
    ...result,
    memory: { status: memory.status, sources: memory.sources.map(({ id, source, at }) => ({ id, source, at })) },
  };
}

export async function voiceBrain(message: string, history: ChatTurn[] = []): Promise<string> {
  return (await answerV(message, history, { voice: true })).reply;
}

export async function textBrain(message: string, history: ChatTurn[] = []): Promise<string> {
  return (await answerV(message, history)).reply;
}
