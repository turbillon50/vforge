import { neon } from "@neondatabase/serverless";
import { encryptOperatorSecret } from "@/lib/vault/operator-crypto";
import { decryptOperatorSecret } from "@/lib/vault/operator-crypto";

const getDb = () => {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL no configurada");
  return neon(url);
};

/**
 * Upsert de usuario por clerk_user_id. Seguro — crea o actualiza sin duplicados.
 */
export async function upsertUserByClerkId(
  clerkId: string,
  email?: string,
  fullName?: string,
  avatarUrl?: string,
): Promise<void> {
  const sql = getDb();
  await sql`
    INSERT INTO users (id, clerk_user_id, email, role, name, avatar_url)
    VALUES (${clerkId}, ${clerkId}, ${email ?? clerkId + "@clerk.local"}, 'client', ${fullName ?? null}, ${avatarUrl ?? null})
    ON CONFLICT (id) DO UPDATE SET
      clerk_user_id = EXCLUDED.clerk_user_id,
      email         = COALESCE(EXCLUDED.email, users.email),
      name          = COALESCE(EXCLUDED.name, users.name),
      avatar_url    = COALESCE(EXCLUDED.avatar_url, users.avatar_url)
  `;
}

/**
 * Guarda secreto cifrado del usuario.
 */
export async function saveUserSecret(
  userId: string,
  name: string,
  value: string,
  scope: string | null = null,
): Promise<void> {
  const sql = getDb();
  const enc = encryptOperatorSecret(value);
  const projectId = "connect";

  // Garantizar fila del usuario
  await upsertUserByClerkId(userId);

  await sql`
    INSERT INTO user_secrets (user_id, project_id, name, scope, ciphertext, iv, auth_tag)
    VALUES (${userId}, ${projectId}, ${name}, ${scope}, ${enc.ciphertext}, ${enc.iv}, ${enc.authTag})
    ON CONFLICT (user_id, project_id, name) DO UPDATE SET
      ciphertext   = EXCLUDED.ciphertext,
      iv           = EXCLUDED.iv,
      auth_tag     = EXCLUDED.auth_tag,
      last_used_at = NULL
  `;
}

/**
 * Lee y descifra un secreto.
 */
export async function getUserSecret(
  userId: string,
  name: string,
): Promise<string | null> {
  const sql = getDb();
  const rows = (await sql`
    SELECT ciphertext, iv, auth_tag FROM user_secrets
    WHERE user_id = ${userId} AND name = ${name}
    LIMIT 1
  `) as Array<{ ciphertext: string; iv: string; auth_tag: string }>;
  if (rows.length === 0) return null;
  try {
    return decryptOperatorSecret({
      ciphertext: Buffer.from(rows[0].ciphertext, "hex"),
      iv: Buffer.from(rows[0].iv, "hex"),
      authTag: Buffer.from(rows[0].auth_tag, "hex"),
    });
  } catch {
    return null;
  }
}

/**
 * Lista los servicios realmente conectados del usuario.
 * GitHub sólo cuenta cuando existen tanto el token OAuth como una instalación
 * validada de la App; un token aislado ya no produce un falso "Conectado".
 */
export async function listUserConnections(userId: string): Promise<string[]> {
  const sql = getDb();
  const rows = (await sql`
    SELECT name, scope FROM user_secrets
    WHERE user_id = ${userId} AND scope IS NOT NULL
  `) as Array<{ name: string; scope: string }>;

  const names = new Set(rows.map((row) => row.name));
  const scopes = new Set(rows.map((row) => row.scope).filter(Boolean));

  scopes.delete("github");
  scopes.delete("github-clerk");
  if (
    names.has("GITHUB_USER_TOKEN") &&
    names.has("GITHUB_INSTALLATION_ID")
  ) {
    scopes.add("github");
  }

  return Array.from(scopes);
}

/**
 * Marca onboarding completado.
 */
export async function markOnboardingDone(clerkId: string): Promise<void> {
  const sql = getDb();
  // Columna onboarding_done puede no existir — silencioso si falla
  try {
    await sql`UPDATE users SET role = 'member' WHERE id = ${clerkId}`;
  } catch {
    /* ok */
  }
}

/**
 * Perfil del usuario.
 */
export async function getUserProfile(clerkId: string) {
  const sql = getDb();
  const rows = (await sql`
    SELECT id, clerk_user_id, email, name, role, avatar_url, created_at
    FROM users WHERE id = ${clerkId} LIMIT 1
  `) as Array<Record<string, unknown>>;
  return rows[0] ?? null;
}
