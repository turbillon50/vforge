-- ============================================================================
-- 047_unicorn_eventos.sql — MCP maestro del protocolo Unicorn
-- ============================================================================
-- Eventos de cambio que una app del ecosistema publica para las demás
-- ("se agregó un feature en VForge", "cambió un valor en Momentum"…). Se
-- escriben con la tool MCP `unicorn_publicar_evento` (solo Owner) y se leen
-- con `unicorn_eventos` haciendo polling por cursor (ts, id).
-- Misma DDL que lib/mcp/unicorn.ts (UNICORN_DDL), que también la asegura en
-- runtime vía lib/db/auto-heal.ts. Idempotente: IF NOT EXISTS en todo.
-- ============================================================================

CREATE TABLE IF NOT EXISTS unicorn_eventos (
  id       bigserial PRIMARY KEY,
  proyecto text NOT NULL,            -- projects.id (validado al publicar)
  tipo     text NOT NULL,            -- slug: feature, valor, deploy, precio…
  titulo   text NOT NULL,
  detalle  jsonb NOT NULL DEFAULT '{}'::jsonb,
  origen   text,                     -- app que publica: vforge, momentum…
  autor    text,                     -- clerk_user_id del token MCP
  ts       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_unicorn_eventos_ts       ON unicorn_eventos (ts, id);
CREATE INDEX IF NOT EXISTS idx_unicorn_eventos_proyecto ON unicorn_eventos (proyecto, ts DESC);
