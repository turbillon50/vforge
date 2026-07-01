// lib/db/index.ts - Neon Postgres connection
import { neon } from "@neondatabase/serverless";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _sql = neon(process.env.DATABASE_URL!) as any;

export const sql = _sql;

export async function query<T = unknown>(
  q: string,
  params: unknown[] = []
): Promise<T[]> {
  return _sql(q, params) as Promise<T[]>;
}

export async function queryOne<T = unknown>(
  q: string,
  params: unknown[] = []
): Promise<T | null> {
  const rows = await query<T>(q, params);
  return rows[0] ?? null;
}

