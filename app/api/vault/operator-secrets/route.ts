import { neon } from "@neondatabase/serverless";
import { queryAll } from "@/lib/db/client";
import {
  encryptOperatorSecret,
  vaultSelfTest,
} from "@/lib/vault/operator-crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OPERATOR_USER_ID = "operator_luis";

interface SecretMetadata {
  id: string;
  name: string;
  description: string | null;
  provider: string | null;
  scope: string | null;
  created_at: string;
  rotated_at: string | null;
  last_used_at: string | null;
}

/**
 * GET /api/vault/operator-secrets
 *
 * Returns ONLY metadata of all operator secrets. NEVER includes the
 * ciphertext or the plaintext value — that comes from
 * /api/vault/operator-secrets/{id}/value with explicit Anillo 2 intent.
 */
export async function GET() {
  const rows = await queryAll<SecretMetadata>(
    `SELECT id::text, name, description, provider, scope,
            created_at, rotated_at, last_used_at
       FROM operator_secrets
       ORDER BY name ASC`,
  );
  return new Response(
    JSON.stringify({
      secrets: rows,
      vault_health: vaultSelfTest(),
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

/**
 * POST /api/vault/operator-secrets
 *
 * Creates (or rotates if name exists) an operator secret. The plaintext
 * value is encrypted with AES-256-GCM and stored as opaque ciphertext.
 * The plaintext leaves the request body and is never persisted.
 *
 * Body: { name, value, description?, provider?, scope? }
 *
 * Anillo 2 — should require operator confirmation in the UI.
 */
export async function POST(req: Request) {
  let body: {
    name?: string;
    value?: string;
    description?: string | null;
    provider?: string | null;
    scope?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return jsonError("invalid JSON", 400);
  }

  const name = (body.name ?? "").trim();
  const value = body.value ?? "";
  if (!name || !/^[A-Z][A-Z0-9_]*$/.test(name)) {
    return jsonError(
      "name required (UPPER_SNAKE_CASE, e.g. ANTHROPIC_API_KEY)",
      400,
    );
  }
  if (!value) {
    return jsonError("value required", 400);
  }
  if (value.length > 16_000) {
    return jsonError("value too large (max 16 KB)", 413);
  }

  const description = body.description ?? null;
  const provider = body.provider ?? null;
  const scope = body.scope ?? null;

  let enc;
  try {
    enc = encryptOperatorSecret(value);
  } catch (err) {
    return jsonError(
      `encryption failed: ${err instanceof Error ? err.message : String(err)}`,
      500,
    );
  }

  const dburl = process.env.DATABASE_URL;
  if (!dburl) return jsonError("DATABASE_URL not configured", 500);
  const tx = neon(dburl);

  const auditPayload = JSON.stringify({ name, provider, scope });

  try {
    const result = await tx.transaction([
      tx`
        INSERT INTO operator_secrets (
          name, description, ciphertext, iv, auth_tag, provider, scope, rotated_at
        )
        VALUES (
          ${name}, ${description},
          ${enc.ciphertext}, ${enc.iv}, ${enc.authTag},
          ${provider}, ${scope}, NULL
        )
        ON CONFLICT (name) DO UPDATE SET
          description = COALESCE(EXCLUDED.description, operator_secrets.description),
          ciphertext = EXCLUDED.ciphertext,
          iv = EXCLUDED.iv,
          auth_tag = EXCLUDED.auth_tag,
          provider = COALESCE(EXCLUDED.provider, operator_secrets.provider),
          scope = COALESCE(EXCLUDED.scope, operator_secrets.scope),
          rotated_at = now()
        RETURNING id::text, name
      `,
      tx`
        INSERT INTO audit_events (user_id, action, resource_type, ring, payload)
        VALUES (
          ${OPERATOR_USER_ID}, 'vault.operator.write', 'operator_secret', 2,
          ${auditPayload}::jsonb
        )
      `,
    ]);

    const upserted = (result[0] as Array<{ id: string; name: string }>)[0];
    return new Response(JSON.stringify(upserted), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return jsonError(
      `db error: ${err instanceof Error ? err.message : String(err)}`,
      500,
    );
  }
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
