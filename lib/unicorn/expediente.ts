import "server-only";

import { queryAll, queryOne } from "@/lib/db/client";
import { leerEventos, type UnicornDb, type UnicornEvento } from "@/lib/mcp/unicorn";
import {
  ensureProjectCarteraSchema,
  ensureProjectRepositoriesSchema,
} from "@/lib/projects/repository-schema";
import type { ProjectRepositoryRole } from "@/lib/projects/repository-groups";
import {
  normalizePublishedUrl,
  resolveProjectViewportUrls,
} from "@/lib/projects/viewport-url";

const VFORGE_REPO = "turbillon50/vforge";
const GITHUB_API = "https://api.github.com";

export type DatoEstado = "real" | "sin_dato" | "por_conectar";

export interface ValorExpediente {
  value: string | null;
  state: DatoEstado;
}

export interface ProyectoExpedienteRow {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  status: string | null;
  github_repo: string | null;
  github_url: string | null;
  github_default_branch: string | null;
  github_private: boolean | null;
  github_language: string | null;
  vercel_url: string | null;
  domain: string | null;
  desktop_url: string | null;
  mobile_url: string | null;
  admin_url: string | null;
  client_name: string | null;
  progress_pct: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface RepositorioExpediente {
  fullName: string;
  role: ProjectRepositoryRole | string;
  isPrimary: boolean;
  defaultBranch: ValorExpediente;
  latestCommit: {
    message: string | null;
    date: string | null;
    url: string | null;
    state: DatoEstado;
  };
  language: ValorExpediente;
  private: ValorExpediente;
  url: string | null;
  githubState: DatoEstado;
}

export interface InfraExpediente {
  urls: Array<{
    label: string;
    value: string | null;
    href: string | null;
    state: DatoEstado;
  }>;
  database: ValorExpediente;
}

export interface CoverExpediente {
  src: string | null;
  url: string | null;
  label: string;
  state: DatoEstado;
}

export interface ConexionExpediente {
  name: string;
  detail: string;
  state: DatoEstado;
}

export interface ExpedienteProyecto {
  project: ProyectoExpedienteRow;
  cover: CoverExpediente;
  repositories: RepositorioExpediente[];
  infra: InfraExpediente;
  now: Array<{ label: string; value: string | null; state: DatoEstado }>;
  conversations: ConexionExpediente[];
  mcpConnections: ConexionExpediente[];
  timeline: UnicornEvento[];
  eventSourcesUnavailable: Array<{ fuente: string; motivo: string }>;
}

interface ProjectRepositoryRow {
  repo_full_name: string;
  role: ProjectRepositoryRole | string;
  is_primary: boolean;
}

interface GithubRepoResponse {
  default_branch?: string | null;
  language?: string | null;
  private?: boolean;
  html_url?: string | null;
}

interface GithubCommitResponse {
  html_url?: string | null;
  commit?: {
    message?: string | null;
    author?: { date?: string | null } | null;
    committer?: { date?: string | null } | null;
  } | null;
}

interface CoverRow {
  mime_type: "image/png" | "image/jpeg";
  data_b64: string;
  url: string | null;
  viewport: string | null;
  created_at: string;
}

function valor(value: string | null | undefined, state: DatoEstado = "real"): ValorExpediente {
  const clean = typeof value === "string" ? value.trim() : value;
  return clean ? { value: clean, state } : { value: null, state: state === "por_conectar" ? state : "sin_dato" };
}

function boolValor(value: boolean | null | undefined, githubState: DatoEstado): ValorExpediente {
  if (githubState !== "real" || typeof value !== "boolean") return { value: null, state: "sin_dato" };
  return { value: value ? "Privado" : "Público", state: "real" };
}

function publicHref(value: string | null | undefined): string | null {
  return normalizePublishedUrl(value ?? null);
}

function dbForUnicorn(): UnicornDb {
  return {
    query: <T = Record<string, unknown>>(text: string, params?: unknown[]) =>
      queryAll<T>(text, params ?? []),
  };
}

function parseRepoFullName(fullName: string): { owner: string; repo: string } | null {
  const [owner, repo, extra] = fullName.split("/");
  if (!owner || !repo || extra) return null;
  if (!/^[A-Za-z0-9_.-]+$/.test(owner) || !/^[A-Za-z0-9_.-]+$/.test(repo)) return null;
  return { owner, repo };
}

function githubHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const token = process.env.GITHUB_TOKEN?.trim();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function fetchGithubJson<T>(url: URL): Promise<T | null> {
  try {
    const response = await fetch(url, {
      headers: githubHeaders(),
      next: { revalidate: 300 },
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function cleanCommitMessage(message: string | null | undefined): string | null {
  const line = message?.split("\n")[0]?.trim();
  if (!line) return null;
  return line.length > 92 ? `${line.slice(0, 89)}...` : line;
}

async function loadGithubRepo(repoFullName: string): Promise<{
  repo: GithubRepoResponse | null;
  commit: GithubCommitResponse | null;
}> {
  const parsed = parseRepoFullName(repoFullName);
  if (!parsed) return { repo: null, commit: null };

  const repoUrl = new URL(
    `${GITHUB_API}/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.repo)}`,
  );
  const repo = await fetchGithubJson<GithubRepoResponse>(repoUrl);
  if (!repo) return { repo: null, commit: null };

  const commitsUrl = new URL(
    `${GITHUB_API}/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.repo)}/commits`,
  );
  commitsUrl.searchParams.set("per_page", "1");
  if (repo.default_branch) commitsUrl.searchParams.set("sha", repo.default_branch);
  const commits = await fetchGithubJson<GithubCommitResponse[]>(commitsUrl);
  return { repo, commit: commits?.[0] ?? null };
}

async function loadRepositories(project: ProyectoExpedienteRow): Promise<RepositorioExpediente[]> {
  let rows: ProjectRepositoryRow[] = [];
  try {
    await ensureProjectRepositoriesSchema();
    rows = await queryAll<ProjectRepositoryRow>(
      `SELECT repo_full_name, role, is_primary
         FROM project_repositories
        WHERE project_id = $1
        ORDER BY is_primary DESC, role, repo_full_name`,
      [project.id],
    );
  } catch {
    rows = [];
  }

  if (rows.length === 0 && project.github_repo) {
    rows = [{ repo_full_name: project.github_repo, role: "app", is_primary: true }];
  }

  return Promise.all(
    rows.map(async (row) => {
      const github = await loadGithubRepo(row.repo_full_name);
      const githubState: DatoEstado = github.repo ? "real" : "sin_dato";
      const commitDate =
        github.commit?.commit?.author?.date ?? github.commit?.commit?.committer?.date ?? null;
      return {
        fullName: row.repo_full_name,
        role: row.role,
        isPrimary: row.is_primary,
        defaultBranch: valor(github.repo?.default_branch ?? null, githubState),
        latestCommit: {
          message: githubState === "real" ? cleanCommitMessage(github.commit?.commit?.message) : null,
          date: githubState === "real" ? commitDate : null,
          url: githubState === "real" ? github.commit?.html_url ?? null : null,
          state: github.commit ? "real" : "sin_dato",
        },
        language: valor(github.repo?.language ?? null, githubState),
        private: boolValor(github.repo?.private, githubState),
        url: githubState === "real" ? github.repo?.html_url ?? null : null,
        githubState,
      };
    }),
  );
}

async function loadProjectCover(project: ProyectoExpedienteRow): Promise<CoverExpediente> {
  const viewports = resolveProjectViewportUrls(project);
  const publicUrl =
    viewports.desktop_url ??
    viewports.mobile_url ??
    publicHref(project.domain) ??
    publicHref(project.vercel_url);

  try {
    const rows = await queryAll<CoverRow>(
      `SELECT mime_type, data_b64, url, viewport, created_at::text
         FROM project_eyes
        WHERE project_id = $1
          AND source = 'visor'
          AND data_b64 IS NOT NULL
        ORDER BY
          CASE viewport WHEN 'desktop' THEN 0 WHEN 'mobile' THEN 1 WHEN 'admin' THEN 2 ELSE 3 END,
          created_at DESC
        LIMIT 1`,
      [project.id],
    );
    const shot = rows[0];
    if (shot?.data_b64) {
      return {
        src: `data:${shot.mime_type};base64,${shot.data_b64}`,
        url: shot.url ?? publicUrl,
        label: shot.viewport ? `captura real · ${shot.viewport}` : "captura real",
        state: "real",
      };
    }
  } catch {
    /* project_eyes puede no existir; se muestra estado explícito abajo. */
  }

  return {
    src: null,
    url: publicUrl,
    label: publicUrl ? "sin captura guardada" : "sin URL pública",
    state: "sin_dato",
  };
}

function infraFromProject(project: ProyectoExpedienteRow): InfraExpediente {
  const viewports = resolveProjectViewportUrls(project);
  const rows = [
    { label: "Dominio", value: project.domain, href: publicHref(project.domain) },
    { label: "Vercel", value: project.vercel_url, href: publicHref(project.vercel_url) },
    { label: "Escritorio", value: project.desktop_url ?? viewports.desktop_url, href: viewports.desktop_url },
    { label: "Móvil", value: project.mobile_url ?? viewports.mobile_url, href: viewports.mobile_url },
    { label: "Admin", value: project.admin_url ?? viewports.admin_url, href: viewports.admin_url },
  ];

  return {
    urls: rows.map((row) => ({
      ...row,
      value: row.value?.trim() || null,
      state: row.value?.trim() || row.href ? "real" : "sin_dato",
    })),
    database: { value: null, state: "sin_dato" },
  };
}

async function loadTimeline(projectId: string): Promise<{
  events: UnicornEvento[];
  unavailable: Array<{ fuente: string; motivo: string }>;
}> {
  try {
    const result = await leerEventos(
      { app: dbForUnicorn(), nervous: null },
      { proyecto: projectId, limit: 8 },
    );
    return {
      events: result.eventos,
      unavailable: result.fuentes_no_disponibles,
    };
  } catch {
    return {
      events: [],
      unavailable: [{ fuente: "unicorn", motivo: "sin dato" }],
    };
  }
}

export async function loadProjectExpediente(
  project: ProyectoExpedienteRow,
): Promise<ExpedienteProyecto> {
  const [cover, repositories, timeline] = await Promise.all([
    loadProjectCover(project),
    loadRepositories(project),
    loadTimeline(project.id),
  ]);

  return {
    project,
    cover,
    repositories,
    infra: infraFromProject(project),
    now: [
      { label: "Estado", value: project.status, state: project.status ? "real" : "sin_dato" },
      {
        label: "Avance",
        value: typeof project.progress_pct === "number" ? `${project.progress_pct}%` : null,
        state: typeof project.progress_pct === "number" ? "real" : "sin_dato",
      },
      { label: "Último cambio", value: project.updated_at, state: project.updated_at ? "real" : "sin_dato" },
      { label: "Cliente", value: project.client_name, state: project.client_name ? "real" : "sin_dato" },
    ],
    conversations: [
      {
        name: "TRAMA",
        detail: "Conversaciones ligadas al expediente",
        state: "por_conectar",
      },
    ],
    mcpConnections: [
      { name: "MindContext", detail: "Contexto y estándares del proyecto", state: "por_conectar" },
      { name: "Momentum", detail: "Proyectos, clientes y mercado", state: "por_conectar" },
      { name: "Eternime", detail: "Memorias ligadas a este proyecto", state: "por_conectar" },
    ],
    timeline: timeline.events,
    eventSourcesUnavailable: timeline.unavailable,
  };
}

export async function loadProjectExpedienteById(
  projectId: string,
): Promise<ExpedienteProyecto | null> {
  const project = await queryOne<ProyectoExpedienteRow>(
    `SELECT id, name, description, category, status,
            github_repo, github_url, github_default_branch, github_private, github_language,
            vercel_url, domain, desktop_url, mobile_url, admin_url,
            client_name, progress_pct,
            created_at::text, updated_at::text
       FROM projects
      WHERE id = $1
      LIMIT 1`,
    [projectId],
  );
  return project ? loadProjectExpediente(project) : null;
}

export async function loadVForgeExpediente(): Promise<ExpedienteProyecto | null> {
  const project = await queryOne<ProyectoExpedienteRow>(
    `SELECT id, name, description, category, status,
            github_repo, github_url, github_default_branch, github_private, github_language,
            vercel_url, domain, desktop_url, mobile_url, admin_url,
            client_name, progress_pct,
            created_at::text, updated_at::text
       FROM projects
      WHERE lower(COALESCE(github_repo, '')) = lower($1)
         OR lower(name) = 'vforge'
         OR lower(id) = 'vforge'
      ORDER BY CASE WHEN lower(COALESCE(github_repo, '')) = lower($1) THEN 0 ELSE 1 END,
               updated_at DESC NULLS LAST
      LIMIT 1`,
    [VFORGE_REPO],
  );
  return project ? loadProjectExpediente(project) : null;
}

export async function loadGroupedProjectExpedientes(): Promise<ExpedienteProyecto[]> {
  await ensureProjectRepositoriesSchema();
  await ensureProjectCarteraSchema();
  const projects = await queryAll<ProyectoExpedienteRow>(
    `SELECT p.id, p.name, p.description, p.category, p.status,
            p.github_repo, p.github_url, p.github_default_branch, p.github_private, p.github_language,
            p.vercel_url, p.domain, p.desktop_url, p.mobile_url, p.admin_url,
            p.client_name, p.progress_pct,
            p.created_at::text, p.updated_at::text
       FROM projects p
       JOIN project_repositories pr ON pr.project_id = p.id
      WHERE COALESCE(p.es_demo, false) = false
      GROUP BY p.id
      ORDER BY count(pr.repo_full_name) DESC,
               max(pr.pushed_at) DESC NULLS LAST,
               p.updated_at DESC NULLS LAST,
               p.name ASC
      LIMIT 12`,
  );
  return Promise.all(projects.map((project) => loadProjectExpediente(project)));
}
