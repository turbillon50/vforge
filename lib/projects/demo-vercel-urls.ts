import "server-only";

import { queryAll, queryOne } from "@/lib/db/client";
import {
  listDeployments,
  listProjectDomains,
  listProjects,
  pickCustomDomain,
  type VercelDeployment,
  type VercelDomain,
  type VercelProject,
} from "@/lib/vercel/client";
import {
  ensureProjectCarteraSchema,
  ensureProjectRepositoriesSchema,
} from "@/lib/projects/repository-schema";
import { normalizePublishedUrl } from "@/lib/projects/viewport-url";

interface DemoUrlRow {
  id: string;
  name: string;
  github_repo: string | null;
  vercel_project_id: string | null;
  repositories: Array<{ repo_full_name: string }> | null;
}

interface UrlResolution {
  url: string;
}

export interface DemoVercelUrlRefreshResult {
  ok: boolean;
  vercel_available: boolean;
  scanned: number;
  matched: number;
  updated: number;
  unresolved: number;
  errors: Array<{ resource: string; message: string }>;
}

export async function refreshDemoVercelUrls(
  options: { auditUserId?: string } = {},
): Promise<DemoVercelUrlRefreshResult> {
  await ensureProjectRepositoriesSchema();
  await ensureProjectCarteraSchema();

  const demos = await queryAll<DemoUrlRow>(
    `SELECT p.id, p.name, p.github_repo, p.vercel_project_id,
            COALESCE((
              SELECT jsonb_agg(jsonb_build_object('repo_full_name', pr.repo_full_name))
                FROM project_repositories pr
               WHERE pr.project_id = p.id
            ), '[]'::jsonb) AS repositories
       FROM projects p
      WHERE COALESCE(p.es_demo, false) = true
      ORDER BY p.name ASC`,
  );

  const result: DemoVercelUrlRefreshResult = {
    ok: true,
    vercel_available: true,
    scanned: demos.length,
    matched: 0,
    updated: 0,
    unresolved: 0,
    errors: [],
  };

  let projects: VercelProject[];
  try {
    projects = await listProjects({ auditUserId: options.auditUserId, max: 500 });
  } catch (error) {
    return {
      ...result,
      vercel_available: false,
      unresolved: demos.length,
      errors: [{ resource: "vercel", message: errorMessage(error) }],
    };
  }

  const index = indexVercelProjects(projects);

  for (const demo of demos) {
    const project = findProjectForDemo(demo, index);
    if (!project) {
      result.unresolved += 1;
      continue;
    }

    result.matched += 1;
    const resolution = await resolveProductionUrl(project, options);
    if (!resolution) {
      result.unresolved += 1;
      continue;
    }

    const updated = await queryOne<{ id: string }>(
      `UPDATE projects
          SET vercel_project_id = $2,
              vercel_url = $3,
              updated_at = now()
        WHERE id = $1
          AND (
            vercel_project_id IS DISTINCT FROM $2
            OR vercel_url IS DISTINCT FROM $3
          )
        RETURNING id`,
      [demo.id, project.id, resolution.url],
    );
    if (updated) result.updated += 1;
  }

  return result;
}

function indexVercelProjects(projects: VercelProject[]) {
  const byId = new Map<string, VercelProject>();
  const byRepo = new Map<string, VercelProject>();
  const byName = new Map<string, VercelProject>();

  for (const project of projects) {
    byId.set(project.id, project);
    byName.set(slug(project.name), project);

    const repo = vercelRepoFullName(project.link);
    if (repo) byRepo.set(repo.toLowerCase(), project);
  }

  return { byId, byRepo, byName };
}

function findProjectForDemo(
  demo: DemoUrlRow,
  index: ReturnType<typeof indexVercelProjects>,
): VercelProject | null {
  if (demo.vercel_project_id) {
    const byId = index.byId.get(demo.vercel_project_id);
    if (byId) return byId;
  }

  for (const repo of demoRepos(demo)) {
    const byRepo = index.byRepo.get(repo.toLowerCase());
    if (byRepo) return byRepo;

    const shortName = repo.split("/").pop();
    if (shortName) {
      const byRepoName = index.byName.get(slug(shortName));
      if (byRepoName) return byRepoName;
    }
  }

  return index.byName.get(slug(demo.name)) ?? null;
}

async function resolveProductionUrl(
  project: VercelProject,
  options: { auditUserId?: string },
): Promise<UrlResolution | null> {
  const domains = await listProjectDomains(project.id, options).catch(() => []);
  const domain = pickProductionDomain(domains);
  if (domain) return { url: domain };

  const target = productionTargetUrl(project);
  if (target) return { url: target };

  const deployments = await listDeployments(project.id, {
    auditUserId: options.auditUserId,
    limit: 20,
  }).catch(() => [] as VercelDeployment[]);
  const ready = deployments.find(isReadyProductionDeployment);
  const url = normalizePublishedUrl(ready?.url);
  return url ? { url } : null;
}

function pickProductionDomain(domains: VercelDomain[]): string | null {
  const custom = pickCustomDomain(domains);
  if (custom) return normalizePublishedUrl(custom);

  const production = domains.find(
    (domain) =>
      domain.name &&
      domain.verified !== false &&
      !domain.gitBranch &&
      /\.vercel\.app$/i.test(domain.name),
  );
  return normalizePublishedUrl(production?.name);
}

function productionTargetUrl(project: VercelProject): string | null {
  const targets = project.targets as
    | Record<
        string,
        {
          url?: unknown;
          alias?: unknown;
          aliases?: unknown;
        }
      >
    | null
    | undefined;
  const production = targets?.production;
  if (!production) return null;

  const aliases = [
    ...asStringArray(production.alias),
    ...asStringArray(production.aliases),
  ];
  for (const alias of aliases) {
    const url = normalizePublishedUrl(alias);
    if (url) return url;
  }

  return typeof production.url === "string"
    ? normalizePublishedUrl(production.url)
    : null;
}

function asStringArray(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function isReadyProductionDeployment(deployment: VercelDeployment): boolean {
  const target = String(deployment.target ?? "").toLowerCase();
  const state = String(deployment.state ?? deployment.readyState ?? "").toLowerCase();
  return target === "production" && (state === "ready" || state === "succeeded");
}

function demoRepos(demo: DemoUrlRow): string[] {
  const repos = [
    demo.github_repo,
    ...(demo.repositories ?? []).map((repo) => repo.repo_full_name),
  ]
    .filter((value): value is string => Boolean(value?.trim()))
    .map((value) => value.trim());
  return [...new Set(repos)];
}

function vercelRepoFullName(link: unknown): string | null {
  if (!link || typeof link !== "object") return null;
  const value = link as { repo?: unknown; org?: unknown };
  if (typeof value.repo !== "string" || !value.repo.trim()) return null;
  if (typeof value.org !== "string" || !value.org.trim()) return null;
  return `${value.org}/${value.repo}`;
}

function slug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
