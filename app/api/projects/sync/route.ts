import { sql } from "@/lib/db/client";
import { listAllUserRepos } from "@/lib/github/client";
import {
  listProjects as vercelListProjects,
  listProjectDomains,
  pickCustomDomain,
} from "@/lib/vercel/client";
import {
  requireOperatorAuth,
  authFailureResponse,
} from "@/lib/auth/operator-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/projects/sync
 *
 * Cross-references the Vercel project list and the GitHub repo list
 * to upsert rows in `projects`. Each row gets:
 *   - id: slug derived from the project's name (or repo when no project)
 *   - name, description
 *   - github_* fields when a matching repo exists
 *   - vercel_project_id, vercel_url when a matching deploy exists
 *
 * Idempotent: existing rows get updated; nothing is deleted.
 *
 * Bearer-token protected, audit-logged.
 */
export async function POST(req: Request) {
  const auth = requireOperatorAuth(req);
  if (!auth.ok) return authFailureResponse(auth);

  const [vercelProjects, ghRepos] = await Promise.all([
    vercelListProjects({ auditUserId: auth.userId, max: 200 }).catch(
      (err) => {
        return { error: err instanceof Error ? err.message : String(err), data: [] as const };
      },
    ),
    listAllUserRepos({ auditUserId: auth.userId, max: 200 }).catch(
      (err) => {
        return { error: err instanceof Error ? err.message : String(err), data: [] as const };
      },
    ),
  ]);

  const vp = Array.isArray(vercelProjects) ? vercelProjects : [];
  const gr = Array.isArray(ghRepos) ? ghRepos : [];

  // Build a unified set keyed on the GitHub repo full_name when known,
  // or the Vercel project name otherwise.
  type Aggregated = {
    id: string;
    name: string;
    description: string | null;
    github_repo: string | null;
    github_private: boolean | null;
    github_default_branch: string | null;
    github_language: string | null;
    github_url: string | null;
    vercel_project_id: string | null;
    vercel_url: string | null;
    domain: string | null;
  };
  const byKey = new Map<string, Aggregated>();

  for (const repo of gr) {
    const id = slugify(repo.name);
    byKey.set(repo.full_name.toLowerCase(), {
      id,
      name: repo.name,
      description: repo.description,
      github_repo: repo.full_name,
      github_private: repo.private,
      github_default_branch: repo.default_branch,
      github_language: repo.language,
      github_url: repo.html_url,
      vercel_project_id: null,
      vercel_url: null,
      domain: null,
    });
  }

  for (const project of vp) {
    const repoFullName = (project.link as { repo?: string; org?: string } | null | undefined)
      ?.repo
      ? `${(project.link as { repo: string; org: string }).org ?? ""}/${(project.link as { repo: string; org: string }).repo}`
      : null;
    const key = repoFullName ? repoFullName.toLowerCase() : `vercel:${project.name}`;
    // Dominio CUSTOM real de Vercel (no *.vercel.app) — fiel a producción.
    let customDomain: string | null = null;
    try {
      const domains = await listProjectDomains(project.id, { auditUserId: auth.userId });
      customDomain = pickCustomDomain(domains);
    } catch {
      /* sin permiso o sin dominios: se deja null */
    }
    const prevAgg = byKey.get(key);
    const merged: Aggregated = prevAgg
      ? {
          ...prevAgg,
          vercel_project_id: project.id,
          vercel_url: prevAgg.vercel_url ?? guessVercelUrl(project.name),
          domain: customDomain ?? prevAgg.domain,
        }
      : {
          id: slugify(project.name),
          name: project.name,
          description: null,
          github_repo: null,
          github_private: null,
          github_default_branch: null,
          github_language: null,
          github_url: null,
          vercel_project_id: project.id,
          vercel_url: guessVercelUrl(project.name),
          domain: customDomain,
        };
    byKey.set(key, merged);
  }

  let inserted = 0;
  let updated = 0;
  let errors: Array<{ id: string; message: string }> = [];

  for (const agg of byKey.values()) {
    try {
      const existing = (await sql`SELECT id FROM projects WHERE id = ${agg.id}`) as Array<{ id: string }>;
      if (existing.length > 0) {
        await sql`
          UPDATE projects SET
            name = COALESCE(${agg.name}, name),
            description = COALESCE(${agg.description}, description),
            github_repo = COALESCE(${agg.github_repo}, github_repo),
            github_private = COALESCE(${agg.github_private}, github_private),
            github_default_branch = COALESCE(${agg.github_default_branch}, github_default_branch),
            github_language = COALESCE(${agg.github_language}, github_language),
            github_url = COALESCE(${agg.github_url}, github_url),
            vercel_project_id = COALESCE(${agg.vercel_project_id}, vercel_project_id),
            vercel_url = COALESCE(${agg.vercel_url}, vercel_url),
            domain = COALESCE(${agg.domain}, domain)
          WHERE id = ${agg.id}
        `;
        updated += 1;
      } else {
        await sql`
          INSERT INTO projects (
            id, name, description,
            github_repo, github_private, github_default_branch,
            github_language, github_url,
            vercel_project_id, vercel_url, domain
          ) VALUES (
            ${agg.id}, ${agg.name}, ${agg.description},
            ${agg.github_repo}, ${agg.github_private}, ${agg.github_default_branch},
            ${agg.github_language}, ${agg.github_url},
            ${agg.vercel_project_id}, ${agg.vercel_url}, ${agg.domain}
          )
        `;
        inserted += 1;
      }
    } catch (err) {
      errors.push({
        id: agg.id,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  await sql`
    INSERT INTO audit_events (user_id, action, resource_type, ring, payload)
    VALUES (
      ${auth.userId}, 'projects.sync', 'projects', 1,
      ${JSON.stringify({
        inserted,
        updated,
        total_aggregated: byKey.size,
        vercel_count: vp.length,
        github_count: gr.length,
        errors,
      })}::jsonb
    )
  `;

  return new Response(
    JSON.stringify({
      ok: errors.length === 0,
      inserted,
      updated,
      total: byKey.size,
      vercel_count: vp.length,
      github_count: gr.length,
      errors,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    },
  );
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function guessVercelUrl(projectName: string): string {
  return `https://${projectName}.vercel.app`;
}
