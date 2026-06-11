export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { bridgeSecretOk, unauthorized } from "@/lib/automations/auth";
import { upsertContactFromWa, logInteraction, ensureOpenLead } from "@/lib/automations/crm";
import { dispatchWaIncoming } from "@/lib/automations/flows";

/**
 * Webhook de WhatsApp ENTRANTE. Lo llama el puente Baileys (fire-and-forget)
 * por cada mensaje 1:1 recibido. Auth: Bearer WHATSAPP_BRIDGE_SECRET.
 *
 * Flujo automático (sin intervención):
 *   1) upsert de contacto CRM por número.
 *   2) registra la interacción entrante.
 *   3) asegura un lead abierto en etapa "Nuevo".
 *   4) dispara los flujos activos con trigger wa_incoming que casen.
 *
 * Volumen bajo + opt-in: ignoramos mensajes de grupo (CRM es 1:1).
 */
interface InboundPayload {
  messageId?: string;
  from?: string;
  body?: string;
  timestamp?: number;
  pushName?: string;
  isGroup?: boolean;
  groupJid?: string;
  bridge?: string;
}

export async function POST(req: Request) {
  if (!bridgeSecretOk(req)) return unauthorized();

  const p = (await req.json().catch(() => ({}))) as InboundPayload;
  const from = (p.from ?? "").replace(/[^\d]/g, "");
  const body = (p.body ?? "").trim();

  if (p.isGroup) {
    return NextResponse.json({ ok: true, skipped: "grupo ignorado (CRM 1:1)" });
  }
  if (!from || !body) {
    return NextResponse.json({ error: "from y body requeridos" }, { status: 400 });
  }

  // 1) Contacto
  const { contact, created } = await upsertContactFromWa({
    waNumber: from,
    pushName: p.pushName ?? null,
    source: "whatsapp",
  });

  // 2) Interacción entrante
  await logInteraction({
    contactId: contact.id,
    direction: "in",
    channel: "whatsapp",
    body,
    meta: { messageId: p.messageId, bridge: p.bridge ?? "personal" },
  });

  // 3) Lead abierto
  await ensureOpenLead(contact.id, { stageId: "stage_nuevo", title: "Lead WhatsApp" });

  // 4) Disparo de flujos
  const fired = await dispatchWaIncoming({
    from,
    body,
    pushName: p.pushName ?? "",
    contactId: contact.id,
    bridge: p.bridge,
  });

  return NextResponse.json({
    ok: true,
    contactId: contact.id,
    contactCreated: created,
    flowsFired: fired,
  });
}
