import { queryAll } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface AuditEvent {
  id: string;
  user_id: string;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  ring: number | null;
  payload: unknown;
  created_at: string;
}

const OPERATOR_USER_ID = "operator_luis";

/**
 * GET /api/forge/activity?limit=50&userId=operator_luis
 *
 * Returns the most-recent audit events (V actions, project mutations,
 * vault rotations, deploys, etc.) for the operator's feed.
 *
 * Used by the /app/activity page to render a live timeline.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId") ?? OPERATOR_USER_ID;
  const limitParam = searchParams.get("limit") ?? "50";
  const limit = Math.min(Math.max(parseInt(limitParam, 10) || 50, 1), 200);

  try {
    const rows = await queryAll<AuditEvent>(
      `SELECT id::text, user_id, action, resource_type, resource_id, ring,
              payload, created_at
         FROM audit_events
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
      [userId, limit],
    );
    return new Response(JSON.stringify({ events: rows }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: `db error: ${message}`, events: [] }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
