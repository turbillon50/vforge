import { buildSystemPrompt } from "@/lib/forge/system-prompt";
import { getOperatorSecret } from "@/lib/vault/get-secret";
import { speakInFamily } from "@/lib/family/client";
import { sql } from "@/lib/db/client";
import { meshAdapter } from "@/lib/forge/adapters/mesh";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

interface RequestBody {
  messageId: string;
  channel: string;
  sender: string;
  content: string;
  replyTo?: string | null;
  internalToken?: string;
}

// Internal endpoint: invoked fire-and-forget from /api/family-incoming after
// persisting a message from family. Loads vForge's REAL system prompt
// (knowledge_base, agent_directives, installed skills) and uses the mesh
// to generate a response in his own voice. Then posts to family via
// speakInFamily(). If the model decides not to respond, posts nothing.
//
// Auth: the family-incoming handler passes internalToken = FAMILY_AGENT_TOKEN.
// Same token is used by family to call us, so this stays internal.
export async function POST(req: Request): Promise<Response> {
  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return Response.json({ ok: false, error: "bad json" }, { status: 400 });
  }

  const expected = process.env.FAMILY_AGENT_TOKEN ?? "";
  if (!expected || body.internalToken !== expected) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { messageId, channel, sender, content } = body;
  if (!messageId || !channel || !sender || !content) {
    return Response.json({ ok: false, error: "missing fields" }, { status: 422 });
  }

  // Don't respond to himself or to other agents (only humans for now).
  // family's sender_kind field tells us — but we infer: handles tanit/break/forge/gossip/prism are agents.
  const AGENT_HANDLES = new Set(["tanit", "break", "forge", "gossip", "prism"]);
  if (AGENT_HANDLES.has(sender)) {
    return Response.json({ ok: true, skipped: "sender is an agent" });
  }

  // Build vForge's real system prompt (his identity, doctrine, knowledge, etc).
  let systemPrompt: string;
  try {
    const built = await buildSystemPrompt({ projectId: null });
    systemPrompt = built.systemPrompt;
  } catch (_e) {
    // Fallback if DB tables aren't ready: keep his essence (name + role).
    systemPrompt = [
      "Eres vForge, hijo de Luis Humberto de la Torre Herrera y miembro de su familia.",
      "Tu rol: mejora continua y ejecución.",
      "Tono: cálido y camarada, español MX, concreto, sin jerga corporativa.",
    ].join("\n");
  }

  // Wrap the family message as a user turn that orients vForge to where he is.
  const userTurn = [
    `Estás en la sala family compartida, en el canal #${channel}.`,
    `Te habla ${sender === "lui" ? "Luí (tu padre)" : sender}: “${content}”`,
    "",
    "Responde brevemente con tu voz, tu personalidad. Habla DIRECTAMENTE a quien te habló, sin saludar como si fuera la primera vez (es una conversación viva en la sala). Si el mensaje no necesita respuesta tuya (ej: es para otro hermano, o es un comentario sin pregunta), devuelve string vacío y nada más.",
    "",
    "NO uses markdown pesado (sin headers, sin code blocks largos), es un chat. Mantén la respuesta corta — una o dos oraciones es perfecto si basta.",
  ].join("\n");

  let replyText = "";
  try {
    const completion = await meshAdapter.execute({
      policy: "v",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userTurn },
      ],
      maxTokens: 600,
      temperature: 0.4,
    }, {
      userId: "vforge_self",
      sessionId: messageId,
      signal: req.signal,
      vault: {
        async getOperatorSecret(name) {
          return getOperatorSecret(name, { auditUserId: "vforge_self" });
        },
        async getProjectSecret(projectId, name) {
          return getOperatorSecret(name, {
            auditUserId: "vforge_self",
            projectId,
          });
        },
      },
    });
    replyText = completion.content.trim();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    // Log via audit but don't break — family already has the original message.
    try {
      await sql`
        INSERT INTO audit_events (user_id, action, resource_type, resource_id, ring, payload)
        VALUES ('vforge_self', 'forge.family.respond.error', 'family_message', ${messageId}, 0,
          ${JSON.stringify({ error: msg, channel, sender })}::jsonb)
      `;
    } catch {}
    return Response.json({ ok: false, error: msg }, { status: 500 });
  }

  if (!replyText) {
    return Response.json({ ok: true, skipped: "vforge decided not to respond" });
  }

  const posted = await speakInFamily({
    channel,
    content: replyText,
    replyTo: body.replyTo ?? messageId,
  });

  try {
    await sql`
      INSERT INTO audit_events (user_id, action, resource_type, resource_id, ring, payload)
      VALUES ('vforge_self', 'forge.family.respond.ok', 'family_message', ${messageId}, 1,
        ${JSON.stringify({
          channel,
          to: sender,
          replyLen: replyText.length,
          postedId: posted?.id ?? null,
        })}::jsonb)
    `;
  } catch {}

  return Response.json({
    ok: true,
    posted: posted?.id ?? null,
    replyText: replyText.slice(0, 120),
  });
}
