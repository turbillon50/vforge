/**
 * API Invitaciones — owner invita clientes a un proyecto.
 *
 * POST  — (solo owner) invita un email a un proyecto con un rol.
 *         Body { project_id, email, role? }. role default 'viewer'.
 *         Inserta en project_members (status='invited'). Si ya existe
 *         (project_id + email): actualiza el rol. Devuelve la invitación.
 * GET   — (solo owner) ?project_id=X → lista los miembros del proyecto.
 */
import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { queryAll, queryOne } from "@/lib/db/client";
import { isOwnerEmail } from "@/lib/auth/owner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProjectMember = {
  id: string;
  project_id: string;
  user_id: string | null;
  clerk_user_id: string | null;
  email: string;
  role: string;
  invited_by: string | null;
  invited_at: string;
  accepted_at: string | null;
  status: string;
};

const VALID_ROLES = ["owner", "editor", "viewer"];

async function getOwnerEmail(): Promise<string | null> {
  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress ?? null;
  return isOwnerEmail(email) ? email : null;
}

export async function GET(req: NextRequest) {
  try {
    const ownerEmail = await getOwnerEmail();
    if (!ownerEmail) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const projectId = req.nextUrl.searchParams.get("project_id");
    if (!projectId) {
      return NextResponse.json(
        { error: "project_id requerido" },
        { status: 400 },
      );
    }

    const members = await queryAll<ProjectMember>(
      `SELECT * FROM project_members
       WHERE project_id = $1
       ORDER BY invited_at DESC`,
      [projectId],
    );

    return NextResponse.json({ members });
  } catch (err) {
    console.error("[invitations] GET error:", err);
    return NextResponse.json(
      { error: "No se pudieron cargar los miembros" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const ownerEmail = await getOwnerEmail();
    if (!ownerEmail) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Body inválido" }, { status: 400 });
    }

    const { project_id, email, role } = body as Record<string, unknown>;

    if (typeof project_id !== "string" || !project_id.trim()) {
      return NextResponse.json(
        { error: "project_id requerido" },
        { status: 400 },
      );
    }
    if (typeof email !== "string" || !email.trim()) {
      return NextResponse.json({ error: "email requerido" }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanRole =
      typeof role === "string" && VALID_ROLES.includes(role) ? role : "viewer";

    const existing = await queryOne<ProjectMember>(
      `SELECT * FROM project_members
       WHERE project_id = $1 AND email = $2`,
      [project_id.trim(), cleanEmail],
    );

    let invitation: ProjectMember | null;

    if (existing) {
      invitation = await queryOne<ProjectMember>(
        `UPDATE project_members
         SET role = $1
         WHERE project_id = $2 AND email = $3
         RETURNING *`,
        [cleanRole, project_id.trim(), cleanEmail],
      );
    } else {
      invitation = await queryOne<ProjectMember>(
        `INSERT INTO project_members
          (project_id, email, role, status, invited_by, invited_at)
         VALUES ($1, $2, $3, 'invited', $4, now())
         RETURNING *`,
        [project_id.trim(), cleanEmail, cleanRole, ownerEmail],
      );
    }

    return NextResponse.json(
      { invitation },
      { status: existing ? 200 : 201 },
    );
  } catch (err) {
    console.error("[invitations] POST error:", err);
    return NextResponse.json(
      { error: "No se pudo crear la invitación" },
      { status: 500 },
    );
  }
}
