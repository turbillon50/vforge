import { auth } from "@clerk/nextjs/server";
import { queryAll } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OPERATOR_USER_ID = "operator_luis";

interface SessionRow {
  session_id: string;
  title: string | null;
  last_at: string;
  count: number;
}

/**
 * GET /api/forge/sessions?limit=30
 *
 * Lista las sesiones de chat del usuario (multi-chat). El título se
 * deriva de las primeras palabras del primer mensaje 'user' de cada
 * sesión. Usa la tabla `conversations` existente — sin ALTER.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(
    Math.max(parseInt(searchParams.get("limit") ?? "30", 10) || 30, 1),
    100,
  );

  let userId = OPERATOR_USER_ID;
  try {
    const a = await auth();
    if (a?.userId) userId = a.userId;
  } catch {
    // sin Clerk → operador
  }

  const rows = await queryAll<SessionRow>(
    `SELECT s.session_id,
            s.last_at,
            s.count,
            (
              SELECT LEFT(c2.content, 80)
                FROM conversations c2
               WHERE c2.user_id = $1
                 AND c2.session_id = s.session_id
                 AND c2.role = 'user'
               ORDER BY c2.created_at ASC
               LIMIT 1
            ) AS title
       FROM (
         SELECT session_id,
                MAX(created_at) AS last_at,
                COUNT(*)::int   AS count
           FROM conversations
          WHERE user_id = $1
          GROUP BY session_id
       ) AS s
       ORDER BY s.last_at DESC
       LIMIT $2`,
    [userId, limit],
  );

  const sessions = rows.map((r) => ({
    session_id: r.session_id,
    title: (r.title ?? "").trim() || "Sin título",
    last_at: r.last_at,
    count: r.count,
  }));

  return new Response(JSON.stringify({ sessions, userId }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}
