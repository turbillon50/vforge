-- 017_control_plane.sql — VForge Esferas · Plano de Control multi-tenant (F1)
--
-- DB SEPARADA del Brain personal de Luis. En producción, apuntar
-- CONTROL_PLANE_DATABASE_URL a un PROYECTO NEON NUEVO (no la DB de la app ni
-- el Brain de Hetzner). Si esa env no existe, lib/control-plane/db.ts cae a
-- DATABASE_URL solo para no romper build/dev; en prod usar la separada.
--
-- CIFRADO: envelope por tenant. Cada tenant tiene un DEK (data encryption key)
-- de 32 bytes generado al azar; el DEK se ENVUELVE (AES-256-GCM) con la
-- MASTER_KEY de entorno (CONTROL_PLANE_MASTER_KEY). Las credenciales de cada
-- esfera se cifran con el DEK de SU tenant — nunca con la llave de otro, nunca
-- en claro. Ver lib/control-plane/envelope.ts.
--
-- AISLAMIENTO: tenant_id en TODAS las tablas + Row Level Security con políticas
-- ligadas a la GUC `app.current_tenant`. El código (lib/control-plane/*) además
-- filtra tenant_id en cada query (defensa en profundidad). Para que RLS "muerda"
-- a nivel Postgres, la conexión de la app debe usar un rol NO-owner (los owners
-- saltan RLS salvo FORCE). Ver nota de despliegue al final.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── tenants ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenants (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id text UNIQUE NOT NULL,
  email         text,
  display_name  text,
  -- DEK del tenant, envuelto con la MASTER_KEY (AES-256-GCM):
  dek_wrapped   bytea NOT NULL,
  dek_iv        bytea NOT NULL,
  dek_tag       bytea NOT NULL,
  plan          text  NOT NULL DEFAULT 'forja_libre',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ── spheres ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS spheres (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name         text NOT NULL DEFAULT 'Mi Esfera',
  status       text NOT NULL DEFAULT 'forging',  -- forging | active | degraded
  activated_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_spheres_tenant ON spheres(tenant_id);

-- ── sphere_credentials (el Baúl) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sphere_credentials (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sphere_id        uuid NOT NULL REFERENCES spheres(id) ON DELETE CASCADE,
  service          text NOT NULL,                 -- github | vercel | neon
  -- credencial cifrada con el DEK del tenant (envelope) — jamás en claro:
  ciphertext       bytea NOT NULL,
  iv               bytea NOT NULL,
  auth_tag         bytea NOT NULL,
  identity         text,                          -- login/usuario público (NO secreto)
  status           text NOT NULL DEFAULT 'unverified', -- unverified | verified | error
  last_verified_at timestamptz,
  last_error       text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, service)
);
CREATE INDEX IF NOT EXISTS idx_cred_tenant ON sphere_credentials(tenant_id);

-- ── jobs (cola con backpressure — solo metadata, nunca payloads pesados) ─────
CREATE TABLE IF NOT EXISTS jobs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sphere_id       uuid REFERENCES spheres(id) ON DELETE CASCADE,
  kind            text NOT NULL,
  status          text NOT NULL DEFAULT 'queued', -- queued | running | done | error
  priority        int  NOT NULL DEFAULT 100,
  idempotency_key text,
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS idx_jobs_tenant ON jobs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status, priority);

-- ── events (observabilidad — nunca secretos en message/metadata) ─────────────
CREATE TABLE IF NOT EXISTS events (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sphere_id   uuid REFERENCES spheres(id) ON DELETE CASCADE,
  kind        text NOT NULL,
  service     text,
  level       text NOT NULL DEFAULT 'info',       -- info | warn | error
  message     text,
  metadata    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_events_tenant ON events(tenant_id, created_at DESC);

-- ── Row Level Security ───────────────────────────────────────────────────────
-- Política: una fila es visible/operable solo si su tenant_id coincide con la
-- GUC de sesión `app.current_tenant`. lib/control-plane/db.ts fija esa GUC por
-- request (withTenant). El código además filtra tenant_id explícito.
-- FORCE en las tablas de DATOS por-tenant: RLS muerde incluso para el OWNER de
-- la conexión (el rol por defecto de Neon), sin depender de crear un rol aparte.
-- `tenants` solo ENABLE: el INSERT de provisioning corre antes de que exista un
-- tenant_id (bootstrap privilegiado). lib/control-plane/db.ts aplica esto mismo
-- en runtime (ensureControlSchema) y fija la GUC vía set_config(...,true) dentro
-- de una transacción (withTenant) — única forma de que la GUC viva con el
-- driver HTTP stateless de Neon.
ALTER TABLE tenants            ENABLE ROW LEVEL SECURITY;
ALTER TABLE spheres            ENABLE ROW LEVEL SECURITY;
ALTER TABLE spheres            FORCE  ROW LEVEL SECURITY;
ALTER TABLE sphere_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE sphere_credentials FORCE  ROW LEVEL SECURITY;
ALTER TABLE jobs               ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs               FORCE  ROW LEVEL SECURITY;
ALTER TABLE events             ENABLE ROW LEVEL SECURITY;
ALTER TABLE events             FORCE  ROW LEVEL SECURITY;

DO $$
BEGIN
  -- tenants: la fila propia (id == current_tenant)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='tenants' AND policyname='tenant_isolation') THEN
    CREATE POLICY tenant_isolation ON tenants
      USING (id = current_setting('app.current_tenant', true)::uuid)
      WITH CHECK (id = current_setting('app.current_tenant', true)::uuid);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='spheres' AND policyname='tenant_isolation') THEN
    CREATE POLICY tenant_isolation ON spheres
      USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sphere_credentials' AND policyname='tenant_isolation') THEN
    CREATE POLICY tenant_isolation ON sphere_credentials
      USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='jobs' AND policyname='tenant_isolation') THEN
    CREATE POLICY tenant_isolation ON jobs
      USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='events' AND policyname='tenant_isolation') THEN
    CREATE POLICY tenant_isolation ON events
      USING (tenant_id = current_setting('app.current_tenant', true)::uuid)
      WITH CHECK (tenant_id = current_setting('app.current_tenant', true)::uuid);
  END IF;
END$$;

-- NOTA DE DESPLIEGUE (prod multi-tenant real):
--   1) Crear un rol NO-owner para la app y darle GRANT sobre estas tablas:
--        CREATE ROLE vforge_app LOGIN PASSWORD '...';
--        GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO vforge_app;
--      Usar ESA cadena en CONTROL_PLANE_DATABASE_URL. Los owners saltan RLS;
--      un rol normal sí queda sujeto a las políticas de arriba.
--   2) Generar la MASTER_KEY: openssl rand -hex 32  → CONTROL_PLANE_MASTER_KEY.
