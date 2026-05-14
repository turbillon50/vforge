import { sql } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * EMERGENCY FIX: Skills table repair
 *
 * Drops and recreates the skills table completely.
 * This is a nuclear option - use only when the table is completely broken.
 */
export async function POST() {
  try {
    // Step 1: Drop the broken table
    await sql`DROP TABLE IF EXISTS skills CASCADE`;

    // Step 2: Recreate it completely correct
    await sql`
      CREATE TABLE skills (
        id            text PRIMARY KEY,
        name          text NOT NULL,
        description   text NOT NULL DEFAULT '',
        system_prompt text NOT NULL DEFAULT '',
        required_tools  text[] DEFAULT '{}',
        ring_max        int DEFAULT 1,
        source          text NOT NULL DEFAULT 'user',
        tags            text[] DEFAULT '{}',
        active          boolean DEFAULT true,
        installed_at    timestamptz,
        created_by      text,
        created_at      timestamptz NOT NULL DEFAULT now(),
        updated_at      timestamptz NOT NULL DEFAULT now()
      )
    `;

    // Step 3: Create indexes
    await sql`CREATE INDEX idx_skills_source ON skills (source)`;
    await sql`CREATE INDEX idx_skills_tags ON skills USING gin (tags)`;
    await sql`CREATE INDEX idx_skills_installed ON skills (installed_at) WHERE installed_at IS NOT NULL`;

    // Step 4: Seed system skills
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
    `;

    // Step 5: Verify it works
    const count = await sql`SELECT COUNT(*)::int AS n FROM skills`;
    const cols = await sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'skills' ORDER BY ordinal_position
    `;

    return Response.json(
      {
        ok: true,
        message: "Skills table completely rebuilt and restored",
        skillCount: count[0]?.n ?? 0,
        columns: cols.map((c: any) => c.column_name),
      },
      { status: 200 },
    );
  } catch (e) {
    return Response.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      },
      { status: 500 },
    );
  }
}
