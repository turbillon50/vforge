/**
 * POST /api/vivo/edit — traduce una edición hecha sobre la vista previa a un
 * cambio en el código real del proyecto. Owner-only.
 *
 * El elemento llega como `src` ("archivo:linea:columna", puesto por vf-src-loader
 * mientras compila). El motor ubica ese mismo elemento en el archivo y cambia
 * sólo eso. Si no puede hacerlo con seguridad responde 422 con el motivo, y el
 * Estudio ofrece "dile a V" en lugar de escribir una barbaridad.
 */
import { isOwnerRequest } from "@/lib/forja/ojo";
import { editarVivo, type OperacionVivo } from "@/lib/vivo/cliente";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIPOS = new Set(["texto", "estilo", "clase"]);

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
    src?: unknown;
    operacion?: unknown;
  };

  const proyecto = String(datos.proyecto ?? "");
  const src = String(datos.src ?? "");
  if (!proyecto || !src) {
    return Response.json({ error: "Falta el proyecto o el elemento." }, { status: 400 });
  }

  const operacion = datos.operacion;
  if (!operacion || typeof operacion !== "object") {
    return Response.json({ error: "Falta la operación." }, { status: 400 });
  }
  const tipo = String((operacion as { tipo?: unknown }).tipo ?? "");
  if (!TIPOS.has(tipo)) {
    return Response.json({ error: `Operación no soportada: ${tipo}` }, { status: 400 });
  }

  try {
    const resultado = await editarVivo(proyecto, src, operacion as OperacionVivo);
    return Response.json(resultado, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    // 422: el motor sí respondió, pero ese cambio no se puede escribir a ciegas.
    return Response.json(
      { error: error instanceof Error ? error.message : "El motor vivo no respondió." },
      { status: 422 },
    );
  }
}
