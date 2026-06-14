-- 019_baul_live.sql — Fidelidad en vivo + multi-repo/multi-deploy (ADITIVO)
-- Seguro de re-correr: IF NOT EXISTS en todo.

-- Varios repos por proyecto (GitHub u otros providers)
CREATE TABLE IF NOT EXISTS project_repos (
  id              text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  project_id      text NOT NULL,
  provider        text NOT NULL DEFAULT 'github',
  repo_full_name  text NOT NULL,            -- "owner/name"
  default_branch  text,
  is_primary      boolean NOT NULL DEFAULT false,
  last_push_at    timestamptz,
  last_commit_sha text,
  meta            jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS project_repos_uni
  ON project_repos (provider, lower(repo_full_name));
CREATE INDEX IF NOT EXISTS project_repos_pid ON project_repos (project_id);

-- Varios deploys por proyecto (Vercel u otros)
CREATE TABLE IF NOT EXISTS project_deploys (
  id               text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  project_id       text NOT NULL,
  provider         text NOT NULL DEFAULT 'vercel',
  vercel_project_id text,
  deployment_id    text,                    -- id único del deploy
  name             text,
  url              text,
  state            text,                    -- ready|building|error|canceled
  commit_sha       text,
  meta             jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS project_deploys_dep
  ON project_deploys (provider, deployment_id) WHERE deployment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS project_deploys_pid ON project_deploys (project_id, created_at DESC);

-- Log crudo de webhooks (auditoría + para no perder eventos no asociados)
CREATE TABLE IF NOT EXISTS webhook_events (
  id          bigserial PRIMARY KEY,
  source      text NOT NULL,                -- github|vercel
  event       text,
  project_id  text,
  matched     boolean NOT NULL DEFAULT false,
  payload     jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS webhook_events_src ON webhook_events (source, created_at DESC);
