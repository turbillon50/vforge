/**
 * GET  /api/forja/qa            — último QA por dominio.
 * POST /api/forja/qa {dominio} — corre un check y guarda el resultado.
 * Ambos owner-only; el token se inyecta server-side en X-Ojo-Token.
 */
import { isOwnerRequest, ojoGet, ojoPost } from "@/lib/forja/ojo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

export async function GET() {
  if (!(await isOwnerRequest())) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }
  try {
    const r = await ojoGet("qa");
    const data = await r.json();
    return Response.json(data, { status: r.status, headers: noStore });
  } catch (e) {
    return Response.json(
      { error: "ojo_unreachable", detail: String(e).slice(0, 160) },
      { status: 502 },
    );
  }
}

export async function POST(req: Request) {
  if (!(await isOwnerRequest())) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { dominio?: string };
  const dominio = String(body.dominio ?? "").trim();
  if (!dominio) {
    return Response.json({ error: "dominio_requerido" }, { status: 400 });
  }

  try {
    const r = await ojoPost("qa", { dominio });
    const data = await r.json();
    return Response.json(data, { status: r.status, headers: noStore });
  } catch (e) {
    return Response.json(
      { error: "ojo_unreachable", detail: String(e).slice(0, 160) },
      { status: 502 },
    );
  }
}
