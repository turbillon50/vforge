import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { saveUserSecret } from "@/lib/connect/user-vault";
import { getOperatorSecret } from "@/lib/vault/get-secret";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/auth/stripe/callback — Stripe regresa con ?code&state.
 * Intercambia el code por el stripe_user_id (la cuenta conectada) y un
 * access token; los guarda cifrados por usuario. NO mueve dinero.
 */
export async function GET(req: Request) {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://vforge.site";
  const { userId } = await auth();
  if (!userId) return Response.redirect(new URL("/sign-in", site), 302);

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errParam = url.searchParams.get("error");
  const jar = await cookies();
  const expected = jar.get("stripe_oauth_state")?.value;
  jar.delete("stripe_oauth_state");

  const back = (s: string) =>
    Response.redirect(`${site}/app/integrations?stripe=${s}`, 302);

  if (errParam) return back("error_denied");
  if (!code) return back("error_no_code");
  if (!state || !expected || state !== expected) return back("error_state");

  const secretKey = await getOperatorSecret("STRIPE_SECRET_KEY", {
    auditUserId: userId,
  });
  if (!secretKey) return back("error_no_secret");

  try {
    const res = await fetch("https://connect.stripe.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_secret: secretKey,
        code,
        grant_type: "authorization_code",
      }),
    });
    const data = (await res.json()) as {
      stripe_user_id?: string;
      access_token?: string;
      refresh_token?: string;
      error?: string;
      error_description?: string;
    };
    if (!data.stripe_user_id) {
      console.error("[stripe connect] sin stripe_user_id:", data.error, data.error_description);
      return back("error_token");
    }

    await saveUserSecret(userId, "STRIPE_CONNECTED_ACCOUNT", data.stripe_user_id, "stripe");
    if (data.access_token)
      await saveUserSecret(userId, "STRIPE_CONNECT_ACCESS_TOKEN", data.access_token, "stripe");
    if (data.refresh_token)
      await saveUserSecret(userId, "STRIPE_CONNECT_REFRESH_TOKEN", data.refresh_token, "stripe");

    return back("connected");
  } catch (e) {
    console.error("[stripe connect] fallo:", e);
    return back("error_exchange");
  }
}
