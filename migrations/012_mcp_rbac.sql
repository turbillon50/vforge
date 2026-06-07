-- ============================================================================
-- vForge — MCP RBAC + Multi-tenant isolation
-- ============================================================================
-- Hardens the public MCP server (/api/mcp) so it is safe to expose.
--
-- THREE SCOPES per MCP token (mcp_tokens.scope):
--   admin  : the operator (Luis). Sees EVERYTHING, no org filter.
--   client : a tenant. Sees ONLY rows whose org_id matches its own org_id.
--            Never another tenant's data. Never credential brain files.
--   public : marketing only. 401 on every data tool. Can only call the
--            public tools (getting_started, vforge_method, help).
--
-- org_id is the tenant key ("su forge"). For admin tokens it is NULL and the
-- filter is bypassed. For client tokens it scopes every data query.
-- ============================================================================

-- -----------------------------------------------------------
-- mcp_tokens — add scope + org_id (table created in code via ensureTable)
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS mcp_tokens (
  token_hash    text PRIMARY KEY,
  clerk_user_id text NOT NULL,
  label         text,
  created_at    timestamptz DEFAULT now(),
  last_used_at  timestamptz
);

ALTER TABLE mcp_tokens
  ADD COLUMN IF NOT EXISTS scope  text NOT NULL DEFAULT 'client';
ALTER TABLE mcp_tokens
  ADD COLUMN IF NOT EXISTS org_id text;

-- Constrain scope to the three valid values (drop+recreate to be idempotent).
DO $$
BEGIN
  ALTER TABLE mcp_tokens DROP CONSTRAINT IF EXISTS mcp_tokens_scope_chk;
  ALTER TABLE mcp_tokens
    ADD CONSTRAINT mcp_tokens_scope_chk
    CHECK (scope IN ('admin', 'client', 'public'));
EXCEPTION WHEN others THEN
  -- ignore if it cannot be applied (legacy rows); code enforces it too
  NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_mcp_tokens_org ON mcp_tokens (org_id);

-- -----------------------------------------------------------
-- Tenant key on tenant-scoped data tables. NULL = operator-only
-- (admin sees it; clients never do, because their org_id never matches NULL).
-- -----------------------------------------------------------
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS org_id text;
CREATE INDEX IF NOT EXISTS idx_projects_org ON projects (org_id);

-- client_project_status is created at runtime by auto-heal; guard with a
-- CREATE first so this migration is order-independent.
CREATE TABLE IF NOT EXISTS client_project_status (
  project_id     text PRIMARY KEY,
  client_name    text NOT NULL,
  status         text NOT NULL DEFAULT 'en obra',
  total_mxn      numeric NOT NULL DEFAULT 0,
  paid_mxn       numeric NOT NULL DEFAULT 0,
  next_milestone text,
  updated_at     timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE client_project_status
  ADD COLUMN IF NOT EXISTS org_id text;
CREATE INDEX IF NOT EXISTS idx_client_project_status_org
  ON client_project_status (org_id);

INSERT INTO schema_migrations (version) VALUES ('012_mcp_rbac')
  ON CONFLICT (version) DO NOTHING;
