/**
 * Cómo se lee una tarea de la fábrica en la sala. Módulo puro: sin DB, sin
 * server-only, para que lo use igual el servidor, la UI y las pruebas.
 */
import type { AgentRunRow } from "@/lib/live/agent-runs";

/** Cómo se llaman los agentes cuando V habla de ellos. */
const AGENT_LABEL: Record<string, string> = {
  claude: "Claude Code",
  codex: "Codex",
  grok: "Grok",
  team: "el equipo",
};

/** Estado del run en palabras que significan algo, sin barra de progreso falsa. */
const STATUS_LABEL: Record<string, string> = {
  preparing: "preparando la rama",
  queued: "en cola",
  running: "trabajando",
  awaiting_preview: "esperando preview",
  preview_ready: "preview listo",
  awaiting_approval: "esperando tu visto bueno",
  approved: "aprobado",
  published: "aplicado",
  failed: "falló",
  cancelled: "cancelado",
};

const CLOSED = new Set(["published", "approved", "failed", "cancelled"]);

export interface RoomTask {
  id: string;
  shortId: string;
  agent: string;
  agentLabel: string;
  status: string;
  statusLabel: string;
  instruction: string;
  branch: string;
  prUrl: string | null;
  live: boolean;
  updatedAt: string;
}

export function agentLabel(agent: string): string {
  return AGENT_LABEL[agent] ?? agent;
}

export function taskFromRun(run: AgentRunRow): RoomTask {
  return {
    id: run.id,
    shortId: run.id.slice(0, 8),
    agent: run.resolved_executor,
    agentLabel: agentLabel(run.resolved_executor),
    status: run.status,
    statusLabel: STATUS_LABEL[run.status] ?? run.status,
    instruction: run.instruction.slice(0, 200),
    branch: run.work_branch,
    prUrl: run.pr_url,
    live: !CLOSED.has(run.status),
    updatedAt: run.updated_at,
  };
}

/** Las mismas tareas, en texto, para el prompt de V. */
export function formatFactoryTasks(tasks: RoomTask[]): string {
  if (!tasks.length) {
    return "TAREAS EN LA FÁBRICA: ninguna. Si dices que algo está corriendo, mientes.";
  }
  const lines = tasks.map((task) => {
    const pr = task.prUrl ? ` · PR ${task.prUrl}` : "";
    return `- run ${task.shortId} · ${task.agentLabel} · ${task.statusLabel} · rama ${task.branch}${pr}\n  pedido: ${task.instruction}`;
  });
  return [
    "TAREAS EN LA FÁBRICA (estado real de la cola, esto es lo único que puedes afirmar):",
    ...lines,
    "Si el owner pregunta cómo va, contesta con estas líneas. No inventes avances, tiempos ni archivos tocados que no estén aquí.",
  ].join("\n");
}
