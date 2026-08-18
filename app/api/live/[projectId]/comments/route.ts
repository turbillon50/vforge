/**
 * API portal en vivo — comentarios de un proyecto.
 *
 * Auth DENTRO del handler (requireLiveAccess, fail-closed). Cualquier miembro
 * activo (observer+) puede leer y comentar. Aislado por project_id.
 *
 *   GET  → lista comentarios (recientes primero).
 *   POST → crea un comentario. Body { body }. Valida tamaño.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireLiveAccess } from "@/lib/projects/access";
import { listComments, createComment } from "@/lib/projects/live-portal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };
const MAX_BODY = 4000;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const access = await requireLiveAccess(projectId);
  if (!access) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: noStore });
  }
  const comments = await listComments(projectId);
  return NextResponse.json({ comments }, { headers: noStore });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const access = await requireLiveAccess(projectId);
  if (!access) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: noStore });
  }

  const payload = await req.json().catch(() => null);
  const raw = (payload as Record<string, unknown> | null)?.body;
  if (typeof raw !== "string" || !raw.trim()) {
    return NextResponse.json({ error: "empty" }, { status: 400, headers: noStore });
  }
  if (raw.length > MAX_BODY) {
    return NextResponse.json({ error: "too_long" }, { status: 413, headers: noStore });
  }

  const comment = await createComment({
    projectId,
    authorEmail: access.email,
    authorName: access.name,
    authorClerkId: access.clerkUserId,
    body: raw,
  });
  if (!comment) {
    return NextResponse.json({ error: "empty" }, { status: 400, headers: noStore });
  }
  return NextResponse.json({ comment }, { status: 201, headers: noStore });
}
