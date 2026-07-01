/**
 * GET /api/forja/estado — salud en vivo del mesh (cerebras/gpu/v/mesh + jobs).
 * Proxy server-side al Ojo de Vulcano; owner-only. El token queda del lado server.
 */
import { isOwnerRequest, ojoGet } from "@/lib/forja/ojo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isOwnerRequest())) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }
  try {
    const r = await ojoGet("estado");
    const data = await r.json();
    return Response.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return Response.json(
      { error: "ojo_unreachable", detail: String(e).slice(0, 160) },
      { status: 502 },
    );
  }
}
