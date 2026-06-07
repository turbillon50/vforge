-- ============================================================================
-- vForge — Operator (owner) scope for the MCP token
-- ============================================================================
-- "operator" is the canonical name for the OWNER scope (Luis). At runtime it is
-- identical to "admin": it sees EVERYTHING, with NO tenant filter — all projects
-- (incl. org_id NULL), all client_project_status, and the FULL brain_files
-- (knowledge + memory + data). The resolver (lib/mcp/tokens.ts) normalizes
-- 'admin' and 'operator' to the same admin principal, so the SAME token works
-- from any MCP client (desktop, mobile, web, Cursor) — identity is the token,
-- not the Claude account.
--
-- Client tokens keep their isolation untouched: a 'client' token still only ever
-- sees rows where org_id = its own org_id. This migration does NOT relax that.
--
-- Mirrors ensureOperatorScope() in lib/db/auto-heal.ts (kept in sync, like 012).
-- ============================================================================

-- 1) Allow 'operator' alongside the existing scopes.
DO $$
BEGIN
  ALTER TABLE mcp_tokens DROP CONSTRAINT IF EXISTS mcp_tokens_scope_chk;
  ALTER TABLE mcp_tokens
    ADD CONSTRAINT mcp_tokens_scope_chk
    CHECK (scope IN ('admin', 'operator', 'client', 'public'));
EXCEPTION WHEN others THEN
  -- ignore if legacy rows block it; the code normalizes scope regardless
  NULL;
END $$;

-- 2) Pin Luis's portable owner token to operator scope (sees everything).
--    token_hash is SHA-256 of the token (not the secret itself). The token had
--    been mis-marked as 'client', so the owner could not see cross-tenant data.
UPDATE mcp_tokens
   SET scope = 'operator', org_id = NULL
 WHERE token_hash = '085a824168d92736671850480a1ce48fd2b0b3b71cfa993fa10d77c462c51794'
   AND scope IS DISTINCT FROM 'operator';

INSERT INTO schema_migrations (version) VALUES ('013_operator_scope')
  ON CONFLICT (version) DO NOTHING;
