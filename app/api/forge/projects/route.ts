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

export async function GET() {
  try {
    const projects = (await sql`
      SELECT id, name, description, repo_url, vercel_project_id, created_at, updated_at
      FROM projects
      WHERE owner_id = ${OPERATOR_ID}
      ORDER BY updated_at DESC
    `) as Project[];

    return NextResponse.json({ projects });
  } catch (err) {
    console.error("[forge/projects GET]", err);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description = "" } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'name'" },
        { status: 400 }
      );
    }

    const [project] = (await sql`
      INSERT INTO projects (name, description, owner_id)
      VALUES (${name}, ${description}, ${OPERATOR_ID})
      RETURNING id, name, description, repo_url, vercel_project_id, created_at, updated_at
    `) as Project[];

    return NextResponse.json(project, { status: 201 });
  } catch (err) {
    console.error("[forge/projects POST]", err);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}
