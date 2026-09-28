import "server-only";
import { queryAll, queryOne } from "@/lib/db/client";
import { ensureDeliveryColumns } from "@/lib/projects/delivery-meta";
import { ensureProjectRepositoriesSchema } from "@/lib/projects/repository-schema";
import { ensureEstadoRealSchema } from "@/lib/projects/estado-schema";
import { estadoReal, type Categoria, type FuenteEstado } from "@/lib/projects/estado-real";
import type { ProjectRepository } from "@/lib/projects/repository-groups";

/**
 * Lectura del catálogo de proyectos: UNA sola función que arma la fila con
 * todas sus señales (repos, actividad, dinero, comentarios, sondeo del dominio,
 * sugerencias pendientes) y le calcula el estado real.
 *
 * Existe para que la pantalla, el endpoint y los scripts de medición lean el
 * mismo dato con la misma prioridad. Dos fuentes para el mismo número es como
 * se cuelan las contradicciones (SANIDAD R-012).
 */

export interface SugerenciaCatalogo {
  id: string;
  campo: string;
  valor: string;
  fuente: string;
  detalle: string | null;
}

export interface ProyectoCatalogo {
  id: string;
  name: string;
  category: string;
  category_manual_at: string | null;
  status: string;
  github_repo: string | null;
  github_private?: boolean;
  github_language?: string | null;
  vercel_url: string | null;
  vercel_project_id?: string | null;
  domain?: string | null;
  delivery_priority?: boolean;
  progress_pct?: number;
  family_code?: string | null;
  repositories: ProjectRepository[];
  repository_count: number;
  description?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  client_name?: string | null;
  due_date?: string | null;
  contract_amount?: number | null;
  paid_amount?: number | null;
  last_push?: string | null;
  notes_count?: number;
  last_note?: { body: string; created_at: string } | null;
  deploys_ready?: number;
  health_status?: number | null;
  health_ok?: boolean | null;
  health_checked_at?: string | null;
  /** Estado que manda en pantalla y en los filtros. */
  estado_real: Categoria;
  estado_fuente: FuenteEstado;
  estado_motivo: string;
  sondeo_pendiente: boolean;
  sugerencias: SugerenciaCatalogo[];
}

/**
 * `project_comments` la escribe el portal en vivo (comentarios anclados sobre la
 * captura) y `project_notes` la pantalla de proyectos. Son comentarios del mismo
 * proyecto: el contador y el último comentario suman las dos, si la tabla del
 * portal existe en esta base.
 */
let tieneComentarios: boolean | null = null;

async function existeProjectComments(): Promise<boolean> {
  if (tieneComentarios !== null) return tieneComentarios;
  const row = await queryOne<{ reg: string | null }>(
    `SELECT to_regclass('public.project_comments')::text AS reg`,
  );
  tieneComentarios = Boolean(row?.reg);
  return tieneComentarios;
}

function sqlCatalogo(conComentarios: boolean): string {
  const comentarios = conComentarios
    ? `UNION ALL SELECT project_id, body, created_at FROM project_comments`
    : "";
  return `
    WITH dichos AS (
      SELECT project_id, body, created_at FROM project_notes
      ${comentarios}
    ),
    dichos_n AS (
      SELECT project_id, count(*)::int AS n FROM dichos GROUP BY project_id
    ),
    deploys AS (
      SELECT project_id, count(*) FILTER (WHERE state = 'ready')::int AS ready
        FROM project_deploys GROUP BY project_id
    ),
    repos AS (
      SELECT project_id,
             count(*)::int AS n,
             max(pushed_at) AS last_push,
             jsonb_agg(
               jsonb_build_object(
                 'repo_full_name', repo_full_name,
                 'role', role,
                 'is_primary', is_primary,
                 'default_branch', default_branch,
                 'private', private,
                 'language', language,
                 'html_url', html_url,
                 'pushed_at', pushed_at
               ) ORDER BY is_primary DESC, role, repo_full_name
             ) AS lista
        FROM project_repositories GROUP BY project_id
    ),
    sugerencias AS (
      SELECT project_id,
             jsonb_agg(
               jsonb_build_object(
                 'id', id::text, 'campo', campo, 'valor', valor,
                 'fuente', fuente, 'detalle', detalle
               ) ORDER BY campo
             ) AS lista
        FROM project_suggestions WHERE estado = 'pendiente' GROUP BY project_id
    )
    SELECT p.id, p.name, p.category, p.category_manual_at, p.status,
           p.github_repo, p.github_private, p.github_language,
           p.vercel_url, p.vercel_project_id, p.domain,
           COALESCE(p.delivery_priority, false) AS delivery_priority,
           COALESCE(p.progress_pct, 0) AS progress_pct,
           p.family_code,
           p.description, p.created_at, p.updated_at, p.client_name,
           to_char(p.due_date, 'YYYY-MM-DD') AS due_date,
           p.contract_amount::float8 AS contract_amount,
           p.paid_amount::float8 AS paid_amount,
           r.last_push,
           COALESCE(dn.n, 0) AS notes_count,
           ln.nota AS last_note,
           COALESCE(r.lista, '[]'::jsonb) AS repositories,
           COALESCE(r.n, 0) AS repository_count,
           COALESCE(d.ready, 0) AS deploys_ready,
           h.http_status AS health_status,
           h.ok AS health_ok,
           h.checked_at AS health_checked_at,
           COALESCE(s.lista, '[]'::jsonb) AS sugerencias
      FROM projects p
      LEFT JOIN repos r ON r.project_id = p.id
      LEFT JOIN dichos_n dn ON dn.project_id = p.id
      LEFT JOIN deploys d ON d.project_id = p.id
      LEFT JOIN project_health_checks h ON h.project_id = p.id
      LEFT JOIN sugerencias s ON s.project_id = p.id
      LEFT JOIN LATERAL (
        SELECT jsonb_build_object('body', x.body, 'created_at', x.created_at) AS nota
          FROM dichos x WHERE x.project_id = p.id
         ORDER BY x.created_at DESC LIMIT 1
      ) ln ON true
     ORDER BY p.name
  `;
}

/** Columnas de fecha: el driver las entrega como `Date`, la API como texto. */
type ColumnaFecha =
  | "created_at"
  | "updated_at"
  | "last_push"
  | "health_checked_at"
  | "category_manual_at";

/** Fila cruda de la consulta, antes de normalizar fechas y calcular el estado. */
type FilaCruda = Omit<
  ProyectoCatalogo,
  "estado_real" | "estado_fuente" | "estado_motivo" | "sondeo_pendiente" | ColumnaFecha
> &
  Record<ColumnaFecha, string | Date | null>;

/** Toda fecha sale del catálogo como ISO: un solo formato para pantalla y JSON. */
function iso(v: string | Date | null): string | null {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString();
  const t = new Date(v).getTime();
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

export async function leerCatalogo(ahora: number = Date.now()): Promise<ProyectoCatalogo[]> {
  await ensureDeliveryColumns();
  await ensureProjectRepositoriesSchema();
  await ensureEstadoRealSchema();

  const filas = await queryAll<FilaCruda>(sqlCatalogo(await existeProjectComments()));
  return filas.map((p) => ({
    ...p,
    created_at: iso(p.created_at),
    updated_at: iso(p.updated_at),
    last_push: iso(p.last_push),
    health_checked_at: iso(p.health_checked_at),
    category_manual_at: iso(p.category_manual_at),
    ...conEstado(p, ahora),
  }));
}

function conEstado(p: FilaCruda, ahora: number) {
  const e = estadoReal(
    {
      category: p.category,
      category_manual_at: p.category_manual_at,
      domain: p.domain,
      vercel_url: p.vercel_url,
      vercel_project_id: p.vercel_project_id,
      deploys_ready: p.deploys_ready,
      health_status: p.health_status,
      health_ok: p.health_ok,
      health_checked_at: p.health_checked_at,
      last_push: p.last_push,
      github_repo: p.github_repo,
      repository_count: p.repository_count,
    },
    ahora,
  );
  return {
    estado_real: e.estado,
    estado_fuente: e.fuente,
    estado_motivo: e.motivo,
    sondeo_pendiente: e.sondeo_pendiente,
  };
}
