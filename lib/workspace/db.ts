/**
 * Helpers de datos para el workspace de usuarios (no-owner).
 *
 * Convención: workspace id = 'ws_' + clerk userId, thread id = 'th_' + userId
 * (un solo thread por workspace en esta etapa).
 *
 * REGLA DURA: jamás tocar tablas existentes de V. Solo usamos
 * vforge_workspaces, vforge_threads (ya existen) y vforge_workspace_scopes
 * (nueva, creada on-demand con CREATE TABLE IF NOT EXISTS).
 */
import { sql } from "@/lib/db/client";

export interface WorkspaceScope {
  appType?: string;
  audience?: string;
  features?: string[];
  integrations?: string[];
  projectName?: string;
  [key: string]: unknown;
}

export interface ThreadMessage {
  role: "user" | "assistant";
  content: string;
  at: string; // ISO timestamp
}

export function workspaceId(userId: string): string {
  return `ws_${userId}`;
}

export function threadId(userId: string): string {
  return `th_${userId}`;
}

let scopeTableEnsured = false;

export async function ensureScopeTable(): Promise<void> {
  if (scopeTableEnsured) return;
  await sql`
    CREATE TABLE IF NOT EXISTS vforge_workspace_scopes (
      workspace_id text PRIMARY KEY,
      clerk_user_id text NOT NULL,
      scope jsonb NOT NULL DEFAULT '{}',
      status text NOT NULL DEFAULT 'preparing',
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    )
  `;
  scopeTableEnsured = true;
}

export async function getOrCreateWorkspace(
  userId: string,
  name?: string,
): Promise<{ id: string; name: string }> {
  const id = workspaceId(userId);
  const rows = (await sql`
    INSERT INTO vforge_workspaces (id, name, description, created_at, updated_at)
    VALUES (${id}, ${name ?? "Mi proyecto"}, '', now(), now())
    ON CONFLICT (id) DO UPDATE
      SET name = COALESCE(${name ?? null}, vforge_workspaces.name),
          updated_at = now()
    RETURNING id, name
  `) as Array<{ id: string; name: string }>;
  return rows[0];
}

export async function getScope(
  userId: string,
): Promise<{ scope: WorkspaceScope; status: string } | null> {
  await ensureScopeTable();
  const rows = (await sql`
    SELECT scope, status FROM vforge_workspace_scopes
    WHERE workspace_id = ${workspaceId(userId)}
  `) as Array<{ scope: WorkspaceScope; status: string }>;
  return rows[0] ?? null;
}

export async function saveScope(
  userId: string,
  scope: WorkspaceScope,
): Promise<void> {
  await ensureScopeTable();
  await getOrCreateWorkspace(userId, scope.projectName || undefined);
  await sql`
    INSERT INTO vforge_workspace_scopes (workspace_id, clerk_user_id, scope, status)
    VALUES (${workspaceId(userId)}, ${userId}, ${JSON.stringify(scope)}::jsonb, 'preparing')
    ON CONFLICT (workspace_id) DO UPDATE
      SET scope = ${JSON.stringify(scope)}::jsonb,
          updated_at = now()
  `;
}

export async function getThread(
  userId: string,
): Promise<{ id: string; title: string; messages: ThreadMessage[] }> {
  const id = threadId(userId);
  const rows = (await sql`
    INSERT INTO vforge_threads (id, workspace_id, title, messages, created_at, updated_at)
    VALUES (${id}, ${workspaceId(userId)}, 'Asistente VForge', '[]'::jsonb, now(), now())
    ON CONFLICT (id) DO UPDATE SET updated_at = vforge_threads.updated_at
    RETURNING id, title, messages
  `) as Array<{ id: string; title: string; messages: ThreadMessage[] }>;
  const row = rows[0];
  return {
    id: row.id,
    title: row.title,
    messages: Array.isArray(row.messages) ? row.messages : [],
  };
}

export async function appendMessages(
  userId: string,
  msgs: ThreadMessage[],
): Promise<void> {
  if (msgs.length === 0) return;
  await getThread(userId); // garantiza existencia
  await sql`
    UPDATE vforge_threads
    SET messages = messages || ${JSON.stringify(msgs)}::jsonb,
        updated_at = now()
    WHERE id = ${threadId(userId)}
  `;
}
