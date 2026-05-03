import { queryAll } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ProjectRow {
  id: string;
  name: string;
  category: string;
  status: string;
  github_repo: string | null;
  vercel_url: string | null;
}

/**
 * GET /api/projects
 *
 * Returns the live catalog from the projects table for UI selectors
 * and dashboards. Replaces the static lib/mock-data.ts PROJECTS.
 */
export async function GET() {
  const rows = await queryAll<ProjectRow>(
    `SELECT id, name, category, status, github_repo, vercel_url
       FROM projects
       ORDER BY
         CASE category
           WHEN 'produccion' THEN 1
           WHEN 'activo' THEN 2
           WHEN 'en_revision' THEN 3
           WHEN 'en_pausa' THEN 4
           WHEN 'archivo' THEN 5
           WHEN 'pendiente_borrado' THEN 6
           ELSE 99
         END,
         name`,
  );
  return new Response(JSON.stringify({ projects: rows }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
