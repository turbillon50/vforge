/**
 * API Portal Cliente — lista de proyectos del usuario actual (read-only).
 *
 * GET — devuelve los proyectos donde el usuario es miembro ACTIVO.
 *   Match por email (project_members.email = email del usuario en Clerk)
 *   y status = 'active'. Join con projects para los datos del proyecto.
 */
import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { queryAll } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MyProjectRow = {
  project_id: string;
  member_role: string;
  name: string;
  status: string;
  github_repo: string | null;
  vercel_url: string | null;
  domain: string | null;
};

export async function GET() {
  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress;

  if (!email) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const rows = await queryAll<MyProjectRow>(
    `SELECT pm.project_id     AS project_id,
            pm.role           AS member_role,
            p.name            AS name,
            p.status          AS status,
            p.github_repo     AS github_repo,
            p.vercel_url      AS vercel_url,
            p.domain          AS domain
       FROM project_members pm
       JOIN projects p ON p.id = pm.project_id
      WHERE lower(pm.email) = lower($1)
        AND pm.status = 'active'
      ORDER BY p.name ASC`,
    [email],
  );

  return NextResponse.json(
    { projects: rows },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
