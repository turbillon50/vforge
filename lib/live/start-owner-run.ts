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

  // Idempotencia. Dos reglas, porque un run pasa por dos momentos:
  //
  // 1. Ya despachado (queued en adelante): la orden existe de verdad en la
  //    cola, así que se reutiliza. Decir "encolada" ahí es cierto.
  // 2. Todavía naciendo ('preparing'): la fila existe pero la rama y el job
  //    aún no. Ni se reutiliza (podría acabar en 'failed' y ya habríamos
  //    dicho que salió) ni se duplica: se pide esperar unos segundos.
  //
  // La llave incluye repo y agente: el mismo texto mandado a otro repo o a
  // otro constructor es OTRO trabajo, no un reintento.
  const mismaOrden = `project_id = $1
        AND instruction = $2
        AND lower(repo_full_name) = lower($3)
        AND resolved_executor = $4`;
  const llave = [
    args.projectId,
    instruction,
    args.repository.repo_full_name,
    agent,
  ];

  const despachado = await queryOne<{ id: string }>(
    `SELECT id::text
       FROM project_agent_runs
      WHERE ${mismaOrden}
        AND status IN ('queued', 'running', 'awaiting_preview', 'preview_ready', 'awaiting_approval')
        AND created_at > now() - interval '10 minutes'
      ORDER BY created_at DESC
      LIMIT 1`,
    llave,
  ).catch(() => null);
  if (despachado) {
    console.info("[start-owner-run] orden repetida, reuso el run despachado", {
      projectId: args.projectId,
      runId: despachado.id,
      agent,
    });
    return { runId: despachado.id, agent };
  }

  const naciendo = await queryOne<{ id: string }>(
    `SELECT id::text
       FROM project_agent_runs
      WHERE ${mismaOrden}
        AND status = 'preparing'
        AND created_at > now() - interval '2 minutes'
      LIMIT 1`,
    llave,
  ).catch(() => null);
  if (naciendo) {
    console.info("[start-owner-run] orden idéntica todavía saliendo", {
      projectId: args.projectId,
      runId: naciendo.id,
    });
    return {
      error:
        "ya hay una orden idéntica saliendo en este momento; dame unos segundos y te digo cómo quedó",
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
