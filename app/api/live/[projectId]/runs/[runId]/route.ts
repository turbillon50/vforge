import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db/client";
import {
  authorizeAgentRunAccess,
  buildAgentPrompt,
  ensureProjectAgentRunsTable,
  type AgentQueueJob,
  type AgentRunRow,
} from "@/lib/live/agent-runs";
import { isLiveRunStatus } from "@/lib/live/run-console";
import { parseRepoFullName, withUserGithub } from "@/lib/live/github-user";
import { recordProjectDecision } from "@/lib/live/load-project-memory";
import { dispatchJob } from "@/lib/vulcano/operator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function json(value: unknown, status = 200) {
  return NextResponse.json(value, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; runId: string }> },
) {
  const { projectId, runId } = await params;
  if (!uuidPattern.test(runId)) return json({ error: "not_found" }, 404);
  const access = await authorizeAgentRunAccess(projectId, req.signal);
  if (!access) return json({ error: "not_found" }, 404);
  if (!access.canWrite) return json({ error: "forbidden" }, 403);
  await ensureProjectAgentRunsTable();
  const run = await queryOne<AgentRunRow>(
    `SELECT * FROM project_agent_runs WHERE id = $1 AND project_id = $2 LIMIT 1`,
    [runId, projectId],
  );
  if (!run) return json({ error: "not_found" }, 404);
  const payload = (await req.json().catch(() => null)) as {
    action?: string;
    message?: string;
  } | null;
  const action = payload?.action;

  if (action === "cancel") {
    if (run.status === "published")
      return json({ error: "already_published" }, 409);
    const updated = await queryOne<AgentRunRow>(
      `UPDATE project_agent_runs SET status = 'cancelled', phase = 'complete', updated_at = now()
        WHERE id = $1 RETURNING *`,
      [runId],
    );
    return json({ run: updated });
  }

  const parsed = parseRepoFullName(run.repo_full_name);
  if (!parsed) return json({ error: "invalid_repository" }, 409);
  const [owner, repo] = parsed;

  if (action === "approve" || action === "apply") {
    const ready =
      run.status === "preview_ready" ||
      run.status === "awaiting_approval" ||
      run.status === "awaiting_preview" ||
      run.status === "approved";
    if (!ready) return json({ error: "not_ready" }, 409);
    try {
      let prNumber = run.pr_number;
      let prUrl = run.pr_url;
      if (!prNumber || !prUrl) {
        const pull = await withUserGithub(
          access.identity.userId,
          async (github) => {
            const created = await github.request(
              "POST /repos/{owner}/{repo}/pulls",
              {
                owner,
                repo,
                title: `VForge: ${run.instruction.replace(/\s+/g, " ").slice(0, 90)}`,
                head: run.work_branch,
                base: run.base_branch,
                body: `Run VForge ${run.id}\n\n${run.instruction}${run.preview_url ? `\n\nPreview: ${run.preview_url}` : ""}`,
                draft: false,
              },
            );
            return created.data;
          },
        );
        if (!pull) return json({ error: "connect_github" }, 409);
        prNumber = pull.number;
        prUrl = pull.html_url;
        await queryOne(
          `UPDATE project_agent_runs
              SET status = 'approved', pr_number = $1, pr_url = $2, approved_at = now(), updated_at = now()
            WHERE id = $3`,
          [prNumber, prUrl, runId],
        );
        await recordProjectDecision({
          projectId,
          kind: "approved",
          summary: `Aprobado ${run.work_branch} → PR ${prUrl}`,
          sourceId: runId,
          email: access.identity.email,
        }).catch(() => null);
      }
      if (action === "approve") {
        const updated = await queryOne<AgentRunRow>(
          `SELECT * FROM project_agent_runs WHERE id = $1 LIMIT 1`,
          [runId],
        );
        return json({ run: updated });
      }

      const merged = await withUserGithub(
        access.identity.userId,
        async (github) => {
          const response = await github.request(
            "PUT /repos/{owner}/{repo}/pulls/{pull_number}/merge",
            {
              owner,
              repo,
              pull_number: prNumber!,
              merge_method: "squash",
              commit_title: `VForge: ${run.instruction.replace(/\s+/g, " ").slice(0, 72)}`,
            },
          );
          return response.data;
        },
      );
      if (!merged) return json({ error: "connect_github" }, 409);
      if (!merged.merged)
        return json({ error: merged.message || "merge_blocked" }, 409);
      const updated = await queryOne<AgentRunRow>(
        `UPDATE project_agent_runs
            SET status = 'published', phase = 'complete', published_at = now(), updated_at = now()
          WHERE id = $1 RETURNING *`,
        [runId],
      );
      await queryOne(
        `INSERT INTO project_events (project_id, event_type, details, severity)
         VALUES ($1, 'agent.run.published', $2::jsonb, 'high')`,
        [
          projectId,
          JSON.stringify({
            message: `Run publicado: ${run.work_branch}`,
            run_id: runId,
            pr_url: prUrl,
          }),
        ],
      ).catch(() => null);
      await recordProjectDecision({
        projectId,
        kind: "published",
        summary: `Publicado ${run.work_branch}`,
        sourceId: runId,
        email: access.identity.email,
      }).catch(() => null);
      return json({ run: updated, merged: true });
    } catch (caught) {
      return json(
        {
          error:
            caught instanceof Error
              ? caught.message.slice(0, 300)
              : "github_error",
        },
        502,
      );
    }
  }

  if (action === "publish") {
    if (run.status !== "approved" || !run.pr_number)
      return json({ error: "approval_required" }, 409);
    try {
      const merged = await withUserGithub(
        access.identity.userId,
        async (github) => {
          const response = await github.request(
            "PUT /repos/{owner}/{repo}/pulls/{pull_number}/merge",
            {
              owner,
              repo,
              pull_number: run.pr_number!,
              merge_method: "squash",
              commit_title: `VForge: publicar run ${run.id.slice(0, 8)}`,
            },
          );
          return response.data;
        },
      );
      if (!merged) return json({ error: "connect_github" }, 409);
      if (!merged.merged)
        return json({ error: merged.message || "merge_blocked" }, 409);
      const updated = await queryOne<AgentRunRow>(
        `UPDATE project_agent_runs
            SET status = 'published', phase = 'complete', published_at = now(), updated_at = now()
          WHERE id = $1 RETURNING *`,
        [runId],
      );
      await queryOne(
        `INSERT INTO project_events (project_id, event_type, details, severity)
         VALUES ($1, 'agent.run.published', $2::jsonb, 'high')`,
        [
          projectId,
          JSON.stringify({
            message: `Run publicado: ${run.work_branch}`,
            run_id: runId,
            pr_url: run.pr_url,
          }),
        ],
      ).catch(() => null);
      await recordProjectDecision({
        projectId,
        kind: "published",
        summary: `Publicado ${run.work_branch}`,
        sourceId: runId,
        email: access.identity.email,
      }).catch(() => null);
      return json({ run: updated, merged: true });
    } catch (caught) {
      return json(
        {
          error:
            caught instanceof Error
              ? caught.message.slice(0, 300)
              : "github_error",
        },
        502,
      );
    }
  }

  if (action === "nudge") {
    const message =
      typeof payload?.message === "string"
        ? payload.message.trim().slice(0, 4000)
        : "";
    if (message.length < 2) return json({ error: "invalid_nudge" }, 400);
    if (!isLiveRunStatus(run.status)) return json({ error: "run_idle" }, 409);
    const agent =
      run.resolved_executor === "claude" || run.resolved_executor === "codex"
        ? run.resolved_executor
        : "grok";
    try {
      const dispatched = await dispatchJob({
        agent,
        prompt: buildAgentPrompt({
          runId,
          projectId,
          repo: run.repo_full_name,
          baseBranch: run.base_branch,
          workBranch: run.work_branch,
          instruction: `CONTINUACIÓN EN VIVO. El owner te habla desde la sala:\n${message}`,
          role: "builder",
        }),
        priority: 2,
        source: `vforge:${projectId}:${runId}:${access.identity.userId}`,
      });
      const jobs = Array.isArray(run.queue_jobs) ? run.queue_jobs : [];
      const nextJobs: AgentQueueJob[] = [
        ...jobs,
        { id: dispatched.id, agent, role: "builder" },
      ];
      const updated = await queryOne<AgentRunRow>(
        `UPDATE project_agent_runs
            SET queue_jobs = $1::jsonb, status = 'queued', phase = 'building', updated_at = now()
          WHERE id = $2 RETURNING *`,
        [JSON.stringify(nextJobs), runId],
      );
      return json({ run: updated });
    } catch (caught) {
      return json(
        {
          error:
            caught instanceof Error
              ? caught.message.slice(0, 300)
              : "nudge_failed",
        },
        502,
      );
    }
  }

  return json({ error: "invalid_action" }, 400);
}
