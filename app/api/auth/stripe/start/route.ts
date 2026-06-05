import { auth } from "@clerk/nextjs/server";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/auth/stripe/start — inicia Stripe Connect OAuth (real).
 * Stripe soporta OAuth para conectar cuentas de usuario vía
 * connect.stripe.com/oauth/authorize. Guarda `state` anti-CSRF.
 */
export async function GET() {
  const site = siteUrl();
  const { userId } = await auth();
  if (!userId) return Response.redirect(new URL("/sign-in", site), 302);

  const clientId = process.env.STRIPE_CONNECT_CLIENT_ID;
  if (!clientId) {
    return Response.redirect(`${site}/app/integrations?stripe=error_no_client`, 302);
  }

  const state = randomBytes(16).toString("hex");
  const jar = await cookies();
  jar.set("stripe_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  const redirectUri = `${site}/api/auth/stripe/callback`;
  const url = new URL("https://connect.stripe.com/oauth/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "read_write");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  return Response.redirect(url.toString(), 302);
}

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://vforge.site";
}
