export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { ownerGate, unauthorized } from "@/lib/automations/auth";
import { sql } from "@/lib/db/client";
import { ensureAutomationsSchema } from "@/lib/automations/schema";
import { newId } from "@/lib/automations/crm";

export async function POST(req: Request) {
  const gate = await ownerGate();
  if (!gate.ok) return unauthorized();
  await ensureAutomationsSchema();
  const b = (await req.json()) as {
    contactId: string;
    title?: string;
    stageId?: string;
    value?: number;
  };
  if (!b.contactId) return NextResponse.json({ error: "contactId requerido" }, { status: 400 });
  const id = newId("l");
  await sql`
    INSERT INTO crm_leads (id, contact_id, title, stage_id, value, owner)
    VALUES (${id}, ${b.contactId}, ${b.title ?? "Nuevo lead"}, ${b.stageId ?? "stage_nuevo"}, ${b.value ?? 0}, ${gate.email})
  `;
  return NextResponse.json({ ok: true, id });
}

/** Mover lead de etapa / cerrar (ganado/perdido). */
export async function PATCH(req: Request) {
  const gate = await ownerGate();
  if (!gate.ok) return unauthorized();
  await ensureAutomationsSchema();
  const b = (await req.json()) as {
    id: string;
    stageId?: string;
    status?: "open" | "won" | "lost";
    value?: number;
    notes?: string;
  };
  if (!b.id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
  await sql`
    UPDATE crm_leads SET
      stage_id = COALESCE(${b.stageId ?? null}, stage_id),
      status   = COALESCE(${b.status ?? null}, status),
      value    = COALESCE(${b.value ?? null}, value),
      notes    = COALESCE(${b.notes ?? null}, notes),
      updated_at = now()
    WHERE id = ${b.id}
  `;
  return NextResponse.json({ ok: true });
}
