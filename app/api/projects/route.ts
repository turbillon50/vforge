import { sql, queryAll } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ProjectRow {
  id: string;
  name: string;
  category: string;
  status: string;
  github_repo: string | null;
  github_private?: boolean;
  github_language?: string | null;
  vercel_url: string | null;
  domain?: string | null;
}

const VALID_CATEGORIES = new Set([
  "produccion",
  "activo",
  "en_revision",
  "en_pausa",
  "archivo",
  "pendiente_borrado",
]);

const OPERATOR_USER_ID = "operator_luis";

/**
 * GET /api/projects
 *
 * Returns the live catalog from the projects table.
 */
export async function GET() {
  const rows = await queryAll<ProjectRow>(
    `SELECT id, name, category, status,
            github_repo, github_private, github_language,
            vercel_url, domain
       FROM projects
       ORDER BY
         CASE category
           WHEN 'produccion' THEN 1
           WHEN 'activo' THEN 2
           WHEN 'en_revision' THEN 3
           WHEN 'en_pausa' THEN 4
           WHEN 'archivo' THEN 5
           WHEN 'pendiente_borrado' THEN 6
           ELSE 99
         END,
         name`,
  );
  return new Response(JSON.stringify({ projects: rows }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * POST /api/projects
 *
 * Creates a new project. Used by the /projects "Dar de alta" modal.
 * Validates id format and category enum, audit-logs the action.
 */
export async function POST(req: Request) {
  let body: {
    id?: string;
    name?: string;
    description?: string | null;
    github_repo?: string | null;
    vercel_url?: string | null;
    domain?: string | null;
    category?: string;
  };
  try {
    body = await req.json();
  } catch {
    return jsonError("invalid JSON body", 400);
  }

  const id = (body.id ?? "").trim();
  const name = (body.name ?? "").trim();
  const category = (body.category ?? "en_revision").trim();

  if (!id || !/^[a-z0-9][a-z0-9_-]*$/.test(id)) {
    return jsonError("id required, lowercase a-z0-9_- only", 400);
  }
  if (!name) {
    return jsonError("name required", 400);
  }
  if (!VALID_CATEGORIES.has(category)) {
    return jsonError(
      `category must be one of: ${[...VALID_CATEGORIES].join(", ")}`,
      400,
    );
  }

  const description = body.description ?? null;
  const github_repo = body.github_repo ?? null;
  const github_url = github_repo ? `https://github.com/${github_repo}` : null;
  const vercel_url = body.vercel_url ?? null;
  const domain = body.domain ?? null;

  try {
    await sql`
      INSERT INTO projects (
        id, name, description,
        github_repo, github_url,
        vercel_url, domain,
        category, status
      )
      VALUES (
        ${id}, ${name}, ${description},
        ${github_repo}, ${github_url},
        ${vercel_url}, ${domain},
        ${category}, 'unknown'
      )
    `;

    await sql`
      INSERT INTO audit_events (user_id, action, resource_type, resource_id, ring, payload)
      VALUES (
        ${OPERATOR_USER_ID}, 'project.create', 'project', ${id}, 1,
        ${JSON.stringify({ name, category, github_repo })}::jsonb
      )
    `;

    return new Response(JSON.stringify({ id, name }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("duplicate") || message.includes("unique")) {
      return jsonError(`project with id "${id}" already exists`, 409);
    }
    return jsonError(`db error: ${message}`, 500);
  }
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
