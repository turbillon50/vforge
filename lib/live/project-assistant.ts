import "server-only";

import { queryAll, queryOne } from "@/lib/db/client";
import { isInvalidModelOutput, dropInvalidAssistantTurns } from "@/lib/forge/provider-errors";

export type ProjectAssistantMode = "talk" | "plan";

export interface ProjectAssistantMessage {
  id: string;
  mode: ProjectAssistantMode;
  role: "user" | "assistant";
  created_by_email: string;
  content: string;
  created_at: string;
  provider: string | null;
  model: string | null;
  status: string | null;
  duration_ms: number | null;
}

let assistantTableReady = false;

export async function ensureProjectAssistantTable(): Promise<void> {
  // Idem: el hilo se relee cada 8 s desde el chat abierto.
  if (assistantTableReady) return;
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
    `ALTER TABLE project_v_messages
       ADD COLUMN IF NOT EXISTS provider text,
       ADD COLUMN IF NOT EXISTS model text,
       ADD COLUMN IF NOT EXISTS status text,
       ADD COLUMN IF NOT EXISTS duration_ms integer`,
  );
  await queryOne(
    `CREATE INDEX IF NOT EXISTS idx_project_v_messages_thread
       ON project_v_messages (project_id, mode, created_at DESC)`,
  );
  assistantTableReady = true;
}

export async function listProjectAssistantMessages(
  projectId: string,
): Promise<ProjectAssistantMessage[]> {
  await ensureProjectAssistantTable();
  const rows = await queryAll<ProjectAssistantMessage>(
    `SELECT id::text, mode, role, created_by_email, content, created_at,
            provider, model, status, duration_ms
       FROM (
         SELECT id, mode, role, created_by_email, content, created_at,
                provider, model, status, duration_ms
           FROM project_v_messages
          WHERE project_id = $1
          ORDER BY created_at DESC, id DESC
          LIMIT 200
       ) recent
      ORDER BY created_at ASC, id ASC`,
    [projectId],
  );
  return dropInvalidAssistantTurns(rows);
}

export async function projectAssistantHistory(
  projectId: string,
  _mode?: ProjectAssistantMode,
): Promise<Array<{ role: "user" | "assistant"; content: string }>> {
  const rows = await listProjectAssistantMessages(projectId);
  return rows.slice(-24).map((row) => ({
    role: row.role,
    content: row.content,
  }));
}

export async function saveProjectAssistantTurn(args: {
  projectId: string;
  mode: ProjectAssistantMode;
  userId: string;
  email: string;
  userText: string;
  assistantText: string;
  provider: string;
  model: string;
  status: string;
  durationMs: number;
}): Promise<void> {
  if (isInvalidModelOutput(args.assistantText)) {
    throw new Error("Refusing to persist invalid provider output.");
  }
  await ensureProjectAssistantTable();
  await queryOne(
    `INSERT INTO project_v_messages
      (project_id, mode, role, created_by_user_id, created_by_email, content,
       provider, model, status, duration_ms)
     VALUES
      ($1, $2, 'user', $3, $4, $5, NULL, NULL, NULL, NULL),
      ($1, $2, 'assistant', $3, $4, $6, $7, $8, $9, $10)`,
    [
      args.projectId,
      args.mode,
      args.userId,
      args.email,
      args.userText,
      args.assistantText,
      args.provider,
      args.model,
      args.status,
      args.durationMs,
    ],
  );
}
