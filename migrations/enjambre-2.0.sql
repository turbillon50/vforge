-- ============================================================================
-- ENJAMBRE 2.0  —  de "agentes que ejecutan" a "agentes que aprenden"
-- ============================================================================
-- Construye SOBRE el dispatch_queue existente (no lo reemplaza).
--   dispatch_queue ya tiene: id, created_at, status, priority, agent, prompt,
--   result, error, grok_notes, worktree_path, gajo, parent_task_id, task_type,
--   meta, source, progress_pct, log_tail, started_at, completed_at.
--
-- Agrega 4 capacidades:
--   1. ESPECIALIZACIÓN DINÁMICA   -> agent_strengths + route_pick_agent()
--   2. ESFERAS QUE SE DIVIDEN     -> columnas depth/role + jerarquía parent
--   3. COMPETENCIA Y SELECCIÓN    -> dispatch_competitions + resolve_competition()
--   4. MEMORIA COMPARTIDA         -> swarm_memory + recall_memory()
--
-- Idempotente: corre las veces que quieras.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;   -- recall por similitud de texto

-- ----------------------------------------------------------------------------
-- 0. TAXONOMÍA DE TAREAS (un solo vocabulario para todo el enjambre)
--    CODE REFACTOR DEBUG TEST RESEARCH CHAT OPS DESIGN SYNTHESIS REVIEW
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- 1. EXTENSIONES AL dispatch_queue  (subdivisión + competencia + explicabilidad)
-- ----------------------------------------------------------------------------
ALTER TABLE dispatch_queue
  ADD COLUMN IF NOT EXISTS task_type      text,                              -- taxonomía (no existía en el dispatch original)
  ADD COLUMN IF NOT EXISTS depth          int     NOT NULL DEFAULT 0,        -- 0 = raíz; sube al subdividir
  ADD COLUMN IF NOT EXISTS role           text    NOT NULL DEFAULT 'solo',   -- solo|parent|contender|judge|synthesis
  ADD COLUMN IF NOT EXISTS competition_id bigint,                            -- FK lógico a dispatch_competitions
  ADD COLUMN IF NOT EXISTS children_total int,                              -- cuántos sub-jobs creó (si role=parent)
  ADD COLUMN IF NOT EXISTS quality        numeric(5,2),                      -- 0..100, lo pone el juez/Grok
  ADD COLUMN IF NOT EXISTS routed_reason  text,                             -- por qué el router lo dio a este agente
  ADD COLUMN IF NOT EXISTS recalled       jsonb;                            -- memoria inyectada al arrancar el job

-- statuses nuevos que usamos: 'split' (padre esperando hijos), 'synthesizing'
CREATE INDEX IF NOT EXISTS dq_parent_idx  ON dispatch_queue(parent_task_id);
CREATE INDEX IF NOT EXISTS dq_status_type ON dispatch_queue(status, task_type);
CREATE INDEX IF NOT EXISTS dq_comp_idx     ON dispatch_queue(competition_id);

-- ----------------------------------------------------------------------------
-- 2. ESPECIALIZACIÓN DINÁMICA  —  el historial que vuelve especialistas
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agent_strengths (
  agent         text    NOT NULL,                 -- claude | grok | codex | shell | browser
  task_type     text    NOT NULL,
  jobs          int     NOT NULL DEFAULT 0,        -- cuántos ha hecho de este tipo
  wins          int     NOT NULL DEFAULT 0,        -- éxitos (gate verde / juez lo eligió)
  success_rate  numeric(5,4) NOT NULL DEFAULT 0,   -- wins/jobs
  avg_quality   numeric(5,2) NOT NULL DEFAULT 50,  -- media histórica 0..100
  ewma_quality  numeric(5,2) NOT NULL DEFAULT 50,  -- media móvil exponencial (pondera lo RECIENTE)
  last_updated  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (agent, task_type)
);

-- ----------------------------------------------------------------------------
-- 3. MEMORIA COMPARTIDA DEL ENJAMBRE  —  "qué funcionó / qué falló"
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS swarm_memory (
  id           bigserial PRIMARY KEY,
  task_pattern text NOT NULL,            -- huella de la tarea (frase corta normalizada)
  task_type    text,
  agent        text,
  what_worked  text,                     -- la jugada que sí salió
  what_failed  text,                     -- el callejón sin salida (para no repetirlo)
  quality      numeric(5,2),             -- qué tan bien salió (0..100)
  job_id       bigint,                   -- de qué job salió la lección
  ts           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS swarm_mem_trgm ON swarm_memory USING gin (task_pattern gin_trgm_ops);
CREATE INDEX IF NOT EXISTS swarm_mem_type ON swarm_memory(task_type, quality DESC);

-- ----------------------------------------------------------------------------
-- 4. COMPETENCIA Y SELECCIÓN  —  2 hacen, 1 juzga
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dispatch_competitions (
  id            bigserial PRIMARY KEY,
  task_type     text,
  prompt        text NOT NULL,
  parent_job_id bigint,                  -- el job crítico que detonó la competencia
  contenders    text[]   NOT NULL,       -- p.ej. {claude, grok}
  judge_agent   text,                    -- quién arbitró
  winner_agent  text,                    -- resultado
  winner_job_id bigint,                  -- el job ganador (su result se promueve)
  judge_notes   text,
  scores        jsonb,                   -- {claude: 88, grok: 71}
  status        text NOT NULL DEFAULT 'open',  -- open | judging | decided | aborted
  created_at    timestamptz NOT NULL DEFAULT now(),
  decided_at    timestamptz
);
CREATE INDEX IF NOT EXISTS comp_status_idx ON dispatch_competitions(status);

-- ============================================================================
-- FUNCIONES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- route_pick_agent(task_type)  ->  (agent, score, reason)
--   Selección estilo UCB1: explota al mejor histórico PERO explora a los novatos
--   lo suficiente para que nadie se quede sin oportunidad (evita lock-in).
--   Cold-start: si no hay historia, usa PRIORS (sesgos conocidos del enjambre).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION route_pick_agent(p_task_type text)
RETURNS TABLE(agent text, score numeric, reason text)
LANGUAGE sql STABLE AS $$
WITH priors(agent, task_type, prior) AS (
  VALUES
    ('claude','CODE',0.82),('claude','REFACTOR',0.80),('claude','DEBUG',0.74),
    ('claude','REVIEW',0.78),('claude','SYNTHESIS',0.80),('claude','TEST',0.70),
    ('grok','RESEARCH',0.84),('grok','CHAT',0.82),('grok','DESIGN',0.66),('grok','DEBUG',0.62),
    ('codex','CODE',0.70),('codex','TEST',0.74),('codex','REFACTOR',0.66),
    ('browser','RESEARCH',0.72),
    ('shell','OPS',0.88)
),
universe AS (   -- candidatos = agentes con historia O con prior para este tipo
  SELECT agent FROM agent_strengths WHERE task_type = p_task_type
  UNION
  SELECT agent FROM priors WHERE task_type = p_task_type
),
candidates AS (
  SELECT u.agent,
         COALESCE(s.jobs, 0)                                   AS jobs,
         COALESCE(s.ewma_quality, COALESCE(p.prior,0.5)*100)   AS quality,   -- 0..100
         COALESCE(s.success_rate, COALESCE(p.prior,0.5))       AS sr
  FROM universe u
  LEFT JOIN agent_strengths s ON s.agent=u.agent AND s.task_type=p_task_type
  LEFT JOIN priors         p ON p.agent=u.agent AND p.task_type=p_task_type
),
total AS (SELECT GREATEST(SUM(jobs),1)::numeric AS n FROM candidates),
scored AS (
  SELECT c.*,
         -- explotación: calidad reciente (60%) + tasa de éxito (40%)
         (0.6*(c.quality/100.0) + 0.4*c.sr)
         -- exploración UCB: premia a quien tiene POCOS jobs (aún no probado a fondo)
         + 0.18 * sqrt( ln((SELECT n FROM total)+1) / (c.jobs+1) )
           AS score
  FROM candidates c
)
SELECT agent,
       round(score::numeric, 4),
       format('q=%s sr=%s jobs=%s', round(quality,1), round(sr,2), jobs)
FROM scored
ORDER BY score DESC, random()   -- desempate aleatorio = exploración extra
LIMIT 1;
$$;

-- ----------------------------------------------------------------------------
-- record_outcome(agent, task_type, success, quality)
--   Sella el resultado en agent_strengths. EWMA (0.7/0.3) hace que el sistema
--   se ADAPTE: si un agente mejora (o empeora) en algo, su score lo refleja
--   rápido sin que la historia vieja lo congele.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION record_outcome(
  p_agent text, p_task_type text, p_success boolean, p_quality numeric)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO agent_strengths
    (agent, task_type, jobs, wins, success_rate, avg_quality, ewma_quality, last_updated)
  VALUES
    (p_agent, p_task_type, 1, p_success::int, p_success::int, p_quality, p_quality, now())
  ON CONFLICT (agent, task_type) DO UPDATE SET
    jobs         = agent_strengths.jobs + 1,
    wins         = agent_strengths.wins + p_success::int,
    success_rate = (agent_strengths.wins + p_success::int)::numeric
                   / (agent_strengths.jobs + 1),
    avg_quality  = (agent_strengths.avg_quality * agent_strengths.jobs + p_quality)
                   / (agent_strengths.jobs + 1),
    ewma_quality = round(0.7 * agent_strengths.ewma_quality + 0.3 * p_quality, 2),
    last_updated = now();
END;
$$;

-- ----------------------------------------------------------------------------
-- recall_memory(task_type, query, k)  ->  filas de swarm_memory más parecidas
--   Lo que el agente lee ANTES de empezar: "la última vez que hice algo así..."
--   Mezcla similitud de texto (pg_trgm) con calidad histórica.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION recall_memory(p_task_type text, p_query text, p_k int DEFAULT 3)
RETURNS TABLE(what_worked text, what_failed text, agent text, quality numeric, sim real)
LANGUAGE sql STABLE AS $$
  SELECT what_worked, what_failed, agent, quality,
         similarity(task_pattern, p_query) AS sim
  FROM swarm_memory
  WHERE (p_task_type IS NULL OR task_type = p_task_type)
    AND what_worked IS NOT NULL
  ORDER BY (similarity(task_pattern, p_query) * 0.6
            + COALESCE(quality,0)/100.0 * 0.4) DESC
  LIMIT p_k;
$$;

-- ----------------------------------------------------------------------------
-- resolve_competition(competition_id, winner, scores, notes)
--   El juez ya decidió: sube al ganador, baja a los perdedores, promueve el
--   result ganador al job padre y sella la memoria.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION resolve_competition(
  p_comp_id bigint, p_winner text, p_scores jsonb, p_notes text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  c           dispatch_competitions%ROWTYPE;
  contender   text;
  q           numeric;
  is_win      boolean;
  win_job     bigint;
BEGIN
  SELECT * INTO c FROM dispatch_competitions WHERE id = p_comp_id;

  -- score de cada contendiente -> alimenta agent_strengths
  FOREACH contender IN ARRAY c.contenders LOOP
    q      := COALESCE((p_scores ->> contender)::numeric, 50);
    is_win := (contender = p_winner);
    PERFORM record_outcome(contender, c.task_type, is_win, q);
  END LOOP;

  -- localiza el job ganador para promover su result
  SELECT id INTO win_job
  FROM dispatch_queue
  WHERE competition_id = p_comp_id AND agent = p_winner AND role = 'contender'
  ORDER BY id DESC LIMIT 1;

  UPDATE dispatch_competitions
  SET winner_agent = p_winner, winner_job_id = win_job, scores = p_scores,
      judge_notes = p_notes, status = 'decided', decided_at = now()
  WHERE id = p_comp_id;

  -- promueve el result ganador al job padre y ciérralo
  IF c.parent_job_id IS NOT NULL AND win_job IS NOT NULL THEN
    UPDATE dispatch_queue p
    SET result = w.result, agent = p_winner, quality = COALESCE((p_scores->>p_winner)::numeric,NULL),
        status = 'done', completed_at = now()
    FROM dispatch_queue w
    WHERE p.id = c.parent_job_id AND w.id = win_job;
  END IF;
END;
$$;

-- ----------------------------------------------------------------------------
-- VISTA: tablero de especialización (para Mission Control / cockpit)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_swarm_specialization AS
SELECT task_type,
       (array_agg(agent ORDER BY ewma_quality DESC))[1]        AS especialista,
       round(max(ewma_quality),1)                              AS mejor_calidad,
       jsonb_object_agg(agent, jsonb_build_object(
         'jobs', jobs, 'sr', round(success_rate,2), 'q', round(ewma_quality,1))) AS detalle
FROM agent_strengths
GROUP BY task_type
ORDER BY task_type;

-- ============================================================================
-- SEMILLA opcional: arranca con sesgos conocidos para no empezar 100% a ciegas
-- ============================================================================
-- SELECT record_outcome('claude','CODE',true,82);
-- SELECT record_outcome('grok','RESEARCH',true,84);
-- SELECT record_outcome('shell','OPS',true,88);
