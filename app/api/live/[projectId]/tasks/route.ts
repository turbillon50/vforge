/** Lista tareas encoladas desde comentarios (owner). */
import { NextRequest, NextResponse } from "next/server";
import { getCurrentVForgeIdentity } from "@/lib/api/vforge-owned";
import { isOwnerEmail } from "@/lib/auth/owner";
import { queryAll, queryOne } from "@/lib/db/client";
import { ensureCommentTasksTable } from "@/lib/live/comment-tasks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const identity = await getCurrentVForgeIdentity();
  if (!identity) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const platformOwner = isOwnerEmail(identity.email);
  if (!platformOwner) {
    const m = await queryOne<{ role: string }>(
      `SELECT role FROM project_live_members
        WHERE project_id = $1 AND lower(email) = lower($2) AND status = 'active'
        LIMIT 1`,
      [projectId, identity.email],
    ).catch(() => null);
    if (m?.role !== "owner" && m?.role !== "reviewer") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }
  await ensureCommentTasksTable();
  const tasks = await queryAll(
    `SELECT id, comment_id, status, created_at, result_summary
       FROM project_comment_tasks WHERE project_id = $1
       ORDER BY created_at DESC LIMIT 50`,
    [projectId],
  ).catch(() => []);
  return NextResponse.json({ tasks }, { headers: { "Cache-Control": "no-store" } });
}
