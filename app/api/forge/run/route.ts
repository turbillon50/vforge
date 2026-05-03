import Anthropic from "@anthropic-ai/sdk";
import type {
  MessageParam,
  ToolResultBlockParam,
} from "@anthropic-ai/sdk/resources/messages";
import { sql } from "@/lib/db/client";
import { buildSystemPrompt } from "@/lib/forge/system-prompt";
import { TOOLS, executeTool } from "@/lib/forge/tools";
import { getOperatorSecret } from "@/lib/vault/get-secret";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

interface RunRequest {
  messages: ChatTurn[];
  sessionId: string;
  userId?: string; // defaults to operator_luis until Clerk lands
  projectId?: string | null;
}

const OPERATOR_USER_ID = "operator_luis";
const MAX_TOOL_ROUNDS = 5;

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

  const apiKey = await getOperatorSecret("ANTHROPIC_API_KEY", {
    auditUserId: userId,
  });
  if (!apiKey) {
    return jsonError("ANTHROPIC_API_KEY not configured (vault or env)", 500);
  }

  const { systemPrompt, config } = await buildSystemPrompt({
    projectId: body.projectId ?? null,
  });
  const lastUserTurn = messages[messages.length - 1];

  if (lastUserTurn.role === "user") {
    await sql`
      INSERT INTO conversations (user_id, session_id, role, content)
      VALUES (${userId}, ${sessionId}, 'user', ${lastUserTurn.content})
    `;
  }

  const anthropic = new Anthropic({ apiKey });

  // Working copy of the conversation that grows with assistant turns
  // and tool_result user turns across rounds.
  const conversationMessages: MessageParam[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const encoder = new TextEncoder();

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
          const response = anthropic.messages.stream({
            model: config.default_model,
            max_tokens: 2048,
            system: systemPrompt,
            tools: TOOLS,
            messages: conversationMessages,
          });

          let roundTokensIn = 0;
          let roundTokensOut = 0;

          for await (const event of response) {
            if (event.type === "message_start") {
              roundTokensIn = event.message.usage?.input_tokens ?? 0;
            } else if (event.type === "content_block_start") {
              const block = event.content_block;
              if (block.type === "tool_use") {
                send({
                  type: "tool_use_start",
                  id: block.id,
                  name: block.name,
                });
              }
            } else if (event.type === "content_block_delta") {
              const delta = event.delta;
              if (delta.type === "text_delta") {
                assistantTextBuffer += delta.text;
                send({ type: "text", value: delta.text });
              }
            } else if (event.type === "message_delta") {
              roundTokensOut =
                event.usage?.output_tokens ?? roundTokensOut;
            }
          }

          const finalMessage = await response.finalMessage();
          totalTokensIn += roundTokensIn;
          totalTokensOut += roundTokensOut;
          lastStopReason = finalMessage.stop_reason;

          // Append the assistant turn (with all its blocks) so the next
          // round sees the tool_use blocks alongside the tool_results.
          conversationMessages.push({
            role: "assistant",
            content: finalMessage.content,
          });

          if (finalMessage.stop_reason !== "tool_use") {
            break;
          }

          // Execute every tool_use block in parallel and collect results.
          const toolBlocks = finalMessage.content.filter(
            (b): b is Extract<typeof b, { type: "tool_use" }> =>
              b.type === "tool_use",
          );
          const toolResults: ToolResultBlockParam[] = await Promise.all(
            toolBlocks.map(async (block) => {
              const result = await executeTool(
                block.name,
                (block.input ?? {}) as Record<string, unknown>,
                { userId, sessionId },
              );
              send({
                type: "tool_use_result",
                id: block.id,
                ok: result.ok,
                summary: result.summary,
              });
              return {
                type: "tool_result",
                tool_use_id: block.id,
                content: result.content,
                is_error: !result.ok,
              };
            }),
          );

          conversationMessages.push({
            role: "user",
            content: toolResults,
          });
        }

        // Persist the final assistant text (tool intermediate steps are
        // not replayed on rehydrate; only the visible answer is stored).
        await sql`
          INSERT INTO conversations (
            user_id, session_id, role, content, model,
            tokens_in, tokens_out, cost_usd
          )
          VALUES (
            ${userId}, ${sessionId}, 'assistant', ${assistantTextBuffer},
            ${config.default_model},
            ${totalTokensIn}, ${totalTokensOut},
            ${estimateCost(config.default_model, totalTokensIn, totalTokensOut)}
          )
        `;

        await sql`
          INSERT INTO audit_events (user_id, action, resource_type, resource_id, ring, payload)
          VALUES (
            ${userId}, 'forge.chat.turn', 'conversation', ${sessionId}, 0,
            ${JSON.stringify({
              tokens_in: totalTokensIn,
              tokens_out: totalTokensOut,
              model: config.default_model,
              stop_reason: lastStopReason,
            })}::jsonb
          )
        `;

        send({
          type: "done",
          tokensIn: totalTokensIn,
          tokensOut: totalTokensOut,
          model: config.default_model,
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

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const PRICING: Record<string, { input: number; output: number }> = {
  "claude-opus-4-7": { input: 15, output: 75 },
  "claude-sonnet-4-6": { input: 3, output: 15 },
  "claude-haiku-4-5": { input: 0.8, output: 4 },
};

function estimateCost(
  model: string,
  tokensIn: number,
  tokensOut: number,
): number {
  const p = PRICING[model] ?? { input: 3, output: 15 };
  const cost =
    (tokensIn / 1_000_000) * p.input + (tokensOut / 1_000_000) * p.output;
  return Number(cost.toFixed(6));
}
