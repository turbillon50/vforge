/**
 * Puente al hub de agentes V (Hetzner, puerto 3004).
 *
 * El token JAMÁS sale del servidor: este módulo es server-only y la
 * UI/V solo hablan con /api/v/bridge, que a su vez usa estas funciones.
 */

const BRIDGE_URL = process.env.HUB_BRIDGE_URL ?? "";
const BRIDGE_TOKEN = process.env.HUB_BRIDGE_TOKEN ?? "";

export interface BridgePending {
  id: string;
  type: string;
  agent: string;
  title: string;
  qa?: unknown;
  createdAt?: string;
}

export interface BridgeStatus {
  pending: BridgePending[];
  agents: Record<string, unknown>;
  pipeline: { queued: number };
}

export function bridgeConfigured(): boolean {
  return Boolean(BRIDGE_URL && BRIDGE_TOKEN);
}

async function bridgeFetch(
  path: string,
  init?: RequestInit,
): Promise<unknown> {
  if (!bridgeConfigured()) {
    throw new Error("Puente no configurado (HUB_BRIDGE_URL / HUB_BRIDGE_TOKEN)");
  }
  const res = await fetch(`${BRIDGE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${BRIDGE_TOKEN}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    throw new Error(
      `Puente respondió ${res.status}: ${text.slice(0, 200)}`,
    );
  }
  return json;
}

export async function getBridgeStatus(): Promise<BridgeStatus> {
  return (await bridgeFetch("/v/status")) as BridgeStatus;
}

export async function approvePending(id: string): Promise<unknown> {
  return bridgeFetch("/v/approve", {
    method: "POST",
    body: JSON.stringify({ id }),
  });
}

export async function rejectPending(
  id: string,
  motivo: string,
): Promise<unknown> {
  return bridgeFetch("/v/reject", {
    method: "POST",
    body: JSON.stringify({ id, motivo }),
  });
}

export async function dispatchBridgeTask(args: {
  agent: string;
  task: string;
  context?: string;
  projectId?: string;
}): Promise<unknown> {
  return bridgeFetch("/v/task", {
    method: "POST",
    body: JSON.stringify(args),
  });
}
