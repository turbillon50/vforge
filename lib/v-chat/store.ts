import { createHash, randomUUID } from "node:crypto";
import { sql, queryAll } from "@/lib/db/client";

export const OPERATOR_USER_ID = "operator_luis";
let ensuring: Promise<void> | undefined;

export function ensureVChatTables(): Promise<void> {
  if (!ensuring) ensuring = (async () => {
    await sql`CREATE TABLE IF NOT EXISTS v_chat_sessions (
      id text PRIMARY KEY, user_id text NOT NULL, titulo text,
      created_at timestamptz NOT NULL DEFAULT now(), last_at timestamptz NOT NULL DEFAULT now())`;
    await sql`CREATE TABLE IF NOT EXISTS v_chat_messages (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text NOT NULL,
      session_id text NOT NULL, role text NOT NULL CHECK (role IN ('user','assistant')),
      content text NOT NULL, model text, created_at timestamptz NOT NULL DEFAULT now())`;
    await sql`CREATE INDEX IF NOT EXISTS idx_v_chat_messages_session ON v_chat_messages (session_id, created_at)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_v_chat_sessions_user ON v_chat_sessions (user_id, last_at DESC)`;
  })().catch(() => { ensuring = undefined; throw new Error("V_STORAGE_UNAVAILABLE"); });
  return ensuring;
}

export function deriveTitle(text: string | null | undefined): string {
  const s = (text ?? "").replace(/\s+/g, " ").trim();
  return !s ? "Conversación" : s.length > 60 ? `${s.slice(0, 60).trimEnd()}…` : s;
}
export function makeVSessionId(): string { return `vs_${randomUUID()}`; }
export interface VSession { id: string; titulo: string; created_at: string; last_at: string; count: number }
export interface VMessage { id: string; role: "user" | "assistant"; content: string; model: string | null; created_at: string }

/** Stable IDs make a retry safe without changing historical tables. */
export function vTurnIds(userId: string, sessionId: string, turnId: string): [string, string] {
  return ["user", "assistant"].map((role) => {
    const h = createHash("sha256").update(JSON.stringify([userId, sessionId, turnId, role])).digest("hex");
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
  }) as [string, string];
}

export async function getVTurn(sessionId: string, turnId: string, userId = OPERATOR_USER_ID): Promise<{ userText: string; reply: string; model: string | null } | null> {
  const [userMessageId, assistantMessageId] = vTurnIds(userId, sessionId, turnId);
  const rows = await queryAll<{ id: string; content: string; model: string | null }>(
    `SELECT id::text, content, model FROM v_chat_messages
     WHERE user_id = $1 AND session_id = $2 AND id IN ($3::uuid, $4::uuid)`,
    [userId, sessionId, userMessageId, assistantMessageId],
  );
  const user = rows.find((r) => r.id === userMessageId);
  const assistant = rows.find((r) => r.id === assistantMessageId);
  return user && assistant ? { userText: user.content, reply: assistant.content, model: assistant.model } : null;
}

/** Session and both messages commit together; failures reach the caller. */
export async function persistVTurn(opts: {
  userId?: string; sessionId: string; turnId?: string;
  userText: string; assistantText: string; model?: string | null;
}): Promise<void> {
  const userId = opts.userId || OPERATOR_USER_ID;
  const turnId = opts.turnId ?? randomUUID();
  if (!opts.sessionId || !opts.userText.trim() || !opts.assistantText.trim()) throw new Error("V_INVALID_TURN");
  await ensureVChatTables();
  const ids = vTurnIds(userId, opts.sessionId, turnId);
  await queryAll(
    `WITH session_upsert AS (
       INSERT INTO v_chat_sessions (id, user_id, titulo) VALUES ($1,$2,$3)
       ON CONFLICT (id) DO UPDATE SET last_at = now()
       WHERE v_chat_sessions.user_id = EXCLUDED.user_id RETURNING id
     ), entries (id, role, content, model, sequence) AS (
       VALUES ($4::uuid, 'user', $5::text, NULL::text, 0),
              ($6::uuid, 'assistant', $7::text, $8::text, 1)
     )
     INSERT INTO v_chat_messages (id,user_id,session_id,role,content,model,created_at)
     SELECT entries.id,$2,session_upsert.id,role,content,model,
            statement_timestamp() + sequence * interval '1 microsecond'
     FROM entries CROSS JOIN session_upsert
     ON CONFLICT (id) DO NOTHING RETURNING id`,
    [opts.sessionId, userId, deriveTitle(opts.userText), ids[0], opts.userText, ids[1], opts.assistantText, opts.model ?? null],
  );
  const saved = await getVTurn(opts.sessionId, turnId, userId);
  if (!saved || saved.userText !== opts.userText) throw new Error("V_TURN_CONFLICT");
}

export async function listVSessions(userId = OPERATOR_USER_ID, limit = 40): Promise<VSession[]> {
  await ensureVChatTables();
  return queryAll<VSession>(
    `SELECT s.id, coalesce(nullif(trim(s.titulo),''),'Conversación') AS titulo,
            s.created_at, s.last_at, count(m.id)::int AS count
       FROM v_chat_sessions s JOIN v_chat_messages m ON m.session_id=s.id AND m.user_id=s.user_id
      WHERE s.user_id=$1 GROUP BY s.id ORDER BY s.last_at DESC LIMIT $2`, [userId, limit],
  );
}

export async function getVMessages(sessionId: string, userId = OPERATOR_USER_ID, limit = 200): Promise<VMessage[]> {
  if (!sessionId) return [];
  await ensureVChatTables();
  return queryAll<VMessage>(
    `SELECT id::text,role,content,model,created_at FROM (
       SELECT id,role,content,model,created_at FROM v_chat_messages
       WHERE user_id=$1 AND session_id=$2 ORDER BY created_at DESC,id DESC LIMIT $3
     ) recent ORDER BY created_at ASC,id ASC`, [userId, sessionId, limit],
  );
}
