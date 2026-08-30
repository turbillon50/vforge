import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { saveUserSecret } from "@/lib/connect/user-vault";
import { normalizarOAuthReturnPath } from "@/lib/connect/oauth-state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type GitHubInstallation = {
  id: number;
  app_id: number;
  app_slug?: string;
  account?: { login?: string } | null;
  permissions?: Record<string, string>;
};

const githubHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "vforge",
});

/**
 * GET /api/auth/github/callback — intercambia code→token, valida que la
 * GitHub App esté instalada con Administration:write y sólo entonces
 * guarda la conexión en el vault.
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
  const installPending = jar.get("gh_install_pending")?.value;
  const bridgeReturnTo = jar.get("gh_bridge_return_to")?.value;
  const bridgeTenant = jar.get("gh_bridge_tenant")?.value;
  const internalReturnPath = normalizarOAuthReturnPath(
    jar.get("gh_oauth_return_path")?.value,
  );

  jar.delete("gh_oauth_state");
  jar.delete("gh_install_pending");
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

  if (!code) return back("error_no_code");

  const validOAuthState = Boolean(state && expected && state === expected);
  const validInstallCallback = Boolean(
    !state && expected && installPending && expected === installPending,
  );
  if (!validOAuthState && !validInstallCallback) return back("error_state");

  const clientId = process.env.GITHUB_APP_CLIENT_ID || "";
  const clientSecret = process.env.GITHUB_APP_CLIENT_SECRET;
  if (!clientId) return back("error_no_client");
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
    if (!tokenRes.ok || !data.access_token) {
      console.error("[gh oauth] token exchange failed", {
        status: tokenRes.status,
        error: data.error,
      });
      return back("error_token");
    }

    const installationsRes = await fetch(
      "https://api.github.com/user/installations?per_page=100",
      { headers: githubHeaders(data.access_token) },
    );
    if (!installationsRes.ok) {
      console.error("[gh oauth] installation lookup failed", {
        status: installationsRes.status,
      });
      return back("error_installation_check");
    }

    const installationsData = (await installationsRes.json()) as {
      installations?: GitHubInstallation[];
    };
    const appId = Number(process.env.GITHUB_APP_ID || "3696759");
    const appSlug = process.env.GITHUB_APP_SLUG || "v-forge-momentum";
    const installation = installationsData.installations?.find(
      (item) => item.app_id === appId || item.app_slug === appSlug,
    );

    if (!installation) {
      console.error("[gh oauth] app not installed for authorized user", {
        userId,
        appId,
      });
      return back("error_installation_required");
    }
    if (installation.permissions?.administration !== "write") {
      console.error("[gh oauth] installation missing administration:write", {
        userId,
        installationId: installation.id,
      });
      return back("error_installation_permission");
    }

    let login: string | null = null;
    try {
      const who = await fetch("https://api.github.com/user", {
        headers: githubHeaders(data.access_token),
      });
      if (who.ok) {
        const githubUser = (await who.json()) as { login?: string };
        if (githubUser.login) login = "@" + githubUser.login;
      }
    } catch {
      // El login es informativo; la instalación validada es la autoridad.
    }

    // Guardar únicamente después de validar instalación y permisos.
    await saveUserSecret(userId, "GITHUB_USER_TOKEN", data.access_token, "github");
    await saveUserSecret(
      userId,
      "GITHUB_INSTALLATION_ID",
      String(installation.id),
      "github",
    );
    if (installation.account?.login) {
      await saveUserSecret(
        userId,
        "GITHUB_INSTALLATION_ACCOUNT",
        installation.account.login,
        "github",
      );
    }
    if (data.refresh_token) {
      await saveUserSecret(
        userId,
        "GITHUB_REFRESH_TOKEN",
        data.refresh_token,
        "github",
      );
    }
    if (login) {
      await saveUserSecret(userId, "GITHUB_LOGIN", login, "github");
    }

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
              installation_id: installation.id,
              installation_account: installation.account?.login || null,
              source: "vforge-bridge",
            }),
          });
        }
      } catch (error) {
        console.error("[gh oauth bridge] delivery failed", {
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return back("connected");
  } catch (error) {
    console.error("[gh oauth] callback failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return back("error_exchange");
  }
}
