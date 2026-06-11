/**
 * API Invitaciones — aceptar.
 *
 * POST — el usuario logueado acepta una invitación a un proyecto.
 *        Body { project_id }. Busca project_members por su email + project_id.
 *        Si status='invited' → status='active', accepted_at=now(),
 *        clerk_user_id = user.id. Si no existe invitación → 404.
 */
import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { queryOne } from "@/lib/db/client";

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

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const email = user.emailAddresses?.[0]?.emailAddress ?? null;
    if (!email) {
      return NextResponse.json(
        { error: "Tu cuenta no tiene un email asociado" },
        { status: 400 },
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Body inválido" }, { status: 400 });
    }

    const { project_id } = body as Record<string, unknown>;
    if (typeof project_id !== "string" || !project_id.trim()) {
      return NextResponse.json(
        { error: "project_id requerido" },
        { status: 400 },
      );
    }

    const member = await queryOne<ProjectMember>(
      `SELECT * FROM project_members
       WHERE email = $1 AND project_id = $2`,
      [email.trim().toLowerCase(), project_id.trim()],
    );

    if (!member || member.status !== "invited") {
      return NextResponse.json(
        { error: "No tienes una invitación pendiente para este proyecto" },
        { status: 404 },
      );
    }

    const membership = await queryOne<ProjectMember>(
      `UPDATE project_members
       SET status = 'active', accepted_at = now(), clerk_user_id = $1
       WHERE id = $2
       RETURNING *`,
      [user.id, member.id],
    );

    return NextResponse.json({ membership });
  } catch (err) {
    console.error("[invitations/accept] POST error:", err);
    return NextResponse.json(
      { error: "No se pudo aceptar la invitación" },
      { status: 500 },
    );
  }
}
