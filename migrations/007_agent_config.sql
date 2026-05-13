-- ============================================================================
-- vForge M-self-config — Agent config table (V can reconfigure herself)
-- ============================================================================
-- Lets V pick which OpenRouter model gets used per task kind without
-- a code deploy. The router in /api/forge/run reads from this table
-- first, then falls back to env vars (PR #30), then to the registry
-- defaults in lib/forge/models.ts.
--
-- V exposes two tools (lib/forge/tools.ts):
--   agent_config_set(task_kind, model)
--   agent_config_get()
--
-- So Luis can say "V, usa Haiku para chat" and V actually changes
-- its own behaviour for the next turn.
-- ============================================================================

CREATE TABLE IF NOT EXISTS agent_config (
  task_kind   text PRIMARY KEY
              CHECK (task_kind IN (
                'chat-main', 'reasoning', 'code-edit',
                'classification', 'summarization', 'extraction',
                'translation', 'brainstorm', 'scout'
              )),
  model       text NOT NULL,
  updated_by  text REFERENCES users(id) ON DELETE SET NULL,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Sensible defaults: balance cost vs quality.
-- chat-main = Sonnet (Luis talking to V); everything else as cheap
-- as possible while still supporting tools when needed.
INSERT INTO agent_config (task_kind, model, updated_by) VALUES
  ('chat-main',      'anthropic/claude-sonnet-4.6',  'operator_luis'),
  ('reasoning',      'anthropic/claude-sonnet-4.6',  'operator_luis'),
  ('code-edit',      'anthropic/claude-sonnet-4.6',  'operator_luis'),
  ('classification', 'google/gemini-2.5-flash',      'operator_luis'),
  ('summarization',  'anthropic/claude-haiku-4.5',   'operator_luis'),
  ('extraction',     'anthropic/claude-haiku-4.5',   'operator_luis'),
  ('translation',    'google/gemini-2.5-flash',      'operator_luis'),
  ('brainstorm',     'minimax/minimax-m2.5:free',    'operator_luis'),
  ('scout',          'minimax/minimax-m2.5:free',    'operator_luis')
ON CONFLICT (task_kind) DO NOTHING;

INSERT INTO schema_migrations (version) VALUES ('007_agent_config')
  ON CONFLICT (version) DO NOTHING;
