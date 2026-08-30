-- Circuito profesional V: rama aislada -> agentes -> preview -> aprobación -> publicación.

CREATE TABLE IF NOT EXISTS project_agent_runs (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  instruction         text NOT NULL CHECK (char_length(instruction) BETWEEN 3 AND 12000),
  requested_executor  text NOT NULL CHECK (requested_executor IN ('auto','codex','claude','grok','team')),
  resolved_executor   text NOT NULL,
  phase               text NOT NULL DEFAULT 'building'
                        CHECK (phase IN ('planning','building','reviewing','validation','complete')),
  status              text NOT NULL DEFAULT 'preparing'
                        CHECK (status IN ('preparing','queued','running','awaiting_preview','preview_ready','awaiting_approval','approved','published','failed','cancelled')),
  repo_full_name      text NOT NULL,
  base_branch         text NOT NULL,
  work_branch         text NOT NULL,
  queue_jobs          jsonb NOT NULL DEFAULT '[]'::jsonb,
  preview_url         text,
  pr_number           integer,
  pr_url              text,
  summary             text,
  error               text,
  created_by_user_id  text NOT NULL,
  created_by_email    text NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  approved_at         timestamptz,
  published_at        timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_project_agent_runs_branch
  ON project_agent_runs (lower(repo_full_name), work_branch);
CREATE INDEX IF NOT EXISTS idx_project_agent_runs_project
  ON project_agent_runs (project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_agent_runs_active
  ON project_agent_runs (status, updated_at DESC)
  WHERE status IN ('preparing','queued','running','awaiting_preview','preview_ready','awaiting_approval','approved');

SELECT 'migracion 045 (project agent runs) OK' AS resultado;
