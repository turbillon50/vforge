import { auth } from "@clerk/nextjs/server";
import { resolveAccess } from "@/lib/connect/resolve-token";
export const dynamic = "force-dynamic";
const T = "pnl_7Qx2Lm9Zt4Vb8RkW3eH";
const BRAIN = "http://178.105.135.26/brain/panel";
async function gated() {
  try { const a = await auth(); return !!a?.userId; } catch { return false; }
}
export async function GET() {
  const __access = await resolveAccess();
  if (!__access.userId) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  if (!__access.isOwner) return new Response(JSON.stringify({ ok: true, data: null }), { status: 200, headers: { "Content-Type": "application/json" } });

  if (!(await gated())) return new Response("Unauthorized", { status: 401 });
  try { const r = await fetch(`${BRAIN}/data?k=${T}`, { cache: "no-store" }); return Response.json(await r.json()); }
  catch (e) { return Response.json({ error: String(e), services: {}, items: [], pending: [] }); }
}
export async function POST(req: Request) {
  if (!(await gated())) return new Response("Unauthorized", { status: 401 });
  try {
    const body = await req.json();
    const url = body.action === "toggle" ? `${BRAIN}/toggle?k=${T}` : `${BRAIN}/add?k=${T}`;
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return Response.json(await r.json().catch(() => ({})));
  } catch (e) { return Response.json({ error: String(e) }); }
}
