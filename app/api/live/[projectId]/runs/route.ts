import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db/client";
import { dispatchJob } from "@/lib/vulcano/operator";
import { syncProjectRuns } from "@/lib/live/sync-runs";
import {
  authorizeAgentRunAccess,
  buildAgentPrompt,
  ensureProjectAgentRunsTable,
  resolveExecutor,
  selectAgentRepository,
  type AgentExecutor,
  type AgentQueueJob,
  type AgentRunRow,
} from "@/lib/live/agent-runs";
import { parseRepoFullName, withUserGithub } from "@/lib/live/github-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };
const executors = new Set<AgentExecutor>([
  "auto",
  "codex",
  "claude",
  "grok",
  "team",
]);
function json(value: unknown, status = 200) {
  return NextResponse.json(value, { status, headers: noStore });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  try {
    const access = await authorizeAgentRunAccess(projectId, req.signal);
    if (!access) return json({ error: "not_found" }, 404);
    const { runs, jobs } = await syncProjectRuns(projectId);
    return json({
      runs,
      jobs,
      repositories: access.repositories,
      canWrite: access.canWrite,
    });
  } catch (caught) {
    console.error("[live runs] sync failed", caught);
    return json({ error: "service_unavailable" }, 503);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const access = await authorizeAgentRunAccess(projectId, req.signal);
  if (!access) return json({ error: "not_found" }, 404);
  if (!access.canWrite) return json({ error: "forbidden" }, 403);
  const payload = (await req.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  const instruction =
    typeof payload?.instruction === "string"
      ? payload.instruction.trim().slice(0, 12000)
      : "";
  const requested =
    typeof payload?.executor === "string" &&
    executors.has(payload.executor as AgentExecutor)
      ? (payload.executor as AgentExecutor)
      : "auto";
  const repository = selectAgentRepository(access, payload?.repository);
  if (instruction.length < 3 || !repository)
    return json({ error: "invalid_run" }, 400);
  const parsed = parseRepoFullName(repository.repo_full_name);
  if (!parsed) return json({ error: "invalid_repository" }, 400);

  await ensureProjectAgentRunsTable();
  const runId = randomUUID();
  const baseBranch = repository.default_branch || "main";
  const workBranch = `vforge/run-${runId.slice(0, 8)}`;
  const resolved =
    requested === "team" ? "team" : resolveExecutor(requested, instruction);
  const phase = requested === "team" ? "planning" : "building";
  await queryOne(
    `INSERT INTO project_agent_runs
      (id, project_id, instruction, requested_executor, resolved_executor, phase, status,
       repo_full_name, base_branch, work_branch, created_by_user_id, created_by_email)
     VALUES ($1,$2,$3,$4,$5,$6,'preparing',$7,$8,$9,$10,$11)`,
    [
      runId,
      projectId,
      instruction,
      requested,
      resolved,
      phase,
      repository.repo_full_name,
      baseBranch,
      workBranch,
      access.identity.userId,
      access.identity.email,
    ],
  );

  try {
    const [owner, repo] = parsed;
    const branch = await withUserGithub(
      access.identity.userId,
      async (github) => {
        const source = await github.request(
          "GET /repos/{owner}/{repo}/git/ref/{ref}",
          { owner, repo, ref: `heads/${baseBranch}` },
        );
        return github.request("POST /repos/{owner}/{repo}/git/refs", {
          owner,
          repo,
          ref: `refs/heads/${workBranch}`,
          sha: source.data.object.sha,
        });
      },
    );
    if (!branch) throw new Error("Conecta GitHub para crear la rama aislada.");
    const firstAgent: "codex" | "claude" | "grok" =
      requested === "team" ? "claude" : resolveExecutor(requested, instruction);
    const role = requested === "team" ? "planner" : "builder";
    const prompt = buildAgentPrompt({
      runId,
      projectId,
      repo: repository.repo_full_name,
      baseBranch,
      workBranch,
      instruction,
      role,
    });
    const dispatched = await dispatchJob({
      agent: firstAgent,
      prompt,
      priority: 3,
      source: `vforge:${projectId}:${runId}:${access.identity.userId}`,
    });
    const jobs: AgentQueueJob[] = [
      { id: dispatched.id, agent: firstAgent, role },
    ];
    const run = await queryOne<AgentRunRow>(
      `UPDATE project_agent_runs SET queue_jobs = $1::jsonb, status = 'queued', updated_at = now()
        WHERE id = $2 RETURNING *`,
      [JSON.stringify(jobs), runId],
    );
    await queryOne(
      `INSERT INTO project_events (project_id, event_type, details, severity)
       VALUES ($1, 'agent.run.queued', $2::jsonb, 'medium')`,
      [
        projectId,
        JSON.stringify({
          message: `V inició ${requested} en ${workBranch}`,
          run_id: runId,
          repository: repository.repo_full_name,
        }),
      ],
    ).catch(() => null);
    return json({ run }, 201);
  } catch (caught) {
    const message =
      caught instanceof Error
        ? caught.message.slice(0, 500)
        : "No se pudo iniciar el run";
    await queryOne(
      `UPDATE project_agent_runs SET status = 'failed', error = $1, updated_at = now() WHERE id = $2`,
      [message, runId],
    ).catch(() => null);
    return json(
      { error: message, runId },
      message.includes("Conecta GitHub") ? 409 : 502,
    );
  }
}
