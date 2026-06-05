/**
 * Asistente genérico de VForge para usuarios del workspace.
 *
 * POST — chat con streaming SSE (data: {type:'text',value} / {type:'error',message}
 *        / {type:'done'}). Sin tools. System prompt propio (NO es V).
 * GET  — historial del thread del usuario.
 *
 * Solo requiere sesión Clerk; NO owner-only.
 */
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
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

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const MODEL_CASCADE = [
  "anthropic/claude-3.5-haiku",
  "openai/gpt-4o-mini",
  "google/gemini-flash-1.5",
];
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

  const apiKey = await getOperatorSecret("OPENROUTER_API_KEY");
  if (!apiKey) return json({ error: "OPENROUTER_API_KEY no configurada" }, 500);

  const [scopeRow, thread] = await Promise.all([
    getScope(userId),
    getThread(userId),
  ]);

  const systemPrompt = buildSystemPrompt(scopeRow?.scope ?? null);

  const history: ChatCompletionMessageParam[] = thread.messages
    .slice(-MAX_CONTEXT_TURNS)
    .map((m) => ({ role: m.role, content: m.content }));

  const conversation: ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...history,
    { role: "user", content: userText },
  ];

  const openrouter = new OpenAI({
    apiKey,
    baseURL: OPENROUTER_BASE_URL,
    defaultHeaders: {
      "HTTP-Referer": "https://vforge.site",
      "X-Title": "vForge",
    },
  });

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
        let completion: Awaited<
          ReturnType<typeof openrouter.chat.completions.create>
        > | null = null;
        let lastErr: unknown = null;
        for (const model of MODEL_CASCADE) {
          try {
            completion = await openrouter.chat.completions.create({
              model,
              messages: conversation,
              max_tokens: 1536,
              stream: true,
            });
            break;
          } catch (err) {
            lastErr = err;
            const status = errorStatus(err);
            const recoverable =
              status === 402 || status === 429 || (status !== null && status >= 500);
            if (!recoverable) throw err;
          }
        }
        if (!completion) throw lastErr ?? new Error("Sin modelo disponible");

        for await (const chunk of completion) {
          const delta = chunk.choices?.[0]?.delta;
          if (delta?.content) {
            assistantText += delta.content;
            send({ type: "text", value: delta.content });
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
