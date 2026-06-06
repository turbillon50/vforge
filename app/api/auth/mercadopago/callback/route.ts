import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { exchangeMpCode, persistMpTokens } from "@/lib/connect/mercadopago";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/auth/mercadopago/callback — MP regresa con ?code&state.
 * Intercambia el code por los tokens del vendedor y los guarda cifrados por
 * usuario (incluyendo collector_id y public_key). NO mueve dinero.
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
  const expected = jar.get("mp_oauth_state")?.value;
  const verifier = jar.get("mp_pkce_verifier")?.value;
  jar.delete("mp_oauth_state");
  jar.delete("mp_pkce_verifier");

  const back = (s: string) => Response.redirect(`${site}/app/integrations?mp=${s}`, 302);

  if (errParam) return back("error_denied");
  if (!code) return back("error_no_code");
  if (!state || !expected || state !== expected) return back("error_state");

  try {
    const tokens = await exchangeMpCode(
      code,
      `${site}/api/auth/mercadopago/callback`,
      verifier,
    );
    if (!tokens.access_token) {
      console.error("[mp connect] sin access_token:", tokens.error, tokens.message);
      return back("error_token");
    }
    await persistMpTokens(userId, tokens);
    return back("connected");
  } catch (e) {
    console.error("[mp connect] fallo:", e);
    return back("error_exchange");
  }
}
