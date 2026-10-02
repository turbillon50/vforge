import { resolveRequestOwner } from "@/lib/auth/request-owner";
import { hiloSqlListo } from "@/lib/hilo/server";
import { analizarSenalCliente } from "@/lib/hilo/senales";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Señales del cliente detectadas en sus chats en vivo (más recientes primero). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await resolveRequestOwner();
  if (!access.userId) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!access.isOwner) return Response.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;
  const sql = await hiloSqlListo();
  const senales = await sql.query(
    `SELECT id, tipo, titulo, detalle, prioridad, estado, raw, created_at, mensaje_hasta
       FROM hilo_hallazgos
      WHERE project_id = $1 AND raw->>'origen' = 'senales_cliente'
      ORDER BY created_at DESC
      LIMIT 10`,
    [id],
  );
  const vivos = await sql.query(
    `SELECT count(*)::int AS n, max(ts) AS ultimo FROM hilo_mensajes m
      WHERE m.origen = 'vivo' AND m.hilo_chat_id IN (SELECT id FROM hilo_chats WHERE project_id = $1)`,
    [id],
  );
  return Response.json({ senales, vivos: vivos[0] ?? null }, { headers: { "Cache-Control": "no-store" } });
}

/** Analiza ahora los chats del proyecto que se siguen en vivo (también sirve con chats importados por ZIP). */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await resolveRequestOwner();
  if (!access.userId) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!access.isOwner) return Response.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;
  const sql = await hiloSqlListo();
  const chats = (await sql.query(
    `SELECT id FROM hilo_chats WHERE project_id = $1 AND monitorear = true`,
    [id],
  )) as Array<{ id: string }>;
  if (!chats.length) return Response.json({ error: "Enciende “Seguir en vivo” en algún chat del proyecto." }, { status: 409 });
  const resultados = [];
  for (const chat of chats) resultados.push(await analizarSenalCliente(chat.id));
  return Response.json({ ok: true, resultados });
}
