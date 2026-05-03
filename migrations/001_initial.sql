-- ============================================================================
-- vForge M0 — Initial schema
-- ============================================================================
-- Creates the persistent memory layer that V (the Forge AI) lives on.
--
-- Two key design decisions encoded here:
--
-- 1. TWO CLASSES OF SECRETS (see ADR-008):
--    - operator_secrets : server-side AES-256-GCM with VFORGE_MASTER_PEPPER.
--                         Server CAN decrypt. For the keys vForge needs to
--                         function (Anthropic, OpenAI, Vercel, etc.).
--    - user_secrets     : client-side AES-256-GCM with Vault Master Password
--                         derived via Argon2id-WASM. Server CANNOT decrypt.
--                         Zero-knowledge for end-user secrets.
--
-- 2. PERSISTENT KNOWLEDGE & CONVERSATIONS for V:
--    - knowledge_base   : facts, examples, ADRs, runbooks, lessons that V
--                         loads as context on every chat turn.
--    - conversations    : full chat history so V remembers what you said
--                         3 days ago.
--    - system_config    : V's name, personality, language, tone.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------
-- USERS — keyed by Clerk user_id (text format like user_xxx)
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id                text PRIMARY KEY,
  email             text NOT NULL UNIQUE,
  name              text,
  role              text NOT NULL DEFAULT 'operator'
                    CHECK (role IN ('operator', 'admin', 'client', 'demo')),
  -- Vault setup state (Class 2 — zero-knowledge)
  vault_setup_at    timestamptz,
  vault_salt        bytea,
  vault_backup_codes_hashed bytea[],
  master_key_recovery_blobs bytea[],
  -- Audit
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  last_seen_at      timestamptz
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- -----------------------------------------------------------
-- OPERATOR_SECRETS — Class 1, server-side encrypted
-- The keys vForge uses to power V (Anthropic, OpenAI, etc.)
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS operator_secrets (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text NOT NULL UNIQUE,         -- e.g. ANTHROPIC_API_KEY
  description       text,
  ciphertext        bytea NOT NULL,
  iv                bytea NOT NULL,
  auth_tag          bytea NOT NULL,
  -- Metadata visible to operator
  provider          text,                          -- e.g. anthropic, openai, vercel
  scope             text,                          -- e.g. account-wide, project-scoped
  created_at        timestamptz NOT NULL DEFAULT now(),
  rotated_at        timestamptz,
  last_used_at      timestamptz,
  last_used_by      text REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_operator_secrets_provider ON operator_secrets (provider);

-- -----------------------------------------------------------
-- USER_SECRETS — Class 2, zero-knowledge (encrypted client-side)
-- Stores secrets users upload via /vault. Server cannot decrypt.
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_secrets (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id        text,                          -- nullable = global
  name              text NOT NULL,
  scope             text NOT NULL DEFAULT 'client'
                    CHECK (scope IN ('client', 'platform', 'platform-global')),
  -- Opaque ciphertext blob (server can never decrypt)
  ciphertext        bytea NOT NULL,
  iv                bytea NOT NULL,
  auth_tag          bytea NOT NULL,
  -- Metadata
  injected_to       text[] NOT NULL DEFAULT '{}',  -- providers it's deployed to
  created_at        timestamptz NOT NULL DEFAULT now(),
  last_used_at      timestamptz,
  UNIQUE (user_id, project_id, name)
);
CREATE INDEX IF NOT EXISTS idx_user_secrets_user ON user_secrets (user_id, project_id);

-- -----------------------------------------------------------
-- PROJECTS — the real catalog (replaces lib/mock-data PROJECTS)
-- Cross-references GitHub repos and Vercel deployments.
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS projects (
  id                text PRIMARY KEY,              -- slug, e.g. castores, vforge
  name              text NOT NULL,
  description       text,
  -- Source of truth
  github_repo       text,                          -- e.g. turbillon50/FINAL-CASTORES
  github_private    boolean DEFAULT false,
  github_default_branch text DEFAULT 'main',
  github_language   text,
  github_url        text,
  -- Deploy info
  vercel_project_id text,                          -- e.g. prj_...
  vercel_url        text,                          -- e.g. https://castores.info
  domain            text,                          -- custom domain if any
  -- Categorization (set by V's Repo Audit tool)
  category          text NOT NULL DEFAULT 'en_revision'
                    CHECK (category IN (
                      'produccion', 'activo', 'en_revision',
                      'en_pausa', 'archivo', 'pendiente_borrado'
                    )),
  status            text NOT NULL DEFAULT 'unknown'
                    CHECK (status IN ('live', 'building', 'error', 'idle', 'unknown')),
  -- Audit
  last_audit_at     timestamptz,
  last_audit_score  int,                           -- 0-100 from V's Repo Audit
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_projects_category ON projects (category);
CREATE INDEX IF NOT EXISTS idx_projects_status   ON projects (status);

-- -----------------------------------------------------------
-- REPO_AUDITS — history of audits per project run by V
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS repo_audits (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  audit_score       int NOT NULL,                  -- 0-100
  proposed_category text NOT NULL,
  findings          jsonb NOT NULL DEFAULT '{}',   -- {commits_30d, build_status, deps_outdated, has_readme, has_tests, ...}
  ran_by            text REFERENCES users(id) ON DELETE SET NULL,
  ran_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_repo_audits_project ON repo_audits (project_id, ran_at DESC);

-- -----------------------------------------------------------
-- KNOWLEDGE_BASE — V's persistent memory of facts, examples, lessons
-- Loaded as context on every chat turn (filtered by tags + recency).
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS knowledge_base (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind              text NOT NULL                  -- e.g. operator_profile, organization, method, adr, lesson, runbook, project_meta
                    CHECK (kind IN (
                      'operator_profile', 'organization', 'method',
                      'adr', 'lesson', 'runbook', 'project_meta',
                      'preference', 'example', 'note'
                    )),
  title             text NOT NULL,
  content           text NOT NULL,
  tags              text[] NOT NULL DEFAULT '{}',
  source            text,                          -- file path, URL, or source description
  -- For RAG (future): embedding vector (using pgvector when needed)
  -- embedding       vector(1536),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  created_by        text REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_knowledge_kind ON knowledge_base (kind);
CREATE INDEX IF NOT EXISTS idx_knowledge_tags ON knowledge_base USING gin (tags);

-- -----------------------------------------------------------
-- CONVERSATIONS — every chat turn between user and V
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS conversations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id        text NOT NULL,                 -- groups turns of a single conversation
  role              text NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content           text NOT NULL,
  tool_name         text,                          -- if role = 'tool'
  tool_args         jsonb,
  tool_result       jsonb,
  model             text,                          -- e.g. claude-opus-4-7
  tokens_in         int,
  tokens_out        int,
  cost_usd          numeric(10, 6),
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_conversations_user_created ON conversations (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_session ON conversations (session_id, created_at);

-- -----------------------------------------------------------
-- SYSTEM_CONFIG — singleton table for V's identity & config
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_config (
  id                int PRIMARY KEY DEFAULT 1 CHECK (id = 1),  -- enforces singleton
  ai_name           text NOT NULL DEFAULT 'V',
  ai_tagline        text NOT NULL DEFAULT 'Tu asociado digital',
  ai_personality    text NOT NULL,                 -- system prompt template
  default_language  text NOT NULL DEFAULT 'es-MX',
  default_model     text NOT NULL DEFAULT 'claude-sonnet-4-6',
  default_tone      text NOT NULL DEFAULT 'cálido + camarada técnico',
  operator_user_id  text REFERENCES users(id),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------
-- AUDIT_EVENTS — every action V or operator takes
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_events (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           text REFERENCES users(id) ON DELETE SET NULL,
  action            text NOT NULL,                 -- e.g. secret.create, project.deploy
  resource_type     text,                          -- e.g. secret, project, conversation
  resource_id       text,
  ring              int NOT NULL CHECK (ring BETWEEN 0 AND 3),
  ip                inet,
  user_agent        text,
  payload           jsonb,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_events_user_created ON audit_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_action ON audit_events (action);

-- -----------------------------------------------------------
-- MIGRATIONS table — track which migrations have been applied
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS schema_migrations (
  version           text PRIMARY KEY,
  applied_at        timestamptz NOT NULL DEFAULT now()
);
INSERT INTO schema_migrations (version) VALUES ('001_initial')
  ON CONFLICT (version) DO NOTHING;
