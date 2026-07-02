/**
 * POST /api/forja/loop — una iteración del bucle ver→arreglar→verificar.
 * Body: { url, project_id }. Owner-only (mismo criterio que el resto de la Forja).
 *
 * Navega con Vulcano a `url`, lee lo que renderiza, y si detecta una falla
 * conocida, encola un fix en el Ojo con el texto observado como contexto.
 * No espera el fix: el caller debe volver a llamar este endpoint después
 * de que el job termine y la versión se republique (vía /api/builder
 * approve), para confirmar que ya quedó sano.
 */
import { isOwnerRequest } from "@/lib/forja/ojo";
import { runVerifyIteration } from "@/lib/forja/verify-loop";
import { safeHttpUrl } from "@/lib/forja/browser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!(await isOwnerRequest())) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }
  let body: { url?: string; project_id?: string } = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "json_invalido" }, { status: 400 });
  }
  const url = safeHttpUrl(body.url);
  if (!url) return Response.json({ error: "url_invalida" }, { status: 400 });
  const projectId = String(body.project_id ?? "").trim();
  if (!projectId) return Response.json({ error: "project_id_requerido" }, { status: 400 });

  const result = await runVerifyIteration(url, projectId);
  return Response.json(result, { status: result.ok ? 200 : 502 });
}
