/**
 * PATCH /api/projects/[id]/meta
 * Prioridad de entrega, % avance, código de familia (relacionados/duplicados).
 */
import { queryOne } from "@/lib/db/client";
import { resolveRequestOwner } from "@/lib/auth/request-owner";
import {
  clampProgress,
  cleanFamilyCode,
  ensureDeliveryColumns,
} from "@/lib/projects/delivery-meta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await resolveRequestOwner();
  if (!access.userId) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!access.isOwner) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  if (!id) return Response.json({ error: "missing_id" }, { status: 400 });

  const body = (await req.json().catch(() => null)) as {
    delivery_priority?: boolean;
    progress_pct?: number;
    family_code?: string | null;
  } | null;

  if (!body || typeof body !== "object") {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }

  await ensureDeliveryColumns();

  const sets: string[] = [];
  const vals: unknown[] = [];
  let i = 1;

  if (typeof body.delivery_priority === "boolean") {
    sets.push(`delivery_priority = $${i++}`);
    vals.push(body.delivery_priority);
  }
  if (body.progress_pct !== undefined) {
    sets.push(`progress_pct = $${i++}`);
    vals.push(clampProgress(body.progress_pct));
  }
  if ("family_code" in body) {
    sets.push(`family_code = $${i++}`);
    vals.push(cleanFamilyCode(body.family_code));
  }

  if (sets.length === 0) {
    return Response.json({ error: "nothing_to_update" }, { status: 400 });
  }

  vals.push(id);
  const updated = await queryOne<{
    id: string;
    delivery_priority: boolean;
    progress_pct: number;
    family_code: string | null;
  }>(
    `UPDATE projects SET ${sets.join(", ")}, updated_at = now()
      WHERE id = $${i}
      RETURNING id,
               COALESCE(delivery_priority, false) AS delivery_priority,
               COALESCE(progress_pct, 0) AS progress_pct,
               family_code`,
    vals,
  );

  if (!updated) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  return Response.json(
    { project: updated },
    { headers: { "Cache-Control": "no-store" } },
  );
}
