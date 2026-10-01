-- ============================================================================
-- 050_hilo.sql - Hilo: WhatsApp Web solo lectura para el Owner
-- ============================================================================
-- Dos sesiones WhatsApp Web persistentes (personal y negocio) guardan mensajes
-- entrantes/salientes observados sin enviar ni marcar acciones desde VForge.
-- El servicio usa ON CONFLICT para que reconexiones, recargas y fallback DOM no
-- dupliquen mensajes. El analista batch escribe hallazgos baratos sobre chats.
-- Idempotente: CREATE ... IF NOT EXISTS en todo.
-- ============================================================================

CREATE TABLE IF NOT EXISTS hilo_mensajes (
  uid          text PRIMARY KEY,
  linea        text NOT NULL CHECK (linea IN ('personal', 'negocio')),
  chat_id      text NOT NULL,
  chat_nombre  text,
  es_grupo     boolean NOT NULL DEFAULT false,
  autor        text,
  de_mi        boolean NOT NULL DEFAULT false,
  tipo         text NOT NULL DEFAULT 'otro'
               CHECK (tipo IN ('texto','audio','imagen','documento','otro')),
  texto        text,
  ts           timestamptz NOT NULL,
  id_wa        text NOT NULL,
  media_ref    text,
  media_tipo   text,
  raw          jsonb NOT NULL DEFAULT '{}'::jsonb,
  ingested_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (linea, id_wa)
);

CREATE INDEX IF NOT EXISTS idx_hilo_mensajes_linea_ts
  ON hilo_mensajes (linea, ts DESC);
CREATE INDEX IF NOT EXISTS idx_hilo_mensajes_chat_ts
  ON hilo_mensajes (linea, chat_id, ts DESC);
CREATE INDEX IF NOT EXISTS idx_hilo_mensajes_tipo
  ON hilo_mensajes (tipo);

CREATE TABLE IF NOT EXISTS hilo_analisis_cursor (
  linea             text NOT NULL CHECK (linea IN ('personal', 'negocio')),
  chat_id           text NOT NULL,
  analizado_hasta   timestamptz,
  chat_clase        text NOT NULL DEFAULT 'personal'
                    CHECK (chat_clase IN ('personal','negocio')),
  project_id        text REFERENCES projects(id) ON DELETE SET NULL,
  ultimo_resumen    text,
  updated_at        timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (linea, chat_id)
);
ALTER TABLE hilo_analisis_cursor
  ADD COLUMN IF NOT EXISTS chat_clase text NOT NULL DEFAULT 'personal'
    CHECK (chat_clase IN ('personal','negocio'));
ALTER TABLE hilo_analisis_cursor
  ADD COLUMN IF NOT EXISTS project_id text REFERENCES projects(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS hilo_hallazgos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  linea           text NOT NULL CHECK (linea IN ('personal', 'negocio')),
  chat_id         text NOT NULL,
  chat_nombre     text,
  chat_clase      text NOT NULL DEFAULT 'personal'
                  CHECK (chat_clase IN ('personal','negocio')),
  tipo            text NOT NULL
                  CHECK (tipo IN ('pendiente','oportunidad','riesgo')),
  titulo          text NOT NULL,
  detalle         text,
  prioridad       text NOT NULL DEFAULT 'media'
                  CHECK (prioridad IN ('baja','media','alta','critica')),
  project_id      text REFERENCES projects(id) ON DELETE SET NULL,
  mensaje_desde   timestamptz,
  mensaje_hasta   timestamptz,
  importante      boolean NOT NULL DEFAULT false,
  estado          text NOT NULL DEFAULT 'abierto'
                  CHECK (estado IN ('abierto','resuelto','archivado')),
  hash            text NOT NULL,
  raw             jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (linea, chat_id, tipo, hash)
);

CREATE INDEX IF NOT EXISTS idx_hilo_hallazgos_tipo
  ON hilo_hallazgos (tipo, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hilo_hallazgos_project
  ON hilo_hallazgos (project_id, created_at DESC)
  WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_hilo_hallazgos_importante
  ON hilo_hallazgos (importante, created_at DESC)
  WHERE importante = true;

INSERT INTO schema_migrations (version) VALUES ('050_hilo')
  ON CONFLICT (version) DO NOTHING;
