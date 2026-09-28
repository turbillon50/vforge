/**
 * PATCH /api/projects/bulk — cambiar varios proyectos de un jalón.
 *
 * Hasta hoy el catálogo se editaba de uno en uno: con 339 proyectos, poner
 * estado o familia a una tanda era imposible en la práctica. Acepta
 * `{ ids: [...], patch: { category, client_name, delivery_priority, family_code } }`,
 * valida con los mismos limpiadores que la edición individual (lib/projects/lote.ts),
 * aplica en UN solo UPDATE y deja el rastro en `audit_events`.
 *
 * Elegir estado cuenta como clasificar a mano: estampa `category_manual_at`, así
 * el estado calculado ya no manda para esos proyectos.
 */
import { queryAll, sql } from "@/lib/db/client";
import { resolveRequestOwner } from "@/lib/auth/request-owner";
import { requireOperatorAuth } from "@/lib/auth/operator-token";
import { ensureDeliveryColumns } from "@/lib/projects/delivery-meta";
import { ensureEstadoRealSchema } from "@/lib/projects/estado-schema";
import { validarLote, type CuerpoLote } from "@/lib/projects/lote";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request) {
  const token = requireOperatorAuth(req);
  let userId: string;
  if (token.ok) {
    userId = token.userId;
  } else {
    const access = await resolveRequestOwner();
    if (!access.userId) return Response.json({ error: "unauthorized" }, { status: 401 });
    if (!access.isOwner) return Response.json({ error: "forbidden" }, { status: 403 });
    userId = access.userId;
  }

  const body = (await req.json().catch(() => null)) as CuerpoLote | null;
  const lote = validarLote(body);
  if ("error" in lote) return Response.json({ error: lote.error }, { status: 400 });

  await ensureDeliveryColumns();
  await ensureEstadoRealSchema();

  const asignaciones = lote.sets.map((s, i) => `${s.col} = $${i + 1}`);
  if (lote.manual) asignaciones.push("category_manual_at = now()");
  const vals = lote.sets.map((s) => s.valor);

  const filas = await queryAll<{ id: string; name: string }>(
    `UPDATE projects SET ${asignaciones.join(", ")}, updated_at = now()
      WHERE id = ANY($${vals.length + 1}::text[])
      RETURNING id, name`,
    [...vals, lote.ids],
  );

  const cambios = Object.fromEntries(lote.sets.map((s) => [s.col, s.valor]));

  await sql`
    INSERT INTO audit_events (user_id, action, resource_type, ring, payload)
    VALUES (
      ${userId}, 'projects.bulk_update', 'projects', 1,
      ${JSON.stringify({
        pedidos: lote.ids.length,
        actualizados: filas.length,
        cambios,
        ids: filas.map((f) => f.id),
      })}::jsonb
    )
  `;

  return Response.json(
    {
      pedidos: lote.ids.length,
      actualizados: filas.length,
      no_encontrados: lote.ids.filter((id) => !filas.some((f) => f.id === id)),
      cambios,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
