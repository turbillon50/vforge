/**
 * GET /api/colectivo/pase — pase de 60 s para abrir el chat del colectivo (glm.vforge.site) dentro de VForge,
 * con la sesión de Clerk. Solo owners. El navegador recibe una URL firmada, nunca el secreto.
 */
import { currentUser } from "@clerk/nextjs/server";
import { isOwnerUser } from "@/lib/auth/owner";
import { CASA_URL, firmarPase } from "@/lib/colectivo/pase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Content-Type": "application/json", "Cache-Control": "no-store" };

export async function GET(): Promise<Response> {
  const user = await currentUser().catch(() => null);
  if (!user || !isOwnerUser(user)) {
    return new Response(JSON.stringify({ ok: false, error: "solo_owner" }), { status: 403, headers: NO_STORE });
  }
  const email = user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress || "";
  const pase = firmarPase(email);
  if (!pase) return new Response(JSON.stringify({ ok: false, error: "colectivo_sin_configurar" }), { status: 503, headers: NO_STORE });
  return new Response(JSON.stringify({ ok: true, url: `${CASA_URL}/__entrar?t=${pase}` }), { headers: NO_STORE });
}
