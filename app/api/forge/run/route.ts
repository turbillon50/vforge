import Anthropic from "@anthropic-ai/sdk";
import { sql } from "@/lib/db/client";
import { buildSystemPrompt } from "@/lib/forge/system-prompt";

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
}

const OPERATOR_USER_ID = "operator_luis";

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

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return jsonError("ANTHROPIC_API_KEY not configured", 500);
  }

  const { systemPrompt, config } = await buildSystemPrompt();
  const lastUserTurn = messages[messages.length - 1];

  // Persist the user turn first
  if (lastUserTurn.role === "user") {
    await sql`
      INSERT INTO conversations (user_id, session_id, role, content)
      VALUES (${userId}, ${sessionId}, 'user', ${lastUserTurn.content})
    `;
  }

  const anthropic = new Anthropic({ apiKey });

  // Convert chat history into Anthropic message shape
  const anthropicMessages = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const encoder = new TextEncoder();
  let assistantBuffer = "";
  let usageTokensIn = 0;
  let usageTokensOut = 0;

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await anthropic.messages.stream({
          model: config.default_model,
          max_tokens: 2048,
          system: systemPrompt,
          messages: anthropicMessages,
        });

        for await (const event of response) {
          if (event.type === "content_block_delta") {
            const delta = event.delta;
            if (delta.type === "text_delta") {
              assistantBuffer += delta.text;
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "text", value: delta.text })}\n\n`,
                ),
              );
            }
          } else if (event.type === "message_start") {
            usageTokensIn = event.message.usage?.input_tokens ?? 0;
          } else if (event.type === "message_delta") {
            usageTokensOut = event.usage?.output_tokens ?? usageTokensOut;
          } else if (event.type === "message_stop") {
            // Persist the assistant turn
            await sql`
              INSERT INTO conversations (
                user_id, session_id, role, content, model,
                tokens_in, tokens_out, cost_usd
              )
              VALUES (
                ${userId}, ${sessionId}, 'assistant', ${assistantBuffer},
                ${config.default_model},
                ${usageTokensIn}, ${usageTokensOut},
                ${estimateCost(config.default_model, usageTokensIn, usageTokensOut)}
              )
            `;

            // Audit event
            await sql`
              INSERT INTO audit_events (user_id, action, resource_type, resource_id, ring, payload)
              VALUES (
                ${userId}, 'forge.chat.turn', 'conversation', ${sessionId}, 0,
                ${JSON.stringify({ tokens_in: usageTokensIn, tokens_out: usageTokensOut, model: config.default_model })}::jsonb
              )
            `;

            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "done",
                  tokensIn: usageTokensIn,
                  tokensOut: usageTokensOut,
                  model: config.default_model,
                })}\n\n`,
              ),
            );
            controller.close();
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", message })}\n\n`,
          ),
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
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

// Pricing as of April 2026 (USD per 1M tokens). Approximate.
const PRICING: Record<string, { input: number; output: number }> = {
  "claude-opus-4-7": { input: 15, output: 75 },
  "claude-sonnet-4-6": { input: 3, output: 15 },
  "claude-haiku-4-5": { input: 0.8, output: 4 },
};

function estimateCost(model: string, tokensIn: number, tokensOut: number): number {
  const p = PRICING[model] ?? { input: 3, output: 15 };
  const cost = (tokensIn / 1_000_000) * p.input + (tokensOut / 1_000_000) * p.output;
  return Number(cost.toFixed(6));
}
