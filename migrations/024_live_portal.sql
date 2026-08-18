-- ============================================================================
-- 024_live_portal.sql — PORTAL EN VIVO por proyecto (estudio privado VForge)
-- ============================================================================
-- Primera entrega ACOTADA del portal /app/live/[projectId]:
--   · Membresías por proyecto con roles owner / reviewer / observer + expiración.
--   · Invitaciones SEGURAS: solo se guarda el HASH del token (nunca el token en
--     claro), con expiración y uso único (single-use).
--   · Comentarios por proyecto.
--   · URLs desktop / mobile / admin del proyecto (los 3 viewports en vivo).
--
-- 100% ADITIVA e idempotente: CREATE ... IF NOT EXISTS / ADD COLUMN IF NOT
-- EXISTS en todo. NO altera tablas existentes de forma destructiva ni toca
-- project_members (la membresía del cockpit del owner) — este portal vive en
-- su propio namespace `project_live_*` para no interferir. Reusa projects(id)
-- y project_events (actividad) tal cual existen.
--
-- NO ejecutar en producción desde el agente: este archivo solo declara el
-- esquema; la migración se aplica por el flujo normal de migraciones.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- projects: URLs de los 3 viewports en vivo (si no existen).
-- ----------------------------------------------------------------------------
ALTER TABLE projects ADD COLUMN IF NOT EXISTS desktop_url text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS mobile_url  text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS admin_url   text;

-- ----------------------------------------------------------------------------
-- project_live_members — quién entra al portal en vivo de un proyecto y con
-- qué rol. Jerarquía: owner > reviewer > observer.
--   · observer: ve los viewports y la actividad, puede comentar.
--   · reviewer: además ve el viewport ADMIN.
--   · owner:    además administra invitaciones.
-- La membresía puede EXPIRAR (expires_at). NULL = sin expiración.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS project_live_members (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  clerk_user_id  text,
  email          text NOT NULL,
  role           text NOT NULL DEFAULT 'observer'
                   CHECK (role IN ('owner','reviewer','observer')),
  status         text NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active','revoked')),
  invited_by     text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  expires_at     timestamptz
);
-- Un email = una membresía por proyecto (case-insensitive).
CREATE UNIQUE INDEX IF NOT EXISTS uq_plm_project_email
  ON project_live_members (project_id, lower(email));
CREATE INDEX IF NOT EXISTS idx_plm_project ON project_live_members (project_id);
CREATE INDEX IF NOT EXI