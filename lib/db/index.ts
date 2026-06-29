// lib/db/index.ts — Punto de conexión único a Neon Postgres
import { neon } from "@neondatabase/serverless";

export const sql = neon(process.env.DATABASE_URL!);

export async function query<T = unknown>(
  q: string,
  params: unknown[] = []
): Promise<T[]> {
  return sql(q, params) as Promise<T[]>;
}

export async function queryOne<T = unknown>(
  q: string,
  params: unknown[] = []
): Promise<T | null> {
  const rows = await query<T>(q, params);
  return rows[0] ?? null;
}
