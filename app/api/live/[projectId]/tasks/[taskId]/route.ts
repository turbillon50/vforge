/** PATCH estado de tarea (running/done/cancelled/failed). Solo owner. */
import { NextRequest, NextResponse } from "next/server";
import { getCurrentVForgeIdentity } from "@/lib/api/vforge-owned";
import { isOwnerEmail } from "@/lib/auth/owner";
import { queryOne } from "@/lib/db/client";
import { membershipBelongsToUserSql } from "@/lib/projects/membership-scope";
import {
  ensureCommentTasksTable,
  insertSystemComment,
} from "@/lib/live/comment-tasks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = new Set(["queued", "running", "done", "cancelled", "failed"]);

async function assertOwner(projectId: string, userId: string, email: string) {
  if (isOwnerEmail(email)) return true;
  const m = await queryOne<{ role: string }>(
    `SELECT role FROM project_live_members
      WHERE project_id = $1
        AND ${membershipBelongsToUserSql("project_live_members", "$2", "$3")}
        AND status = 'active'
      LIMIT 1`,
    [projectId, userId, email],
  ).catch(() => null);
  return m?.role === "owner";
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; taskId: string }> },
) {
  const { projectId, taskId } = await params;
  const identity = await getCurrentVForgeIdentity();
  if (!identity) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!(await assertOwner(projectId, identity.userId, identity.email))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as {
    status?: string;
    result_summary?: string;
  } | null;
  const status = body?.status;
  if (!status || !ALLOWED.has(status)) {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }

  await ensureCommentTasksTable();
  const summary =
    typeof body?.result_summary === "string"
      ? body.result_summary.slice(0, 2000)
      : null;

  const row = await queryOne(
    `UPDATE project_comment_tasks
        SET status = $1,
            result_summary = COALESCE($2, result_summary),
            updated_at = now()
      WHERE id = $3 AND project_id = $4
      RETURNING id, comment_id, status, result_summary, updated_at`,
    [status, summary, taskId, projectId],
  );

  if (!row) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (status === "done" || status === "cancelled" || status === "failed") {
    const label =
      status === "done"
        ? "completada"
        : status === "cancelled"
          ? "cancelada"
          : "fallida";
    await insertSystemComment({
      projectId,
      authorEmail: identity.email,
      authorName: "VForge · sistema",
      clerkId: identity.userId,
      body: `Tarea ${taskId.slice(0, 8)} ${label}.${summary ? ` ${summary}` : ""}`,
    });
    await queryOne(
      `INSERT INTO project_events (project_id, event_type, details, severity)
       VALUES ($1, $2, $3::jsonb, 'low')`,
      [
        projectId,
        `task.${status}`,
        JSON.stringify({
          message: `Tarea ${taskId.slice(0, 8)} ${label}`,
          task_id: taskId,
          summary,
        }),
      ],
    ).catch(() => null);
  }

  return NextResponse.json({ task: row }, { headers: { "Cache-Control": "no-store" } });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string; taskId: string }> },
) {
  const { projectId, taskId } = await params;
  const identity = await getCurrentVForgeIdentity();
  if (!identity) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  await ensureCommentTasksTable();
  const row = await queryOne(
    `SELECT id, project_id, comment_id, status, prompt, source_body,
            created_at, result_summary
       FROM project_comment_tasks WHERE id = $1 AND project_id = $2`,
    [taskId, projectId],
  );
  if (!row) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ task: row }, { headers: { "Cache-Control": "no-store" } });
}
