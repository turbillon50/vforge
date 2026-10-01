/**
 * /api/vivo/agente — puente owner-only hacia Claude Code/Codex reales en el
 * motor vivo. El stream sale normalizado desde vf-vivo.
 */
import { isOwnerRequest } from "@/lib/forja/ojo";
import { agenteVivo, type AgenteVivo } from "@/lib/vivo/cliente";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 1200;

const NO_STORE = { "Cache-Control": "no-store" };
const NOMBRE = /^[a-z0-9][a-z0-9-]{1,62}$/;
const SESION = /^[A-Za-z0-9._:@/-]{1,200}$/;

function esAgente(valor: unknown): valor is AgenteVivo {
  return valor === "claude" || valor === "codex";
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
  const agente = cuerpo?.agente;
  const mensaje = String(cuerpo?.mensaje ?? "").trim().slice(0, 30_000);
  const sesion = typeof cuerpo?.sesion === "string" && cuerpo.sesion.trim() ? cuerpo.sesion.trim() : null;

  if (!NOMBRE.test(proyecto)) return Response.json({ error: "Proyecto inválido." }, { status: 400 });
  if (!esAgente(agente)) return Response.json({ error: "Agente inválido." }, { status: 400 });
  if (!mensaje) return Response.json({ error: "Escribe un mensaje para el agente." }, { status: 400 });
  if (sesion && !SESION.test(sesion)) return Response.json({ error: "Sesión inválida." }, { status: 400 });

  try {
    const respuesta = await agenteVivo(proyecto, agente, mensaje, sesion, request.signal);
    if (!respuesta.ok || !respuesta.body) {
      const datos = (await respuesta.json().catch(() => null)) as { error?: string } | null;
      return Response.json(
        { error: datos?.error ?? `El motor vivo respondió HTTP ${respuesta.status}.` },
        { status: respuesta.status === 409 ? 409 : 502, headers: NO_STORE },
      );
    }
    return new Response(respuesta.body, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-store, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "El motor vivo no respondió." },
      { status: 502, headers: NO_STORE },
    );
  }
}
