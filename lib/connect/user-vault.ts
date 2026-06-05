import { neon } from "@neondatabase/serverless";
import { encryptOperatorSecret } from "@/lib/vault/operator-crypto";

/**
 * Guarda un secreto cifrado para un usuario (Clerk userId) en user_secrets.
 * Usado por los flujos OAuth (GitHub, Vercel) — token de usuario cifrado,
 * nunca en claro, ligado a su cuenta.
 */
export async function saveUserSecret(
  userId: string,
  name: string,
  value: string,
  scope: string | null = null,
): Promise<void> {
  const dburl = process.env.DATABASE_URL;
  if (!dburl) throw new Error("DATABASE_URL no configurada");
  const enc = encryptOperatorSecret(value);
  const sql = neon(dburl);
  const projectId = "connect";
  // user_secrets.user_id tiene FK a users(id): aseguramos la fila del
  // usuario Clerk antes de guardar (rol 'member', email placeholder si
  // no lo conocemos — el perfil real lo completa Clerk).
  await sql`
    INSERT INTO users (id, email, role)
    VALUES (${userId}, ${userId + "@clerk.local"}, 'client')
    ON CONFLICT (id) DO NOTHING
  `;
  await sql`
    INSERT INTO user_secrets (user_id, project_id, name, scope, ciphertext, iv, auth_tag)
    VALUES (${userId}, ${projectId}, ${name}, ${scope}, ${enc.ciphertext}, ${enc.iv}, ${enc.authTag})
    ON CONFLICT (user_id, project_id, name) DO UPDATE SET
      ciphertext = EXCLUDED.ciphertext,
      iv = EXCLUDED.iv,
      auth_tag = EXCLUDED.auth_tag,
      last_used_at = NULL
  `;
}

import { decryptOperatorSecret } from "@/lib/vault/operator-crypto";

/**
 * Lee y descifra un secreto de conexión guardado por el usuario.
 * Devuelve null si no existe. Es la llave de aislamiento multi-tenant:
 * cada usuario solo ve lo que ÉL conectó.
 */
export async function getUserSecret(
  userId: string,
  name: string,
): Promise<string | null> {
  const dburl = process.env.DATABASE_URL;
  if (!dburl) return null;
  const sql = neon(dburl);
  const rows = (await sql`
    SELECT ciphertext, iv, auth_tag FROM user_secrets
    WHERE user_id = ${userId} AND name = ${name}
    LIMIT 1
  `) as Array<{ ciphertext: string; iv: string; auth_tag: string }>;
  if (rows.length === 0) return null;
  try {
    return decryptOperatorSecret({
      ciphertext: rows[0].ciphertext,
      iv: rows[0].iv,
      authTag: rows[0].auth_tag,
    });
  } catch {
    return null;
  }
}
