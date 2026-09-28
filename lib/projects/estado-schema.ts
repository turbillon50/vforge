import "server-only";
import { queryAll } from "@/lib/db/client";

/**
 * Esquema del estado real, el sondeo de dominios y las sugerencias con fuente.
 *
 * Todo es ADITIVO y con `IF NOT EXISTS`: se puede correr las veces que sea y no
 * borra ni sobrescribe nada de lo que ya hay en `projects`. Respaldo previo de
 * la tabla tocada: `pg_dump -t projects` (28-sep-2026, 339 filas).
 */

let listo = false;

export async function ensureEstadoRealSchema() {
  if (listo) return;

  // Marca de "esto lo clasificó una persona". Mientras esté vacía, el estado
  // del proyecto se calcula; en cuanto alguien elige estado a mano, se estampa
  // y el cálculo ya no manda.
  await queryAll(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS category_manual_at timestamptz`);

  // Backfill de una sola vez: los proyectos que YA salieron del `en_revision`
  // por defecto fueron clasificados a mano (la sincronización nunca cambia la
  // categoría). No se toca ninguno de los que siguen en el valor por defecto.
  await queryAll(`
    UPDATE projects
       SET category_manual_at = COALESCE(updated_at, created_at, now())
     WHERE category_manual_at IS NULL
       AND category IS NOT NULL
       AND category <> 'en_revision'
  `);

  // Sondeo del dominio: una fila por proyecto, siempre la última medición.
  await queryAll(`
    CREATE TABLE IF NOT EXISTS project_health_checks (
      project_id text PRIMARY KEY,
      url text NOT NULL,
      http_status integer,
      ok boolean NOT NULL DEFAULT false,
      ms integer,
      error text,
      checked_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await queryAll(`
    CREATE INDEX IF NOT EXISTS project_health_checks_checked_idx
      ON project_health_checks (checked_at)
  `);

  // Sugerencias con fuente visible. `valor` es texto: cada campo lo interpreta
  // su propio validador al confirmar (nada entra a `projects` sin limpiarse).
  await queryAll(`
    CREATE TABLE IF NOT EXISTS project_suggestions (
      id bigserial PRIMARY KEY,
      project_id text NOT NULL,
      campo text NOT NULL,
      valor text NOT NULL,
      fuente text NOT NULL,
      detalle text,
      estado text NOT NULL DEFAULT 'pendiente',
      created_at timestamptz NOT NULL DEFAULT now(),
      resolved_at timestamptz,
      resolved_by text
    )
  `);
  await queryAll(`
    CREATE UNIQUE INDEX IF NOT EXISTS project_suggestions_unica
      ON project_suggestions (project_id, campo)
  `);
  await queryAll(`
    CREATE INDEX IF NOT EXISTS project_suggestions_estado_idx
      ON project_suggestions (estado, project_id)
  `);

  listo = true;
}
