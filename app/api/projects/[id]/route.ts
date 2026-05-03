import { sql, queryOne } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ProjectDetail {
  id: string;
  name: string;
  description: string | null;
  github_repo: string | null;
  github_url: string | null;
  github_private: boolean;
  github_language: string | null;
  github_default_branch: string;
  vercel_project_id: string | null;
  vercel_url: string | null;
  domain: string | null;
  category: string;
  status: string;
  last_audit_at: string | null;
  last_audit_score: number | null;
  created_at: string;
  updated_at: string;
}

const OPERATOR_USER_ID = "operator_luis";

/**
 * GET /api/projects/{id}
 *
 * Returns full detail for a single project. Used by /projects/[slug].
 * Returns 404 if not found.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const project = await queryOne<ProjectDetail>(
    `SELECT id, name, description,
            github_repo, github_url, github_private, github_language,
            github_default_branch,
            vercel_project_id, vercel_url, domain,
            category, status,
            last_audit_at, last_audit_score,
            created_at, updated_at
       FROM projects WHERE id = $1`,
    [id],
  );

  if (!project) {
    return new Response(JSON.stringify({ error: "project not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ project }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * DELETE /api/projects/{id}
 *
 * Removes a project from the catalog. Anillo 2 (project mutation).
 * Cascades to repo_audits, user_secrets via FK.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const result = await sql`DELETE FROM projects WHERE id = ${id} RETURNING id, name`;
    const rows = result as Array<{ id: string; name: string }>;

    if (rows.length === 0) {
      return new Response(JSON.stringify({ error: "project not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    await sql`
      INSERT INTO audit_events (user_id, action, resource_type, resource_id, ring, payload)
      VALUES (
        ${OPERATOR_USER_ID}, 'project.delete', 'project', ${id}, 2,
        ${JSON.stringify({ deleted: rows[0] })}::jsonb
      )
    `;

    return new Response(JSON.stringify({ deleted: rows[0] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: `db error: ${message}` }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
