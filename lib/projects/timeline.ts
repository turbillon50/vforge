/**
 * Línea de tiempo del proyecto — el avance EN VIVO que ve el cliente.
 *
 * Cada hito real (contrato firmado, evidencia subida, etapa terminada) se
 * registra aquí y el portal del cliente lo refleja al instante.
 */
import { queryOne, queryAll } from "@/lib/db/client";

export interface TimelineEvent {
  id: string;
  project_id: string;
  stage: string;
  status: "pending" | "in_progress" | "done" | "blocked";
  title: string;
  detail: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface AddTimelineArgs {
  stage: string;
  title: string;
  detail?: string | null;
  status?: TimelineEvent["status"];
}

/** Agrega un evento al final de la línea de tiempo del proyecto. */
export async function addTimelineEvent(
  projectId: string,
  args: AddTimelineArgs,
): Promise<TimelineEvent | null> {
  const max = await queryOne<{ pos: number | null }>(
    `SELECT max(position) AS pos FROM project_timeline WHERE project_id = $1`,
    [projectId],
  );
  const position = (max?.pos ?? -1) + 1;
  return queryOne<TimelineEvent>(
    `INSERT INTO project_timeline (project_id, stage, status, title, detail, position)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      projectId,
      args.stage,
      args.status ?? "done",
      args.title,
      args.detail ?? null,
      position,
    ],
  );
}

/** Lee la línea de tiempo ordenada de un proyecto. */
export async function getTimeline(projectId: string): Promise<TimelineEvent[]> {
  return queryAll<TimelineEvent>(
    `SELECT * FROM project_timeline
      WHERE project_id = $1
      ORDER BY position ASC, created_at ASC`,
    [projectId],
  );
}
