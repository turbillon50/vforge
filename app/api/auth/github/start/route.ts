import { auth } from "@clerk/nextjs/server";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/auth/github/start — inicia el OAuth de la GitHub App
 * "v-Forge-momentum". Redirige al usuario a GitHub para autorizar con un
 * click (sin pegar tokens). Guarda un `state` anti-CSRF en cookie.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.redirect(new URL("/sign-in", siteUrl()), 302);

  const clientId = process.env.GITHUB_CLIENT_ID || "Iv23livvZ0wFgmWc7lhi";
  const state = randomBytes(16).toString("hex");
  const jar = await cookies();
  jar.set("gh_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

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
