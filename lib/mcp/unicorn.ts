/**
 * MCP maestro del protocolo Unicorn — herramientas `unicorn_*`.
 *
 * Un solo MCP (el de VForge, /api/mcp) expone el estado de los proyectos de
 * Luis y un flujo de eventos con cursor para que las otras apps del ecosistema
 * (MindContext, Momentum, Eternime, TRAMA) lean lo que cambia y publiquen lo
 * suyo. "Si se agrega un feature o cambia un valor en VForge, en Momentum se ve
 * reflejado": VForge publica en `unicorn_eventos`, Momentum hace polling con
 * `unicorn_eventos { cursor }`.
 *
 * ACCESO: SOLO OWNER (scope `admin`). Todas están en OPERATOR_TOOLS de rbac.ts
 * (el handler rebota a client/public con 401) y, además, `runUnicornTool`
 * revalida el scope aquí mismo (defensa en profundidad).
 *
 * Este módulo es PURO: no importa Neon ni Clerk. La base se inyecta
 * (`UnicornDbs`) — tools.ts le pasa las conexiones reales y las pruebas un
 * doble en memoria. Así se puede probar validación, RBAC y cursor sin red.
 *
 * TIEMPO REAL: el handler MCP actual es JSON-RPC sobre HTTP POST sin SSE ni
 * notificaciones (capabilities: { tools: {} }). No se inventa transporte: el
 * "tiempo real" es polling barato con cursor opaco y orden estable (ts, clave).
 */
import type { McpPrincipal } from "./rbac";
import {
  UNICORN_DDL as SHARED_UNICORN_DDL,
  UnicornParamError as SharedUnicornParamError,
  ensureUnicornTable as ensureSharedUnicornTable,
  publishUnicornEvent,
  resetUnicornEnsureForTests,
} from "./unicorn-shared.mjs";

/* ================================ tipos ================================ */

export interface UnicornDb {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
}

/** `app` = DATABASE_URL (projects, audit_events, unicorn_eventos…).
 *  `nervous` = Brain del sistema nervioso (project_events). Si falta, esa
 *  fuente se reporta como no disponible, nunca se inventa. */
export interface UnicornDbs {
  app: UnicornDb;
  nervous?: UnicornDb | null;
}

export interface ToolResult {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

export const UNICORN_TOOLS = [
  "unicorn_estado",
  "unicorn_proyectos",
  "unicorn_expediente",
  "unicorn_eventos",
  "unicorn_publicar_evento",
] as const;
export type UnicornToolName = (typeof UNICORN_TOOLS)[number];

export function isUnicornTool(name: string): name is UnicornToolName {
  return (UNICORN_TOOLS as readonly string[]).includes(name);
}

/** Error de validación de parámetros: se devuelve como isError, no se lanza al handler. */
export class UnicornParamError extends Error {}

/* ============================== constantes ============================== */

export const CATEGORIAS = ["produccion", "activo", "en_revision", "en_pausa", "archivo", "pendiente_borrado"] as const;
export const ESTADOS = ["live", "building", "error", "idle", "unknown"] as const;

/** Columnas reales de `projects` que se exponen. Lista blanca: nada de org_id,
 *  montos de contrato ni ids internos de Vercel. Columnas que aún no existan en
 *  una base vieja simplemente no aparecen (se lee con to_jsonb). */
const CAMPOS_PROYECTO = [
  "id",
  "name",
  "description",
  "category",
  "status",
  "github_repo",
  "github_url",
  "github_default_branch",
  "vercel_url",
  "domain",
  "desktop_url",
  "mobile_url",
  "admin_url",
  "client_name",
  "progress_pct",
  "due_date",
  "last_audit_score",
  "last_audit_at",
  "created_at",
  "updated_at",
] as const;

const TIPO_RE = /^[a-z0-9][a-z0-9_.:-]{0,59}$/;
const ORIGEN_RE = /^[a-z0-9][a-z0-9_.-]{0,39}$/;
const PROYECTO_RE = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,159}$/;
const SENSIBLE_RE = /secret|vault|token|password|credential|api[_-]?key/i;
const DETALLE_MAX = 8000;
const DETALLE_PREVIEW = 1500;

/* ============================== migración ============================== */

/** Misma DDL que migrations/047_unicorn_eventos.sql. Idempotente. */
export const UNICORN_DDL: readonly string[] = SHARED_UNICORN_DDL;

export async function ensureUnicornTable(db: UnicornDb): Promise<void> {
  await ensureSharedUnicornTable(db);
}

/** Sólo para pruebas: olvida que la tabla ya se aseguró. */
export function __resetUnicornEnsure(): void {
  resetUnicornEnsureForTests();
}

/* ============================== utilidades ============================== */

function json(data: unknown): ToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

function fail(message: string): ToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}

function optString(v: unknown, field: string, max = 200): string | null {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v !== "string") throw new UnicornParamError(`'${field}' debe ser texto.`);
  const s = v.trim();
  if (s.length > max) throw new UnicornParamError(`'${field}' excede ${max} caracteres.`);
  return s || null;
}

function reqProyecto(v: unknown, field = "proyecto"): string {
  const s = optString(v, field, 160);
  if (!s) throw new UnicornParamError(`Falta '${field}' (id del proyecto, p. ej. vforge).`);
  if (!PROYECTO_RE.test(s)) throw new UnicornParamError(`'${field}' no es un id de proyecto válido.`);
  return s;
}

function clampLimit(v: unknown, def: number, max: number): number {
  if (v === undefined || v === null || v === "") return def;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new UnicornParamError("'limit' debe ser número.");
  return Math.min(max, Math.max(1, Math.floor(n)));
}

function pick(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of CAMPOS_PROYECTO) if (k in row) out[k] = row[k];
  return out;
}

/* ================================ cursor ================================ */

/**
 * Cursor opaco = base64url({ t, k }): `t` es el timestamp ISO UTC con
 * microsegundos tal como lo formatea Postgres (sin pérdida de precisión de JS)
 * y `k` la clave global "fuente:id". El orden es (ts, clave) estricto, así que
 * dos eventos en el mismo microsegundo no se pierden ni se duplican.
 */
export interface Cursor {
  t: string;
  k: string;
}

const ISO_US_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?Z$/;

export function encodeCursor(c: Cursor): string {
  return Buffer.from(JSON.stringify(c), "utf8").toString("base64url");
}

export function decodeCursor(raw: string): Cursor {
  try {
    const c = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as Partial<Cursor>;
    if (typeof c.t === "string" && ISO_US_RE.test(c.t) && typeof c.k === "string" && c.k.length <= 200) {
      return { t: c.t, k: c.k };
    }
  } catch {
    /* cae al error de abajo */
  }
  throw new UnicornParamError("'cursor' inválido. Usa el cursor exacto que devolvió la llamada anterior.");
}

/** `desde` (fecha ISO) → cursor que arranca justo en ese instante. */
function cursorDesde(raw: string): Cursor {
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) throw new UnicornParamError("'desde' debe ser fecha ISO 8601 (p. ej. 2026-09-30T00:00:00Z).");
  // k = "" ⇒ incluye todo lo que tenga ts > desde, y lo que caiga exacto en desde.
  return { t: d.toISOString(), k: "" };
}

/* ================================ fuentes ================================ */

/**
 * Cada fuente es un SELECT que normaliza a la misma forma:
 *   clave, ref, project_id, tipo, titulo, detalle, origen, severidad, ts (timestamptz), ts_iso
 * La paginación se aplica por fuente y se mezcla en memoria (top-N correcto
 * porque cada fuente aporta como máximo N+1 filas posteriores al cursor).
 */
interface Fuente {
  id: string;
  db: "app" | "nervous";
  descripcion: string;
  inner: string;
}

const TS_ISO = (col: string) => `to_char(${col} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;

export const FUENTES: readonly Fuente[] = [
  {
    id: "unicorn",
    db: "app",
    descripcion: "eventos publicados con unicorn_publicar_evento (VForge, Momentum, MindContext…)",
    inner: `SELECT 'unicorn:' || id::text AS clave, id::text AS ref, proyecto AS project_id, tipo, titulo,
                   detalle, origen, NULL::text AS severidad, ts, ${TS_ISO("ts")} AS ts_iso
              FROM unicorn_eventos`,
  },
  {
    id: "auditoria",
    db: "app",
    descripcion: "audit_events: acciones de V y del operador (lo que muestra /app/activity)",
    inner: `SELECT 'auditoria:' || id::text AS clave, id::text AS ref,
                   CASE WHEN resource_type = 'project' THEN resource_id END AS project_id,
                   action AS tipo,
                   action || COALESCE(' · ' || resource_type || COALESCE(':' || resource_id, ''), '') AS titulo,
                   payload AS detalle, 'vforge' AS origen, NULL::text AS severidad,
                   created_at AS ts, ${TS_ISO("created_at")} AS ts_iso
              FROM audit_events`,
  },
  {
    id: "actividad",
    db: "app",
    descripcion: "v_project_activity: bitácora de avance por proyecto (portafolio)",
    inner: `SELECT 'actividad:' || id::text AS clave, id::text AS ref, project_id, 'actividad' AS tipo,
                   title AS titulo, NULL::jsonb AS detalle, 'vforge' AS origen, NULL::text AS severidad,
                   created_at AS ts, ${TS_ISO("created_at")} AS ts_iso
              FROM v_project_activity`,
  },
  {
    id: "salud",
    db: "nervous",
    descripcion: "project_events: salud reportada por cada app vía /api/webhooks/project-health",
    inner: `SELECT 'salud:' || id::text AS clave, id::text AS ref, project_id, event_type AS tipo,
                   event_type || ' (' || severity || ')' AS titulo, details AS detalle,
                   'project-health' AS origen, severity AS severidad, ts, ${TS_ISO("ts")} AS ts_iso
              FROM project_events`,
  },
];

export interface UnicornEvento {
  fuente: string;
  id: string;
  proyecto: string | null;
  tipo: string;
  titulo: string;
  detalle: unknown;
  origen: string | null;
  severidad: string | null;
  ts: string;
  cursor: string;
}

interface FilaEvento {
  clave: string;
  ref: string;
  project_id: string | null;
  tipo: string;
  titulo: string;
  detalle: unknown;
  origen: string | null;
  severidad: string | null;
  ts_iso: string;
}

function recortarDetalle(tipo: string, detalle: unknown): unknown {
  if (detalle === null || detalle === undefined) return null;
  if (SENSIBLE_RE.test(tipo)) return { omitido: "evento de credenciales: el detalle no se expone por MCP" };
  const s = JSON.stringify(detalle);
  if (s.length <= DETALLE_PREVIEW) return detalle;
  return { truncado: true, preview: s.slice(0, DETALLE_PREVIEW) };
}

function aEvento(fuente: string, r: FilaEvento): UnicornEvento {
  return {
    fuente,
    id: r.ref,
    proyecto: r.project_id,
    tipo: r.tipo,
    titulo: r.titulo,
    detalle: recortarDetalle(r.tipo, r.detalle),
    origen: r.origen,
    severidad: r.severidad,
    ts: r.ts_iso,
    cursor: encodeCursor({ t: r.ts_iso, k: r.clave }),
  };
}

function compara(a: FilaEvento, b: FilaEvento): number {
  if (a.ts_iso !== b.ts_iso) return a.ts_iso < b.ts_iso ? -1 : 1;
  return a.clave < b.clave ? -1 : a.clave > b.clave ? 1 : 0;
}

export interface LeerEventosOpts {
  cursor?: Cursor | null;
  proyecto?: string | null;
  fuentes?: string[] | null;
  limit: number;
}

export interface LeerEventosResultado {
  eventos: UnicornEvento[];
  cursor: string | null;
  hay_mas: boolean;
  fuentes_leidas: string[];
  fuentes_no_disponibles: Array<{ fuente: string; motivo: string }>;
}

/**
 * Con cursor: eventos POSTERIORES al cursor, en orden ascendente (para
 * polling). Sin cursor: los `limit` más recientes, también entregados en orden
 * ascendente, y el cursor apunta al más nuevo — desde ahí se hace polling.
 */
export async function leerEventos(dbs: UnicornDbs, opts: LeerEventosOpts): Promise<LeerEventosResultado> {
  const elegidas = FUENTES.filter((f) => !opts.fuentes || opts.fuentes.includes(f.id));
  const adelante = Boolean(opts.cursor);
  const params: unknown[] = [opts.cursor?.t ?? null, opts.cursor?.k ?? "", opts.proyecto ?? null, opts.limit + 1];
  const where = `($1::timestamptz IS NULL OR (s.ts, s.clave COLLATE "C") > ($1::timestamptz, $2::text COLLATE "C"))
                 AND ($3::text IS NULL OR s.project_id = $3)`;
  // COLLATE "C": el desempate por clave debe ordenar igual en Postgres que en JS
  // (comparación por código, sin reglas de idioma que ignoren ':').
  const order = adelante ? 's.ts ASC, s.clave COLLATE "C" ASC' : 's.ts DESC, s.clave COLLATE "C" DESC';

  const leidas: string[] = [];
  const noDisp: Array<{ fuente: string; motivo: string }> = [];
  const filas: Array<{ fuente: string; fila: FilaEvento }> = [];

  await Promise.all(
    elegidas.map(async (f) => {
      const db = f.db === "app" ? dbs.app : dbs.nervous;
      if (!db) {
        noDisp.push({ fuente: f.id, motivo: "base no configurada" });
        return;
      }
      try {
        const rows = await db.query<FilaEvento>(
          `SELECT s.clave, s.ref, s.project_id, s.tipo, s.titulo, s.detalle, s.origen, s.severidad, s.ts_iso
             FROM (${f.inner}) s
            WHERE ${where}
            ORDER BY ${order}
            LIMIT $4`,
          params,
        );
        leidas.push(f.id);
        for (const fila of rows) filas.push({ fuente: f.id, fila });
      } catch (e) {
        noDisp.push({ fuente: f.id, motivo: String(e instanceof Error ? e.message : e).slice(0, 160) });
      }
    }),
  );

  filas.sort((a, b) => compara(a.fila, b.fila));
  let tomadas: typeof filas;
  let hayMas: boolean;
  if (adelante) {
    hayMas = filas.length > opts.limit;
    tomadas = filas.slice(0, opts.limit);
  } else {
    hayMas = filas.length > opts.limit;
    tomadas = filas.slice(-opts.limit);
  }
  const eventos = tomadas.map((x) => aEvento(x.fuente, x.fila));
  const ultimo = eventos[eventos.length - 1];
  return {
    eventos,
    // Sin eventos nuevos el cursor no se mueve: el cliente reintenta con el mismo.
    cursor: ultimo ? ultimo.cursor : opts.cursor ? encodeCursor(opts.cursor) : null,
    hay_mas: hayMas,
    fuentes_leidas: leidas.sort(),
    fuentes_no_disponibles: noDisp.sort((a, b) => a.fuente.localeCompare(b.fuente)),
  };
}

/* ============================== herramientas ============================== */

async function toolProyectos(dbs: UnicornDbs, args: Record<string, unknown>): Promise<ToolResult> {
  const categoria = optString(args.categoria, "categoria", 40);
  const estado = optString(args.estado, "estado", 40);
  const q = optString(args.q, "q", 80);
  const limit = clampLimit(args.limit, 100, 300);
  if (categoria && !(CATEGORIAS as readonly string[]).includes(categoria)) {
    throw new UnicornParamError(`'categoria' debe ser una de: ${CATEGORIAS.join(", ")}.`);
  }
  if (estado && !(ESTADOS as readonly string[]).includes(estado)) {
    throw new UnicornParamError(`'estado' debe ser uno de: ${ESTADOS.join(", ")}.`);
  }
  const rows = await dbs.app.query<{ p: Record<string, unknown> }>(
    `SELECT to_jsonb(p) AS p
       FROM projects p
      WHERE ($1::text IS NULL OR p.category = $1)
        AND ($2::text IS NULL OR p.status = $2)
        AND ($3::text IS NULL OR p.id ILIKE $3 OR p.name ILIKE $3)
      ORDER BY (p.category = 'produccion') DESC, p.name ASC
      LIMIT $4`,
    [categoria, estado, q ? `%${q}%` : null, limit],
  );
  const proyectos = rows.map((r) => pick(r.p));
  const repos = await reposDe(dbs.app, proyectos.map((p) => String(p.id)));
  for (const p of proyectos) {
    const extra = repos.get(String(p.id));
    p.repos = extra && extra.length > 0 ? extra : p.github_repo ? [{ repo_full_name: p.github_repo, role: "app", is_primary: true }] : [];
  }
  return json({ total: proyectos.length, proyectos });
}

async function reposDe(db: UnicornDb, ids: string[]): Promise<Map<string, Array<Record<string, unknown>>>> {
  const out = new Map<string, Array<Record<string, unknown>>>();
  if (ids.length === 0) return out;
  try {
    const rows = await db.query<Record<string, unknown> & { project_id: string }>(
      `SELECT project_id, repo_full_name, role, is_primary, default_branch, html_url, pushed_at
         FROM project_repositories
        WHERE project_id = ANY($1::text[])
        ORDER BY project_id, is_primary DESC, repo_full_name`,
      [ids],
    );
    for (const r of rows) {
      const { project_id, ...resto } = r;
      const list = out.get(project_id) ?? [];
      list.push(resto);
      out.set(project_id, list);
    }
  } catch {
    /* tabla project_repositories aún no migrada: se usa projects.github_repo */
  }
  return out;
}

async function toolExpediente(dbs: UnicornDbs, args: Record<string, unknown>): Promise<ToolResult> {
  const proyecto = reqProyecto(args.proyecto);
  const limit = clampLimit(args.limit_eventos, 20, 100);
  const rows = await dbs.app.query<{ p: Record<string, unknown> }>(
    "SELECT to_jsonb(p) AS p FROM projects p WHERE p.id = $1 LIMIT 1",
    [proyecto],
  );
  if (rows.length === 0) return fail(`Proyecto '${proyecto}' no existe en VForge.`);
  const p = pick(rows[0].p);
  const repos = (await reposDe(dbs.app, [proyecto])).get(proyecto) ?? [];
  const eventos = await leerEventos(dbs, { proyecto, limit });
  return json({
    proyecto: p,
    repos: repos.length > 0 ? repos : p.github_repo ? [{ repo_full_name: p.github_repo, role: "app", is_primary: true }] : [],
    urls: {
      produccion: p.vercel_url ?? null,
      dominio: p.domain ?? null,
      escritorio: p.desktop_url ?? null,
      movil: p.mobile_url ?? null,
      admin: p.admin_url ?? null,
      github: p.github_url ?? null,
    },
    ultimos_eventos: eventos.eventos,
    cursor_eventos: eventos.cursor,
    fuentes_no_disponibles: eventos.fuentes_no_disponibles,
  });
}

function parseFuentes(v: unknown): string[] | null {
  if (v === undefined || v === null) return null;
  const arr = Array.isArray(v) ? v : typeof v === "string" ? v.split(",") : null;
  if (!arr) throw new UnicornParamError("'fuentes' debe ser lista de texto.");
  const ids = FUENTES.map((f) => f.id);
  const limpias = arr.map((x) => String(x).trim()).filter(Boolean);
  const malas = limpias.filter((x) => !ids.includes(x));
  if (malas.length) throw new UnicornParamError(`'fuentes' desconocidas: ${malas.join(", ")}. Válidas: ${ids.join(", ")}.`);
  return limpias.length ? limpias : null;
}

async function toolEventos(dbs: UnicornDbs, args: Record<string, unknown>): Promise<ToolResult> {
  const rawCursor = optString(args.cursor, "cursor", 600);
  const desde = optString(args.desde, "desde", 40);
  if (rawCursor && desde) throw new UnicornParamError("Usa 'cursor' o 'desde', no ambos.");
  const cursor = rawCursor ? decodeCursor(rawCursor) : desde ? cursorDesde(desde) : null;
  const proyecto = args.proyecto === undefined || args.proyecto === null || args.proyecto === "" ? null : reqProyecto(args.proyecto);
  const fuentes = parseFuentes(args.fuentes);
  const limit = clampLimit(args.limit, 50, 200);
  const r = await leerEventos(dbs, { cursor, proyecto, fuentes, limit });
  return json({
    ...r,
    siguiente_llamada: r.cursor
      ? { name: "unicorn_eventos", arguments: { cursor: r.cursor, ...(proyecto ? { proyecto } : {}), ...(fuentes ? { fuentes } : {}) } }
      : null,
  });
}

async function toolEstado(dbs: UnicornDbs): Promise<ToolResult> {
  const rows = await dbs.app.query<{ category: string; status: string; n: number | string; ultima: string | null }>(
    `SELECT category, status, count(*)::int AS n, ${TS_ISO("max(updated_at)")} AS ultima
       FROM projects GROUP BY category, status`,
  );
  const porCategoria: Record<string, number> = {};
  const porEstado: Record<string, number> = {};
  let total = 0;
  let ultima: string | null = null;
  for (const r of rows) {
    const n = Number(r.n) || 0;
    total += n;
    porCategoria[r.category] = (porCategoria[r.category] ?? 0) + n;
    porEstado[r.status] = (porEstado[r.status] ?? 0) + n;
    if (r.ultima && (!ultima || r.ultima > ultima)) ultima = r.ultima;
  }
  let publicados24h: number | null = null;
  try {
    const c = await dbs.app.query<{ n: number | string }>(
      "SELECT count(*)::int AS n FROM unicorn_eventos WHERE ts > now() - interval '24 hours'",
    );
    publicados24h = Number(c[0]?.n ?? 0);
  } catch {
    publicados24h = null; // tabla aún no creada: se declara el hueco, no se pinta 0
  }
  const ultimo = await leerEventos(dbs, { limit: 1 });
  return json({
    proyectos: {
      total,
      en_produccion: porCategoria.produccion ?? 0,
      live: porEstado.live ?? 0,
      con_error: porEstado.error ?? 0,
      por_categoria: porCategoria,
      por_estado: porEstado,
      ultima_actualizacion: ultima,
    },
    eventos: {
      publicados_unicorn_24h: publicados24h,
      ultimo: ultimo.eventos[0] ?? null,
      cursor_actual: ultimo.cursor,
      fuentes_no_disponibles: ultimo.fuentes_no_disponibles,
    },
  });
}

async function toolPublicar(dbs: UnicornDbs, args: Record<string, unknown>, autor: string | null): Promise<ToolResult> {
  const result = await publishUnicornEvent(dbs.app, args, {
    autor,
    defaultOrigen: "vforge",
  });
  if (!result.ok) return fail(result.error ?? "No se pudo registrar el evento.");
  return json({ ok: true, evento: result.evento });
}

/**
 * Punto de entrada. Revalida que el principal sea OWNER aunque el handler ya
 * lo haya filtrado: si alguien llama a runMcpTool directo, tampoco pasa.
 */
export async function runUnicornTool(
  name: string,
  args: Record<string, unknown>,
  principal: McpPrincipal,
  dbs: UnicornDbs,
): Promise<ToolResult> {
  if (principal.scope !== "admin") {
    return fail(`401: ${name} es solo para el Owner (token admin/operator). Tu token no tiene ese nivel.`);
  }
  try {
    switch (name) {
      case "unicorn_estado":
        return await toolEstado(dbs);
      case "unicorn_proyectos":
        return await toolProyectos(dbs, args);
      case "unicorn_expediente":
        return await toolExpediente(dbs, args);
      case "unicorn_eventos":
        return await toolEventos(dbs, args);
      case "unicorn_publicar_evento":
        return await toolPublicar(dbs, args, principal.userId);
      default:
        return fail(`Tool unicorn desconocida: ${name}`);
    }
  } catch (e) {
    if (e instanceof UnicornParamError || e instanceof SharedUnicornParamError) return fail(`Parámetros inválidos: ${e.message}`);
    throw e;
  }
}
