/**
 * Owner acepta un comentario → genera prompt + encola tarea.
 * No ejecuta el agente a ciegas: deja la tarea lista y abre el Estudio con el prompt.
 * Solo platform owner o live role owner.
 */
import { NextRequest, NextResponse } from "next/server";
import { getCurrentVForgeIdentity } from "@/lib/api/vforge-owned";
import { isOwnerEmail } from "@/lib/auth/owner";
import { queryOne } from "@/lib/db/client";
import {
  buildCommentFixPrompt,
  createCommentTask,
  insertSystemComment,
  insertTaskEvent,
} from "@/lib/live/comment-tasks";
import { resolveProjectViewportUrls } from "@/lib/projects/viewport-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

export async function POST(
  req: NextRequest,
  {
    params,
  }: { params: Promise<{ projectId: string; commentId: string }> },
) {
  const { projectId, commentId } = await params;
  const identity = await getCurrentVForgeIdentity();
  if (!identity) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: noStore });
  }

  const platformOwner = isOwnerEmail(identity.email);

  // Membresía live: solo owner del proyecto (o platform owner)
  let liveOwner = platformOwner;
  if (!platformOwner) {
    const membership = await queryOne<{ role: string }>(
      `SELECT role FROM project_live_members
        WHERE project_id = $1 AND lower(email) = lower($2) AND status = 'active'
          AND (expires_at IS NULL OR expires_at > now())
        LIMIT 1`,
      [projectId, identity.email],
    ).catch(() => null);
    liveOwner = membership?.role === "owner";
  }

  if (!liveOwner) {
    return NextResponse.json({ error: "forbidden" }, { status: 403, headers: noStore });
  }

  const comment = await queryOne<{
    id: string;
    project_id: string;
    body: string;
    author_name: string | null;
    author_email: string;
  }>(
    `SELECT id, project_id, body, author_name, author_email
       FROM project_comments WHERE id = $1 AND project_id = $2 LIMIT 1`,
    [commentId, projectId],
  );

  if (!comment) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: noStore });
  }

  const project = await queryOne<{
    id: string;
    name: string;
    desktop_url: string | null;
    mobile_url: string | null;
    admin_url: string | null;
    vercel_url: string | null;
    domain: string | null;
  }>(
    `SELECT id, name, desktop_url, mobile_url, admin_url, vercel_url, domain
       FROM projects WHERE id = $1 LIMIT 1`,
    [projectId],
  );

  if (!project) {
    return NextResponse.json({ error: "project_not_found" }, { status: 404, headers: noStore });
  }

  const viewports = resolveProjectViewportUrls(project);
  const authorLabel =
    comment.author_name?.trim() || comment.author_email || "participante";

  const bodyOverride =
    (await req.json().catch(() => null)) as { note?: string } | null;
  const extra =
    bodyOverride && typeof bodyOverride.note === "string"
      ? bodyOverride.note.trim()
      : "";

  const prompt = buildCommentFixPrompt({
    projectId,
    projectName: project.name,
    authorLabel,
    body: extra ? `${comment.body}\n\nNota del owner: ${extra}` : comment.body,
    desktopUrl: viewports.desktop_url,
    mobileUrl: viewports.mobile_url,
    adminUrl: viewports.admin_url,
  });

  const task = await createCommentTask({
    projectId,
    commentId,
    prompt,
    sourceBody: comment.body,
    createdBy: identity.userId,
    createdByEmail: identity.email,
  });

  if (!task) {
    return NextResponse.json({ error: "task_failed" }, { status: 500, headers: noStore });
  }

  const shortId = task.id.slice(0, 8);
  await insertTaskEvent({
    projectId,
    taskId: task.id,
    commentId,
    message: `Tarea ${shortId} encolada desde comentario de ${authorLabel}`,
  });

  await insertSystemComment({
    projectId,
    authorEmail: identity.email,
    authorName: "VForge · sistema",
    clerkId: identity.userId,
    body: `✓ Tarea aceptada (${shortId}) · en cola para el Estudio / agente.\nOrigen: “${comment.body.slice(0, 160)}${comment.body.length > 160 ? "…” : "”"}`,
  });

  const estudioPath = `/app/chat?projectId=${encodeURIComponent(projectId)}&task=${encodeURIComponent(task.id)}`;

  return NextResponse.json(
    {
      ok: true,
      task: {
        id: task.id,
        status: task.status,
        prompt: task.prompt,
      },
      estudioPath,
    },
    { status: 201, headers: noStore },
  );
}
