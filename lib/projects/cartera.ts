import "server-only";

import { queryAll, queryOne } from "@/lib/db/client";
import { ensureProjectEyesTable } from "@/lib/live/project-eyes";
import {
  PROJECT_REPOSITORY_ROLE_LABEL,
  type ProjectRepository,
  type ProjectRepositoryRole,
} from "@/lib/projects/repository-groups";
import {
  ensureProjectCarteraSchema,
  ensureProjectRepositoriesSchema,
} from "@/lib/projects/repository-schema";
import { normalizePublishedUrl } from "@/lib/projects/viewport-url";

export type CcnHealthLevel = "ok" | "warn" | "bad" | "unknown";

export interface HealthSignal {
  label: string;
  level: CcnHealthLevel;
  text: string;
}

export interface ProjectHealthSummary {
  level: CcnHealthLevel;
  label: string;
  signals: HealthSignal[];
}

export interface CarteraProject {
  id: string;
  name: string;
  description: string | null;
  category: string;
  status: string;
  domain: string | null;
  vercel_url: string | null;
  cartera_tipo: string[];
  cartera_estado: string | null;
  cartera_prioridad: number | null;
  cartera_nota: string | null;
  created_at: string | null;
  updated_at: string | null;
  last_push: string | null;
  repositories: ProjectRepository[];
  repository_groups: Array<{ label: string; repos: ProjectRepository[] }>;
  health: ProjectHealthSummary;
}

export interface DemoProject {
  id: string;
  name: string;
  description: string | null;
  rubro: string | null;
  modules: string[];
  last_push: string | null;
  domain: string | null;
  vercel_url: string | null;
  demo_destacado: boolean;
  cartera_estado: string | null;
  cartera_nota: string | null;
  repositories: ProjectRepository[];
  primary_repo: string | null;
  public_url: string | null;
  cover_src: string | null;
  cover_label: string;
}

interface ProjectRow {
  id: string;
  name: string;
  description: string | null;
  category: string;
  status: string;
  domain: string | null;
  vercel_url: string | null;
  cartera_tipo: string[] | null;
  cartera_estado: string | null;
  cartera_prioridad: number | null;
  cartera_nota: string | null;
  created_at: string | null;
  updated_at: string | null;
  last_push: string | null;
  repositories: ProjectRepository[] | null;
}

interface DemoRow extends ProjectRow {
  demo_destacado: boolean;
}

interface DeployRow {
  state: string | null;
  url: string | null;
  created_at: string | null;
}

interface EventStatsRow {
  total: number;
  medium_or_more: number;
  high_or_more: number;
  latest_type: string | null;
  latest_severity: string | null;
  latest_ts: string | null;
}

interface CoverRow {
  mime_type: "image/png" | "image/jpeg";
  data_b64: string;
  url: string | null;
  viewport: string | null;
  created_at: string;
}

export async function loadCarteraProjects(): Promise<CarteraProject[]> {
  await ensureProjectRepositoriesSchema();
  await ensureProjectCarteraSchema();

  const rows = await queryAll<ProjectRow>(
    `SELECT p.id, p.name, p.description, p.category, p.status,
            p.domain, p.vercel_url,
            p.cartera_tipo, p.cartera_estado, p.cartera_prioridad, p.cartera_nota,
            p.created_at::text, p.updated_at::text,
            (SELECT max(pr.pushed_at)::text FROM project_repositories pr WHERE pr.project_id = p.id) AS last_push,
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
                  'pushed_at', pr.pushed_at::text
                ) ORDER BY pr.is_primary DESC, pr.role, pr.repo_full_name
              )
              FROM project_repositories pr
              WHERE pr.project_id = p.id
            ), '[]'::jsonb) AS repositories
       FROM projects p
      WHERE COALESCE(p.es_demo, false) = false
        AND cardinality(COALESCE(p.cartera_tipo, '{}'::text[])) > 0
      ORDER BY COALESCE(p.cartera_prioridad, 99), p.name ASC`,
  );

  return Promise.all(
    rows.map(async (row) => {
      const repositories = normalizeRepositories(row.repositories);
      return {
        ...row,
        cartera_tipo: row.cartera_tipo ?? [],
        repositories,
        repository_groups: groupRepositories(repositories),
        health: await calculateProjectHealth(row),
      };
    }),
  );
}

export async function loadDemoProjects(): Promise<DemoProject[]> {
  await ensureProjectRepositoriesSchema();
  await ensureProjectCarteraSchema();

  const rows = await queryAll<DemoRow>(
    `SELECT p.id, p.name, p.description, p.category, p.status,
            p.domain, p.vercel_url,
            p.cartera_tipo, p.cartera_estado, p.cartera_prioridad, p.cartera_nota,
            COALESCE(p.demo_destacado, false) AS demo_destacado,
            p.created_at::text, p.updated_at::text,
            (SELECT max(pr.pushed_at)::text FROM project_repositories pr WHERE pr.project_id = p.id) AS last_push,
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
                  'pushed_at', pr.pushed_at::text
                ) ORDER BY pr.is_primary DESC, pr.role, pr.repo_full_name
              )
              FROM project_repositories pr
              WHERE pr.project_id = p.id
            ), '[]'::jsonb) AS repositories
       FROM projects p
      WHERE COALESCE(p.es_demo, false) = true
      ORDER BY COALESCE(p.demo_destacado, false) DESC,
               (SELECT max(pr.pushed_at) FROM project_repositories pr WHERE pr.project_id = p.id) DESC NULLS LAST,
               p.name ASC`,
  );

  return Promise.all(
    rows.map(async (row) => {
      const repositories = normalizeRepositories(row.repositories);
      const primary = repositories.find((repo) => repo.is_primary) ?? repositories[0] ?? null;
      const publicUrl = normalizePublishedUrl(row.domain) ?? normalizePublishedUrl(row.vercel_url);
      const cover = await loadCover(row.id, publicUrl);
      return {
        id: row.id,
        name: row.name,
        description: row.description,
        rubro: rubroFromText(row.description, row.cartera_nota),
        modules: modulesFromText(row.description, row.cartera_nota),
        last_push: row.last_push,
        domain: row.domain,
        vercel_url: row.vercel_url,
        demo_destacado: row.demo_destacado,
        cartera_estado: row.cartera_estado,
        cartera_nota: row.cartera_nota,
        repositories,
        primary_repo: primary?.repo_full_name ?? null,
        public_url: publicUrl,
        cover_src: cover.src,
        cover_label: cover.label,
      };
    }),
  );
}

async function calculateProjectHealth(project: Pick<ProjectRow, "id" | "domain" | "vercel_url">) {
  const [urlSignal, deploySignal, eventSignal] = await Promise.all([
    checkPublishedUrl(project.domain, project.vercel_url),
    loadDeploySignal(project.id),
    loadEventSignal(project.id),
  ]);
  const signals = [urlSignal, deploySignal, eventSignal];
  const hasRealData = signals.some((signal) => signal.level !== "unknown");
  const hasBad = signals.some((signal) => signal.level === "bad");
  const hasWarn = signals.some((signal) => signal.level === "warn");
  const hasOk = signals.some((signal) => signal.level === "ok");

  if (hasBad) return { level: "bad" as const, label: "requiere atencion", signals };
  if (hasWarn) return { level: "warn" as const, label: "observacion", signals };
  if (hasRealData && hasOk) return { level: "ok" as const, label: "estable con dato real", signals };
  return { level: "unknown" as const, label: "sin dato", signals };
}

async function checkPublishedUrl(domain: string | null, vercelUrl: string | null): Promise<HealthSignal> {
  const url = normalizePublishedUrl(domain) ?? normalizePublishedUrl(vercelUrl);
  if (!url) return { label: "URL publica", level: "unknown", text: "sin dato" };

  const started = Date.now();
  try {
    let response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (response.status === 405 || response.status === 403) {
      response = await fetch(url, {
        method: "GET",
        redirect: "follow",
        cache: "no-store",
        signal: AbortSignal.timeout(Math.max(250, 3000 - (Date.now() - started))),
      });
    }
    const ms = Date.now() - started;
    if (response.status === 200 && ms < 3000) {
      return { label: "URL publica", level: "ok", text: `200 en ${ms} ms` };
    }
    return { label: "URL publica", level: "bad", text: `HTTP ${response.status} en ${ms} ms` };
  } catch {
    return { label: "URL publica", level: "bad", text: "no respondio en 3 s" };
  }
}

async function loadDeploySignal(projectId: string): Promise<HealthSignal> {
  const deploy = await queryOne<DeployRow>(
    `SELECT state, url, created_at::text
       FROM project_deploys
      WHERE project_id = $1 AND provider = 'vercel'
      ORDER BY created_at DESC
      LIMIT 1`,
    [projectId],
  ).catch(() => null);
  if (!deploy) return { label: "Deploy Vercel", level: "unknown", text: "sin dato" };
  const state = (deploy.state ?? "unknown").toLowerCase();
  if (state === "ready" || state === "succeeded") {
    return { label: "Deploy Vercel", level: "ok", text: "ultimo deploy listo" };
  }
  if (state === "building" || state === "queued") {
    return { label: "Deploy Vercel", level: "warn", text: `ultimo deploy ${state}` };
  }
  if (state === "error" || state === "canceled" || state === "failed") {
    return { label: "Deploy Vercel", level: "bad", text: `ultimo deploy ${state}` };
  }
  return { label: "Deploy Vercel", level: "unknown", text: "sin dato" };
}

async function loadEventSignal(projectId: string): Promise<HealthSignal> {
  const stats = await queryOne<EventStatsRow>(
    `SELECT count(*)::int AS total,
            count(*) FILTER (WHERE severity IN ('medium','high','critical'))::int AS medium_or_more,
            count(*) FILTER (WHERE severity IN ('high','critical'))::int AS high_or_more,
            (array_agg(event_type ORDER BY ts DESC))[1] AS latest_type,
            (array_agg(severity ORDER BY ts DESC))[1] AS latest_severity,
            (array_agg(ts::text ORDER BY ts DESC))[1] AS latest_ts
       FROM project_events
      WHERE project_id = $1
        AND ts > now() - interval '30 days'`,
    [projectId],
  ).catch(() => null);
  if (!stats || stats.total === 0) {
    return { label: "Eventos de salud", level: "unknown", text: "sin dato" };
  }
  if (stats.high_or_more > 0) {
    return {
      label: "Eventos de salud",
      level: "bad",
      text: `${stats.high_or_more} alto/critico en 30 dias`,
    };
  }
  if (stats.medium_or_more > 0) {
    return {
      label: "Eventos de salud",
      level: "warn",
      text: `${stats.medium_or_more} medio en 30 dias`,
    };
  }
  return { label: "Eventos de salud", level: "ok", text: "sin alertas altas en 30 dias" };
}

async function loadCover(projectId: string, publicUrl: string | null) {
  try {
    await ensureProjectEyesTable();
    const shot = await queryOne<CoverRow>(
      `SELECT mime_type, data_b64, url, viewport, created_at::text
         FROM project_eyes
        WHERE project_id = $1
          AND source = 'visor'
          AND data_b64 IS NOT NULL
        ORDER BY
          CASE viewport WHEN 'desktop' THEN 0 WHEN 'mobile' THEN 1 WHEN 'admin' THEN 2 ELSE 3 END,
          created_at DESC
        LIMIT 1`,
      [projectId],
    );
    if (shot?.data_b64) {
      return {
        src: `data:${shot.mime_type};base64,${shot.data_b64}`,
        label: shot.viewport ? `captura real - ${shot.viewport}` : "captura real",
      };
    }
  } catch {
    // Sin tabla o sin captura: el caller muestra fallback honesto.
  }
  return {
    src: null,
    label: publicUrl ? "sin captura guardada" : "sin captura ni URL",
  };
}

function normalizeRepositories(value: ProjectRepository[] | null): ProjectRepository[] {
  return Array.isArray(value) ? value : [];
}

function groupRepositories(repositories: ProjectRepository[]) {
  const map = new Map<string, ProjectRepository[]>();
  for (const repo of repositories) {
    const key = repo.role || "app";
    map.set(key, [...(map.get(key) ?? []), repo]);
  }
  return [...map.entries()].map(([role, repos]) => ({
    label: PROJECT_REPOSITORY_ROLE_LABEL[role as ProjectRepositoryRole] ?? role,
    repos,
  }));
}

function modulesFromText(description: string | null, note: string | null): string[] {
  const text = [description, note].filter(Boolean).join(" ");
  const match = text.match(/m[oó]dul(?:o|os|os de)?\s+([^.;]+)/i);
  if (!match?.[1]) return [];
  return match[1]
    .split(/,|\sy\s|\+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 2)
    .slice(0, 6);
}

function rubroFromText(description: string | null, note: string | null): string | null {
  const text = [description, note].filter(Boolean).join(" ");
  const match = text.match(/(?:rubro|sector)\s*:\s*([^.;]+)/i);
  return match?.[1]?.trim().slice(0, 80) || null;
}
