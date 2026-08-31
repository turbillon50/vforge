import { randomUUID } from "node:crypto";
import { queryOne } from "@/lib/db/client";
import { dispatchJob } from "@/lib/vulcano/operator";
import { parseRepoFullName, withUserGithub } from "@/lib/live/github-user";
import {
  buildAgentPrompt,
  ensureProjectAgentRunsTable,
  type AgentRunAccess,
  type AgentRunRepository,
} from "@/lib/live/agent-runs";
import type { BuilderExecutor, WorkOrderExecutor } from "@/lib/live/work-order";

/**
 * Manda trabajo real a la fábrica desde el chat de V.
 *
 * Default: Claude Code. En el daemon de Hetzner es el único, junto con Codex,
 * que tiene manos de verdad: clona el repo en la rama del run y edita ahí.
 * `agent = "grok"` corre run_grok_chat, que sólo conversa — por eso los 8 runs
 * de agosto quedaron en "done" con Grok narrando trabajo que nunca hizo.
 * Aquí no se acepta como constructor.
 */
export async function startOwnerRun(args: {
  projectId: string;
  access: AgentRunAccess;
  repository: AgentRunRepository;
  instruction: string;
  executor?: WorkOrderExecutor | null;
}): Promise<{ runId: string; agent: BuilderExecutor } | { error: string }> {
  const instruction = args.instruction.trim().slice(0, 12000);
  if (instruction.length < 3) return { error: "instrucción vacía" };
  const parsed = parseRepoFullName(args.repository.repo_full_name);
  if (!parsed) return { error: "repo inválido" };

  if (args.executor === "grok") {
    return {
      error:
        "Grok en la fábrica sólo conversa, no escribe código. Pídemelo con Claude Code y va con manos",
    };
  }
  const agent: BuilderExecutor = args.executor ?? "claude";

  await ensureProjectAgentRunsTable();

  // Idempotencia: la misma instrucción, en la misma sala, con un run todavía
  // vivo, devuelve ese run en vez de abrir otra rama y pagar otro job. Cubre
  // el reintento manual y la respuesta que se pierde en la red después de
  // que el servidor ya encoló.
  const vivo = await queryOne<{ id: string; resolved_executor: string }>(
    `SELECT id::text, resolved_executor
       FROM project_agent_runs
      WHERE project_id = $1
        AND instruction = $2
        AND status NOT IN ('failed', 'cancelled', 'published', 'approved')
        AND created_at > now() - interval '10 minutes'
      ORDER BY created_at DESC
      LIMIT 1`,
    [args.projectId, instruction],
  ).catch(() => null);
  if (vivo) {
    console.info("[start-owner-run] orden repetida, reuso el run", {
      projectId: args.projectId,
      runId: vivo.id,
    });
    return {
      runId: vivo.id,
      agent: (vivo.resolved_executor === "codex" ? "codex" : "claude") as BuilderExecutor,
    };
  }

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
