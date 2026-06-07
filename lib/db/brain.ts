/**
 * Cliente Neon hacia el "brain" centralizado del ecosistema (neon-brain).
 *
 * Es una base de datos DISTINTA a la operativa de la app (DATABASE_URL):
 * aquí viven `brain_files` (memoria semántica leída por cualquier chat/agente
 * Claude) y `mp_events`. El webhook de Mercado Pago escribe aquí para que el
 * último pago quede disponible en la memoria común.
 *
 * Connection string en env BRAIN_DATABASE_URL. Cae a DATABASE_URL si no está.
 * Lazy-init para no romper el build cuando la env falta.
 */
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let _brain: NeonQueryFunction<false, false> | null = null;

function getBrain(): NeonQueryFunction<false, false> {
  if (_brain) return _brain;
  const url = process.env.BRAIN_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error("BRAIN_DATABASE_URL (ni DATABASE_URL) está configurada");
  }
  _brain = neon(url);
  return _brain;
}

/**
 * Tagged-template SQL contra el brain — solo en tiempo de request.
 *
 *   const rows = await brainSql`SELECT * FROM brain_files WHERE name = ${n}`
 */
export const brainSql: NeonQueryFunction<false, false> = new Proxy(
  (() => {}) as unknown as NeonQueryFunction<false, false>,
  {
    apply(_t, _this, args: unknown[]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (getBrain() as any)(...args);
    },
    get(_t, prop: string) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (getBrain() as any)[prop];
    },
  },
);

/**
 * Helper de consulta parametrizada contra el brain (varias filas).
 * Mismo contrato que queryAll de lib/db/client pero apuntando a BRAIN_DATABASE_URL.
 */
export async function brainQueryAll<T = Record<string, unknown>>(
  query: string,
  params: unknown[] = [],
): Promise<T[]> {
  return (await getBrain().query(query, params)) as T[];
}

let _ensured = false;

/**
 * Garantiza la tabla mp_events en el brain. Idempotente, una vez por proceso.
 * brain_files ya existe en el brain; no se toca su esquema aquí.
 */
export async function ensureBrainTables(): Promise<void> {
  if (_ensured) return;
  _ensured = true;
  try {
    await brainSql`
      CREATE TABLE IF NOT EXISTS mp_events (
        id          text PRIMARY KEY,
        type        text,
        action      text,
        data_id     text,
        live_mode   boolean,
        raw         jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at  timestamptz NOT NULL DEFAULT now()
      )
    `;
    await brainSql`CREATE INDEX IF NOT EXISTS idx_mp_events_data_id ON mp_events (data_id)`;
    await brainSql`CREATE INDEX IF NOT EXISTS idx_mp_events_created_at ON mp_events (created_at DESC)`;
  } catch (e) {
    console.error("[brain] ensureBrainTables falló:", e);
  }
}
