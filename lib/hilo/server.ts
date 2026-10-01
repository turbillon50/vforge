import "server-only";

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import type {
  HiloDashboardData,
  HiloChat,
  HiloHallazgo,
  HiloLinea,
  HiloLineaEstado,
  HiloMensaje,
  HiloProject,
} from "./types";

export type {
  HiloDashboardData,
  HiloChat,
  HiloHallazgo,
  HiloLinea,
  HiloLineaEstado,
  HiloMensaje,
  HiloProject,
} from "./types";

let cachedSql: NeonQueryFunction<false, false> | null = null;

function getHiloSql(): NeonQueryFunction<false, false> | null {
  if (cachedSql) return cachedSql;
  const url = process.env.HILO_DATABASE_URL;
  if (!url) return null;
  cachedSql = neon(url);
  return cachedSql;
}

export function getHiloSqlOrThrow(): NeonQueryFunction<false, false> {
  const sql = getHiloSql();
  if (!sql) throw new Error("HILO_DATABASE_URL no esta configurado.");
  return sql;
}

function apiConfig() {
  const base = process.env.HILO_API_BASE?.replace(/\/+$/, "") ?? null;
  const key = process.env.HILO_SECRET ?? null;
  return { base, key };
}

async function fetchEstado() {
  const { base, key } = apiConfig();
  const active = process.env.HILO_ACTIVO === "1";
  if (!active) {
    return {
      configured: Boolean(base && key),
      ok: true,
      error: null,
      active: false,
      lineas: null,
      ts: null,
    };
  }
  if (!base || !key) {
    return {
      configured: false,
      ok: false,
      error: "HILO_API_BASE y HILO_SECRET no estan configurados.",
      active,
      lineas: null,
      ts: null,
    };
  }
  try {
    const response = await fetch(`${base}/estado`, {
      cache: "no-store",
      headers: { "x-hilo-key": key },
    });
    if (!response.ok) {
      throw new Error(`Hilo HTTP ${response.status}`);
    }
    const payload = (await response.json()) as {
      lineas?: Record<HiloLinea, HiloLineaEstado>;
      ts?: string;
    };
    return {
      configured: true,
      ok: true,
      error: null,
      active,
      lineas: payload.lineas ?? null,
      ts: payload.ts ?? null,
    };
  } catch (error) {
    return {
      configured: true,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      active,
      lineas: null,
      ts: null,
    };
  }
}

async function queryRows<T>(sql: NeonQueryFunction<false, false>, text: string, params: unknown[] = []) {
  return (await sql.query(text, params)) as T[];
}

export async function loadHiloDashboardData(projectId?: string | null): Promise<HiloDashboardData> {
  const service = await fetchEstado();
  const sql = getHiloSql();
  if (!sql) {
    return {
      service,
      db: {
        configured: false,
        ok: false,
        error: "HILO_DATABASE_URL no esta configurado.",
      },
      mensajes: [],
      hallazgos: [],
      chats: [],
      projects: [],
    };
  }

  try {
    const [mensajes, hallazgos, chats, projects] = await Promise.all([
      queryRows<HiloMensaje>(
        sql,
        `SELECT uid, linea, chat_id, chat_nombre, es_grupo, autor, de_mi, tipo, texto,
                to_char(ts AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS ts,
                id_wa, media_tipo, origen, hilo_chat_id
           FROM hilo_mensajes m
          WHERE ($1::text IS NULL OR m.hilo_chat_id IN (
            SELECT id FROM hilo_chats WHERE project_id = $1
          ))
          ORDER BY ts DESC
          LIMIT 80`,
        [projectId || null],
      ),
      queryRows<HiloHallazgo>(
        sql,
        `SELECT h.id::text, h.linea, h.chat_id, h.chat_nombre, h.chat_clase,
                h.tipo, h.titulo, h.detalle, h.prioridad, h.project_id,
                p.name AS project_name, h.importante,
                to_char(h.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS created_at
           FROM hilo_hallazgos h
           LEFT JOIN projects p ON p.id = h.project_id
          WHERE h.estado = 'abierto'
            AND ($1::text IS NULL OR h.project_id = $1)
          ORDER BY h.importante DESC, h.created_at DESC
          LIMIT 120`,
        [projectId || null],
      ),
      queryRows<HiloChat>(
        sql,
        `SELECT c.id, c.linea, c.chat_id, c.chat_nombre, c.etiqueta,
                c.project_id, p.name AS project_name,
                c.monitorear, c.origen,
                to_char(c.creado_en AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS creado_en,
                COALESCE((
                  SELECT count(*)::int
                    FROM hilo_mensajes m
                   WHERE m.hilo_chat_id = c.id
                ), 0) AS mensajes_count,
                (
                  SELECT to_char(max(m.ts) AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
                    FROM hilo_mensajes m
                   WHERE m.hilo_chat_id = c.id
                ) AS ultimo_ts,
                (
                  SELECT COALESCE(NULLIF(m.texto, ''), m.media_tipo, m.tipo)
                    FROM hilo_mensajes m
                   WHERE m.hilo_chat_id = c.id
                   ORDER BY m.ts DESC
                   LIMIT 1
                ) AS ultimo_texto
           FROM hilo_chats c
           LEFT JOIN projects p ON p.id = c.project_id
          WHERE ($1::text IS NULL OR c.project_id = $1)
          ORDER BY ultimo_ts DESC NULLS LAST, c.creado_en DESC
          LIMIT 200`,
        [projectId || null],
      ),
      queryRows<HiloProject>(
        sql,
        `SELECT id, name
           FROM projects
          ORDER BY name
          LIMIT 300`,
      ),
    ]);
    return {
      service,
      db: { configured: true, ok: true, error: null },
      mensajes,
      hallazgos,
      chats,
      projects,
    };
  } catch (error) {
    return {
      service,
      db: {
        configured: true,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      mensajes: [],
      hallazgos: [],
      chats: [],
      projects: [],
    };
  }
}

export async function fetchHiloQr(linea: string): Promise<Response> {
  const { base, key } = apiConfig();
  if (!base || !key) {
    return Response.json({ error: "HILO_API_BASE/HILO_SECRET no configurados" }, { status: 503 });
  }
  if (linea !== "personal" && linea !== "negocio") {
    return Response.json({ error: "linea desconocida" }, { status: 404 });
  }
  return fetch(`${base}/qr/${linea}`, {
    cache: "no-store",
    headers: { "x-hilo-key": key },
  });
}
