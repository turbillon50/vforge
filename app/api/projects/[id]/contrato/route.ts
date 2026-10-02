import { resolveRequestOwner } from "@/lib/auth/request-owner";
import { montoDe, pedirContratoLutor } from "@/lib/embudo/contrato";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Pide a LUTOR el contrato de desarrollo del proyecto y deja el expediente en "Contrato enviado". */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await resolveRequestOwner();
  if (!access.userId) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!access.isOwner) return Response.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;
  const body = ((await req.json().catch(() => ({}))) ?? {}) as Record<string, unknown>;
  const result = await pedirContratoLutor({
    projectId: id,
    montoTotal: montoDe(body.monto_total),
    anticipo: montoDe(body.anticipo),
    notas: typeof body.notas === "string" ? body.notas : null,
    modulos: Array.isArray(body.modulos) ? body.modulos.filter((m): m is string => typeof m === "string") : undefined,
    ciudad: typeof body.ciudad === "string" ? body.ciudad : null,
    creadoPor: access.userId,
  });
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
  return Response.json(result);
}
