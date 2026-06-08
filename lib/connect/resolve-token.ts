import { auth } from "@clerk/nextjs/server";
import { isOwnerUser } from "@/lib/auth/owner";
import { clerkClient } from "@clerk/nextjs/server";
import { getUserSecret } from "@/lib/connect/user-vault";
import { syncClerkOAuthTokens } from "@/lib/connect/clerk-oauth-sync";
import { getOperatorSecret } from "@/lib/vault/get-secret";

/**
 * Tokens GitHub/Vercel del usuario, con fallback a Clerk OAuth: si no están en
 * el vault pero el usuario los conectó como social connection de Clerk, los
 * espejamos al vault y los reusamos — sin pedir un OAuth adicional.
 */
async function userTokensWithClerkFallback(
  userId: string,
): Promise<{ githubToken: string | null; vercelToken: string | null }> {
  let [gh, vc] = await Promise.all([
    getUserSecret(userId, "GITHUB_USER_TOKEN"),
    getUserSecret(userId, "VERCEL_USER_TOKEN"),
  ]);
  if (!gh || !vc) {
    await syncClerkOAuthTokens(userId).catch(() => null);
    if (!gh) gh = await getUserSecret(userId, "GITHUB_USER_TOKEN");
    if (!vc) vc = await getUserSecret(userId, "VERCEL_USER_TOKEN");
  }
  return { githubToken: gh, vercelToken: vc };
}

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

  const { githubToken, vercelToken } = await userTokensWithClerkFallback(userId);
  return { userId, isOwner: false, githubToken, vercelToken };
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

  const { githubToken, vercelToken } = await userTokensWithClerkFallback(userId);
  return { userId, isOwner: false, githubToken, vercelToken };
}
