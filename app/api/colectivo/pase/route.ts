/**
 * GET /api/colectivo/pase — pase de 60 s para abrir el chat del colectivo (glm.vforge.site)
 * dentro de VForge, con la sesión de Clerk. Solo owners. El navegador nunca ve el secreto:
 * recibe una URL firmada con HMAC (COLECTIVO_SECRET, compartido con la puerta del Hetzner).
 */
import { createHmac } from "node:crypto";
import { currentUser } from "@clerk/nextjs/server";
import { isOwnerUser } from "@/lib/auth/owner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Content-Type": "application/json", "Cache-Control": "no-store" };
const COLECTIVO_URL = process.env.COLECTIVO_URL || "https://glm.vforge.site";

const b64 = (b: Buffer) => b.toString("base64url");

export async function GET(): Promise<Response> {
  const secreto = process.env.COLECTIVO_SECRET;
  if (!secreto) {
    return new Response(JSON.stringify({ ok: false, error: "colectivo_sin_configurar" }), { status: 503, headers: NO_STORE });
  }
  const user = await currentUser().catch(() => null);
  if (!user || !isOwnerUser(user)) {
    return new Response(JSON.stringify({ ok: false, error: "solo_owner" }), { status: 403, headers: NO_STORE });
  }
  const email = (user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress || "").toLowerCase();
  const cuerpo = b64(Buffer.from(JSON.stringify({ e: email, x: Math.floor(Date.now() / 1000) + 60 })));
  const firma = b64(createHmac("sha256", secreto).update(cuerpo).digest());
  return new Response(JSON.stringify({ ok: true, url: `${COLECTIVO_URL}/__entrar?t=${cuerpo}.${firma}` }), { headers: NO_STORE });
}
