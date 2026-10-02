/**
 * GET /api/jarvis/sesion — abre una plática de voz con V (agente de ElevenLabs con manos y memoria de la casa).
 * Solo owner. Devuelve la URL firmada de ElevenLabs y el contexto vivo (recuerdos recientes y encargos).
 */
import { currentUser } from "@clerk/nextjs/server";
import { isOwnerUser } from "@/lib/auth/owner";
import { CASA_URL, firmarPase } from "@/lib/colectivo/pase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const H = { "Content-Type": "application/json", "Cache-Control": "no-store" };

export async function GET(): Promise<Response> {
  const user = await currentUser().catch(() => null);
  if (!user || !isOwnerUser(user)) return new Response(JSON.stringify({ ok: false, error: "solo_owner" }), { status: 403, headers: H });
  const email = user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress || "";
  const pase = firmarPase(email);
  if (!pase) return new Response(JSON.stringify({ ok: false, error: "sin_configurar" }), { status: 503, headers: H });
  try {
    const r = await fetch(`${CASA_URL}/jarvis/sesion`, { method: "POST", body: JSON.stringify({ pase }), headers: { "Content-Type": "application/json" }, cache: "no-store", signal: AbortSignal.timeout(30000) });
    const d = await r.json();
    if (!r.ok || !d.signedUrl) throw new Error(d.error || `HTTP ${r.status}`);
    return new Response(JSON.stringify({ ok: true, signedUrl: d.signedUrl, contexto: d.contexto || "", nombre: user.firstName || "Luis" }), { headers: H });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : "casa_sin_senal" }), { status: 502, headers: H });
  }
}
