import { currentUser } from "@clerk/nextjs/server";
import { isOwnerEmail } from "@/lib/auth/owner";
import { sql } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/v-self-heal
 *
 * Idempotent schema repair. V can call this on her own deployment to
 * fix the `skills` table when migration 008 didn't fully apply (the
 * `skill_list` / `skill_install` tools fail with "column installed_at
 * does not exist"). Only additive, non-destructive operations.
 */
export async function POST() {
  const user = await currentUser();
  if (!isOwnerEmail(user?.emailAddresses?.[0]?.emailAddress)) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

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

  // Ensure the skills table exists at all
  await run("create skills table if missing", async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS skills (
        id            text PRIMARY KEY,
        name          text NOT NULL,
        description   text NOT NULL DEFAULT '',
        system_prompt text NOT NULL DEFAULT ''
      )
    `;
  });

  // Add every column the tool layer expects (idempotent)
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
    await run(`skills.${col}`, async () => {
      await sql.query(`ALTER TABLE skills ADD COLUMN IF NOT EXISTS ${col} ${def}`);
    });
  }

  // Indexes
  await run("idx_skills_installed", async () => {
    await sql`CREATE INDEX IF NOT EXISTS idx_skills_installed ON skills (installed_at) WHERE installed_at IS NOT NULL`;
  });

  // Verify final shape + report
  let columnList: string[] = [];
  let skillCount = 0;
  await run("verify skills schema", async () => {
    const cols = (await sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'skills' ORDER BY ordinal_position
    `) as Array<{ column_name: string }>;
    columnList = cols.map((c) => c.column_name);
    const count = (await sql`SELECT COUNT(*)::int AS n FROM skills`) as Array<{ n: number }>;
    skillCount = count[0]?.n ?? 0;
  });

  // Smoke-test the exact query skill_list runs
  await run("smoke test skill_list query", async () => {
    await sql`
      SELECT id, name, description, tags, source, installed_at, ring_max
      FROM skills WHERE active = true ORDER BY installed_at DESC NULLS LAST LIMIT 1
    `;
  });

  const ok = steps.every((s) => s.status === "ok");
  return Response.json(
    {
      ok,
      message: ok
        ? "V self-heal complete — skills table repaired"
        : "V self-heal ran with errors — see steps",
      skillsColumns: columnList,
      skillCount,
      steps,
    },
    { status: ok ? 200 : 500 },
  );
}
