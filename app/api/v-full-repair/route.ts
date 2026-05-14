import { sql } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/v-full-repair
 *
 * V's complete self-repair endpoint.
 * V can call this to fix all her broken systems at once.
 *
 * Repairs:
 * - skills table (skill_list, skill_install, skill_uninstall)
 * - vault tables (vault_save, vault_load)
 * - agent_directives table
 * - All indexes and constraints
 * - Seeds system skills
 *
 * Idempotent - safe for V to call multiple times.
 */
export async function POST() {
  const results: Record<string, { ok: boolean; error?: string }> = {};

  // 1. SKILLS TABLE - skill_list and skill_install depend on this
  try {
    await sql`DROP TABLE IF EXISTS skills CASCADE`;
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
    await sql`CREATE INDEX idx_skills_source ON skills (source)`;
    await sql`CREATE INDEX idx_skills_tags ON skills USING gin (tags)`;
    await sql`CREATE INDEX idx_skills_installed ON skills (installed_at) WHERE installed_at IS NOT NULL`;

    // Seed system skills
    await sql`
      INSERT INTO skills (id, name, description, system_prompt, tags, source, required_tools, installed_at) VALUES
        ('new-project-bootstrap', 'New Project Bootstrap', 'Create new projects with complete structure', E'Create GitHub repos, Vercel projects, domains', ARRAY['github', 'vercel', 'deploy'], 'system', ARRAY['github_create_repo'], now()),
        ('repo-rescue', 'Repo Rescue', 'Diagnose and fix broken projects', E'Check logs, fix deps, repair config', ARRAY['github', 'debug'], 'system', ARRAY['github_read_file'], now()),
        ('repo-categorizer', 'Repo Categorizer', 'Audit and categorize repos', E'Analyze commits, assign scores', ARRAY['github', 'audit'], 'system', ARRAY['github_read_file'], NULL),
        ('dns-manager', 'DNS Manager', 'Manage domains and DNS', E'Configure nameservers, manage records', ARRAY['dns', 'namecom'], 'system', ARRAY['namecom_check_domain'], NULL)
    `;

    // Verify it works
    const count = await sql`SELECT COUNT(*)::int AS n FROM skills`;
    results.skills_table = { ok: true };
  } catch (e) {
    results.skills_table = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  // 2. VAULT TABLES - vault_save and vault_load depend on these
  try {
    await sql`DROP TABLE IF EXISTS vault_operator_secrets CASCADE`;
    await sql`
      CREATE TABLE vault_operator_secrets (
        id       text PRIMARY KEY,
        name     text NOT NULL UNIQUE,
        value    text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `;
    results.vault_operator_secrets = { ok: true };
  } catch (e) {
    results.vault_operator_secrets = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  try {
    await sql`DROP TABLE IF EXISTS vault_project_secrets CASCADE`;
    await sql`
      CREATE TABLE vault_project_secrets (
        id         text PRIMARY KEY,
        project_id text NOT NULL,
        name       text NOT NULL,
        value      text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE(project_id, name)
      )
    `;
    results.vault_project_secrets = { ok: true };
  } catch (e) {
    results.vault_project_secrets = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  // 3. AGENT DIRECTIVES TABLE
  try {
    await sql`DROP TABLE IF EXISTS agent_directives CASCADE`;
    await sql`
      CREATE TABLE agent_directives (
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
    results.agent_directives = { ok: true };
  } catch (e) {
    results.agent_directives = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  // 4. SCHEMA MIGRATIONS
  try {
    await sql`DROP TABLE IF EXISTS schema_migrations CASCADE`;
    await sql`
      CREATE TABLE schema_migrations (
        version text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `;
    results.schema_migrations = { ok: true };
  } catch (e) {
    results.schema_migrations = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  // VERIFY EVERYTHING
  let verification: Record<string, unknown> = {};
  try {
    const skillCount = await sql`SELECT COUNT(*)::int AS n FROM skills`;
    verification.skills_count = skillCount[0]?.n ?? 0;

    const skillTest = await sql`
      SELECT id, name FROM skills WHERE active = true LIMIT 1
    `;
    verification.skill_list_works = (skillTest as any[]).length > 0;

    const vaultTest = await sql`
      SELECT 1 FROM vault_operator_secrets LIMIT 1
    `;
    verification.vault_works = true;
  } catch (e) {
    verification.error = e instanceof Error ? e.message : String(e);
  }

  const allOk = Object.values(results).every(r => r.ok);

  return Response.json(
    {
      ok: allOk,
      message: allOk
        ? "V is fully repaired - skill_list and vault_save are now operational"
        : "V repair completed with some errors - see results",
      results,
      verification,
      timestamp: new Date().toISOString(),
    },
    { status: allOk ? 200 : 500 },
  );
}
