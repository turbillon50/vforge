/**
 * GET  /api/forja/qa           — último QA por dominio (vadmin.qa_runs).
 * POST /api/forja/qa {dominio}  — corre un check HTTP del dominio y lo guarda.
 * Ambos owner-only; proxy server-side al Ojo (token inyectado del lado server).
 */
import { isOwnerRequest, OJO_BASE, OJO_TOKEN, ojoGet } from "@/lib/forja/ojo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isOwnerRequest())) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }
  try {
    const r = await ojoGet("qa");
    const data = await r.json();
    return Response.json(data, { headers: { "Cache-Control": "no-store" } });
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
    const r = await fetch(`${OJO_BASE}/qa`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: OJO_TOKEN, dominio }),
      signal: AbortSignal.timeout(20000),
    });
    const data = await r.json();
    return Response.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return Response.json(
      { error: "ojo_unreachable", detail: String(e).slice(0, 160) },
      { status: 502 },
    );
  }
}
