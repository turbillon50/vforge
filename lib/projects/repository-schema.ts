import "server-only";

import { sql } from "@/lib/db/client";

let schemaReady = false;
let curationReady = false;
let carteraReady = false;

export const PROJECT_REPOSITORY_CURATION_DDL: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS project_repository_curation (
    repo_full_name  text PRIMARY KEY,
    archived        boolean NOT NULL DEFAULT false,
    archived_reason text,
    archived_note   text,
    previous_links  jsonb NOT NULL DEFAULT '[]'::jsonb,
    archived_at     timestamptz,
    archived_by     text,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_project_repository_curation_archived
    ON project_repository_curation (archived, updated_at DESC)`,
];

export const PROJECT_CARTERA_DDL: readonly string[] = [
  `ALTER TABLE projects ADD COLUMN IF NOT EXISTS cartera_tipo text[] NOT NULL DEFAULT '{}'::text[]`,
  `ALTER TABLE projects ADD COLUMN IF NOT EXISTS cartera_estado text`,
  `ALTER TABLE projects ADD COLUMN IF NOT EXISTS cartera_prioridad int`,
  `ALTER TABLE projects ADD COLUMN IF NOT EXISTS cartera_nota text`,
  `ALTER TABLE projects ADD COLUMN IF NOT EXISTS es_demo boolean NOT NULL DEFAULT false`,
  `ALTER TABLE projects ADD COLUMN IF NOT EXISTS demo_destacado boolean NOT NULL DEFAULT false`,
  `ALTER TABLE projects ADD COLUMN IF NOT EXISTS etapa text`,
  `ALTER TABLE projects ADD COLUMN IF NOT EXISTS cliente_nombre text`,
  `ALTER TABLE projects ADD COLUMN IF NOT EXISTS cliente_whatsapp text`,
  `ALTER TABLE projects ADD COLUMN IF NOT EXISTS contrato_url text`,
  `ALTER TABLE projects ADD COLUMN IF NOT EXISTS demo_url text`,
  `DO $$
   BEGIN
     IF NOT EXISTS (
       SELECT 1
         FROM pg_constraint
        WHERE conname = 'projects_etapa_check'
          AND conrelid = 'projects'::regclass
     ) THEN
       ALTER TABLE projects
       ADD CONSTRAINT projects_etapa_check
       CHECK (
         etapa IS NULL OR etapa IN (
           'prospecto',
           'chat_cargado',
           'demo_en_construccion',
           'demo_entregada',
           'contrato_enviado',
           'firmado',
           'en_construccion',
           'entregado',
           'mantenimiento',
           'perdido'
         )
       );
     END IF;
   END $$`,
  `CREATE TABLE IF NOT EXISTS project_etapas (
    id bigserial PRIMARY KEY,
    project_id text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    etapa text NOT NULL CHECK (
      etapa IN (
        'prospecto',
        'chat_cargado',
        'demo_en_construccion',
        'demo_entregada',
        'contrato_enviado',
        'firmado',
        'en_construccion',
        'entregado',
        'mantenimiento',
        'perdido'
      )
    ),
    nota text,
    creado_por text,
    creado_en timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_project_etapas_project
    ON project_etapas (project_id, creado_en DESC, id DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_projects_cartera_tipo ON projects USING gin (cartera_tipo)`,
  `CREATE INDEX IF NOT EXISTS idx_projects_cartera_estado ON projects (cartera_estado)`,
  `CREATE INDEX IF NOT EXISTS idx_projects_cartera_prioridad ON projects (cartera_prioridad)`,
  `CREATE INDEX IF NOT EXISTS idx_projects_es_demo ON projects (es_demo, updated_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_projects_demo_destacado ON projects (demo_destacado, updated_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_projects_etapa ON projects (etapa, updated_at DESC)`,
  `UPDATE projects
      SET etapa = CASE
        WHEN COALESCE(es_demo, false) = true THEN NULL
        WHEN cartera_estado ~* '(cerrado|mantenimiento)' THEN 'mantenimiento'
        WHEN cartera_estado ~* '(parado|abandono|abandonado|rota|devuelto)' THEN 'perdido'
        WHEN cartera_estado ~* '(activo|le_debemos|entrega|satisfecho)' THEN 'en_construccion'
        ELSE 'prospecto'
      END
    WHERE etapa IS NULL
      AND COALESCE(es_demo, false) = false`,
  `INSERT INTO project_etapas (project_id, etapa, nota, creado_por)
    SELECT p.id, p.etapa, 'Etapa inicial calculada desde cartera.', 'system'
      FROM projects p
     WHERE p.etapa IS NOT NULL
       AND COALESCE(p.es_demo, false) = false
       AND NOT EXISTS (
         SELECT 1 FROM project_etapas pe WHERE pe.project_id = p.id
       )`,
];

/** Idempotent fallback for production environments where migrations lag deploys. */
export async function ensureProjectRepositoriesSchema(): Promise<void> {
  if (schemaReady) return;

  await sql`
    CREATE TABLE IF NOT EXISTS project_repositories (
      project_id text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      repo_full_name text NOT NULL,
      role text NOT NULL DEFAULT 'app',
      is_primary boolean NOT NULL DEFAULT false,
      default_branch text,
      private boolean,
      language text,
      html_url text,
      pushed_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (project_id, repo_full_name)
    )
  `;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_project_repositories_one_primary
    ON project_repositories (project_id) WHERE is_primary
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_project_repositories_repo
    ON project_repositories (lower(repo_full_name))
  `;
  await sql`
    INSERT INTO project_repositories (
      project_id, repo_full_name, role, is_primary,
      default_branch, private, language, html_url
    )
    SELECT id, github_repo, 'app', true,
           github_default_branch, github_private, github_language, github_url
      FROM projects
     WHERE github_repo IS NOT NULL AND btrim(github_repo) <> ''
    ON CONFLICT (project_id, repo_full_name) DO UPDATE SET
      default_branch = COALESCE(EXCLUDED.default_branch, project_repositories.default_branch),
      private = COALESCE(EXCLUDED.private, project_repositories.private),
      language = COALESCE(EXCLUDED.language, project_repositories.language),
      html_url = COALESCE(EXCLUDED.html_url, project_repositories.html_url),
      updated_at = now()
  `;

  schemaReady = true;
}

export async function ensureProjectRepositoryCurationSchema(): Promise<void> {
  if (curationReady) return;
  for (const ddl of PROJECT_REPOSITORY_CURATION_DDL) {
    await sql.query(ddl);
  }
  curationReady = true;
}

export async function ensureProjectCarteraSchema(): Promise<void> {
  if (carteraReady) return;
  for (const ddl of PROJECT_CARTERA_DDL) {
    await sql.query(ddl);
  }
  carteraReady = true;
}
