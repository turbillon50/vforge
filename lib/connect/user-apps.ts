import { neon } from "@neondatabase/serverless";

export interface UserApp {
  id: string; name: string; repo_url: string | null; deploy_url: string | null; template: string | null; created_at: string;
}

async function ensure(sql: ReturnType<typeof neon>) {
  await sql`CREATE TABLE IF NOT EXISTS user_apps (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id text NOT NULL,
    name text NOT NULL,
    repo_url text,
    deploy_url text,
    template text,
    created_at timestamptz DEFAULT now()
  )`;
}

/** Guarda una app creada por el usuario (best-effort). */
export async function saveUserApp(userId: string, app: { name: string; repo_url?: string | null; deploy_url?: string | null; template?: string | null }): Promise<void> {
  const dburl = process.env.DATABASE_URL; if (!dburl) return;
  const sql = neon(dburl); await ensure(sql);
  await sql`INSERT INTO user_apps (user_id, name, repo_url, deploy_url, template)
            VALUES (${userId}, ${app.name}, ${app.repo_url ?? null}, ${app.deploy_url ?? null}, ${app.template ?? null})`;
}

/** Lista las apps del usuario (su tenant). */
export async function listUserApps(userId: string): Promise<UserApp[]> {
  const dburl = process.env.DATABASE_URL; if (!dburl) return [];
  const sql = neon(dburl); await ensure(sql);
  const rows = await sql`SELECT id, name, repo_url, deploy_url, template, created_at
    FROM user_apps WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT 50`;
  return rows as UserApp[];
}
