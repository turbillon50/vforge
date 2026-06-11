export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { ownerGate, unauthorized } from "@/lib/automations/auth";
import { listFlows, saveFlow, type SaveFlowInput } from "@/lib/automations/flows";

export async function GET() {
  const gate = await ownerGate();
  if (!gate.ok) return unauthorized();
  const flows = await listFlows();
  return NextResponse.json({ ok: true, flows });
}

export async function POST(req: Request) {
  const gate = await ownerGate();
  if (!gate.ok) return unauthorized();
  const body = (await req.json()) as SaveFlowInput;
  if (!body?.name || !Array.isArray(body.nodes)) {
    return NextResponse.json({ error: "name y nodes[] requeridos" }, { status: 400 });
  }
  const id = await saveFlow({ ...body, createdBy: gate.email });
  return NextResponse.json({ ok: true, id });
}
