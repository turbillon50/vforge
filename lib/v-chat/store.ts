/**
 * Persistencia del chat de V (la página /v — "V, Agente Central").
 *
 * MEMORIA OPERATIVA, no cosmético: cada conversación de Luis con V se guarda en
 * Postgres (Neon, DATABASE_URL) para que NO se pierda al recargar y se pueda
 * retomar entre sesiones/dispositivos. Dos tablas dedicadas:
 *
 *   v_chat_sessions  — un hilo por conversación (título autogenerado del 1er msg)
 *   v_chat_messages  — cada turno (user|assistant) con su contenido y modelo
 *
 * Se auto-cura (CREATE TABLE IF NOT EXISTS) en el primer uso, así no depende del
 * heal global. Toda escritura es best-effort: si la DB falla, el chat NO se rompe.
 */
import { sql } from "@/lib/db/client";

export const OPERATOR_USER_ID = "operator_luis";

let _ensured = false;

/** Crea las tablas si no existen. Idempotente, una sola vez por proceso. */
export async function ensureVChatTables(): Promise<void> {
  if (_ensured) return;
  _ensured = true;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS v_chat_sessions (
        id         text PRIMARY KEY,
        user_id    text NOT NULL,
        titulo     text,
        created_at timestamptz NOT NULL DEFAULT now(),
        last_at    timestamptz NOT NULL DEFAULT now()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS v_chat_messages (
        id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id    text NOT NULL,
        session_id text NOT NULL,
        role       text NOT NULL CHECK (role IN ('user','assistant')),
        content    text NOT NULL,
        model      text,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_v_chat_messages_session
        ON v_chat_messages (session_id, created_at)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_v_chat_sessions_user
        ON v_chat_sessions (user_id, last_at DESC)
    `;
  } catch (e) {
    // No reventar el chat si el heal falla; se reintenta en el próximo proceso.
    _ensured = false;
    console.error("[v-chat] ensure tables failed:", e);
  }
}

/** Título legible del hilo a partir del primer mensaje del usuario. */
export function deriveTitle(firstUserText: string | null | undefined): string {
  const s = (firstUserText ?? "").replace(/\s+/g, " ").trim();
  if (!s) return "Conversación";
  return s.length > 60 ? `${s.slice(0, 60).trimEnd()}…` : s;
}

/** Genera un id de sesión estable y ordenable. */
export function makeVSessionId(): string {
  const rand = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  return `vs_${rand}`;
}

export interface VSession {
  id: string;
  titulo: string;
  created_at: string;
  last_at: string;
  count: number;
}

export interface VMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

/**
 * Persiste un turno completo (mensaje del usuario + respuesta de V) y mantiene
 * la sesión: la crea con título en el primer turno, luego solo refresca last_at.
 */
export async function persistVTurn(opts: {
  userId?: string;
  sessionId: string;
  userText: string;
  assistantText: string;
  model?: string | null;
}): Promise<void> {
  const userId = opts.userId || OPERATOR_USER_ID;
  const { sessionId } = opts;
  if (!sessionId) return;
  await ensureVChatTables();
  try {
    // Sesión: alta con título en el 1er turno; en los siguientes solo last_at.
    await sql`
      INSERT INTO v_chat_sessions (id, user_id, titulo, created_at, last_at)
      VALUES (${sessionId}, ${userId}, ${deriveTitle(opts.userText)}, now(), now())
      ON CONFLICT (id) DO UPDATE SET last_at = now()
    `;
    if (opts.userText?.trim()) {
      await sql`
        INSERT INTO v_chat_messages (user_id, session_id, role, content, model)
        VALUES (${userId}, ${sessionId}, 'user', ${opts.userText}, NULL)
      `;
    }
    if (opts.assistantText?.trim()) {
      await sql`
        INSERT INTO v_chat_messages (user_id, session_id, role, content, model)
        VALUES (${userId}, ${sessionId}, 'assistant', ${opts.assistantText}, ${opts.model ?? null})
      `;
    }
  } catch (e) {
    console.error("[v-chat] persist turn failed:", e);
  }
}

/** Lista las sesiones del usuario, más recientes primero. */
export async function listVSessions(
  userId = OPERATOR_USER_ID,
  limit = 40,
): Promise<VSession[]> {
  await ensureVChatTables();
  try {
    const rows = (await sql`
      SELECT s.id,
             s.titulo,
             s.created_at,
             s.last_at,
             (
               SELECT COUNT(*)::int FROM v_chat_messages m
                WHERE m.session_id = s.id
             ) AS count
        FROM v_chat_sessions s
       WHERE s.user_id = ${userId}
       ORDER BY s.last_at DESC
       LIMIT ${limit}
    `) as Array<{
      id: string;
      titulo: string | null;
      created_at: string;
      last_at: string;
      count: number;
    }>;
    return rows
      .filter((r) => r.count > 0)
      .map((r) => ({
        id: r.id,
        titulo: (r.titulo ?? "").trim() || "Conversación",
        created_at: r.created_at,
        last_at: r.last_at,
        count: r.count,
      }));
  } catch (e) {
    console.error("[v-chat] list sessions failed:", e);
    return [];
  }
}

/** Historial completo (cronológico) de una sesión, para rehidratar el chat. */
export async function getVMessages(
  sessionId: string,
  userId = OPERATOR_USER_ID,
  limit = 200,
): Promise<VMessage[]> {
  if (!sessionId) return [];
  await ensureVChatTables();
  try {
    const rows = (await sql`
      SELECT id::text, role, content, created_at
        FROM (
          SELECT id, role, content, created_at
            FROM v_chat_messages
           WHERE user_id = ${userId} AND session_id = ${sessionId}
           ORDER BY created_at DESC
           LIMIT ${limit}
        ) AS recent
       ORDER BY created_at ASC
    `) as VMessage[];
    return rows;
  } catch (e) {
    console.error("[v-chat] get messages failed:", e);
    return [];
  }
}
