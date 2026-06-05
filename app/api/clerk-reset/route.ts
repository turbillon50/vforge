import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/clerk-reset — rompe la colisión de cookies Clerk (instancias
 * múltiples). Expira TODAS las cookies de sesión Clerk en sus dos variantes
 * (host-only en vforge.site y dominio padre .vforge.site) y manda a /sign-in.
 */
export async function GET() {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://vforge.site";
  const res = NextResponse.redirect(`${site}/sign-in?reset=1`, 302);

  const jar = await cookies();
  const names = new Set<string>();
  for (const c of jar.getAll()) {
    if (/^__session|^__client_uat|^__clerk|^__refresh/.test(c.name)) names.add(c.name);
  }
  // Por si alguna no llegó en este request, incluimos las conocidas.
  ["__session", "__client_uat", "__session_3G0LOQfI", "__client_uat_3G0LOQfI", "clerk_active_context"].forEach((n) => names.add(n));

  for (const name of names) {
    // host-only
    res.cookies.set(name, "", { maxAge: 0, path: "/" });
    // dominio padre
    res.headers.append(
      "Set-Cookie",
      `${name}=; Path=/; Domain=.vforge.site; Max-Age=0; Secure; SameSite=Lax`,
    );
  }
  return res;
}
