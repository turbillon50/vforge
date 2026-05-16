import { sql } from "@/lib/db/client";
import { ensureDatabaseHealed } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/v-health
 *
 * Health check endpoint. Verifies V's database and tools are working.
 * Automatically triggers database healing if needed.
 */
export async function GET() {
  // Ensure database is healed before checking
  await ensureDatabaseHealed();

  const checks: Record<string, boolean | string | number> = {};

  // Check skills table
  try {
    const result = (await sql`SELECT COUNT(*)::int AS n FROM skills`) as Array<{ n: number }>;
    checks.skills_table = result[0]?.n >= 0;
  } catch (e) {
    checks.skills_table = e instanceof Error ? e.message : "unknown error";
  }

  // Check skill_list query
  try {
    await sql`
      SELECT id, name, description, tags, source, installed_at, ring_max
      FROM skills WHERE active = true ORDER BY installed_at DESC NULLS LAST LIMIT 1
    `;
    checks.skill_list_query = true;
  } catch (e) {
    checks.skill_list_query = e instanceof Error ? e.message : "unknown error";
  }

  // Check system skills installed
  try {
    const result = (await sql`
      SELECT COUNT(*)::int AS n FROM skills WHERE source = 'system' AND installed_at IS NOT NULL
    `) as Array<{ n: number }>;
    checks.system_skills_installed = result[0]?.n ?? 0;
  } catch (e) {
    checks.system_skills_installed = e instanceof Error ? e.message : "unknown error";
  }

  // Check vault tables
  try {
    await sql`SELECT 1 FROM vault_operator_secrets LIMIT 1`;
    checks.vault_tables = true;
  } catch {
    checks.vault_tables = false;
  }

  const allOk = Object.values(checks).every((v) => v !== false && typeof v !== "string");

  return Response.json(
    {
      ok: allOk,
      message: allOk ? "V is healthy and ready" : "V has issues - see checks",
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: allOk ? 200 : 503 },
  );
}
