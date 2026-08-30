/** Cola global de tareas del owner (todos los proyectos). */
import { NextResponse } from "next/server";
import { getCurrentVForgeIdentity } from "@/lib/api/vforge-owned";
import { isOwnerEmail } from "@/lib/auth/owner";
import { queryAll } from "@/lib/db/client";
import { ensureCommentTasksTable } from "@/lib/live/comment-tasks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const identity = await getCurrentVForgeIdentity();
  if (!identity || !isOwnerEmail(identity.email)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  await ensureCommentTasksTable();
  const tasks = await queryAll(
    `SELECT t.id, t.project_id, t.comment_id, t.status, t.created_at,
            t.result_summary, p.name AS project_name,
            left(t.source_body, 160) AS source_preview
       FROM project_comment_tasks t
       LEFT JOIN projects p ON p.id = t.project_id
      WHERE t.status IN ('queued', 'running')
      ORDER BY t.created_at ASC
      LIMIT 100`,
  ).catch(() => []);
  return NextResponse.json({ tasks }, { headers: { "Cache-Control": "no-store" } });
}
