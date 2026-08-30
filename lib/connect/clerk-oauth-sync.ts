import { clerkClient } from "@clerk/nextjs/server";
import { getUserSecret, saveUserSecret } from "@/lib/connect/user-vault";

/**
 * Mirror de tokens OAuth de Clerk → user_vault.
 *
 * Vercel sí puede reutilizar su conexión social de Clerk. GitHub no: el token
 * social no prueba que la GitHub App de VForge esté instalada ni que tenga
 * Administration:write, por lo que GitHub sólo se considera disponible tras
 * completar el flujo propio de instalación + OAuth.
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
 * Espeja a user_vault el token de Vercel que el usuario ya tenga conectado en
 * Clerk. Para GitHub únicamente reporta true si ya existe una conexión propia
 * validada (token + installation ID); nunca importa el token social de Clerk.
 */
export async function syncClerkOAuthTokens(userId: string): Promise<ClerkSyncResult> {
  const [ghExisting, ghInstallation, vcExisting] = await Promise.all([
    getUserSecret(userId, "GITHUB_USER_TOKEN"),
    getUserSecret(userId, "GITHUB_INSTALLATION_ID"),
    getUserSecret(userId, "VERCEL_USER_TOKEN"),
  ]);

  const github = Boolean(ghExisting && ghInstallation);
  let vercel = Boolean(vcExisting);

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
