import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/clerk-reset — rompe la colisión de cookies de instancias Clerk:
 * expira TODAS las cookies de sesión Clerk (con y sin sufijo) y manda a
 * /sign-in para una sesión limpia. Útil cuando el server no ve la sesión
 * aunque el cliente cree estar logueado (bucle /app ↔ /sign-in).
 */
export async function GET(req: Request) {
  const jar = await cookies();
  const all = jar.getAll();
  for (const c of all) {
    if (/^__session|^__client_uat|^__clerk|^__refresh/.test(c.name)) {
      // Expira en este host y en el dominio padre .vforge.site
      jar.set(c.name, "", { maxAge: 0, path: "/" });
    }
  }
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://vforge.site";
  const res = Response.redirect(`${site}/sign-in?reset=1`, 302);
  // Refuerzo: cabeceras Set-Cookie para el dominio padre (.vforge.site)
  const names = ["__session", "__client_uat", "__session_3G0LOQfI", "__client_uat_3G0LOQfI"];
  const headers = new Headers(res.headers);
  for (const n of names) {
    headers.append("Set-Cookie", `${n}=; Path=/; Domain=.vforge.site; Max-Age=0; Secure; SameSite=Lax`);
  }
  return new Response(null, { status: 302, headers });
}
