/**
 * GET /api/forja/ojo/log?id=N — log completo de un job (owner-only).
 */
import { isOwnerRequest, ojoGet } from "@/lib/forja/ojo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await isOwnerRequest())) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!id || Number.isNaN(id)) {
    return Response.json({ error: "id_invalido" }, { status: 400 });
  }
  try {
    const r = await ojoGet(`log?id=${id}`);
    const data = await r.json();
    return Response.json(data, {
      status: r.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return Response.json(
      { error: "ojo_unreachable", detail: String(e).slice(0, 160) },
      { status: 502 },
    );
  }
}
