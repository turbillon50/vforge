import { sql } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/v-bootstrap
 *
 * Complete V bootstrap & initialization.
 * Creates all required tables, columns, indexes, and seeds system skills.
 * Idempotent - safe to call multiple times.
 */
export async function POST() {
  const steps: Array<{ step: string; status: "ok" | "error"; detail?: string }> = [];

  async function run(label: string, fn: () => Promise<unknown>) {
    try {
      await fn();
      steps.push({ step: label, status: "ok" });
    } catch (e) {
      steps.push({
        step: label,
        status: "error",
        detail: e instanceof Error ? e.message : String(e),
      });
    }
  }

  // SKILLS TABLE
  await run("create skills table", async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS skills (
        id            text PRIMARY KEY,
        name          text NOT NULL,
        description   text NOT NULL DEFAULT '',
        system_prompt text NOT NULL DEFAULT ''
      )
    `;
  });

  const skillColumns: Array<[string, string]> = [
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
  for (const [col, def] of skillColumns) {
    await run(`skills.${col}`, async () => {
      await sql.query(`ALTER TABLE skills ADD COLUMN IF NOT EXISTS ${col} ${def}`);
    });
  }

  // SKILLS INDEXES
  await run("idx_skills_source", async () => {
    await sql`CREATE INDEX IF NOT EXISTS idx_skills_source ON skills (source)`;
  });
  await run("idx_skills_tags", async () => {
    await sql`CREATE INDEX IF NOT EXISTS idx_skills_tags ON skills USING gin (tags)`;
  });
  await run("idx_skills_installed", async () => {
    await sql`CREATE INDEX IF NOT EXISTS idx_skills_installed ON skills (installed_at) WHERE installed_at IS NOT NULL`;
  });

  // SEED SYSTEM SKILLS
  await run("seed system skills", async () => {
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
  });

  // AGENT DIRECTIVES TABLE
  await run("create agent_directives table", async () => {
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
  });

  // VAULT TABLES
  await run("create vault_operator_secrets table", async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS vault_operator_secrets (
        id       text PRIMARY KEY,
        name     text NOT NULL UNIQUE,
        value    text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `;
  });

  await run("create vault_project_secrets table", async () => {
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
  });

  // SCHEMA MIGRATIONS TRACKING
  await run("create schema_migrations table", async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `;
  });

  // VERIFY COMPLETE SCHEMA
  let skillCount = 0;
  let skillColumns_verified: string[] = [];
  await run("verify complete schema", async () => {
    const count = (await sql`SELECT COUNT(*)::int AS n FROM skills`) as Array<{ n: number }>;
    skillCount = count[0]?.n ?? 0;

    const cols = (await sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'skills' ORDER BY ordinal_position
    `) as Array<{ column_name: string }>;
    skillColumns_verified = cols.map((c) => c.column_name);
  });

  // SMOKE TEST V's CRITICAL QUERIES
  await run("smoke test skill_list query", async () => {
    await sql`
      SELECT id, name, description, tags, source, installed_at, ring_max
      FROM skills WHERE active = true ORDER BY installed_at DESC NULLS LAST LIMIT 1
    `;
  });

  await run("smoke test skill_install query", async () => {
    await sql`
      SELECT id FROM skills WHERE active = true LIMIT 1
    `;
  });

  const ok = steps.every((s) => s.status === "ok");
  return Response.json(
    {
      ok,
      message: ok
        ? "V bootstrap complete — all systems ready"
        : "V bootstrap ran with errors — check steps",
      schema: {
        skillsColumns: skillColumns_verified,
        skillCount,
        tables: [
          "skills",
          "agent_directives",
          "vault_operator_secrets",
          "vault_project_secrets",
          "schema_migrations",
        ],
      },
      steps,
    },
    { status: ok ? 200 : 500 },
  );
}
