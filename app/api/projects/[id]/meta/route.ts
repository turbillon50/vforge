/**
 * PATCH /api/projects/[id]/meta
 * Datos de operación del proyecto: prioridad, % avance, familia, estado,
 * cliente, fecha de entrega, monto del contrato, cobrado y descripción.
 */
import { queryOne } from "@/lib/db/client";
import { resolveRequestOwner } from "@/lib/auth/request-owner";
import {
  VALID_PROJECT_CATEGORIES,
  clampProgress,
  cleanAmount,
  cleanDate,
  cleanFamilyCode,
  cleanText,
  ensureDeliveryColumns,
} from "@/lib/projects/delivery-meta";
import { ensureEstadoRealSchema } from "@/lib/projects/estado-schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  delivery_priority?: boolean;
  progress_pct?: number;
  family_code?: string | null;
  category?: string;
  client_name?: string | null;
  due_date?: string | null;
  contract_amount?: number | string | null;
  paid_amount?: number | string | null;
  description?: string | null;
};

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

  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body || typeof body !== "object") {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }

  await ensureDeliveryColumns();
  await ensureEstadoRealSchema();

  const sets: string[] = [];
  const vals: unknown[] = [];
  let i = 1;
  const set = (col: string, val: unknown) => {
    sets.push(`${col} = $${i++}`);
    vals.push(val);
  };

  if (typeof body.delivery_priority === "boolean") set("delivery_priority", body.delivery_priority);
  if (body.progress_pct !== undefined) set("progress_pct", clampProgress(body.progress_pct));
  if ("family_code" in body) set("family_code", cleanFamilyCode(body.family_code));
  if ("client_name" in body) set("client_name", cleanText(body.client_name, 120));
  if ("due_date" in body) set("due_date", cleanDate(body.due_date));
  if ("contract_amount" in body) set("contract_amount", cleanAmount(body.contract_amount));
  if ("paid_amount" in body) set("paid_amount", cleanAmount(body.paid_amount));
  if ("description" in body) {
    const d = typeof body.description === "string" ? body.description.trim().slice(0, 600) : "";
    set("description", d || null);
  }
  if (body.category !== undefined) {
    if (!(VALID_PROJECT_CATEGORIES as readonly string[]).includes(String(body.category))) {
      return Response.json({ error: "invalid_category" }, { status: 400 });
    }
    set("category", body.category);
    // Elegir el estado en pantalla ES clasificarlo a mano: se estampa la fecha
    // y desde ese momento el estado calculado ya no manda para este proyecto.
    sets.push("category_manual_at = now()");
  }

  if (sets.length === 0) {
    return Response.json({ error: "nothing_to_update" }, { status: 400 });
  }

  vals.push(id);
  const updated = await queryOne<Record<string, unknown>>(
    `UPDATE projects SET ${sets.join(", ")}, updated_at = now()
      WHERE id = $${i}
      RETURNING id, category, category_manual_at, description,
               COALESCE(delivery_priority, false) AS delivery_priority,
               COALESCE(progress_pct, 0) AS progress_pct,
               family_code, client_name,
               to_char(due_date, 'YYYY-MM-DD') AS due_date,
               contract_amount::float8 AS contract_amount,
               paid_amount::float8 AS paid_amount,
               updated_at`,
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
