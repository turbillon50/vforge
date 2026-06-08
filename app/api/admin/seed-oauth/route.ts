import {
  requireOperatorAuth,
  authFailureResponse,
} from "@/lib/auth/operator-token";
import { ensureOauthTables } from "@/lib/mcp/oauth";
import { sql } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/seed-oauth — owner (operator token).
 *
 * Registra el cliente OAuth de Claude.ai SIN depender de la cadena de
 * migraciones. Idempotente.
 *
 *   client_id    : claude-ai
 *   redirect_uris: claude.ai/api/mcp/auth_callback + claude.ai/oauth/callback
 *   auth method  : none (PKCE public client — Claude Desktop)
 */

// sha256 del client_secret. Mismo valor que migración 014.
const CLAUDE_SECRET_HASH =
  "eb5945f920aab77212cd8d12d4284fb4c9520f869199ae36dfbfe234419725aa";

export async function POST(req: Request) {
  const auth = requireOperatorAuth(req);
  if (!auth.ok) return authFailureResponse(auth);

  try {
    await ensureOauthTables();
    const rows = (await sql`
      INSERT INTO oauth_clients
        (client_id, client_secret_hash, client_name, redirect_uris,
         grant_types, response_types, token_endpoint_auth_method, scope)
      VALUES (
        'claude-ai', ${CLAUDE_SECRET_HASH}, 'Claude.ai',
        '["https://claude.ai/api/mcp/auth_callback","https://claude.ai/oauth/callback"]'::jsonb,
        '["authorization_code","refresh_token"]'::jsonb,
        '["code"]'::jsonb,
        'none', null
      )
      ON CONFLICT (client_id) DO UPDATE SET
        client_name = EXCLUDED.client_name,
        redirect_uris = EXCLUDED.redirect_uris,
        token_endpoint_auth_method = EXCLUDED.token_endpoint_auth_method,
        grant_types = EXCLUDED.grant_types,
        client_secret_hash = COALESCE(
          oauth_clients.client_secret_hash, EXCLUDED.client_secret_hash
        )
      RETURNING client_id, client_name, redirect_uris, token_endpoint_auth_method
    `) as Array<Record<string, unknown>>;

    return Response.json(
      { ok: true, seeded: true, client: rows[0] ?? null },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
