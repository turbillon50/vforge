/**
 * Live room tools for V — list comments & tasks from salas live.
 * Wired into lib/forge/tools.ts TOOLS + dispatch (observe ring).
 */
import type { Tool } from "@anthropic-ai/sdk/resources/messages";
import { queryAll } from "@/lib/db/client";
import {
  ensureCommentTasksTable,
  listGlobalOpenTasks,
  listProjectTasks,
  type CommentTaskStatus,
} from "@/lib/live/comment-tasks";
import type { ToolExecutionResult } from "@/lib/forge/tools";

export const LIVE_TOOLS: Tool[] = [
  {
    name: "live_list_comments",
    description:
      "Lista comentarios de la sala live de un proyecto. Devuelve autor, body, fecha. Úsala cuando Luis pregunte qué feedback hay en un live room, qué dijeron los revisores, o antes de aceptar/encolar.",
    input_schema: {
      type: "object",
      properties: {
        projectId: {
          type: "string",
          description: "Slug / id del proyecto en vForge",
        },
        limit: {
          type: "number",
          description: "Máximo de comentarios (1-100, default 40)",
        },
      },
      required: ["projectId"],
    },
  },
  {
    name: "live_list_tasks",
    description:
      "Lista tareas generadas desde comentarios live (accept → cola). Sin projectId = cola global queued+running (owner). Con projectId filtra ese proyecto. status opcional: queued|running|done|cancelled|failed.",
    input_schema: {
      type: "object",
      properties: {
        projectId: {
          type: "string",
          description: "Opcional. Si se omite, cola global abierta.",
        },
        status: {
          type: "string",
          enum: ["queued", "running", "done", "cancelled", "failed"],
          description: "Filtro de status (solo con projectId)",
        },
        limit: {
          type: "number",
          description: "1-200, default 50",
        },
      },
    },
  },
];

function clamp(n: unknown, min: number, max: number, def: number): number {
  const v = typeof n === "number" ? n : parseInt(String(n ?? ""), 10);
  if (Number.isNaN(v)) return def;
  return Math.min(Math.max(v, min), max);
}

export async function executeLiveTool(
  name: string,
  input: Record<string, unknown>,
): Promise<ToolExecutionResult | null> {
  if (name === "live_list_comments") {
    const projectId =
      typeof input.projectId === "string" ? input.projectId.trim() : "";
    if (!projectId) {
      return {
        ok: false,
        content: JSON.stringify({ error: "projectId requerido" }),
        summary: "live_list_comments: falta projectId",
      };
    }
    const limit = clamp(input.limit, 1, 100, 40);
    const rows = await queryAll<{{
      id: string;
      author_email: string;
      author_name: string | null;
      body: string;
      created_at: string;
    }}>(
      `SELECT id, author_email, author_name, body, created_at
         FROM project_comments
        WHERE project_id = $1
        ORDER BY created_at DESC
        LIMIT $2`,
      [projectId, limit],
    ).catch(() => []);
    return {
      ok: true,
      content: JSON.stringify({
        projectId,
        total: rows.length,
        comments: rows.map((c) => ({{
          id: c.id,
          author: c.author_name ?? c.author_email,
          body: c.body.slice(0, 800),
          created_at: c.created_at,
        }})),
      }),
      summary: `${rows.length} comentarios en ${projectId}`,
    };
  }

  if (name === "live_list_tasks") {
    await ensureCommentTasksTable();
    const limit = clamp(input.limit, 1, 200, 50);
    const projectId =
      typeof input.projectId === "string" && input.projectId.trim()
        ? input.projectId.trim()
        : null;

    if (!projectId) {
      const tasks = await listGlobalOpenTasks(limit);
      return {
        ok: true,
        content: JSON.stringify({
          scope: "global_open",
          total: tasks.length,
          tasks: tasks.map((t) => ({{
            id: t.id,
            project_id: t.project_id,
            project_name: t.project_name,
            status: t.status,
            source_preview: t.source_preview,
            created_at: t.created_at,
            prompt_preview: (t.prompt ?? "").slice(0, 240),
          }})),
        }),
        summary: `cola global: ${tasks.length} abiertas`,
      };
    }

    const status =
      typeof input.status === "string"
        ? (input.status as CommentTaskStatus)
        : undefined;
    const tasks = await listProjectTasks(projectId, { status, limit });
    return {
      ok: true,
      content: JSON.stringify({
        projectId,
        total: tasks.length,
        tasks: tasks.map((t) => ({{
          id: t.id,
          comment_id: t.comment_id,
          status: t.status,
          source_preview: t.source_body.slice(0, 160),
          created_at: t.created_at,
          result_summary: t.result_summary,
          prompt_preview: t.prompt.slice(0, 240),
        }})),
      }),
      summary: `${tasks.length} tareas en ${projectId}`,
    };
  }

  return null;
}
