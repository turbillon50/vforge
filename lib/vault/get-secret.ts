/**
 * Server-side helper for V (and any backend code) to invoke an
 * operator secret by name. Reads from operator_secrets table,
 * decrypts on the fly with the AES key derived from
 * VFORGE_MASTER_PEPPER, updates last_used_at, and returns the
 * plaintext.
 *
 * Falls back to process.env when the secret hasn't been migrated
 * yet — keeps the brain endpoint working during the transition
 * from "all keys in Vercel env" to "all keys in DB cifradas".
 */
import { queryOne, sql } from "@/lib/db/client";
import { decryptOperatorSecret } from "./operator-crypto";

interface SecretRow {
  id: string;
  ciphertext: Buffer;
  iv: Buffer;
  auth_tag: Buffer;
}

const VAULT_HIT_CACHE = new Map<string, { value: string; expiresAt: number }>();
const CACHE_TTL_MS = 60 * 1000; // 60 s in-process cache (per Lambda invocation)

/**
 * Returns the plaintext value of an operator secret, looking it up
 * by name. Cached for 60 seconds in-memory per process.
 *
 * Falls back to process.env[name] if no DB row exists.
 */
export async function getOperatorSecret(
  name: string,
  options: { auditUserId?: string } = {},
): Promise<string | null> {
  const cached = VAULT_HIT_CACHE.get(name);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  let row: SecretRow | null = null;
  try {
    row = await queryOne<SecretRow>(
      `SELECT id::text, ciphertext, iv, auth_tag
         FROM operator_secrets WHERE name = $1`,
      [name],
    );
  } catch {
    // DB unreachable → degrade to env var
    row = null;
  }

  if (!row) {
    const envVal = process.env[name];
    if (envVal) {
      VAULT_HIT_CACHE.set(name, {
        value: envVal,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });
      return envVal;
    }
    return null;
  }

  let plaintext: string;
  try {
    plaintext = decryptOperatorSecret({
      ciphertext: Buffer.from(row.ciphertext),
      iv: Buffer.from(row.iv),
      authTag: Buffer.from(row.auth_tag),
    });
  } catch (err) {
    // If decryption fails, fall back to env var so the system keeps
    // working while we diagnose. Log loudly so it's visible.
    console.error("[vault] decrypt failed for", name, err);
    return process.env[name] ?? null;
  }

  // Update last_used_at + audit log (fire-and-forget, don't block the call)
  void Promise.all([
    sql`UPDATE operator_secrets SET last_used_at = now(), last_used_by = ${options.auditUserId ?? null} WHERE id = ${row.id}`,
    sql`
      INSERT INTO audit_events (user_id, action, resource_type, resource_id, ring, payload)
      VALUES (
        ${options.auditUserId ?? "system"}, 'vault.operator.read', 'operator_secret', ${row.id}, 1,
        ${JSON.stringify({ name })}::jsonb
      )
    `,
  ]).catch(() => undefined);

  VAULT_HIT_CACHE.set(name, {
    value: plaintext,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
  return plaintext;
}

/**
 * Convenience: get with a "must exist" guarantee. Throws if missing.
 */
export async function requireOperatorSecret(
  name: string,
  options: { auditUserId?: string } = {},
): Promise<string> {
  const value = await getOperatorSecret(name, options);
  if (!value) {
    throw new Error(
      `Operator secret "${name}" not found in vault or env`,
    );
  }
  return value;
}

/**
 * Drop the in-process cache. Useful after rotating a key.
 */
export function invalidateSecretCache(name?: string): void {
  if (name) VAULT_HIT_CACHE.delete(name);
  else VAULT_HIT_CACHE.clear();
}
