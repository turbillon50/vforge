/**
 * Cliente del puente Baileys (WhatsApp NO oficial) que ya corre en Hetzner.
 *
 * DOS sesiones reales y vivas, una por número remitente:
 *   - personal  → :3001  (número personal de Luis, 5219984292748)
 *   - goossip   → :3002  (número Goossip, 5219987175692)
 *
 * IMPORTANTE: volumen bajo + solo contactos opt-in. El puente es no-oficial;
 * cuidamos los números. No hay reintentos agresivos ni envíos masivos aquí.
 */
import type { BridgeId } from "./types";

const SECRET = process.env.WHATSAPP_BRIDGE_SECRET ?? "";

export const BRIDGES: Record<BridgeId, { url: string; label: string; number: string }> = {
  personal: {
    url: process.env.WHATSAPP_BRIDGE_PERSONAL_URL ?? "http://178.105.135.26:3001",
    label: "Personal (Luis)",
    number: "5219984292748",
  },
  goossip: {
    url: process.env.WHATSAPP_BRIDGE_GOOSSIP_URL ?? "http://178.105.135.26:3002",
    label: "Goossip",
    number: "5219987175692",
  },
};

export function bridgeConfigured(): boolean {
  return SECRET.length > 0;
}

export function normalizeWaNumber(raw: string): string {
  const v = String(raw ?? "");
  if (v.includes("@g.us")) return v; // grupo
  return v.replace(/[^\d]/g, "");
}

export interface BridgeHealth {
  bridge: BridgeId;
  url: string;
  label: string;
  number: string;
  connected: boolean;
  jid: string | null;
  ok: boolean;
  error?: string;
}

export async function bridgeHealth(bridge: BridgeId): Promise<BridgeHealth> {
  const b = BRIDGES[bridge];
  try {
    const res = await fetch(`${b.url}/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
    const data = (await res.json()) as { connected?: boolean; jid?: string | null };
    return {
      bridge,
      url: b.url,
      label: b.label,
      number: b.number,
      connected: Boolean(data.connected),
      jid: data.jid ?? null,
      ok: res.ok,
    };
  } catch (e) {
    return {
      bridge,
      url: b.url,
      label: b.label,
      number: b.number,
      connected: false,
      jid: null,
      ok: false,
      error: e instanceof Error ? e.message : "unreachable",
    };
  }
}

export async function allBridgeHealth(): Promise<BridgeHealth[]> {
  return Promise.all((Object.keys(BRIDGES) as BridgeId[]).map(bridgeHealth));
}

export interface SendResult {
  ok: boolean;
  bridge: BridgeId;
  to: string;
  id?: string | null;
  jid?: string | null;
  error?: string;
}

/**
 * Envía un mensaje de texto por el remitente elegido.
 * No lanza: devuelve {ok:false,error} para que el motor lo registre en el log.
 */
export async function sendWhatsApp(
  bridge: BridgeId,
  to: string,
  message: string,
): Promise<SendResult> {
  const b = BRIDGES[bridge];
  const dest = normalizeWaNumber(to);
  if (!SECRET) {
    return { ok: false, bridge, to: dest, error: "WHATSAPP_BRIDGE_SECRET no configurado" };
  }
  if (!dest) return { ok: false, bridge, to: dest, error: "destino vacío" };
  if (!message.trim()) return { ok: false, bridge, to: dest, error: "mensaje vacío" };

  try {
    const res = await fetch(`${b.url}/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SECRET}`,
      },
      body: JSON.stringify({ to: dest, message }),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    const data = (await res.json().catch(() => ({}))) as {
      id?: string | null;
      jid?: string | null;
      error?: string;
    };
    if (!res.ok) {
      return { ok: false, bridge, to: dest, error: data.error ?? `HTTP ${res.status}` };
    }
    return { ok: true, bridge, to: dest, id: data.id ?? null, jid: data.jid ?? null };
  } catch (e) {
    return { ok: false, bridge, to: dest, error: e instanceof Error ? e.message : "send error" };
  }
}
