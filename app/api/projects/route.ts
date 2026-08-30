import { queryAll, sql } from "@/lib/db/client";
import { resolveRequestOwner } from "@/lib/auth/request-owner";
import { createRepo } from "@/lib/github/client";
import { neon } from "@neondatabase/serverless";
import { ensureDeliveryColumns } from "@/lib/projects/delivery-meta";
import { ensureProjectRepositoriesSchema } from "@/lib/projects/repository-schema";
import type { ProjectRepository } from "@/lib/projects/repository-groups";

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
  delivery_priority?: boolean;
  progress_pct?: number;
  family_code?: string | null;
  repositories: ProjectRepository[];
  repository_count: number;
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

export async function GET() {
  const access = await resolveRequestOwner();
  if (!access.userId) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (!access.isOwner) {
    return jsonError("forbidden", 403);
  }

  await ensureDeliveryColumns();
  await ensureProjectRepositoriesSchema();

  const rows = await queryAll<ProjectRow>(
    `SELECT p.id, p.name, p.category, p.status,
            p.github_repo, p.github_private, p.github_language,
            p.vercel_url, p.domain,
            COALESCE(p.delivery_priority, false) AS delivery_priority,
            COALESCE(p.progress_pct, 0) AS progress_pct,
            p.family_code,
            COALESCE((
              SELECT jsonb_agg(
                jsonb_build_object(
                  'repo_full_name', pr.repo_full_name,
                  'role', pr.role,
                  'is_primary', pr.is_primary,
                  'default_branch', pr.default_branch,
                  'private', pr.private,
                  'language', pr.language,
                  'html_url', pr.html_url,
                  'pushed_at', pr.pushed_at
                ) ORDER BY pr.is_primary DESC, pr.role, pr.repo_full_name
              )
              FROM project_repositories pr
              WHERE pr.project_id = p.id
            ), '[]'::jsonb) AS repositories,
            (SELECT count(*)::int FROM project_repositories pr WHERE pr.project_id = p.id)
              AS repository_count
       FROM projects p
       ORDER BY
         COALESCE(p.delivery_priority, false) DESC,
         CASE p.category
           WHEN 'produccion' THEN 1
           WHEN 'activo' THEN 2
           WHEN 'en_revision' THEN 3
           WHEN 'en_pausa' THEN 4
           WHEN 'archivo' THEN 5
           WHEN 'pendiente_borrado' THEN 6
           ELSE 99
         END,
         COALESCE(p.progress_pct, 0) DESC,
         p.name`,
  );
  return new Response(JSON.stringify({ projects: rows }), {
    status: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export async function POST(req: Request) {
  const access = await resolveRequestOwner();
  if (!access.userId) return jsonError("unauthorized", 401);
  if (!access.isOwner) return jsonError("forbidden", 403);

  let body: {
    id?: string;
    name?: string;
    description?: string | null;
    github_repo?: string | null;
    vercel_url?: string | null;
    domain?: string | null;
    category?: string;
    create_repo?: boolean;
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

  const dburl = process.env.DATABASE_URL;
  if (!dburl) {
    return jsonError("DATABASE_URL not configured", 500);
  }
  const txClient = neon(dburl);
  const auditPayload = JSON.stringify({ name, category, github_repo });

  try {
    await ensureDeliveryColumns();
    await ensureProjectRepositoriesSchema();
    await txClient.transaction([
      txClient`
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
      `,
      txClient`
        INSERT INTO audit_events (user_id, action, resource_type, resource_id, ring, payload)
        VALUES (
          ${OPERATOR_USER_ID}, 'project.create', 'project', ${id}, 1,
          ${auditPayload}::jsonb
        )
      `,
    ]);

    let createdRepo: { full_name: string; url: string } | null = null;
    let repoError: string | null = null;
    if (body.create_repo && !github_repo) {
      try {
        const repo = await createRepo({
          name: id,
          description: description ?? undefined,
          private: true,
        });
        createdRepo = { full_name: repo.full_name, url: repo.url };
        await sql`
          UPDATE projects
          SET github_repo = ${repo.full_name}, github_url = ${repo.url},
              github_private = ${repo.private},
              github_default_branch = ${repo.default_branch}
          WHERE id = ${id}
        `;
        await sql`
          INSERT INTO project_repositories (
            project_id, repo_full_name, role, is_primary,
            default_branch, private, language, html_url, pushed_at
          ) VALUES (
            ${id}, ${repo.full_name}, 'app', true,
            ${repo.default_branch}, ${repo.private}, NULL,
            ${repo.url}, NULL
          )
          ON CONFLICT (project_id, repo_full_name) DO UPDATE SET
            is_primary = true,
            default_branch = EXCLUDED.default_branch,
            private = EXCLUDED.private,
            language = EXCLUDED.language,
            html_url = EXCLUDED.html_url,
            pushed_at = EXCLUDED.pushed_at,
            updated_at = now()
        `;
      } catch (e) {
        repoError = e instanceof Error ? e.message : String(e);
        console.error("[projects] createRepo failed:", repoError);
      }
    }

    if (github_repo && !createdRepo) {
      await sql`
        INSERT INTO project_repositories (
          project_id, repo_full_name, role, is_primary, html_url
        ) VALUES (${id}, ${github_repo}, 'app', true, ${github_url})
        ON CONFLICT (project_id, repo_full_name) DO UPDATE SET
          is_primary = true, html_url = EXCLUDED.html_url, updated_at = now()
      `;
    }

    fetch("http://178.105.135.26:3003/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        para: "luis",
        mensaje: `NUEVO PROYECTO en VForge!\n\nID: ${id}\nNombre: ${name}\nCategoria: ${category}\nRepo: ${github_repo || "N/A"}\nDominio: ${domain || "N/A"}`,
        urgente: false,
      }),
    }).catch(() => {});

    return new Response(
      JSON.stringify({
        id,
        name,
        github_repo: createdRepo?.full_name ?? null,
        github_url: createdRepo?.url ?? null,
        repo_error: repoError,
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      },
    );
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
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
