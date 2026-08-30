/**
 * Vercel REST API client.
 *
 * Pulls VERCEL_TOKEN from the operator vault on demand. Caches the
 * resolved team id for 5 min in-process so we don't hit `/v2/teams`
 * on every tool call.
 */
import { requireOperatorSecret } from "@/lib/vault/get-secret";

const VERCEL_API = "https://api.vercel.com";
const TEAM_CACHE_TTL_MS = 5 * 60 * 1000;

let teamCache: { id: string; slug: string; expiresAt: number } | null = null;

async function getCreds(
  options: { auditUserId?: string } = {},
): Promise<{ token: string }> {
  const token = await requireOperatorSecret("VERCEL_TOKEN", options);
  return { token };
}

async function vercelFetch(
  path: string,
  init: RequestInit & { token: string; teamId?: string },
): Promise<Response> {
  const url = new URL(`${VERCEL_API}${path}`);
  if (init.teamId) url.searchParams.set("teamId", init.teamId);
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${init.token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  return res;
}

async function vercelJson<T>(
  path: string,
  init: RequestInit & { token: string; teamId?: string },
): Promise<T> {
  const res = await vercelFetch(path, init);
  const body = (await res.json()) as T & { error?: { message?: string } };
  if (!res.ok) {
    const message =
      body?.error?.message ?? `vercel ${res.status} on ${path}`;
    throw new Error(message);
  }
  return body;
}

export async function getDefaultTeam(
  options: { auditUserId?: string } = {},
): Promise<{ id: string; slug: string }> {
  if (teamCache && teamCache.expiresAt > Date.now()) {
    return { id: teamCache.id, slug: teamCache.slug };
  }
  const { token } = await getCreds(options);
  const data = await vercelJson<{
    teams: Array<{ id: string; slug: string }>;
  }>("/v2/teams", { method: "GET", token });
  const first = data.teams[0];
  if (!first) throw new Error("No Vercel teams visible to this token");
  teamCache = {
    id: first.id,
    slug: first.slug,
    expiresAt: Date.now() + TEAM_CACHE_TTL_MS,
  };
  return { id: first.id, slug: first.slug };
}

export interface VercelProject {
  id: string;
  name: string;
  framework: string | null;
  rootDirectory: string | null;
  outputDirectory: string | null;
  buildCommand: string | null;
  installCommand: string | null;
  link?: { type: string; repo?: string; org?: string } | null;
  createdAt: number;
  updatedAt?: number;
  targets?: Record<string, { url?: string }>;
}

export async function listProjects(
  options: { auditUserId?: string; max?: number } = {},
): Promise<VercelProject[]> {
  const { token } = await getCreds(options);
  const team = await getDefaultTeam(options);
  const max = options.max ?? 50;
  const data = await vercelJson<{ projects: VercelProject[] }>(
    `/v9/projects?limit=${max}`,
    { method: "GET", token, teamId: team.id },
  );
  return data.projects;
}

export async function getProject(
  idOrSlug: string,
  options: { auditUserId?: string } = {},
): Promise<VercelProject> {
  const { token } = await getCreds(options);
  const team = await getDefaultTeam(options);
  return vercelJson<VercelProject>(
    `/v9/projects/${encodeURIComponent(idOrSlug)}`,
    { method: "GET", token, teamId: team.id },
  );
}

export interface CreateProjectInput {
  name: string;
  framework?: string | null;
  rootDirectory?: string | null;
  buildCommand?: string | null;
  outputDirectory?: string | null;
  installCommand?: string | null;
  gitRepository?: { type: "github" | "gitlab" | "bitbucket"; repo: string };
}

export async function createProject(
  input: CreateProjectInput,
  options: { auditUserId?: string } = {},
): Promise<VercelProject> {
  const { token } = await getCreds(options);
  const team = await getDefaultTeam(options);
  return vercelJson<VercelProject>(`/v11/projects`, {
    method: "POST",
    token,
    teamId: team.id,
    body: JSON.stringify(input),
  });
}

export interface VercelDeployment {
  uid: string;
  url: string;
  state?: string;
  readyState?: string;
  target?: string | null;
  createdAt: number;
  meta?: Record<string, string>;
}

export async function listDeployments(
  projectId: string,
  options: { auditUserId?: string; limit?: number } = {},
): Promise<VercelDeployment[]> {
  const { token } = await getCreds(options);
  const team = await getDefaultTeam(options);
  const limit = options.limit ?? 10;
  const data = await vercelJson<{ deployments: VercelDeployment[] }>(
    `/v6/deployments?projectId=${encodeURIComponent(projectId)}&limit=${limit}`,
    { method: "GET", token, teamId: team.id },
  );
  return data.deployments;
}

export async function getDeployment(
  idOrUrl: string,
  options: { auditUserId?: string } = {},
): Promise<Record<string, unknown>> {
  const { token } = await getCreds(options);
  const team = await getDefaultTeam(options);
  return vercelJson<Record<string, unknown>>(
    `/v13/deployments/${encodeURIComponent(idOrUrl)}`,
    { method: "GET", token, teamId: team.id },
  );
}

export interface TriggerDeployInput {
  projectId: string;
  name: string;
  ghRepoFullName: string;
  branch: string;
  target?: "production" | "preview" | "staging";
}

export async function triggerDeployment(
  input: TriggerDeployInput,
  options: { auditUserId?: string } = {},
): Promise<{ id: string; url: string; readyState?: string }> {
  const { token } = await getCreds(options);
  const team = await getDefaultTeam(options);

  // Need numeric repoId for gitSource
  const ghRes = await fetch(
    `https://api.github.com/repos/${input.ghRepoFullName}`,
  );
  if (!ghRes.ok) {
    throw new Error(
      `cannot read GitHub repo ${input.ghRepoFullName}: ${ghRes.status}`,
    );
  }
  const ghJson = (await ghRes.json()) as { id: number };

  const data = await vercelJson<{ id: string; url: string; readyState?: string }>(
    `/v13/deployments?forceNew=1`,
    {
      method: "POST",
      token,
      teamId: team.id,
      body: JSON.stringify({
        name: input.name,
        project: input.projectId,
        target: input.target ?? "production",
        gitSource: {
          type: "github",
          repoId: ghJson.id,
          ref: input.branch,
        },
      }),
    },
  );
  return data;
}

export type EnvTarget = "production" | "preview" | "development";

export async function setEnvVar(
  projectId: string,
  input: {
    key: string;
    value: string;
    target: EnvTarget[];
    type?: "encrypted" | "plain";
  },
  options: { auditUserId?: string } = {},
): Promise<{ created: boolean; id?: string }> {
  const { token } = await getCreds(options);
  const team = await getDefaultTeam(options);
  const res = await vercelFetch(
    `/v10/projects/${encodeURIComponent(projectId)}/env?upsert=true`,
    {
      method: "POST",
      token,
      teamId: team.id,
      body: JSON.stringify({
        key: input.key,
        value: input.value,
        target: input.target,
        type: input.type ?? "encrypted",
      }),
    },
  );
  const body = (await res.json()) as {
    created?: { id?: string };
    error?: { message?: string };
  };
  if (!res.ok) throw new Error(body?.error?.message ?? `vercel ${res.status}`);
  return { created: true, id: body.created?.id };
}

export async function addDomain(
  projectId: string,
  domain: string,
  options: {
    auditUserId?: string;
    redirect?: string;
    redirectStatusCode?: number;
  } = {},
): Promise<{ name: string; verified: boolean }> {
  const { token } = await getCreds(options);
  const team = await getDefaultTeam(options);
  const body: Record<string, unknown> = { name: domain };
  if (options.redirect) {
    body.redirect = options.redirect;
    body.redirectStatusCode = options.redirectStatusCode ?? 308;
  }
  return vercelJson<{ name: string; verified: boolean }>(
    `/v10/projects/${encodeURIComponent(projectId)}/domains`,
    { method: "POST", token, teamId: team.id, body: JSON.stringify(body) },
  );
}

export async function getDomainConfig(
  domain: string,
  options: { auditUserId?: string } = {},
): Promise<{
  aValues: string[] | null;
  cnames: string[] | null;
  recommendedIPv4: Array<{ rank: number; value: string[] }>;
  recommendedCNAME: string[];
  misconfigured: boolean;
}> {
  const { token } = await getCreds(options);
  const team = await getDefaultTeam(options);
  return vercelJson(`/v6/domains/${encodeURIComponent(domain)}/config`, {
    method: "GET",
    token,
    teamId: team.id,
  });
}

export interface VercelDomain {
  name: string;
  apexName?: string;
  verified?: boolean;
  gitBranch?: string | null;
}

/** Lista los dominios de un proyecto de Vercel. */
export async function listProjectDomains(
  idOrName: string,
  options: { auditUserId?: string } = {},
): Promise<VercelDomain[]> {
  const { token } = await getCreds(options);
  const team = await getDefaultTeam(options);
  const data = await vercelJson<{ domains: VercelDomain[] }>(
    `/v9/projects/${encodeURIComponent(idOrName)}/domains?limit=50`,
    { method: "GET", token, teamId: team.id },
  );
  return data.domains ?? [];
}

/** Elige el dominio CUSTOM de producción (no *.vercel.app), preferentemente
 *  verificado y sin rama git asociada. Devuelve null si no hay custom. */
export function pickCustomDomain(domains: VercelDomain[]): string | null {
  const custom = domains.filter(
    (d) => d.name && !/\.vercel\.app$/i.test(d.name),
  );
  if (custom.length === 0) return null;
  const prod = custom.filter((d) => d.verified !== false && !d.gitBranch);
  const apex = prod.find((d) => d.apexName && d.name === d.apexName);
  return (apex?.name || prod[0]?.name || custom[0]?.name) ?? null;
}

export interface VercelEnvVar {
  id: string;
  key: string;
  type: string;
  target: string[];
  updatedAt?: number;
}

/** Lista variables de entorno: nombres, destino y tipo. Nunca el valor. */
export async function listProjectEnvVars(
  idOrName: string,
  options: { auditUserId?: string } = {},
): Promise<VercelEnvVar[]> {
  const { token } = await getCreds(options);
  const team = await getDefaultTeam(options);
  const data = await vercelJson<{ envs?: Array<Record<string, unknown>> }>(
    `/v9/projects/${encodeURIComponent(idOrName)}/env?limit=100`,
    { method: "GET", token, teamId: team.id },
  );
  return (data.envs ?? [])
    .map((item) => ({
      id: typeof item.id === "string" ? item.id : "",
      key: typeof item.key === "string" ? item.key : "",
      type: typeof item.type === "string" ? item.type : "encrypted",
      target: Array.isArray(item.target)
        ? item.target.filter((value): value is string => typeof value === "string")
        : [],
      updatedAt: typeof item.updatedAt === "number" ? item.updatedAt : undefined,
    }))
    .filter((item) => Boolean(item.key));
}
