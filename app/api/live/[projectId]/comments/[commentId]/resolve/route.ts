/** Marca comentario resuelto sin encolar (metadata en event). */
import { NextRequest, NextResponse } from "next/server";
import { getCurrentVForgeIdentity } from "@/lib/api/vforge-owned";
import { isOwnerEmail } from "@/lib/auth/owner";
import { queryOne } from "@/lib/db/client";
import { insertSystemComment } from "@/lib/live/comment-tasks";
import { membershipBelongsToUserSql } from "@/lib/projects/membership-scope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string; commentId: string }> },
) {
  const { projectId, commentId } = await params;
  const identity = await getCurrentVForgeIdentity();
  if (!identity) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const platformOwner = isOwnerEmail(identity.email);
  if (!platformOwner) {
    const m = await queryOne<{ role: string }>(
      `SELECT role FROM project_live_members
        WHERE project_id = $1
          AND ${membershipBelongsToUserSql("project_live_members", "$2", "$3")}
          AND status = 'active'
        LIMIT 1`,
      [projectId, identity.userId, identity.email],
    ).catch(() => null);
    if (m?.role !== "owner" && m?.role !== "reviewer") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }

  const comment = await queryOne<{ id: string; body: string }>(
    `SELECT id, body FROM project_comments WHERE id = $1 AND project_id = $2`,
    [commentId, projectId],
  );
  if (!comment) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  await queryOne(
    `INSERT INTO project_events (project_id, event_type, details, severity)
     VALUES ($1, 'comment.resolved', $2::jsonb, 'low')`,
    [
      projectId,
      JSON.stringify({
        message: "Comentario marcado resuelto",
        comment_id: commentId,
        by: identity.email,
      }),
    ],
  ).catch(() => null);

  await insertSystemComment({
    projectId,
    authorEmail: identity.email,
    authorName: "VForge · sistema",
    clerkId: identity.userId,
    body: `Resuelto sin tarea · “${comment.body.slice(0, 120)}${comment.body.length > 120 ? "…" : ""}”`,
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
