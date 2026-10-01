import "server-only";

/**
 * Motores del Trío. Cada uno es un generador async que emite deltas de texto.
 * Sin herramientas: es sólo conversación.
 *
 * - Claude  → Anthropic Messages API (ANTHROPIC_API_KEY, vault → env).
 * - ChatGPT → OpenAI Chat Completions (OPENAI_API_KEY, vault → env).
 * - V       → el MISMO motor que usa /api/forge/run (resolveLlmEngine + modelo
 *             de agent_config "chat-main" + cascada de routing) y el MISMO system
 *             prompt de V (buildSystemPrompt); sólo se omiten las tools.
 */
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { getOperatorSecret } from "@/lib/vault/get-secret";
import { buildSystemPrompt } from "@/lib/forge/system-prompt";
import { getModelForTask } from "@/lib/forge/agent-config";
import { modelForEngine, resolveLlmEngine } from "@/lib/forge/llm-engine";
import { MODELS, normalizeSlug } from "@/lib/forge/models";
import { routeFor } from "@/lib/forge/routing";
import type { TurnoChat } from "@/lib/trio/conversacion";

/** Modelo de Claude: el mismo que ya usa el asistente del workspace; override por env. */
export const MODELO_CLAUDE = process.env.TRIO_CLAUDE_MODEL?.trim() || "claude-sonnet-4-6";
/** Modelo de ChatGPT: el de la familia que ya usa el routing del repo (openai/gpt-5); override por env. */
export const MODELO_CHATGPT = process.env.TRIO_OPENAI_MODEL?.trim() || "gpt-5";

const MAX_TOKENS = 1600;

export interface EventoMotor {
  tipo: "modelo" | "texto";
  valor: string;
}

async function llave(nombre: string): Promise<string | null> {
  try {
    const valor = await getOperatorSecret(nombre);
    if (valor?.trim()) return valor.trim();
  } catch {
    // vault caído: cae a env
  }
  return process.env[nombre]?.trim() || null;
}

function estadoHttp(err: unknown): number | null {
  if (err && typeof err === "object" && "status" in err) {
    const s = (err as { status?: unknown }).status;
    if (typeof s === "number") return s;
  }
  return null;
}

export async function* motorClaude(
  sistema: string,
  turnos: TurnoChat[],
  signal: AbortSignal,
): AsyncGenerator<EventoMotor> {
  const apiKey = await llave("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY no está configurada.");
  const cliente = new Anthropic({ apiKey });
  yield { tipo: "modelo", valor: MODELO_CLAUDE };
  const stream = cliente.messages.stream(
    {
      model: MODELO_CLAUDE,
      max_tokens: MAX_TOKENS,
      system: sistema,
      messages: turnos,
    },
    { signal },
  );
  for await (const evento of stream) {
    if (evento.type === "content_block_delta" && evento.delta.type === "text_delta") {
      yield { tipo: "texto", valor: evento.delta.text };
    }
  }
}

export async function* motorChatGPT(
  sistema: string,
  turnos: TurnoChat[],
  signal: AbortSignal,
): AsyncGenerator<EventoMotor> {
  const apiKey = await llave("OPENAI_API_KEY");
  if (!apiKey) throw new Error("OPENAI_API_KEY no está configurada.");
  const cliente = new OpenAI({ apiKey });
  const mensajes = [{ role: "system" as const, content: sistema }, ...turnos];
  yield { tipo: "modelo", valor: MODELO_CHATGPT };
  try {
    const stream = await cliente.chat.completions.create(
      {
        model: MODELO_CHATGPT,
        messages: mensajes,
        max_completion_tokens: MAX_TOKENS * 4, // los modelos de razonamiento gastan parte en pensar
        stream: true,
      },
      { signal },
    );
    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) yield { tipo: "texto", valor: delta };
    }
  } catch (err) {
    // Algunas organizaciones de OpenAI no tienen habilitado el streaming de ciertos
    // modelos (exige verificación). En ese caso, una sola llamada sin stream.
    const mensaje = err instanceof Error ? err.message : "";
    if (estadoHttp(err) !== 400 || !/stream/i.test(mensaje)) throw err;
    const completo = await cliente.chat.completions.create(
      { model: MODELO_CHATGPT, messages: mensajes, max_completion_tokens: MAX_TOKENS * 4 },
      { signal },
    );
    const texto = completo.choices?.[0]?.message?.content ?? "";
    if (texto) yield { tipo: "texto", valor: texto };
  }
}

/** Quita bloques <think>…</think> que algunos modelos abiertos emiten en el stream. */
function filtroPensamiento() {
  let dentro = false;
  return (delta: string): string => {
    let texto = delta;
    let fuera = "";
    while (texto) {
      if (dentro) {
        const fin = texto.search(/<\/(?:thinking|think)>/i);
        if (fin === -1) return fuera;
        texto = texto.slice(fin).replace(/^<\/(?:thinking|think)>/i, "");
        dentro = false;
        continue;
      }
      const inicio = texto.search(/<(?:thinking|think)>/i);
      if (inicio === -1) return fuera + texto;
      fuera += texto.slice(0, inicio);
      texto = texto.slice(inicio).replace(/^<(?:thinking|think)>/i, "");
      dentro = true;
    }
    return fuera;
  };
}

/** System prompt de V: el real de V + las reglas de la mesa. */
export async function sistemaDeV(
  projectId: string | null,
  ultimoMensaje: string | null,
  reglas: string,
): Promise<string> {
  const { systemPrompt } = await buildSystemPrompt({ projectId, userMessage: ultimoMensaje });
  return `${systemPrompt}\n\n## Modo Trío\n${reglas}\nEn este modo NO tienes herramientas activas aunque arriba se mencionen: sólo conversas.`;
}

export async function* motorV(
  sistema: string,
  turnos: TurnoChat[],
  signal: AbortSignal,
): AsyncGenerator<EventoMotor> {
  const engine = resolveLlmEngine();
  const llm = engine.client;
  if (!llm) {
    throw new Error("V no tiene motor configurado (CEREBRAS_API_KEY u OPENROUTER_API_KEY).");
  }

  // Misma resolución de modelo que /api/forge/run.
  const configurado =
    (await getModelForTask("chat-main").catch(() => null)) ?? engine.defaultChatModel;
  let cascada: string[];
  if (engine.name === "cerebras") {
    cascada = [modelForEngine(engine, configurado)];
  } else {
    const conocido = !!MODELS[normalizeSlug(configurado)];
    cascada = conocido
      ? routeFor("chat-main", { forceSlug: normalizeSlug(configurado) }).cascade
      : [configurado, ...routeFor("chat-main").cascade];
  }

  const mensajes = [{ role: "system" as const, content: sistema }, ...turnos];
  let ultimoError: unknown = null;
  for (const modelo of cascada) {
    let stream;
    try {
      stream = await llm.chat.completions.create(
        { model: modelo, messages: mensajes, max_tokens: MAX_TOKENS, stream: true },
        { signal },
      );
    } catch (err) {
      ultimoError = err;
      const s = estadoHttp(err);
      const recuperable = s === 402 || s === 404 || s === 429 || (s !== null && s >= 500);
      if (!recuperable) throw err;
      continue;
    }
    yield { tipo: "modelo", valor: modelo };
    const filtrar = filtroPensamiento();
    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content;
      if (!delta) continue;
      const limpio = filtrar(delta);
      if (limpio) yield { tipo: "texto", valor: limpio };
    }
    return;
  }
  throw ultimoError instanceof Error ? ultimoError : new Error("Ningún modelo de V respondió.");
}
