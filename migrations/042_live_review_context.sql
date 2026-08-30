-- Sala de revision: anclas visuales, contenido canónico y archivos privados.

ALTER TABLE project_comments
  ADD COLUMN IF NOT EXISTS anchor jsonb;

CREATE TABLE IF NOT EXISTS project_context_documents (
  project_id  text PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  content     text NOT NULL DEFAULT '' CHECK (char_length(content) <= 100000),
  updated_by  text NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_context_assets (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id            text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  filename              text NOT NULL CHECK (char_length(filename) BETWEEN 1 AND 180),
  blob_pathname         text NOT NULL UNIQUE,
  content_type          text NOT NULL,
  size_bytes            bigint NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 52428800),
  extracted_text        text NOT NULL DEFAULT '' CHECK (char_length(extracted_text) <= 2097152),
  extracted_text_bytes  integer NOT NULL DEFAULT 0 CHECK (extracted_text_bytes >= 0),
  uploaded_by_user_id   text NOT NULL,
  uploaded_by_email     text NOT NULL,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_context_assets_project
  ON project_context_assets (project_id, created_at DESC);

SELECT 'migracion 042 (live review context) OK' AS resultado;
