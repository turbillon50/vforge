import { hiloSqlListo } from "@/lib/hilo/server";
import { resolveRequestOwner } from "@/lib/auth/request-owner";
import { queryOne } from "@/lib/db/client";
import { setProjectEtapa } from "@/lib/projects/etapas-server";
import { ensureProjectCarteraSchema } from "@/lib/projects/repository-schema";
import { importarZipWhatsApp } from "@/servicios/hilo/importar-zip.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_ZIP_BYTES = 50 * 1024 * 1024;

function jsonError(error: string, status: number) {
  return Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

async function requireOwner() {
  const access = await resolveRequestOwner();
  if (!access.userId) return { response: jsonError("unauthorized", 401), access };
  if (!access.isOwner) return { response: jsonError("forbidden", 403), access };
  return { response: null, access };
}

function readString(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function looksLikeZip(file: File, bytes: Uint8Array) {
  const nameOk = file.name.toLowerCase().endsWith(".zip");
  const typeOk =
    !file.type ||
    file.type === "application/zip" ||
    file.type === "application/octet-stream" ||
    file.type === "application/x-zip-compressed" ||
    file.type === "multipart/x-zip";
  const magicOk = bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b;
  return nameOk && typeOk && magicOk;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { response, access } = await requireOwner();
  if (response) return response;

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > MAX_ZIP_BYTES + 1024 * 1024) {
    return jsonError("El ZIP supera 50 MB", 413);
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return jsonError("Se esperaba multipart/form-data", 415);
  }

  const { projectId } = await params;
  const form = await request.formData().catch(() => null);
  if (!form) return jsonError("Formulario invalido", 400);

  const file = form.get("file") ?? form.get("zip") ?? form.get("chat");
  if (!(file instanceof File) || file.size === 0) {
    return jsonError("Sube un archivo ZIP en el campo file", 400);
  }
  if (file.size > MAX_ZIP_BYTES) {
    return jsonError("El ZIP supera 50 MB", 413);
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  if (!looksLikeZip(file, bytes)) {
    return jsonError("El archivo debe ser .zip valido", 400);
  }

  const sql = await hiloSqlListo();
  const projects = (await sql.query(
    `SELECT id, name FROM projects WHERE id = $1 LIMIT 1`,
    [projectId],
  )) as Array<{ id: string; name: string }>;
  const project = projects[0];
  if (!project) return jsonError("project not found", 404);

  let parsed: Awaited<ReturnType<typeof importarZipWhatsApp>>;
  try {
    parsed = await importarZipWhatsApp(bytes, {
      projectId,
      filename: file.name,
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : String(error), 400);
  }

  if (parsed.messages.length === 0) {
    return jsonError("El TXT no trae mensajes reconocibles de WhatsApp", 400);
  }

  const etiqueta = readString(form, "etiqueta").slice(0, 80) || null;

  const chatRows = (await sql.query(
    `INSERT INTO hilo_chats (
       id, linea, chat_id, chat_nombre, etiqueta, project_id, monitorear, origen
     )
     VALUES ($1, NULL, $2, $3, $4, $5, false, 'zip')
     ON CONFLICT (id) DO UPDATE SET
       chat_nombre = EXCLUDED.chat_nombre,
       etiqueta = COALESCE(EXCLUDED.etiqueta, hilo_chats.etiqueta),
       project_id = EXCLUDED.project_id,
       chat_id = COALESCE(hilo_chats.chat_id, EXCLUDED.chat_id)
     RETURNING id, linea, chat_id, chat_nombre, etiqueta, project_id, monitorear, origen`,
    [
      parsed.chat.id,
      parsed.chat.chat_id,
      parsed.chat.chat_nombre,
      etiqueta,
      projectId,
    ],
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

  let nuevos = 0;
  let repetidos = 0;
  for (const message of parsed.messages) {
    const raw = {
      ...message.raw,
      source_filename: file.name,
      source_text_file: parsed.textFile.name,
      hilo_chat_id: parsed.chat.id,
    };
    const rows = (await sql.query(
      `INSERT INTO hilo_mensajes (
         uid, linea, chat_id, chat_nombre, es_grupo, autor, de_mi, tipo, texto,
         ts, id_wa, media_ref, media_tipo, origen, hilo_chat_id, raw
       )
       VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9,
         $10::timestamptz, $11, $12, $13, 'zip', $14, $15::jsonb
       )
       ON CONFLICT (uid) DO NOTHING
       RETURNING uid`,
      [
        message.uid,
        message.linea,
        message.chat_id,
        message.chat_nombre,
        message.es_grupo,
        message.autor,
        message.de_mi,
        message.tipo,
        message.texto,
        message.ts,
        message.id_wa,
        message.media_ref,
        message.media_tipo,
        parsed.chat.id,
        JSON.stringify(raw),
      ],
    )) as Array<{ uid: string }>;
    if (rows.length) nuevos += 1;
    else repetidos += 1;
  }

  // Si el mismo mensaje (autor + texto) ya estaba con otra hora, es una importación vieja
  // con la fecha mal leída (día/mes vs mes/día): se queda la versión nueva y se quita la vieja.
  const corregidos = (await sql.query(
    `DELETE FROM hilo_mensajes
      WHERE hilo_chat_id = $1
        AND origen = 'zip'
        AND NOT (uid = ANY($2::text[]))
        AND (COALESCE(autor, '') || '|' || COALESCE(texto, '')) = ANY($3::text[])
      RETURNING uid`,
    [
      parsed.chat.id,
      parsed.messages.map((m) => m.uid),
      parsed.messages.map((m) => `${m.autor ?? ""}|${m.texto ?? ""}`),
    ],
  )) as Array<{ uid: string }>;
  if (corregidos.length) nuevos = Math.max(0, nuevos - corregidos.length);

  await sql.query(
    `INSERT INTO audit_events (user_id, action, resource_type, resource_id, ring, payload)
     VALUES ($1, 'hilo.zip.import', 'project', $2, 1, $3::jsonb)`,
    [
      access.userId,
      projectId,
      JSON.stringify({
        project_name: project.name,
        chat_id: parsed.chat.id,
        chat_nombre: parsed.chat.chat_nombre,
        filename: file.name,
        bytes: file.size,
        text_file: parsed.textFile.name,
        adjuntos: parsed.attachments.length,
        mensajes_nuevos: nuevos,
        mensajes_repetidos: repetidos,
      }),
    ],
  );

  let etapaActualizada: string | null = null;
  if (nuevos > 0) {
    try {
      await ensureProjectCarteraSchema();
      const current = await queryOne<{ etapa: string | null }>(
        `SELECT etapa FROM projects WHERE id = $1 LIMIT 1`,
        [projectId],
      );
      if (current?.etapa === "prospecto") {
        const etapa = await setProjectEtapa({
          projectId,
          etapa: "chat_cargado",
          nota: `Primer chat cargado desde ${file.name}.`,
          creadoPor: access.userId,
        });
        if (etapa?.changed) etapaActualizada = "chat_cargado";
      }
    } catch {
      etapaActualizada = null;
    }
  }

  return Response.json(
    {
      chat_detectado: chatRows[0],
      participantes: parsed.participants,
      rango_fechas: parsed.range,
      mensajes: {
        nuevos,
        repetidos,
        total: parsed.messages.length,
      },
      adjuntos: parsed.attachments,
      etapa_actualizada: etapaActualizada,
    },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  );
}
