-- Referencias visuales guardadas dentro de una sala live.

CREATE TABLE IF NOT EXISTS project_references (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  label       text NOT NULL CHECK (char_length(label) BETWEEN 1 AND 120),
  url         text NOT NULL CHECK (char_length(url) BETWEEN 1 AND 2048),
  kind        text NOT NULL DEFAULT 'page'
                CHECK (kind IN ('page', 'component', 'inspiration')),
  notes       text NOT NULL DEFAULT '' CHECK (char_length(notes) <= 1000),
  created_by  text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_references_project
  ON project_references (project_id, created_at DESC);

SELECT 'migracion 044 (project references) OK' AS resultado;
