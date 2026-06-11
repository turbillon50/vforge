-- ============================================================
-- 016 — PLATAFORMA MULTI-TENANT: roles, membresias, marketplace, tracking
-- Owners (Luis+Jaime) scope total. Clientes scope a SU proyecto.
-- ============================================================

-- Extender roles: agregar 'owner' al check de users
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('owner','operator','admin','client','demo'));

-- Columna clerk_user_id para ligar con Clerk
ALTER TABLE users ADD COLUMN IF NOT EXISTS clerk_user_id text UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url text;

-- ----------------------------------------------------------
-- PROJECT_MEMBERS — quien tiene acceso a que proyecto y con que rol
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS project_members (
  id            text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  project_id    text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id       text REFERENCES users(id) ON DELETE CASCADE,
  clerk_user_id text,
  email         text NOT NULL,
  role          text NOT NULL DEFAULT 'viewer'
                CHECK (role IN ('owner','editor','viewer')),
  invited_by    text,
  invited_at    timestamptz NOT NULL DEFAULT now(),
  accepted_at   timestamptz,
  status        text NOT NULL DEFAULT 'invited'
                CHECK (status IN ('invited','active','revoked')),
  UNIQUE (project_id, email)
);
CREATE INDEX IF NOT EXISTS idx_pm_project ON project_members (project_id);
CREATE INDEX IF NOT EXISTS idx_pm_clerk ON project_members (clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_pm_email ON project_members (email);

-- ----------------------------------------------------------
-- PROJECT_TIMELINE — etapas/hitos del proyecto (tracking en vivo)
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS project_timeline (
  id          text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  project_id  text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  stage       text NOT NULL,
  status      text NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending','in_progress','done','blocked')),
  title       text NOT NULL,
  detail      text,
  position    int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_timeline_project ON project_timeline (project_id, position);

-- ----------------------------------------------------------
-- PROJECT_INTEGRATIONS — que integraciones tiene conectadas el proyecto
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS project_integrations (
  id          text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  project_id  text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  kind        text NOT NULL,
  label       text NOT NULL,
  status      text NOT NULL DEFAULT 'connected'
              CHECK (status IN ('connected','pending','error')),
  meta        jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, kind)
);
CREATE INDEX IF NOT EXISTS idx_integ_project ON project_integrations (project_id);

-- ----------------------------------------------------------
-- MARKETPLACE_PRODUCTS — catalogo editable por owners, visible a todos
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS marketplace_products (
  id            text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  slug          text UNIQUE NOT NULL,
  title         text NOT NULL,
  tagline       text,
  description   text,
  category      text,
  price_label   text,
  cover_image   text,
  gallery       jsonb DEFAULT '[]'::jsonb,
  video_url     text,
  features      jsonb DEFAULT '[]'::jsonb,
  cta_label     text DEFAULT 'Ver mas',
  cta_url       text,
  status        text NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft','published','archived')),
  featured      boolean DEFAULT false,
  position      int NOT NULL DEFAULT 0,
  created_by    text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mp_status ON marketplace_products (status, position);
CREATE INDEX IF NOT EXISTS idx_mp_slug ON marketplace_products (slug);

SELECT 'migracion 016 OK' AS resultado;
