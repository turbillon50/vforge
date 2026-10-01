export const HILO_DDL = [
  `CREATE EXTENSION IF NOT EXISTS pgcrypto`,
  `CREATE TABLE IF NOT EXISTS hilo_chats (
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
  )`,
  `CREATE INDEX IF NOT EXISTS idx_hilo_chats_project
    ON hilo_chats (project_id, creado_en DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_hilo_chats_live_match
    ON hilo_chats (linea, chat_id)
    WHERE linea IS NOT NULL AND chat_id IS NOT NULL`,
  `CREATE INDEX IF NOT EXISTS idx_hilo_chats_monitorear
    ON hilo_chats (monitorear, project_id)
    WHERE monitorear = true`,
  `CREATE INDEX IF NOT EXISTS idx_hilo_chats_nombre
    ON hilo_chats (lower(chat_nombre))`,
  `CREATE TABLE IF NOT EXISTS hilo_mensajes (
    uid          text PRIMARY KEY,
    linea        text CHECK (linea IN ('personal', 'negocio')),
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
    origen       text NOT NULL DEFAULT 'vivo'
                 CHECK (origen IN ('vivo','zip')),
    hilo_chat_id text REFERENCES hilo_chats(id) ON DELETE SET NULL,
    raw          jsonb NOT NULL DEFAULT '{}'::jsonb,
    ingested_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (linea, id_wa)
  )`,
  `ALTER TABLE hilo_mensajes
    ALTER COLUMN linea DROP NOT NULL`,
  `ALTER TABLE hilo_mensajes
    ADD COLUMN IF NOT EXISTS origen text NOT NULL DEFAULT 'vivo'`,
  `DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'hilo_mensajes_origen_check'
    ) THEN
      ALTER TABLE hilo_mensajes
        ADD CONSTRAINT hilo_mensajes_origen_check
        CHECK (origen IN ('vivo','zip'));
    END IF;
  END $$`,
  `ALTER TABLE hilo_mensajes
    ADD COLUMN IF NOT EXISTS hilo_chat_id text REFERENCES hilo_chats(id) ON DELETE SET NULL`,
  `CREATE INDEX IF NOT EXISTS idx_hilo_mensajes_linea_ts
    ON hilo_mensajes (linea, ts DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_hilo_mensajes_chat_ts
    ON hilo_mensajes (linea, chat_id, ts DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_hilo_mensajes_tipo
    ON hilo_mensajes (tipo)`,
  `CREATE INDEX IF NOT EXISTS idx_hilo_mensajes_hilo_chat_ts
    ON hilo_mensajes (hilo_chat_id, ts DESC)
    WHERE hilo_chat_id IS NOT NULL`,
  `CREATE INDEX IF NOT EXISTS idx_hilo_mensajes_origen
    ON hilo_mensajes (origen, ts DESC)`,
  `CREATE TABLE IF NOT EXISTS hilo_analisis_cursor (
    linea             text NOT NULL CHECK (linea IN ('personal', 'negocio', 'zip')),
    chat_id           text NOT NULL,
    analizado_hasta   timestamptz,
    chat_clase        text NOT NULL DEFAULT 'personal'
                      CHECK (chat_clase IN ('personal','negocio')),
    project_id        text REFERENCES projects(id) ON DELETE SET NULL,
    ultimo_resumen    text,
    updated_at        timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (linea, chat_id)
  )`,
  `ALTER TABLE hilo_analisis_cursor
    ADD COLUMN IF NOT EXISTS chat_clase text NOT NULL DEFAULT 'personal'
      CHECK (chat_clase IN ('personal','negocio'))`,
  `ALTER TABLE hilo_analisis_cursor
    ADD COLUMN IF NOT EXISTS project_id text REFERENCES projects(id) ON DELETE SET NULL`,
  `ALTER TABLE hilo_analisis_cursor
    DROP CONSTRAINT IF EXISTS hilo_analisis_cursor_linea_check`,
  `ALTER TABLE hilo_analisis_cursor
    ADD CONSTRAINT hilo_analisis_cursor_linea_check
    CHECK (linea IN ('personal','negocio','zip'))`,
  `CREATE TABLE IF NOT EXISTS hilo_hallazgos (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    linea           text NOT NULL CHECK (linea IN ('personal', 'negocio', 'zip')),
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
  )`,
  `ALTER TABLE hilo_hallazgos
    DROP CONSTRAINT IF EXISTS hilo_hallazgos_linea_check`,
  `ALTER TABLE hilo_hallazgos
    ADD CONSTRAINT hilo_hallazgos_linea_check
    CHECK (linea IN ('personal','negocio','zip'))`,
  `CREATE INDEX IF NOT EXISTS idx_hilo_hallazgos_tipo
    ON hilo_hallazgos (tipo, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_hilo_hallazgos_project
    ON hilo_hallazgos (project_id, created_at DESC)
    WHERE project_id IS NOT NULL`,
  `CREATE INDEX IF NOT EXISTS idx_hilo_hallazgos_importante
    ON hilo_hallazgos (importante, created_at DESC)
    WHERE importante = true`,
  `CREATE TABLE IF NOT EXISTS schema_migrations (
    version text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`,
  `INSERT INTO schema_migrations (version) VALUES ('050_hilo')
    ON CONFLICT (version) DO NOTHING`,
  `INSERT INTO schema_migrations (version) VALUES ('051_hilo_chats_zip')
    ON CONFLICT (version) DO NOTHING`,
];

export async function ensureHiloSchema(db) {
  for (const ddl of HILO_DDL) {
    await db.query(ddl);
  }
}
