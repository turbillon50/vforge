/**
 * POST /api/forge/trio — columna V de la Sala de agentes, en streaming SSE.
 *
 * La página usa esta ruta sólo para V. Claude Code y Codex viven en el motor
 * vivo por /api/vivo/agente.
 *
 * Body: { agente: "v", projectId?: string|null,
 *         modo: "responder"|"replicar", intercambios: IntercambioTrio[] }
 * SSE:  data: {type:"meta",model} · {type:"text",value} · {type:"error",message} · {type:"done"}
 *
 * Sólo owner: el middleware ya protege /api/forge(.*) y aquí se re-verifica.
 * Sin herramientas para V. Claude Code y Codex salen por /api/vivo/agente.
 */
import { isOwnerRequest } from "@/lib/forja/ojo";
import { queryOne } from "@/lib/db/client";
import {
  contextoProyecto,
  esAgente,
  historialPara,
  MAX_INTERCAMBIOS,
  reglasDeLaMesa,
  type Agente,
  type IntercambioTrio,
  type ModoTrio,
  type ProyectoTrio,
  type RespuestaTrio,
} from "@/lib/trio/conversacion";
import {
  motorV,
  sistemaDeV,
  type EventoMotor,
} from "@/lib/trio/motores";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function texto(v: unknown, max = 20_000): string {
  return typeof v === "string" ? v.slice(0, max) : "";
}

function ronda(v: unknown): Partial<Record<Agente, RespuestaTrio>> {
  const salida: Partial<Record<Agente, RespuestaTrio>> = {};
  if (!v || typeof v !== "object") return salida;
  for (const [clave, valor] of Object.entries(v as Record<string, unknown>)) {
    if (!esAgente(clave) || !valor || typeof valor !== "object") continue;
    salida[clave] = { texto: texto((valor as { texto?: unknown }).texto) };
  }
  return salida;
}

/** Valida y normaliza lo que manda el cliente (nunca se confía en su forma). */
function leerIntercambios(v: unknown): IntercambioTrio[] | null {
  if (!Array.isArray(v) || v.length === 0) return null;
  const lista = v.slice(-MAX_INTERCAMBIOS).map((item, i): IntercambioTrio | null => {
    if (!item || typeof item !== "object") return null;
    const o = item as Record<string, unknown>;
    const pregunta = texto(o.pregunta).trim();
    if (!pregunta) return null;
    return {
      id: texto(o.id, 80) || `i${i}`,
      pregunta,
      respuestas: ronda(o.respuestas),
      replicas: o.replicas ? ronda(o.replicas) : null,
    };
  });
  return lista.every((x): x is IntercambioTrio => x !== null) ? lista : null;
}

async function cargarProyecto(id: string | null): Promise<ProyectoTrio | null> {
  if (!id) return null;
  try {
    return await queryOne<ProyectoTrio>(
      `SELECT id, name, description, category, status,
              github_repo, github_url, vercel_url, domain
         FROM projects WHERE id = $1`,
      [id],
    );
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  if (!(await isOwnerRequest())) return json({ error: "forbidden" }, 403);

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }

  const agente = body.agente;
  if (!esAgente(agente)) return json({ error: "agente debe ser claude, codex o v" }, 400);
  if (agente !== "v") {
    return json({ error: "Claude Code y Codex trabajan por /api/vivo/agente." }, 400);
  }
  const modo: ModoTrio = body.modo === "replicar" ? "replicar" : "responder";
  const intercambios = leerIntercambios(body.intercambios);
  if (!intercambios) return json({ error: "intercambios inválidos" }, 400);
  const projectId =
    typeof body.projectId === "string" && body.projectId.trim() ? body.projectId.trim() : null;

  const proyecto = await cargarProyecto(projectId);
  const reglas = `${reglasDeLaMesa(agente)}\n\n${contextoProyecto(proyecto)}`;
  const turnos = historialPara(agente, intercambios, modo);
  const ultimaPregunta = intercambios[intercambios.length - 1]?.pregunta ?? null;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (evento: Record<string, unknown>) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(evento)}\n\n`));
        } catch {
          // el cliente ya cerró
        }
      };
      try {
        let motor: AsyncGenerator<EventoMotor>;
        const sistema = await sistemaDeV(proyecto ? proyecto.id : null, ultimaPregunta, reglas);
        motor = motorV(sistema, turnos, req.signal);
        for await (const evento of motor) {
          if (evento.tipo === "modelo") send({ type: "meta", model: evento.valor });
          else send({ type: "text", value: evento.valor });
        }
        send({ type: "done" });
      } catch (err) {
        if (!req.signal.aborted) {
          const mensaje = err instanceof Error ? err.message : "El proveedor no respondió.";
          console.error(`[sala-agentes] ${agente} falló:`, mensaje);
          send({ type: "error", message: mensaje.slice(0, 400) });
        }
      } finally {
        try {
          controller.close();
        } catch {
          // ya cerrado
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
