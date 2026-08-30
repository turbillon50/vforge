import { queryAll, queryOne, sql } from "@/lib/db/client";
import { listAllUserRepos, type RepoSummary } from "@/lib/github/client";
import {
  listProjects as vercelListProjects,
  listProjectDomains,
  pickCustomDomain,
} from "@/lib/vercel/client";
import { requireOperatorAuth } from "@/lib/auth/operator-token";
import { resolveRequestOwner } from "@/lib/auth/request-owner";
import { ensureProjectRepositoriesSchema } from "@/lib/projects/repository-schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Membership {
  project_id: string;
  repo_full_name: string;
  is_primary: boolean;
}

/** Synchronize inventory without flattening multi-repository projects. */
export async function POST(req: Request) {
  const auth = await resolveSyncOwner(req);
  if (auth instanceof Response) return auth;
  await ensureProjectRepositoriesSchema();

  const [vercelResult, githubResult] = await Promise.all([
    vercelListProjects({ auditUserId: auth.userId, max: 500 }).catch((error) => ({
      error: error instanceof Error ? error.message : String(error),
      data: [] as const,
    })),
    listAllUserRepos({ auditUserId: auth.userId, max: 500 }).catch((error) => ({
      error: error instanceof Error ? error.message : String(error),
      data: [] as const,
    })),
  ]);

  const vercelProjects = Array.isArray(vercelResult) ? vercelResult : [];
  const githubRepos = Array.isArray(githubResult) ? githubResult : [];
  const errors: Array<{ resource: string; message: string }> = [];
  if (!Array.isArray(vercelResult)) {
    errors.push({ resource: "vercel", message: vercelResult.error });
  }
  if (!Array.isArray(githubResult)) {
    errors.push({ resource: "github", message: githubResult.error });
  }

  const memberships = await queryAll<Membership>(
    "SELECT project_id, repo_full_name, is_primary FROM project_repositories",
  );
  const membershipsByRepo = new Map<string, Membership[]>();
  for (const membership of memberships) {
    const key = membership.repo_full_name.toLowerCase();
    membershipsByRepo.set(key, [
      ...(membershipsByRepo.get(key) ?? []),
      membership,
    ]);
  }

  const projectIds = new Set(
    (await queryAll<{ id: string }>("SELECT id FROM projects")).map((row) => row.id),
  );
  let inserted = 0;
  let updated = 0;
  let membershipsUpdated = 0;

  for (const repo of githubRepos) {
    try {
      let linked = membershipsByRepo.get(repo.full_name.toLowerCase()) ?? [];
      if (linked.length === 0) {
        const existing = await queryOne<{ id: string }>(
          "SELECT id FROM projects WHERE github_repo = $1 LIMIT 1",
          [repo.full_name],
        );
        const id = existing?.id ?? nextProjectId(repo, projectIds);

        if (!existing) {
          await insertProjectFromRepo(id, repo);
          projectIds.add(id);
          inserted += 1;
        }
        await upsertMembership(id, repo, true);
        linked = [{ project_id: id, repo_full_name: repo.full_name, is_primary: true }];
        membershipsByRepo.set(repo.full_name.toLowerCase(), linked);
      } else {
        for (const membership of linked) {
          await upsertMembership(membership.project_id, repo, membership.is_primary);
          if (membership.is_primary) {
            await updatePrimaryProject(membership.project_id, repo);
          }
        }
        updated += linked.length;
      }
      membershipsUpdated += linked.length;
    } catch (error) {
      errors.push({
        resource: repo.full_name,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  for (const project of vercelProjects) {
    try {
      const linkedRepo = vercelRepoFullName(project.link);
      const linkedMemberships = linkedRepo
        ? membershipsByRepo.get(linkedRepo.toLowerCase()) ?? []
        : [];
      let targetIds = [...new Set(linkedMemberships.map((row) => row.project_id))];

      if (targetIds.length === 0) {
        const nameMatch = await queryOne<{ id: string }>(
          `SELECT id FROM projects
            WHERE lower(id) = lower($1) OR lower(name) = lower($2)
            ORDER BY CASE WHEN lower(id) = lower($1) THEN 0 ELSE 1 END
            LIMIT 1`,
          [slugify(project.name), project.name],
        );
        if (nameMatch) {
          targetIds = [nameMatch.id];
        } else {
          const id = uniqueId(slugify(project.name), projectIds);
          await sql`
            INSERT INTO projects (id, name, vercel_project_id, vercel_url)
            VALUES (${id}, ${project.name}, ${project.id}, ${guessVercelUrl(project.name)})
          `;
          projectIds.add(id);
          targetIds = [id];
          inserted += 1;
        }
      }

      let customDomain: string | null = null;
      try {
        customDomain = pickCustomDomain(
          await listProjectDomains(project.id, { auditUserId: auth.userId }),
        );
      } catch {
        // A Vercel project without domain access still stays synchronized.
      }

      for (const id of targetIds) {
        await sql`
          UPDATE projects SET
            vercel_project_id = ${project.id},
            vercel_url = COALESCE(vercel_url, ${guessVercelUrl(project.name)}),
            domain = COALESCE(${customDomain}, domain),
            updated_at = now()
          WHERE id = ${id}
        `;
        updated += 1;
      }
    } catch (error) {
      errors.push({
        resource: `vercel:${project.name}`,
        message: error instanceof Error ? error.message : String(error),
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
        memberships_updated: membershipsUpdated,
        vercel_count: vercelProjects.length,
        github_count: githubRepos.length,
        errors,
      })}::jsonb
    )
  `;

  return json({
    ok: errors.length === 0,
    inserted,
    updated,
    memberships_updated: membershipsUpdated,
    vercel_count: vercelProjects.length,
    github_count: githubRepos.length,
    errors,
  });
}

async function resolveSyncOwner(
  req: Request,
): Promise<{ userId: string } | Response> {
  const tokenAuth = requireOperatorAuth(req);
  if (tokenAuth.ok) return { userId: tokenAuth.userId };

  const access = await resolveRequestOwner();
  if (!access.userId) return json({ error: "unauthorized" }, 401);
  if (!access.isOwner) return json({ error: "forbidden" }, 403);
  return { userId: access.userId };
}

async function insertProjectFromRepo(id: string, repo: RepoSummary) {
  await sql`
    INSERT INTO projects (
      id, name, description, github_repo, github_private,
      github_default_branch, github_language, github_url
    ) VALUES (
      ${id}, ${repo.name}, ${repo.description}, ${repo.full_name}, ${repo.private},
      ${repo.default_branch}, ${repo.language}, ${repo.html_url}
    )
  `;
}

async function upsertMembership(
  projectId: string,
  repo: RepoSummary,
  primary: boolean,
) {
  await sql`
    INSERT INTO project_repositories (
      project_id, repo_full_name, role, is_primary, default_branch,
      private, language, html_url, pushed_at
    ) VALUES (
      ${projectId}, ${repo.full_name}, 'app', ${primary}, ${repo.default_branch},
      ${repo.private}, ${repo.language}, ${repo.html_url}, ${repo.pushed_at}
    )
    ON CONFLICT (project_id, repo_full_name) DO UPDATE SET
      default_branch = EXCLUDED.default_branch,
      private = EXCLUDED.private,
      language = EXCLUDED.language,
      html_url = EXCLUDED.html_url,
      pushed_at = EXCLUDED.pushed_at,
      updated_at = now()
  `;
}

async function updatePrimaryProject(projectId: string, repo: RepoSummary) {
  await sql`
    UPDATE projects SET
      github_repo = ${repo.full_name},
      github_private = ${repo.private},
      github_default_branch = ${repo.default_branch},
      github_language = ${repo.language},
      github_url = ${repo.html_url},
      updated_at = now()
    WHERE id = ${projectId}
  `;
}

function vercelRepoFullName(link: unknown): string | null {
  if (!link || typeof link !== "object") return null;
  const value = link as { repo?: unknown; org?: unknown };
  if (typeof value.repo !== "string" || !value.repo.trim()) return null;
  if (typeof value.org !== "string" || !value.org.trim()) return null;
  return `${value.org}/${value.repo}`;
}

function nextProjectId(repo: RepoSummary, existing: Set<string>): string {
  const simple = slugify(repo.name);
  if (!existing.has(simple)) return simple;
  return uniqueId(slugify(`${repo.owner}-${repo.name}`), existing);
}

function uniqueId(base: string, existing: Set<string>): string {
  const safeBase = base || "project";
  if (!existing.has(safeBase)) return safeBase;
  let suffix = 2;
  while (existing.has(`${safeBase}-${suffix}`)) suffix += 1;
  return `${safeBase}-${suffix}`;
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

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
