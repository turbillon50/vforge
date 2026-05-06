import { sql } from "@/lib/db/client";
import { decryptOperatorSecret } from "@/lib/vault/operator-crypto";
import {
  requireOperatorAuth,
  authFailureResponse,
} from "@/lib/auth/operator-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/vault/project-secrets/{id}/value
 *
 * Decrypts and returns the plaintext for a single project secret.
 * Bearer-token protected; audit-logged at ring 1.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireOperatorAuth(req);
  if (!auth.ok) return authFailureResponse(auth);

  const { id } = await params;

  const rows = (await sql`
    SELECT id, project_id, name, ciphertext, iv, auth_tag
      FROM project_secrets
     WHERE id = ${id}
  `) as Array<{
    id: string;
    project_id: string;
    name: string;
    ciphertext: Buffer;
    iv: Buffer;
    auth_tag: Buffer;
  }>;

  if (rows.length === 0) {
    return new Response(JSON.stringify({ error: "secret not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
  const row = rows[0];

  let plaintext: string;
  try {
    plaintext = decryptOperatorSecret({
      ciphertext: Buffer.from(row.ciphertext),
      iv: Buffer.from(row.iv),
      authTag: Buffer.from(row.auth_tag),
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: `decrypt failed: ${err instanceof Error ? err.message : String(err)}`,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  await Promise.all([
    sql`UPDATE project_secrets SET last_used_at = now(), last_used_by = ${auth.userId} WHERE id = ${row.id}`,
    sql`
      INSERT INTO audit_events (user_id, action, resource_type, resource_id, ring, payload)
      VALUES (
        ${auth.userId}, 'vault.project.read', 'project_secret', ${row.id}, 1,
        ${JSON.stringify({ name: row.name, project_id: row.project_id, scope: "project", via: "ui" })}::jsonb
      )
    `,
  ]);

  return new Response(
    JSON.stringify({
      id: row.id,
      project_id: row.project_id,
      name: row.name,
      value: plaintext,
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
