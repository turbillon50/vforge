import { sql, queryOne } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OPERATOR_USER_ID = "operator_luis";

/**
 * DELETE /api/vault/operator-secrets/{id}
 *
 * Removes an operator secret. Anillo 3 — destructive, irreversible.
 * In future iterations should require 2FA challenge first.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const existing = await queryOne<{ id: string; name: string }>(
    `SELECT id::text, name FROM operator_secrets WHERE id = $1`,
    [id],
  );
  if (!existing) {
    return new Response(JSON.stringify({ error: "secret not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  await sql`DELETE FROM operator_secrets WHERE id = ${id}`;
  await sql`
    INSERT INTO audit_events (user_id, action, resource_type, resource_id, ring, payload)
    VALUES (
      ${OPERATOR_USER_ID}, 'vault.operator.delete', 'operator_secret', ${id}, 3,
      ${JSON.stringify({ name: existing.name })}::jsonb
    )
  `;

  return new Response(JSON.stringify({ deleted: existing }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
