import { NextRequest, NextResponse } from "next/server";
import { queryAll, queryOne } from "@/lib/db/client";
import {
  authorizeReferenceAccess,
  ensureProjectReferencesTable,
  normalizeReferenceUrl,
} from "@/lib/live/project-references";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };
type ReferenceKind = "page" | "component" | "inspiration";

interface ReferenceRow {
  id: string;
  label: string;
  url: string;
  kind: ReferenceKind;
  notes: string;
  created_by: string;
  created_at: string;
}

function json(value: unknown, status = 200) {
  return NextResponse.json(value, { status, headers: noStore });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  try {
    const access = await authorizeReferenceAccess(projectId, req.signal);
    if (!access) return json({ error: "not_found" }, 404);
    await ensureProjectReferencesTable();
    const references = await queryAll<ReferenceRow>(
      `SELECT id, label, url, kind, notes, created_by, created_at
         FROM project_references
        WHERE project_id = $1
        ORDER BY created_at DESC`,
      [projectId],
    );
    return json({ references, canWrite: access.canWrite });
  } catch {
    return json({ error: "service_unavailable" }, 503);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  try {
    const access = await authorizeReferenceAccess(projectId, req.signal);
    if (!access) return json({ error: "not_found" }, 404);
    if (!access.canWrite) return json({ error: "forbidden" }, 403);
    const payload = (await req.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    const url = normalizeReferenceUrl(payload?.url);
    const label =
      typeof payload?.label === "string"
        ? payload.label.trim().slice(0, 120)
        : "";
    const notes =
      typeof payload?.notes === "string"
        ? payload.notes.trim().slice(0, 1000)
        : "";
    const kind: ReferenceKind | null =
      payload?.kind === "page" ||
      payload?.kind === "component" ||
      payload?.kind === "inspiration"
        ? payload.kind
        : null;
    if (!url || !label || !kind)
      return json({ error: "invalid_reference" }, 400);

    await ensureProjectReferencesTable();
    const reference = await queryOne<ReferenceRow>(
      `INSERT INTO project_references (project_id, label, url, kind, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, label, url, kind, notes, created_by, created_at`,
      [projectId, label, url, kind, notes, access.identity.email],
    );
    await queryOne(
      `INSERT INTO project_events (project_id, event_type, details, severity)
       VALUES ($1, 'reference.created', $2::jsonb, 'low')`,
      [
        projectId,
        JSON.stringify({
          message: `Referencia agregada: ${label}`,
          reference_id: reference?.id,
        }),
      ],
    ).catch(() => null);
    return json({ reference }, 201);
  } catch {
    return json({ error: "service_unavailable" }, 503);
  }
}
