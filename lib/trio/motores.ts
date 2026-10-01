import "server-only";

/**
 * Motor conversacional de V para la Sala de agentes.
 *
 * Claude Code y Codex ya no pasan por API keys aquí: trabajan como CLIs reales
 * dentro del motor vivo. Este archivo queda sólo para la columna V, usando el
 * mismo motor que /api/forge/run y omitiendo tools.
 */
import { buildSystemPrompt } from "@/lib/forge/system-prompt";
import { getModelForTask } from "@/lib/forge/agent-config";
import { modelForEngine, resolveLlmEngine } from "@/lib/forge/llm-engine";
import { MODELS, normalizeSlug } from "@/lib/forge/models";
import { routeFor } from "@/lib/forge/routing";
import type { TurnoChat } from "@/lib/trio/conversacion";

const MAX_TOKENS = 1600;

export interface EventoMotor {
  tipo: "modelo" | "texto";
  valor: string;
}

function estadoHttp(err: unknown): number | null {
  if (err && typeof err === "object" && "status" in err) {
    const s = (err as { status?: unknown }).status;
    if (typeof s === "number") return s;
  }
  return null;
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
  return `${systemPrompt}\n\n## Sala de agentes\n${reglas}\nEn esta columna NO tienes herramientas activas aunque arriba se mencionen: sólo conversas.`;
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
