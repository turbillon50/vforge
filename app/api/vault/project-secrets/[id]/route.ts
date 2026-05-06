import { sql } from "@/lib/db/client";
import {
  requireOperatorAuth,
  authFailureResponse,
} from "@/lib/auth/operator-token";
import { invalidateSecretCache } from "@/lib/vault/get-secret";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DELETE /api/vault/project-secrets/{id}
 *
 * Deletes a project-scoped secret by row id. Audit-logged at ring 3
 * (destructive). Bearer-token protected.
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = requireOperatorAuth(req);
  if (!auth.ok) return authFailureResponse(auth);

  const { id } = await params;

  const rows = (await sql`
    DELETE FROM project_secrets WHERE id = ${id}
    RETURNING id, project_id, name
  `) as Array<{ id: string; project_id: string; name: string }>;

  if (rows.length === 0) {
    return new Response(JSON.stringify({ error: "secret not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  invalidateSecretCache(rows[0].name, rows[0].project_id);

  await sql`
    INSERT INTO audit_events (user_id, action, resource_type, resource_id, ring, payload)
    VALUES (
      ${auth.userId}, 'vault.project.delete', 'project_secret', ${rows[0].id}, 3,
      ${JSON.stringify({ name: rows[0].name, project_id: rows[0].project_id })}::jsonb
    )
  `;

  return new Response(JSON.stringify({ ok: true, deleted: rows[0] }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
