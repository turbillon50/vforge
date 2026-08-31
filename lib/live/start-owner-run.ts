import { randomUUID } from "node:crypto";
import { queryOne } from "@/lib/db/client";
import { dispatchJob } from "@/lib/vulcano/operator";
import { parseRepoFullName, withUserGithub } from "@/lib/live/github-user";
import {
  buildAgentPrompt,
  ensureProjectAgentRunsTable,
  resolveExecutor,
  type AgentRunAccess,
  type AgentRunRepository,
} from "@/lib/live/agent-runs";
import type { WorkOrderExecutor } from "@/lib/live/work-order";

/**
 * Manda trabajo real a la fábrica desde el chat de V.
 *
 * `executor` es a quién lo pidió el owner (Claude Code, Codex, Grok). Si no
 * nombró a nadie, decide la política del repo (`resolveExecutor`), la misma
 * que usa la pestaña de runs — el chat no inventa reglas propias.
 */
export async function startOwnerRun(args: {
  projectId: string;
  access: AgentRunAccess;
  repository: AgentRunRepository;
  instruction: string;
  executor?: WorkOrderExecutor | null;
}): Promise<{ runId: string; agent: WorkOrderExecutor } | { error: string }> {
  const instruction = args.instruction.trim().slice(0, 12000);
  if (instruction.length < 3) return { error: "instrucción vacía" };
  const parsed = parseRepoFullName(args.repository.repo_full_name);
  if (!parsed) return { error: "repo inválido" };

  const agent: WorkOrderExecutor =
    args.executor ?? resolveExecutor("auto", instruction);

  await ensureProjectAgentRunsTable();
  const runId = randomUUID();
  const baseBranch = args.repository.default_branch || "main";
  const workBranch = `vforge/run-${runId.slice(0, 8)}`;

  await queryOne(
    `INSERT INTO project_agent_runs
      (id, project_id, instruction, requested_executor, resolved_executor, phase, status,
       repo_full_name, base_branch, work_branch, created_by_user_id, created_by_email)
     VALUES ($1,$2,$3,$4,$4,'building','preparing',$5,$6,$7,$8,$9)`,
    [
      runId,
      args.projectId,
      instruction,
      agent,
      args.repository.repo_full_name,
      baseBranch,
      workBranch,
      args.access.identity.userId,
      args.access.identity.email,
    ],
  );

  try {
    const [owner, repo] = parsed;
    const branch = await withUserGithub(
      args.access.identity.userId,
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
    const prompt = buildAgentPrompt({
      runId,
      projectId: args.projectId,
      repo: args.repository.repo_full_name,
      baseBranch,
      workBranch,
      instruction,
      role: "builder",
    });
    const dispatched = await dispatchJob({
      agent,
      prompt,
      priority: 3,
      source: `vforge:${args.projectId}:${runId}:${args.access.identity.userId}`,
    });
    await queryOne(
      `UPDATE project_agent_runs SET queue_jobs = $1::jsonb, status = 'queued', updated_at = now()
        WHERE id = $2`,
      [JSON.stringify([{ id: dispatched.id, agent, role: "builder" }]), runId],
    );
    return { runId, agent };
  } catch (caught) {
    const message =
      caught instanceof Error ? caught.message.slice(0, 500) : "No se pudo iniciar el run";
    await queryOne(
      `UPDATE project_agent_runs SET status = 'failed', error = $1, updated_at = now() WHERE id = $2`,
      [message, runId],
    ).catch(() => null);
    return { error: message };
  }
}
