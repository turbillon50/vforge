import { auth } from "@clerk/nextjs/server";
export const dynamic = "force-dynamic";
const T = "pnl_7Qx2Lm9Zt4Vb8RkW3eH";
const BRAIN = "http://178.105.135.26/brain/panel";
async function gated() {
  try { const a = await auth(); return !!a?.userId; } catch { return false; }
}
export async function GET() {
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
