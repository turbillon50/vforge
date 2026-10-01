import { auth } from "@clerk/nextjs/server";
import { isOwnerRequest } from "@/lib/forja/ojo";
import { queryAll, queryOne, sql } from "@/lib/db/client";
import { runUnicornTool, type UnicornDb } from "@/lib/mcp/unicorn";
import {
  VALID_PROJECT_CATEGORIES,
  ensureDeliveryColumns,
} from "@/lib/projects/delivery-meta";
import {
  ensureProjectRepositoriesSchema,
  ensureProjectRepositoryCurationSchema,
} from "@/lib/projects/repository-schema";
import type { ProjectRepositoryRole } from "@/lib/projects/repository-groups";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GITHUB_OWNER = "turbillon50";
const GITHUB_API = "https://api.github.com";
const CACHE_MS = 5 * 60 * 1000;
const NO_STORE = { "Cache-Control": "no-store" };
const VALID_STATUSES = new Set(["live", "building", "error", "idle", "unknown"]);
const VALID_REASONS = new Set(["experimento", "demo_vieja", "copia", "otro"]);

interface GithubApiRepo {
  full_name: string;
  name: string;
  owner?: { login?: string | null } | null;
  private: boolean;
  description: string | null;
  language: string | null;
  default_branch: string | null;
  pushed_at: string | null;
  updated_at: string | null;
  archived: boolean;
  fork: boolean;
  html_url: string;
  size: number;
  topics?: string[];
}

interface GithubRepoSummary {
  full_name: string;
  name: string;
  owner: string;
  private: boolean;
  description: string | null;
  language: string | null;
  default_branch: string;
  pushed_at: string | null;
  updated_at: string | null;
  archived: boolean;
  fork: boolean;
  html_url: string;
  size_kb: number;
  topics: string[];
}

interface LinkedProjectRow {
  repo_full_name: string;
  project_id: string;
  project_name: string;
  is_primary: boolean;
}

interface CurationRow {
  repo_full_name: string;
  archived: boolean;
  archived_reason: string | null;
  archived_note: string | null;
  archived_at: string | null;
}

interface ProjectOptionRow {
  id: string;
  name: string;
  category: string;
  status: string;
  repository_count: number;
}

interface ProjectLinkSnapshot {
  project_id: string;
  repo_full_name: string;
  role: ProjectRepositoryRole | string;
  is_primary: boolean;
  default_branch: string | null;
  private: boolean | null;
  language: string | null;
  html_url: string | null;
  pushed_at: string | null;
}

interface ArchiveSnapshotRow {
  repo_full_name: string;
  previous_links: unknown;
}

class ApiError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

let githubCache: { expiresAt: number; repos: GithubRepoSummary[] } | null = null;

export async function GET() {
  const access = await requireOwner();
  if (access instanceof Response) return access;

  try {
    await ensureCurationSchema();
    const [repos, linkedRows, curationRows, projects] = await Promise.all([
      listGithubRepos(),
      queryAll<LinkedProjectRow>(
        `SELECT pr.repo_full_name, pr.project_id, p.name AS project_name, pr.is_primary
           FROM project_repositories pr
           JOIN projects p ON p.id = pr.project_id
          ORDER BY p.name, pr.repo_full_name`,
      ),
      queryAll<CurationRow>(
        `SELECT repo_full_name, archived, archived_reason, archived_note, archived_at::text
           FROM project_repository_curation
          WHERE archived = true`,
      ),
      queryAll<ProjectOptionRow>(
        `SELECT p.id, p.name, p.category, p.status,
                count(pr.repo_full_name)::int AS repository_count
           FROM projects p
           LEFT JOIN project_repositories pr ON pr.project_id = p.id
          GROUP BY p.id
          ORDER BY p.name ASC`,
      ),
    ]);

    const linkedByRepo = new Map<string, LinkedProjectRow[]>();
    for (const row of linkedRows) {
      const key = row.repo_full_name.toLowerCase();
      linkedByRepo.set(key, [...(linkedByRepo.get(key) ?? []), row]);
    }

    const curationByRepo = new Map(
      curationRows.map((row) => [row.repo_full_name.toLowerCase(), row]),
    );

    return json({
      repos: repos.map((repo) => ({
        ...repo,
        linked_projects: linkedByRepo.get(repo.full_name.toLowerCase()) ?? [],
        curation: curationByRepo.get(repo.full_name.toLowerCase()) ?? null,
      })),
      projects,
      fetched_at: new Date().toISOString(),
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "No se pudo cargar GitHub.", 500);
  }
}

export async function POST(req: Request) {
  const access = await requireOwner();
  if (access instanceof Response) return access;

  try {
    await ensureCurationSchema();
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== "object") throw new ApiError("JSON invalido.");

    const action = String(body.action ?? "");
    switch (action) {
      case "create_project":
        return json(await createProjectFromRepos(body, access.userId));
      case "add_to_project":
        return json(await addReposToProject(body, access.userId));
      case "archive_repos":
        return json(await archiveRepos(body, access.userId));
      case "undo_archive":
        return json(await undoArchive(body, access.userId));
      default:
        throw new ApiError("Accion invalida.");
    }
  } catch (error) {
    if (error instanceof ApiError) return jsonError(error.message, error.status);
    return jsonError(error instanceof Error ? error.message : "No se pudo guardar.", 500);
  }
}

async function requireOwner(): Promise<{ userId: string } | Response> {
  if (!(await isOwnerRequest())) {
    return Response.json({ error: "forbidden" }, { status: 403, headers: NO_STORE });
  }
  const session = await auth();
  return { userId: session.userId ?? "operator_luis" };
}

async function ensureCurationSchema(): Promise<void> {
  await Promise.all([
    ensureDeliveryColumns(),
    ensureProjectRepositoriesSchema(),
    ensureProjectRepositoryCurationSchema(),
  ]);
}

async function listGithubRepos(): Promise<GithubRepoSummary[]> {
  if (githubCache && githubCache.expiresAt > Date.now()) return githubCache.repos;

  const token = process.env.GITHUB_TOKEN?.trim();
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const repos: GithubRepoSummary[] = [];
  let page = 1;
  while (page <= 20) {
    const url = new URL(token ? `${GITHUB_API}/user/repos` : `${GITHUB_API}/users/${GITHUB_OWNER}/repos`);
    url.searchParams.set("per_page", "100");
    url.searchParams.set("page", String(page));
    url.searchParams.set("sort", "pushed");
    url.searchParams.set("direction", "desc");
    if (token) {
      url.searchParams.set("visibility", "all");
      url.searchParams.set("affiliation", "owner,organization_member");
    } else {
      url.searchParams.set("type", "all");
    }

    const response = await fetch(url, {
      headers,
      next: { revalidate: 300 },
    });
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 240);
      throw new Error(`GitHub API ${response.status}: ${detail}`);
    }
    const data = (await response.json()) as GithubApiRepo[];
    if (data.length === 0) break;

    for (const repo of data) {
      const owner = repo.owner?.login ?? repo.full_name.split("/", 1)[0] ?? "";
      if (owner.toLowerCase() !== GITHUB_OWNER) continue;
      repos.push({
        full_name: repo.full_name,
        name: repo.name,
        owner,
        private: repo.private,
        description: repo.description,
        language: repo.language,
        default_branch: repo.default_branch ?? "main",
        pushed_at: repo.pushed_at,
        updated_at: repo.updated_at,
        archived: repo.archived,
        fork: repo.fork,
        html_url: repo.html_url,
        size_kb: repo.size,
        topics: repo.topics ?? [],
      });
    }

    if (data.length < 100) break;
    page += 1;
  }

  repos.sort((a, b) => timeOf(b.pushed_at ?? b.updated_at) - timeOf(a.pushed_at ?? a.updated_at));
  githubCache = { repos, expiresAt: Date.now() + CACHE_MS };
  return repos;
}

async function createProjectFromRepos(body: Record<string, unknown>, userId: string) {
  const repoNames = cleanRepoNames(body.repo_full_names);
  const repoMap = await repoMapFor(repoNames);
  const name = cleanProjectName(body.name);
  const id = await nextProjectId(cleanSlug(String(body.id ?? "")) || cleanSlug(name));
  const category = cleanCategory(body.category);
  const status = cleanStatus(body.status);
  const primaryName = pickPrimary(repoNames, body.primary_repo);
  const primary = repoMap.get(primaryName.toLowerCase()) ?? repoFallback(primaryName);

  await clearArchives(repoNames);
  await sql`
    INSERT INTO projects (
      id, name, description, category, status,
      github_repo, github_url, github_private, github_language, github_default_branch
    ) VALUES (
      ${id}, ${name}, ${cleanNullableText(body.description, 600)}, ${category}, ${status},
      ${primary.full_name}, ${primary.html_url}, ${primary.private},
      ${primary.language}, ${primary.default_branch}
    )
  `;

  for (const repoName of repoNames) {
    await upsertMembership(id, repoMap.get(repoName.toLowerCase()) ?? repoFallback(repoName), repoName === primaryName);
  }
  await removeOtherMemberships(repoNames, id);
  await audit(userId, "project.curation.create", "project", id, {
    repo_full_names: repoNames,
    primary_repo: primaryName,
  });
  await publishEvent(id, userId, {
    tipo: "repos.curacion",
    titulo: `Proyecto creado desde ${repoNames.length} repositorio${repoNames.length === 1 ? "" : "s"}`,
    detalle: { action: "create_project", repo_full_names: repoNames, primary_repo: primaryName },
  });

  return { ok: true, project_id: id, message: `Proyecto ${name} creado.` };
}

async function addReposToProject(body: Record<string, unknown>, userId: string) {
  const projectId = String(body.project_id ?? "").trim();
  if (!projectId) throw new ApiError("Falta project_id.");
  const project = await queryOne<{ id: string; name: string }>(
    "SELECT id, name FROM projects WHERE id = $1 LIMIT 1",
    [projectId],
  );
  if (!project) throw new ApiError("Proyecto no encontrado.", 404);

  const repoNames = cleanRepoNames(body.repo_full_names);
  const repoMap = await repoMapFor(repoNames);
  const primaryName = pickPrimary(repoNames, body.primary_repo);
  const existingCount = await queryOne<{ n: number }>(
    "SELECT count(*)::int AS n FROM project_repositories WHERE project_id = $1",
    [projectId],
  );
  const makePrimary = (existingCount?.n ?? 0) === 0 || Boolean(body.primary_repo);

  await clearArchives(repoNames);

  if (makePrimary) {
    await sql`
      UPDATE project_repositories SET is_primary = false, updated_at = now()
      WHERE project_id = ${projectId}
    `;
  }

  for (const repoName of repoNames) {
    await upsertMembership(
      projectId,
      repoMap.get(repoName.toLowerCase()) ?? repoFallback(repoName),
      makePrimary && repoName === primaryName,
    );
  }
  if (makePrimary) await setProjectPrimary(projectId, repoMap.get(primaryName.toLowerCase()) ?? repoFallback(primaryName));
  else await repairProjectPrimary(projectId);
  await removeOtherMemberships(repoNames, projectId);

  await audit(userId, "project.curation.add_repos", "project", projectId, {
    repo_full_names: repoNames,
    primary_repo: makePrimary ? primaryName : null,
  });
  await publishEvent(projectId, userId, {
    tipo: "repos.curacion",
    titulo: `${repoNames.length} repositorio${repoNames.length === 1 ? "" : "s"} agregado${repoNames.length === 1 ? "" : "s"}`,
    detalle: { action: "add_to_project", repo_full_names: repoNames, primary_repo: makePrimary ? primaryName : null },
  });

  return { ok: true, project_id: projectId, message: `Repos agregados a ${project.name}.` };
}

async function archiveRepos(body: Record<string, unknown>, userId: string) {
  const repoNames = cleanRepoNames(body.repo_full_names);
  const reason = cleanReason(body.reason);
  const note = cleanNullableText(body.note, 240);
  const previousLinks = await snapshotRepoLinks(repoNames);

  for (const repoName of repoNames) {
    const links = previousLinks.filter((row) => row.repo_full_name.toLowerCase() === repoName.toLowerCase());
    await sql`
      INSERT INTO project_repository_curation (
        repo_full_name, archived, archived_reason, archived_note,
        previous_links, archived_at, archived_by, updated_at
      ) VALUES (
        ${repoName}, true, ${reason}, ${note},
        ${JSON.stringify(links)}::jsonb, now(), ${userId}, now()
      )
      ON CONFLICT (repo_full_name) DO UPDATE SET
        archived = true,
        archived_reason = EXCLUDED.archived_reason,
        archived_note = EXCLUDED.archived_note,
        previous_links = EXCLUDED.previous_links,
        archived_at = now(),
        archived_by = EXCLUDED.archived_by,
        updated_at = now()
    `;
  }

  await removeRepoMemberships(repoNames);

  await audit(userId, "project.curation.archive_repos", "repository", repoNames[0] ?? null, {
    repo_full_names: repoNames,
    reason,
  });
  await publishEvent(previousLinks[0]?.project_id ?? null, userId, {
    tipo: "repos.curacion",
    titulo: `${repoNames.length} repositorio${repoNames.length === 1 ? "" : "s"} marcado${repoNames.length === 1 ? "" : "s"} como no-proyecto`,
    detalle: { action: "archive_repos", repo_full_names: repoNames, reason },
  });

  return { ok: true, message: "Repos archivados como no-proyecto." };
}

async function undoArchive(body: Record<string, unknown>, userId: string) {
  const repoNames = cleanRepoNames(body.repo_full_names);
  const rows = await queryAll<ArchiveSnapshotRow>(
    `SELECT repo_full_name, previous_links
       FROM project_repository_curation
      WHERE lower(repo_full_name) = ANY($1::text[]) AND archived = true`,
    [repoNames.map((repo) => repo.toLowerCase())],
  );
  const affectedProjects = new Set<string>();

  for (const row of rows) {
    const links = parsePreviousLinks(row.previous_links);
    for (const link of links) {
      if (!(await projectExists(link.project_id))) continue;
      if (link.is_primary) {
        await sql`
          UPDATE project_repositories SET is_primary = false, updated_at = now()
          WHERE project_id = ${link.project_id}
        `;
      }
      await sql`
        INSERT INTO project_repositories (
          project_id, repo_full_name, role, is_primary,
          default_branch, private, language, html_url, pushed_at
        ) VALUES (
          ${link.project_id}, ${link.repo_full_name}, ${link.role}, ${link.is_primary},
          ${link.default_branch}, ${link.private}, ${link.language}, ${link.html_url}, ${link.pushed_at}
        )
        ON CONFLICT (project_id, repo_full_name) DO UPDATE SET
          role = EXCLUDED.role,
          is_primary = EXCLUDED.is_primary,
          default_branch = EXCLUDED.default_branch,
          private = EXCLUDED.private,
          language = EXCLUDED.language,
          html_url = EXCLUDED.html_url,
          pushed_at = EXCLUDED.pushed_at,
          updated_at = now()
      `;
      affectedProjects.add(link.project_id);
    }
    await sql`
      UPDATE project_repository_curation
         SET archived = false, updated_at = now()
       WHERE repo_full_name = ${row.repo_full_name}
    `;
  }

  for (const projectId of affectedProjects) await repairProjectPrimary(projectId);

  await audit(userId, "project.curation.undo_archive", "repository", repoNames[0] ?? null, {
    repo_full_names: repoNames,
    restored_projects: [...affectedProjects],
  });
  await publishEvent([...affectedProjects][0] ?? null, userId, {
    tipo: "repos.curacion",
    titulo: `${repoNames.length} repositorio${repoNames.length === 1 ? "" : "s"} restaurado${repoNames.length === 1 ? "" : "s"}`,
    detalle: { action: "undo_archive", repo_full_names: repoNames, restored_projects: [...affectedProjects] },
  });

  return { ok: true, message: "Archivo deshecho." };
}

async function repoMapFor(repoNames: string[]): Promise<Map<string, GithubRepoSummary>> {
  const repos = await listGithubRepos();
  const map = new Map(repos.map((repo) => [repo.full_name.toLowerCase(), repo]));
  const missing = repoNames.filter((repo) => !map.has(repo.toLowerCase()));
  if (missing.length) throw new ApiError(`Repo fuera del inventario GitHub: ${missing.join(", ")}`, 422);
  return map;
}

async function snapshotRepoLinks(repoNames: string[]): Promise<ProjectLinkSnapshot[]> {
  const snapshots: ProjectLinkSnapshot[] = [];
  for (const repoName of repoNames) {
    const rows = await queryAll<ProjectLinkSnapshot>(
      `SELECT project_id, repo_full_name, role, is_primary, default_branch,
              private, language, html_url, pushed_at::text
         FROM project_repositories
        WHERE lower(repo_full_name) = lower($1)`,
      [repoName],
    );
    snapshots.push(...rows);
  }
  return snapshots;
}

async function removeRepoMemberships(repoNames: string[]): Promise<void> {
  const snapshots = await snapshotRepoLinks(repoNames);
  const affected = new Set(snapshots.map((row) => row.project_id));
  for (const repoName of repoNames) {
    await sql`
      DELETE FROM project_repositories
       WHERE lower(repo_full_name) = lower(${repoName})
    `;
  }

  for (const projectId of affected) await repairProjectPrimary(projectId);
}

async function removeOtherMemberships(repoNames: string[], keepProjectId: string): Promise<void> {
  const snapshots = await snapshotRepoLinks(repoNames);
  const affected = new Set(
    snapshots
      .map((row) => row.project_id)
      .filter((projectId) => projectId !== keepProjectId),
  );
  for (const repoName of repoNames) {
    await sql`
      DELETE FROM project_repositories
       WHERE lower(repo_full_name) = lower(${repoName})
         AND project_id <> ${keepProjectId}
    `;
  }
  for (const projectId of affected) await repairProjectPrimary(projectId);
}

async function upsertMembership(
  projectId: string,
  repo: GithubRepoSummary,
  isPrimary: boolean,
): Promise<void> {
  if (isPrimary) {
    await sql`
      UPDATE project_repositories SET is_primary = false, updated_at = now()
      WHERE project_id = ${projectId}
    `;
  }
  await sql`
    INSERT INTO project_repositories (
      project_id, repo_full_name, role, is_primary,
      default_branch, private, language, html_url, pushed_at
    ) VALUES (
      ${projectId}, ${repo.full_name}, 'app', ${isPrimary},
      ${repo.default_branch}, ${repo.private}, ${repo.language},
      ${repo.html_url}, ${repo.pushed_at}
    )
    ON CONFLICT (project_id, repo_full_name) DO UPDATE SET
      role = EXCLUDED.role,
      is_primary = EXCLUDED.is_primary,
      default_branch = EXCLUDED.default_branch,
      private = EXCLUDED.private,
      language = EXCLUDED.language,
      html_url = EXCLUDED.html_url,
      pushed_at = EXCLUDED.pushed_at,
      updated_at = now()
  `;
}

async function setProjectPrimary(projectId: string, repo: GithubRepoSummary): Promise<void> {
  await sql`
    UPDATE projects SET
      github_repo = ${repo.full_name},
      github_url = ${repo.html_url},
      github_private = ${repo.private},
      github_language = ${repo.language},
      github_default_branch = ${repo.default_branch},
      updated_at = now()
    WHERE id = ${projectId}
  `;
}

async function repairProjectPrimary(projectId: string): Promise<void> {
  const replacement = await queryOne<ProjectLinkSnapshot>(
    `SELECT project_id, repo_full_name, role, is_primary, default_branch,
            private, language, html_url, pushed_at::text
       FROM project_repositories
      WHERE project_id = $1
      ORDER BY is_primary DESC, created_at ASC, repo_full_name ASC
      LIMIT 1`,
    [projectId],
  );

  if (!replacement) {
    await sql`
      UPDATE projects SET
        github_repo = NULL,
        github_url = NULL,
        github_private = false,
        github_language = NULL,
        github_default_branch = 'main',
        updated_at = now()
      WHERE id = ${projectId}
    `;
    return;
  }

  await sql`
    UPDATE project_repositories SET is_primary = false, updated_at = now()
    WHERE project_id = ${projectId}
  `;
  await sql`
    UPDATE project_repositories SET is_primary = true, updated_at = now()
    WHERE project_id = ${projectId} AND repo_full_name = ${replacement.repo_full_name}
  `;
  await sql`
    UPDATE projects SET
      github_repo = ${replacement.repo_full_name},
      github_url = ${replacement.html_url},
      github_private = COALESCE(${replacement.private}, false),
      github_language = ${replacement.language},
      github_default_branch = COALESCE(${replacement.default_branch}, 'main'),
      updated_at = now()
    WHERE id = ${projectId}
  `;
}

async function clearArchives(repoNames: string[]): Promise<void> {
  await sql`
    UPDATE project_repository_curation
       SET archived = false, updated_at = now()
     WHERE lower(repo_full_name) = ANY(${repoNames.map((repo) => repo.toLowerCase())}::text[])
  `;
}

async function projectExists(projectId: string): Promise<boolean> {
  return Boolean(await queryOne<{ id: string }>("SELECT id FROM projects WHERE id = $1 LIMIT 1", [projectId]));
}

async function nextProjectId(base: string): Promise<string> {
  const seed = base || "proyecto";
  let candidate = seed.slice(0, 60);
  let suffix = 2;
  while (await projectExists(candidate)) {
    const tail = `-${suffix}`;
    candidate = `${seed.slice(0, 60 - tail.length)}${tail}`;
    suffix += 1;
  }
  return candidate;
}

function cleanRepoNames(value: unknown): string[] {
  const raw = Array.isArray(value) ? value : [];
  const clean = raw
    .map((item) => String(item ?? "").trim())
    .filter(Boolean)
    .map((repo) => {
      if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) {
        throw new ApiError(`Repo invalido: ${repo}`);
      }
      if (!repo.toLowerCase().startsWith(`${GITHUB_OWNER}/`)) {
        throw new ApiError(`Solo se aceptan repos de ${GITHUB_OWNER}.`, 422);
      }
      return repo;
    });
  const unique = [...new Map(clean.map((repo) => [repo.toLowerCase(), repo])).values()];
  if (unique.length === 0) throw new ApiError("Selecciona al menos un repo.");
  if (unique.length > 30) throw new ApiError("Selecciona maximo 30 repos por accion.");
  return unique;
}

function cleanProjectName(value: unknown): string {
  const name = String(value ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
  if (!name) throw new ApiError("Falta nombre del proyecto.");
  return name;
}

function cleanNullableText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.replace(/\s+/g, " ").trim().slice(0, max);
  return text || null;
}

function cleanSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function cleanCategory(value: unknown): string {
  const category = String(value ?? "en_revision");
  return (VALID_PROJECT_CATEGORIES as readonly string[]).includes(category) ? category : "en_revision";
}

function cleanStatus(value: unknown): string {
  const status = String(value ?? "unknown");
  return VALID_STATUSES.has(status) ? status : "unknown";
}

function cleanReason(value: unknown): string {
  const reason = String(value ?? "experimento");
  return VALID_REASONS.has(reason) ? reason : "experimento";
}

function pickPrimary(repoNames: string[], value: unknown): string {
  const requested = typeof value === "string" ? value.trim() : "";
  return repoNames.find((repo) => repo.toLowerCase() === requested.toLowerCase()) ?? repoNames[0];
}

function repoFallback(fullName: string): GithubRepoSummary {
  const [, name = fullName] = fullName.split("/", 2);
  return {
    full_name: fullName,
    name,
    owner: GITHUB_OWNER,
    private: false,
    description: null,
    language: null,
    default_branch: "main",
    pushed_at: null,
    updated_at: null,
    archived: false,
    fork: false,
    html_url: `https://github.com/${fullName}`,
    size_kb: 0,
    topics: [],
  };
}

function parsePreviousLinks(value: unknown): ProjectLinkSnapshot[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is ProjectLinkSnapshot => {
    if (!item || typeof item !== "object") return false;
    const row = item as Partial<ProjectLinkSnapshot>;
    return typeof row.project_id === "string" && typeof row.repo_full_name === "string";
  });
}

function timeOf(value: string | null | undefined): number {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

async function audit(
  userId: string,
  action: string,
  resourceType: string,
  resourceId: string | null,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    await sql`
      INSERT INTO audit_events (user_id, action, resource_type, resource_id, ring, payload)
      VALUES (${userId}, ${action}, ${resourceType}, ${resourceId}, 1, ${JSON.stringify(payload)}::jsonb)
    `;
  } catch (error) {
    console.error("[projects/curar] audit failed:", error);
  }
}

async function publishEvent(
  preferredProjectId: string | null,
  userId: string,
  event: { tipo: string; titulo: string; detalle: Record<string, unknown> },
): Promise<void> {
  const projectId = await resolveEventProject(preferredProjectId);
  if (!projectId) return;

  const db: UnicornDb = {
    query: <T = Record<string, unknown>>(text: string, params?: unknown[]) =>
      queryAll<T>(text, params ?? []),
  };
  const result = await runUnicornTool(
    "unicorn_publicar_evento",
    {
      proyecto: projectId,
      tipo: event.tipo,
      titulo: event.titulo,
      detalle: event.detalle,
      origen: "vforge",
    },
    { userId, scope: "admin", orgId: null },
    { app: db, nervous: null },
  );
  if (result.isError) console.warn("[projects/curar] unicorn event skipped:", result.content[0]?.text);
}

async function resolveEventProject(preferredProjectId: string | null): Promise<string | null> {
  if (preferredProjectId && (await projectExists(preferredProjectId))) return preferredProjectId;
  const row = await queryOne<{ id: string }>(
    `SELECT id
       FROM projects
      WHERE lower(id) = 'vforge'
         OR lower(name) = 'vforge'
         OR lower(COALESCE(github_repo, '')) = 'turbillon50/vforge'
      ORDER BY CASE WHEN lower(id) = 'vforge' THEN 0 ELSE 1 END
      LIMIT 1`,
  );
  return row?.id ?? null;
}

function json(value: unknown, status = 200): Response {
  return Response.json(value, { status, headers: NO_STORE });
}

function jsonError(message: string, status: number): Response {
  return json({ error: message }, status);
}
