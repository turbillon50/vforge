/**
 * GET /api/forja/ojo — cola de dispatch (Ensamblaje). Proxy owner-only al Ojo.
 */
import { isOwnerRequest, ojoGet } from "@/lib/forja/ojo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isOwnerRequest())) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }
  try {
    const r = await ojoGet("queue");
    const data = await r.json();
    return Response.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return Response.json(
      { error: "ojo_unreachable", detail: String(e).slice(0, 160) },
      { status: 502 },
    );
  }
}
