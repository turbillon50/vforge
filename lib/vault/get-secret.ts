/**
 * Server-side helper for V (and any backend code) to invoke a
 * vault secret by name, with cascade resolution:
 *
 *    project_secrets (if scope.projectId)
 *      → operator_secrets (always)
 *      → process.env (transition fallback)
 *
 * Reads from the relevant table, decrypts on the fly with the AES
 * key derived from VFORGE_MASTER_PEPPER, updates last_used_at, and
 * returns the plaintext. Each successful read writes an audit event.
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

function cacheKey(name: string, projectId: string | null | undefined): string {
  return projectId ? `p:${projectId}:${name}` : `g:${name}`;
}

interface GetSecretOptions {
  auditUserId?: string;
  /**
   * If set, look in project_secrets WHERE project_id=projectId AND name=name
   * BEFORE falling through to operator_secrets. If the value isn't found at
   * the project scope, the resolution continues with the global vault — so
   * a project can override a key (e.g. its own VITE_CLERK_PUBLISHABLE_KEY)
   * without invalidating the shared default.
   */
  projectId?: string | null;
}

/**
 * Returns the plaintext value of a vault secret, with project →
 * operator → env cascade. Cached for 60 seconds in-memory per process,
 * keyed on (scope, name) so different projects don't poison each
 * other's cache.
 */
export async function getOperatorSecret(
  name: string,
  options: GetSecretOptions = {},
): Promise<string | null> {
  const cKey = cacheKey(name, options.projectId);
  const cached = VAULT_HIT_CACHE.get(cKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  // 1) Project-scoped lookup (if requested)
  if (options.projectId) {
    const projectRow = await tryReadProjectSecret(
      options.projectId,
      name,
      options.auditUserId,
    );
    if (projectRow) {
      VAULT_HIT_CACHE.set(cKey, {
        value: projectRow,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });
      return projectRow;
    }
  }

  // 2) Global operator vault
  let row: SecretRow | null = null;
  try {
    row = await queryOne<SecretRow>(
      `SELECT id::text, ciphertext, iv, auth_tag
         FROM operator_secrets WHERE name = $1`,
      [name],
    );
  } catch {
    row = null;
  }

  if (!row) {
    // 3) Env fallback
    const envVal = process.env[name];
    if (envVal) {
      VAULT_HIT_CACHE.set(cKey, {
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
    console.error("[vault] decrypt failed for", name, err);
    return process.env[name] ?? null;
  }

  void Promise.all([
    sql`UPDATE operator_secrets SET last_used_at = now(), last_used_by = ${options.auditUserId ?? null} WHERE id = ${row.id}`,
    sql`
      INSERT INTO audit_events (user_id, action, resource_type, resource_id, ring, payload)
      VALUES (
        ${options.auditUserId ?? "system"}, 'vault.operator.read', 'operator_secret', ${row.id}, 1,
        ${JSON.stringify({ name, scope: "global" })}::jsonb
      )
    `,
  ]).catch(() => undefined);

  VAULT_HIT_CACHE.set(cKey, {
    value: plaintext,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
  return plaintext;
}

async function tryReadProjectSecret(
  projectId: string,
  name: string,
  auditUserId?: string,
): Promise<string | null> {
  let row: SecretRow | null = null;
  try {
    row = await queryOne<SecretRow>(
      `SELECT id::text, ciphertext, iv, auth_tag
         FROM project_secrets
        WHERE project_id = $1 AND name = $2`,
      [projectId, name],
    );
  } catch {
    return null;
  }
  if (!row) return null;
  let plaintext: string;
  try {
    plaintext = decryptOperatorSecret({
      ciphertext: Buffer.from(row.ciphertext),
      iv: Buffer.from(row.iv),
      authTag: Buffer.from(row.auth_tag),
    });
  } catch (err) {
    console.error("[vault] decrypt failed for project secret", projectId, name, err);
    return null;
  }
  void Promise.all([
    sql`UPDATE project_secrets SET last_used_at = now(), last_used_by = ${auditUserId ?? null} WHERE id = ${row.id}`,
    sql`
      INSERT INTO audit_events (user_id, action, resource_type, resource_id, ring, payload)
      VALUES (
        ${auditUserId ?? "system"}, 'vault.project.read', 'project_secret', ${row.id}, 1,
        ${JSON.stringify({ name, project_id: projectId, scope: "project" })}::jsonb
      )
    `,
  ]).catch(() => undefined);
  return plaintext;
}

/**
 * Convenience: get with a "must exist" guarantee. Throws if missing.
 */
export async function requireOperatorSecret(
  name: string,
  options: GetSecretOptions = {},
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
export function invalidateSecretCache(
  name?: string,
  projectId?: string | null,
): void {
  if (name) {
    VAULT_HIT_CACHE.delete(cacheKey(name, projectId));
  } else {
    VAULT_HIT_CACHE.clear();
  }
}
