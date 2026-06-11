export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { ownerGate, unauthorized } from "@/lib/automations/auth";
import { runFlow } from "@/lib/automations/engine";

/** Corrida manual de un flujo (botón "Probar" en el editor). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await ownerGate();
  if (!gate.ok) return unauthorized();
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { context?: Record<string, unknown> };
  const result = await runFlow(id, {
    triggerType: "manual",
    initialContext: body.context ?? {},
  });
  return NextResponse.json({ ok: result.status === "success", ...result });
}
