/**
 * /api/vivo/encargo — encargos de V sobre el preview vivo. Owner-only.
 *
 *   POST { proyecto, pedido, elemento:{src,etiqueta,texto} } → encola el encargo
 *   GET  ?proyecto=<nombre>                                  → últimos encargos
 *
 * V redacta el encargo (con el elemento, las reglas y lo que ya aprendió del
 * proyecto) y el agente lo hace encerrado en el worktree vivo; nunca hay deploy.
 */
import { isOwnerRequest } from "@/lib/forja/ojo";
import { encargarVivo, listarEncargos } from "@/lib/vivo/cliente";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };
const NOMBRE = /^[a-z0-9][a-z0-9-]{1,62}$/;
const SRC = /^[A-Za-z0-9_./@()[\]+-]{1,300}:\d{1,6}(:\d{1,6})?$/;

export async function GET(request: Request) {
  if (!(await isOwnerRequest())) return Response.json({ error: "forbidden" }, { status: 403 });
  const proyecto = new URL(request.url).searchParams.get("proyecto") ?? "";
  if (!NOMBRE.test(proyecto)) return Response.json({ error: "Proyecto inválido." }, { status: 400 });
  try {
    const r = await listarEncargos(proyecto);
    return Response.json(r, { headers: NO_STORE });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "El motor vivo no respondió." },
      { status: 502, headers: NO_STORE },
    );
  }
}

export async function POST(request: Request) {
  if (!(await isOwnerRequest())) return Response.json({ error: "forbidden" }, { status: 403 });
  let cuerpo: Record<string, unknown>;
  try {
    cuerpo = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }
  const proyecto = String(cuerpo?.proyecto ?? "");
  const pedido = String(cuerpo?.pedido ?? "").trim().slice(0, 2000);
  const el = (cuerpo?.elemento ?? {}) as Record<string, unknown>;
  const src = String(el.src ?? "");
  if (!NOMBRE.test(proyecto)) return Response.json({ error: "Proyecto inválido." }, { status: 400 });
  if (pedido.length < 3) return Response.json({ error: "Escribe qué quieres que se haga." }, { status: 400 });
  if (src.includes("..") || !SRC.test(src)) {
    return Response.json({ error: "El elemento no trae archivo y línea." }, { status: 400 });
  }
  try {
    const r = await encargarVivo(proyecto, pedido, {
      src,
      etiqueta: String(el.etiqueta ?? "").slice(0, 40),
      texto: String(el.texto ?? "").slice(0, 300),
    });
    return Response.json(r, { status: 202, headers: NO_STORE });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "El motor vivo no respondió." },
      { status: 502, headers: NO_STORE },
    );
  }
}
