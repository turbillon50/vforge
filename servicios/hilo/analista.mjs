#!/usr/bin/env node
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";
import { ensureHiloSchema } from "./schema.mjs";
import { publishUnicornEvent } from "../../lib/mcp/unicorn-shared.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HILO_DATABASE_URL = requiredEnv("HILO_DATABASE_URL");
const MESH_URL = requiredEnv("MESH_URL");
const MESH_KEY = requiredEnv("MESH_KEY");
const MODEL = process.env.MESH_MODEL ?? "gpt-oss-120b";
const MAX_CHATS = Number(process.env.HILO_ANALISTA_MAX_CHATS ?? "12");
const MAX_MESSAGES = Number(process.env.HILO_ANALISTA_MAX_MESSAGES ?? "50");
const LOOP = process.argv.includes("--loop") || process.env.HILO_ANALISTA_LOOP === "1";
const INTERVAL_MS = Number(process.env.HILO_ANALISTA_INTERVAL_MS ?? "600000");

const db = neon(HILO_DATABASE_URL);

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`[hilo-analista] falta ${name}`);
    process.exit(1);
  }
  return value;
}

function endpoint(base) {
  const clean = base.replace(/\/+$/, "");
  return clean.endsWith("/chat/completions") ? clean : `${clean}/chat/completions`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hashJson(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function normText(value, max = 2000) {
  const s = String(value ?? "").replace(/\s+/g, " ").trim();
  return s.length > max ? `${s.slice(0, max - 1)}...` : s;
}

function parseJsonContent(content) {
  const raw = String(content ?? "").trim();
  const stripped = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  return JSON.parse(stripped);
}

function cleanPriority(value) {
  const s = String(value ?? "media").toLowerCase();
  if (["baja", "media", "alta", "critica"].includes(s)) return s;
  if (s === "critical" || s === "critico") return "critica";
  if (s === "high") return "alta";
  if (s === "low") return "baja";
  return "media";
}

function cleanClase(value) {
  return String(value ?? "").toLowerCase() === "negocio" ? "negocio" : "personal";
}

async function proyectos() {
  const rows = await db.query(
    `SELECT id, name, COALESCE(description, '') AS description
       FROM projects
      ORDER BY name
      LIMIT 300`,
  );
  return rows.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
  }));
}

async function chatsPendientes() {
  return db.query(
    `WITH ultimos AS (
       SELECT c.id AS hilo_chat_id,
              'zip'::text AS linea,
              c.id AS chat_id,
              c.chat_nombre,
              c.project_id,
              max(m.ts) AS ultimo_ts,
              count(*)::int AS total
         FROM hilo_chats c
         JOIN hilo_mensajes m ON m.hilo_chat_id = c.id
        WHERE c.project_id IS NOT NULL
        GROUP BY c.id, c.chat_nombre, c.project_id
     )
     SELECT u.hilo_chat_id, u.linea, u.chat_id, u.chat_nombre, u.project_id,
            u.ultimo_ts, u.total,
            c.analizado_hasta
       FROM ultimos u
       LEFT JOIN hilo_analisis_cursor c
         ON c.linea = u.linea AND c.chat_id = u.chat_id
      WHERE c.analizado_hasta IS NULL OR u.ultimo_ts > c.analizado_hasta
      ORDER BY u.ultimo_ts DESC
      LIMIT $1`,
    [MAX_CHATS],
  );
}

async function mensajesChat(hiloChatId) {
  const rows = await db.query(
    `SELECT COALESCE(linea, 'zip') AS linea, chat_id, chat_nombre, es_grupo,
            autor, de_mi, tipo, texto,
            to_char(ts AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS ts,
            id_wa
       FROM hilo_mensajes
      WHERE hilo_chat_id = $1
      ORDER BY ts DESC
      LIMIT $2`,
    [hiloChatId, MAX_MESSAGES],
  );
  return rows.reverse();
}

async function llamarMesh(messages, projectList) {
  const system = [
    "Eres el analista privado de Hilo para Luis.",
    "Clasifica una conversacion de WhatsApp sin responderle a nadie.",
    "Devuelve solo JSON valido.",
    "Tipos de hallazgo: pendientes, oportunidades, riesgos.",
    "Riesgos incluye amenazas, conflictos, enemigos y temas legales.",
    "Usa project_id solo si coincide con un id exacto de la lista de proyectos.",
  ].join(" ");
  const user = {
    proyectos: projectList,
    conversacion: messages.map((m) => ({
      linea: m.linea,
      chat_id: m.chat_id,
      chat_nombre: m.chat_nombre,
      autor: m.autor,
      de_mi: m.de_mi,
      tipo: m.tipo,
      texto: m.texto,
      ts: m.ts,
    })),
    formato: {
      chat_clase: "personal|negocio",
      project_id: "id exacto o null",
      resumen: "una frase",
      pendientes: [{ titulo: "string", detalle: "string", prioridad: "baja|media|alta|critica", importante: true }],
      oportunidades: [{ titulo: "string", detalle: "string", prioridad: "baja|media|alta|critica", importante: true }],
      riesgos: [{ titulo: "string", detalle: "string", prioridad: "baja|media|alta|critica", importante: true }],
    },
  };

  const res = await fetch(endpoint(MESH_URL), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${MESH_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: JSON.stringify(user) },
      ],
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Mesh HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  const payload = await res.json();
  const content = payload?.choices?.[0]?.message?.content;
  if (!content) throw new Error("Mesh no devolvio content");
  return parseJsonContent(content);
}

async function guardarCursor(chat, analisis, maxTs, projectIds) {
  const projectId = projectIds.has(chat.project_id)
    ? chat.project_id
    : projectIds.has(analisis.project_id)
      ? analisis.project_id
      : null;
  await db.query(
    `INSERT INTO hilo_analisis_cursor
       (linea, chat_id, analizado_hasta, chat_clase, project_id, ultimo_resumen, updated_at)
     VALUES ($1, $2, $3::timestamptz, $4, $5, $6, now())
     ON CONFLICT (linea, chat_id) DO UPDATE SET
       analizado_hasta = EXCLUDED.analizado_hasta,
       chat_clase = EXCLUDED.chat_clase,
       project_id = EXCLUDED.project_id,
       ultimo_resumen = EXCLUDED.ultimo_resumen,
       updated_at = now()`,
    [
      chat.linea,
      chat.chat_id,
      maxTs,
      cleanClase(analisis.chat_clase),
      projectId,
      normText(analisis.resumen, 1000),
    ],
  );
}

async function guardarHallazgo(chat, analisis, item, tipo, maxTs, projectIds) {
  const titulo = normText(item?.titulo, 180);
  if (!titulo) return null;
  const detalle = normText(item?.detalle, 2400);
  const prioridad = cleanPriority(item?.prioridad);
  const chatClase = cleanClase(analisis.chat_clase);
  const projectId = projectIds.has(chat.project_id)
    ? chat.project_id
    : projectIds.has(item?.project_id)
      ? item.project_id
      : projectIds.has(analisis.project_id)
        ? analisis.project_id
        : null;
  const importante = Boolean(item?.importante) || prioridad === "alta" || prioridad === "critica" || tipo === "riesgo";
  const hash = hashJson({
    linea: chat.linea,
    chat_id: chat.chat_id,
    tipo,
    titulo,
    detalle,
    projectId,
  });
  const rows = await db.query(
    `INSERT INTO hilo_hallazgos (
       linea, chat_id, chat_nombre, chat_clase, tipo, titulo, detalle,
       prioridad, project_id, mensaje_desde, mensaje_hasta, importante, hash, raw
     )
     VALUES (
       $1, $2, $3, $4, $5, $6, $7,
       $8, $9, NULL, $10::timestamptz, $11, $12, $13::jsonb
     )
     ON CONFLICT (linea, chat_id, tipo, hash) DO NOTHING
     RETURNING id::text`,
    [
      chat.linea,
      chat.chat_id,
      chat.chat_nombre,
      chatClase,
      tipo,
      titulo,
      detalle,
      prioridad,
      projectId,
      maxTs,
      importante,
      hash,
      JSON.stringify(item ?? {}),
    ],
  );
  if (!rows[0]) return null;
  return {
    id: rows[0].id,
    linea: chat.linea,
    chat_id: chat.chat_id,
    chat_nombre: chat.chat_nombre,
    chat_clase: chatClase,
    tipo,
    titulo,
    detalle,
    prioridad,
    project_id: projectId,
    importante,
  };
}

async function publicarImportante(hallazgo) {
  if (!hallazgo.importante) return;
  const proyecto = hallazgo.project_id ?? "vforge";
  const result = await publishUnicornEvent(
    db,
    {
      proyecto,
      tipo: "hilo",
      titulo: `Hilo: ${hallazgo.titulo}`,
      origen: "hilo",
      detalle: hallazgo,
    },
    { autor: "hilo-analista", defaultOrigen: "hilo" },
  );
  if (!result.ok) {
    console.warn("[hilo-analista] no se publico Unicorn", result.error);
  }
}

function items(analisis, key) {
  return Array.isArray(analisis?.[key]) ? analisis[key] : [];
}

async function procesarUnaVuelta() {
  console.log(`[hilo-analista] inicio desde ${__dirname}`);
  await ensureHiloSchema(db);
  const projectList = await proyectos();
  const projectIds = new Set(projectList.map((p) => p.id));
  const pendientes = await chatsPendientes();
  console.log(`[hilo-analista] chats pendientes: ${pendientes.length}`);

  for (const chat of pendientes) {
    const mensajes = await mensajesChat(chat.hilo_chat_id);
    if (mensajes.length === 0) continue;
    const maxTs = mensajes[mensajes.length - 1].ts;
    try {
      const analisis = await llamarMesh(mensajes, projectList);
      const nuevos = [];
      for (const item of items(analisis, "pendientes")) {
        const h = await guardarHallazgo(chat, analisis, item, "pendiente", maxTs, projectIds);
        if (h) nuevos.push(h);
      }
      for (const item of items(analisis, "oportunidades")) {
        const h = await guardarHallazgo(chat, analisis, item, "oportunidad", maxTs, projectIds);
        if (h) nuevos.push(h);
      }
      for (const item of items(analisis, "riesgos")) {
        const h = await guardarHallazgo(chat, analisis, item, "riesgo", maxTs, projectIds);
        if (h) nuevos.push(h);
      }
      await guardarCursor(chat, analisis, maxTs, projectIds);
      for (const hallazgo of nuevos) {
        await publicarImportante(hallazgo);
      }
      console.log(`[hilo-analista] ${chat.linea}/${chat.chat_id}: ${nuevos.length} nuevos`);
    } catch (error) {
      console.error(
        `[hilo-analista] error ${chat.linea}/${chat.chat_id}`,
        error instanceof Error ? error.message : error,
      );
    }
  }
}

async function main() {
  do {
    await procesarUnaVuelta();
    if (LOOP) await sleep(INTERVAL_MS);
  } while (LOOP);
}

main().catch((error) => {
  console.error("[hilo-analista] fatal", error);
  process.exit(1);
});
