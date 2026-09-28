/**
 * Sugerencias con fuente para cliente y montos.
 *
 * GET    → las pendientes, agrupadas por proyecto, con su fuente.
 * POST   → vuelve a escanear las fuentes reales y guarda las pendientes.
 * PATCH  → { accion: 'confirmar' | 'rechazar', ids?: [], todas?: true }
 *          Confirmar las APLICA a `projects` (sólo donde el campo sigue vacío) y
 *          deja el rastro en `audit_events`.
 *
 * Fuentes: `client_project_status` y `contracts` + `contract_payments` de la
 * misma base. Ver lib/projects/sugerencias.ts para el emparejado y por qué no
 * se propone fecha de entrega.
 */
import { queryAll, sql } from "@/lib/db/client";
import { resolveRequestOwner } from "@/lib/auth/request-owner";
import { requireOperatorAuth } from "@/lib/auth/operator-token";
import { ensureDeliveryColumns, cleanAmount, cleanText } from "@/lib/projects/delivery-meta";
import { ensureEstadoRealSchema } from "@/lib/projects/estado-schema";
import {
  CAMPOS_SUGERIBLES,
  ETIQUETA_CAMPO,
  calcularSugerencias,
  type CampoSugerible,
  type DestinoSugerencia,
  type FilaContrato,
  type FilaEstadoCliente,
} from "@/lib/projects/sugerencias";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface FilaSugerencia {
  id: string;
  project_id: string;
  project_name: string | null;
  campo: CampoSugerible;
  valor: string;
  fuente: string;
  detalle: string | null;
  created_at: string;
}

async function quien(req: Request): Promise<{ userId: string } | Response> {
  const token = requireOperatorAuth(req);
  if (token.ok) return { userId: token.userId };
  const access = await resolveRequestOwner();
  if (!access.userId) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!access.isOwner) return Response.json({ error: "forbidden" }, { status: 403 });
  return { userId: access.userId };
}

async function preparar() {
  await ensureDeliveryColumns();
  await ensureEstadoRealSchema();
}

async function pendientes(): Promise<FilaSugerencia[]> {
  return queryAll<FilaSugerencia>(
    `SELECT s.id::text, s.project_id, p.name AS project_name,
            s.campo, s.valor, s.fuente, s.detalle, s.created_at
       FROM project_suggestions s
       LEFT JOIN projects p ON p.id = s.project_id
      WHERE s.estado = 'pendiente'
      ORDER BY p.name NULLS LAST, s.campo`,
  );
}

export async function GET(req: Request) {
  const acceso = await quien(req);
  if (acceso instanceof Response) return acceso;
  await preparar();
  const lista = await pendientes();
  return Response.json(
    { sugerencias: lista, total: lista.length },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(req: Request) {
  const acceso = await quien(req);
  if (acceso instanceof Response) return acceso;
  await preparar();

  const destinos = await queryAll<DestinoSugerencia>(
    `SELECT id, name, domain, client_name,
            contract_amount::float8 AS contract_amount,
            paid_amount::float8 AS paid_amount
       FROM projects`,
  );
  const estados = await leerEstadosCliente();
  const contratos = await leerContratos();

  const { sugerencias, sin_emparejar } = calcularSugerencias(destinos, estados, contratos);

  let nuevas = 0;
  let refrescadas = 0;
  for (const s of sugerencias) {
    const res = await sql`
      INSERT INTO project_suggestions (project_id, campo, valor, fuente, detalle, estado)
      VALUES (${s.project_id}, ${s.campo}, ${s.valor}, ${s.fuente}, ${s.detalle}, 'pendiente')
      ON CONFLICT (project_id, campo) DO UPDATE SET
        valor = EXCLUDED.valor,
        fuente = EXCLUDED.fuente,
        detalle = EXCLUDED.detalle
        WHERE project_suggestions.estado = 'pendiente'
      RETURNING (created_at = now()) AS recien
    `;
    if (Array.isArray(res) && res.length) {
      if ((res[0] as { recien?: boolean }).recien) nuevas += 1;
      else refrescadas += 1;
    }
  }

  const lista = await pendientes();
  return Response.json(
    {
      encontradas: sugerencias.length,
      nuevas,
      refrescadas,
      pendientes: lista.length,
      sin_emparejar,
      sugerencias: lista,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function PATCH(req: Request) {
  const acceso = await quien(req);
  if (acceso instanceof Response) return acceso;
  await preparar();

  const body = (await req.json().catch(() => null)) as {
    accion?: string;
    ids?: unknown;
    todas?: boolean;
  } | null;
  const accion = body?.accion;
  if (accion !== "confirmar" && accion !== "rechazar") {
    return Response.json({ error: "accion_invalida" }, { status: 400 });
  }

  const ids = Array.isArray(body?.ids)
    ? body!.ids.map((x) => String(x)).filter((x) => /^\d+$/.test(x))
    : [];
  if (!ids.length && !body?.todas) {
    return Response.json({ error: "sin_seleccion" }, { status: 400 });
  }

  const filas = ids.length
    ? await queryAll<FilaSugerencia>(
        `SELECT s.id::text, s.project_id, p.name AS project_name, s.campo, s.valor,
                s.fuente, s.detalle, s.created_at
           FROM project_suggestions s LEFT JOIN projects p ON p.id = s.project_id
          WHERE s.estado = 'pendiente' AND s.id = ANY($1::bigint[])`,
        [ids],
      )
    : await pendientes();

  if (!filas.length) {
    return Response.json({ aplicadas: 0, omitidas: 0, sugerencias: await pendientes() });
  }

  let aplicadas = 0;
  const omitidas: Array<{ id: string; motivo: string }> = [];

  for (const fila of filas) {
    if (accion === "rechazar") {
      await sql`
        UPDATE project_suggestions
           SET estado = 'rechazada', resolved_at = now(), resolved_by = ${acceso.userId}
         WHERE id = ${fila.id}::bigint
      `;
      aplicadas += 1;
      continue;
    }

    if (!(CAMPOS_SUGERIBLES as readonly string[]).includes(fila.campo)) {
      omitidas.push({ id: fila.id, motivo: "campo_no_sugerible" });
      continue;
    }

    // Se aplica sólo si el campo sigue vacío: si Luis ya lo capturó a mano,
    // la sugerencia se marca aplicada pero NO pisa su dato.
    const limpio =
      fila.campo === "client_name" ? cleanText(fila.valor, 120) : cleanAmount(fila.valor);
    if (limpio === null) {
      omitidas.push({ id: fila.id, motivo: "valor_invalido" });
      continue;
    }

    const col = fila.campo;
    const actualizadas = await queryAll<{ id: string }>(
      `UPDATE projects SET ${col} = $1, updated_at = now()
        WHERE id = $2 AND ${col} IS NULL
        RETURNING id`,
      [limpio, fila.project_id],
    );
    await sql`
      UPDATE project_suggestions
         SET estado = 'confirmada', resolved_at = now(), resolved_by = ${acceso.userId}
       WHERE id = ${fila.id}::bigint
    `;
    if (actualizadas.length) aplicadas += 1;
    else omitidas.push({ id: fila.id, motivo: "ya_tenia_dato" });
  }

  await sql`
    INSERT INTO audit_events (user_id, action, resource_type, ring, payload)
    VALUES (
      ${acceso.userId},
      ${accion === "confirmar" ? "projects.suggestions.confirm" : "projects.suggestions.reject"},
      'projects', 1,
      ${JSON.stringify({
        aplicadas,
        omitidas,
        campos: filas.map((f) => `${f.project_id}:${ETIQUETA_CAMPO[f.campo] ?? f.campo}`),
      })}::jsonb
    )
  `;

  return Response.json(
    { aplicadas, omitidas, sugerencias: await pendientes() },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/** Lee `client_project_status` si existe en esta base (es opcional). */
async function leerEstadosCliente(): Promise<FilaEstadoCliente[]> {
  const existe = await queryAll<{ reg: string | null }>(
    `SELECT to_regclass('public.client_project_status')::text AS reg`,
  );
  if (!existe[0]?.reg) return [];
  return queryAll<FilaEstadoCliente>(
    `SELECT project_id, client_name, status, total_mxn::text, paid_mxn::text, next_milestone
       FROM client_project_status`,
  );
}

/** Lee `contracts` con la suma de parcialidades pagadas, si la tabla existe. */
async function leerContratos(): Promise<FilaContrato[]> {
  const existe = await queryAll<{ reg: string | null }>(
    `SELECT to_regclass('public.contracts')::text AS reg`,
  );
  if (!existe[0]?.reg) return [];
  return queryAll<FilaContrato>(
    `SELECT c.id::text, c.project_id, c.client_name, c.amount_mxn::text, c.status,
            c.signed_at,
            (SELECT sum(p.amount_mxn)::text FROM contract_payments p
              WHERE p.contract_id = c.id AND p.status = 'paid') AS pagado
       FROM contracts c`,
  );
}
