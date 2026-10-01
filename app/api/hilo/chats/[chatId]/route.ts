import { hiloSqlListo } from "@/lib/hilo/server";
import { resolveRequestOwner } from "@/lib/auth/request-owner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(error: string, status: number) {
  return Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

async function requireOwner() {
  const access = await resolveRequestOwner();
  if (!access.userId) return { response: jsonError("unauthorized", 401), access };
  if (!access.isOwner) return { response: jsonError("forbidden", 403), access };
  return { response: null, access };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ chatId: string }> },
) {
  const { response, access } = await requireOwner();
  if (response) return response;

  const { chatId } = await params;
  const body = (await request.json().catch(() => null)) as
    | { etiqueta?: unknown; monitorear?: unknown }
    | null;
  if (!body || typeof body !== "object") return jsonError("JSON invalido", 400);

  const updatesEtiqueta = Object.prototype.hasOwnProperty.call(body, "etiqueta");
  const updatesMonitorear = Object.prototype.hasOwnProperty.call(body, "monitorear");
  if (!updatesEtiqueta && !updatesMonitorear) {
    return jsonError("Nada que actualizar", 400);
  }
  if (updatesEtiqueta && body.etiqueta !== null && typeof body.etiqueta !== "string") {
    return jsonError("etiqueta debe ser texto o null", 400);
  }
  if (updatesMonitorear && typeof body.monitorear !== "boolean") {
    return jsonError("monitorear debe ser boolean", 400);
  }

  const etiqueta =
    updatesEtiqueta && typeof body.etiqueta === "string"
      ? body.etiqueta.trim().slice(0, 80) || null
      : null;
  const monitorear = updatesMonitorear ? Boolean(body.monitorear) : false;
  const sql = await hiloSqlListo();

  const rows = (await sql.query(
    `UPDATE hilo_chats
        SET etiqueta = CASE WHEN $2::boolean THEN $3::text ELSE etiqueta END,
            monitorear = CASE WHEN $4::boolean THEN $5::boolean ELSE monitorear END
      WHERE id = $1
      RETURNING id, linea, chat_id, chat_nombre, etiqueta, project_id, monitorear, origen`,
    [chatId, updatesEtiqueta, etiqueta, updatesMonitorear, monitorear],
  )) as Array<{
    id: string;
    linea: string | null;
    chat_id: string | null;
    chat_nombre: string;
    etiqueta: string | null;
    project_id: string;
    monitorear: boolean;
    origen: "zip" | "vivo";
  }>;

  const chat = rows[0];
  if (!chat) return jsonError("chat not found", 404);

  await sql.query(
    `INSERT INTO audit_events (user_id, action, resource_type, resource_id, ring, payload)
     VALUES ($1, 'hilo.chat.update', 'hilo_chat', $2, 1, $3::jsonb)`,
    [
      access.userId,
      chat.id,
      JSON.stringify({
        project_id: chat.project_id,
        etiqueta: updatesEtiqueta ? chat.etiqueta : undefined,
        monitorear: updatesMonitorear ? chat.monitorear : undefined,
      }),
    ],
  );

  return Response.json({ chat }, { headers: { "Cache-Control": "no-store" } });
}
