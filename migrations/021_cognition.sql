-- ============================================================================
-- 021_cognition.sql — Arquitectura cognitiva de VULCANO
-- ============================================================================
-- Cinco capas que convierten a V de "un LLM con historial" en un sistema que
-- PIENSA, APRENDE y EXISTE fuera de los chats:
--
--   1. WORLD MODEL ........ graph nodes/edges (conocimiento vivo navegable)
--   2. REFUERZO ........... feedback + heuristics (aprende de Luis)
--   3. DAEMON ............. observations + dispatch_queue (conciencia 24/7)
--   4. EPISÓDICA .......... episodes (recuerdos completos, narrables)
--   5. RAZONAMIENTO ....... reasoning_chains (CoT persistente y reusable)
--
-- Todo vive en el mismo Neon (schema public) que dispatch_queue / router_stats,
-- para que el enjambre, el daemon y el chat de V compartan una sola mente.
-- Idempotente: CREATE ... IF NOT EXISTS en todo.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- CAPA 1 — WORLD MODEL  (grafo de conocimiento vivo)
-- ============================================================================

CREATE TABLE IF NOT EXISTS kg_nodes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type        text NOT NULL CHECK (type IN (
                'Project','Client','Technology','Pattern',
                'Lesson','Person','Decision','Event')),
  name        text NOT NULL,
  properties  jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- "salud" del nodo: cuántas veces se ha tocado y qué tan central es
  importance  real NOT NULL DEFAULT 0.5,    -- 0..1, decae con el tiempo
  hits        int  NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (type, name)
);
CREATE INDEX IF NOT EXISTS idx_kg_nodes_type ON kg_nodes (type);
CREATE INDEX IF NOT EXISTS idx_kg_nodes_props ON kg_nodes USING gin (properties);
CREATE INDEX IF NOT EXISTS idx_kg_nodes_name_trgm ON kg_nodes (lower(name));

CREATE TABLE IF NOT EXISTS kg_edges (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_id     uuid NOT NULL REFERENCES kg_nodes(id) ON DELETE CASCADE,
  to_id       uuid NOT NULL REFERENCES kg_nodes(id) ON DELETE CASCADE,
  relation    text NOT NULL CHECK (relation IN (
                'USES','DEPENDS_ON','LEARNED_FROM','FAILED_WITH',
                'SUCCEEDED_WITH','BELONGS_TO','RELATED_TO','CAUSED','SOLVED_BY')),
  weight      real NOT NULL DEFAULT 1.0,    -- fuerza de la relación (refuerza/decae)
  properties  jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  last_reinforced_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (from_id, to_id, relation)
);
CREATE INDEX IF NOT EXISTS idx_kg_edges_from ON kg_edges (from_id);
CREATE INDEX IF NOT EXISTS idx_kg_edges_to   ON kg_edges (to_id);
CREATE INDEX IF NOT EXISTS idx_kg_edges_rel  ON kg_edges (relation);

-- ============================================================================
-- CAPA 2 — APRENDIZAJE POR REFUERZO DESDE LUIS
-- ============================================================================

CREATE TABLE IF NOT EXISTS feedback (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    text,
  action_taken  text NOT NULL,           -- qué hizo V
  result        text,                    -- qué pasó
  -- -2 = "eso estuvo mal", -1 flojo, +1 bien, +2 "perfecto"
  luis_rating   int NOT NULL DEFAULT 0 CHECK (luis_rating BETWEEN -2 AND 2),
  lesson        text,                    -- la lección destilada (la genera _learn)
  context       jsonb NOT NULL DEFAULT '{}'::jsonb,  -- task_type, model, project...
  processed     boolean NOT NULL DEFAULT false,      -- ¿ya alimentó las heurísticas?
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_feedback_unprocessed ON feedback (created_at)
  WHERE processed = false;

-- Reglas de razonamiento que SÍ cambian el comportamiento en el siguiente turno.
-- Se inyectan como contexto al prompt de V, ordenadas por weight.
CREATE TABLE IF NOT EXISTS heuristics (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope         text NOT NULL DEFAULT 'global',   -- global | project:X | task:CODE...
  trigger       text NOT NULL,           -- cuándo aplica ("al deployar en Vercel")
  rule          text NOT NULL,           -- qué hacer ("alinear maxDuration en vercel.json")
  weight        real NOT NULL DEFAULT 1.0,        -- sube con +rating, baja con -rating
  hits          int  NOT NULL DEFAULT 0,          -- veces aplicada
  wins          int  NOT NULL DEFAULT 0,          -- veces que confirmó éxito
  source_feedback_id uuid REFERENCES feedback(id) ON DELETE SET NULL,
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scope, trigger)
);
CREATE INDEX IF NOT EXISTS idx_heuristics_active ON heuristics (scope, weight DESC)
  WHERE active = true;

-- ============================================================================
-- CAPA 3 — DAEMON DE CONCIENCIA CONTINUA
-- ============================================================================

-- Cola de tareas que el daemon (o el chat) encola para el enjambre.
-- IF NOT EXISTS porque bandit_router ya la consume; aquí garantizamos el shape.
CREATE TABLE IF NOT EXISTS dispatch_queue (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_type   text NOT NULL DEFAULT 'CODE',
  prompt      text NOT NULL,
  status      text NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending','running','done','failed','skipped')),
  model       text,
  result      text,
  priority    int NOT NULL DEFAULT 5,            -- 1 = urgente, 9 = cuando se pueda
  source      text NOT NULL DEFAULT 'chat',      -- chat | daemon | feedback
  meta        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dispatch_pending ON dispatch_queue (priority, created_at)
  WHERE status = 'pending';

-- Observaciones del daemon (anomalías detectadas). Dedupe por (kind, subject)
-- mientras estén 'open' para no spamear WhatsApp.
CREATE TABLE IF NOT EXISTS observations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind        text NOT NULL,            -- stale_project | url_down | db_slow | deploy_failed | payment_pending
  subject     text NOT NULL,            -- nombre proyecto / url / cliente
  severity    text NOT NULL DEFAULT 'info'
              CHECK (severity IN ('info','warn','critical')),
  detail      text,
  status      text NOT NULL DEFAULT 'open'
              CHECK (status IN ('open','notified','resolved','muted')),
  data        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_observations_open
  ON observations (kind, subject) WHERE status IN ('open','notified');

-- ============================================================================
-- CAPA 4 — MEMORIA EPISÓDICA REAL
-- ============================================================================

CREATE TABLE IF NOT EXISTS episodes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ts                timestamptz NOT NULL DEFAULT now(),
  title             text NOT NULL,
  what_happened     text NOT NULL,
  what_was_decided  text,
  what_was_learned  text,
  people_involved   text[]  NOT NULL DEFAULT '{}',
  projects_affected text[]  NOT NULL DEFAULT '{}',
  importance        int NOT NULL DEFAULT 5 CHECK (importance BETWEEN 1 AND 10),
  -- enlaces al grafo: nodos que este episodio tocó (para navegar memoria→grafo)
  node_ids          uuid[] NOT NULL DEFAULT '{}',
  session_id        text,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_episodes_ts ON episodes (ts DESC);
CREATE INDEX IF NOT EXISTS idx_episodes_importance ON episodes (importance DESC);
CREATE INDEX IF NOT EXISTS idx_episodes_projects ON episodes USING gin (projects_affected);
-- Búsqueda léxica en español sobre el cuerpo del episodio (FTS sin pgvector).
CREATE INDEX IF NOT EXISTS idx_episodes_fts ON episodes USING gin (
  to_tsvector('spanish',
    coalesce(title,'') || ' ' || coalesce(what_happened,'') || ' ' ||
    coalesce(what_was_decided,'') || ' ' || coalesce(what_was_learned,''))
);

-- ============================================================================
-- CAPA 5 — RAZONAMIENTO MULTI-ETAPA (Chain of Thought persistente)
-- ============================================================================

CREATE TABLE IF NOT EXISTS reasoning_chains (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question      text NOT NULL,
  -- fingerprint normalizado para recuperar cadenas de problemas similares
  fingerprint   text NOT NULL,
  steps         jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [{n, thought, evidence, action}]
  conclusion    text,
  confidence    real NOT NULL DEFAULT 0.5,           -- 0..1
  validated_by_luis boolean,                          -- null = sin validar
  reuse_count   int NOT NULL DEFAULT 0,
  parent_chain_id uuid REFERENCES reasoning_chains(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chains_fingerprint ON reasoning_chains (fingerprint);
CREATE INDEX IF NOT EXISTS idx_chains_fts ON reasoning_chains USING gin (
  to_tsvector('spanish', coalesce(question,'') || ' ' || coalesce(conclusion,'')));

-- ============================================================================
-- VISTA DE ARRANQUE — lo que V carga al inicio de cada turno (la "mente activa")
-- ============================================================================
CREATE OR REPLACE VIEW v_active_mind AS
  SELECT 'heuristic' AS kind, rule AS content, weight AS score
    FROM heuristics WHERE active AND weight > 0.3
  UNION ALL
  SELECT 'episode', title || ' — ' || coalesce(what_was_learned, what_happened),
         importance::real
    FROM episodes WHERE importance >= 7
  UNION ALL
  SELECT 'open_observation', kind || ': ' || subject || ' — ' || coalesce(detail,''),
         CASE severity WHEN 'critical' THEN 10 WHEN 'warn' THEN 6 ELSE 3 END
    FROM observations WHERE status IN ('open','notified')
  ORDER BY score DESC;
