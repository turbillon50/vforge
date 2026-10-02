import { createHmac, timingSafeEqual } from "node:crypto";
import { after } from "next/server";
import { hiloSqlListo } from "@/lib/hilo/server";
import { analizarSenalCliente } from "@/lib/hilo/senales";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Evento = {
  account_label?: string;
  chat_key?: string;
  chat_label?: string;
  event_id?: string;
  sender?: string;
  from_me?: boolean | null;
  text?: string;
  timestamp?: string;
  tipo?: string;
  is_group?: boolean | null;
  media?: { name?: string; unavailable?: boolean } | null;
};

const TIPOS: Record<string, string> = { texto: "texto", imagen: "imagen", audio: "audio", documento: "documento" };

function normal(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Mensajes en vivo de las dos líneas de WhatsApp de Luis, reenviados por TRAMA.
 * Sólo se guardan los de chats ligados a un proyecto (expediente); el resto se ignora.
 */
export async function POST(req: Request) {
  const secret = process.env.VFORGE_HILO_INGEST_SECRET;
  if (!secret || secret.length < 32) return Response.json({ error: "unconfigured" }, { status: 503 });
  const raw = await req.text();
  if (Buffer.byteLength(raw) > 300_000) return new Response("Too large", { status: 413 });
  const time = req.headers.get("x-vforge-time") ?? "";
  const sig = req.headers.get("x-vforge-signature") ?? "";
  if (
    !/^\d{10}$/.test(time) ||
    Math.abs(Date.now() / 1000 - Number(time)) > 300 ||
    !/^[a-f0-9]{64}$/.test(sig) ||
    !timingSafeEqual(Buffer.from(sig, "hex"), createHmac("sha256", secret).update(`${time}.${raw}`).digest())
  ) {
    return new Response("Forbidden", { status: 403 });
  }

  let e: Evento;
  try {
    e = JSON.parse(raw);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }
  if (!e.chat_key || !/^[a-f0-9]{64}$/.test(e.chat_key) || !e.event_id || !/^[a-f0-9]{64}$/.test(e.event_id)) {
    return new Response("Invalid event", { status: 400 });
  }
  if (e.is_group) return Response.json({ ok: true, ignorado: "grupo" });

  const linea = String(e.account_label ?? "").toLowerCase() === "business" ? "negocio" : "personal";
  const sql = await hiloSqlListo();

  let [chat] = (await sql.query(
    `SELECT id, project_id, monitorear FROM hilo_chats WHERE vivo_linea = $1 AND vivo_chat_key = $2 LIMIT 1`,
    [linea, e.chat_key],
  )) as Array<{ id: string; project_id: string; monitorear: boolean }>;

  // Primera vez que llega este chat: se liga por nombre al chat del expediente (export ZIP),
  // sólo si hay exactamente un candidato y el nombre es lo bastante específico.
  if (!chat && e.chat_label) {
    const label = normal(e.chat_label);
    if (label.length >= 6) {
      const candidatos = (await sql.query(
        `SELECT id, project_id, monitorear, chat_nombre FROM hilo_chats WHERE vivo_chat_key IS NULL`,
      )) as Array<{ id: string; project_id: string; monitorear: boolean; chat_nombre: string }>;
      const match = candidatos.filter((c) => {
        const n = normal(c.chat_nombre ?? "");
        return n === label || n.startsWith(label) || (label.length >= 10 && n.includes(label));
      });
      if (match.length === 1) {
        chat = match[0];
        await sql.query(`UPDATE hilo_chats SET vivo_linea = $2, vivo_chat_key = $3 WHERE id = $1`, [
          chat.id,
          linea,
          e.chat_key,
        ]);
      }
    }
  }
  if (!chat) return Response.json({ ok: true, ignorado: "chat sin expediente" });

  const ts = e.timestamp && Number.isFinite(Date.parse(e.timestamp)) ? e.timestamp : new Date().toISOString();
  const rows = (await sql.query(
    `INSERT INTO hilo_mensajes (
       uid, linea, chat_id, chat_nombre, es_grupo, autor, de_mi, tipo, texto,
       ts, id_wa, media_ref, media_tipo, origen, hilo_chat_id, raw
     ) VALUES ($1,$2,$3,$4,false,$5,$6,$7,$8,$9::timestamptz,$10,$11,$12,'vivo',$13,$14::jsonb)
     ON CONFLICT DO NOTHING
     RETURNING uid`,
    [
      `vivo:${e.event_id}`,
      linea,
      e.chat_key,
      e.chat_label ?? null,
      e.from_me ? "Tú" : e.sender ?? null,
      Boolean(e.from_me),
      TIPOS[e.tipo ?? ""] ?? "otro",
      (e.text ?? "").slice(0, 20_000),
      ts,
      e.event_id,
      e.media?.name ?? null,
      e.media ? (e.media.unavailable ? "media/unavailable" : null) : null,
      chat.id,
      JSON.stringify({ fuente: "trama", account_label: e.account_label ?? null }),
    ],
  )) as Array<{ uid: string }>;

  // Mensaje del cliente en un chat que se sigue en vivo → el analista lee y deja señal en el expediente.
  if (rows.length && !e.from_me && chat.monitorear) {
    after(async () => {
      try {
        await analizarSenalCliente(chat!.id);
      } catch (error) {
        console.error("[hilo/ingest] analista falló", error instanceof Error ? error.message : error);
      }
    });
  }
  return Response.json({ ok: true, guardado: rows.length > 0, project_id: chat.project_id });
}
