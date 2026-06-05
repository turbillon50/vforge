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
import {
  getUserMemories,
  saveUserMemory,
  extractMemoryBlocks,
  memoryPromptSection,
} from "@/lib/forge/user-memory";

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
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

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

  const apiKey = await getOperatorSecret("OPENROUTER_API_KEY", {
    auditUserId: userId,
  });
  if (!apiKey) {
    return jsonError("OPENROUTER_API_KEY not configured (vault or env)", 500);
  }

  const { systemPrompt: basePrompt, config } = await buildSystemPrompt({
    projectId: body.projectId ?? null,
  });
  // Memoria por cuenta (independiente de la sesion de chat).
  const userMemories = await getUserMemories(memoryUserId);
  const systemPrompt = basePrompt + memoryPromptSection(userMemories);

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
  let configuredModel = dbConfiguredModel ?? config.default_model;
  // El chat del owner SIEMPRE habla con Claude. Nada de degradar a
  // llama/gemini por ahorro: la voz de V no se negocia.
  if (!configuredModel || !configuredModel.startsWith("anthropic/")) {
    configuredModel = "anthropic/claude-sonnet-4.6";
  }
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
    { role: "system", content: systemPrompt },
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
