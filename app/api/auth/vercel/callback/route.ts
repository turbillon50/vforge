import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { saveUserSecret } from "@/lib/connect/user-vault";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/auth/vercel/callback — Vercel regresa con ?code&state (y
 * configurationId, teamId). Intercambia code→access token y lo guarda
 * cifrado en el vault del usuario.
 */
export async function GET(req: Request) {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://vforge.site";
  const { userId } = await auth();
  if (!userId) return Response.redirect(new URL("/sign-in", site), 302);

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const configurationId = url.searchParams.get("configurationId");
  const teamId = url.searchParams.get("teamId");
  const jar = await cookies();
  const expected = jar.get("vc_oauth_state")?.value;
  jar.delete("vc_oauth_state");

  const back = (status: string) =>
    Response.redirect(`${site}/workspace/conexiones?vercel=${status}`, 302);

  if (!code) return back("error_no_code");
  // Vercel a veces no reenvía state en installs desde marketplace; si viene, validamos.
  if (state && expected && state !== expected) return back("error_state");

  const clientId = process.env.VERCEL_INTEGRATION_CLIENT_ID;
  const clientSecret = process.env.VERCEL_INTEGRATION_CLIENT_SECRET;
  if (!clientId || !clientSecret) return back("error_no_secret");

  try {
    const tokenRes = await fetch("https://api.vercel.com/v2/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: `${site}/api/auth/vercel/callback`,
      }),
    });
    const data = (await tokenRes.json()) as {
      access_token?: string;
      team_id?: string | null;
      error?: string;
    };
    if (!data.access_token) {
      console.error("[vercel oauth] sin access_token:", data.error);
      return back("error_token");
    }

    await saveUserSecret(userId, "VERCEL_USER_TOKEN", data.access_token, "vercel");
    const tid = data.team_id || teamId;
    if (tid) await saveUserSecret(userId, "VERCEL_TEAM_ID", tid, "vercel");
    if (configurationId)
      await saveUserSecret(userId, "VERCEL_CONFIGURATION_ID", configurationId, "vercel");

    return back("connected");
  } catch (e) {
    console.error("[vercel oauth] fallo:", e);
    return back("error_exchange");
  }
}
