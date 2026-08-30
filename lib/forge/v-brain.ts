/**
 * Cerebro de V — usa `claude --print` en Hetzner con la cuenta de usuario de Luis.
 * Sin API key de Anthropic. Sin costo por token.
 * El CLI de Claude ya está autenticado en /root/.local/bin/claude en el servidor.
 *
 * Flujo:
 *   VForge (Vercel)  →  POST /v-server/claude  →  Hetzner v-server api.py
 *   Hetzner api.py   →  claude --print "<prompt>"  →  respuesta
 *   respuesta        →  VForge  →  usuario
 */

import { V_VOICE_SYSTEM_PROMPT } from "@/lib/forge/v-voice-persona";
import { V_TEXT_SYSTEM_PROMPT } from "@/lib/forge/v-text-persona";
import { assertValidModelOutput } from "@/lib/forge/provider-errors";

// URL del v-server en Hetzner (via nginx /v-server/ → localhost:5000)
const HETZNER_BASE = (process.env.HETZNER_URL || "http://178.105.135.26").replace(/\/$/, "");
const CLAUDE_ENDPOINT = `${HETZNER_BASE}/v-server/claude`;
const V_SERVER_TOKEN = process.env.HETZNER_SECRET || "";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

/**
 * Construye el prompt completo para `claude --print`.
 * Incluye system prompt + historial formateado + mensaje actual.
 */
function buildPrompt(
  systemPrompt: string,
  message: string,
  history: ChatTurn[],
  maxHistoryTurns = 6,
): string {
  const turns = history
    .slice(-maxHistoryTurns * 2)
    .map((m) => `${m.role === "user" ? "Luis" : "V"}: ${m.content}`)
    .join("\n");

  return [
    systemPrompt,
    "",
    turns ? `CONVERSACIÓN ANTERIOR:\n${turns}\n` : "",
    `Luis: ${message}`,
    "V:",
  ]
    .filter(Boolean)
    .join("\n");
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

/**
 * Cerebro de V en modo VOZ.
 * Respuestas cortas y naturales al oído (sin markdown, sin listas).
 */
export async function voiceBrain(
  message: string,
  history: ChatTurn[] = [],
): Promise<string> {
  const prompt = buildPrompt(V_VOICE_SYSTEM_PROMPT, message, history, 4);

  const reply = await callHetznerClaude(prompt, 45000);
  return reply || "Perdón hermano, no te capté. ¿Me lo repites?";
}

/**
 * Cerebro de V en modo TEXTO.
 * Puede usar Markdown, respuestas largas, código.
 */
export async function textBrain(
  message: string,
  history: ChatTurn[] = [],
): Promise<string> {
  const prompt = buildPrompt(V_TEXT_SYSTEM_PROMPT, message, history, 12);

  const reply = await callHetznerClaude(prompt, 60000);
  return reply || "Perdón hermano, me perdí. ¿Me lo repites?";
}
