import "server-only";

import { queryAll, queryOne } from "@/lib/db/client";
import {
  fetchVForgeApi,
  getCurrentVForgeIdentity,
  projectApiPath,
  type VForgeIdentity,
} from "@/lib/api/vforge-owned";
import type { LiveRole } from "@/lib/projects/roles";

export type AgentExecutor = "auto" | "codex" | "claude" | "grok" | "team";
export type AgentPhase =
  "planning" | "building" | "reviewing" | "validation" | "complete";
export type AgentRunStatus =
  | "preparing"
  | "queued"
  | "running"
  | "awaiting_preview"
  | "preview_ready"
  | "awaiting_approval"
  | "approved"
  | "published"
  | "failed"
  | "cancelled";

export interface AgentQueueJob {
  id: number;
  agent: "codex" | "claude" | "grok";
  role: "planner" | "builder" | "reviewer";
}

export interface AgentRunRow {
  id: string;
  project_id: string;
  instruction: string;
  requested_executor: AgentExecutor;
  resolved_executor: string;
  phase: AgentPhase;
  status: AgentRunStatus;
  repo_full_name: string;
  base_branch: string;
  work_branch: string;
  queue_jobs: AgentQueueJob[];
  preview_url: string | null;
  pr_number: number | null;
  pr_url: string | null;
  summary: string | null;
  error: string | null;
  created_by_email: string;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  published_at: string | null;
}

export interface AgentRunRepository {
  repo_full_name: string;
  role: string;
  is_primary: boolean;
  default_branch: string | null;
}

export interface AgentRunAccess {
  identity: VForgeIdentity;
  role: LiveRole;
  canWrite: boolean;
  repositories: AgentRunRepository[];
}

export async function ensureProjectAgentRunsTable(): Promise<void> {
  await queryOne(
    `CREATE TABLE IF NOT EXISTS project_agent_runs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      instruction text NOT NULL CHECK (char_length(instruction) BETWEEN 3 AND 12000),
      requested_executor text NOT NULL CHECK (requested_executor IN ('auto','codex','claude','grok','team')),
      resolved_executor text NOT NULL,
      phase text NOT NULL DEFAULT 'building' CHECK (phase IN ('planning','building','reviewing','validation','complete')),
      status text NOT NULL DEFAULT 'preparing' CHECK (status IN ('preparing','queued','running','awaiting_preview','preview_ready','awaiting_approval','approved','published','failed','cancelled')),
      repo_full_name text NOT NULL,
      base_branch text NOT NULL,
      work_branch text NOT NULL,
      queue_jobs jsonb NOT NULL DEFAULT '[]'::jsonb,
      preview_url text,
      pr_number integer,
      pr_url text,
      summary text,
      error text,
      created_by_user_id text NOT NULL,
      created_by_email text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      approved_at timestamptz,
      published_at timestamptz
    )`,
  );
  await queryOne(
    `CREATE UNIQUE INDEX IF NOT EXISTS uq_project_agent_runs_branch ON project_agent_runs (lower(repo_full_name), work_branch)`,
  );
  await queryOne(
    `CREATE INDEX IF NOT EXISTS idx_project_agent_runs_project ON project_agent_runs (project_id, created_at DESC)`,
  );
}

export async function authorizeAgentRunAccess(
  projectId: string,
  signal: AbortSignal,
): Promise<AgentRunAccess | null> {
  const identity = await getCurrentVForgeIdentity();
  if (!identity) return null;
  const upstream = await fetchVForgeApi(
    projectApiPath(projectId, "context"),
    identity,
    { signal },
  );
  if (!upstream.ok) return null;
  const payload = (await upstream.json().catch(() => null)) as {
    repositories?: AgentRunRepository[];
    me?: { role?: LiveRole };
  } | null;
  const role = payload?.me?.role;
  if (role !== "owner" && role !== "reviewer" && role !== "observer")
    return null;
  return {
    identity,
    role,
    canWrite: role === "owner",
    repositories: Array.isArray(payload?.repositories)
      ? payload.repositories
      : [],
  };
}

export function selectAgentRepository(
  access: AgentRunAccess,
  requested: unknown,
): AgentRunRepository | null {
  if (!access.repositories.length) return null;
  if (typeof requested !== "string" || !requested.trim()) {
    return (
      access.repositories.find((repo) => repo.is_primary) ??
      access.repositories[0]
    );
  }
  const normalized = requested.trim().toLowerCase();
  return (
    access.repositories.find(
      (repo) => repo.repo_full_name.toLowerCase() === normalized,
    ) ?? null
  );
}

export function resolveExecutor(
  requested: AgentExecutor,
  instruction: string,
): Exclude<AgentExecutor, "auto" | "team"> {
  if (requested !== "auto" && requested !== "team") return requested;
  const normalized = instruction.toLowerCase();
  if (/investiga|audita|diagn[oó]stic|compara|revisa mercado/.test(normalized))
    return "grok";
  if (/arquitectura|planea|estrategia|diseño de sistema/.test(normalized))
    return "claude";
  return "codex";
}

export function buildAgentPrompt(args: {
  runId: string;
  projectId: string;
  repo: string;
  baseBranch: string;
  workBranch: string;
  instruction: string;
  role: "planner" | "builder" | "reviewer";
  priorResult?: string | null;
}): string {
  const roleRules =
    args.role === "planner"
      ? "Analiza y entrega un plan verificable. NO escribas código ni cambies ramas."
      : args.role === "reviewer"
        ? "Revisa la rama de trabajo, pruebas y riesgos. NO escribas ni hagas merge. Emite APROBADO, REVISION o RECHAZADO con evidencia."
        : "Eres el único escritor. Implementa, prueba y haz push exclusivamente a la rama de trabajo indicada.";
  return `VFORGE RUN ${args.runId}
PROYECTO ${args.projectId}
REPOSITORIO ${args.repo}
RAMA BASE ${args.baseBranch}
RAMA DE TRABAJO ${args.workBranch}
ROL ${args.role.toUpperCase()}

REGLAS OBLIGATORIAS
- ${roleRules}
- Esto es un SANDBOX. Trabaja sólo en ${args.workBranch}. Nunca escribas, hagas push ni merge directo a ${args.baseBranch}.
- No abras un pull request. El owner lo crea al aprobar.
- No despliegues producción.
- No leas ni expongas secretos ajenos al proyecto.
- Reporta archivos tocados, comandos de validación, resultado y bloqueos reales.

TAREA
${args.instruction.trim()}
${args.priorResult ? `\nCONTEXTO DE LA ETAPA ANTERIOR\n${args.priorResult.slice(0, 8000)}` : ""}`;
}

export async function listProjectAgentRuns(
  projectId: string,
): Promise<AgentRunRow[]> {
  await ensureProjectAgentRunsTable();
  return queryAll<AgentRunRow>(
    `SELECT id, project_id, instruction, requested_executor, resolved_executor, phase, status,
            repo_full_name, base_branch, work_branch, queue_jobs, preview_url, pr_number, pr_url,
            summary, error, created_by_email, created_at, updated_at, approved_at, published_at
       FROM project_agent_runs WHERE project_id = $1
       ORDER BY created_at DESC LIMIT 30`,
    [projectId],
  );
}
