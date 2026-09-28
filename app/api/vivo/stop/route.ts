/**
 * POST /api/vivo/stop — apaga el servidor vivo de un proyecto a mano. Owner-only.
 * (El motor también lo apaga solo tras 20 min sin uso.)
 */
import { isOwnerRequest } from "@/lib/forja/ojo";
import { detenerVivo } from "@/lib/vivo/cliente";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!(await isOwnerRequest())) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }

  const proyecto =
    cuerpo && typeof cuerpo === "object" && "proyecto" in cuerpo
      ? String((cuerpo as { proyecto: unknown }).proyecto ?? "")
      : "";
  if (!proyecto) {
    return Response.json({ error: "Falta el nombre del proyecto." }, { status: 400 });
  }

  try {
    await detenerVivo(proyecto);
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "El motor vivo no respondió." },
      { status: 502 },
    );
  }
}
