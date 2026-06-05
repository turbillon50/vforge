import { auth } from "@clerk/nextjs/server";
import { isOwnerUser } from "@/lib/auth/owner";
import { clerkClient } from "@clerk/nextjs/server";
import { getUserSecret } from "@/lib/connect/user-vault";
import { getOperatorSecret } from "@/lib/vault/get-secret";

export interface ResolvedAccess {
  userId: string | null;
  isOwner: boolean;
  /** Token GitHub a usar para ESTE request (owner→operador, usuario→el suyo). */
  githubToken: string | null;
  /** Token Vercel idem. */
  vercelToken: string | null;
}

/**
 * AISLAMIENTO MULTI-TENANT. Resuelve qué credenciales usar según QUIÉN
 * hace el request:
 *  - Owner (Luis): usa los tokens del operador (su GITHUB_TOKEN / VERCEL_TOKEN).
 *  - Cualquier otro usuario: SOLO su propio token conectado (user_secrets).
 *    Si no conectó nada → null (estado vacío). NUNCA el del owner.
 */
/**
 * Variante para contextos SIN sesion Clerk (p. ej. MCP, donde el userId
 * viene de un token Bearer ya validado). Misma logica de aislamiento:
 * owner -> tokens del operador, usuario -> sus propios tokens del vault.
 */
export async function resolveAccessForUser(
  userId: string | null,
): Promise<ResolvedAccess> {
  if (!userId) {
    return { userId: null, isOwner: false, githubToken: null, vercelToken: null };
  }
  let owner = false;
  try {
    const cc = await clerkClient();
    const u = await cc.users.getUser(userId).catch(() => null);
    owner = isOwnerUser(u);
  } catch {
    owner = false;
  }

  if (owner) {
    const [gh, vc] = await Promise.all([
      getOperatorSecret("GITHUB_TOKEN").catch(() => null),
      getOperatorSecret("VERCEL_TOKEN").catch(() => null),
    ]);
    return { userId, isOwner: true, githubToken: gh, vercelToken: vc };
  }

  const [gh, vc] = await Promise.all([
    getUserSecret(userId, "GITHUB_USER_TOKEN"),
    getUserSecret(userId, "VERCEL_USER_TOKEN"),
  ]);
  return { userId, isOwner: false, githubToken: gh, vercelToken: vc };
}

export async function resolveAccess(): Promise<ResolvedAccess> {
  let userId: string | null = null;
  let owner = false;
  try {
    const a = await auth();
    userId = a.userId ?? null;
    if (userId) {
      const claimRole = (a.sessionClaims?.publicMetadata as { role?: string } | undefined)?.role;
      if (claimRole === "owner") owner = true;
      else {
        const cc = await clerkClient();
        const u = await cc.users.getUser(userId).catch(() => null);
        owner = isOwnerUser(u);
      }
    }
  } catch {
    /* sin sesión */
  }

  if (!userId) return { userId: null, isOwner: false, githubToken: null, vercelToken: null };

  if (owner) {
    const [gh, vc] = await Promise.all([
      getOperatorSecret("GITHUB_TOKEN").catch(() => null),
      getOperatorSecret("VERCEL_TOKEN").catch(() => null),
    ]);
    return { userId, isOwner: true, githubToken: gh, vercelToken: vc };
  }

  const [gh, vc] = await Promise.all([
    getUserSecret(userId, "GITHUB_USER_TOKEN"),
    getUserSecret(userId, "VERCEL_USER_TOKEN"),
  ]);
  return { userId, isOwner: false, githubToken: gh, vercelToken: vc };
}
