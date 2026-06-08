-- ============================================================================
-- vForge M-skills — Skills table (V can create, search, install skills)
-- ============================================================================
-- Skills are modular capabilities that V can acquire dynamically. Each skill
-- contains a system_prompt fragment that gets injected into V's context when
-- the skill is installed/active.
--
-- Skills can come from three sources:
--   - 'system'  : shipped with vForge (bootstrap, rescue, categorizer, etc.)
--   - 'user'    : created by Luis via the UI or by asking V
--   - 'learned' : V created it herself via skill_create tool
--
-- V exposes tools (lib/forge/tools.ts):
--   skill_create(id, name, description, system_prompt, tags)
--   skill_list()
--   skill_search(query)
--   skill_install(id)
--   skill_uninstall(id)
--
-- When a skill is installed (installed_at IS NOT NULL), buildSystemPrompt()
-- loads its system_prompt and injects it into V's context.
-- ============================================================================

CREATE TABLE IF NOT EXISTS skills (
  id              text PRIMARY KEY,               -- kebab-case slug, e.g. 'repo-rescue'
  name            text NOT NULL,                  -- human-readable, e.g. 'Repo Rescue'
  description     text NOT NULL,                  -- what this skill enables V to do
  system_prompt   text NOT NULL,                  -- instructions injected into context
  required_tools  text[] DEFAULT '{}',            -- tools this skill needs, e.g. ['github_read_file']
  ring_max        int DEFAULT 1 CHECK (ring_max BETWEEN 0 AND 3),
  source          text NOT NULL DEFAULT 'user'
                  CHECK (source IN ('system', 'user', 'learned')),
  tags            text[] DEFAULT '{}',            -- for search, e.g. ['github', 'debug', 'rescue']
  active          boolean DEFAULT true,           -- false = disabled globally
  installed_at    timestamptz,                    -- NULL = available but not installed
  created_by      text REFERENCES users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_skills_source ON skills (source);
CREATE INDEX IF NOT EXISTS idx_skills_tags ON skills USING gin (tags);
CREATE INDEX IF NOT EXISTS idx_skills_installed ON skills (installed_at) WHERE installed_at IS NOT NULL;

-- Seed with system skills from /docs/skills/
-- vulcano fix: ensure source check matches seed values
ALTER TABLE skills DROP CONSTRAINT IF EXISTS skills_source_check;
UPDATE skills SET source='system' WHERE source NOT IN ('system','user','learned');
ALTER TABLE skills ADD CONSTRAINT skills_source_check CHECK (source IN ('system','user','learned'));

INSERT INTO skills (id, name, description, system_prompt, tags, source, required_tools, installed_at) VALUES
  (
    'new-project-bootstrap',
    'New Project Bootstrap',
    'Skill para crear proyectos nuevos con estructura completa y deploy automatico',
    E'Cuando el usuario pida crear un proyecto nuevo:\n1. Pedir nombre, descripcion, tipo (landing, app, api)\n2. Crear repo en GitHub con template apropiado\n3. Configurar Vercel project con variables de entorno\n4. Si aplica, registrar dominio via Name.com\n5. Guardar todo en la tabla projects\n6. Hacer deploy inicial y verificar que funcione',
    ARRAY['github', 'vercel', 'deploy', 'scaffold'],
    'system',
    ARRAY['github_create_repo', 'github_write_file', 'vercel_project_create', 'vercel_env_set', 'namecom_check_domain'],
    now()  -- installed by default
  ),
  (
    'repo-rescue',
    'Repo Rescue',
    'Skill para diagnosticar y reparar proyectos con errores de build o deploy',
    E'Cuando un proyecto tenga errores:\n1. Revisar vercel logs y github actions\n2. Leer archivos de config (next.config, package.json, tsconfig)\n3. Identificar dependencias rotas o config malformada\n4. Proponer fix y pedir confirmacion antes de aplicar\n5. Verificar que el build pase despues del fix',
    ARRAY['github', 'vercel', 'debug', 'fix'],
    'system',
    ARRAY['github_read_file', 'github_write_file', 'vercel_logs'],
    now()  -- installed by default
  ),
  (
    'repo-categorizer',
    'Repo Categorizer',
    'Skill para auditar y categorizar repositorios segun actividad y estado',
    E'Para categorizar repos:\n1. Revisar commits de los ultimos 30 dias\n2. Verificar si tiene deploy activo en Vercel\n3. Revisar estructura y calidad (README, tests, deps)\n4. Asignar score 0-100 y categoria propuesta\n5. Guardar auditoria en repo_audits',
    ARRAY['github', 'audit', 'organize'],
    'system',
    ARRAY['github_read_file', 'github_list_commits'],
    NULL  -- not installed by default
  ),
  (
    'dns-manager',
    'DNS Manager',
    'Skill para gestionar dominios y DNS via Name.com',
    E'Para operaciones de DNS:\n1. Verificar disponibilidad de dominio\n2. Configurar nameservers para Vercel\n3. Agregar/modificar registros DNS (A, CNAME, TXT)\n4. Verificar propagacion',
    ARRAY['dns', 'domain', 'namecom'],
    'system',
    ARRAY['namecom_check_domain', 'namecom_list_records', 'namecom_set_record'],
    NULL  -- not installed by default
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  system_prompt = EXCLUDED.system_prompt,
  tags = EXCLUDED.tags,
  required_tools = EXCLUDED.required_tools,
  updated_at = now();

INSERT INTO schema_migrations (version) VALUES ('008_skills')
  ON CONFLICT (version) DO NOTHING;
