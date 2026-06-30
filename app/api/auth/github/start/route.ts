import { auth } from "@clerk/nextjs/server";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";

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

/**
 * GET /api/auth/github/start — inicia el OAuth de la GitHub App
 * "v-Forge-momentum". Redirige al usuario a GitHub para autorizar con un
 * click (sin pegar tokens). Guarda un `state` anti-CSRF en cookie.
 *
 * Puente multi-app: si llega ?return_to=&tenant=, ademas de guardar el
 * token para VForge (comportamiento de siempre, sin cambios), el callback
 * tambien lo entrega server-a-server a la app que lo pidio (ej V-Admin)
 * y regresa al usuario a esa app en vez de a /onboarding. Esto evita
 * registrar una GitHub App nueva o tocar el Callback URL (un solo campo,
 * ya en uso por VForge) — VForge sigue siendo el unico dueno del flujo.
 */
export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.redirect(new URL("/sign-in", siteUrl()), 302);

  const clientId = process.env.GITHUB_APP_CLIENT_ID || "";
  if (!clientId) return Response.redirect(new URL("/onboarding?github=error_no_client", siteUrl()), 302);

  const reqUrl = new URL(req.url);
  const returnTo = returnToPermitido(reqUrl.searchParams.get("return_to"));
  const tenant = reqUrl.searchParams.get("tenant");

  const state = randomBytes(16).toString("hex");
  const jar = await cookies();
  jar.set("gh_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  if (returnTo) {
    jar.set("gh_bridge_return_to", returnTo, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    });
    if (tenant) {
      jar.set("gh_bridge_tenant", tenant, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: 600,
        path: "/",
      });
    }
  }

  const redirectUri = `${siteUrl()}/api/auth/github/callback`;
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  // La GitHub App pide autorización OAuth del usuario; los scopes los
  // define la app. No mandamos scope extra (lo gobierna la App).
  return Response.redirect(url.toString(), 302);
}

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://vforge.site";
}
