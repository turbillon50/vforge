/**
 * API Invitaciones — revocar.
 *
 * DELETE — (solo owner) revoca una membresía/invitación por id.
 *          Marca status='revoked'. Devuelve la membresía actualizada.
 */
import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { queryOne } from "@/lib/db/client";
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

async function getOwnerEmail(): Promise<string | null> {
  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress ?? null;
  return isOwnerEmail(email) ? email : null;
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ownerEmail = await getOwnerEmail();
    if (!ownerEmail) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "id requerido" }, { status: 400 });
    }

    const membership = await queryOne<ProjectMember>(
      `UPDATE project_members
       SET status = 'revoked'
       WHERE id = $1
       RETURNING *`,
      [id],
    );

    if (!membership) {
      return NextResponse.json(
        { error: "Membresía no encontrada" },
        { status: 404 },
      );
    }

    return NextResponse.json({ membership });
  } catch (err) {
    console.error("[invitations/[id]] DELETE error:", err);
    return NextResponse.json(
      { error: "No se pudo revocar la invitación" },
      { status: 500 },
    );
  }
}
