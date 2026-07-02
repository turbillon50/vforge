/**
 * POST /api/forja/ojo/cancelar — cancela un job pending/running (owner-only). Body: { id }.
 */
import { isOwnerRequest, ojoPost } from "@/lib/forja/ojo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!(await isOwnerRequest())) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }
  let id: number | undefined;
  try {
    id = Number((await req.json())?.id);
  } catch {
    /* ignore */
  }
  if (!id || Number.isNaN(id)) {
    return Response.json({ error: "id_invalido" }, { status: 400 });
  }
  try {
    const r = await ojoPost("cancelar", { id });
    const data = await r.json();
    return Response.json(data, { status: r.status });
  } catch (e) {
    return Response.json(
      { error: "ojo_unreachable", detail: String(e).slice(0, 160) },
      { status: 502 },
    );
  }
}
