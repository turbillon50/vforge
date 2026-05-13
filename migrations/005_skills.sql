-- ============================================================================
-- vForge M16 — Skills registry (ADR-009 extension)
-- ============================================================================
-- Skills are reusable, self-describing packages that V can discover and
-- invoke. Each skill bundles: a system prompt fragment, a list of tools
-- it needs, examples, and a ring level.
--
-- Search is full-text (Postgres ts_vector) — no external embedding
-- provider needed for v1. If we later want semantic search, add a
-- pgvector column and backfill from OpenAI text-embedding-3-small;
-- the table shape stays compatible.
--
-- Two tools consume this table (see lib/forge/tools.ts):
--   skill_search(query, top_k)   → ranked summaries
--   skill_install(skill_id)      → returns full body so V can use it
--                                  in the rest of the turn
--
-- Skills can be 'builtin' (seeded), 'user' (added by Luis), or
-- 'marketplace' (Fase 2, imported from external sources). Source is
-- used to gate edit/delete permissions later.
-- ============================================================================

CREATE TABLE IF NOT EXISTS skills (
  id                text PRIMARY KEY,                -- 'repo-rescue', 'github-pr-author'
  name              text NOT NULL,
  description       text NOT NULL,                   -- 1-2 line semantic blurb
  system_prompt     text NOT NULL,                   -- fragment V reads on install
  required_tools    text[] NOT NULL DEFAULT '{}',    -- tool names V should use
  examples          jsonb,                           -- few-shot examples or example flows
  ring_max          int NOT NULL DEFAULT 1
                    CHECK (ring_max BETWEEN 0 AND 3),
  source            text NOT NULL DEFAULT 'builtin'
                    CHECK (source IN ('builtin', 'user', 'marketplace')),
  tags              text[] NOT NULL DEFAULT '{}',
  invocation_count  int NOT NULL DEFAULT 0,
  last_invoked_at   timestamptz,
  created_by        text REFERENCES users(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Search uses ILIKE + tag containment. Postgres pg_trgm extension
-- gives us a GIN index over trigrams so ILIKE '%foo%' is fast even on
-- a large catalog. Suficiente para Fase 1 (≤100 skills). Si el catálogo
-- crece, migramos a tsvector con trigger en M16.5.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_skills_name_trgm
  ON skills USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_skills_description_trgm
  ON skills USING GIN (description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_skills_tags
  ON skills USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_skills_source
  ON skills (source);

-- Tracking which skills got invoked, by which session, with what outcome.
-- Used to surface "most useful skills" + populate the rating in v2.
CREATE TABLE IF NOT EXISTS skill_invocations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id      text NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  session_id    text NOT NULL,
  user_id       text REFERENCES users(id) ON DELETE SET NULL,
  outcome       text NOT NULL DEFAULT 'pending'
                CHECK (outcome IN ('pending', 'success', 'failed', 'aborted')),
  invoked_at    timestamptz NOT NULL DEFAULT now(),
  completed_at  timestamptz
);

CREATE INDEX IF NOT EXISTS idx_skill_invocations_skill
  ON skill_invocations (skill_id, invoked_at DESC);
CREATE INDEX IF NOT EXISTS idx_skill_invocations_session
  ON skill_invocations (session_id, invoked_at DESC);

INSERT INTO schema_migrations (version) VALUES ('005_skills')
  ON CONFLICT (version) DO NOTHING;
