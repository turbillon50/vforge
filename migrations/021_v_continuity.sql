-- 021_v_continuity.sql
-- V como entidad continua, no chatbot que despierta con amnesia.
-- Aterrizado sobre el schema real: public.lessons, public.projects,
-- public.dispatch_queue, public.agent_registry, brain.conversations.
-- Idempotente: re-ejecutable sin romper nada.

BEGIN;

-- =====================================================================
-- 1. ESTADO INTERNO PERSISTENTE  (singleton + historia)
-- =====================================================================
-- Singleton: la "mente actual" de V. Vive en memoria del state manager
-- y se sincroniza aquí en cada cambio para sobrevivir reinicios.
CREATE TABLE IF NOT EXISTS v_internal_state (
  id              SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),  -- una sola fila
  mood            TEXT    NOT NULL DEFAULT 'focused',  -- engaged|bored|focused|concerned|alert
  energy_level    INT     NOT NULL DEFAULT 70 CHECK (energy_level BETWEEN 0 AND 100),
  current_focus   TEXT,                                -- project_id o tema en curso
  alert_level     INT     NOT NULL DEFAULT 0 CHECK (alert_level BETWEEN 0 AND 5),
  streak_ok       INT     NOT NULL DEFAULT 0,          -- interacciones buenas seguidas
  streak_bad      INT     NOT NULL DEFAULT 0,          -- fricción seguida (Luis encabronado)
  last_user_signal TEXT,                               -- positive|neutral|negative|urgent
  notes           TEXT,                                -- nota libre de V sobre cómo se siente
  last_update     TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO v_internal_state (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Historia del estado: alimenta "evolución del tono" en el dashboard.
CREATE TABLE IF NOT EXISTS v_state_history (
  id            BIGSERIAL PRIMARY KEY,
  ts            TIMESTAMPTZ NOT NULL DEFAULT now(),
  mood          TEXT,
  energy_level  INT,
  alert_level   INT,
  current_focus TEXT,
  trigger       TEXT,        -- qué disparó el cambio: 'interaction','deploy_fail','idle','proactive_run'
  user_signal   TEXT
);
CREATE INDEX IF NOT EXISTS idx_v_state_history_ts ON v_state_history (ts DESC);

-- =====================================================================
-- 2. OPINIONES Y PREFERENCIAS PROPIAS
-- =====================================================================
-- V forma opiniones a partir de public.lessons (evidencia acumulada).
CREATE TABLE IF NOT EXISTS v_opinions (
  id             BIGSERIAL PRIMARY KEY,
  topic          TEXT NOT NULL,                 -- 'framework', 'deploy', 'db', 'estilo-luis'
  opinion        TEXT NOT NULL,                 -- "Prefiero Next.js sobre Vite para PWAs de Luis"
  stance         TEXT,                          -- prefer|avoid|always|never|depends
  confidence     NUMERIC(3,2) NOT NULL DEFAULT 0.50 CHECK (confidence BETWEEN 0 AND 1),
  evidence_count INT  NOT NULL DEFAULT 1,       -- cuántas lecciones la sostienen
  evidence_refs  BIGINT[] DEFAULT '{}',         -- ids de public.lessons que la formaron
  last_outcome   TEXT,                          -- 'reinforced' | 'challenged'
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_updated   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (topic, opinion)
);
CREATE INDEX IF NOT EXISTS idx_v_opinions_topic ON v_opinions (topic);
CREATE INDEX IF NOT EXISTS idx_v_opinions_conf  ON v_opinions (confidence DESC);

-- =====================================================================
-- 3. INICIATIVA PROACTIVA  (sugerencias que V genera sola cada 24h)
-- =====================================================================
-- Tabla propia para el ciclo de vida UI (mostrada/aceptada/descartada).
-- Cuando Luis la acepta, se empuja a dispatch_queue como job real.
CREATE TABLE IF NOT EXISTS v_suggestions (
  id            BIGSERIAL PRIMARY KEY,
  project_id    TEXT REFERENCES projects(id) ON DELETE SET NULL,
  title         TEXT NOT NULL,
  rationale     TEXT NOT NULL,                  -- por qué V lo propone (cita estado del proyecto)
  proposed_action TEXT,                         -- comando/prompt sugerido para el agente
  target_agent  TEXT DEFAULT 'claude',          -- a qué agente delegaría (ver sección 4)
  confidence    NUMERIC(3,2) DEFAULT 0.60,
  status        TEXT NOT NULL DEFAULT 'pending', -- pending|shown|accepted|dismissed|expired
  dispatch_id   INT,                            -- id en dispatch_queue si fue aceptada
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at   TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_v_suggestions_status ON v_suggestions (status, created_at DESC);

-- =====================================================================
-- 4. RELACIÓN CON OTROS AGENTES  (V como orquestadora)
-- =====================================================================
-- Roster de a quién delega V según naturaleza de la tarea.
CREATE TABLE IF NOT EXISTS v_agent_roster (
  agent        TEXT PRIMARY KEY,   -- vulcano|tanit|breack|goossip|claude|grok|codex
  role         TEXT NOT NULL,      -- "infra/deploy", "diseño/UI", "QA/debug", "social/contenido"
  handles      TEXT[] NOT NULL,    -- keywords que enrutan: {'deploy','dns','server'}
  active       BOOLEAN DEFAULT true,
  notes        TEXT
);

INSERT INTO v_agent_roster (agent, role, handles, notes) VALUES
  ('vulcano', 'infra/deploy/coordinación', ARRAY['deploy','dns','server','vercel','infra','hetzner'], 'capataz de la fábrica'),
  ('tanit',   'diseño/UI/branding',        ARRAY['ui','diseño','landing','figma','brand','css'],     'estética y front'),
  ('breack',  'QA/debug/seguridad',        ARRAY['bug','debug','error','test','security','fix'],     'rompe para validar'),
  ('goossip', 'social/contenido',          ARRAY['post','x','linkedin','whatsapp','campaña'],        'agente social autónomo')
ON CONFLICT (agent) DO NOTHING;

-- Bitácora de delegaciones: quién mandó qué a quién (alimenta crecimiento).
CREATE TABLE IF NOT EXISTS v_delegations (
  id           BIGSERIAL PRIMARY KEY,
  ts           TIMESTAMPTZ NOT NULL DEFAULT now(),
  target_agent TEXT NOT NULL,
  reason       TEXT,            -- por qué V eligió ese agente
  task_summary TEXT,
  dispatch_id  INT,
  outcome      TEXT             -- done|failed|pending
);
CREATE INDEX IF NOT EXISTS idx_v_delegations_ts ON v_delegations (ts DESC);

-- =====================================================================
-- 5. CRECIMIENTO VISIBLE  (snapshots diarios para el dashboard)
-- =====================================================================
CREATE TABLE IF NOT EXISTS v_growth_snapshot (
  day                DATE PRIMARY KEY,
  total_conversations INT  DEFAULT 0,
  lessons_learned     INT  DEFAULT 0,
  projects_known      INT  DEFAULT 0,
  opinions_formed     INT  DEFAULT 0,
  tasks_total         INT  DEFAULT 0,
  tasks_succeeded     INT  DEFAULT 0,
  success_rate        NUMERIC(5,2) DEFAULT 0,   -- %
  suggestions_made    INT  DEFAULT 0,
  suggestions_accepted INT DEFAULT 0,
  avg_directness      NUMERIC(4,2),             -- métrica de tono (0=explica, 1=directa)
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Vista "ahora mismo": lo que el dashboard pinta sin recalcular nada pesado.
CREATE OR REPLACE VIEW v_growth_now AS
SELECT
  (SELECT count(*) FROM brain.conversations)                                  AS total_conversations,
  (SELECT count(*) FROM lessons)                                             AS lessons_learned,
  (SELECT count(*) FROM projects WHERE active)                              AS projects_known,
  (SELECT count(*) FROM v_opinions)                                         AS opinions_formed,
  (SELECT count(*) FROM dispatch_queue)                                     AS tasks_total,
  (SELECT count(*) FROM dispatch_queue WHERE status IN ('done','completed')) AS tasks_succeeded,
  ROUND(100.0 * (SELECT count(*) FROM dispatch_queue WHERE status IN ('done','completed'))
        / NULLIF((SELECT count(*) FROM dispatch_queue WHERE status IN ('done','completed','failed','error')),0), 1) AS success_rate,
  (SELECT count(*) FROM v_suggestions)                                      AS suggestions_made,
  (SELECT count(*) FROM v_suggestions WHERE status='accepted')             AS suggestions_accepted;

COMMIT;
