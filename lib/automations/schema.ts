/**
 * Auto-heal del esquema de Automatizaciones + CRM + Social.
 *
 * Idempotente y desacoplado de lib/db/auto-heal.ts (que otros módulos editan)
 * para no chocar. Se invoca perezosamente desde las rutas/engine la primera
 * vez por proceso. Refleja migrations/018_automations_crm.sql.
 */
import { sql } from "@/lib/db/client";

let _ready: Promise<void> | null = null;

async function build(): Promise<void> {
  // ── Motor ────────────────────────────────────────────────
  await sql`CREATE TABLE IF NOT EXISTS flows (
    id text PRIMARY KEY,
    name text NOT NULL,
    description text NOT NULL DEFAULT '',
    status text NOT NULL DEFAULT 'draft',
    graph jsonb NOT NULL DEFAULT '{"nodes":[],"edges":[]}'::jsonb,
    created_by text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  )`;

  await sql`CREATE TABLE IF NOT EXISTS flow_nodes (
    id text PRIMARY KEY,
    flow_id text NOT NULL REFERENCES flows(id) ON DELETE CASCADE,
    node_key text NOT NULL,
    type text NOT NULL,
    label text NOT NULL DEFAULT '',
    config jsonb NOT NULL DEFAULT '{}'::jsonb,
    position jsonb NOT NULL DEFAULT '{"x":0,"y":0}'::jsonb,
    next text[] NOT NULL DEFAULT '{}',
    next_alt text[] NOT NULL DEFAULT '{}',
    UNIQUE (flow_id, node_key)
  )`;
  await sql`CREATE INDEX IF NOT EXISTS idx_flow_nodes_flow ON flow_nodes (flow_id)`;

  await sql`CREATE TABLE IF NOT EXISTS flow_triggers (
    id text PRIMARY KEY,
    flow_id text NOT NULL REFERENCES flows(id) ON DELETE CASCADE,
    type text NOT NULL,
    config jsonb NOT NULL DEFAULT '{}'::jsonb,
    active boolean NOT NULL DEFAULT true,
    last_fired_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
  )`;
  await sql`CREATE INDEX IF NOT EXISTS idx_flow_triggers_type ON flow_triggers (type) WHERE active`;
  await sql`CREATE INDEX IF NOT EXISTS idx_flow_triggers_flow ON flow_triggers (flow_id)`;

  await sql`CREATE TABLE IF NOT EXISTS flow_runs (
    id text PRIMARY KEY,
    flow_id text NOT NULL REFERENCES flows(id) ON DELETE CASCADE,
    trigger_id text,
    status text NOT NULL DEFAULT 'running',
    trigger_type text NOT NULL DEFAULT 'manual',
    context jsonb NOT NULL DEFAULT '{}'::jsonb,
    logs jsonb NOT NULL DEFAULT '[]'::jsonb,
    error text,
    started_at timestamptz NOT NULL DEFAULT now(),
    finished_at timestamptz
  )`;
  await sql`CREATE INDEX IF NOT EXISTS idx_flow_runs_flow ON flow_runs (flow_id, started_at DESC)`;

  // ── CRM ──────────────────────────────────────────────────
  await sql`CREATE TABLE IF NOT EXISTS crm_stages (
    id text PRIMARY KEY,
    name text NOT NULL,
    position int NOT NULL DEFAULT 0,
    color text NOT NULL DEFAULT '#7c3aed',
    is_won boolean NOT NULL DEFAULT false,
    is_lost boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
  )`;

  await sql`CREATE TABLE IF NOT EXISTS crm_contacts (
    id text PRIMARY KEY,
    wa_number text UNIQUE,
    name text,
    push_name text,
    email text,
    phone text,
    tags text[] NOT NULL DEFAULT '{}',
    source text NOT NULL DEFAULT 'whatsapp',
    opt_in boolean NOT NULL DEFAULT true,
    meta jsonb NOT NULL DEFAULT '{}'::jsonb,
    first_seen timestamptz NOT NULL DEFAULT now(),
    last_seen timestamptz NOT NULL DEFAULT now()
  )`;
  await sql`CREATE INDEX IF NOT EXISTS idx_crm_contacts_last_seen ON crm_contacts (last_seen DESC)`;

  await sql`CREATE TABLE IF NOT EXISTS crm_leads (
    id text PRIMARY KEY,
    contact_id text NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
    title text NOT NULL DEFAULT 'Nuevo lead',
    stage_id text REFERENCES crm_stages(id) ON DELETE SET NULL,
    value numeric NOT NULL DEFAULT 0,
    currency text NOT NULL DEFAULT 'MXN',
    status text NOT NULL DEFAULT 'open',
    owner text,
    notes text NOT NULL DEFAULT '',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  )`;
  await sql`CREATE INDEX IF NOT EXISTS idx_crm_leads_stage ON crm_leads (stage_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_crm_leads_contact ON crm_leads (contact_id)`;

  await sql`CREATE TABLE IF NOT EXISTS crm_interactions (
    id text PRIMARY KEY,
    contact_id text NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
    lead_id text REFERENCES crm_leads(id) ON DELETE SET NULL,
    direction text NOT NULL DEFAULT 'in',
    channel text NOT NULL DEFAULT 'whatsapp',
    body text NOT NULL DEFAULT '',
    flow_run_id text,
    meta jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
  )`;
  await sql`CREATE INDEX IF NOT EXISTS idx_crm_interactions_contact ON crm_interactions (contact_id, created_at DESC)`;

  // ── Social ───────────────────────────────────────────────
  await sql`CREATE TABLE IF NOT EXISTS scheduled_posts (
    id text PRIMARY KEY,
    platform text NOT NULL,
    content text NOT NULL DEFAULT '',
    media_url text,
    scheduled_at timestamptz NOT NULL,
    status text NOT NULL DEFAULT 'scheduled',
    mode text NOT NULL DEFAULT 'auto',
    result jsonb NOT NULL DEFAULT '{}'::jsonb,
    error text,
    created_by text,
    created_at timestamptz NOT NULL DEFAULT now(),
    published_at timestamptz
  )`;
  await sql`CREATE INDEX IF NOT EXISTS idx_scheduled_posts_due ON scheduled_posts (scheduled_at) WHERE status = 'scheduled'`;

  // ── Seed pipeline por defecto ────────────────────────────
  await sql`INSERT INTO crm_stages (id, name, position, color, is_won, is_lost) VALUES
    ('stage_nuevo','Nuevo',0,'#7c3aed',false,false),
    ('stage_contactado','Contactado',1,'#6366f1',false,false),
    ('stage_calificado','Calificado',2,'#3b82f6',false,false),
    ('stage_propuesta','Propuesta',3,'#f59e0b',false,false),
    ('stage_ganado','Ganado',4,'#10b981',true,false),
    ('stage_perdido','Perdido',5,'#ef4444',false,true)
    ON CONFLICT (id) DO NOTHING`;
}

/** Garantiza el esquema una sola vez por proceso. Nunca lanza hacia afuera. */
export function ensureAutomationsSchema(): Promise<void> {
  if (!_ready) {
    _ready = build().catch((e) => {
      _ready = null; // permite reintento en el siguiente request
      console.error("[automations auto-heal]", e);
      throw e;
    });
  }
  return _ready;
}
