import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db/client";
import {
  authorizeReferenceAccess,
  ensureProjectReferencesTable,
} from "@/lib/live/project-references";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; referenceId: string }> },
) {
  const { projectId, referenceId } = await params;
  if (!uuidPattern.test(referenceId))
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  try {
    const access = await authorizeReferenceAccess(projectId, req.signal);
    if (!access)
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (!access.canWrite)
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    await ensureProjectReferencesTable();
    const deleted = await queryOne<{ id: string; label: string }>(
      `DELETE FROM project_references WHERE id = $1 AND project_id = $2 RETURNING id, label`,
      [referenceId, projectId],
    );
    if (!deleted)
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    await queryOne(
      `INSERT INTO project_events (project_id, event_type, details, severity)
       VALUES ($1, 'reference.deleted', $2::jsonb, 'low')`,
      [
        projectId,
        JSON.stringify({
          message: `Referencia eliminada: ${deleted.label}`,
          reference_id: deleted.id,
        }),
      ],
    ).catch(() => null);
    return NextResponse.json(
      { deleted: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "service_unavailable" }, { status: 503 });
  }
}
