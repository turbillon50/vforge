import { sql } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET  /api/forge/active-session?scope=general|<projectId>
 * POST /api/forge/active-session  body: { scope }
 *
 * Returns (and on POST, creates) the "active" session id for the
 * operator + scope. Rationale: cross-device persistence. Phone and
 * computer should share the same conversation as long as Luis hasn't
 * pressed "Nueva". Today the sessionId lived only in localStorage,
 * so each device started fresh. Now we resolve via the server.
 *
 * Convention: a session id that ENCODES its scope as a prefix
 * (s_<scope>_<rand>) lets us filter conversations by a LIKE pattern
 * without needing a new column. New sessions follow this convention;
 * legacy random ids are still readable.
 */
const OPERATOR_USER_ID = "operator_luis";
const SCOPE_PATTERN = /^[a-z0-9_-]{1,60}$/i;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawScope = searchParams.get("scope") ?? "general";
  const scope = normalizeScope(rawScope);
  if (!scope) return jsonError("invalid scope", 400);

  const userId = OPERATOR_USER_ID;

  // Find the most recent session in this scope. We accept either the
  // new prefix convention OR a legacy random id when scope=general.
  const prefix = `s_${scope}_%`;
  const rows = (await sql`
    SELECT session_id, MAX(created_at) AS last_at
      FROM conversations
     WHERE user_id = ${userId}
       AND session_id LIKE ${prefix}
     GROUP BY session_id
     ORDER BY last_at DESC
     LIMIT 1
  `) as Array<{ session_id: string; last_at: string }>;

  if (rows.length > 0) {
    return new Response(
      JSON.stringify({
        scope,
        sessionId: rows[0].session_id,
        last_at: rows[0].last_at,
        created: false,
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

  const sessionId = makeSessionId(scope);
  return new Response(
    JSON.stringify({ scope, sessionId, created: true }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    },
  );
}

/**
 * POST resets the active session: returns a brand-new session id and
 * triggers the recap on the previous one (best-effort, non-blocking).
 */
export async function POST(req: Request) {
  let body: { scope?: string };
  try {
    body = (await req.json()) as { scope?: string };
  } catch {
    return jsonError("invalid JSON", 400);
  }
  const scope = normalizeScope(body.scope ?? "general");
  if (!scope) return jsonError("invalid scope", 400);

  const sessionId = makeSessionId(scope);
  return new Response(
    JSON.stringify({ scope, sessionId, created: true }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

function normalizeScope(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  if (!SCOPE_PATTERN.test(s)) return null;
  return s.toLowerCase();
}

function makeSessionId(scope: string): string {
  const rand =
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  return `s_${scope}_${rand}`;
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
