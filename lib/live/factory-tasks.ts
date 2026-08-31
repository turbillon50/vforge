import "server-only";

import { syncProjectRuns } from "@/lib/live/sync-runs";
import { formatFactoryTasks, taskFromRun, type RoomTask } from "@/lib/live/room-tasks";

export { agentLabel, type RoomTask } from "@/lib/live/room-tasks";

/**
 * Tareas de la sala para pintarlas en el chat.
 *
 * Sincroniza con la cola del daemon; si esa base no contesta, devuelve lo que
 * hay en Neon. Nunca truena: el chat de V no se cae porque la fábrica se caiga.
 */
export async function listRoomTasks(
  projectId: string,
  limit = 6,
): Promise<RoomTask[]> {
  const { runs } = await syncProjectRuns(projectId).catch(() => ({ runs: [] }));
  return runs.slice(0, Math.max(1, limit)).map(taskFromRun);
}

/**
 * El mismo estado, en texto, para el prompt de V: así puede contestar
 * "¿cómo va lo que mandamos?" con datos reales en vez de inventar progreso.
 */
export async function factoryTasksBrief(projectId: string): Promise<string> {
  const tasks = await listRoomTasks(projectId, 5).catch(() => [] as RoomTask[]);
  return formatFactoryTasks(tasks);
}
