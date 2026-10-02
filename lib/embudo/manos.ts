import "server-only";

import { queryAll, queryOne } from "@/lib/db/client";
import { hiloSqlListo } from "@/lib/hilo/server";
import { analizarSenalCliente } from "@/lib/hilo/senales";
import { montoDe, pedirContratoLutor } from "@/lib/embudo/contrato";
import {
  PROJECT_ETAPAS,
  PROJECT_ETAPA_LABELS,
  PROJECT_ETAPA_LATERAL,
  isProjectEtapa,
  nextProjectEtapa,
  previousProjectEtapa,
} from "@/lib/projects/etapas";
import { setProjectEtapa } from "@/lib/projects/etapas-server";
export { MANOS_TOOLS, MANOS_TOOL_NAMES } from "@/lib/embudo/manos-defs";
import { ensureProjectCarteraSchema } from "@/lib/projects/repository-schema";

/**
 * "Manos" de la fábrica: lo que V (chat de VForge) y cualquier agente por MCP pueden
 * hacer con el embudo de clientes y con LUTOR. Mismas funciones para los dos lados.
 */

type Res = { ok: boolean; content: string; summary: string };
const ok = (data: unknown, summary: string): Res => ({ ok: true, content: JSON.stringify(data), summary });
const fail = (msg: string): Res => ({ ok: false, content: JSON.stringify({ error: msg }), summary: msg.slice(0, 80) });
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const label = (e: string | null) => (e && isProjectEtapa(e) ? PROJECT_ETAPA_LABELS[e] : e ?? "sin etapa");

async function pulso(horas: number): Promise<Res> {
  await ensureProjectCarteraSchema();
  const etapas = await queryAll<{ etapa: string | null; n: number }>(
    `SELECT etapa, count(*)::int AS n FROM projects WHERE COALESCE(es_demo,false) = false GROUP BY etapa`,
  );
  const cambios = await queryAll<{ project_id: string; name: string; etapa: string; nota: string | null; creado_en: string }>(
    `SELECT e.project_id, p.name, e.etapa, e.nota, e.creado_en
       FROM project_etapas e JOIN projects p ON p.id = e.project_id
      WHERE e.creado_en > now() - ($1::text || ' hours')::interval
      ORDER BY e.creado_en DESC LIMIT 30`,
    [String(horas)],
  ).catch(() => []);
  const sql = await hiloSqlListo();
  const senales = await sql.query(
    `SELECT project_id, tipo, titulo, detalle, raw->>'accion_sugerida' AS accion, created_at
       FROM hilo_hallazgos
      WHERE raw->>'origen' = 'senales_cliente' AND created_at > now() - ($1::text || ' hours')::interval
      ORDER BY created_at DESC LIMIT 20`,
    [String(horas)],
  );
  const vivos = await sql.query(
    `SELECT c.project_id, count(*)::int AS mensajes, max(m.ts) AS ultimo,
            count(*) FILTER (WHERE NOT m.de_mi)::int AS del_cliente
       FROM hilo_mensajes m JOIN hilo_chats c ON c.id = m.hilo_chat_id
      WHERE m.origen = 'vivo' AND m.ts > now() - ($1::text || ' hours')::interval
      GROUP BY c.project_id ORDER BY max(m.ts) DESC`,
    [String(horas)],
  );
  return ok(
    {
      ventana_horas: horas,
      embudo: Object.fromEntries(etapas.filter((r) => r.etapa).map((r) => [label(r.etapa), r.n])),
      cambios_de_etapa: cambios.map((c) => ({ ...c, etapa: label(c.etapa) })),
      senales_de_clientes: senales,
      whatsapp_en_vivo: vivos,
    },
    `${cambios.length} cambios, ${(senales as unknown[]).length} señales`,
  );
}

async function tablero(): Promise<Res> {
  await ensureProjectCarteraSchema();
  const rows = await queryAll<{
    id: string;
    name: string;
    etapa: string | null;
    cliente_nombre: string | null;
    demo_url: string | null;
    contrato_url: string | null;
    desde: string | null;
  }>(
    `SELECT p.id, p.name, p.etapa, p.cliente_nombre, p.demo_url, p.contrato_url,
            (SELECT max(creado_en) FROM project_etapas e WHERE e.project_id = p.id) AS desde
       FROM projects p
      WHERE COALESCE(p.es_demo,false) = false AND p.etapa IS NOT NULL
      ORDER BY p.updated_at DESC`,
  );
  const por: Record<string, unknown[]> = {};
  for (const r of rows) {
    const k = label(r.etapa);
    (por[k] ??= []).push({
      id: r.id,
      nombre: r.name,
      cliente: r.cliente_nombre,
      demo: r.demo_url,
      contrato: r.contrato_url,
      dias_en_etapa: r.desde ? Math.floor((Date.now() - Date.parse(r.desde)) / 86_400_000) : null,
    });
  }
  return ok(por, `${rows.length} proyectos en el embudo`);
}

async function cliente(proyecto: string): Promise<Res> {
  await ensureProjectCarteraSchema();
  const p = await queryOne<Record<string, unknown>>(
    `SELECT id, name, description, etapa, cliente_nombre, cliente_whatsapp, demo_url, contrato_url,
            github_repo, vercel_url, domain FROM projects WHERE id = $1`,
    [proyecto],
  );
  if (!p) return fail("proyecto no encontrado");
  const historial = await queryAll(
    `SELECT etapa, nota, creado_en FROM project_etapas WHERE project_id = $1 ORDER BY creado_en DESC LIMIT 15`,
    [proyecto],
  ).catch(() => []);
  const sql = await hiloSqlListo();
  const senales = await sql.query(
    `SELECT tipo, titulo, detalle, raw->>'accion_sugerida' AS accion, created_at FROM hilo_hallazgos
      WHERE project_id = $1 AND raw->>'origen' = 'senales_cliente' ORDER BY created_at DESC LIMIT 5`,
    [proyecto],
  );
  const mensajes = await sql.query(
    `SELECT m.autor, m.de_mi, m.tipo, m.texto, m.ts, m.origen FROM hilo_mensajes m
      WHERE m.hilo_chat_id IN (SELECT id FROM hilo_chats WHERE project_id = $1)
      ORDER BY m.ts DESC LIMIT 15`,
    [proyecto],
  );
  return ok(
    { proyecto: { ...p, etapa: label(p.etapa as string | null) }, historial, senales, ultimos_mensajes: (mensajes as unknown[]).reverse() },
    `${p.name}: ${label(p.etapa as string | null)}`,
  );
}

async function mover(args: Record<string, unknown>, userId: string): Promise<Res> {
  const proyecto = str(args.proyecto);
  const nota = str(args.nota);
  if (!proyecto || !nota) return fail("proyecto y nota son obligatorios");
  await ensureProjectCarteraSchema();
  const cur = await queryOne<{ etapa: string | null }>(`SELECT etapa FROM projects WHERE id = $1`, [proyecto]);
  if (!cur) return fail("proyecto no encontrado");
  const actual = cur.etapa && isProjectEtapa(cur.etapa) ? cur.etapa : null;
  let destino: string | null = str(args.etapa);
  const accion = str(args.accion);
  if (!destino && accion === "avanzar") destino = nextProjectEtapa(actual);
  if (!destino && accion === "regresar") destino = previousProjectEtapa(actual);
  if (!destino && accion === "perdido") destino = PROJECT_ETAPA_LATERAL;
  if (!destino || !isProjectEtapa(destino)) return fail("no hay etapa destino válida");
  const r = await setProjectEtapa({
    projectId: proyecto,
    etapa: destino,
    nota,
    creadoPor: userId,
    demoUrl: str(args.demo_url) ?? undefined,
  });
  if (!r) return fail("no se pudo mover (¿es demo de catálogo?)");
  return ok({ proyecto, de: label(actual), a: label(destino) }, `${proyecto} → ${label(destino)}`);
}

async function analizar(proyecto: string): Promise<Res> {
  const sql = await hiloSqlListo();
  const chats = (await sql.query(`SELECT id FROM hilo_chats WHERE project_id = $1 AND monitorear = true`, [
    proyecto,
  ])) as Array<{ id: string }>;
  if (!chats.length) return fail("ningún chat del proyecto tiene 'Seguir en vivo' encendido");
  const out = [];
  for (const c of chats) out.push(await analizarSenalCliente(c.id));
  return ok(out, `${out.length} chat(s) analizados`);
}

async function lutor(args: Record<string, unknown>): Promise<Res> {
  const base = process.env.LUTOR_URL?.replace(/\/+$/, "");
  const token = process.env.LUTOR_API_TOKEN;
  if (!base || !token) return fail("LUTOR no está configurado en VForge");
  const herramienta = str(args.herramienta);
  const body = herramienta
    ? { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: herramienta, arguments: args.argumentos ?? {} } }
    : { jsonrpc: "2.0", id: 1, method: "tools/list", params: {} };
  const res = await fetch(`${base}/mcp`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(45_000),
  }).catch((e: unknown) => e as Error);
  if (res instanceof Error) return fail(`LUTOR no respondió: ${res.message}`);
  const text = await res.text();
  if (!res.ok) return fail(`LUTOR ${res.status}: ${text.slice(0, 200)}`);
  const json = text.startsWith("event:") || text.startsWith("data:")
    ? JSON.parse(text.split("\n").find((l) => l.startsWith("data:"))?.slice(5) ?? "{}")
    : JSON.parse(text);
  const result = json.result ?? json;
  if (!herramienta) {
    return ok((result.tools ?? []).map((t: { name: string; description?: string }) => ({ name: t.name, description: t.description })), "tools de LUTOR");
  }
  const contenido = Array.isArray(result.content)
    ? result.content.map((c: { text?: string }) => c.text ?? "").join("\n")
    : JSON.stringify(result);
  return { ok: !result.isError, content: contenido.slice(0, 60_000), summary: `lutor:${herramienta}` };
}

export async function runManosTool(name: string, args: Record<string, unknown>, userId: string): Promise<Res> {
  switch (name) {
    case "vforge_pulso":
      return pulso(Math.min(24 * 14, Math.max(1, Number(args.horas) || 48)));
    case "embudo_tablero":
      return tablero();
    case "embudo_cliente": {
      const p = str(args.proyecto);
      return p ? cliente(p) : fail("proyecto es obligatorio");
    }
    case "embudo_mover":
      return mover(args, userId);
    case "embudo_analizar": {
      const p = str(args.proyecto);
      return p ? analizar(p) : fail("proyecto es obligatorio");
    }
    case "embudo_contrato": {
      const p = str(args.proyecto);
      if (!p) return fail("proyecto es obligatorio");
      const r = await pedirContratoLutor({
        projectId: p,
        montoTotal: montoDe(args.monto_total),
        anticipo: montoDe(args.anticipo),
        notas: str(args.notas),
        modulos: Array.isArray(args.modulos) ? args.modulos.filter((m): m is string => typeof m === "string") : undefined,
        creadoPor: userId,
      });
      return r.ok ? ok(r.contrato, `contrato ${r.contrato.id}`) : fail(r.error);
    }
    case "lutor":
      return lutor(args);
    default:
      return fail(`tool desconocida: ${name}`);
  }
}
