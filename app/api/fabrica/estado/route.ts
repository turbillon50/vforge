/**
 * GET /api/fabrica/estado — estado vivo de la fábrica (solo owner).
 *
 * Lee el JSON que escribe el colector del Hetzner (Pulso · Unicorn 1.0) desde
 * PULSO_ESTADO_URL, del lado del servidor. El navegador nunca ve esa URL.
 * Solo lectura. Sin caché: cada llamada trae el estado del último minuto.
 */
import { currentUser } from "@clerk/nextjs/server";
import { isOwnerUser } from "@/lib/auth/owner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Content-Type": "application/json", "Cache-Control": "no-store" };

export async function GET(): Promise<Response> {
  let user: Awaited<ReturnType<typeof currentUser>> = null;
  try {
    user = await currentUser();
  } catch {
    user = null;
  }
  if (!isOwnerUser(user)) {
    return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: NO_STORE });
  }

  const url = process.env.PULSO_ESTADO_URL?.trim();
  if (!url) {
    return new Response(JSON.stringify({ error: "pulso_no_configurado" }), { status: 503, headers: NO_STORE });
  }

  try {
    const r = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!r.ok) {
      return new Response(JSON.stringify({ error: "pulso_http_" + r.status }), { status: 502, headers: NO_STORE });
    }
    const data: unknown = await r.json();
    return new Response(JSON.stringify(data), { status: 200, headers: NO_STORE });
  } catch (e) {
    const tipo = e instanceof Error ? e.name : "Error";
    return new Response(JSON.stringify({ error: "pulso_sin_senal", tipo }), { status: 502, headers: NO_STORE });
  }
}
