-- A project is a product/workstream and can be backed by more than one repo.
-- projects.github_repo stays as the compatible primary-repo pointer.

CREATE TABLE IF NOT EXISTS project_repositories (
  project_id       text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  repo_full_name   text NOT NULL,
  role             text NOT NULL DEFAULT 'app'
                   CHECK (role IN (
                     'app', 'frontend', 'backend', 'api', 'admin',
                     'mobile', 'infra', 'docs', 'shared', 'other'
                   )),
  is_primary       boolean NOT NULL DEFAULT false,
  default_branch   text,
  private          boolean,
  language         text,
  html_url         text,
  pushed_at        timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, repo_full_name)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_project_repositories_one_primary
  ON project_repositories (project_id)
  WHERE is_primary;

CREATE INDEX IF NOT EXISTS idx_project_repositories_repo
  ON project_repositories (lower(repo_full_name));

INSERT INTO project_repositories (
  project_id, repo_full_name, role, is_primary,
  default_branch, private, language, html_url
)
SELECT
  id, github_repo, 'app', true,
  github_default_branch, github_private, github_language, github_url
FROM projects
WHERE github_repo IS NOT NULL AND btrim(github_repo) <> ''
ON CONFLICT (project_id, repo_full_name) DO UPDATE SET
  is_primary = true,
  default_branch = COALESCE(EXCLUDED.default_branch, project_repositories.default_branch),
  private = COALESCE(EXCLUDED.private, project_repositories.private),
  language = COALESCE(EXCLUDED.language, project_repositories.language),
  html_url = COALESCE(EXCLUDED.html_url, project_repositories.html_url),
  updated_at = now();

INSERT INTO schema_migrations (version) VALUES ('043_project_repositories')
ON CONFLICT (version) DO NOTHING;

