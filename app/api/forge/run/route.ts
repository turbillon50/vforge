import { GoogleGenAI } from "@google/genai";
import { sql } from "@/lib/db/client";
import { buildSystemPrompt } from "@/lib/forge/system-prompt";
import { TOOLS, executeTool } from "@/lib/forge/tools";
import { getOperatorSecret } from "@/lib/vault/get-secret";
import {
  type ChatTurn,
  type StructuredBlock,
  turnsToContents,
  pushAssistantToolCalls,
  pushToolResults,
  streamRound,
} from "@/lib/forge/gemini-adapter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  const apiKey = await getOperatorSecret("GEMINI_API_KEY", {
    auditUserId: userId,
  });
  if (!apiKey) {
    return jsonError("GEMINI_API_KEY not configured (vault or env)", 500);
  }

  const { systemPrompt, config } = await buildSystemPrompt({
    projectId: body.projectId ?? null,
  });
  const lastUserTurn = messages[messages.length - 1];

  if (lastUserTurn.role === "user") {
    const textOnly = stringifyUserTurn(lastUserTurn.content);
    await sql`
      INSERT INTO conversations (user_id, session_id, role, content)
      VALUES (${userId}, ${sessionId}, 'user', ${textOnly})
    `;
  }

  const ai = new GoogleGenAI({ apiKey });

  // Working copy in Gemini Content[] shape.
  const contents = turnsToContents(messages);

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
      let lastFinishReason: string | null = null;

      try {
        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
          const result = await streamRound({
            ai,
            model: config.default_model,
            systemInstruction: systemPrompt,
            contents,
            tools: TOOLS,
            send,
          });

          totalTokensIn += result.tokensIn;
          totalTokensOut += result.tokensOut;
          lastFinishReason = result.finishReason;
          assistantTextBuffer += result.text;

          if (result.toolCalls.length === 0) {
            // Gemini terminó sin pedir tools.
            break;
          }

          // Append assistant turn (text + functionCalls) al historial.
          pushAssistantToolCalls(contents, result.text, result.toolCalls);

          // Ejecutar cada tool en paralelo.
          const toolResults = await Promise.all(
            result.toolCalls.map(async (tc) => {
              const r = await executeTool(tc.name, tc.args, {
                userId,
                sessionId,
              });
              send({
                type: "tool_use_result",
                id: tc.id,
                ok: r.ok,
                summary: r.summary,
              });
              return {
                id: tc.id,
                name: tc.name,
                content: typeof r.content === "string"
                  ? r.content
                  : JSON.stringify(r.content),
                is_error: !r.ok,
              };
            }),
          );

          pushToolResults(contents, toolResults);
        }

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
              finish_reason: lastFinishReason,
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

// Pricing por 1M tokens (USD), aproximado al 2026-05.
// Gemini 2.5 Flash y Pro son los más probables para vForge.
// Si Luis quiere precio cero, usar gemini-2.5-flash que tiene tier gratuito amplio.
const PRICING: Record<string, { input: number; output: number }> = {
  "gemini-2.5-pro": { input: 1.25, output: 10 },
  "gemini-2.5-flash": { input: 0.3, output: 2.5 },
  "gemini-2.5-flash-lite": { input: 0.1, output: 0.4 },
  "gemini-2.0-flash": { input: 0.1, output: 0.4 },
};

function estimateCost(model: string, tokIn: number, tokOut: number): number {
  const p = PRICING[model];
  if (!p) return 0;
  return (tokIn * p.input + tokOut * p.output) / 1_000_000;
}
