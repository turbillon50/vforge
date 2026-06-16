-- ============================================================================
-- 023_dream.sql — SUEÑO COGNITIVO (aprendizaje no supervisado de V)
-- ============================================================================
-- Mecanismo 3 del documento de auto-entrenamiento: a las ~3am el daemon "revive"
-- las conversaciones del día, las analiza sin presión de tiempo, se AUTO-EVALÚA
-- (sin que Luis diga nada) y consolida lo aprendido en la memoria a largo plazo.
--
-- La señal de aprendizaje NO es V juzgando su propia prosa: es el COMPORTAMIENTO
-- real de Luis (¿siguió al siguiente paso? ¿repitió la pregunta? ¿cuántos turnos
-- tardó la solución?). Eso ancla el refuerzo no supervisado en un resultado real
-- y evita el bucle de auto-confirmación.
--
-- Reutiliza la CAPA 2 (feedback/heuristics) ya existente: la auto-evaluación
-- genera filas de feedback marcadas auto=true con confianza<1, para que el mismo
-- bucle de refuerzo (_vulcano_learn) las procese — pero amortiguadas, de modo que
-- una sola corrección real de Luis siempre domina sobre el juicio propio de V.
-- Idempotente.
-- ============================================================================

-- --- CAPA 2: feedback ahora distingue señal humana vs auto-evaluación ---------
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS auto       boolean NOT NULL DEFAULT false;
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS confidence real;   -- 0..1, null = señal de Luis (confianza plena)
CREATE INDEX IF NOT EXISTS idx_feedback_auto ON feedback (auto, created_at);

-- --- Auto-evaluación por sesión (el veredicto que V se da a sí misma) ---------
CREATE TABLE IF NOT EXISTS self_evaluations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      text NOT NULL,
  day             date NOT NULL DEFAULT current_date,
  -- los tres indicadores que pidió Luis (derivados del comportamiento, no del texto)
  resolved        boolean,        -- ¿resolvió el problema real? (Luis avanzó, no repitió)
  efficient       boolean,        -- ¿eficiente? (<3 turnos de Luis hasta la solución)
  correct_pattern boolean,        -- ¿usó un patrón similar a los exitosos?
  score           int  NOT NULL CHECK (score BETWEEN 1 AND 10),
  turns           int,            -- turnos de Luis en la sesión
  indicators      jsonb NOT NULL DEFAULT '{}'::jsonb,   -- señales crudas detectadas
  rationale       text,           -- por qué se puso esa nota
  auto_feedback_id uuid REFERENCES feedback(id) ON DELETE SET NULL,  -- la señal que generó
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, day)        -- una auto-evaluación por sesión por noche
);
CREATE INDEX IF NOT EXISTS idx_selfeval_day ON self_evaluations (day DESC);

-- --- Registro de cada noche de sueño (para narrar "qué aprendí anoche") -------
CREATE TABLE IF NOT EXISTS dream_cycles (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day                 date NOT NULL,            -- el día que se consolidó (normalmente "ayer")
  started_at          timestamptz NOT NULL DEFAULT now(),
  finished_at         timestamptz,
  window_start        timestamptz,              -- desde cuándo se revisó (fin del último sueño)
  window_end          timestamptz,
  sessions_reviewed   int NOT NULL DEFAULT 0,
  episodes_created    int NOT NULL DEFAULT 0,
  self_evals          int NOT NULL DEFAULT 0,
  patterns_found      int NOT NULL DEFAULT 0,
  heuristics_adjusted int NOT NULL DEFAULT 0,
  avg_score           real,
  insights            jsonb NOT NULL DEFAULT '[]'::jsonb,  -- patrones latentes destilados
  narrative           text,                      -- el "reporte de despertar" en voz de V
  status              text NOT NULL DEFAULT 'running'
                      CHECK (status IN ('running','done','empty','failed')),
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (day)        -- una sola consolidación por día (dedupe del trigger del daemon)
);
CREATE INDEX IF NOT EXISTS idx_dream_day ON dream_cycles (day DESC);

-- Insumo del arranque: V puede contar qué consolidó anoche.
CREATE OR REPLACE VIEW v_last_dream AS
  SELECT day, sessions_reviewed, episodes_created, patterns_found,
         heuristics_adjusted, avg_score, narrative, finished_at
    FROM dream_cycles
   WHERE status = 'done'
   ORDER BY day DESC
   LIMIT 1;

INSERT INTO schema_migrations (version) VALUES ('023_dream')
  ON CONFLICT (version) DO NOTHING;
