-- ============================================================================
-- 049_hilo_chats_zip.sql - Hilo: chats ligados por proyecto e import ZIP
-- ============================================================================
-- Luis exporta conversaciones desde WhatsApp como ZIP y las liga a un proyecto.
-- La tabla hilo_chats es el puente entre historial importado y chat vivo.
-- El monitoreo en vivo queda apagado por default: monitorear=false y el proceso
-- solo arranca sesiones si HILO_ACTIVO=1.
-- Idempotente.
-- ============================================================================

CREATE TABLE IF NOT EXISTS hilo_chats (
  id           text PRIMARY KEY,
  linea        text CHECK (linea IN ('personal', 'negocio')),
  chat_id      text,
  chat_nombre  text NOT NULL,
  etiqueta     text,
  project_id   text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  monitorear   boolean NOT NULL DEFAULT false,
  origen       text NOT NULL DEFAULT 'zip'
               CHECK (origen IN ('zip','vivo')),
  creado_en    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hilo_chats_project
  ON hilo_chats (project_id, creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_hilo_chats_live_match
  ON hilo_chats (linea, chat_id)
  WHERE linea IS NOT NULL AND chat_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_hilo_chats_monitorear
  ON hilo_chats (monitorear, project_id)
  WHERE monitorear = true;
CREATE INDEX IF NOT EXISTS idx_hilo_chats_nombre
  ON hilo_chats (lower(chat_nombre));

ALTER TABLE hilo_mensajes
  ALTER COLUMN linea DROP NOT NULL;

ALTER TABLE hilo_mensajes
  ADD COLUMN IF NOT EXISTS origen text NOT NULL DEFAULT 'vivo';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hilo_mensajes_origen_check'
  ) THEN
    ALTER TABLE hilo_mensajes
      ADD CONSTRAINT hilo_mensajes_origen_check
      CHECK (origen IN ('vivo','zip'));
  END IF;
END $$;

ALTER TABLE hilo_mensajes
  ADD COLUMN IF NOT EXISTS hilo_chat_id text REFERENCES hilo_chats(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_hilo_mensajes_hilo_chat_ts
  ON hilo_mensajes (hilo_chat_id, ts DESC)
  WHERE hilo_chat_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_hilo_mensajes_origen
  ON hilo_mensajes (origen, ts DESC);

ALTER TABLE hilo_analisis_cursor
  DROP CONSTRAINT IF EXISTS hilo_analisis_cursor_linea_check;
ALTER TABLE hilo_analisis_cursor
  ADD CONSTRAINT hilo_analisis_cursor_linea_check
  CHECK (linea IN ('personal','negocio','zip'));

ALTER TABLE hilo_hallazgos
  DROP CONSTRAINT IF EXISTS hilo_hallazgos_linea_check;
ALTER TABLE hilo_hallazgos
  ADD CONSTRAINT hilo_hallazgos_linea_check
  CHECK (linea IN ('personal','negocio','zip'));

INSERT INTO schema_migrations (version) VALUES ('049_hilo_chats_zip')
  ON CONFLICT (version) DO NOTHING;
