export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { ownerGate, unauthorized } from "@/lib/automations/auth";
import { getFlow, setFlowStatus, deleteFlow } from "@/lib/automations/flows";
import { sql } from "@/lib/db/client";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await ownerGate();
  if (!gate.ok) return unauthorized();
  const { id } = await params;
  const data = await getFlow(id);
  if (!data) return NextResponse.json({ error: "no existe" }, { status: 404 });
  const runs = (await sql`
    SELECT id, status, trigger_type, started_at, finished_at, error
      FROM flow_runs WHERE flow_id = ${id} ORDER BY started_at DESC LIMIT 25
  `) as unknown as unknown[];
  return NextResponse.json({ ok: true, ...data, runs });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await ownerGate();
  if (!gate.ok) return unauthorized();
  const { id } = await params;
  const body = (await req.json()) as { status?: "draft" | "active" | "paused" };
  if (body.status) await setFlowStatus(id, body.status);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await ownerGate();
  if (!gate.ok) return unauthorized();
  const { id } = await params;
  await deleteFlow(id);
  return NextResponse.json({ ok: true });
}
