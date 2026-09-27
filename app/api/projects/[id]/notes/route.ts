/**
 * /api/projects/[id]/notes — comentarios con fecha de la fábrica (owner-only).
 * GET    → lista (más nuevos primero)
 * POST   { body } → agrega uno firmado con el correo de quien lo escribe
 * DELETE ?note=<id> → borra uno
 */
import { currentUser } from "@clerk/nextjs/server";
import { queryAll, queryOne } from "@/lib/db/client";
import { isOwnerUser } from "@/lib/auth/owner";
import { ensureDeliveryColumns } from "@/lib/projects/delivery-meta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Note = { id: string; body: string; author_email: string | null; created_at: string };

async function owner() {
  const user = await currentUser().catch(() => null);
  if (!user) return { ok: false as const, status: 401 };
  if (!isOwnerUser(user)) return { ok: false as const, status: 403 };
  return { ok: true as const, email: user.emailAddresses?.[0]?.emailAddress ?? null };
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const who = await owner();
  if (!who.ok) return Response.json({ error: "forbidden" }, { status: who.status });
  const { id } = await params;
  await ensureDeliveryColumns();
  const notes = await queryAll<Note>(
    `SELECT id::text, body, author_email, created_at
       FROM project_notes WHERE project_id = $1
      ORDER BY created_at DESC LIMIT 200`,
    [id],
  );
  return Response.json({ notes }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const who = await owner();
  if (!who.ok) return Response.json({ error: "forbidden" }, { status: who.status });
  const { id } = await params;
  const payload = (await req.json().catch(() => null)) as { body?: unknown } | null;
  const body = typeof payload?.body === "string" ? payload.body.trim().slice(0, 2000) : "";
  if (!body) return Response.json({ error: "empty" }, { status: 400 });

  await ensureDeliveryColumns();
  const exists = await queryOne<{ id: string }>(`SELECT id FROM projects WHERE id = $1`, [id]);
  if (!exists) return Response.json({ error: "not_found" }, { status: 404 });

  const note = await queryOne<Note>(
    `INSERT INTO project_notes (project_id, body, author_email)
     VALUES ($1, $2, $3)
     RETURNING id::text, body, author_email, created_at`,
    [id, body, who.email],
  );
  await queryAll(`UPDATE projects SET updated_at = now() WHERE id = $1`, [id]);
  return Response.json({ note }, { status: 201 });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const who = await owner();
  if (!who.ok) return Response.json({ error: "forbidden" }, { status: who.status });
  const { id } = await params;
  const noteId = new URL(req.url).searchParams.get("note");
  if (!noteId || !/^\d+$/.test(noteId)) {
    return Response.json({ error: "missing_note" }, { status: 400 });
  }
  await ensureDeliveryColumns();
  const gone = await queryOne<{ id: string }>(
    `DELETE FROM project_notes WHERE id = $1 AND project_id = $2 RETURNING id::text`,
    [noteId, id],
  );
  if (!gone) return Response.json({ error: "not_found" }, { status: 404 });
  return Response.json({ ok: true });
}
