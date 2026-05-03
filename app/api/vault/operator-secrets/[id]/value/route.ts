import { sql, queryOne } from "@/lib/db/client";
import { decryptOperatorSecret } from "@/lib/vault/operator-crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OPERATOR_USER_ID = "operator_luis";

interface SecretRow {
  id: string;
  name: string;
  ciphertext: Buffer;
  iv: Buffer;
  auth_tag: Buffer;
}

/**
 * GET /api/vault/operator-secrets/{id}/value
 *
 * Decrypts and returns the plaintext value of an operator secret.
 * Used by the /vault UI when the operator clicks "Ver" or "Copiar".
 *
 * Anillo 2 — sensitive read. Updates last_used_at + audit log.
 * In future iterations should require recent re-auth (e.g. password
 * confirmation modal) before returning the plaintext.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const row = await queryOne<SecretRow>(
    `SELECT id::text, name, ciphertext, iv, auth_tag
       FROM operator_secrets WHERE id = $1`,
    [id],
  );
  if (!row) {
    return new Response(JSON.stringify({ error: "secret not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

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

  // Update last_used_at + audit
  await sql`UPDATE operator_secrets SET last_used_at = now() WHERE id = ${id}`;
  await sql`
    INSERT INTO audit_events (user_id, action, resource_type, resource_id, ring, payload)
    VALUES (
      ${OPERATOR_USER_ID}, 'vault.operator.reveal', 'operator_secret', ${id}, 2,
      ${JSON.stringify({ name: row.name, source: "ui" })}::jsonb
    )
  `;

  return new Response(JSON.stringify({ name: row.name, value: plaintext }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store, must-revalidate",
    },
  });
}
