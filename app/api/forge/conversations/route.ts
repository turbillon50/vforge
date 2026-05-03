import { queryAll } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Turn {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  created_at: string;
  tokens_in: number | null;
  tokens_out: number | null;
}

const OPERATOR_USER_ID = "operator_luis";

/**
 * GET /api/forge/conversations?sessionId=...&limit=50
 *
 * Returns the most-recent N turns of a conversation session, in
 * chronological order, so the /forge UI can rehydrate the chat after
 * a reload, navigation away, or new device.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");
  const userId = searchParams.get("userId") ?? OPERATOR_USER_ID;
  const limitParam = searchParams.get("limit") ?? "100";
  const limit = Math.min(Math.max(parseInt(limitParam, 10) || 100, 1), 200);

  if (!sessionId) {
    return jsonError("sessionId required", 400);
  }

  // Take the most recent N turns (DESC + LIMIT in subquery), then re-sort
  // ascending for chronological replay. ASC + LIMIT would return the
  // earliest turns, dropping recent context once a session exceeds the cap.
  const rows = await queryAll<Turn>(
    `SELECT id::text, role, content, created_at, tokens_in, tokens_out
       FROM (
         SELECT id, role, content, created_at, tokens_in, tokens_out
           FROM conversations
           WHERE user_id = $1 AND session_id = $2
           ORDER BY created_at DESC
           LIMIT $3
       ) AS recent
       ORDER BY created_at ASC`,
    [userId, sessionId, limit],
  );

  return new Response(JSON.stringify({ turns: rows }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
