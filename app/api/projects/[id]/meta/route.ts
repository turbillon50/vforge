/**
 * PATCH /api/projects/[id]/meta
 * Actualiza prioridad de entrega, % avance y código de familia (duplicados/relacionados).
 */
import { sql } from "@/lib/db/client";
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
  const rows = (await sql.query(
    `UPDATE projects SET ${sets.join(", ")}, updated_at = now()
      WHERE id = $${i}
      RETURNING id, delivery_priority, progress_pct, family_code`,
    vals,
  )) as Array<{
    id: string;
    delivery_priority: boolean;
    progress_pct: number;
    family_code: string | null;
  }>;

  // neon sql.query vs tagged - check client API
  // Fallback with tagged if query not available
  if (!rows || !Array.isArray(rows)) {
    // use sequential tagged updates
    if (typeof body.delivery_priority === "boolean") {
      await sql`UPDATE projects SET delivery_priority = ${body.delivery_priority}, updated_at = now() WHERE id = ${id}`;
    }
    if (body.progress_pct !== undefined) {
      const pct = clampProgress(body.progress_pct);
      await sql`UPDATE projects SET progress_pct = ${pct}, updated_at = now() WHERE id = ${id}`;
    }
    if ("family_code" in body) {
      const code = cleanFamilyCode(body.family_code);
      await sql`UPDATE projects SET family_code = ${code}, updated_at = now() WHERE id = ${id}`;
    }
  }

  const updated = (await sql`
    SELECT id,
           COALESCE(delivery_priority, false) AS delivery_priority,
           COALESCE(progress_pct, 0) AS progress_pct,
           family_code
      FROM projects WHERE id = ${id}
  `) as Array<{
    id: string;
    delivery_priority: boolean;
    progress_pct: number;
    family_code: string | null;
  }>;

  if (!updated[0]) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  return Response.json(
    { project: updated[0] },
    { headers: { "Cache-Control": "no-store" } },
  );
}
