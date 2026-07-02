/**
 * Puente al navegador Vulcano (Chrome real vía CDP, dentro del contenedor
 * docker 'vulcano-browser' en Hetzner, expuesto vía relay /brain/exec).
 * Compartido entre /api/navegador/control (control manual) y el bucle
 * ver→arreglar→verificar (lib/forja/verify-loop.ts).
 */
const RELAY = "http://178.105.135.26";
const SECRET = process.env.BRAIN_SECRET ?? "";
const CONTAINER = "vulcano-browser";
const CDP = "http://localhost:9222";

/** Ejecuta un cmd en Hetzner vía el relay y devuelve el stdout (texto). */
export async function relayExec(cmd: string): Promise<string> {
  const res = await fetch(`${RELAY}/brain/exec`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret: SECRET, cmd }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`relay HTTP ${res.status}`);
  const data = await res.json().catch(() => ({}));
  const out = (data?.stdout ?? data?.output ?? data?.result ?? data?.data ?? "") as unknown;
  return typeof out === "string" ? out : JSON.stringify(out);
}

/** Acepta solo URLs http/https — evita inyección de comandos por la url. */
export function safeHttpUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const url = raw.trim();
  if (!/^https?:\/\//i.test(url)) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

/** Llama al controlador CDP (cdp_control.py) dentro del contenedor con un comando JSON. */
export async function cdpControl(payload: Record<string, unknown>): Promise<unknown> {
  const json = JSON.stringify(payload).replace(/'/g, "'\\''");
  const cmd = `docker exec ${CONTAINER} python3 /home/kasm-user/cdp_control.py '${json}'`;
  const stdout = await relayExec(cmd);
  try {
    return JSON.parse(stdout.trim());
  } catch {
    return { ok: false, raw: stdout };
  }
}

export async function browserNavigate(url: string): Promise<unknown> {
  const safe = safeHttpUrl(url);
  if (!safe) throw new Error("url inválida (solo http/https)");
  const cmd = `docker exec ${CONTAINER} curl -s -X PUT "${CDP}/json/new?${encodeURIComponent(safe)}"`;
  const stdout = await relayExec(cmd);
  try {
    return JSON.parse(stdout);
  } catch {
    return stdout;
  }
}

export async function browserReadBody(): Promise<string> {
  const result = await cdpControl({
    action: "eval",
    expr: "document.body ? document.body.innerText.slice(0, 4000) : ''",
  });
  if (typeof result === "string") return result;
  if (result && typeof result === "object" && "result" in result) {
    const r = (result as { result?: unknown }).result;
    return typeof r === "string" ? r : JSON.stringify(r);
  }
  return JSON.stringify(result);
}

export { CONTAINER, CDP };
