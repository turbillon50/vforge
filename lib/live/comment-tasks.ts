import { queryOne, queryAll } from "@/lib/db/client";

export type CommentTaskStatus =
  | "queued"
  | "running"
  | "done"
  | "cancelled"
  | "failed";

export interface CommentTaskRow {
  id: string;
  project_id: string;
  comment_id: string;
  status: CommentTaskStatus;
  prompt: string;
  source_body: string;
  created_by: string | null;
  created_by_email: string | null;
  created_at: string;
  result_summary: string | null;
}

/** Asegura tabla (idempotente) por si la migración aún no corrió. */
export async function ensureCommentTasksTable(): Promise<void> {
  await queryOne(
    `CREATE TABLE IF NOT EXISTS project_comment_tasks (
      id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id      text NOT NULL,
      comment_id      uuid NOT NULL,
      status          text NOT NULL DEFAULT 'queued',
      prompt          text NOT NULL,
      source_body     text NOT NULL,
      created_by      text,
      created_by_email text,
      created_at      timestamptz NOT NULL DEFAULT now(),
      updated_at      timestamptz NOT NULL DEFAULT now(),
      result_summary  text
    )`,
  ).catch(() => null);
}

export function buildCommentFixPrompt(args: {
  projectId: string;
  projectName: string;
  authorLabel: string;
  body: string;
  desktopUrl?: string | null;
  mobileUrl?: string | null;
  adminUrl?: string | null;
}): string {
  const views = [
    args.desktopUrl ? `Web: ${args.desktopUrl}` : null,
    args.mobileUrl ? `Móvil: ${args.mobileUrl}` : null,
    args.adminUrl ? `Admin: ${args.adminUrl}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return `PROYECTO: ${args.projectName} (${args.projectId})

ORIGEN
Comentario en la sala live de VForge (feedback de ${args.authorLabel}).

FEEDBACK
${args.body.trim()}

${views ? `VIEWPORTS\n${views}\n` : ""}OBJETIVO
Convierte este feedback en un cambio concreto, verificable y acotado al proyecto.
No inventes requisitos que no estén en el comentario. Si falta información, lista preguntas mínimas.

ENTREGA
1. Interpretación breve del pedido.
2. Archivos / superficies a tocar (si aplica).
3. Plan de cambio en pasos.
4. Criterios de aceptación (cómo comprobar en preview desktop/móvil).
5. Si puedes aplicar el cambio con las herramientas disponibles, hazlo; si no, deja el plan listo.

RESTRICCIONES
- No expongas secretos ni credenciales.
- No toques infra de otros proyectos.
- Prioriza el viewport que el feedback implique (móvil si habla de celular, etc.).`;
}

export async function createCommentTask(args: {
  projectId: string;
  commentId: string;
  prompt: string;
  sourceBody: string;
  createdBy: string | null;
  createdByEmail: string | null;
}): Promise<CommentTaskRow | null> {
  await ensureCommentTasksTable();
  return queryOne<CommentTaskRow>(
    `INSERT INTO project_comment_tasks
       (project_id, comment_id, status, prompt, source_body, created_by, created_by_email)
     VALUES ($1, $2, 'queued', $3, $4, $5, $6)
     RETURNING id, project_id, comment_id, status, prompt, source_body,
               created_by, created_by_email, created_at, result_summary`,
    [
      args.projectId,
      args.commentId,
      args.prompt,
      args.sourceBody,
      args.createdBy,
      args.createdByEmail,
    ],
  );
}

export async function listTasksForComments(
  projectId: string,
  commentIds: string[],
): Promise<CommentTaskRow[]> {
  if (commentIds.length === 0) return [];
  await ensureCommentTasksTable();
  return queryAll<CommentTaskRow>(
    `SELECT id, project_id, comment_id, status, prompt, source_body,
            created_by, created_by_email, created_at, result_summary
       FROM project_comment_tasks
      WHERE project_id = $1 AND comment_id = ANY($2::uuid[])
      ORDER BY created_at DESC`,
    [projectId, commentIds],
  ).catch(() => []);
}

export async function insertSystemComment(args: {
  projectId: string;
  body: string;
  authorEmail: string;
  authorName: string;
  clerkId?: string | null;
}): Promise<void> {
  await queryOne(
    `INSERT INTO project_comments
       (project_id, author_clerk_id, author_email, author_name, body)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      args.projectId,
      args.clerkId ?? null,
      args.authorEmail,
      args.authorName,
      args.body.slice(0, 4000),
    ],
  ).catch(() => null);
}

export async function insertTaskEvent(args: {
  projectId: string;
  taskId: string;
  commentId: string;
  message: string;
}): Promise<void> {
  await queryOne(
    `INSERT INTO project_events (project_id, event_type, details, severity)
     VALUES ($1, 'task.queued', $2::jsonb, 'low')`,
    [
      args.projectId,
      JSON.stringify({
        message: args.message,
        task_id: args.taskId,
        comment_id: args.commentId,
        source: "live_comment_accept",
      }),
    ],
  ).catch(() => null);
}
