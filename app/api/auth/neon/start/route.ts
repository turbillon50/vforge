import { auth } from "@clerk/nextjs/server";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/auth/neon/start — inicia el OAuth2 estándar de Neon.
 * Redirige al usuario a Neon para autorizar con un click (sin pegar tokens).
 * Guarda un `state` anti-CSRF en cookie neon_oauth_state.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.redirect(new URL("/sign-in", siteUrl()), 302);

  const clientId = process.env.NEON_OAUTH_CLIENT_ID;
  if (!clientId) {
    return Response.redirect(
      `${siteUrl()}/app/integrations?neon=error_no_client`,
      302,
    );
  }

  const state = randomBytes(16).toString("hex");
  const jar = await cookies();
  jar.set("neon_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  const redirectUri = `${siteUrl()}/api/auth/neon/callback`;
  const url = new URL("https://oauth2.neon.tech/oauth2/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set(
    "scope",
    "openid offline_access urn:neoncloud:projects:create urn:neoncloud:projects:read",
  );
  url.searchParams.set("state", state);
  return Response.redirect(url.toString(), 302);
}

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://vforge.site";
}
