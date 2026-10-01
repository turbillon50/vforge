-- Curacion del inventario GitHub: repos que Luis marca como no-proyecto.
-- project_repositories sigue siendo la fuente de verdad de pertenencia a un
-- proyecto; esta tabla guarda el estado repo-level reversible para que demos,
-- copias y experimentos no estorben la pantalla de agrupacion.

CREATE TABLE IF NOT EXISTS project_repository_curation (
  repo_full_name  text PRIMARY KEY,
  archived        boolean NOT NULL DEFAULT false,
  archived_reason text,
  archived_note   text,
  previous_links  jsonb NOT NULL DEFAULT '[]'::jsonb,
  archived_at     timestamptz,
  archived_by     text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_repository_curation_archived
  ON project_repository_curation (archived, updated_at DESC);

INSERT INTO schema_migrations (version) VALUES ('048_project_repository_curation')
ON CONFLICT (version) DO NOTHING;
