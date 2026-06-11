import { getVMessages, OPERATOR_USER_ID } from "@/lib/v-chat/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/v/messages?sessionId=...&limit=200
 * Historial cronológico de un hilo de V para rehidratar el chat tras recargar.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");
  if (!sessionId) {
    return new Response(JSON.stringify({ error: "sessionId required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  const limit = Math.min(
    Math.max(parseInt(searchParams.get("limit") ?? "200", 10) || 200, 1),
    400,
  );
  const messages = await getVMessages(sessionId, OPERATOR_USER_ID, limit);
  return new Response(JSON.stringify({ messages }), {
    status: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
