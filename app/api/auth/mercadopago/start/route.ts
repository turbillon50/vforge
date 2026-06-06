import { auth } from "@clerk/nextjs/server";
import { randomBytes, createHash } from "node:crypto";
import { cookies } from "next/headers";
import { getOperatorSecret } from "@/lib/vault/get-secret";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function base64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * GET /api/auth/mercadopago/start — Mercado Pago Connect (OAuth).
 * El VENDEDOR vincula SU cuenta de MP a la app de la plataforma, igual que
 * Stripe Connect. Soporta PKCE si MERCADOPAGO_PKCE_ENABLED = "1".
 */
export async function GET() {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://vforge.site";
  const { userId } = await auth();
  if (!userId) return Response.redirect(new URL("/sign-in", site), 302);

  const clientId =
    (await getOperatorSecret("MERCADOPAGO_APP_ID").catch(() => null)) ||
    process.env.MERCADOPAGO_APP_ID;
  if (!clientId)
    return Response.redirect(`${site}/app/integrations?mp=error_no_client`, 302);

  const state = randomBytes(16).toString("hex");
  const jar = await cookies();
  jar.set("mp_oauth_state", state, {
    httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/",
  });

  const url = new URL("https://auth.mercadopago.com/authorization");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("platform_id", "mp");
  url.searchParams.set("state", state);
  url.searchParams.set("redirect_uri", `${site}/api/auth/mercadopago/callback`);

  if (process.env.MERCADOPAGO_PKCE_ENABLED === "1") {
    const verifier = base64url(randomBytes(48)); // 64 chars, 43-128 OK
    const challenge = base64url(createHash("sha256").update(verifier).digest());
    jar.set("mp_pkce_verifier", verifier, {
      httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/",
    });
    url.searchParams.set("code_challenge", challenge);
    url.searchParams.set("code_challenge_method", "S256");
  }

  return Response.redirect(url.toString(), 302);
}
