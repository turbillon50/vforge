export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { ownerGate, unauthorized } from "@/lib/automations/auth";
import { allBridgeHealth, bridgeConfigured } from "@/lib/automations/whatsapp";

/** Estado en vivo de los dos remitentes WhatsApp (personal / goossip). */
export async function GET() {
  const gate = await ownerGate();
  if (!gate.ok) return unauthorized();
  const bridges = await allBridgeHealth();
  return NextResponse.json({ ok: true, configured: bridgeConfigured(), bridges });
}
