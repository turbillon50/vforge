import { auth } from "@clerk/nextjs/server";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { normalizarOAuthReturnPath } from "@/lib/connect/oauth-state";
import { getUserSecret, saveUserSecret } from "@/lib/connect/user-vault";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Dominios permitidos para el puente "conectar GitHub desde otra app"
// (return_to). Lista blanca explicita — nunca un open redirect libre.
const PUENTE_DOMINIOS_PERMITIDOS = [".v-adm.life", "v-adm.life"];

function returnToPermitido(url: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return null;
    const ok = PUENTE_DOMINIOS_PERMITIDOS.some(
      (d) => u.hostname === d.replace(/^\./, "") || u.hostname.endsWith(d),
    );
    return ok ? url : null;
  } catch {
    return null;
  }
}

type GitHubInstallation = {
  id: number;
  app_id: number;
  app_slug?: string;
  account?: { login?: string } | null;
  permissions?: Record<string, string>;
};

async function repairExistingInstallation(userId: string): Promise<boolean> {
  const token = await getUserSecret(userId, "GITHUB_USER_TOKEN");
  if (!token) return false;

  try {
    const response = await fetch(
      "https://api.github.com/user/installations?per_page=100",
      {
        headers: {
          Authorization: `Bearer `,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "vforge",
        },
        cache: "no-store",
      },
    );
    if (!response.ok) return false;

    const data = (await response.json()) as {
      installations?: GitHubInstallation[];
    };
    const appId = Number(process.env.GITHUB_APP_ID || "3696759");
    const appSlug = process.env.GITHUB_APP_SLUG || "v-forge-momentum";
    const installation = data.installations?.find(
      (item) => item.app_id === appId || item.app_slug === appSlug,
    );
    if (!installation || installation.permissions?.administration !== "write") {
      return false;
    }

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
    return true;
  } catch (error) {
    console.error("[gh install repair] lookup failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * GET /api/auth/github/start — inicia la instalación de la GitHub App
 * "v-Forge-momentum". GitHub instala la App y, con "Request user
 * authorization during installation" habilitado, continúa al OAuth.
 *
 * Puente multi-app: si llega ?return_to=&tenant=, además de guardar el
 * token para VForge, el callback lo entrega server-a-server a la app que
 * lo pidió y regresa al usuario a esa app.
 */
export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.redirect(new URL("/sign-in", siteUrl()), 302);

  const clientId = process.env.GITHUB_APP_CLIENT_ID || "";
  if (!clientId) {
    return Response.redirect(
      new URL("/onboarding?github=error_no_client", siteUrl()),
      302,
    );
  }

  const reqUrl = new URL(req.url);
  const returnTo = returnToPermitido(reqUrl.searchParams.get("return_to"));
  const internalReturnTo = normalizarOAuthReturnPath(
    reqUrl.searchParams.get("return_to"),
  );
  const tenant = reqUrl.searchParams.get("tenant");

  // Migración transparente para instalaciones creadas antes del flujo actual.
  // Si el token existente ya ve la App con el permiso correcto, registramos su
  // installation_id y regresamos sin mandar al usuario a GitHub otra vez.
  if (!returnTo && (await repairExistingInstallation(userId))) {
    const destination = new URL(internalReturnTo, siteUrl());
    destination.searchParams.set("github", "connected");
    return Response.redirect(destination.toString(), 302);
  }

  const state = randomBytes(16).toString("hex");
  const jar = await cookies();
  jar.delete("gh_bridge_return_to");
  jar.delete("gh_bridge_tenant");
  jar.delete("gh_oauth_return_path");
  jar.delete("gh_install_pending");

  const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
    maxAge: 600,
    path: "/",
  };
  jar.set("gh_oauth_state", state, cookieOptions);
  // GitHub no siempre devuelve state en el OAuth iniciado automáticamente
  // después de instalar. Esta cookie liga el callback al inicio hecho en
  // el mismo navegador y a la sesión Clerk ya autenticada.
  jar.set("gh_install_pending", state, cookieOptions);

  if (returnTo) {
    jar.set("gh_bridge_return_to", returnTo, cookieOptions);
    if (tenant) jar.set("gh_bridge_tenant", tenant, cookieOptions);
  } else {
    jar.set("gh_oauth_return_path", internalReturnTo, cookieOptions);
  }

  const appSlug = process.env.GITHUB_APP_SLUG || "v-forge-momentum";
  const url = new URL(`https://github.com/apps/${appSlug}/installations/new`);
  url.searchParams.set("state", state);
  return Response.redirect(url.toString(), 302);
}

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://vforge.site";
}
