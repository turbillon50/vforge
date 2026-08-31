import "server-only";

import { queryOne } from "@/lib/db/client";
import {
  dispatchJob,
  getDispatchJobs,
  type DispatchJobSnapshot,
} from "@/lib/vulcano/operator";
import {
  buildAgentPrompt,
  listProjectAgentRuns,
  type AgentQueueJob,
  type AgentRunRow,
} from "@/lib/live/agent-runs";

/**
 * Sincronización de los runs de una sala con la cola real de la fábrica.
 *
 * Vivía dentro de app/api/live/[projectId]/runs/route.ts, así que sólo
 * avanzaba cuando alguien abría la pestaña de runs: si mandabas trabajo desde
 * el chat de V, el run se quedaba "queued" para siempre a ojos de la sala.
 * Aquí es una función que cualquiera puede llamar.
 */

const terminalStatuses = new Set([
  "approved",
  "published",
  "failed",
  "cancelled",
]);
const doneJobStatuses = new Set(["done", "completed", "success", "succeeded"]);
const failedJobStatuses = new Set(["failed", "error", "cancelled", "canceled"]);

export function queueJobs(value: unknown): AgentQueueJob[] {
  return Array.isArray(value)
    ? value.filter((job): job is AgentQueueJob =>
        Boolean(
          job &&
          typeof job === "object" &&
          Number.isInteger((job as AgentQueueJob).id),
        ),
      )
    : [];
}

function safeSummary(job: DispatchJobSnapshot | undefined) {
  return (job?.result || job?.logTail || "").trim().slice(0, 12000) || null;
}

async function appendJob(
  run: AgentRunRow,
  job: AgentQueueJob,
  phase: "building" | "reviewing",
) {
  const nextJobs = [...queueJobs(run.queue_jobs), job];
  await queryOne(
    `UPDATE project_agent_runs
        SET queue_jobs = $1::jsonb, phase = $2, status = 'queued', updated_at = now(), error = NULL
      WHERE id = $3`,
    [JSON.stringify(nextJobs), phase, run.id],
  );
}

export async function advanceRun(
  run: AgentRunRow,
  snapshots: Map<number, DispatchJobSnapshot>,
) {
  if (
    terminalStatuses.has(run.status) ||
    run.status === "awaiting_approval" ||
    run.status === "preview_ready"
  )
    return;
  const jobs = queueJobs(run.queue_jobs);
  const current = jobs[jobs.length - 1];
  if (!current) return;
  const snapshot = snapshots.get(current.id);
  if (!snapshot) return;
  const normalized = snapshot.status.toLowerCase();

  if (failedJobStatuses.has(normalized)) {
    await queryOne(
      `UPDATE project_agent_runs SET status = 'failed', error = $1, summary = $2, updated_at = now() WHERE id = $3`,
      [
        `${current.agent} terminó con estado ${snapshot.status}`,
        safeSummary(snapshot),
        run.id,
      ],
    );
    return;
  }
  if (!doneJobStatuses.has(normalized)) {
    const nextStatus =
      normalized === "pending" || normalized === "queued"
        ? "queued"
        : "running";
    await queryOne(
      `UPDATE project_agent_runs SET status = $1, summary = COALESCE($2, summary), updated_at = now() WHERE id = $3`,
      [nextStatus, safeSummary(snapshot), run.id],
    );
    return;
  }

  const result = safeSummary(snapshot);
  if (run.requested_executor === "team" && run.phase === "planning") {
    const claimed = await queryOne<{ id: string }>(
      `UPDATE project_agent_runs SET phase = 'building', status = 'preparing', summary = $1, updated_at = now()
        WHERE id = $2 AND phase = 'planning' RETURNING id`,
      [result, run.id],
    );
    if (!claimed) return;
    try {
      const prompt = buildAgentPrompt({
        runId: run.id,
        projectId: run.project_id,
        repo: run.repo_full_name,
        baseBranch: run.base_branch,
        workBranch: run.work_branch,
        instruction: run.instruction,
        role: "builder",
        priorResult: result,
      });
      const dispatched = await dispatchJob({
        agent: "codex",
        prompt,
        priority: 3,
        source: `vforge:${run.project_id}:${run.id}`,
      });
      await appendJob(
        run,
        { id: dispatched.id, agent: "codex", role: "builder" },
        "building",
      );
    } catch (caught) {
      await queryOne(
        `UPDATE project_agent_runs SET status = 'failed', error = $1, updated_at = now() WHERE id = $2`,
        [
          caught instanceof Error
            ? caught.message
            : "No se pudo despachar Codex",
          run.id,
        ],
      );
    }
    return;
  }

  if (run.requested_executor === "team" && run.phase === "building") {
    const claimed = await queryOne<{ id: string }>(
      `UPDATE project_agent_runs SET phase = 'reviewing', status = 'preparing', summary = $1, updated_at = now()
        WHERE id = $2 AND phase = 'building' RETURNING id`,
      [result, run.id],
    );
    if (!claimed) return;
    try {
      const prompt = buildAgentPrompt({
        runId: run.id,
        projectId: run.project_id,
        repo: run.repo_full_name,
        baseBranch: run.base_branch,
        workBranch: run.work_branch,
        instruction: run.instruction,
        role: "reviewer",
        priorResult: result,
      });
      const dispatched = await dispatchJob({
        agent: "grok",
        prompt,
        priority: 4,
        source: `vforge:${run.project_id}:${run.id}`,
      });
      await appendJob(
        run,
        { id: dispatched.id, agent: "grok", role: "reviewer" },
        "reviewing",
      );
    } catch (caught) {
      await queryOne(
        `UPDATE project_agent_runs SET status = 'failed', error = $1, updated_at = now() WHERE id = $2`,
        [
          caught instanceof Error
            ? caught.message
            : "No se pudo despachar Grok",
          run.id,
        ],
      );
    }
    return;
  }

  await queryOne(
    `UPDATE project_agent_runs
        SET phase = 'validation',
            status = CASE WHEN preview_url IS NULL THEN 'awaiting_approval' ELSE 'preview_ready' END,
            summary = $1, updated_at = now()
      WHERE id = $2`,
    [result, run.id],
  );
}

export interface SyncedRuns {
  runs: AgentRunRow[];
  jobs: DispatchJobSnapshot[];
}

/**
 * Lee los runs del proyecto y los avanza con lo que diga la cola del daemon.
 * La cola vive en otra base (DISPATCH_DATABASE_URL): si no contesta, se
 * devuelven los runs tal cual están en Neon en vez de tronar.
 */
export async function syncProjectRuns(projectId: string): Promise<SyncedRuns> {
  const runs = await listProjectAgentRuns(projectId);
  // Sólo se consulta la cola por los runs que todavía pueden moverse: el chat
  // hace polling cada 8 s y no tiene por qué repreguntar por lo ya cerrado.
  const ids = runs
    .filter((run) => !terminalStatuses.has(run.status))
    .flatMap((run) => queueJobs(run.queue_jobs).map((job) => job.id));
  if (!ids.length) return { runs, jobs: [] };
  let snapshots: Map<number, DispatchJobSnapshot>;
  try {
    snapshots = new Map((await getDispatchJobs(ids)).map((job) => [job.id, job]));
  } catch (caught) {
    console.warn("[sync-runs] cola no disponible", {
      projectId,
      error: caught instanceof Error ? caught.message : "unknown",
    });
    return { runs, jobs: [] };
  }
  await Promise.all(runs.map((run) => advanceRun(run, snapshots)));
  return {
    runs: await listProjectAgentRuns(projectId),
    jobs: Array.from(snapshots.values()),
  };
}
