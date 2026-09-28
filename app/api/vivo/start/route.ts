/**
 * POST /api/vivo/start — enciende el servidor vivo de un proyecto y devuelve la
 * URL de entrada (con token corto) para el iframe del Estudio. Owner-only.
 */
import { isOwnerRequest } from "@/lib/forja/ojo";
import { arrancarVivo } from "@/lib/vivo/cliente";

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
    const arranque = await arrancarVivo(proyecto);
    return Response.json(arranque, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "El motor vivo no respondió." },
      { status: 502 },
    );
  }
}
