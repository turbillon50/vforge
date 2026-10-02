/** GET /api/jarvis/panel — encargos que V mandó al colectivo y cómo van (solo owner). */
import { currentUser } from "@clerk/nextjs/server";
import { isOwnerUser } from "@/lib/auth/owner";
import { CASA_URL, firmarPase } from "@/lib/colectivo/pase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const H = { "Content-Type": "application/json", "Cache-Control": "no-store" };

export async function GET(): Promise<Response> {
  const user = await currentUser().catch(() => null);
  if (!user || !isOwnerUser(user)) return new Response(JSON.stringify({ encargos: [] }), { status: 403, headers: H });
  const pase = firmarPase(user.primaryEmailAddress?.emailAddress || "");
  if (!pase) return new Response(JSON.stringify({ encargos: [] }), { status: 503, headers: H });
  try {
    const r = await fetch(`${CASA_URL}/jarvis/panel`, { method: "POST", body: JSON.stringify({ pase }), headers: { "Content-Type": "application/json" }, cache: "no-store", signal: AbortSignal.timeout(15000) });
    return new Response(JSON.stringify(await r.json()), { status: r.status, headers: H });
  } catch {
    return new Response(JSON.stringify({ encargos: [] }), { status: 502, headers: H });
  }
}
