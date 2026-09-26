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
 *
 * Strips leading comment-only lines from each chunk before evaluating
 * whether it's "empty" — earlier the first statement was being dropped
 * whenever the file started with a block comment, since the trimmed
 * buffer began with "--".
 */
function splitSql(input: string): string[] {
  const out: string[] = [];
  let cur = '';
  let i = 0;
  const n = input.length;
  while (i < n) {
    const c = input[i];
    if (c === '-' && input[i + 1] === '-') {
      while (i < n && input[i] !== '\n') { cur += input[i]; i++; }
      continue;
    }
    if (c === '/' && input[i + 1] === '*') {
      cur += '/*'; i += 2;
      while (i < n && !(input[i] === '*' && input[i + 1] === '/')) { cur += input[i]; i++; }
      if (i < n) { cur += '*/'; i += 2; }
      continue;
    }
    if (c === "'") {
      cur += c; i++;
      while (i < n) {
        if (input[i] === "'" && input[i + 1] === "'") { cur += "''"; i += 2; continue; }
        cur += input[i];
        if (input[i] === "'") { i++; break; }
        i++;
      }
      continue;
    }
    if (c === '$') {
      const m = input.slice(i).match(/^\$[A-Za-z0-9_]*\$/);
      if (m) {
        const tag = m[0];
        cur += tag; i += tag.length;
        const idx = input.indexOf(tag, i);
        if (idx === -1) { cur += input.slice(i); i = n; }
        else { cur += input.slice(i, idx + tag.length); i = idx + tag.length; }
        continue;
      }
    }
    if (c === ';') {
      const t = cur.trim();
      const code = t.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
      if (code) out.push(t);
      cur = '';
      i++;
      continue;
    }
    cur += c; i++;
  }
  const tail = cur.trim();
  const tailCode = tail.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
  if (tailCode) out.push(tail);
  return out;
}

/** Remove lines that are pure SQL comments. Returns the remaining content. */
function stripCommentLines(s: string): string {
  return s
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      return trimmed.length > 0 && !trimmed.startsWith("--");
    })
    .join("\n")
    .trim();
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
