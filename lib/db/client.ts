/**
 * Neon Postgres client for vForge.
 *
 * Uses @neondatabase/serverless which works in both Edge Runtime
 * (HTTP/WebSocket) and Node Runtime (TCP). The HTTP transport is the
 * safe default since some environments block outbound 5432.
 *
 * Lazy-initialized so that build-time page-data collection doesn't
 * crash when DATABASE_URL is absent (e.g. in CI without prod env).
 */
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let _sql: NeonQueryFunction<false, false> | null = null;

function getSql(): NeonQueryFunction<false, false> {
  if (_sql) return _sql;
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }
  _sql = neon(databaseUrl);
  return _sql;
}

/**
 * Tagged-template SQL — only call at request time, never at module load.
 *
 *   const rows = await sql`SELECT * FROM users WHERE id = ${id}`
 */
export const sql: NeonQueryFunction<false, false> = new Proxy(
  (() => {}) as unknown as NeonQueryFunction<false, false>,
  {
    apply(_target, _thisArg, args: unknown[]) {
      // Tagged-template call signature: sql`...`
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (getSql() as any)(...args);
    },
    get(_target, prop: string) {
      // Forward .query and other methods
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (getSql() as any)[prop];
    },
  },
);

/**
 * Helper for typed query results when you need a single row.
 */
export async function queryOne<T = Record<string, unknown>>(
  query: string,
  params: unknown[] = [],
): Promise<T | null> {
  const rows = (await getSql().query(query, params)) as T[];
  return rows[0] ?? null;
}

/**
 * Helper for typed query results when you need multiple rows.
 */
export async function queryAll<T = Record<string, unknown>>(
  query: string,
  params: unknown[] = [],
): Promise<T[]> {
  const rows = (await getSql().query(query, params)) as T[];
  return rows;
}
