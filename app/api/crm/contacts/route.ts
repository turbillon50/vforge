export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { ownerGate, unauthorized } from "@/lib/automations/auth";
import { sql } from "@/lib/db/client";
import { ensureAutomationsSchema } from "@/lib/automations/schema";
import { upsertContactFromWa } from "@/lib/automations/crm";

export async function GET(req: Request) {
  const gate = await ownerGate();
  if (!gate.ok) return unauthorized();
  await ensureAutomationsSchema();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (id) {
    const contact = (await sql`SELECT * FROM crm_contacts WHERE id = ${id} LIMIT 1`) as unknown as unknown[];
    const interactions = (await sql`
      SELECT * FROM crm_interactions WHERE contact_id = ${id} ORDER BY created_at DESC LIMIT 100
    `) as unknown as unknown[];
    const leads = (await sql`SELECT * FROM crm_leads WHERE contact_id = ${id}`) as unknown as unknown[];
    return NextResponse.json({ ok: true, contact: (contact as unknown[])[0] ?? null, interactions, leads });
  }

  const contacts = (await sql`
    SELECT c.*,
      (SELECT count(*) FROM crm_interactions i WHERE i.contact_id = c.id)::int AS interactions,
      (SELECT body FROM crm_interactions i WHERE i.contact_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message
    FROM crm_contacts c
    ORDER BY c.last_seen DESC
    LIMIT 200
  `) as unknown as unknown[];
  return NextResponse.json({ ok: true, contacts });
}

export async function POST(req: Request) {
  const gate = await ownerGate();
  if (!gate.ok) return unauthorized();
  const body = (await req.json()) as {
    waNumber?: string;
    name?: string;
    email?: string;
    phone?: string;
    tags?: string[];
  };
  const { contact, created } = await upsertContactFromWa({
    waNumber: body.waNumber ?? null,
    name: body.name ?? null,
    email: body.email ?? null,
    phone: body.phone ?? null,
    tags: body.tags,
    source: "manual",
  });
  return NextResponse.json({ ok: true, contact, created });
}
