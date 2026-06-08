-- ============================================================================
-- vForge — OAuth 2.0 conector oficial (Claude.ai)
-- ============================================================================
-- Pre-registra el cliente OAuth de Claude.ai para que pueda conectarse al MCP
-- de VForge como conector oficial vía /api/oauth/{authorize,callback,token}.
--
-- Las tablas oauth_clients / oauth_codes se crean en runtime
-- (lib/mcp/oauth.ts → ensureOauthTables). Aquí las creamos IF NOT EXISTS para
-- que la migración sea autosuficiente, y luego insertamos el cliente claude-ai.
--
-- SEGURIDAD: sólo se guarda el HASH sha256 del client_secret. El secret en
-- claro NO vive en el repo; se entrega una sola vez al registrar.
--   client_id     : claude-ai
--   redirect_uri  : https://claude.ai/oauth/callback
--   token auth    : client_secret_post (cliente confidencial)
-- ============================================================================

CREATE TABLE IF NOT EXISTS oauth_clients (
  client_id text PRIMARY KEY,
  client_secret_hash text,
  client_name text,
  redirect_uris jsonb NOT NULL DEFAULT '[]'::jsonb,
  grant_types jsonb NOT NULL DEFAULT '["authorization_code","refresh_token"]'::jsonb,
  response_types jsonb NOT NULL DEFAULT '["code"]'::jsonb,
  token_endpoint_auth_method text NOT NULL DEFAULT 'none',
  scope text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS oauth_codes (
  code_hash text PRIMARY KEY,
  client_id text NOT NULL,
  clerk_user_id text NOT NULL,
  redirect_uri text NOT NULL,
  code_challenge text NOT NULL,
  code_challenge_method text NOT NULL DEFAULT 'S256',
  scope text,
  resource text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  used boolean NOT NULL DEFAULT false
);

-- Cliente oficial de Claude.ai. Idempotente: si ya existe, refresca metadata
-- (NO sobreescribe el secret si la fila ya tenía uno, para no romper conexiones
-- vivas — el hash sólo se fija en el primer registro).
INSERT INTO oauth_clients
  (client_id, client_secret_hash, client_name, redirect_uris,
   grant_types, response_types, token_endpoint_auth_method, scope)
VALUES (
  'claude-ai',
  'eb5945f920aab77212cd8d12d4284fb4c9520f869199ae36dfbfe234419725aa',
  'Claude.ai',
  '["https://claude.ai/oauth/callback"]'::jsonb,
  '["authorization_code"]'::jsonb,
  '["code"]'::jsonb,
  'client_secret_post',
  NULL
)
ON CONFLICT (client_id) DO UPDATE SET
  client_name   = EXCLUDED.client_name,
  redirect_uris = EXCLUDED.redirect_uris,
  token_endpoint_auth_method = EXCLUDED.token_endpoint_auth_method,
  client_secret_hash = COALESCE(oauth_clients.client_secret_hash, EXCLUDED.client_secret_hash);
