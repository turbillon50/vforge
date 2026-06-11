export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { ownerGate, unauthorized } from "@/lib/automations/auth";
import { sql } from "@/lib/db/client";
import { listStages } from "@/lib/automations/crm";

/** Pipeline: etapas + leads (con datos del contacto) agrupables por etapa. */
export async function GET() {
  const gate = await ownerGate();
  if (!gate.ok) return unauthorized();
  const stages = await listStages();
  const leads = (await sql`
    SELECT l.*, c.name AS contact_name, c.push_name AS contact_push_name, c.wa_number AS contact_wa
      FROM crm_leads l
      JOIN crm_contacts c ON c.id = l.contact_id
     WHERE l.status = 'open'
     ORDER BY l.updated_at DESC
     LIMIT 500
  `) as unknown as Array<{ id: string; stage_id: string | null }>;
  return NextResponse.json({ ok: true, stages, leads });
}
