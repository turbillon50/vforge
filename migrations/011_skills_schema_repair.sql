-- ============================================================================
-- Migration 011 — Repair legacy `skills` tables
-- ============================================================================
-- If `skills` was created before 008 or by a partial run, `CREATE TABLE IF
-- NOT EXISTS` in 008_skills.sql left the old shape in place and subsequent
-- queries fail (e.g. column "installed_at" does not exist). These ALTERs are
-- idempotent and align the table with lib/forge/tools.ts + system-prompt.
-- ============================================================================

ALTER TABLE skills ADD COLUMN IF NOT EXISTS installed_at timestamptz;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS required_tools text[] NOT NULL DEFAULT '{}';
ALTER TABLE skills ADD COLUMN IF NOT EXISTS ring_max int NOT NULL DEFAULT 1;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS created_by text REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_skills_installed ON skills (installed_at) WHERE installed_at IS NOT NULL;

INSERT INTO schema_migrations (version) VALUES ('011_skills_schema_repair')
  ON CONFLICT (version) DO NOTHING;
