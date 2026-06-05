/**
 * Builder DB — builds y versiones generadas por V (modo v0-sin-v0).
 *
 * Tablas NUEVAS, creadas on-demand. NUNCA tocamos tablas existentes.
 * Flujo: design_version (tool) crea build+versión → VersionCard en el
 * chat → feedback/like/approve vía /api/builder.
 */
import { sql, queryAll, queryOne } from "@/lib/db/client";

export type BuildFile = { path: string; content: string };

export interface Build {
  id: string;
  owner_id: string;
  project_name: string;
  status: string;
  repo_full_name: string | null;
  vercel_project_id: string | null;
  approved_version: number | null;
  created_at: string;
  updated_at: string;
}

export interface BuildVersion {
  id: string;
  build_id: string;
  n: number;
  summary: string;
  files: BuildFile[];
  preview_kind: string;
  preview_url: string | null;
  feedback: string | null;
  liked: boolean | null;
  created_at: string;
}

let _ensured = false;

async function ensureTables(): Promise<void> {
  if (_ensured) return;
  await sql`
    CREATE TABLE IF NOT EXISTS vforge_builds (
      id text PRIMARY KEY,
      owner_id text,
      project_name text,
      status text DEFAULT 'drafting',
      repo_full_name text,
      vercel_project_id text,
      approved_version int,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS vforge_build_versions (
      id text PRIMARY KEY,
      build_id text,
      n int,
      summary text,
      files jsonb,
      preview_kind text DEFAULT 'inline',
      preview_url text,
      feedback text,
      liked boolean,
      created_at timestamptz DEFAULT now()
    )
  `;
  _ensured = true;
}

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

export async function createBuild(
  ownerId: string,
  projectName: string,
): Promise<Build> {
  await ensureTables();
  const id = newId("bld");
  const rows = await queryAll<Build>(
    `INSERT INTO vforge_builds (id, owner_id, project_name)
     VALUES ($1, $2, $3) RETURNING *`,
    [id, ownerId, projectName],
  );
  return rows[0];
}

export async function setBuildStatus(
  buildId: string,
  status: string,
): Promise<void> {
  await ensureTables();
  await sql`UPDATE vforge_builds SET status = ${status}, updated_at = now() WHERE id = ${buildId}`;
}

export async function getBuild(buildId: string): Promise<Build | null> {
  await ensureTables();
  return queryOne<Build>(`SELECT * FROM vforge_builds WHERE id = $1`, [
    buildId,
  ]);
}

/** Busca el build más reciente del owner por nombre (para iterar versiones). */
export async function findBuildByName(
  ownerId: string,
  projectName: string,
): Promise<Build | null> {
  await ensureTables();
  return queryOne<Build>(
    `SELECT * FROM vforge_builds
      WHERE owner_id = $1 AND project_name = $2
      ORDER BY created_at DESC LIMIT 1`,
    [ownerId, projectName],
  );
}

export async function addVersion(
  buildId: string,
  summary: string,
  files: BuildFile[],
): Promise<BuildVersion> {
  await ensureTables();
  const id = newId("ver");
  const rows = await queryAll<BuildVersion>(
    `INSERT INTO vforge_build_versions (id, build_id, n, summary, files)
     VALUES (
       $1, $2,
       COALESCE((SELECT MAX(n) FROM vforge_build_versions WHERE build_id = $2), 0) + 1,
       $3, $4::jsonb
     ) RETURNING *`,
    [id, buildId, summary, JSON.stringify(files)],
  );
  await sql`UPDATE vforge_builds SET updated_at = now() WHERE id = ${buildId}`;
  return rows[0];
}

export async function listVersions(buildId: string): Promise<BuildVersion[]> {
  await ensureTables();
  return queryAll<BuildVersion>(
    `SELECT * FROM vforge_build_versions WHERE build_id = $1 ORDER BY n ASC`,
    [buildId],
  );
}

export async function getVersion(
  versionId: string,
): Promise<BuildVersion | null> {
  await ensureTables();
  return queryOne<BuildVersion>(
    `SELECT * FROM vforge_build_versions WHERE id = $1`,
    [versionId],
  );
}

export async function setFeedback(
  versionId: string,
  feedback: string | null,
  liked?: boolean | null,
): Promise<BuildVersion | null> {
  await ensureTables();
  const rows = await queryAll<BuildVersion>(
    `UPDATE vforge_build_versions
        SET feedback = COALESCE($2, feedback),
            liked = COALESCE($3, liked)
      WHERE id = $1 RETURNING *`,
    [versionId, feedback, liked ?? null],
  );
  return rows[0] ?? null;
}

export async function approveVersion(
  buildId: string,
  n: number,
): Promise<Build | null> {
  await ensureTables();
  const rows = await queryAll<Build>(
    `UPDATE vforge_builds
        SET approved_version = $2, status = 'approved', updated_at = now()
      WHERE id = $1 RETURNING *`,
    [buildId, n],
  );
  return rows[0] ?? null;
}
