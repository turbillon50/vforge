import "server-only";

import { queryAll, queryOne } from "@/lib/db/client";

export type ProjectAssistantMode = "talk" | "plan";

export interface ProjectAssistantMessage {
  id: string;
  mode: ProjectAssistantMode;
  role: "user" | "assistant";
  created_by_email: string;
  content: string;
  created_at: string;
}

export async function ensureProjectAssistantTable(): Promise<void> {
  await queryOne(
    `CREATE TABLE IF NOT EXISTS project_v_messages (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      mode text NOT NULL CHECK (mode IN ('talk', 'plan')),
      role text NOT NULL CHECK (role IN ('user', 'assistant')),
      created_by_user_id text NOT NULL,
      created_by_email text NOT NULL,
      content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 12000),
      created_at timestamptz NOT NULL DEFAULT now()
    )`,
  );
  await queryOne(
    `CREATE INDEX IF NOT EXISTS idx_project_v_messages_thread
       ON project_v_messages (project_id, mode, created_at DESC)`,
  );
}

export async function listProjectAssistantMessages(
  projectId: string,
): Promise<ProjectAssistantMessage[]> {
  await ensureProjectAssistantTable();
  return queryAll<ProjectAssistantMessage>(
    `SELECT id::text, mode, role, created_by_email, content, created_at
       FROM (
         SELECT id, mode, role, created_by_email, content, created_at
           FROM project_v_messages
          WHERE project_id = $1
          ORDER BY created_at DESC, id DESC
          LIMIT 200
       ) recent
      ORDER BY created_at ASC, id ASC`,
    [projectId],
  );
}

export async function projectAssistantHistory(
  projectId: string,
  mode: ProjectAssistantMode,
): Promise<Array<{ role: "user" | "assistant"; content: string }>> {
  await ensureProjectAssistantTable();
  const rows = await queryAll<{ role: "user" | "assistant"; content: string }>(
    `SELECT role, content
       FROM (
         SELECT role, content, created_at, id
           FROM project_v_messages
          WHERE project_id = $1 AND mode = $2
          ORDER BY created_at DESC, id DESC
          LIMIT 20
       ) recent
      ORDER BY created_at ASC, id ASC`,
    [projectId, mode],
  );
  return rows;
}

export async function saveProjectAssistantTurn(args: {
  projectId: string;
  mode: ProjectAssistantMode;
  userId: string;
  email: string;
  userText: string;
  assistantText: string;
}): Promise<void> {
  await ensureProjectAssistantTable();
  await queryOne(
    `INSERT INTO project_v_messages
      (project_id, mode, role, created_by_user_id, created_by_email, content)
     VALUES
      ($1, $2, 'user', $3, $4, $5),
      ($1, $2, 'assistant', $3, $4, $6)`,
    [
      args.projectId,
      args.mode,
      args.userId,
      args.email,
      args.userText,
      args.assistantText,
    ],
  );
}
