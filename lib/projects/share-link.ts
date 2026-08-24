/**
 * Link permanente de revisión por proyecto — SERVER ONLY.
 * Sin email, sin caducidad, sin revocación (es “su” proyecto).
 * Quien tiene el token ve solo ese proyecto como observador.
 */
import "server-only";
import { randomBytes } from "crypto";
import { queryOne, queryAll } from "@/lib/db/client";
import { resolveProjectViewportUrls } from "@/lib/projects/viewport-url";

let tableReady = false;

async function ensureTable() {
  if (tableReady) return;
  await queryAll(
    `CREATE TABLE IF NOT EXISTS project_share_links (
       project_id text PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
       token text NOT NULL UNIQUE,
       created_at timestamptz NOT NULL DEFAULT now()
     )`,
  );
  tableReady = true;
}

function newToken(): string {
  return randomBytes(24).toString("base64url");
}

/** Owner: obtiene o crea el link permanente del proyecto. */
export async function getOrCreateShareLink(projectId: string): Promise<string> {
  await ensureTable();
  const existing = await queryOne<{ token: string }>(
    `SELECT token FROM project_share_links WHERE project_id = $1 LIMIT 1`,
    [projectId],
  );
  if (existing?.token) return existing.token;

  const token = newToken();
  const row = await queryOne<{ token: string }>(
    `INSERT INTO project_share_links (project_id, token)
     VALUES ($1, $2)
     ON CONFLICT (project_id) DO UPDATE SET token = project_share_links.token
     RETURNING token`,
    [projectId, token],
  );
  if (!row?.token) throw new Error("share_link_failed");
  return row.token;
}

export interface ShareProject {
  id: string;
  name: string;
  status: string;
  desktop_url: string | null;
  mobile_url: string | null;
  admin_url: string | null;
  vercel_url: string | null;
  domain: string | null;
}

/** Público: resuelve token → proyecto (solo datos de preview). */
export async function resolveShareToken(
  token: string,
): Promise<ShareProject | null> {
  const clean = token?.trim();
  if (!clean || clean.length < 16 || clean.length > 128) return null;
  await ensureTable();

  const project = await queryOne<ShareProject>(
    `SELECT p.id, p.name, p.status, p.desktop_url, p.mobile_url, p.admin_url,
            p.vercel_url, p.domain
       FROM project_share_links s
       JOIN projects p ON p.id = s.project_id
      WHERE s.token = $1
      LIMIT 1`,
    [clean],
  );
  if (!project) return null;
  return {
    ...project,
    ...resolveProjectViewportUrls(project),
  };
}
