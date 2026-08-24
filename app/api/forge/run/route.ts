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
import {
  modelForEngine,
  resolveLlmEngine,
} from "@/lib/forge/llm-engine";
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
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

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
const MAX_CONTEXT_TURNS = 24;

function filterThinkingToken(delta: string, state: { inThinking: boolean }): string {
  let text = delta;
  let out = "";
  while (text.length > 0) {
    if (state.inThinking) {
      const end = text.search(/<\/(?:thinking|think|antml:thinking)>/i);
      if (end === -1) return out;
      text = text.slice(end).replace(/^<\/(?:thinking|think|antml:thinking)>/i, "");
      state.inThinking = false;
      continue;
    }
    const start = text.search(/<(?:thinking|think|antml:thinking)>/i);
    if (start === -1) {
      out += text;
      break;
    }
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
  const userId = OPERATOR_USER_ID;
  let memoryUserId = OPERATOR_USER_ID;
  try {
    const a = await auth();
    if (a?.userId) memoryUserId = a.userId;
  } catch {
    // sin Clerk
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

  const engine = resolveLlmEngine();
  if (engine.name === "none" && !process.env.HETZNER_SECRET) {
    return jsonError(
      "No model engine configured (CEREBRAS_API_KEY, OPENROUTER fallback o HETZNER_SECRET)",
      500,
    );
  }

  const lastUserText = stringifyUserTurn(
    messages[messages.length - 1]?.content ?? "",
  );
  const lastTurnIsUser = messages[messages.length - 1]?.role === "user";

  const { systemPrompt: basePrompt, config, activeSkill } =
    await buildSystemPrompt({
      projectId: body.projectId ?? null,
      userMessage: lastTurnIsUser ? lastUserText : null,
    });
  const userMemories = await getUserMemories(memoryUserId);
  const recallHits =
    messages[messages.length - 1]?.role === "user" && lastUserText
      ? await recall(lastUserText, 12)
      : [];
  const systemPrompt =
    basePrompt +
    memoryPromptSection(userMemories) +
    formatRecallSection(recallHits, 0.1);

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
      // hub offline
    }
  }
  const finalSystemPrompt = systemPrompt + bridgeSection;

  const dbConfiguredModel = await getModelForTask("chat-main").catch(() => null);
  const configuredModel =
    dbConfiguredModel ?? config.default_model ?? engine.defaultChatModel;

  // Con Cerebras: un solo modelo mapeado (sin cascade OpenRouter).
  let cascade: string[];
  if (engine.name === "cerebras") {
    cascade = [modelForEngine(engine, configuredModel)];
  } else {
    const isKnownSlug = !!MODELS[normalizeSlug(configuredModel)];
    const routing = isKnownSlug
      ? routeFor("chat-main", { forceSlug: normalizeSlug(configuredModel) })
      : routeFor("chat-main");
    cascade = isKnownSlug
      ? routing.cascade
      : [configuredModel, ...routing.cascade];
  }

  const routing = routeFor("chat-main");

  const lastUserTurn = messages[messages.length - 1];
  if (lastUserTurn.role === "user") {
    const textOnly = stringifyUserTurn(lastUserTurn.content);
    try {
      await sql`
        INSERT INTO conversations (user_id, session_id, role, content)
        VALUES (${userId}, ${sessionId}, 'user', ${textOnly})
      `;
    } catch (e) {
      console.error("conversations insert failed (no tumba el chat):", e);
    }
    rememberTurn({ role: "user", content: textOnly, sessionId }).catch(
      () => undefined,
    );
  }

  const llm = engine.client;
  if (!llm) {
    // Solo Hetzner posible
  }

  const openaiTools: ChatCompletionTool[] = TOOLS.map((t) => ({
    type: "function",
    function: {
      name: t.name,
      description: t.description,
      parameters: t.input_schema as Record<string, unknown>,
    },
  }));

  const conversationMessages: ChatCompletionMessageParam[] = [
    { role: "system", content: finalSystemPrompt },
    ...trimmedMessages.map(toOpenAIMessage),
  ];

  const encoder = new TextEncoder();
  let actualModel = cascade[0];
  let cascadeIdx = 0;
  const triedSlugs: string[] = [];
  const fallbackEvents: Array<{
    from: string;
    to: string;
    status: number | null;
    reason: string;
  }> = [];

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
      send({
        type: "meta",
        model: actualModel,
        engine: engine.name,
        engineLabel: engine.label,
      });
      if (activeSkill) {
        send({
          type: "skill_active",
          id: activeSkill.id,
          name: activeSkill.name,
        });
      }

      // Solo relay Hetzner/Claude si NO hay Cerebras y el slug es anthropic/*
      if (
        engine.name !== "cerebras" &&
        configuredModel.startsWith("anthropic/")
      ) {
        try {
          const handled = await runViaHetznerRelay({
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
          console.error("[V] Relay Hetzner falló:", e);
        }
      }

      if (!llm) {
        send({
          type: "error",
          message:
            "Cerebras no configurado. Define CEREBRAS_API_KEY (y opcional CEREBRAS_BASE_URL para tus GPUs).",
        });
        controller.close();
        return;
      }

      try {
        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
          let completion: Awaited<
            ReturnType<typeof llm.chat.completions.create>
          > | null = null;
          while (true) {
            const currentSlug = cascade[cascadeIdx];
            if (!triedSlugs.includes(currentSlug)) triedSlugs.push(currentSlug);
            actualModel = currentSlug;
            try {
              completion = await llm.chat.completions.create({
                model: currentSlug,
                messages: conversationMessages,
                tools:
                  openaiTools.length > 0 && engine.name !== "cerebras"
                    ? openaiTools
                    : openaiTools.length > 0
                      ? openaiTools
                      : undefined,
                max_tokens: 2048,
                stream: true,
                stream_options: { include_usage: true },
              });
              break;
            } catch (err) {
              const status = errorStatus(err);
              const recoverable =
                status === 402 ||
                status === 404 ||
                status === 429 ||
                (status !== null && status >= 500 && status <= 599);
              const hasNext = cascadeIdx + 1 < cascade.length;
              if (!recoverable || !hasNext) throw err;
              const next = cascade[cascadeIdx + 1];
              const reason =
                err instanceof Error ? err.message.slice(0, 180) : String(err);
              fallbackEvents.push({
                from: currentSlug,
                to: next,
                status,
                reason,
              });
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
          const pendingToolCalls = new Map<
            number,
            { id?: string; name?: string; argsBuffer: string }
          >();

          for await (const chunk of completion as AsyncIterable<{
            usage?: { prompt_tokens?: number; completion_tokens?: number };
            model?: string;
            choices?: Array<{
              delta?: {
                content?: string | null;
                tool_calls?: Array<{
                  index: number;
                  id?: string;
                  function?: { name?: string; arguments?: string };
                }>;
              };
              finish_reason?: string | null;
            }>;
          }>) {
            if (chunk.usage) {
              totalTokensIn += chunk.usage.prompt_tokens ?? 0;
              totalTokensOut += chunk.usage.completion_tokens ?? 0;
            }
            if (chunk.model) actualModel = chunk.model;

            const choice = chunk.choices?.[0];
            if (!choice) continue;

            const delta = choice.delta;
            if (delta?.content) {
              const filtered = filterThinkingToken(delta.content, {
                inThinking: false,
              });
              if (filtered) {
                roundText += filtered;
                assistantTextBuffer += filtered;
                send({ type: "text", value: filtered });
              }
            }

            if (delta?.tool_calls) {
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

          await Promise.all(
            toolCalls.map(async (tc) => {
              let parsedInput: Record<string, unknown> = {};
              try {
                parsedInput = tc.function.arguments
                  ? (JSON.parse(tc.function.arguments) as Record<
                      string,
                      unknown
                    >)
                  : {};
              } catch {
                parsedInput = {};
              }
              const result = await executeTool(tc.function.name, parsedInput, {
                userId,
                sessionId,
              });
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

        const { cleaned: assistantVisible, memories: newMemories } =
          extractMemoryBlocks(assistantTextBuffer);
        for (const m of newMemories) {
          await saveUserMemory(memoryUserId, m.key, m.value);
        }

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
              provider: engine.name,
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
          engine: engine.name,
        });
        controller.close();
      } catch (err) {
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
          const handled = await runViaHetznerRelay({
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
          console.error("[V] fallback relay Hetzner falló:", e2);
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

  rememberTurn({
    role: "assistant",
    content: assistantVisible,
    sessionId,
  }).catch(() => undefined);

  send({ type: "done", tokensIn, tokensOut, model: MODEL_LABEL });
  return true;
}

async function runViaHetznerRelay(args: {
  systemPrompt: string;
  turns: ChatTurn[];
  send: (event: Record<string, unknown>) => void;
  sessionId: string;
  userId: string;
  memoryUserId: string;
}): Promise<boolean> {
  const { turns, send, sessionId, userId, memoryUserId } = args;
  const HETZNER_URL =
    process.env.HETZNER_V_URL || "http://178.105.135.26/v/chat";
  const HETZNER_SECRET = process.env.HETZNER_SECRET || "";
  if (!HETZNER_SECRET) return false;

  const textFromContent = (c: string | StructuredBlock[]): string =>
    typeof c === "string"
      ? c
      : c
          .filter(
            (b): b is Extract<StructuredBlock, { type: "text" }> =>
              b.type === "text",
          )
          .map((b) => b.text)
          .join("\n");

  const lastTurn = turns[turns.length - 1];
  const userMessage = textFromContent(lastTurn.content);
  const history = turns.slice(0, -1).map((t) => ({
    role: t.role,
    content: textFromContent(t.content),
  }));

  const MODEL_LABEL = "hetzner-relay";
  send({ type: "meta", model: MODEL_LABEL });

  try {
    const chatUrl = HETZNER_URL.endsWith("/v/chat-full")
      ? HETZNER_URL
      : HETZNER_URL.replace(/\/v\/chat.*/, "/v/chat-full");
    const upstream = await fetch(chatUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: HETZNER_SECRET,
        message: userMessage,
        history,
        session_id: sessionId,
        system_prompt: args.systemPrompt.slice(0, 16000),
      }),
      signal: AbortSignal.timeout(90000),
    });
    if (!upstream.ok) return false;

    const vData = (await upstream.json()) as { reply?: string; error?: string };
    const reply = vData.reply || "";
    if (!reply || reply.length < 3) return false;

    const { cleaned: assistantVisible, memories: newMemories } =
      extractMemoryBlocks(reply);

    const chunkSize = 8;
    for (let i = 0; i < assistantVisible.length; i += chunkSize) {
      send({
        type: "text",
        value: assistantVisible.slice(i, i + chunkSize),
      });
    }

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
          ${MODEL_LABEL}, 0, 0, NULL
        )
      `;
    } catch (e) {
      console.error("conversations insert (relay Hetzner) failed:", e);
    }

    rememberTurn({
      role: "assistant",
      content: assistantVisible,
      sessionId,
    }).catch(() => undefined);

    send({ type: "done", tokensIn: 0, tokensOut: 0, model: MODEL_LABEL });
    return true;
  } catch (e) {
    console.error("[V] chat-full error:", e);
    return false;
  }
}

function toOpenAIMessage(turn: ChatTurn): ChatCompletionMessageParam {
  if (typeof turn.content === "string") {
    return { role: turn.role, content: turn.content };
  }
  const parts: ChatCompletionContentPart[] = turn.content.map((b) => {
    if (b.type === "text") return { type: "text", text: b.text };
    return {
      type: "image_url",
      image_url: {
        url: `data:${b.source.media_type};base64,${b.source.data}`,
      },
    };
  });
  if (turn.role === "assistant") {
    const textOnly = parts
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("\n");
    return { role: "assistant", content: textOnly };
  }
  return { role: "user", content: parts };
}

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
