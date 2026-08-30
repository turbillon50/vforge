import { queryAll, queryOne, sql } from "@/lib/db/client";
import { resolveRequestOwner } from "@/lib/auth/request-owner";
import { getRepo } from "@/lib/github/client";
import {
  isProjectRepositoryRole,
  type ProjectRepository,
} from "@/lib/projects/repository-groups";
import { ensureProjectRepositoriesSchema } from "@/lib/projects/repository-schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireOwner(): Promise<{ userId: string } | Response> {
  const access = await resolveRequestOwner();
  if (!access.userId) return jsonError("unauthorized", 401);
  if (!access.isOwner) return jsonError("forbidden", 403);
  return { userId: access.userId };
}

async function projectExists(projectId: string): Promise<boolean> {
  return Boolean(
    await queryOne<{ id: string }>("SELECT id FROM projects WHERE id = $1", [
      projectId,
    ]),
  );
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await requireOwner();
  if (access instanceof Response) return access;
  const { id } = await params;

  await ensureProjectRepositoriesSchema();
  if (!(await projectExists(id))) return jsonError("project not found", 404);

  const repositories = await queryAll<ProjectRepository>(
    `SELECT repo_full_name, role, is_primary, default_branch,
            private, language, html_url, pushed_at::text
       FROM project_repositories
      WHERE project_id = $1
      ORDER BY is_primary DESC, role, repo_full_name`,
    [id],
  );
  return json({ repositories });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await requireOwner();
  if (access instanceof Response) return access;
  const { id } = await params;
  await ensureProjectRepositoriesSchema();
  if (!(await projectExists(id))) return jsonError("project not found", 404);

  let body: { repo_full_name?: string; role?: string; is_primary?: boolean };
  try {
    body = await req.json();
  } catch {
    return jsonError("invalid JSON body", 400);
  }

  const repoFullName = (body.repo_full_name ?? "").trim();
  const role = body.role ?? "app";
  if (!/^[^/\s]+\/[^/\s]+$/.test(repoFullName)) {
    return jsonError("repo_full_name must be owner/repository", 400);
  }
  if (!isProjectRepositoryRole(role)) {
    return jsonError("invalid repository role", 400);
  }

  const [owner, repoName] = repoFullName.split("/", 2);
  let repo;
  try {
    repo = await getRepo(owner, repoName, { auditUserId: access.userId });
  } catch (caught) {
    return jsonError(
      caught instanceof Error
        ? `GitHub no permitió leer ${repoFullName}: ${caught.message}`
        : `GitHub no permitió leer ${repoFullName}`,
      422,
    );
  }

  const current = await queryOne<{ count: number }>(
    "SELECT count(*)::int AS count FROM project_repositories WHERE project_id = $1",
    [id],
  );
  const makePrimary = body.is_primary === true || (current?.count ?? 0) === 0;

  if (makePrimary) {
    await sql`
      UPDATE project_repositories SET is_primary = false, updated_at = now()
      WHERE project_id = ${id}
    `;
  }

  await sql`
    INSERT INTO project_repositories (
      project_id, repo_full_name, role, is_primary,
      default_branch, private, language, html_url, pushed_at
    ) VALUES (
      ${id}, ${repo.full_name}, ${role}, ${makePrimary},
      ${repo.default_branch}, ${repo.private}, ${repo.language},
      ${repo.html_url}, ${repo.pushed_at}
    )
    ON CONFLICT (project_id, repo_full_name) DO UPDATE SET
      role = EXCLUDED.role,
      is_primary = CASE WHEN ${makePrimary} THEN true ELSE project_repositories.is_primary END,
      default_branch = EXCLUDED.default_branch,
      private = EXCLUDED.private,
      language = EXCLUDED.language,
      html_url = EXCLUDED.html_url,
      pushed_at = EXCLUDED.pushed_at,
      updated_at = now()
  `;

  if (makePrimary) {
    await sql`
      UPDATE projects SET
        github_repo = ${repo.full_name},
        github_url = ${repo.html_url},
        github_private = ${repo.private},
        github_language = ${repo.language},
        github_default_branch = ${repo.default_branch},
        updated_at = now()
      WHERE id = ${id}
    `;
  }

  await sql`
    INSERT INTO audit_events (user_id, action, resource_type, resource_id, ring, payload)
    VALUES (
      ${access.userId}, 'project.repository.upsert', 'project', ${id}, 1,
      ${JSON.stringify({ repo_full_name: repo.full_name, role, is_primary: makePrimary })}::jsonb
    )
  `;

  return GET(req, { params: Promise.resolve({ id }) });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await requireOwner();
  if (access instanceof Response) return access;
  const { id } = await params;
  const repoFullName = new URL(req.url).searchParams.get("repo")?.trim() ?? "";
  if (!repoFullName) return jsonError("repo query parameter required", 400);

  await ensureProjectRepositoriesSchema();
  const removed = await queryOne<{ repo_full_name: string; is_primary: boolean }>(
    `DELETE FROM project_repositories
      WHERE project_id = $1 AND lower(repo_full_name) = lower($2)
      RETURNING repo_full_name, is_primary`,
    [id, repoFullName],
  );
  if (!removed) return jsonError("repository is not part of this project", 404);

  if (removed.is_primary) {
    const replacement = await queryOne<ProjectRepository>(
      `SELECT repo_full_name, role, is_primary, default_branch,
              private, language, html_url, pushed_at::text
         FROM project_repositories
        WHERE project_id = $1
        ORDER BY created_at, repo_full_name
        LIMIT 1`,
      [id],
    );
    if (replacement) {
      await sql`
        UPDATE project_repositories SET is_primary = true, updated_at = now()
        WHERE project_id = ${id} AND repo_full_name = ${replacement.repo_full_name}
      `;
      await sql`
        UPDATE projects SET
          github_repo = ${replacement.repo_full_name},
          github_url = ${replacement.html_url},
          github_private = ${replacement.private},
          github_language = ${replacement.language},
          github_default_branch = COALESCE(${replacement.default_branch}, 'main'),
          updated_at = now()
        WHERE id = ${id}
      `;
    } else {
      await sql`
        UPDATE projects SET
          github_repo = NULL, github_url = NULL, github_language = NULL,
          updated_at = now()
        WHERE id = ${id}
      `;
    }
  }

  await sql`
    INSERT INTO audit_events (user_id, action, resource_type, resource_id, ring, payload)
    VALUES (
      ${access.userId}, 'project.repository.remove', 'project', ${id}, 1,
      ${JSON.stringify({ repo_full_name: removed.repo_full_name })}::jsonb
    )
  `;

  return GET(req, { params: Promise.resolve({ id }) });
}

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function jsonError(message: string, status: number): Response {
  return json({ error: message }, status);
}

