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
  userId?: string; // defaults to operator_luis until Clerk lands
  projectId?: string | null;
}

const OPERATOR_USER_ID = "operator_luis";
const MAX_TOOL_ROUNDS = 5;
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

// Default fallback when the config's model slug is the legacy Anthropic
// short name and we need to map it to an OpenRouter-style slug.
const LEGACY_MODEL_MAP: Record<string, string> = {
  "claude-opus-4-7": "anthropic/claude-opus-4.7",
  "claude-sonnet-4-6": "anthropic/claude-sonnet-4.6",
  "claude-haiku-4-5": "anthropic/claude-haiku-4.5",
};

export async function POST(req: Request) {
  let body: RunRequest;
  try {
    body = (await req.json()) as RunRequest;
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const { messages, sessionId } = body;
  const userId = body.userId ?? OPERATOR_USER_ID;

  if (!Array.isArray(messages) || messages.length === 0) {
    return jsonError("messages array required and non-empty", 400);
  }
  if (!sessionId || typeof sessionId !== "string") {
    return jsonError("sessionId (string) required", 400);
  }

  const apiKey = await getOperatorSecret("OPENROUTER_API_KEY", {
    auditUserId: userId,
  });
  if (!apiKey) {
    return jsonError("OPENROUTER_API_KEY not configured (vault or env)", 500);
  }

  const { systemPrompt, config } = await buildSystemPrompt({
    projectId: body.projectId ?? null,
  });

  // Resolve the model: prefer OpenRouter-format slugs, fall back via
  // LEGACY_MODEL_MAP for rows still using the Anthropic short name.
  const configuredModel = config.default_model;
  const model =
    LEGACY_MODEL_MAP[configuredModel] ??
    (configuredModel.includes("/") ? configuredModel : "anthropic/claude-sonnet-4.6");

  const lastUserTurn = messages[messages.length - 1];
  if (lastUserTurn.role === "user") {
    // Persist a textual representation of the user turn (image bytes
    // are not stored in the conversations table — only the surrounding
    // text plus an optional "[1 imagen adjunta]" marker so rehydration
    // shows the user posted an image without re-fetching it).
    const textOnly = stringifyUserTurn(lastUserTurn.content);
    await sql`
      INSERT INTO conversations (user_id, session_id, role, content)
      VALUES (${userId}, ${sessionId}, 'user', ${textOnly})
    `;
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
    ...messages.map(toOpenAIMessage),
  ];

  const encoder = new TextEncoder();
  let actualModel = model;

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

      try {
        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
          const completion = await openrouter.chat.completions.create({
            model,
            messages: conversationMessages,
            tools: openaiTools.length > 0 ? openaiTools : undefined,
            max_tokens: 2048,
            stream: true,
            stream_options: { include_usage: true },
          });

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

        // Persist the final assistant text. Tool intermediate steps
        // are not replayed on rehydrate; only the visible answer.
        await sql`
          INSERT INTO conversations (
            user_id, session_id, role, content, model,
            tokens_in, tokens_out, cost_usd
          )
          VALUES (
            ${userId}, ${sessionId}, 'assistant', ${assistantTextBuffer},
            ${actualModel},
            ${totalTokensIn}, ${totalTokensOut},
            ${estimateCost(actualModel, totalTokensIn, totalTokensOut)}
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

// OpenRouter pricing per 1M tokens (USD). Used only for the cost_usd
// column in conversations; real billing happens at OpenRouter. Refresh
// from https://openrouter.ai/models when adding a model.
const PRICING: Record<string, { input: number; output: number }> = {
  "anthropic/claude-opus-4.7": { input: 15, output: 75 },
  "anthropic/claude-sonnet-4.6": { input: 3, output: 15 },
  "anthropic/claude-haiku-4.5": { input: 0.8, output: 4 },
  "google/gemini-2.5-flash": { input: 0.075, output: 0.3 },
  "google/gemini-2.5-pro": { input: 1.25, output: 5 },
  "meta-llama/llama-3.3-70b-instruct": { input: 0.13, output: 0.4 },
  "mistralai/mistral-large-2411": { input: 2, output: 6 },
};

function estimateCost(
  model: string,
  tokensIn: number,
  tokensOut: number,
): number {
  // OpenRouter sometimes returns a versioned model name in the response
  // (e.g. "anthropic/claude-4.6-sonnet-20260217"); strip the suffix.
  const normalized = model.replace(/(-\d{8}|-\d{6}|-\d{4})$/, "");
  const p =
    PRICING[normalized] ??
    PRICING[model] ??
    // Fall back to Sonnet pricing if we don't know the model.
    { input: 3, output: 15 };
  const cost =
    (tokensIn / 1_000_000) * p.input + (tokensOut / 1_000_000) * p.output;
  return Number(cost.toFixed(6));
}
