import "server-only";

import { createHash } from "node:crypto";
import { resolveLlmEngine, modelForEngine } from "@/lib/forge/llm-engine";
import { PROJECT_ETAPA_LABELS, isProjectEtapa } from "@/lib/projects/etapas";
import { hiloSqlListo } from "@/lib/hilo/server";

/** Lo que la conversación con el cliente dice del embudo. */
export type SenalCliente = {
  senal: "interes" | "acepta" | "pide_cambios" | "precio" | "duda" | "enfriado" | "rechaza" | "ninguna";
  resumen: string;
  accion_sugerida: "generar_contrato" | "ajustar_demo" | "responder" | "seguimiento" | "nada";
  detalle: string;
  confianza: number;
};

const SENALES = new Set(["interes", "acepta", "pide_cambios", "precio", "duda", "enfriado", "rechaza", "ninguna"]);
const ACCIONES = new Set(["generar_contrato", "ajustar_demo", "responder", "seguimiento", "nada"]);

function tipoHallazgo(senal: SenalCliente["senal"]) {
  if (senal === "enfriado" || senal === "rechaza") return "riesgo";
  if (senal === "acepta" || senal === "interes") return "oportunidad";
  return "pendiente";
}

/**
 * Lee los últimos mensajes de un chat ligado a un proyecto y guarda una señal
 * (hilo_hallazgos) con la acción sugerida. No contesta a nadie ni mueve etapas.
 */
export async function analizarSenalCliente(hiloChatId: string): Promise<SenalCliente | null> {
  const sql = await hiloSqlListo();
  const [chat] = (await sql.query(
    `SELECT c.id, c.chat_nombre, c.project_id, c.vivo_linea, c.vivo_chat_key,
            p.name AS project_name, p.etapa, p.demo_url, p.cliente_nombre
       FROM hilo_chats c JOIN projects p ON p.id = c.project_id
      WHERE c.id = $1 AND c.monitorear = true
      LIMIT 1`,
    [hiloChatId],
  )) as Array<Record<string, string | null>>;
  if (!chat) return null;

  const mensajes = (await sql.query(
    `SELECT autor, de_mi, texto, tipo, ts FROM hilo_mensajes
      WHERE hilo_chat_id = $1 ORDER BY ts DESC LIMIT 40`,
    [hiloChatId],
  )) as Array<{ autor: string | null; de_mi: boolean; texto: string | null; tipo: string; ts: string }>;
  if (!mensajes.length) return null;
  mensajes.reverse();

  const engine = resolveLlmEngine();
  if (!engine.client) return null;
  const etapa = chat.etapa && isProjectEtapa(chat.etapa) ? PROJECT_ETAPA_LABELS[chat.etapa] : "sin etapa";
  const res = await engine.client.chat.completions.create({
    model: modelForEngine(engine, engine.defaultChatModel),
    temperature: 0.1,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: [
          "Eres el analista comercial de la fábrica de apps de Luis (Momentum / V&LIVING).",
          "Lees su conversación de WhatsApp con un cliente y dices qué significa para la venta. No respondes al cliente.",
          "Solo JSON con: senal (interes|acepta|pide_cambios|precio|duda|enfriado|rechaza|ninguna),",
          "resumen (una frase en español), accion_sugerida (generar_contrato|ajustar_demo|responder|seguimiento|nada),",
          "detalle (qué hacer exactamente, cita lo que dijo el cliente), confianza (0 a 1).",
          "Usa generar_contrato solo si el cliente acepta o pide formalizar. Enfócate en los mensajes más recientes.",
        ].join(" "),
      },
      {
        role: "user",
        content: JSON.stringify({
          proyecto: chat.project_name,
          cliente: chat.cliente_nombre,
          etapa_actual: etapa,
          demo: chat.demo_url,
          conversacion: mensajes.map((m) => ({
            de: m.de_mi ? "Luis" : m.autor ?? "cliente",
            ts: m.ts,
            tipo: m.tipo,
            texto: (m.texto ?? "").slice(0, 800),
          })),
        }),
      },
    ],
  });
  const raw = res.choices?.[0]?.message?.content ?? "";
  let parsed: Partial<SenalCliente>;
  try {
    parsed = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
  } catch {
    return null;
  }
  const senal: SenalCliente = {
    senal: SENALES.has(String(parsed.senal)) ? (parsed.senal as SenalCliente["senal"]) : "ninguna",
    resumen: String(parsed.resumen ?? "").slice(0, 300),
    accion_sugerida: ACCIONES.has(String(parsed.accion_sugerida))
      ? (parsed.accion_sugerida as SenalCliente["accion_sugerida"])
      : "nada",
    detalle: String(parsed.detalle ?? "").slice(0, 1200),
    confianza: Math.max(0, Math.min(1, Number(parsed.confianza) || 0)),
  };
  if (senal.senal === "ninguna" || !senal.resumen) return senal;

  const ultimo = mensajes[mensajes.length - 1];
  const hash = createHash("sha256").update(`${senal.senal}|${ultimo.ts}`).digest("hex").slice(0, 32);
  await sql.query(
    `INSERT INTO hilo_hallazgos (
       linea, chat_id, chat_nombre, chat_clase, tipo, titulo, detalle, prioridad,
       project_id, mensaje_desde, mensaje_hasta, importante, hash, raw
     ) VALUES (
       $1, $2, $3, 'negocio', $4, $5, $6, $7, $8, $9::timestamptz, $10::timestamptz, $11, $12, $13::jsonb
     )
     ON CONFLICT (linea, chat_id, tipo, hash) DO NOTHING`,
    [
      chat.vivo_linea === "personal" ? "personal" : chat.vivo_linea === "negocio" ? "negocio" : "zip",
      chat.vivo_chat_key ?? chat.id,
      chat.chat_nombre,
      tipoHallazgo(senal.senal),
      senal.resumen,
      senal.detalle,
      senal.accion_sugerida === "generar_contrato" || senal.senal === "enfriado" ? "alta" : "media",
      chat.project_id,
      mensajes[0].ts,
      ultimo.ts,
      senal.accion_sugerida !== "nada",
      hash,
      JSON.stringify({ origen: "senales_cliente", ...senal }),
    ],
  );
  return senal;
}
