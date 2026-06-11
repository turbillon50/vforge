-- -----------------------------------------------------------
-- Migration 015 — Baul de Evidencia
--
-- Stores project-scoped evidence captured from screenshots, text, and
-- voice notes, plus the operator-maintained status board per process.
-- -----------------------------------------------------------

CREATE TABLE IF NOT EXISTS evidence_vault (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_slug      text NOT NULL,
  kind              text NOT NULL CHECK (kind IN ('screenshot', 'text', 'voice')),
  raw_url           text,
  transcript        text NOT NULL,
  interpretation    text NOT NULL,
  linked_process    text,
  created_by        text NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_evidence_vault_project_created
  ON evidence_vault (project_slug, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_evidence_vault_project_process
  ON evidence_vault (project_slug, linked_process)
  WHERE linked_process IS NOT NULL;

CREATE TABLE IF NOT EXISTS process_status (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_slug      text NOT NULL,
  process_name      text NOT NULL,
  state             text NOT NULL CHECK (state IN ('listo', 'falta', 'sugerencia')),
  note              text NOT NULL,
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_slug, process_name)
);

CREATE INDEX IF NOT EXISTS idx_process_status_project
  ON process_status (project_slug, process_name);

INSERT INTO schema_migrations (version) VALUES ('015_evidence_vault')
  ON CONFLICT (version) DO NOTHING;
