export const dynamic = "force-dynamic";
const BRAIN = "http://178.105.135.26/brain/panel";
export async function GET() {
  try {
    const r = await fetch(`${BRAIN}/data`, { cache: "no-store" });
    return Response.json(await r.json());
  } catch (e) {
    return Response.json({ error: String(e), services: {}, items: [], pending: [] }, { status: 200 });
  }
}
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const url = body.action === "toggle" ? `${BRAIN}/toggle` : `${BRAIN}/add`;
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return Response.json(await r.json().catch(() => ({})));
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 200 });
  }
}
