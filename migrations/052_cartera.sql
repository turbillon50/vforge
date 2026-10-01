-- Cartera real + catalogo de demos auditado desde docs/auditoria/repos.json.
-- Aditiva e idempotente: no borra proyectos ni memberships existentes.

ALTER TABLE projects ADD COLUMN IF NOT EXISTS cartera_tipo text[] NOT NULL DEFAULT '{}'::text[];
ALTER TABLE projects ADD COLUMN IF NOT EXISTS cartera_estado text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS cartera_prioridad int;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS cartera_nota text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS es_demo boolean NOT NULL DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS demo_destacado boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_projects_cartera_tipo
  ON projects USING gin (cartera_tipo);

CREATE INDEX IF NOT EXISTS idx_projects_cartera_estado
  ON projects (cartera_estado);

CREATE INDEX IF NOT EXISTS idx_projects_cartera_prioridad
  ON projects (cartera_prioridad);

CREATE INDEX IF NOT EXISTS idx_projects_es_demo
  ON projects (es_demo, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_projects_demo_destacado
  ON projects (demo_destacado, updated_at DESC);

INSERT INTO schema_migrations (version) VALUES ('052_cartera')
ON CONFLICT (version) DO NOTHING;
