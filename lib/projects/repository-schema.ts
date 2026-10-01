import "server-only";

import { sql } from "@/lib/db/client";

let schemaReady = false;
let curationReady = false;

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
