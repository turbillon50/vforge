-- ============================================================================
-- vForge M011 — Multi-tenant foundation
-- ============================================================================
-- Purpose: open vForge to SaaS without disturbing V (Luis's agent).
--
-- Strategy (additive only):
--   * Add `user_id TEXT NOT NULL DEFAULT 'operator_luis'` to the tables that
--     hold personal context (knowledge, projects, directives, skills, agent
--     config). Every existing row gets auto-tagged as Luis's data so V keeps
--     behaving exactly as today.
--   * Add FK to users(id) for referential integrity.
--   * Add composite indexes (user_id, ...) for tenant-scoped queries.
--
-- What we DO NOT touch:
--   * V's hardcoded `SENIOR_ENGINEER_DOCTRINE` (lives in code, shared).
--   * Existing rows. Default is applied at insert time; the ALTER also
--     backfills NULLs to 'operator_luis' via UPDATE.
--   * `system_config` (singleton — already keyed by `operator_user_id`).
--   * `conversations`, `user_secrets`, `audit_events` (already have user_id).
--
-- The application reads through `buildSystemPrompt(user_id?)`; passing no
-- argument keeps the legacy behavior (no WHERE filter), so this migration
-- can ship safely before the Clerk wiring lands.
-- ============================================================================

BEGIN;

-- -----------------------------------------------------------
-- knowledge_base — personal facts/memories/lessons of each operator
-- -----------------------------------------------------------
ALTER TABLE knowledge_base
  ADD COLUMN IF NOT EXISTS user_id text NOT NULL DEFAULT 'operator_luis'
    REFERENCES users(id) ON DELETE CASCADE;

UPDATE knowledge_base SET user_id = 'operator_luis' WHERE user_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_knowledge_user_kind
  ON knowledge_base (user_id, kind);
CREATE INDEX IF NOT EXISTS idx_knowledge_user_created
  ON knowledge_base (user_id, created_at DESC);

-- -----------------------------------------------------------
-- projects — projects belong to a single operator
-- -----------------------------------------------------------
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS user_id text NOT NULL DEFAULT 'operator_luis'
    REFERENCES users(id) ON DELETE CASCADE;

UPDATE projects SET user_id = 'operator_luis' WHERE user_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_projects_user_category
  ON projects (user_id, category);
CREATE INDEX IF NOT EXISTS idx_projects_user_status
  ON projects (user_id, status);

-- -----------------------------------------------------------
-- agent_directives — each operator has their own directives
-- (guarded: the table may not exist yet if 009 hasn't been applied)
-- -----------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agent_directives') THEN
    EXECUTE 'ALTER TABLE agent_directives
              ADD COLUMN IF NOT EXISTS user_id text NOT NULL DEFAULT ''operator_luis''
                REFERENCES users(id) ON DELETE CASCADE';
    EXECUTE 'UPDATE agent_directives SET user_id = ''operator_luis'' WHERE user_id IS NULL';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_directives_user_active
              ON agent_directives (user_id, active, priority)';
  END IF;
END $$;

-- -----------------------------------------------------------
-- skills — installed skills are per-operator
-- -----------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'skills') THEN
    EXECUTE 'ALTER TABLE skills
              ADD COLUMN IF NOT EXISTS user_id text NOT NULL DEFAULT ''operator_luis''
                REFERENCES users(id) ON DELETE CASCADE';
    EXECUTE 'UPDATE skills SET user_id = ''operator_luis'' WHERE user_id IS NULL';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_skills_user_active
              ON skills (user_id, active)';
  END IF;
END $$;

-- -----------------------------------------------------------
-- agent_config — per-operator agent settings (model, max tokens, etc.)
-- -----------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agent_config') THEN
    EXECUTE 'ALTER TABLE agent_config
              ADD COLUMN IF NOT EXISTS user_id text NOT NULL DEFAULT ''operator_luis''
                REFERENCES users(id) ON DELETE CASCADE';
    EXECUTE 'UPDATE agent_config SET user_id = ''operator_luis'' WHERE user_id IS NULL';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_agent_config_user
              ON agent_config (user_id)';
  END IF;
END $$;

INSERT INTO schema_migrations (version) VALUES ('011_multi_tenant')
  ON CONFLICT (version) DO NOTHING;

COMMIT;
