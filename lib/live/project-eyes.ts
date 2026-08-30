import { queryAll, queryOne, sql } from "@/lib/db/client";
import { parseEyeImage } from "./see-page";

const KEEP_PLUGIN = 8;

export interface ProjectEye {
  id: string;
  project_id: string;
  source: string;
  viewport: string | null;
  url: string | null;
  selector: string | null;
  note: string | null;
  mime_type: "image/png" | "image/jpeg";
  data_b64: string;
  created_at: string;
}

let ensured = false;

export async function ensureProjectEyesTable(): Promise<void> {
  if (ensured) return;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS project_eyes (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id text NOT NULL,
        source text NOT NULL DEFAULT 'plugin',
        viewport text,
        url text,
        selector text,
        note text,
        mime_type text NOT NULL DEFAULT 'image/jpeg',
        data_b64 text NOT NULL,
        created_at timestamptz DEFAULT now()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_project_eyes_project ON project_eyes (project_id, created_at DESC)`;
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error ? String((error as { code?: unknown }).code) : "";
    if (code !== "23505") throw error;
  }
  ensured = true;
}

export async function saveProjectEye(input: {
  projectId: string;
  source?: string;
  viewport?: string | null;
  url?: string | null;
  selector?: string | null;
  note?: string | null;
  image: string;
}): Promise<ProjectEye> {
  await ensureProjectEyesTable();
  const parsed = parseEyeImage(input.image);
  if (!parsed) throw new Error("imagen inválida");
  const source = (input.source || "plugin").slice(0, 40);
  const viewport = input.viewport?.slice(0, 40) || null;
  const row = await queryOne<ProjectEye>(
    `INSERT INTO project_eyes (project_id, source, viewport, url, selector, note, mime_type, data_b64)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING id::text, project_id, source, viewport, url, selector, note, mime_type, data_b64, created_at::text`,
    [
      input.projectId,
      source,
      viewport,
      input.url?.slice(0, 500) || null,
      input.selector?.slice(0, 300) || null,
      input.note?.slice(0, 500) || null,
      parsed.mimeType,
      parsed.data,
    ],
  );
  if (!row) throw new Error("no se guardó la foto");
  if (source === "visor" && viewport) {
    await sql`
      DELETE FROM project_eyes
       WHERE project_id = ${input.projectId}
         AND source = 'visor'
         AND viewport = ${viewport}
         AND id <> ${row.id}::uuid
    `;
  } else if (source !== "visor") {
    await sql`
      DELETE FROM project_eyes
       WHERE project_id = ${input.projectId}
         AND source <> 'visor'
         AND id NOT IN (
           SELECT id FROM project_eyes
            WHERE project_id = ${input.projectId}
              AND source <> 'visor'
            ORDER BY created_at DESC
            LIMIT ${KEEP_PLUGIN}
         )
    `;
  }
  return row;
}

export async function listProjectEyes(projectId: string, limit = 4): Promise<ProjectEye[]> {
  await ensureProjectEyesTable();
  const cap = Math.min(KEEP_PLUGIN, Math.max(1, Math.floor(limit)));
  return queryAll<ProjectEye>(
    `SELECT id::text, project_id, source, viewport, url, selector, note, mime_type, data_b64, created_at::text
       FROM project_eyes
      WHERE project_id = $1
        AND source <> 'visor'
      ORDER BY created_at DESC
      LIMIT $2`,
    [projectId, cap],
  ).catch(() => []);
}

export async function listVisorEyes(projectId: string): Promise<ProjectEye[]> {
  await ensureProjectEyesTable();
  const rows = await queryAll<ProjectEye>(
    `SELECT DISTINCT ON (viewport)
            id::text, project_id, source, viewport, url, selector, note, mime_type, data_b64, created_at::text
       FROM project_eyes
      WHERE project_id = $1
        AND source = 'visor'
      ORDER BY viewport, created_at DESC`,
    [projectId],
  ).catch(() => []);
  const order = ["desktop", "mobile", "admin"];
  return [...rows].sort(
    (a, b) => order.indexOf(a.viewport || "") - order.indexOf(b.viewport || ""),
  );
}

export async function listExpedienteEyes(projectId: string): Promise<ProjectEye[]> {
  const [visor, plugin] = await Promise.all([
    listVisorEyes(projectId),
    listProjectEyes(projectId, 4),
  ]);
  return [...visor, ...plugin];
}
