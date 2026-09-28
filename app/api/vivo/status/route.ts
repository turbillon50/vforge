/**
 * GET /api/vivo/status — qué proyectos están vivos, en qué slot y desde cuándo.
 * Owner-only.
 */
import { isOwnerRequest } from "@/lib/forja/ojo";
import { estadoVivo } from "@/lib/vivo/cliente";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isOwnerRequest())) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }
  try {
    const estado = await estadoVivo();
    return Response.json(estado, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json(
      {
        error: "motor_inalcanzable",
        detalle: error instanceof Error ? error.message.slice(0, 200) : "sin detalle",
      },
      { status: 502 },
    );
  }
}
