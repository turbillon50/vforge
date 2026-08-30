/**
 * API portal en vivo — invitaciones de un proyecto (solo OWNER).
 *
 * Auth DENTRO del handler (esta ruta no está cubierta por el gating owner-only
 * del middleware). Responde de forma opaca: si no eres owner del proyecto →
 * 404 (no revela existencia).
 *
 *   GET  → lista invitaciones (sin token ni hash).
 *   POST → crea una invitación. Body { email?, role?, ttlHours? }.
 *          Sin correo = enlace abierto (WhatsApp). Con correo = un solo uso.
 *          Devuelve el token en claro UNA sola vez + el link de aceptación.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireLiveAccess } from "@/lib/projects/access";
import {
  listInvitations,
  createInvitation,
  getProjectViewports,
} from "@/lib/projects/live-portal";
import { isInvitableRole, type LiveRole } from "@/lib/projects/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const access = await requireLiveAccess(projectId, "owner");
  if (!access) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: noStore });
  }
  const invitations = await listInvitations(projectId);
  return NextResponse.json({ invitations }, { headers: noStore });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const access = await requireLiveAccess(projectId, "owner");
  if (!access) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: noStore });
  }

  // El proyecto debe existir realmente para colgar una invitación (FK).
  const project = await getProjectViewports(projectId);
  if (!project) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: noStore });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid_body" }, { status: 400, headers: noStore });
  }
  const { email, role, ttlHours } = body as Record<string, unknown>;

  let cleanEmail: string | null = null;
  if (typeof email === "string" && email.trim()) {
    if (!EMAIL_RE.test(email.trim()) || email.length > 254) {
      return NextResponse.json({ error: "invalid_email" }, { status: 400, headers: noStore });
    }
    cleanEmail = email.trim();
  }
  // Solo se puede invitar como observer o reviewer. `owner` (u cualquier valor
  // inválido) se RECHAZA con 400 — nunca se degrada silenciosamente. Ausente ⇒
  // observer (menor privilegio).
  let cleanRole: LiveRole;
  if (role === undefined || role === null) {
    cleanRole = "observer";
  } else if (isInvitableRole(role)) {
    cleanRole = role;
  } else {
    return NextResponse.json({ error: "invalid_role" }, { status: 400, headers: noStore });
  }
  const cleanTtl =
    typeof ttlHours === "number" && Number.isFinite(ttlHours) ? ttlHours : undefined;

  try {
    const { invitation, token } = await createInvitation({
      projectId,
      email: cleanEmail,
      role: cleanRole,
      invitedBy: access.email,
      ttlHours: cleanTtl,
    });

    const origin = req.nextUrl.origin;
    const acceptUrl = `${origin}/app/live/${encodeURIComponent(projectId)}?invite=${encodeURIComponent(token)}`;

    return NextResponse.json(
      { invitation, token, acceptUrl },
      { status: 201, headers: noStore },
    );
  } catch {
    return NextResponse.json({ error: "invite_failed" }, { status: 500, headers: noStore });
  }
}
