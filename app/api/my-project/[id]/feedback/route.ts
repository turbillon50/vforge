/**
 * POST /api/my-project/[id]/feedback
 *
 * El cliente deja un comentario o una sugerencia desde su portal.
 * Body JSON: { kind?: 'comment' | 'suggestion', body: string }
 *
 * Guarda en project_feedback y avisa a Luis por WhatsApp. Sólo miembros
 * ACTIVOS del proyecto.
 */
import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db/client";
import { requireMember } from "@/lib/projects/membership";
import { notifyOwner } from "@/lib/whatsapp/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const member = await requireMember(id);
  if (!member) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const json = (await req.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  const text = typeof json?.body === "string" ? json.body.trim() : "";
  const kind = json?.kind === "suggestion" ? "suggestion" : "comment";
  if (!text) {
    return NextResponse.json({ error: "Escribe un mensaje" }, { status: 400 });
  }
  if (text.length > 2000) {
    return NextResponse.json({ error: "Mensaje muy largo" }, { status: 400 });
  }

  const row = await queryOne<{ id: string; created_at: string }>(
    `INSERT INTO project_feedback (project_id, author_email, author_name, kind, body)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, created_at`,
    [id, member.email, member.name, kind, text],
  );

  const project = await queryOne<{ name: string }>(
    `SELECT name FROM projects WHERE id = $1`,
    [id],
  );
  notifyOwner(
    `💬 ${kind === "suggestion" ? "Sugerencia" : "Comentario"} en ${project?.name ?? id}\nDe: ${member.name}\n"${text}"`,
  ).catch(() => null);

  return NextResponse.json(
    {
      feedback: {
        id: row?.id,
        kind,
        body: text,
        author_name: member.name,
        author_email: member.email,
        created_at: row?.created_at,
      },
    },
    { status: 201 },
  );
}
