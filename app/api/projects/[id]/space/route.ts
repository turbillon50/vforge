import { resolveRequestOwner } from "@/lib/auth/request-owner";
import { queryOne, sql } from "@/lib/db/client";
import { spaceSchema, EMPTY_SPACE } from "@/lib/spaces/model";

export const dynamic = "force-dynamic";
async function access(id: string) {
  const who = await resolveRequestOwner();
  if (!who.userId) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!who.isOwner) return Response.json({ error: "forbidden" }, { status: 403 });
  if (!await queryOne("SELECT id FROM projects WHERE id = $1", [id])) return Response.json({ error: "not_found" }, { status: 404 });
  await sql`CREATE TABLE IF NOT EXISTS project_spaces (
    project_id text PRIMARY KEY REFERENCES projects(id),
    document jsonb NOT NULL, revision integer NOT NULL DEFAULT 0,
    updated_at timestamptz NOT NULL DEFAULT now(), updated_by text NOT NULL
  )`;
  return who;
}
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const who = await access(id); if (who instanceof Response) return who;
  const row = await queryOne("SELECT document, revision, updated_at FROM project_spaces WHERE project_id=$1", [id]);
  return Response.json(row ?? { document: EMPTY_SPACE, revision: 0, updated_at: null }, { headers: { "Cache-Control": "no-store" } });
}
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const who = await access(id); if (who instanceof Response) return who;
  const body = await req.json().catch(() => null);
  const parsed = spaceSchema.safeParse(body?.document);
  if (!parsed.success || !Number.isInteger(body?.revision) || body.revision < 0) return Response.json({ error: parsed.error?.issues[0]?.message ?? "Revisión inválida" }, { status: 400 });
  // One statement updates the document and records its revision atomically.
  const updated = await queryOne(`WITH saved AS (
    INSERT INTO project_spaces(project_id,document,revision,updated_by)
    SELECT $1,$2::jsonb,1,$3 WHERE $4=0 OR EXISTS (SELECT 1 FROM project_spaces WHERE project_id=$1 AND revision=$4)
    ON CONFLICT(project_id) DO UPDATE SET document=EXCLUDED.document,
      revision=project_spaces.revision+1,updated_at=now(),updated_by=EXCLUDED.updated_by
    WHERE project_spaces.revision=$4
    RETURNING revision,updated_at
  ), logged AS (
    INSERT INTO audit_events(user_id,action,resource_type,resource_id,ring,payload)
    SELECT (SELECT id FROM users WHERE id=$3),'project.space.save','project',$1,1,
      jsonb_build_object('revision',revision,'module_count',$5::int,'actor',$3::text) FROM saved
  ) SELECT * FROM saved`, [id, JSON.stringify(parsed.data), who.userId, body.revision, parsed.data.modules.length]);
  if (!updated) return Response.json({ error: "Otro usuario actualizó el Space. Conserva tu borrador y recarga antes de guardar." }, { status: 409 });
  return Response.json(updated, { headers: { "Cache-Control": "no-store" } });
}
