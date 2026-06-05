import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { saveUserSecret } from "@/lib/connect/user-vault";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/auth/neon/callback — Neon regresa aquí con ?code&state.
 * Valida el state anti-CSRF, intercambia el code por un access token
 * (OAuth2 estándar, form-encoded) y lo guarda cifrado en el vault por
 * Clerk userId. Luego redirige a /app/integrations.
 */
export async function GET(req: Request) {
  const { userId } = await auth();
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://vforge.site";
  if (!userId) return Response.redirect(new URL("/sign-in", site), 302);

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const jar = await cookies();
  const expected = jar.get("neon_oauth_state")?.value;
  jar.delete("neon_oauth_state");

  const back = (status: string) =>
    Response.redirect(`${site}/app/integrations?neon=${status}`, 302);

  if (!code) return back("error_no_code");
  if (!state || !expected || state !== expected) return back("error_state");

  const clientId = process.env.NEON_OAUTH_CLIENT_ID;
  const clientSecret = process.env.NEON_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) return back("error_no_secret");

  try {
    const form = new URLSearchParams();
    form.set("grant_type", "authorization_code");
    form.set("client_id", clientId);
    form.set("client_secret", clientSecret);
    form.set("code", code);
    form.set("redirect_uri", `${site}/api/auth/neon/callback`);

    const tokenRes = await fetch("https://oauth2.neon.tech/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: form.toString(),
    });
    const data = (await tokenRes.json()) as {
      access_token?: string;
      refresh_token?: string;
      error?: string;
      error_description?: string;
    };
    if (!data.access_token) {
      console.error("[neon oauth] sin access_token:", data.error, data.error_description);
      return back("error_token");
    }

    await saveUserSecret(userId, "NEON_ACCESS_TOKEN", data.access_token, "neon");
    if (data.refresh_token) {
      await saveUserSecret(userId, "NEON_REFRESH_TOKEN", data.refresh_token, "neon");
    }

    return back("connected");
  } catch (e) {
    console.error("[neon oauth] fallo:", e);
    return back("error_exchange");
  }
}
