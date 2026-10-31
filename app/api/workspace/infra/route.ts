import { currentPersonalActor, resolvePersonalSpace } from "@/lib/workspace/personal";
import { loadInfrastructure } from "@/lib/infra/server";
import { projectPersonalInfrastructure } from "@/lib/infra/personal-projection";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const actor = await currentPersonalActor();
  if (!actor) return Response.json({ error: "unauthorized" }, { status: 401 });
  try {
    const space = await resolvePersonalSpace(actor, new URL(req.url).searchParams.get("space"));
    if (!space) return Response.json({ error: "Espacio no disponible" }, { status: 404 });
    const { snapshot, stale } = await loadInfrastructure();
    const data = projectPersonalInfrastructure(snapshot, space);
    if (!data) return Response.json({ error: "Sin lectura de esta casa" }, { status: 503 });
    return Response.json({ ...data, stale }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return Response.json({ error: "No se pudo verificar la infraestructura" }, { status: 502 });
  }
}
