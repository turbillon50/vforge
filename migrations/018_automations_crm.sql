-- 018_automations_crm.sql
-- Motor de flujos (tipo n8n) + CRM real + agendador social para VForge.
-- Aditivo: no toca el control-plane (017) ni el resto del esquema.
-- Todas las tablas viven en DATABASE_URL (DB operativa de la app).

-- ─────────────────────────────────────────────────────────────
-- MOTOR DE FLUJOS
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS flows (
  id          text PRIMARY KEY,
  name        text NOT NULL,
  description text NOT NULL DEFAULT '',
  status      text NOT NULL DEFAULT 'draft',          -- draft | active | paused
  graph       jsonb NOT NULL DEFAULT '{"nodes":[],"edges":[]}'::jsonb,  -- documento del editor visual
  created_by  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Nodos normalizados (fuente de verdad para el EJECUTOR).
CREATE TABLE IF NOT EXISTS flow_nodes (
  id        text PRIMARY KEY,                          -- id de nodo (único global: flowId:nodeKey)
  flow_id   text NOT NULL REFERENCES flows(id) ON DELETE CASCADE,
  node_key  text NOT NULL,                             -- key dentro del flujo
  type      text NOT NULL,                             -- trigger | wa_send | crm_upsert | condition | delay | http | log
  label     text NOT NULL DEFAULT '',
  config    jsonb NOT NULL DEFAULT '{}'::jsonb,
  position  jsonb NOT NULL DEFAULT '{"x":0,"y":0}'::jsonb,
  next      text[] NOT NULL DEFAULT '{}',              -- node_keys siguientes (rama principal / true)
  next_alt  text[] NOT NULL DEFAULT '{}',              -- rama alterna (false) para condition
  UNIQUE (flow_id, node_key)
);
CREATE INDEX IF NOT EXISTS idx_flow_nodes_flow ON flow_nodes (flow_id);

CREATE TABLE IF NOT EXISTS flow_triggers (
  id           text PRIMARY KEY,
  flow_id      text NOT NULL REFERENCES flows(id) ON DELETE CASCADE,
  type         text NOT NULL,                          -- cron | webhook | wa_incoming | crm_event
  config       jsonb NOT NULL DEFAULT '{}'::jsonb,     -- {cron} | {path} | {match,keyword,bridge} | {event}
  active       boolean NOT NULL DEFAULT true,
  last_fired_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_flow_triggers_type ON flow_triggers (type) WHERE active;
CREATE INDEX IF NOT EXISTS idx_flow_triggers_flow ON flow_triggers (flow_id);

CREATE TABLE IF NOT EXISTS flow_runs (
  id          text PRIMARY KEY,
  flow_id     text NOT NULL REFERENCES flows(id) ON DELETE CASCADE,
  trigger_id  text,                                    -- nullable: corrida manual
  status      text NOT NULL DEFAULT 'running',         -- running | success | error
  trigger_type text NOT NULL DEFAULT 'manual',
  context     jsonb NOT NULL DEFAULT '{}'::jsonb,      -- payload inicial + variables acumuladas
  logs        jsonb NOT NULL DEFAULT '[]'::jsonb,      -- [{ts,nodeKey,level,message,data}]
  error       text,
  started_at  timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_flow_runs_flow ON flow_runs (flow_id, started_at DESC);

-- ─────────────────────────────────────────────────────────────
-- CRM
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS crm_stages (
  id        text PRIMARY KEY,
  name      text NOT NULL,
  position  int  NOT NULL DEFAULT 0,
  color     text NOT NULL DEFAULT '#7c3aed',
  is_won    boolean NOT NULL DEFAULT false,
  is_lost   boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crm_contacts (
  id         text PRIMARY KEY,
  wa_number  text UNIQUE,                              -- número WhatsApp (solo dígitos)
  name       text,
  push_name  text,
  email      text,
  phone      text,
  tags       text[] NOT NULL DEFAULT '{}',
  source     text NOT NULL DEFAULT 'whatsapp',         -- whatsapp | manual | webhook | import
  opt_in     boolean NOT NULL DEFAULT true,
  meta       jsonb NOT NULL DEFAULT '{}'::jsonb,
  first_seen timestamptz NOT NULL DEFAULT now(),
  last_seen  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_last_seen ON crm_contacts (last_seen DESC);

CREATE TABLE IF NOT EXISTS crm_leads (
  id         text PRIMARY KEY,
  contact_id text NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
  title      text NOT NULL DEFAULT 'Nuevo lead',
  stage_id   text REFERENCES crm_stages(id) ON DELETE SET NULL,
  value      numeric NOT NULL DEFAULT 0,
  currency   text NOT NULL DEFAULT 'MXN',
  status     text NOT NULL DEFAULT 'open',             -- open | won | lost
  owner      text,
  notes      text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crm_leads_stage ON crm_leads (stage_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_contact ON crm_leads (contact_id);

CREATE TABLE IF NOT EXISTS crm_interactions (
  id         text PRIMARY KEY,
  contact_id text NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
  lead_id    text REFERENCES crm_leads(id) ON DELETE SET NULL,
  direction  text NOT NULL DEFAULT 'in',               -- in | out
  channel    text NOT NULL DEFAULT 'whatsapp',
  body       text NOT NULL DEFAULT '',
  flow_run_id text,
  meta       jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crm_interactions_contact ON crm_interactions (contact_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────
-- SOCIAL
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS scheduled_posts (
  id           text PRIMARY KEY,
  platform     text NOT NULL,                          -- x | linkedin | instagram | facebook | whatsapp
  content      text NOT NULL DEFAULT '',
  media_url    text,
  scheduled_at timestamptz NOT NULL,
  status       text NOT NULL DEFAULT 'scheduled',      -- scheduled | publishing | published | needs_assist | failed
  mode         text NOT NULL DEFAULT 'auto',           -- auto (API) | vulcano (Navegador asistido)
  result       jsonb NOT NULL DEFAULT '{}'::jsonb,
  error        text,
  created_by   text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_due ON scheduled_posts (scheduled_at) WHERE status = 'scheduled';

-- ─────────────────────────────────────────────────────────────
-- SEED — pipeline CRM por defecto
-- ─────────────────────────────────────────────────────────────
INSERT INTO crm_stages (id, name, position, color, is_won, is_lost) VALUES
  ('stage_nuevo',     'Nuevo',         0, '#7c3aed', false, false),
  ('stage_contactado','Contactado',    1, '#6366f1', false, false),
  ('stage_calificado','Calificado',    2, '#3b82f6', false, false),
  ('stage_propuesta', 'Propuesta',     3, '#f59e0b', false, false),
  ('stage_ganado',    'Ganado',        4, '#10b981', true,  false),
  ('stage_perdido',   'Perdido',       5, '#ef4444', false, true)
ON CONFLICT (id) DO NOTHING;
