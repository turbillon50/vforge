import Anthropic from "@anthropic-ai/sdk";
import { sql } from "@/lib/db/client";
import { getOperatorSecret } from "@/lib/vault/get-secret";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RecapRequest {
  sessionId: string;
  userId?: string;
  projectId?: string | null;
}

const OPERATOR_USER_ID = "operator_luis";
const RECAP_MODEL = "claude-haiku-4-5"; // cheap + fast
const MIN_TURNS_FOR_RECAP = 2; // skip empty/single-turn sessions

/**
 * POST /api/forge/recap
 * Body: { sessionId, projectId? }
 *
 * Reads the conversation for `sessionId`, asks Haiku for a 3-5 bullet
 * recap, and stores it as a tagged knowledge_base entry so future
 * sessions inherit the context. Idempotent: if a recap for this session
 * already exists it gets replaced (sessions are append-only, so the
 * later recap is always at least as informative).
 */
export async function POST(req: Request) {
  let body: RecapRequest;
  try {
    body = (await req.json()) as RecapRequest;
  } catch {
    return jsonError("Invalid JSON body", 400);
  }
  const { sessionId } = body;
  const userId = body.userId ?? OPERATOR_USER_ID;
  if (!sessionId || typeof sessionId !== "string") {
    return jsonError("sessionId (string) required", 400);
  }

  const turns = (await sql`
    SELECT role, content, created_at
    FROM conversations
    WHERE session_id = ${sessionId} AND user_id = ${userId}
    ORDER BY created_at ASC
  `) as Array<{ role: string; content: string; created_at: Date | string }>;

  if (turns.length < MIN_TURNS_FOR_RECAP) {
    return new Response(
      JSON.stringify({ ok: false, reason: "session too short to recap" }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  const apiKey = await getOperatorSecret("ANTHROPIC_API_KEY", {
    auditUserId: userId,
  });
  if (!apiKey) return jsonError("ANTHROPIC_API_KEY not configured", 500);

  const transcript = turns
    .map((t) => `${t.role === "user" ? "Luis" : "V"}: ${t.content}`)
    .join("\n\n");

  const prompt = `Eres V, asistente digital de Luis. Acaba de cerrarse una sesión de conversación. Genera un RECAP estructurado de la sesión que se guardará en tu memoria persistente para que futuras sesiones tengan contexto.

Estructura del recap (markdown, sin encabezados de nivel 1):

**Tema principal**
1 oración que resume de qué fue la sesión.

**Decisiones / acuerdos**
- Bullet con cada decisión concreta tomada
- (omite esta sección si no hubo decisiones)

**Acciones pendientes**
- Lo que quedó por hacer, con responsable si aplica
- (omite si no hay)

**Aprendizajes / cosas a recordar**
- Información que vale la pena retener para futuras conversaciones
- Preferencias del operador, datos sobre proyectos, etc.

Reglas:
- Máximo 250 palabras total.
- Sé concreto, sin paja, sin "discutimos" ni meta-comentario.
- Si la sesión fue trivial o sin sustancia, devuelve solo: "Sesión sin contenido relevante para retener."
- Idioma: español MX, mismo tono que Luis usa contigo.

Transcript:

${transcript}`;

  const anthropic = new Anthropic({ apiKey });
  let recapText: string;
  try {
    const response = await anthropic.messages.create({
      model: RECAP_MODEL,
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    });
    const block = response.content.find((b) => b.type === "text");
    recapText = block && block.type === "text" ? block.text.trim() : "";
  } catch (err) {
    return jsonError(
      `recap generation failed: ${err instanceof Error ? err.message : String(err)}`,
      502,
    );
  }

  if (
    !recapText ||
    /^sesi[oó]n sin contenido/i.test(recapText.split("\n")[0] ?? "")
  ) {
    return new Response(
      JSON.stringify({ ok: false, reason: "session not relevant" }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  const firstTurn = turns[0];
  const lastTurn = turns[turns.length - 1];
  const dateLabel = formatDateLabel(firstTurn.created_at);
  const title = `Sesión ${dateLabel} (${turns.length} turnos)`;
  const tags = ["session_recap", sessionId];
  if (body.projectId) tags.push(`project:${body.projectId}`);

  // Replace any earlier recap for this same session
  await sql`
    DELETE FROM knowledge_base
    WHERE kind = 'note' AND ${sessionId} = ANY(tags)
  `;

  const inserted = (await sql`
    INSERT INTO knowledge_base (kind, title, content, tags, source, created_by)
    VALUES (
      'note', ${title}, ${recapText},
      ${tags as unknown as string[]}, ${`session:${sessionId}`}, ${userId}
    )
    RETURNING id, created_at
  `) as Array<{ id: string; created_at: Date | string }>;

  await sql`
    INSERT INTO audit_events (user_id, action, resource_type, resource_id, ring, payload)
    VALUES (
      ${userId}, 'forge.recap', 'session', ${sessionId}, 0,
      ${JSON.stringify({
        turns: turns.length,
        first_turn: firstTurn.created_at,
        last_turn: lastTurn.created_at,
        recap_id: inserted[0]?.id,
      })}::jsonb
    )
  `;

  return new Response(
    JSON.stringify({
      ok: true,
      recap: recapText,
      title,
      id: inserted[0]?.id,
      tags,
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    },
  );
}

function formatDateLabel(input: Date | string): string {
  const d = typeof input === "string" ? new Date(input) : input;
  return d.toISOString().slice(0, 10);
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
