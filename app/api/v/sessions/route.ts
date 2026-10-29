import { requireVOwner } from "@/lib/v-chat/auth";
import {
  listVSessions,
  makeVSessionId,
  ensureVChatTables,
  OPERATOR_USER_ID,
} from "@/lib/v-chat/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET  /api/v/sessions?limit=40  → lista los hilos de chat de V (recientes 1º).
 * POST /api/v/sessions           → devuelve un id de hilo NUEVO (alta perezosa:
 *                                  la fila se crea al guardarse el primer turno).
 */
export async function GET(req: Request) {
  const access = await requireVOwner(req);
  if (access instanceof Response) return access;
  try {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(
    Math.max(parseInt(searchParams.get("limit") ?? "40", 10) || 40, 1),
    100,
  );
  const sessions = await listVSessions(OPERATOR_USER_ID, limit);
  return json({ sessions });
  } catch { return json({ error: "No pude recuperar tus conversaciones. Reintenta." }, 503); }
}

export async function POST(req: Request) {
  const access = await requireVOwner(req);
  if (access instanceof Response) return access;
  try {
    await ensureVChatTables();
    return json({ sessionId: makeVSessionId(), created: true });
  } catch { return json({ error: "No pude abrir una conversación. Reintenta." }, 503); }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
