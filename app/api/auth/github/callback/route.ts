import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { saveUserSecret } from "@/lib/connect/user-vault";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/auth/github/callback — GitHub regresa aquí con ?code&state.
 * Intercambia el code por un access token de usuario y lo guarda cifrado
 * en el vault por Clerk userId, igual que siempre. Luego redirige a
 * /app/integrations — salvo que esta autorizacion vino de un puente
 * (otra app, ej V-Admin, mando al usuario aqui via ?return_to), en cuyo
 * caso el token TAMBIEN se entrega server-a-server a esa app, y al
 * usuario se le regresa ahi en vez de a /onboarding.
 */
export async function GET(req: Request) {
  const { userId } = await auth();
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://vforge.site";
  if (!userId) return Response.redirect(new URL("/sign-in", site), 302);

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const jar = await cookies();
  const expected = jar.get("gh_oauth_state")?.value;
  const bridgeReturnTo = jar.get("gh_bridge_return_to")?.value;
  const bridgeTenant = jar.get("gh_bridge_tenant")?.value;
  jar.delete("gh_oauth_state");
  jar.delete("gh_bridge_return_to");
  jar.delete("gh_bridge_tenant");

  const back = (status: string) => {
    if (bridgeReturnTo) {
      const u = new URL(bridgeReturnTo);
      u.searchParams.set("github", status);
      return Response.redirect(u.toString(), 302);
    }
    return Response.redirect(`${site}/workspace/conexiones?github=${status}`, 302);
  };

  if (!code) return back("error_no_code");
  if (!state || !expected || state !== expected) return back("error_state");

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

    // Puente: si la autorizacion vino de otra app (V-Admin), le entregamos
    // el token server-a-server. Falla "suave": si el puente truena, el
    // usuario igual queda conectado en VForge (no se pierde el trabajo).
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
        } else {
          console.error("[gh oauth bridge] VFORGE_BRIDGE_SECRET no configurado");
        }
      } catch (e) {
        console.error("[gh oauth bridge] fallo entregando token:", e);
      }
    }

    return back("connected");
  } catch (e) {
    console.error("[gh oauth] fallo:", e);
    return back("error_exchange");
  }
}
