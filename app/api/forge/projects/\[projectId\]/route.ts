import { sql } from "@/lib/db/client";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OPERATOR_ID = "operator_luis";

interface Project {
  id: string;
  name: string;
  description: string;
  repo_url: string | null;
  vercel_project_id: string | null;
  created_at: string;
  updated_at: string;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const projectId = params.projectId;

    const project = (await sql`
      SELECT id, name, description, repo_url, vercel_project_id, created_at, updated_at
      FROM projects
      WHERE id = ${projectId} AND owner_id = ${OPERATOR_ID}
    `) as Project[];

    if (project.length === 0) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json(project[0]);
  } catch (err) {
    console.error("[forge/projects/[id] GET]", err);
    return NextResponse.json(
      { error: "Failed to fetch project" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const projectId = params.projectId;
    const body = await req.json();
    const { name, description, repo_url, vercel_project_id } = body;

    const project = (await sql`
      UPDATE projects
      SET
        name = COALESCE(${name || null}, name),
        description = COALESCE(${description || null}, description),
        repo_url = COALESCE(${repo_url || null}, repo_url),
        vercel_project_id = COALESCE(${vercel_project_id || null}, vercel_project_id),
        updated_at = now()
      WHERE id = ${projectId} AND owner_id = ${OPERATOR_ID}
      RETURNING id, name, description, repo_url, vercel_project_id, created_at, updated_at
    `) as Project[];

    if (project.length === 0) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json(project[0]);
  } catch (err) {
    console.error("[forge/projects/[id] PUT]", err);
    return NextResponse.json(
      { error: "Failed to update project" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const projectId = params.projectId;

    const result = await sql`
      DELETE FROM projects
      WHERE id = ${projectId} AND owner_id = ${OPERATOR_ID}
    `;

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[forge/projects/[id] DELETE]", err);
    return NextResponse.json(
      { error: "Failed to delete project" },
      { status: 500 }
    );
  }
}
