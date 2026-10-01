-- Embudo de cliente: etapa actual del proyecto + historial auditable.
-- Aditiva e idempotente: no toca demos, no borra historial.

ALTER TABLE projects ADD COLUMN IF NOT EXISTS etapa text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS cliente_nombre text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS cliente_whatsapp text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS contrato_url text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS demo_url text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'projects_etapa_check'
       AND conrelid = 'projects'::regclass
  ) THEN
    ALTER TABLE projects
    ADD CONSTRAINT projects_etapa_check
    CHECK (
      etapa IS NULL OR etapa IN (
        'prospecto',
        'chat_cargado',
        'demo_en_construccion',
        'demo_entregada',
        'contrato_enviado',
        'firmado',
        'en_construccion',
        'entregado',
        'mantenimiento',
        'perdido'
      )
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS project_etapas (
  id bigserial PRIMARY KEY,
  project_id text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  etapa text NOT NULL CHECK (
    etapa IN (
      'prospecto',
      'chat_cargado',
      'demo_en_construccion',
      'demo_entregada',
      'contrato_enviado',
      'firmado',
      'en_construccion',
      'entregado',
      'mantenimiento',
      'perdido'
    )
  ),
  nota text,
  creado_por text,
  creado_en timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_etapas_project
  ON project_etapas (project_id, creado_en DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_projects_etapa
  ON projects (etapa, updated_at DESC);

UPDATE projects
   SET etapa = CASE
     WHEN COALESCE(es_demo, false) = true THEN NULL
     WHEN cartera_estado ~* '(cerrado|mantenimiento)' THEN 'mantenimiento'
     WHEN cartera_estado ~* '(parado|abandono|abandonado|rota|devuelto)' THEN 'perdido'
     WHEN cartera_estado ~* '(activo|le_debemos|entrega|satisfecho)' THEN 'en_construccion'
     ELSE 'prospecto'
   END
 WHERE etapa IS NULL
   AND COALESCE(es_demo, false) = false;

INSERT INTO project_etapas (project_id, etapa, nota, creado_por)
SELECT p.id, p.etapa, 'Etapa inicial calculada desde cartera.', 'system'
  FROM projects p
 WHERE p.etapa IS NOT NULL
   AND COALESCE(p.es_demo, false) = false
   AND NOT EXISTS (
     SELECT 1 FROM project_etapas pe WHERE pe.project_id = p.id
   );

INSERT INTO schema_migrations (version) VALUES ('053_project_etapas')
ON CONFLICT (version) DO NOTHING;
