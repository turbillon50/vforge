/**
 * API portal en vivo — aceptar invitación (usuario autenticado).
 *
 * POST Body { token }. Requiere sesión de Clerk. Valida hash → estado →
 * expiración → que el email de la invitación coincida con el de la sesión, y
 * que sea de uso único. Respuestas opacas: no distingue "no existe" de
 * "expiró/usada/otro email" — todo cae en un 400 genérico salvo el caso feliz.
 */
import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { acceptInvitation } from "@/lib/projects/live-portal";
import { sanitizeToken } from "@/lib/projects/invite-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

export async function POST(req: NextRequest) {
  let user: Awaited<ReturnType<typeof currentUser>> = null;
  try {
    user = await currentUser();
  } catch {
    user = null;
  }
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: noStore });
  }
  const email = user.emailAddresses?.[0]?.emailAddress?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "no_email" }, { status: 400, headers: noStore });
  }

  const body = await req.json().catch(() => null);
  const token = sanitizeToken((body as Record<string, unknown> | null)?.token);
  if (!token) {
    return NextResponse.json({ error: "invalid_invite" }, { status: 400, headers: noStore });
  }

  const result = await acceptInvitation({
    token,
    sessionEmail: email,
    clerkUserId: user.id,
  }).catch(() => ({ ok: false as const, reason: "invalid" as const }));

  if (!result.ok) {
    // Opaco: un solo estado de error para cualquier motivo de rechazo.
    return NextResponse.json({ error: "invalid_invite" }, { status: 400, headers: noStore });
  }

  return NextResponse.json(
    { ok: true, projectId: result.projectId, role: result.role },
    { headers: noStore },
  );
}
