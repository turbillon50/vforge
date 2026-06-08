import { clerkClient } from "@clerk/nextjs/server";
import { getUserSecret, saveUserSecret } from "@/lib/connect/user-vault";

/**
 * Mirror de tokens OAuth de Clerk → user_vault.
 *
 * Cuando un usuario conecta GitHub/Vercel como social connection de Clerk,
 * Clerk custodia el access token y lo entrega (refrescado) vía Backend API.
 * Aquí lo copiamos a user_secrets (GITHUB_USER_TOKEN / VERCEL_USER_TOKEN) para
 * que VForge lo use directamente —igual que un token pegado a mano o por el
 * flujo OAuth propio— sin pedirle al usuario un segundo OAuth.
 */

// Respuesta de cc.users.getUserOauthAccessToken según versión del SDK:
// v6 devuelve { data: OauthAccessToken[] }; versiones viejas, el array directo.
type OauthTokenResponse =
  | { data?: Array<{ token?: string }> }
  | Array<{ token?: string }>;

/**
 * Pide a Clerk el access token del proveedor. Prueba varios alias porque el
 * nombre del provider cambió entre versiones (con/sin prefijo `oauth_`) y los
 * proveedores custom (Vercel) usan `custom_<slug>`.
 */
async function getClerkOauthToken(
  userId: string,
  providerAliases: string[],
): Promise<string | null> {
  let cc: Awaited<ReturnType<typeof clerkClient>>;
  try {
    cc = await clerkClient();
  } catch {
    return null;
  }
  const fetchToken = cc.users.getUserOauthAccessToken.bind(cc.users) as unknown as (
    userId: string,
    provider: string,
  ) => Promise<OauthTokenResponse>;

  for (const provider of providerAliases) {
    try {
      const res = await fetchToken(userId, provider);
      const list = Array.isArray(res) ? res : (res?.data ?? []);
      const token = list[0]?.token;
      if (token) return token;
    } catch {
      // alias inválido para esta versión/instancia → probar el siguiente
    }
  }
  return null;
}

export interface ClerkSyncResult {
  github: boolean;
  vercel: boolean;
}

/**
 * Espeja a user_vault los tokens OAuth que el usuario ya tenga conectados en
 * Clerk. Idempotente y best-effort: si el vault ya tiene el token NO llama a
 * Clerk (evita latencia); si no, lo trae y lo guarda. Devuelve qué proveedores
 * quedaron disponibles tras el sync.
 */
export async function syncClerkOAuthTokens(userId: string): Promise<ClerkSyncResult> {
  const [ghExisting, vcExisting] = await Promise.all([
    getUserSecret(userId, "GITHUB_USER_TOKEN"),
    getUserSecret(userId, "VERCEL_USER_TOKEN"),
  ]);

  let github = Boolean(ghExisting);
  let vercel = Boolean(vcExisting);

  if (!github) {
    const token = await getClerkOauthToken(userId, ["github", "oauth_github"]);
    if (token) {
      await saveUserSecret(userId, "GITHUB_USER_TOKEN", token, "github-clerk").catch(
        () => {},
      );
      github = true;
    }
  }

  if (!vercel) {
    const token = await getClerkOauthToken(userId, [
      "custom_vercel",
      "oauth_custom_vercel",
      "vercel",
      "oauth_vercel",
    ]);
    if (token) {
      await saveUserSecret(userId, "VERCEL_USER_TOKEN", token, "vercel-clerk").catch(
        () => {},
      );
      vercel = true;
    }
  }

  return { github, vercel };
}
