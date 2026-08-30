CREATE TABLE IF NOT EXISTS project_v_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  mode text NOT NULL CHECK (mode IN ('talk', 'plan')),
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  created_by_user_id text NOT NULL,
  created_by_email text NOT NULL,
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 12000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_v_messages_thread
  ON project_v_messages (project_id, mode, created_at DESC);
