/**
 * API Portal Cliente — detalle de UN proyecto (read-only).
 *
 * GET — valida que el usuario actual sea miembro ACTIVO del proyecto.
 *   Si no lo es → 403. Si lo es, devuelve:
 *     - project: datos del proyecto
 *     - timeline: project_timeline ordenado por position
 *     - integrations: project_integrations del proyecto
 */
import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { queryAll, queryOne } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProjectDetail = {
  id: string;
  name: string;
  status: string;
  github_repo: string | null;
  vercel_url: string | null;
  domain: string | null;
};

type TimelineRow = {
  id: string;
  stage: string;
  status: string;
  title: string;
  detail: string | null;
  position: number;
  created_at: string;
  updated_at: string;
};

type IntegrationRow = {
  id: string;
  kind: string;
  label: string;
  status: string;
  meta: unknown;
  created_at: string;
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress;

  if (!email) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  // Gate: el usuario debe ser miembro ACTIVO de ESTE proyecto.
  const membership = await queryOne<{ project_id: string }>(
    `SELECT project_id
       FROM project_members
      WHERE project_id = $1
        AND lower(email) = lower($2)
        AND status = 'active'
      LIMIT 1`,
    [id, email],
  );

  if (!membership) {
    return NextResponse.json(
      { error: "forbidden" },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  const project = await queryOne<ProjectDetail>(
    `SELECT id, name, status, github_repo, vercel_url, domain
       FROM projects
      WHERE id = $1
      LIMIT 1`,
    [id],
  );

  if (!project) {
    return NextResponse.json(
      { error: "not_found" },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  const timeline = await queryAll<TimelineRow>(
    `SELECT id, stage, status, title, detail, position, created_at, updated_at
       FROM project_timeline
      WHERE project_id = $1
      ORDER BY position ASC, created_at ASC`,
    [id],
  );

  const integrations = await queryAll<IntegrationRow>(
    `SELECT id, kind, label, status, meta, created_at
       FROM project_integrations
      WHERE project_id = $1
      ORDER BY created_at ASC`,
    [id],
  );

  return NextResponse.json(
    { project, timeline, integrations },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
