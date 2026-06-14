/**
 * GET  /api/my-project/[id]/proposito — entendimiento de negocio + diagnóstico
 *      vivo (qué falta para 100% funcional). Sólo miembros ACTIVOS del proyecto.
 * PUT  /api/my-project/[id]/proposito — actualizar el entendimiento. Sólo
 *      owner del proyecto, editor, o el owner de la plataforma (Luis).
 */
import { NextRequest, NextResponse } from "next/server";
import { requireMember } from "@/lib/projects/membership";
import { isOwnerEmail } from "@/lib/auth/owner";
import { queryOne } from "@/lib/db/client";
import { diagnoseProposito } from "@/lib/proposito/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const member = await requireMember(id);
  if (!member) {
    return NextResponse.json({ error: "forbidden" }, { status: 403, headers: noStore });
  }
  const result = await diagnoseProposito(id);
  if (!result) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: noStore });
  }
  return NextResponse.json(result, { status: 200, headers: noStore });
}

const TEXT_FIELDS = [
  "summary", "audience", "problem", "revenue_model",
  "business_model", "north_star", "value_prop",
] as const;

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const member = await requireMember(id);
  const canEdit =
    isOwnerEmail(member?.email ?? null) ||
    member?.role === "owner" ||
    member?.role === "editor";
  if (!canEdit) {
    return NextResponse.json({ error: "forbidden" }, { status: 403, headers: noStore });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: "body inválido" }, { status: 400, headers: noStore });
  }

  const vals: Record<string, unknown> = {};
  for (const f of TEXT_FIELDS) {
    if (typeof body[f] === "string") vals[f] = (body[f] as string).slice(0, 4000);
  }
  const needs = Array.isArray(body.needs)
    ? (body.needs as unknown[]).filter((x) => typeof x === "string").slice(0, 30)
    : null;

  await queryOne(
    `INSERT INTO project_proposito
        (project_id, summary, audience, problem, revenue_model, business_model,
         north_star, value_prop, needs, updated_by, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8, COALESCE($9::jsonb,'[]'::jsonb), $10, now())
     ON CONFLICT (project_id) DO UPDATE SET
        summary        = COALESCE($2, project_proposito.summary),
        audience       = COALESCE($3, project_proposito.audience),
        problem        = COALESCE($4, project_proposito.problem),
        revenue_model  = COALESCE($5, project_proposito.revenue_model),
        business_model = COALESCE($6, project_proposito.business_model),
        north_star     = COALESCE($7, project_proposito.north_star),
        value_prop     = COALESCE($8, project_proposito.value_prop),
        needs          = COALESCE($9::jsonb, project_proposito.needs),
        updated_by     = $10,
        updated_at     = now()`,
    [
      id,
      vals.summary ?? null, vals.audience ?? null, vals.problem ?? null,
      vals.revenue_model ?? null, vals.business_model ?? null,
      vals.north_star ?? null, vals.value_prop ?? null,
      needs ? JSON.stringify(needs) : null,
      member?.email ?? "owner",
    ],
  );

  const result = await diagnoseProposito(id);
  return NextResponse.json(result, { status: 200, headers: noStore });
}
