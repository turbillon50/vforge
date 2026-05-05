import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { sql } from "@/lib/db/client";
import {
  requireOperatorAuth,
  authFailureResponse,
} from "@/lib/auth/operator-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/migrate
 *
 * One-shot admin endpoint to apply any pending SQL migrations from
 * the `migrations/` directory. Idempotent: each migration is keyed
 * on its filename in the schema_migrations table; if it's already
 * applied, it's skipped.
 *
 * Bearer-token protected (operator only). Useful for one-off seeds
 * or schema changes between deploys without having to manually open
 * a Neon SQL editor.
 *
 * Splits SQL on `;` but respects DO $$…$$ blocks.
 */
export async function POST(req: Request) {
  const auth = requireOperatorAuth(req);
  if (!auth.ok) return authFailureResponse(auth);

  const migrationsDir = path.resolve(process.cwd(), "migrations");
  let entries: string[];
  try {
    entries = readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();
  } catch (err) {
    return jsonError(
      `Cannot read migrations dir: ${err instanceof Error ? err.message : err}`,
      500,
    );
  }

  const applied = (await sql`SELECT version FROM schema_migrations`) as Array<{
    version: string;
  }>;
  const appliedSet = new Set(applied.map((r) => r.version));

  const results: Array<{
    file: string;
    version: string;
    status: "skipped" | "applied" | "error";
    message?: string;
    statements?: number;
  }> = [];

  for (const file of entries) {
    const version = file.replace(/\.sql$/, "");
    if (appliedSet.has(version)) {
      results.push({ file, version, status: "skipped" });
      continue;
    }
    const filePath = path.join(migrationsDir, file);
    let body: string;
    try {
      body = readFileSync(filePath, "utf8");
    } catch (err) {
      results.push({
        file,
        version,
        status: "error",
        message: `read failed: ${err instanceof Error ? err.message : err}`,
      });
      continue;
    }

    const statements = splitSql(body);
    try {
      for (const stmt of statements) {
        await sql.query(stmt);
      }
      results.push({
        file,
        version,
        status: "applied",
        statements: statements.length,
      });
    } catch (err) {
      results.push({
        file,
        version,
        status: "error",
        message: err instanceof Error ? err.message : String(err),
      });
      // Stop on first error so we don't apply later migrations on top
      // of a broken state.
      break;
    }
  }

  await sql`
    INSERT INTO audit_events (user_id, action, resource_type, ring, payload)
    VALUES (${auth.userId}, 'admin.migrate', 'database', 2,
      ${JSON.stringify({ results })}::jsonb)
  `;

  return new Response(JSON.stringify({ results }, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

/**
 * Split SQL on `;` while respecting `DO $$ ... $$;` and quoted strings.
 * Naive but handles our migration style.
 */
function splitSql(input: string): string[] {
  const out: string[] = [];
  let buf = "";
  let inDollar = false;
  let inSingle = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    const next2 = input.slice(i, i + 2);
    if (!inSingle && next2 === "$$") {
      inDollar = !inDollar;
      buf += "$$";
      i += 1;
      continue;
    }
    if (!inDollar && ch === "'") {
      inSingle = !inSingle;
    }
    buf += ch;
    if (!inDollar && !inSingle && ch === ";") {
      const trimmed = buf.trim();
      if (trimmed && !trimmed.startsWith("--")) out.push(trimmed);
      buf = "";
    }
  }
  const tail = buf.trim();
  if (tail && !tail.startsWith("--")) out.push(tail);
  return out;
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
