/**
 * GET /api/fabrica/estado — estado vivo de la fábrica (solo owner).
 *
 * Dos lecturas del colector del Hetzner, del lado del servidor (el navegador
 * nunca ve la URL):
 *   - estado.json   (cada minuto): servicios, V-Trading, Brain, feed de eventos
 *   - trabajos.json (cada 10 s):   lo que está pasando ahora — cola, agentes,
 *                                   motor vivo y tokens del día
 * `?solo=ahora` trae sólo la parte rápida, para refrescar cada pocos segundos.
 */
import { currentUser } from "@clerk/nextjs/server";
import { isOwnerUser } from "@/lib/auth/owner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Content-Type": "application/json", "Cache-Control": "no-store" };

async function leer(url: string): Promise<{ ok: true; datos: unknown } | { ok: false; error: string }> {
  try {
    const r = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!r.ok) return { ok: false, error: "pulso_http_" + r.status };
    return { ok: true, datos: await r.json() };
  } catch (e) {
    return { ok: false, error: "pulso_sin_senal_" + (e instanceof Error ? e.name : "Error") };
  }
}

export async function GET(request: Request): Promise<Response> {
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
  const urlAhora = url.replace(/estado\.json(\?.*)?$/, "trabajos.json");
  const solo = new URL(request.url).searchParams.get("solo");

  if (solo === "ahora") {
    const a = await leer(urlAhora);
    if (!a.ok) return new Response(JSON.stringify({ error: a.error }), { status: 502, headers: NO_STORE });
    return new Response(JSON.stringify({ ahora: a.datos }), { status: 200, headers: NO_STORE });
  }

  const [e, a] = await Promise.all([leer(url), urlAhora !== url ? leer(urlAhora) : Promise.resolve(null)]);
  if (!e.ok) return new Response(JSON.stringify({ error: e.error }), { status: 502, headers: NO_STORE });
  const cuerpo = { ...(e.datos as Record<string, unknown>), ahora: a && a.ok ? a.datos : null };
  return new Response(JSON.stringify(cuerpo), { status: 200, headers: NO_STORE });
}
