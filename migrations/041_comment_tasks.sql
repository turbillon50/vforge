-- Cola: comentario de sala → tarea ejecutable (owner acepta)
CREATE TABLE IF NOT EXISTS project_comment_tasks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  comment_id      uuid NOT NULL REFERENCES project_comments(id) ON DELETE CASCADE,
  status          text NOT NULL DEFAULT 'queued'
                    CHECK (status IN ('queued','running','done','cancelled','failed')),
  prompt          text NOT NULL,
  source_body     text NOT NULL,
  created_by      text,
  created_by_email text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  result_summary  text
);
CREATE INDEX IF NOT EXISTS idx_pct_project ON project_comment_tasks (project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pct_comment ON project_comment_tasks (comment_id);
CREATE INDEX IF NOT EXISTS idx_pct_status ON project_comment_tasks (status) WHERE status IN ('queued','running');
SELECT 'migracion 041 (comment tasks) OK' AS resultado;
