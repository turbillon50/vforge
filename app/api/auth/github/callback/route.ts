import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { saveUserSecret } from "@/lib/connect/user-vault";
import {
  leerStateCompleto,
  normalizarOAuthReturnPath,
  resolverOAuthCallbackIdentity,
} from "@/lib/connect/oauth-state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/auth/github/callback — intercambia code→token, guarda en vault,
 * redirige al return_to permitido o al puente si aplica.
 *
 * El userId va firmado en `state` (igual que Vercel). Si la sesión de Clerk
 * no viaja de vuelta desde github.com, el token igual se guarda al usuario
 * que inició el flujo — no se tira el code a /sign-in.
 */
export async function GET(req: Request) {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://vforge.site";
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const stateData = leerStateCompleto(state);

  const jar = await cookies();
  const expected = jar.get("gh_oauth_state")?.value;
  const bridgeReturnTo = jar.get("gh_bridge_return_to")?.value;
  const bridgeTenant = jar.get("gh_bridge_tenant")?.value;
  const internalReturnPath =
    stateData?.returnPath ??
    normalizarOAuthReturnPath(jar.get("gh_oauth_return_path")?.value);
  jar.delete("gh_oauth_state");
  jar.delete("gh_bridge_return_to");
  jar.delete("gh_bridge_tenant");
  jar.delete("gh_oauth_return_path");

  const back = (status: string) => {
    if (bridgeReturnTo) {
      const u = new URL(bridgeReturnTo);
      u.searchParams.set("github", status);
      return Response.redirect(u.toString(), 302);
    }
    const destination = new URL(internalReturnPath, site);
    destination.searchParams.set("github", status);
    return Response.redirect(destination, 302);
  };

  let sessionUserId: string | null = null;
  try {
    sessionUserId = (await auth()).userId ?? null;
  } catch {
    sessionUserId = null;
  }
  const identity = resolverOAuthCallbackIdentity(
    sessionUserId,
    stateData?.userId,
  );
  if (identity.mismatch) return back("error_state");
  const userId = identity.userId;

  if (!code) return back("error_no_code");
  // Cookie presente y distinta → CSRF. State firmado válido basta si la
  // cookie no viajó. States viejos (hex sin firma) siguen exigiendo cookie.
  if (expected && state && expected !== state) return back("error_state");
  if (!stateData && (!state || !expected || state !== expected)) {
    return back("error_state");
  }
  if (!userId) return back("error_sin_sesion");

  const clientId = process.env.GITHUB_APP_CLIENT_ID || "";
  const clientSecret = process.env.GITHUB_APP_CLIENT_SECRET;
  if (!clientSecret) return back("error_no_secret");

  try {
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: `${site}/api/auth/github/callback`,
      }),
    });
    const data = (await tokenRes.json()) as {
      access_token?: string;
      refresh_token?: string;
      error?: string;
    };
    if (!data.access_token) {
      console.error("[gh oauth] sin access_token:", data.error);
      return back("error_token");
    }

    await saveUserSecret(userId, "GITHUB_USER_TOKEN", data.access_token, "github");
    if (data.refresh_token) {
      await saveUserSecret(userId, "GITHUB_REFRESH_TOKEN", data.refresh_token, "github");
    }

    let login: string | null = null;
    try {
      const who = await fetch("https://api.github.com/user", {
        headers: { Authorization: `Bearer ${data.access_token}`, "User-Agent": "vforge" },
      });
      if (who.ok) {
        const u = (await who.json()) as { login?: string };
        if (u.login) {
          login = "@" + u.login;
          await saveUserSecret(userId, "GITHUB_LOGIN", login, "github");
        }
      }
    } catch { /* no crítico */ }

    if (bridgeReturnTo && bridgeTenant) {
      try {
        const bridgeSecret = process.env.VFORGE_BRIDGE_SECRET;
        if (bridgeSecret) {
          const destino = new URL(bridgeReturnTo);
          await fetch(`${destino.origin}/api/integrations/github/receive`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${bridgeSecret}`,
            },
            body: JSON.stringify({
              tenant: bridgeTenant,
              access_token: data.access_token,
              refresh_token: data.refresh_token || null,
              login,
              source: "vforge-bridge",
            }),
          });
        }
      } catch (e) {
        console.error("[gh oauth bridge] fallo:", e);
      }
    }

    return back("connected");
  } catch (e) {
    console.error("[gh oauth] fallo:", e);
    return back("error_exchange");
  }
}
