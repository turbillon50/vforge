/**
 * Notificaciones WhatsApp — server-only.
 *
 * Conecta con el motor de automatizaciones de V Momentum en Hetzner:
 *   - Baileys bridge (puerto 3001): envío directo a CUALQUIER número
 *     (el cliente). POST /send { to, message } con Bearer BAILEYS_SECRET.
 *   - V Momentum Engine (puerto 3003): /notify para avisar a Luis/Jimmy.
 *
 * Todo es best-effort: si el puente está caído, la notificación falla en
 * silencio y NUNCA tumba el request principal (firma, subida de evidencia…).
 * El secreto jamás llega al cliente: este módulo es server-only.
 */

const BAILEYS_URL = (process.env.BAILEYS_URL ?? "http://178.105.135.26:3001").replace(/\/$/, "");
const BAILEYS_SECRET = process.env.BAILEYS_SECRET ?? "";
const ENGINE_URL = (process.env.ENGINE_URL ?? "http://178.105.135.26:3003").replace(/\/$/, "");

/** Número de Luis (dueño) para avisos del lado del operador. */
const LUIS_WA = process.env.LUIS_WHATSAPP ?? "5219984292748";

export interface WaResult {
  ok: boolean;
  to?: string;
  error?: string;
  skipped?: boolean;
}

/** Normaliza un teléfono a sólo dígitos con lada (formato Baileys). */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let d = String(raw).replace(/\D/g, "");
  if (!d) return null;
  // México: 10 dígitos → anteponer 521 (WhatsApp MX). 52 + 10 → 521 + 10.
  if (d.length === 10) d = `521${d}`;
  else if (d.length === 12 && d.startsWith("52")) d = `521${d.slice(2)}`;
  if (d.length < 11) return null;
  return d;
}

/**
 * Envía un mensaje de WhatsApp a un número arbitrario vía el puente Baileys.
 * Best-effort con timeout corto.
 */
export async function sendWhatsapp(
  to: string,
  message: string,
): Promise<WaResult> {
  const phone = normalizePhone(to);
  if (!phone) return { ok: false, error: "phone_invalid" };
  if (!BAILEYS_SECRET) return { ok: false, skipped: true, error: "no_secret" };

  try {
    const res = await fetch(`${BAILEYS_URL}/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${BAILEYS_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ to: phone, message }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, to: phone, error: `bridge_${res.status}: ${text.slice(0, 120)}` };
    }
    return { ok: true, to: phone };
  } catch (e) {
    return { ok: false, to: phone, error: e instanceof Error ? e.message : "fetch_failed" };
  }
}

/**
 * Avisa a Luis (dueño) de un evento. Usa el engine /notify si responde; si no,
 * cae al envío directo Baileys a su número.
 */
export async function notifyOwner(message: string): Promise<WaResult> {
  try {
    const res = await fetch(`${ENGINE_URL}/notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // El engine de V Momentum espera { para, mensaje, urgente }.
      body: JSON.stringify({ para: "luis", mensaje: message, urgente: false }),
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) return { ok: true, to: "luis" };
  } catch {
    /* engine caído → fallback directo */
  }
  return sendWhatsapp(LUIS_WA, message);
}
