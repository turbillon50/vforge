import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { saveUserSecret } from "@/lib/connect/user-vault";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/auth/stripe/callback — Stripe regresa con ?code&state.
 * Intercambia code->access token vía connect.stripe.com/oauth/token.
 * Guarda el access token y el stripe_user_id (cuenta conectada) cifrados.
 */
export async function GET(req: Request) {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://vforge.site";
  const { userId } = await auth();
  if (!userId) return Response.redirect(new URL("/sign-in", site), 302);

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");
  const jar = await cookies();
  const expected = jar.get("stripe_oauth_state")?.value;
  jar.delete("stripe_oauth_state");

  const back = (status: string) =>
    Response.redirect(`${site}/app/integrations?stripe=${status}`, 302);

  if (errorParam) return back("error_denied");
  if (!code) return back("error_no_code");
  if (!state || !expected || state !== expected) return back("error_state");

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return back("error_no_secret");

  try {
    const tokenRes = await fetch("https://connect.stripe.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_secret: secretKey,
        grant_type: "authorization_code",
        code,
      }),
    });
    const data = (await tokenRes.json()) as {
      access_token?: string;
      refresh_token?: string;
      stripe_user_id?: string;
      stripe_publishable_key?: string;
      error?: string;
      error_description?: string;
    };
    if (!data.access_token || !data.stripe_user_id) {
      console.error("[stripe oauth] sin token:", data.error, data.error_description);
      return back("error_token");
    }

    await saveUserSecret(userId, "STRIPE_USER_TOKEN", data.access_token, "stripe");
    await saveUserSecret(userId, "STRIPE_ACCOUNT_ID", data.stripe_user_id, "stripe");
    if (data.refresh_token) {
      await saveUserSecret(userId, "STRIPE_REFRESH_TOKEN", data.refresh_token, "stripe");
    }
    if (data.stripe_publishable_key) {
      await saveUserSecret(userId, "STRIPE_PUBLISHABLE_KEY", data.stripe_publishable_key, "stripe");
    }

    return back("connected");
  } catch (e) {
    console.error("[stripe oauth] fallo:", e);
    return back("error_exchange");
  }
}
