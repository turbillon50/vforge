-- schema.sql — Migración ADITIVA para el protocolo de aprendizaje de Vulcano.
-- Idempotente: corre cuantas veces quieras. NO borra ni altera data existente.

-- patterns: scoring + decay + procedencia
ALTER TABLE patterns ADD COLUMN IF NOT EXISTS weight       real        DEFAULT 1.0;
ALTER TABLE patterns ADD COLUMN IF NOT EXISTS wins         int         DEFAULT 0;
ALTER TABLE patterns ADD COLUMN IF NOT EXISTS losses       int         DEFAULT 0;
ALTER TABLE patterns ADD COLUMN IF NOT EXISTS last_used_at timestamptz DEFAULT now();
ALTER TABLE patterns ADD COLUMN IF NOT EXISTS archived     boolean     DEFAULT false;
ALTER TABLE patterns ADD COLUMN IF NOT EXISTS source       text        DEFAULT 'manual';
ALTER TABLE patterns ADD COLUMN IF NOT EXISTS fingerprint  text;

-- lessons: scoring + decay + dedup
ALTER TABLE lessons  ADD COLUMN IF NOT EXISTS weight       real        DEFAULT 1.0;
ALTER TABLE lessons  ADD COLUMN IF NOT EXISTS hits         int         DEFAULT 0;
ALTER TABLE lessons  ADD COLUMN IF NOT EXISTS last_used_at timestamptz DEFAULT now();
ALTER TABLE lessons  ADD COLUMN IF NOT EXISTS archived     boolean     DEFAULT false;
ALTER TABLE lessons  ADD COLUMN IF NOT EXISTS fingerprint  text;

-- marca de "ya aprendí de esta sesión"
ALTER TABLE vulcano_sessions ADD COLUMN IF NOT EXISTS learned boolean DEFAULT false;

-- bitácora de corridas del sistema de aprendizaje
CREATE TABLE IF NOT EXISTS learning_runs (
  id         serial PRIMARY KEY,
  kind       text,            -- post_session | contrast | digest | decay | signals
  ref        text,            -- session id / cluster / fecha
  summary    text,
  stats      jsonb,
  created_at timestamptz DEFAULT now()
);

-- señales débiles capturadas de Luis (auditoría del scoring en tiempo real)
CREATE TABLE IF NOT EXISTS learning_signals (
  id          serial PRIMARY KEY,
  session_id  int,
  project_id  text,
  turn_excerpt text,
  polarity    text,           -- positive | negative | redo
  weight      real,
  target_kind text,           -- pattern | lesson
  target_id   int,
  created_at  timestamptz DEFAULT now()
);

-- backfill de fingerprints faltantes (para dedup retroactivo)
UPDATE lessons  SET fingerprint = md5(lower(coalesce(area,'')||' '||coalesce(lesson,'')))
  WHERE fingerprint IS NULL;
UPDATE patterns SET fingerprint = md5(lower(coalesce(title,'')||' '||coalesce(problem,'')))
  WHERE fingerprint IS NULL;
