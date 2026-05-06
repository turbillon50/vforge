-- -----------------------------------------------------------
-- Migration 004 — Per-project vault
--
-- Adds a project-scoped sibling to operator_secrets. Same AES-256-GCM
-- crypto with VFORGE_MASTER_PEPPER, but rows are tied to a project_id.
-- Resolution cascade in app code: project_secrets → operator_secrets
-- → process.env. UNIQUE on (project_id, name) so each project can
-- have its own VITE_CLERK_PUBLISHABLE_KEY, STRIPE_SECRET_KEY, etc.
-- -----------------------------------------------------------

CREATE TABLE IF NOT EXISTS project_secrets (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name              text NOT NULL,
  description       text,
  ciphertext        bytea NOT NULL,
  iv                bytea NOT NULL,
  auth_tag          bytea NOT NULL,
  provider          text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  rotated_at        timestamptz,
  last_used_at      timestamptz,
  last_used_by      text REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE (project_id, name)
);

CREATE INDEX IF NOT EXISTS idx_project_secrets_project
  ON project_secrets (project_id);
CREATE INDEX IF NOT EXISTS idx_project_secrets_provider
  ON project_secrets (provider);

INSERT INTO schema_migrations (version) VALUES ('004_project_secrets')
  ON CONFLICT (version) DO NOTHING;
