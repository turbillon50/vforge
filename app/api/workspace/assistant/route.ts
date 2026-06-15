/**
 * Asistente genérico de VForge para usuarios del workspace.
 *
 * POST — chat con streaming SSE (data: {type:'text',value} / {type:'error',message}
 *        / {type:'done'}). Sin tools. System prompt propio (NO es V).
 * GET  — historial del thread del usuario.
 *
 * Solo requiere sesión Clerk; NO owner-only.
 */
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@clerk/nextjs/server";
import { getOperatorSecret } from "@/lib/vault/get-secret";
import {
  appendMessages,
  getScope,
  getThread,
  type ThreadMessage,
} from "@/lib/workspace/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = "claude-sonnet-4-6";
const MAX_CONTEXT_TURNS = 24;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return json({ error: "unauthorized" }, 401);
  try {
    const thread = await getThread(userId);
    return json({ messages: thread.messages });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "error" }, 500);
  }
}

function buildSystemPrompt(scope: Record<string, unknown> | null): string {
  return [
    "Eres el asistente de producto de VForge, una fábrica de aplicaciones.",
    "Hablas siempre en español, con tono profesional y cálido. Respuestas claras y concisas, en Markdown cuando ayude.",
    "",
    "El método VForge tiene tres etapas:",
    "1. Scope — el usuario define el alcance de su app con el wizard (tipo, público, funciones, integraciones, nombre).",
    "2. Blueprint — VForge genera un plano visual del sistema en su workspace.",
    "3. Construcción automatizada — llega pronto; por ahora el workspace está en preparación.",
    "",
    "Tu trabajo: ayudar al usuario a afinar su alcance, explicar el método VForge, sugerir funciones e integraciones razonables, y responder dudas sobre su proyecto.",
    "Si te preguntan por fechas de la construcción automatizada, di que llega pronto y que su alcance ya queda listo para cuando arranque.",
    "Nunca digas ser V ni hagas referencia a una IA privada. Eres el asistente genérico de VForge.",
    "No inventes capacidades: hoy no puedes construir, desplegar ni modificar código.",
    "",
    "Alcance actual del proyecto del usuario (JSON):",
    scope ? JSON.stringify(scope, null, 2) : "(aún no ha definido su alcance — invítalo amablemente a completar el wizard)",
  ].join("\n");
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return json({ error: "unauthorized" }, 401);

  let body: { message?: string };
  try {
    body = (await req.json()) as { message?: string };
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }
  const userText = (body.message ?? "").trim();
  if (!userText) return json({ error: "message (string) requerido" }, 400);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return json({ error: "ANTHROPIC_API_KEY no configurada" }, 500);

  const [scopeRow, thread] = await Promise.all([
    getScope(userId),
    getThread(userId),
  ]);

  const systemPrompt = buildSystemPrompt(scopeRow?.scope ?? null);

  const history = thread.messages
    .slice(-MAX_CONTEXT_TURNS)
    .map((m) => ({ role: m.role, content: m.content }));

  const conversation = [
    { role: "system", content: systemPrompt },
    ...history,
    { role: "user", content: userText },
  ];

  const anthropic = new Anthropic({ apiKey });

  const encoder = new TextEncoder();
  const userMsg: ThreadMessage = {
    role: "user",
    content: userText,
    at: new Date().toISOString(),
  };

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      let assistantText = "";
      try {
        const stream = await anthropic.messages.stream({
          model: MODEL,
          max_tokens: 1536,
          system: systemPrompt,
          messages: history.filter((m): m is {role: "user"|"assistant", content: string} => m.role === "user" || m.role === "assistant").concat([
            { role: "user", content: userText }
          ]),
        });

        for await (const chunk of stream) {
          if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
            assistantText += chunk.delta.text;
            send({ type: "text", value: chunk.delta.text });
          }
        }

        await appendMessages(userId, [
          userMsg,
          {
            role: "assistant",
            content: assistantText,
            at: new Date().toISOString(),
          },
        ]);

        send({ type: "done" });
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
