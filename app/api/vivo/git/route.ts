/**
 * POST /api/vivo/git — control del preview vivo: historial, deshacer, comparar
 * antes/después y publicar. Owner-only.
 *
 * `publicar` es la única acción que toca la rama de producción (y por eso va
 * aparte del resto del flujo de edición).
 */
import { isOwnerRequest } from "@/lib/forja/ojo";
import { gitVivo, type AccionGit } from "@/lib/vivo/cliente";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACCIONES = new Set<AccionGit>([
  "estado",
  "historial",
  "comparar",
  "commit",
  "deshacer",
  "publicar",
]);

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
  if (!cuerpo || typeof cuerpo !== "object") {
    return Response.json({ error: "Falta el cuerpo." }, { status: 400 });
  }

  const datos = cuerpo as {
    proyecto?: unknown;
    accion?: unknown;
    sha?: unknown;
    mensaje?: unknown;
    limite?: unknown;
  };

  const proyecto = String(datos.proyecto ?? "");
  const accion = String(datos.accion ?? "") as AccionGit;
  if (!proyecto) return Response.json({ error: "Falta el proyecto." }, { status: 400 });
  if (!ACCIONES.has(accion)) {
    return Response.json({ error: `Acción no soportada: ${accion}` }, { status: 400 });
  }

  const extra: Record<string, unknown> = {};
  if (typeof datos.sha === "string") extra.sha = datos.sha;
  if (typeof datos.mensaje === "string") extra.mensaje = datos.mensaje;
  if (typeof datos.limite === "number") extra.limite = datos.limite;

  try {
    const resultado = await gitVivo(proyecto, accion, extra);
    return Response.json(resultado, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "El motor vivo no respondió." },
      { status: 409 },
    );
  }
}
