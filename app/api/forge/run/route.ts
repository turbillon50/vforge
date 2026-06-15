import OpenAI from "openai";
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
  ChatCompletionContentPart,
  ChatCompletionMessageFunctionToolCall,
} from "openai/resources/chat/completions";
import { sql } from "@/lib/db/client";
import { buildSystemPrompt } from "@/lib/forge/system-prompt";
import { TOOLS, executeTool } from "@/lib/forge/tools";
import { getOperatorSecret } from "@/lib/vault/get-secret";
import { routeFor } from "@/lib/forge/routing";
import { estimateCostForModel, MODELS, normalizeSlug } from "@/lib/forge/models";
import { getModelForTask } from "@/lib/forge/agent-config";
import { auth } from "@clerk/nextjs/server";
import { getBridgeStatus, bridgeConfigured } from "@/lib/forge/bridge";
import {
  getUserMemories,
  saveUserMemory,
  extractMemoryBlocks,
  memoryPromptSection,
} from "@/lib/forge/user-memory";
import {
  recall,
  rememberTurn,
  formatRecallSection,
} from "@/lib/forge/semantic-recall";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type StructuredBlock =
  | { type: "text"; text: string }
  | {
      type: "image";
      source: { type: "base64"; media_type: string; data: string };
    };

interface ChatTurn {
  role: "user" | "assistant";
  content: string | StructuredBlock[];
}

interface RunRequest {
  messages: ChatTurn[];
  sessionId: string;
  projectId?: string | null;
}

const OPERATOR_USER_ID = "operator_luis";
const MAX_TOOL_ROUNDS = 5;
// Solo las últimas N vueltas viajan al modelo. El historial completo vive
// en la DB y en la UI, pero un contexto kilométrico (y contaminado de
// estilos viejos) hace que V imite su pasado en vez de su doctrina.
const MAX_CONTEXT_TURNS = 24;
// Usando Anthropic SDK directo


/**
 * Filtra tokens de thinking del stream antes de enviarlos al cliente.
 * Maneja el caso donde el tag viene fragmentado entre deltas.
 */
function filterThinkingToken(delta: string, state: { inThinking: boolean }): string {
  let text = delta;
  let out = "";
  while (text.length > 0) {
    if (state.inThinking) {
      const end = text.search(/<\/(?:thinking|think|antml:thinking)>/i);
      if (end === -1) return out; // todo el delta es thinking, descartar
      text = text.slice(end).replace(/^<\/(?:thinking|think|antml:thinking)>/i, "");
      state.inThinking = false;
      continue;
    }
    const start = text.search(/<(?:thinking|think|antml:thinking)>/i);
    if (start === -1) { out += text; break; }
    out += text.slice(0, start);
    text = text.slice(start).replace(/^<(?:thinking|think|antml:thinking)>/i, "");
    state.inThinking = true;
  }
  return out;
}

export async function POST(req: Request) {
  let body: RunRequest;
  try {
    body = (await req.json()) as RunRequest;
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const { messages, sessionId } = body;
  // El middleware ya garantiza que solo el owner llega aquí; V es
  // single-user, así que el historial vive bajo el id canónico del
  // operador. Nunca confiamos en un userId del cliente.
  // Historial: SIEMPRE bajo el id canónico del operador — conversations
  // tiene FK a users y la hidratación (active-session, conversations GET)
  // lee operator_luis. La memoria por cuenta sí usa el id de Clerk.
  const userId = OPERATOR_USER_ID;
  let memoryUserId = OPERATOR_USER_ID;
  try {
    const a = await auth();
    if (a?.userId) memoryUserId = a.userId;
  } catch {
    // sin Clerk -> operador
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return jsonError("messages array required and non-empty", 400);
  }
  const trimmedMessages =
    messages.length > MAX_CONTEXT_TURNS
      ? messages.slice(-MAX_CONTEXT_TURNS)
      : messages;
  if (!sessionId || typeof sessionId !== "string") {
    return jsonError("sessionId (string) required", 400);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return jsonError("ANTHROPIC_API_KEY not configured", 500);
  }

  const { systemPrompt: basePrompt, config } = await buildSystemPrompt({
    projectId: body.projectId ?? null,
  });
  // Memoria por cuenta (independiente de la sesion de chat).
  const userMemories = await getUserMemories(memoryUserId);
  // Memoria semántica: recuerdos relevantes al último turno del usuario.
  // Silencioso ante fallo — recall() nunca lanza.
  const lastUserText = stringifyUserTurn(
    messages[messages.length - 1]?.content ?? "",
  );
  const recallHits =
    messages[messages.length - 1]?.role === "user" && lastUserText
      ? await recall(lastUserText, 6)
      : [];
  const systemPrompt =
    basePrompt +
    memoryPromptSection(userMemories) +
    formatRecallSection(recallHits, 0.15);

  // Estado del puente de agentes (hub Hetzner). Best-effort: si el hub
  // no responde en 4s, V opera sin ese bloque. Solo el owner llega aquí
  // (middleware), así que no se filtra nada a terceros.
  let bridgeSection = "";
  if (bridgeConfigured()) {
    try {
      const st = await Promise.race([
        getBridgeStatus(),
        new Promise<never>((_, rej) =>
          setTimeout(() => rej(new Error("timeout")), 4000),
        ),
      ]);
      const pend = st.pending ?? [];
      const lines = pend
        .slice(0, 10)
        .map(
          (pItem) =>
            `- [${pItem.id}] ${pItem.agent} · ${pItem.type}: ${pItem.title}`,
        )
        .join("\n");
      bridgeSection =
        `\n\n## Operación VForge ahora mismo\n` +
        `Pendientes de aprobación: ${pend.length}. Cola del pipeline: ${st.pipeline?.queued ?? 0}.\n` +
        (lines ? lines + "\n" : "") +
        `Tienes herramientas reales para operar el puente: hub_pending_status, hub_approve, hub_reject, hub_dispatch_task ` +
        `(agentes: abogado, logistica, qa, valentina). Si hay pendientes, anúncialos con tu estilo — claros y con criterio, nunca JSON crudo — ` +
        `y pregunta a Luis si aprueba, rechaza (con motivo) o delega algo nuevo.`;
    } catch {
      // hub fuera de línea: V sigue normal
    }
  }
  const finalSystemPrompt = systemPrompt + bridgeSection;

  // Resolve the model cascade.
  // 1. agent_config DB (V's self-config, migration 007) is the canonical
  //    answer for chat-main. Luis (or V herself via agent_config_set)
  //    chooses the model without a code deploy.
  // 2. system_config.default_model is the legacy override, still respected
  //    if someone updates it manually.
  // 3. routeFor falls back to the registry default + cascade.
  const dbConfiguredModel = await getModelForTask("chat-main").catch(
    () => null,
  );
  // Motor de V (decisión de Luis): OpenRouter para optimizar costo, con
  // Gemini como opción; Anthropic NO es su voz (solo último recurso si
  // Luis lo aprueba). Respetamos agent_config/default_model tal cual y
  // dejamos que el cascade haga su trabajo.
  const configuredModel = dbConfiguredModel ?? config.default_model;
  const isKnownSlug = !!MODELS[normalizeSlug(configuredModel)];
  const routing = isKnownSlug
    ? routeFor("chat-main", { forceSlug: normalizeSlug(configuredModel) })
    : routeFor("chat-main");
  const cascade = isKnownSlug
    ? routing.cascade
    : [configuredModel, ...routing.cascade];

  const lastUserTurn = messages[messages.length - 1];
  if (lastUserTurn.role === "user") {
    // Persist a textual representation of the user turn (image bytes
    // are not stored in the conversations table — only the surrounding
    // text plus an optional "[1 imagen adjunta]" marker so rehydration
    // shows the user posted an image without re-fetching it).
    const textOnly = stringifyUserTurn(lastUserTurn.content);
    try {
      await sql`
        INSERT INTO conversations (user_id, session_id, role, content)
        VALUES (${userId}, ${sessionId}, 'user', ${textOnly})
      `;
    } catch (e) {
      console.error("conversations insert failed (no tumba el chat):", e);
    }
    // Memoria semántica del turno user (fire-and-forget).
    rememberTurn({ role: "user", content: textOnly, sessionId }).catch(
      () => undefined,
    );
  }

  const openrouter = new OpenAI({
    apiKey,
    baseURL: OPENROUTER_BASE_URL,
    defaultHeaders: {
      "HTTP-Referer": "https://vforge.site",
      "X-Title": "vForge",
    },
  });

  const openaiTools: ChatCompletionTool[] = TOOLS.map((t) => ({
    type: "function",
    function: {
      name: t.name,
      description: t.description,
      parameters: t.input_schema as Record<string, unknown>,
    },
  }));

  // Working copy of the conversation in OpenAI format. We rebuild from
  // ChatTurn[] (which may have Anthropic-style image blocks from the FE)
  // and accumulate assistant + tool turns across rounds.
  const conversationMessages: ChatCompletionMessageParam[] = [
    { role: "system", content: finalSystemPrompt },
    ...trimmedMessages.map(toOpenAIMessage),
  ];

  const encoder = new TextEncoder();
  let actualModel = cascade[0];
  let cascadeIdx = 0;
  const triedSlugs: string[] = [];
  const fallbackEvents: Array<{ from: string; to: string; status: number | null; reason: string }> = [];

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
        );
      };

      let assistantTextBuffer = "";
      let totalTokensIn = 0;
      let totalTokensOut = 0;
      let lastStopReason: string | null = null;
      // El UI muestra discreto qué modelo responde: nunca más dudar quién escribe.
      send({ type: "meta", model: actualModel });

      // MOTOR DE V: si la config apunta a un modelo Anthropic, vamos DIRECTO
      // al cerebro Anthropic (con tools) — OpenRouter está sin saldo y solo
      // produciría un fallback por turno. Config = realidad, cero churn.
      if (configuredModel.startsWith("anthropic/")) {
        try {
          const handled = await runAnthropicDirect({
            systemPrompt,
            turns: trimmedMessages,
            send,
            sessionId,
            userId,
            memoryUserId,
          });
          if (handled) {
            controller.close();
            return;
          }
        } catch (e) {
          console.error("[V] Anthropic directo (primario) falló, intento OpenRouter:", e);
        }
      }
      // BUILDER (v0-sin-v0): cuando la tool `design_version` se ejecute en
      // un round y devuelva {buildId, versionId, n, preview_url}, aquí se
      // emitirá send({ type: "version", buildId, versionId, n, summary })
      // justo después del tool_use_result correspondiente, para que el chat
      // pinte la VersionCard inline. La lógica de modelo NO cambia: solo
      // falta el cerebro con saldo para que Claude llame la tool.

      try {
        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
          // Try the primary model and cascade through fallbacks on
          // recoverable errors (402 = balance, 429 = rate limit,
          // 5xx = provider down). Non-recoverable errors bubble.
          let completion: Awaited<
            ReturnType<typeof openrouter.chat.completions.create>
          > | null = null;
          while (true) {
            const currentSlug = cascade[cascadeIdx];
            if (!triedSlugs.includes(currentSlug)) triedSlugs.push(currentSlug);
            actualModel = currentSlug;
            try {
              completion = await openrouter.chat.completions.create({
                model: currentSlug,
                messages: conversationMessages,
                tools: openaiTools.length > 0 ? openaiTools : undefined,
                max_tokens: 2048,
                stream: true,
                stream_options: { include_usage: true },
              });
              break;
            } catch (err) {
              const status = errorStatus(err);
              const recoverable =
                status === 402 ||
                status === 404 || // modelo inexistente/deprecado en OpenRouter -> siguiente del cascade
                status === 429 ||
                (status !== null && status >= 500 && status <= 599);
              const hasNext = cascadeIdx + 1 < cascade.length;
              if (!recoverable || !hasNext) throw err;
              const next = cascade[cascadeIdx + 1];
              const reason =
                err instanceof Error ? err.message.slice(0, 180) : String(err);
              fallbackEvents.push({ from: currentSlug, to: next, status, reason });
              send({ type: "meta", model: next, fallback: true });
              send({
                type: "model_fallback",
                from: currentSlug,
                to: next,
                status,
                reason,
              });
              cascadeIdx += 1;
            }
          }
          if (!completion) throw new Error("completion is null after cascade");

          let roundText = "";
          let roundFinish: string | null = null;
          // Tool calls arrive in chunked deltas indexed by `index`; we
          // accumulate name + arguments per index until the assistant
          // message ends.
          const pendingToolCalls = new Map<
            number,
            { id?: string; name?: string; argsBuffer: string }
          >();

          for await (const chunk of completion) {
            // OpenAI emits an extra chunk with usage info at the end.
            if (chunk.usage) {
              totalTokensIn += chunk.usage.prompt_tokens ?? 0;
              totalTokensOut += chunk.usage.completion_tokens ?? 0;
            }
            if (chunk.model) actualModel = chunk.model;

            const choice = chunk.choices?.[0];
            if (!choice) continue;

            const delta = choice.delta;
            if (delta.content) {
              roundText += delta.content;
              assistantTextBuffer += delta.content;
              send({ type: "text", value: delta.content });
            }

            if (delta.tool_calls) {
              for (const tcDelta of delta.tool_calls) {
                const idx = tcDelta.index;
                let entry = pendingToolCalls.get(idx);
                if (!entry) {
                  entry = { argsBuffer: "" };
                  pendingToolCalls.set(idx, entry);
                }
                if (tcDelta.id) entry.id = tcDelta.id;
                if (tcDelta.function?.name) {
                  entry.name = tcDelta.function.name;
                  // Surface the tool name to the UI as soon as we know it
                  // (OpenRouter sends name in the first delta of the tool
                  // call; arguments stream in subsequent deltas).
                  if (entry.id) {
                    send({
                      type: "tool_use_start",
                      id: entry.id,
                      name: entry.name,
                    });
                  }
                }
                if (tcDelta.function?.arguments) {
                  entry.argsBuffer += tcDelta.function.arguments;
                }
              }
            }

            if (choice.finish_reason) {
              roundFinish = choice.finish_reason;
            }
          }

          lastStopReason = roundFinish;

          // Materialize the assistant message we just streamed and
          // append it to conversation history before executing tools.
          const toolCalls: ChatCompletionMessageFunctionToolCall[] = Array.from(
            pendingToolCalls.entries(),
          )
            .sort(([a], [b]) => a - b)
            .map(([, e]) => {
              if (!e.id || !e.name) {
                throw new Error(
                  `Incomplete tool_call from stream (id=${e.id} name=${e.name})`,
                );
              }
              return {
                id: e.id,
                type: "function" as const,
                function: { name: e.name, arguments: e.argsBuffer || "{}" },
              };
            });

          conversationMessages.push({
            role: "assistant",
            content: roundText || null,
            ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
          });

          if (toolCalls.length === 0) {
            break;
          }

          // Execute every tool call in parallel and append a `tool` role
          // message per call. OpenAI / OpenRouter expects one tool
          // message per tool_call_id, in the same order as the assistant
          // tool_calls.
          await Promise.all(
            toolCalls.map(async (tc) => {
              let parsedInput: Record<string, unknown> = {};
              try {
                parsedInput = tc.function.arguments
                  ? (JSON.parse(tc.function.arguments) as Record<string, unknown>)
                  : {};
              } catch {
                parsedInput = {};
              }
              const result = await executeTool(
                tc.function.name,
                parsedInput,
                { userId, sessionId },
              );
              send({
                type: "tool_use_result",
                id: tc.id,
                ok: result.ok,
                summary: result.summary,
              });
              conversationMessages.push({
                role: "tool",
                tool_call_id: tc.id,
                content: result.content,
              });
            }),
          );
        }

        // Extrae bloques <memory> emitidos por el modelo (datos durables
        // del usuario) y guardalos en v_user_memory; no se muestran ni
        // se persisten en la conversacion.
        const { cleaned: assistantVisible, memories: newMemories } =
          extractMemoryBlocks(assistantTextBuffer);
        for (const m of newMemories) {
          await saveUserMemory(memoryUserId, m.key, m.value);
        }

        // Persist the final assistant text. Tool intermediate steps
        // are not replayed on rehydrate; only the visible answer.
        await sql`
          INSERT INTO conversations (
            user_id, session_id, role, content, model,
            tokens_in, tokens_out, cost_usd
          )
          VALUES (
            ${userId}, ${sessionId}, 'assistant', ${assistantVisible},
            ${actualModel},
            ${totalTokensIn}, ${totalTokensOut},
            ${estimateCostForModel(actualModel, totalTokensIn, totalTokensOut)}
          )
        `;

        // Memoria semántica de la respuesta (fire-and-forget).
        rememberTurn({
          role: "assistant",
          content: assistantVisible,
          sessionId,
        }).catch(() => undefined);

        await sql`
          INSERT INTO audit_events (user_id, action, resource_type, resource_id, ring, payload)
          VALUES (
            ${userId}, 'forge.chat.turn', 'conversation', ${sessionId}, 0,
            ${JSON.stringify({
              tokens_in: totalTokensIn,
              tokens_out: totalTokensOut,
              model: actualModel,
              provider: "openrouter",
              stop_reason: lastStopReason,
              cascade_tried: triedSlugs,
              fallbacks: fallbackEvents,
              routing_reason: routing.reason,
            })}::jsonb
          )
        `;

        send({
          type: "done",
          tokensIn: totalTokensIn,
          tokensOut: totalTokensOut,
          model: actualModel,
        });
        controller.close();
      } catch (err) {
        // Cascade OpenRouter agotado (o error irrecuperable). Doctrina:
        // el motor de V es OpenRouter + Gemini; Anthropic directo es el
        // ULTIMO recurso. Primero intentamos Gemini directo (key propia,
        // no depende del saldo de OpenRouter).
        try {
          const handledGemini = await runGeminiDirect({
            systemPrompt,
            turns: trimmedMessages,
            send,
            sessionId,
            userId,
            memoryUserId,
          });
          if (handledGemini) {
            controller.close();
            return;
          }
        } catch (eg) {
          console.error("[V] fallback Gemini directo falló:", eg);
        }
        try {
          const handled = await runAnthropicDirect({
            systemPrompt,
            turns: trimmedMessages,
            send,
            sessionId,
            userId,
            memoryUserId,
          });
          if (handled) {
            controller.close();
            return;
          }
        } catch (e2) {
          console.error("[V] fallback Anthropic directo falló:", e2);
        }
        const message = err instanceof Error ? err.message : String(err);
        send({ type: "error", message });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

/**
 * Vía de respaldo PREFERIDA: Gemini DIRECTO con la GEMINI_API_KEY del vault
 * (endpoint OpenAI-compatible de Google). Sin tools, robusto, no depende
 * del saldo de OpenRouter. Emite los mismos eventos SSE {meta|text|done}.
 */
async function runGeminiDirect(args: {
  systemPrompt: string;
  turns: ChatTurn[];
  send: (event: Record<string, unknown>) => void;
  sessionId: string;
  userId: string;
  memoryUserId: string;
}): Promise<boolean> {
  const { systemPrompt, turns, send, sessionId, userId, memoryUserId } = args;
  const geminiKey = await getOperatorSecret("GEMINI_API_KEY", {
    auditUserId: userId,
  });
  if (!geminiKey) return false;

  const client = new OpenAI({
    apiKey: geminiKey,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
  });
  const model = "gemini-2.5-flash";
  const MODEL_LABEL = "google/gemini-2.5-flash";

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...turns.map(toOpenAIMessage),
  ];

  send({ type: "meta", model: MODEL_LABEL });

  let assistantTextBuffer = "";
  let tokensIn = 0;
  let tokensOut = 0;

  const completion = await client.chat.completions.create({
    model,
    messages,
    max_tokens: 3072,
    stream: true,
  });
  for await (const chunk of completion) {
    if (chunk.usage) {
      tokensIn += chunk.usage.prompt_tokens ?? 0;
      tokensOut += chunk.usage.completion_tokens ?? 0;
    }
    const delta = chunk.choices?.[0]?.delta?.content;
    if (delta) {
      assistantTextBuffer += delta;
      send({ type: "text", value: delta });
    }
  }
  if (!assistantTextBuffer) return false;

  const { cleaned: assistantVisible, memories: newMemories } =
    extractMemoryBlocks(assistantTextBuffer);
  for (const m of newMemories) {
    await saveUserMemory(memoryUserId, m.key, m.value).catch(() => undefined);
  }

  try {
    await sql`
      INSERT INTO conversations (
        user_id, session_id, role, content, model, tokens_in, tokens_out, cost_usd
      )
      VALUES (
        ${userId}, ${sessionId}, 'assistant', ${assistantVisible},
        ${MODEL_LABEL}, ${tokensIn}, ${tokensOut}, NULL
      )
    `;
  } catch (e) {
    console.error("conversations insert (gemini directo) failed:", e);
  }

  rememberTurn({ role: "assistant", content: assistantVisible, sessionId }).catch(
    () => undefined,
  );

  send({ type: "done", tokensIn, tokensOut, model: MODEL_LABEL });
  return true;
}

/**
 * Vía de emergencia: habla con Claude DIRECTO (sin OpenRouter, sin tools).
 * Devuelve true si pudo responder; false si no hay key o falla antes de
 * emitir nada útil. Emite los mismos eventos SSE {meta|text|done}.
 */
async function runAnthropicDirect(args: {
  systemPrompt: string;
  turns: ChatTurn[];
  send: (event: Record<string, unknown>) => void;
  sessionId: string;
  userId: string;
  memoryUserId: string;
}): Promise<boolean> {
  const { systemPrompt, turns, send, sessionId, userId, memoryUserId } = args;
  const anthropicKey = await getOperatorSecret("ANTHROPIC_API_KEY", {
    auditUserId: userId,
  });
  if (!anthropicKey) return false;

  const client = new Anthropic({ apiKey: anthropicKey });
  const model = "claude-sonnet-4-6";
  const MODEL_LABEL = "anthropic/claude-sonnet-4.6";

  // Tools en formato Anthropic (TOOLS ya trae name/description/input_schema).
  const anthTools = TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.input_schema as Anthropic.Tool.InputSchema,
  }));

  // Mensajes iniciales del FE (texto o bloques imagen base64).
  const messages: Anthropic.MessageParam[] = turns.map((t) => ({
    role: t.role,
    content:
      typeof t.content === "string"
        ? t.content
        : (t.content as unknown as Anthropic.ContentBlockParam[]),
  }));

  send({ type: "meta", model: MODEL_LABEL });

  let assistantTextBuffer = "";
  let tokensIn = 0;
  let tokensOut = 0;

  // Loop de tool-use: V conserva sus 73 manos también por el camino directo.
  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const stream = client.messages.stream({
      model,
      system: systemPrompt,
      messages,
      max_tokens: 3072,
      tools: anthTools,
    });
    const thinkState = { inThinking: false };
    stream.on("text", (delta) => {
      const clean = filterThinkingToken(delta, thinkState);
      if (!clean) return;
      assistantTextBuffer += clean;
      send({ type: "text", value: clean });
    });
    const final = await stream.finalMessage();
    tokensIn += final.usage?.input_tokens ?? 0;
    tokensOut += final.usage?.output_tokens ?? 0;

    const toolUses = final.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
    );
    if (final.stop_reason !== "tool_use" || toolUses.length === 0) {
      break;
    }

    // Ejecuta cada tool y arma los tool_result para la siguiente vuelta.
    messages.push({ role: "assistant", content: final.content });
    const results: Anthropic.ContentBlockParam[] = [];
    for (const tu of toolUses) {
      send({ type: "tool_use_start", id: tu.id, name: tu.name });
      let out: { ok: boolean; content: string; summary: string };
      try {
        out = await executeTool(tu.name, (tu.input ?? {}) as Record<string, unknown>, {
          userId,
          sessionId,
        });
      } catch (e) {
        out = { ok: false, content: String(e).slice(0, 500), summary: "error" };
      }
      send({ type: "tool_use_result", id: tu.id, ok: out.ok, summary: out.summary });
      results.push({
        type: "tool_result",
        tool_use_id: tu.id,
        content: out.content.slice(0, 8000),
        is_error: !out.ok,
      });
    }
    messages.push({ role: "user", content: results });
  }

  const { cleaned: assistantVisible, memories: newMemories } =
    extractMemoryBlocks(assistantTextBuffer);
  for (const m of newMemories) {
    await saveUserMemory(memoryUserId, m.key, m.value).catch(() => undefined);
  }

  try {
    await sql`
      INSERT INTO conversations (
        user_id, session_id, role, content, model, tokens_in, tokens_out, cost_usd
      )
      VALUES (
        ${userId}, ${sessionId}, 'assistant', ${assistantVisible},
        ${MODEL_LABEL}, ${tokensIn}, ${tokensOut}, NULL
      )
    `;
  } catch (e) {
    console.error("conversations insert (directo) failed:", e);
  }

  rememberTurn({ role: "assistant", content: assistantVisible, sessionId }).catch(
    () => undefined,
  );

  send({ type: "done", tokensIn, tokensOut, model: MODEL_LABEL });
  return true;
}

/**
 * Convert a FE-supplied ChatTurn to OpenAI's ChatCompletionMessageParam.
 * The FE still sends Anthropic-style image blocks
 * ({type:"image", source:{type:"base64", media_type, data}}) so we
 * remap them to OpenAI's image_url data-URI format here.
 */
function toOpenAIMessage(turn: ChatTurn): ChatCompletionMessageParam {
  if (typeof turn.content === "string") {
    return { role: turn.role, content: turn.content };
  }
  const parts: ChatCompletionContentPart[] = turn.content.map((b) => {
    if (b.type === "text") return { type: "text", text: b.text };
    return {
      type: "image_url",
      image_url: { url: `data:${b.source.media_type};base64,${b.source.data}` },
    };
  });
  if (turn.role === "assistant") {
    // OpenAI assistant content doesn't support image parts; flatten to
    // text-only. Images in assistant turns shouldn't happen in our flow
    // (FE only attaches them to user turns) but we degrade gracefully.
    const textOnly = parts
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("\n");
    return { role: "assistant", content: textOnly };
  }
  return { role: "user", content: parts };
}

/**
 * Reduce a user turn's content (string or block array) to a single
 * string for persistence. Images are summarized as "[N imagen(es)]"
 * since we don't store image bytes in the conversations table.
 */
function stringifyUserTurn(content: string | StructuredBlock[]): string {
  if (typeof content === "string") return content;
  let imageCount = 0;
  let text = "";
  for (const b of content) {
    if (b.type === "image") imageCount += 1;
    else if (b.type === "text") text += (text ? "\n" : "") + b.text;
  }
  if (imageCount > 0) {
    const tag = `[${imageCount} imagen${imageCount === 1 ? "" : "es"} adjunta${imageCount === 1 ? "" : "s"}]`;
    return text ? `${text}\n${tag}` : tag;
  }
  return text;
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Best-effort extraction of HTTP status from an OpenAI SDK error.
 * The SDK throws `APIError` subclasses with a `status` field; for any
 * other error shape we try to parse the typical "402 ..." prefix.
 */
function errorStatus(err: unknown): number | null {
  if (err && typeof err === "object" && "status" in err) {
    const s = (err as { status: unknown }).status;
    if (typeof s === "number") return s;
  }
  if (err instanceof Error) {
    const m = err.message.match(/^\s*(\d{3})\b/);
    if (m) return Number(m[1]);
  }
  return null;
}
