/**
 * Auto-healing database schema initialization.
 * Runs silently on first request to ensure all required tables and columns exist.
 * Does not throw errors - fails gracefully if schema is already correct.
 */

import { sql } from "./client";

let _healed = false;

async function ensureSkillsTable(): Promise<void> {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS skills (
        id            text PRIMARY KEY,
        name          text NOT NULL,
        description   text NOT NULL DEFAULT '',
        system_prompt text NOT NULL DEFAULT ''
      )
    `;
  } catch {
    // Table already exists, ignore
  }
}

async function ensureSkillsColumns(): Promise<void> {
  const columns: Array<[string, string]> = [
    ["required_tools", "text[] DEFAULT '{}'"],
    ["ring_max", "int DEFAULT 1"],
    ["source", "text NOT NULL DEFAULT 'user'"],
    ["tags", "text[] DEFAULT '{}'"],
    ["active", "boolean DEFAULT true"],
    ["installed_at", "timestamptz"],
    ["created_by", "text"],
    ["created_at", "timestamptz NOT NULL DEFAULT now()"],
    ["updated_at", "timestamptz NOT NULL DEFAULT now()"],
  ];

  for (const [col, def] of columns) {
    try {
      await sql.query(`ALTER TABLE skills ADD COLUMN IF NOT EXISTS ${col} ${def}`);
    } catch {
      // Column already exists, ignore
    }
  }
}

async function ensureSkillsIndexes(): Promise<void> {
  try {
    await sql`CREATE INDEX IF NOT EXISTS idx_skills_source ON skills (source)`;
  } catch {
    // Index already exists, ignore
  }
  try {
    await sql`CREATE INDEX IF NOT EXISTS idx_skills_tags ON skills USING gin (tags)`;
  } catch {
    // Index already exists, ignore
  }
  try {
    await sql`CREATE INDEX IF NOT EXISTS idx_skills_installed ON skills (installed_at) WHERE installed_at IS NOT NULL`;
  } catch {
    // Index already exists, ignore
  }
}

async function ensureSeedSkills(): Promise<void> {
  try {
    await sql`
      INSERT INTO skills (id, name, description, system_prompt, tags, source, required_tools, installed_at) VALUES
        (
          'new-project-bootstrap',
          'New Project Bootstrap',
          'Create new projects with complete structure and auto-deployment',
          E'When asked to create a new project:\n1. Ask for name, description, type\n2. Create GitHub repo with template\n3. Configure Vercel project\n4. Register domain if needed\n5. Verify deployment works',
          ARRAY['github', 'vercel', 'deploy', 'scaffold'],
          'system',
          ARRAY['github_create_repo', 'github_write_file'],
          now()
        ),
        (
          'repo-rescue',
          'Repo Rescue',
          'Diagnose and repair projects with build or deploy errors',
          E'When a project has errors:\n1. Check Vercel logs\n2. Read config files\n3. Identify broken deps or config\n4. Propose fix and request confirmation\n5. Verify build passes',
          ARRAY['github', 'vercel', 'debug', 'fix'],
          'system',
          ARRAY['github_read_file', 'github_write_file'],
          now()
        ),
        (
          'repo-categorizer',
          'Repo Categorizer',
          'Audit and categorize repositories by activity and health',
          E'To categorize repos:\n1. Check commits from last 30 days\n2. Verify active deployment\n3. Review structure and quality\n4. Assign score 0-100\n5. Save audit results',
          ARRAY['github', 'audit', 'organize'],
          'system',
          ARRAY['github_read_file'],
          NULL
        ),
        (
          'dns-manager',
          'DNS Manager',
          'Manage domains and DNS via Name.com',
          E'For DNS operations:\n1. Verify domain availability\n2. Configure nameservers\n3. Add/modify DNS records\n4. Verify propagation',
          ARRAY['dns', 'domain', 'namecom'],
          'system',
          ARRAY['namecom_check_domain'],
          NULL
        )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        system_prompt = EXCLUDED.system_prompt,
        tags = EXCLUDED.tags,
        required_tools = EXCLUDED.required_tools,
        updated_at = now()
    `;
  } catch {
    // Skills already exist or insert failed, ignore
  }
}

async function ensureOtherTables(): Promise<void> {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS agent_directives (
        id        text PRIMARY KEY,
        kind      text NOT NULL,
        title     text NOT NULL,
        content   text NOT NULL,
        locked    boolean DEFAULT false,
        priority  int DEFAULT 100,
        active    boolean DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `;
  } catch {
    // Table already exists
  }

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS vault_operator_secrets (
        id       text PRIMARY KEY,
        name     text NOT NULL UNIQUE,
        value    text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `;
  } catch {
    // Table already exists
  }

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS vault_project_secrets (
        id         text PRIMARY KEY,
        project_id text NOT NULL,
        name       text NOT NULL,
        value      text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE(project_id, name)
      )
    `;
  } catch {
    // Table already exists
  }

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `;
  } catch {
    // Table already exists
  }
}

/**
 * Heal the database schema. Runs once per process.
 * Call this from api routes or middleware that execute early.
 */
export async function healDatabase(): Promise<void> {
  if (_healed) return;
  _healed = true;

  try {
    await ensureSkillsTable();
    await ensureSkillsColumns();
    await ensureSkillsIndexes();
    await ensureSeedSkills();
    await ensureOtherTables();
  } catch (e) {
    // Silently fail - don't crash the app if database healing fails
    console.error("[V auto-heal] Database healing failed:", e);
  }
}
